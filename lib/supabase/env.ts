/**
 * Supabase env access. Reading `process.env.NEXT_PUBLIC_*` with literal keys keeps them inlinable
 * for the browser bundle. Empty strings count as missing.
 */
function clean(value: string | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

export function getSupabaseUrl(): string | null {
  return clean(process.env.NEXT_PUBLIC_SUPABASE_URL);
}

export function getPublishableKey(): string | null {
  return clean(process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY);
}

export function getPublicEnv(): { url: string; key: string } | null {
  const url = getSupabaseUrl();
  const key = getPublishableKey();
  return url && key ? { url, key } : null;
}

export function requirePublicEnv(): { url: string; key: string } {
  const env = getPublicEnv();
  if (!env) {
    throw new Error(
      "Supabase is not configured: set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY in .env.local",
    );
  }
  return env;
}
