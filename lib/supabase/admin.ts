import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "./database.types";
import { getSupabaseUrl } from "./env";

/**
 * Secret-key client (bypasses RLS). Server only: contact RPC and maintenance tasks.
 * Never import from client code or from `'use cache'` public reads.
 */
export function createSupabaseAdminClient(): SupabaseClient<Database> {
  const url = getSupabaseUrl();
  const secret = process.env.SUPABASE_SECRET_KEY?.trim();
  if (!url || !secret) {
    throw new Error("Supabase admin client needs NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY.");
  }
  return createClient<Database>(url, secret, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}
