/**
 * RLS / grants smoke test against the live project (plan: Verifikasi #3).
 *
 *   pnpm verify:rls
 *
 * As anon (publishable key):
 *   - a draft project is invisible
 *   - insert / update / delete on content tables fail
 *   - inserting a message (table or RPC) fails, reading messages returns nothing
 *   - uploading to the `media` bucket fails
 * With the secret key:
 *   - submit_message succeeds 3× for one ip_hash and the 4th call raises `rate_limited`
 *
 * Probe rows are created and removed with the secret key. Exits 1 on any failure.
 * Node 22 native TypeScript: erasable syntax only, explicit `.ts` imports, no `@/` alias.
 */
import { randomUUID } from "node:crypto";

import { createClient } from "@supabase/supabase-js";

import type { Database } from "../lib/supabase/database.types.ts";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const publishable = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim();
const secret = process.env.SUPABASE_SECRET_KEY?.trim();

if (!url || !publishable || !secret) {
  console.error(
    "✗ Missing env: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY and SUPABASE_SECRET_KEY must be set in .env.local.",
  );
  process.exit(1);
}

const options = { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } };
const anon = createClient<Database>(url, publishable, options);
const service = createClient<Database>(url, secret, options);

let failures = 0;
function report(ok: boolean, label: string, detail = "") {
  if (!ok) failures++;
  console.log(`${ok ? "  PASS" : "✗ FAIL"}  ${label}${detail ? ` — ${detail}` : ""}`);
}

const probeSlug = `rls-probe-${randomUUID().slice(0, 8)}`;
const ipHash = `rls-probe-${randomUUID().replace(/-/g, "")}`;

async function main() {
  console.log(`Verifying RLS on ${new URL(url as string).host}\n`);

  // Setup: a draft project only the secret key can see.
  const created = await service
    .from("projects")
    .insert({ slug: probeSlug, name: "RLS probe", published: false })
    .select("id")
    .single();
  if (created.error) throw new Error(`setup draft project: ${created.error.message}`);

  try {
    // 1. Draft invisible to anon.
    const draft = await anon.from("projects").select("id").eq("slug", probeSlug);
    report(!draft.error && (draft.data ?? []).length === 0, "anon cannot see draft project", draft.error?.message);

    const published = await anon.from("projects").select("id, published").eq("published", false);
    report(!published.error && (published.data ?? []).length === 0, "anon sees no unpublished projects");

    // 2. Anon writes fail.
    const insert = await anon.from("projects").insert({ slug: `${probeSlug}-anon`, name: "anon" }).select("id");
    report(Boolean(insert.error), "anon insert into projects is rejected", insert.error?.code ?? "no error");

    const update = await anon.from("projects").update({ name: "hijacked" }).eq("slug", probeSlug).select("id");
    const afterUpdate = await service.from("projects").select("name").eq("slug", probeSlug).single();
    report(
      (Boolean(update.error) || (update.data ?? []).length === 0) && afterUpdate.data?.name === "RLS probe",
      "anon update on projects changes nothing",
      update.error?.code ?? "",
    );

    const del = await anon.from("projects").delete().eq("slug", probeSlug).select("id");
    const afterDelete = await service.from("projects").select("id").eq("slug", probeSlug);
    report(
      (Boolean(del.error) || (del.data ?? []).length === 0) && (afterDelete.data ?? []).length === 1,
      "anon delete on projects removes nothing",
      del.error?.code ?? "",
    );

    const profileUpdate = await anon.from("profile").update({ headline: "hijacked" }).eq("id", 1).select("id");
    report(
      Boolean(profileUpdate.error) || (profileUpdate.data ?? []).length === 0,
      "anon update on profile changes nothing",
      profileUpdate.error?.code ?? "",
    );

    // 3. Messages: no direct insert, no RPC, no reads.
    const messageInsert = await anon
      .from("messages")
      .insert({ name: "anon", email: "anon@example.com", body: "hi", ip_hash: ipHash });
    report(Boolean(messageInsert.error), "anon insert into messages is rejected", messageInsert.error?.code ?? "no error");

    const anonRpc = await anon.rpc("submit_message", {
      p_name: "anon",
      p_email: "anon@example.com",
      p_body: "hi",
      p_ip_hash: ipHash,
    });
    report(Boolean(anonRpc.error), "anon cannot execute submit_message", anonRpc.error?.code ?? "no error");

    const messageRead = await anon.from("messages").select("id").limit(1);
    report(
      Boolean(messageRead.error) || (messageRead.data ?? []).length === 0,
      "anon cannot read messages",
      messageRead.error?.code ?? "",
    );

    // 4. Storage upload fails for anon.
    const upload = await anon.storage
      .from("media")
      .upload(`rls-probe/${probeSlug}.png`, new Uint8Array([137, 80, 78, 71]), { contentType: "image/png" });
    report(Boolean(upload.error), "anon upload to media bucket is rejected", upload.error?.message ?? "no error");
    if (!upload.error) await service.storage.from("media").remove([`rls-probe/${probeSlug}.png`]);

    // 5. RPC with secret key: 3 ok, 4th rate_limited.
    const outcomes: string[] = [];
    for (let i = 1; i <= 4; i++) {
      const result = await service.rpc("submit_message", {
        p_name: "RLS probe",
        p_email: "probe@example.com",
        p_body: `rate-limit probe ${i}`,
        p_ip_hash: ipHash,
        p_user_agent: "verify-rls",
      });
      outcomes.push(result.error ? (result.error.message.includes("rate_limited") ? "rate_limited" : result.error.message) : "ok");
    }
    report(
      outcomes.slice(0, 3).every((o) => o === "ok") && outcomes[3] === "rate_limited",
      "secret-key submit_message: 3 accepted, 4th rate_limited",
      outcomes.join(", "),
    );
  } finally {
    await service.from("messages").delete().eq("ip_hash", ipHash);
    await service.from("projects").delete().like("slug", `${probeSlug}%`);
  }

  console.log(failures === 0 ? "\nAll RLS checks passed." : `\n${failures} check(s) failed.`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((error: unknown) => {
  console.error(`✗ verify-rls crashed: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
