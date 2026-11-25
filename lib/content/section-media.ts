/**
 * Images for the home sections that have no media column of their own (experience reels,
 * trophy cards). Linked by storage path convention, `experience/<key>.<ext>` and
 * `achievements/<key>.<ext>`, so the seed uploads them and the offline fallback serves the
 * copies under public/seed/. Shared by scripts/seed/seed.ts (Node native TS: erasable
 * syntax, no `@/` alias) and lib/content/fallback.ts.
 */
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

export const SECTION_MEDIA_DIRS = ["experience", "achievements"] as const;
export const PHOTO_EXTS = ["webp", "jpg", "jpeg", "png"] as const;

/** Section key from a storage path: `achievements/krti-2025.jpg` → `krti-2025`. */
export function sectionKey(path: string): string {
  const base = path.split("/").pop() ?? path;
  return base.replace(/\.[a-z0-9]+$/i, "");
}

/** First `<dir>/<key>.<ext>` that exists under `root`, as a relative path (WebP first). */
export function findPhoto(root: string, dir: string, key: string): string | null {
  for (const ext of PHOTO_EXTS) {
    const rel = `${dir}/${key}.${ext}`;
    if (existsSync(join(root, rel))) return rel;
  }
  return null;
}

/** Pixel size from a PNG, JPEG or WebP header. */
export function imageSize(buf: Uint8Array): { width: number; height: number } | null {
  const dv = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  if (buf.length > 24 && dv.getUint32(0) === 0x89504e47) {
    return { width: dv.getUint32(16), height: dv.getUint32(20) };
  }
  if (buf.length > 4 && dv.getUint16(0) === 0xffd8) {
    let at = 2;
    while (at + 9 < buf.length) {
      if (buf[at] !== 0xff) return null;
      const marker = buf[at + 1];
      const len = dv.getUint16(at + 2);
      if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
        return { width: dv.getUint16(at + 7), height: dv.getUint16(at + 5) };
      }
      at += 2 + len;
    }
    return null;
  }
  const tag = (at: number) => String.fromCharCode(buf[at], buf[at + 1], buf[at + 2], buf[at + 3]);
  if (buf.length > 30 && tag(0) === "RIFF" && tag(8) === "WEBP") {
    const chunk = tag(12);
    if (chunk === "VP8X") {
      const w = 1 + (buf[24] | (buf[25] << 8) | (buf[26] << 16));
      const h = 1 + (buf[27] | (buf[28] << 8) | (buf[29] << 16));
      return { width: w, height: h };
    }
    if (chunk === "VP8 ") return { width: dv.getUint16(26, true) & 0x3fff, height: dv.getUint16(28, true) & 0x3fff };
    if (chunk === "VP8L") {
      const b = dv.getUint32(21, true);
      return { width: (b & 0x3fff) + 1, height: ((b >> 14) & 0x3fff) + 1 };
    }
  }
  return null;
}

export function readImageSize(file: string): { width: number; height: number } | null {
  try {
    return imageSize(new Uint8Array(readFileSync(file)));
  } catch {
    return null;
  }
}
