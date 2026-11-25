import manifest from "@/generated/video-manifest.json";

/**
 * Committed manifest of encoded videos under public/videos (written by the P7 pipeline).
 * `public/` is not readable at runtime on Vercel, so the site resolves keys from here.
 */
type Variant = { src: string; width?: number; height?: number; bytes?: number };
type Entry = { variants?: Record<string, Variant>; poster?: string; durationS?: number };
type Manifest = { version: number; videos: Record<string, Entry>; reels: Record<string, Entry> };

const data = manifest as Manifest;

export type ReelSource = { src: string; poster: string | null; durationS: number | null };

/** Best modal source for a reel key (1080 → 720), or null if not encoded yet. */
export function resolveReelSource(key: string): ReelSource | null {
  const entry = data.reels[key] ?? data.videos[key];
  if (!entry?.variants) return null;
  const variant = entry.variants["reel-1080"] ?? entry.variants["1080"] ?? Object.values(entry.variants)[0];
  if (!variant) return null;
  return { src: variant.src, poster: entry.poster ?? null, durationS: entry.durationS ?? null };
}
