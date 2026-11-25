/** Resolve a media path to a URL. Pure; safe on server and client. */

const BUCKET = "media";

function isAbsolute(path: string): boolean {
  return /^https?:\/\//i.test(path) || path.startsWith("data:");
}

function supabaseUrl(): string | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  return url ? url.replace(/\/$/, "") : null;
}

/** Storage object path (e.g. `projects/depths/cover.webp`) → public bucket URL. */
export function storagePublicUrl(path: string): string {
  if (isAbsolute(path)) return path;
  const base = supabaseUrl();
  const clean = path.replace(/^\/+/, "");
  const encoded = clean.split("/").map(encodeURIComponent).join("/");
  if (!base) return `/${encoded}`;
  return `${base}/storage/v1/object/public/${BUCKET}/${encoded}`;
}

/** Key under `public/` (videos) → root-relative URL. */
export function publicAssetUrl(path: string): string {
  if (isAbsolute(path)) return path;
  return `/${path.replace(/^\/+/, "")}`;
}

/**
 * Resolve any media path. Legacy absolute URLs (e.g. Sanity CDN in seed fallback mode)
 * pass through untouched.
 */
export function resolveMediaUrl(source: string, path: string): string {
  if (isAbsolute(path)) return path;
  return source === "public" ? publicAssetUrl(path) : storagePublicUrl(path);
}
