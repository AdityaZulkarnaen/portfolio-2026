import { getPublicClient } from "@/lib/supabase/public";

/**
 * Daily Vercel cron (vercel.json): one tiny read so the free Supabase project never sits idle
 * long enough to be paused. Vercel signs cron calls with `Authorization: Bearer $CRON_SECRET`.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return Response.json({ ok: false }, { status: 401 });
  }
  const client = getPublicClient();
  if (!client) return Response.json({ ok: false, error: "supabase not configured" }, { status: 500 });
  const { error } = await client.from("profile").select("id").limit(1);
  return Response.json({ ok: !error, at: new Date().toISOString() }, { status: error ? 502 : 200 });
}
