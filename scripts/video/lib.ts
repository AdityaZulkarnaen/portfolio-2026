/**
 * Shared bits for the video pipeline (collect → encode → manifest).
 * Node 22 native TypeScript: erasable syntax only, explicit `.ts` imports, no `@/` alias.
 */
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import ffmpegPath from "ffmpeg-static";
import ffprobeStatic from "ffprobe-static";

export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
export const PUBLIC_VIDEOS = join(ROOT, "public", "videos");
export const MANIFEST_PATH = join(ROOT, "generated", "video-manifest.json");

export type FilmConfig = {
  source?: string;
  master?: string;
  film?: boolean;
  note?: string;
  loop?: { start: number; duration: number };
  posterAt?: number;
};

export type FilmsConfig = { mastersDir: string; films: Record<string, FilmConfig> };

export function loadConfig(): FilmsConfig {
  return JSON.parse(readFileSync(join(ROOT, "scripts", "video", "films.config.json"), "utf8")) as FilmsConfig;
}

export function masterPath(config: FilmsConfig, slug: string): string {
  return join(config.mastersDir, `${slug}.mp4`);
}

/** Slugs selected on the command line (`pnpm video:encode depths ugm-cup-2026`), or every film. */
export function selectSlugs(config: FilmsConfig, argv: string[]): string[] {
  const args = argv.filter((a) => !a.startsWith("--"));
  const all = Object.keys(config.films);
  const unknown = args.filter((a) => !all.includes(a));
  if (unknown.length > 0) throw new Error(`Unknown slug(s): ${unknown.join(", ")}. Known: ${all.join(", ")}`);
  return args.length > 0 ? args : all;
}

/** Resolved lazily so fs-only commands (manifest --check) never depend on the binaries. */
export function ffmpegBin(): string {
  if (!ffmpegPath) throw new Error("ffmpeg-static has no binary for this platform");
  return ffmpegPath as unknown as string;
}

export function ffprobeBin(): string {
  return ffprobeStatic.path;
}

/** Run a binary synchronously (one job at a time: the machine is low on RAM). Throws on non-zero exit. */
export function run(bin: string, args: string[], opts: { quiet?: boolean } = {}): string {
  const res = spawnSync(bin, args, {
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
    stdio: ["ignore", "pipe", opts.quiet ? "pipe" : "inherit"],
  });
  if (res.error) throw res.error;
  if (res.status !== 0) {
    const tail = (res.stderr ?? "").split("\n").slice(-20).join("\n");
    throw new Error(`${bin} exited with ${res.status}\n${tail}`);
  }
  return res.stdout;
}

export type Probe = { durationS: number; width: number; height: number; fps: number; hasAudio: boolean; bitRate: number };

export function probe(file: string): Probe {
  const out = run(ffprobeBin(), ["-v", "error", "-show_entries", "format=duration,bit_rate:stream=codec_type,width,height,r_frame_rate", "-of", "json", file], {
    quiet: true,
  });
  const json = JSON.parse(out) as {
    format: { duration?: string; bit_rate?: string };
    streams: { codec_type: string; width?: number; height?: number; r_frame_rate?: string }[];
  };
  const video = json.streams.find((s) => s.codec_type === "video");
  if (!video) throw new Error(`No video stream in ${file}`);
  const [n, d] = (video.r_frame_rate ?? "30/1").split("/").map(Number);
  return {
    durationS: Number(json.format.duration ?? 0),
    bitRate: Number(json.format.bit_rate ?? 0),
    width: video.width ?? 0,
    height: video.height ?? 0,
    fps: d ? n / d : 30,
    hasAudio: json.streams.some((s) => s.codec_type === "audio"),
  };
}

/** `film-1080.3f2a9c01de.mp4` → { variant: "film-1080", hash, ext }. */
export function parseOutputName(name: string): { variant: string; hash: string; ext: string } | null {
  const m = /^([a-z0-9-]+)\.([0-9a-f]{10})\.(mp4|webp)$/.exec(name);
  return m ? { variant: m[1], hash: m[2], ext: m[3] } : null;
}
