import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "./database.types";
import { getPublicEnv } from "./env";

export type PublicClient = SupabaseClient<Database>;

let client: PublicClient | null | undefined;

/**
 * Cookie-less anon client for public reads inside `'use cache'` scopes.
 * It never touches request data, so it is safe under `ensureStatic = 'navigation'`.
 * Returns null when Supabase env vars are missing (the content layer then falls back to seed JSON).
 */
export function getPublicClient(): PublicClient | null {
  if (client !== undefined) return client;
  const env = getPublicEnv();
  client = env
    ? createClient<Database>(env.url, env.key, {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
          detectSessionInUrl: false,
        },
      })
    : null;
  return client;
}
