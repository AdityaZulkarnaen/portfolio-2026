import "server-only";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

import type { Database } from "./database.types";
import { requirePublicEnv } from "./env";

/**
 * Cookie-bound client for admin Server Components, Server Actions and Route Handlers.
 * Create one per request. Never use it inside `'use cache'` or public (site) routes.
 */
export async function createSupabaseServerClient() {
  const { url, key } = requirePublicEnv();
  const cookieStore = await cookies();

  return createServerClient<Database>(url, key, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Called from a Server Component, where cookies are read-only.
          // The proxy (updateSession) refreshes the session instead.
        }
      },
    },
  });
}
