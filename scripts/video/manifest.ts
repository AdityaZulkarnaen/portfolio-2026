/**
 * Write generated/video-manifest.json from what is actually under public/videos/.
 *
 *   pnpm video:manifest            # rewrite the manifest
 *   pnpm video:manifest --check    # exit 1 if a manifest entry points at a missing file
 *
 * Shape (read by lib/content/video-manifest.ts):
 *   { version: 1,
 *     videos: { <slug>: { variants: { "film-1080" | "loop-720" | "loop-480": { src, width, height, bytes, durationS } },
 *                         poster, durationS } },
 *     reels:  { <key>:  { variants: { "reel-1080" | "reel-hero-720" | "reel-hero-480": … }, poster, durationS,
 *                         chapters: [{ number, slug, label, role, startS, endS }], chaptersVtt } } }
 * `durationS` on the entry is the film's (or the reel's) length. Directories whose variants
 * are `reel-*` go under `reels`; everything else under `videos`, keyed by folder name (= project slug).
 * A reel's chapters come from the chapters.json / chapters.vtt that `pnpm video:chapters` writes
 * into its folder.
 */
import { existsSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { CHAPTERS_JSON, CHAPTERS_VTT, MANIFEST_PATH, PUBLIC_VIDEOS, ROOT, parseOutputName, probe, type ReelChapterData, type ReelChaptersFile } from "./lib.ts";

type Variant = { src: string; width: number; height: number; bytes: number; durationS: number };
type Entry = { variants: Record<string, Variant>; poster?: string; durationS?: number; chapters?: ReelChapterData[]; chaptersVtt?: string };
type Manifest = { version: 1; videos: Record<string, Entry>; reels: Record<string, Entry> };

function check(): never {
  const manifest = JSON.parse(readFileSync(MANIFEST_PATH, "utf8")) as Manifest;
  const missing: string[] = [];
  for (const group of [manifest.videos, manifest.reels]) {
    for (const entry of Object.values(group ?? {})) {
      const srcs = [
        ...Object.values(entry.variants ?? {}).map((v) => v.src),
        ...(entry.poster ? [entry.poster] : []),
        ...(entry.chaptersVtt ? [entry.chaptersVtt] : []),
      ];
      for (const src of srcs) if (!existsSync(join(ROOT, "public", src))) missing.push(src);
    }
  }
  if (missing.length > 0) {
    console.error(`video-manifest.json points at ${missing.length} missing file(s):\n${missing.map((m) => `  - ${m}`).join("\n")}`);
    process.exit(1);
  }
  console.log("video-manifest.json: all files present.");
  process.exit(0);
}

if (process.argv.includes("--check")) check();

const manifest: Manifest = { version: 1, videos: {}, reels: {} };
const dirs = existsSync(PUBLIC_VIDEOS)
  ? readdirSync(PUBLIC_VIDEOS, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name).sort()
  : [];

for (const key of dirs) {
  const dir = join(PUBLIC_VIDEOS, key);
  const entry: Entry = { variants: {} };
  for (const name of readdirSync(dir).sort()) {
    const parsed = parseOutputName(name);
    if (!parsed) continue;
    const src = `/videos/${key}/${name}`;
    if (parsed.ext === "webp") {
      entry.poster = src;
      continue;
    }
    const file = join(dir, name);
    const info = probe(file);
    entry.variants[parsed.variant] = {
      src,
      width: info.width,
      height: info.height,
      bytes: statSync(file).size,
      durationS: Math.round(info.durationS * 100) / 100,
    };
  }
  const names = Object.keys(entry.variants);
  if (names.length === 0) continue;
  const isReel = names.every((n) => n.startsWith("reel-"));
  const main = entry.variants["film-1080"] ?? entry.variants["reel-1080"] ?? entry.variants[names[0]];
  entry.durationS = main.durationS;
  if (isReel && existsSync(join(dir, CHAPTERS_JSON))) {
    const file = JSON.parse(readFileSync(join(dir, CHAPTERS_JSON), "utf8")) as ReelChaptersFile;
    if (Math.abs(file.durationS - main.durationS) > 0.1) {
      throw new Error(`${key}: chapters are for a ${file.durationS} s reel but the encode is ${main.durationS} s`);
    }
    entry.chapters = file.chapters;
    if (existsSync(join(dir, CHAPTERS_VTT))) entry.chaptersVtt = `/videos/${key}/${CHAPTERS_VTT}`;
  }
  (isReel ? manifest.reels : manifest.videos)[key] = entry;
  console.log(`${isReel ? "reel " : "video"} ${key}: ${names.join(", ")}${entry.poster ? ", poster" : ""}`);
}

writeFileSync(MANIFEST_PATH, `${JSON.stringify(manifest, null, 2)}\n`);
console.log(`\nWrote ${MANIFEST_PATH} (${Object.keys(manifest.videos).length} video(s), ${Object.keys(manifest.reels).length} reel(s)).`);
