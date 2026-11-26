import manifest from "@/generated/video-manifest.json";

import type { Media } from "./types";

/**
 * Committed manifest of encoded videos under public/videos (written by `pnpm video:manifest`).
 * `public/` is not readable at runtime on Vercel, so the site resolves keys from here.
 *
 * videos[<project slug>].variants: film-1080 (audio), loop-720, loop-480 (muted) + poster.
 * reels[<reel key>].variants: reel-1080, reel-hero-720, reel-hero-480.
 */
type Variant = { src: string; width?: number; height?: number; bytes?: number; durationS?: number };
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

export type ProjectVideoRole = "film" | "loop" | "phoneLoop";

const ROLE_VARIANT: Record<ProjectVideoRole, string> = { film: "film-1080", loop: "loop-720", phoneLoop: "loop-phone" };

/**
 * `<slug>/<variant>` (optionally prefixed `videos/`), e.g. `depths/loop-720`: the stable key a
 * `media` row with source `public` can store instead of a hashed file name.
 */
const KEY_RE = /^\/?(?:videos\/)?([a-z0-9-]+)\/([a-z0-9-]+)$/;

/** Hashed URL for a stable manifest key, or null when the key is unknown (or already a file path). */
export function resolveVideoKey(path: string): string | null {
  const m = KEY_RE.exec(path);
  if (!m) return null;
  return data.videos[m[1]]?.variants?.[m[2]]?.src ?? data.reels[m[1]]?.variants?.[m[2]]?.src ?? null;
}

/**
 * A project's film or loop straight from the manifest, used when the project row has no
 * film/loop media linked: encoding a slug is enough for it to show on the site.
 */
export function projectVideo(slug: string, role: ProjectVideoRole): Media | null {
  const key = ROLE_VARIANT[role];
  const variant = data.videos[slug]?.variants?.[key];
  if (!variant) return null;
  return {
    id: `manifest-${slug}-${key}`,
    kind: "video",
    source: "public",
    path: `${slug}/${key}`,
    src: variant.src,
    width: variant.width ?? null,
    height: variant.height ?? null,
    alt: "",
    lqip: null,
    focalX: null,
    focalY: null,
    durationS: variant.durationS ?? data.videos[slug]?.durationS ?? null,
  };
}
