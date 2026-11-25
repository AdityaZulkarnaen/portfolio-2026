"use server";

import { createHash } from "node:crypto";
import { headers } from "next/headers";
import { z } from "zod";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export type ContactState =
  | { status: "idle" }
  | { status: "success"; message: string }
  | { status: "error"; message: string; fieldErrors?: Partial<Record<"name" | "email" | "message", string>>; values?: { name: string; email: string; message: string } };

const schema = z.object({
  name: z.string().trim().min(2, "Tell me your name (2 characters or more).").max(120, "That name is a little long."),
  email: z.string().trim().email("That email doesn't look right. Check for typos."),
  message: z
    .string()
    .trim()
    .min(10, "Say a little more, at least 10 characters.")
    .max(4000, "Keep it under 4,000 characters, or email me directly."),
});

/**
 * Contact form → zod → honeypot → salted IP hash → `submit_message` RPC (rate-limited in
 * Postgres). Headers are read here, inside the action, which keeps public pages static.
 */
export async function submitContact(_prev: ContactState, formData: FormData): Promise<ContactState> {
  const values = {
    name: String(formData.get("name") ?? ""),
    email: String(formData.get("email") ?? ""),
    message: String(formData.get("message") ?? ""),
  };

  // Honeypot: real people never fill the hidden "company" field. Pretend success.
  if (String(formData.get("company") ?? "").length > 0) {
    return { status: "success", message: "Thanks. Your message is on its way." };
  }

  const parsed = schema.safeParse(values);
  if (!parsed.success) {
    const fieldErrors: Partial<Record<"name" | "email" | "message", string>> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0] as "name" | "email" | "message";
      fieldErrors[key] ??= issue.message;
    }
    return { status: "error", message: "A couple of fields need another look.", fieldErrors, values };
  }

  const h = await headers();
  const ip = (h.get("x-forwarded-for")?.split(",")[0] ?? h.get("x-real-ip") ?? "unknown").trim();
  const salt = process.env.REVALIDATE_SECRET ?? "";
  const ipHash = createHash("sha256").update(`${ip}:${salt}`).digest("hex");
  const userAgent = h.get("user-agent")?.slice(0, 512) ?? null;

  try {
    const supabase = createSupabaseAdminClient();
    const { error } = await supabase.rpc("submit_message", {
      p_name: parsed.data.name,
      p_email: parsed.data.email,
      p_body: parsed.data.message,
      p_ip_hash: ipHash,
      p_user_agent: userAgent ?? undefined,
    });
    if (error) {
      if (error.message.includes("rate_limited")) {
        return {
          status: "error",
          message: "You've sent a few messages already. Give it ten minutes, or email me directly.",
          values,
        };
      }
      console.error("[contact] submit_message failed:", error.message);
      return { status: "error", message: "The message didn't go through. Try again, or email me directly.", values };
    }
  } catch (err) {
    console.error("[contact] unexpected error:", err);
    return { status: "error", message: "The message didn't go through. Try again, or email me directly.", values };
  }

  return { status: "success", message: `Thanks, ${parsed.data.name.split(" ")[0]}. Your message landed. I'll write back soon.` };
}
