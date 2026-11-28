import { timingSafeEqual } from "node:crypto";

import { revalidateTag } from "next/cache";

/**
 * POST /api/revalidate with `Authorization: Bearer $REVALIDATE_SECRET` and an optional JSON
 * body `{ "tags": ["projects"] }` (default: `content`, every public read). For edits made
 * outside /admin (Supabase dashboard, scripts, a database webhook).
 */
export async function POST(request: Request) {
  const secret = process.env.REVALIDATE_SECRET?.trim();
  const given = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  if (!secret || given.length !== secret.length || !timingSafeEqual(Buffer.from(given), Buffer.from(secret))) {
    return Response.json({ ok: false }, { status: 401 });
  }
  let tags = ["content"];
  try {
    const body = (await request.json()) as { tags?: unknown };
    if (Array.isArray(body.tags) && body.tags.every((t) => typeof t === "string" && t.length <= 256) && body.tags.length > 0) {
      tags = body.tags.slice(0, 32) as string[];
    }
  } catch {
    // No body: revalidate everything.
  }
  for (const tag of tags) revalidateTag(tag, "max");
  return Response.json({ ok: true, tags });
}
