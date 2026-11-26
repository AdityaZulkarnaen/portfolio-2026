/**
 * Encode reviewed masters into web variants under public/videos/<slug>/.
 *
 *   pnpm video:encode                  # every film that has a master
 *   pnpm video:encode depths           # just these slugs
 *   pnpm video:encode depths --force   # re-encode even if the hashed output exists
 *   pnpm video:encode --reel           # the showreel (video/reel/out/reel.mp4) → public/videos/showreel/
 *
 * Variants (H.264 High, yuv420p, +faststart, closed 2 s GOP, two-pass bitrate fitted to budget):
 *   film-1080  full film, AAC audio          ≤ 9 MB
 *   loop-720   ~7 s segment, muted, seam xfade ≤ 2.5 MB
 *   loop-480   same segment at 480p, muted     ≤ 1.2 MB
 *   poster     WebP still from the loop        ≤ 160 KB
 * Reel variants (full length; the reel opens and closes on ink, so it loops without a seam):
 *   reel-1080      AAC audio, for the modal    ≤ 35 MB
 *   reel-hero-720  muted, the hero window      ≤ 15 MB
 *   reel-hero-480  muted, phones / small hero  ≤ 7 MB
 *   poster         WebP still                  ≤ 160 KB
 * (MB/KB are decimal: 1 MB = 1,000,000 bytes.)
 *
 * File names are `<variant>.<hash>.<ext>`, the hash covering the master's bytes and the
 * variant's settings, so an unchanged master + settings is skipped (idempotent) and any
 * change yields a new immutable URL. Stale hashes of the same variant are deleted.
 * Budget overruns fail the script. Jobs run one at a time (low-RAM machine).
 */
import { createHash } from "node:crypto";
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync, unlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import sharp from "sharp";

import {
  CHAPTERS_JSON,
  ffmpegBin,
  PUBLIC_VIDEOS,
  REEL_KEY,
  REEL_MASTER,
  loadConfig,
  masterPath,
  parseOutputName,
  probe,
  run,
  selectSlugs,
  type FilmConfig,
  type ReelChaptersFile,
} from "./lib.ts";

/** Bump to invalidate every hash when the encoder recipe changes. */
const RECIPE = 2;
const MB = 1_000_000;
const KB = 1_000;
const AUDIO_KBPS = 96;
const XFADE_S = 0.5;
const DEFAULT_LOOP_S = 7;
/** Leave headroom for container overhead and two-pass drift. */
const FILL = 0.92;

type VideoSpec = {
  variant: string;
  height: number;
  audio: boolean;
  budget: number;
  /** Quality ceiling: never spend more than this even if the budget allows it. */
  capKbps: number;
  segment: "full" | "loop";
};

const VIDEO_SPECS: VideoSpec[] = [
  { variant: "film-1080", height: 1080, audio: true, budget: 9 * MB, capKbps: 4000, segment: "full" },
  { variant: "loop-720", height: 720, audio: false, budget: 2.5 * MB, capKbps: 2000, segment: "loop" },
  { variant: "loop-480", height: 480, audio: false, budget: 1.2 * MB, capKbps: 1000, segment: "loop" },
];

const REEL_SPECS: VideoSpec[] = [
  { variant: "reel-1080", height: 1080, audio: true, budget: 35 * MB, capKbps: 6000, segment: "full" },
  { variant: "reel-hero-720", height: 720, audio: false, budget: 15 * MB, capKbps: 2500, segment: "full" },
  { variant: "reel-hero-480", height: 480, audio: false, budget: 7 * MB, capKbps: 1200, segment: "full" },
];
/** Poster frame: UGM Cup's bracket with its chapter card up (t = 8.5 s). */
const REEL_FILM: FilmConfig = { posterAt: 8.5, loop: { start: 0, duration: 7 } };

const POSTER = { variant: "poster", width: 1920, budget: 160 * KB, qualities: [80, 72, 64, 56, 48], fallbackWidths: [1600, 1280] };

const force = process.argv.includes("--force");
const config = loadConfig();
const failures: string[] = [];

function sha(...parts: (string | Buffer)[]): string {
  const h = createHash("sha256");
  for (const p of parts) h.update(p);
  return h.digest("hex");
}

function fmt(bytes: number): string {
  return bytes >= MB ? `${(bytes / MB).toFixed(2)} MB` : `${(bytes / KB).toFixed(0)} KB`;
}

/** Remove other hashes of the same variant once the new one is in place. */
function pruneStale(dir: string, variant: string, keep: string) {
  for (const name of readdirSync(dir)) {
    const parsed = parseOutputName(name);
    if (parsed && parsed.variant === variant && name !== keep) {
      unlinkSync(join(dir, name));
      console.log(`    pruned ${name}`);
    }
  }
}

function loopWindow(film: FilmConfig, durationS: number): { start: number; duration: number } {
  const duration = film.loop?.duration ?? DEFAULT_LOOP_S;
  const start = film.loop?.start ?? Math.max(1, Math.min(durationS * 0.25, durationS - duration - XFADE_S - 1));
  if (start < 0 || start + duration + XFADE_S > durationS) {
    throw new Error(`loop window ${start}s + ${duration}s (+${XFADE_S}s xfade) exceeds the ${durationS}s master`);
  }
  return { start, duration };
}

function encodeVideo(slug: string, master: string, masterHash: string, film: FilmConfig, spec: VideoSpec, dir: string, work: string) {
  const info = probe(master);
  const fps = Math.round(info.fps) || 30;
  const gop = fps * 2;
  const loop = spec.segment === "loop" ? loopWindow(film, info.durationS) : null;
  const outDuration = loop ? loop.duration : info.durationS;
  const withAudio = spec.audio && info.hasAudio;

  const recipe = { RECIPE, spec, loop, fps, AUDIO_KBPS, XFADE_S, FILL };
  const hash = sha(masterHash, JSON.stringify(recipe)).slice(0, 10);
  const name = `${spec.variant}.${hash}.mp4`;
  const out = join(dir, name);
  if (existsSync(out) && !force) {
    console.log(`  = ${spec.variant}: ${name} exists (${fmt(statSync(out).size)})`);
    return;
  }

  const input = loop ? ["-ss", String(loop.start), "-t", String(loop.duration + XFADE_S), "-i", master] : ["-i", master];
  const base = `[0:v]scale=-2:${spec.height}:flags=lanczos,fps=${fps},format=yuv420p`;
  // Loop seam: the last XFADE_S of the segment dissolves into its first XFADE_S, so frame N-1 → 0 is continuous.
  const filter = loop
    ? `${base},split[a][b];[a]trim=start=${XFADE_S}:duration=${loop.duration},setpts=PTS-STARTPTS[main];` +
      `[b]trim=duration=${XFADE_S},setpts=PTS-STARTPTS[head];` +
      `[main][head]xfade=transition=fade:duration=${XFADE_S}:offset=${loop.duration - XFADE_S},format=yuv420p[v]`
    : `${base}[v]`;

  const audioBps = withAudio ? AUDIO_KBPS * 1000 : 0;
  // Never spend more than the master itself carries (+10%): re-encoding above it buys no quality.
  const sourceKbps = info.bitRate > 0 ? Math.round((info.bitRate * 1.1) / 1000) : Infinity;
  let kbps = Math.floor(Math.min(spec.capKbps, sourceKbps, ((spec.budget * 8 * FILL) / outDuration - audioBps) / 1000));
  if (kbps < 150) throw new Error(`${spec.variant}: budget leaves only ${kbps} kbps for ${outDuration.toFixed(1)} s`);

  const passlog = join(work, `${slug}-${spec.variant}`);
  const tmpOut = join(work, name);

  for (let attempt = 1; attempt <= 2; attempt++) {
    const video = [
      "-filter_complex", filter, "-map", "[v]",
      "-c:v", "libx264", "-profile:v", "high", "-pix_fmt", "yuv420p", "-preset", "slow",
      "-b:v", `${kbps}k`, "-maxrate", `${Math.round(kbps * 1.6)}k`, "-bufsize", `${kbps * 2}k`,
      "-g", String(gop), "-keyint_min", String(gop), "-sc_threshold", "0", "-flags", "+cgop",
      "-threads", "4", "-passlogfile", passlog,
    ];
    console.log(`  … ${spec.variant}: ${spec.height}p ${outDuration.toFixed(1)} s @ ${kbps} kbps${withAudio ? ` + ${AUDIO_KBPS}k AAC` : ", muted"} (attempt ${attempt})`);
    run(ffmpegBin(), ["-y", "-hide_banner", "-loglevel", "error", ...input, ...video, "-pass", "1", "-an", "-f", "null", process.platform === "win32" ? "NUL" : "/dev/null"]);
    const audio = withAudio ? ["-map", "0:a:0", "-c:a", "aac", "-b:a", `${AUDIO_KBPS}k`, "-ac", "2"] : ["-an"];
    if (withAudio && loop === null) audio.push("-shortest");
    run(ffmpegBin(), ["-y", "-hide_banner", "-loglevel", "error", ...input, ...video, "-pass", "2", ...audio, "-movflags", "+faststart", tmpOut]);

    const size = statSync(tmpOut).size;
    if (size <= spec.budget) {
      mkdirSync(dir, { recursive: true });
      copyFileSync(tmpOut, out); // tmp may be on another drive (EXDEV)
      unlinkSync(tmpOut);
      console.log(`  + ${spec.variant}: ${name} ${fmt(size)} / ${fmt(spec.budget)}`);
      pruneStale(dir, spec.variant, name);
      return;
    }
    console.log(`    over budget: ${fmt(size)} > ${fmt(spec.budget)}`);
    kbps = Math.floor(kbps * (spec.budget / size) * 0.95);
  }
  throw new Error(`${slug}/${spec.variant} exceeds its ${fmt(spec.budget)} budget after a refit`);
}

async function encodePoster(slug: string, master: string, masterHash: string, film: FilmConfig, dir: string, work: string) {
  const info = probe(master);
  const loop = loopWindow(film, info.durationS);
  const at = film.posterAt ?? loop.start + loop.duration / 2;
  const hash = sha(masterHash, JSON.stringify({ RECIPE, POSTER, at })).slice(0, 10);
  const name = `${POSTER.variant}.${hash}.webp`;
  const out = join(dir, name);
  if (existsSync(out) && !force) {
    console.log(`  = poster: ${name} exists (${fmt(statSync(out).size)})`);
    return;
  }

  const png = join(work, `${slug}-poster.png`);
  run(ffmpegBin(), ["-y", "-hide_banner", "-loglevel", "error", "-ss", String(at), "-i", master, "-frames:v", "1", png]);
  const frame = readFileSync(png);

  for (const width of [POSTER.width, ...POSTER.fallbackWidths]) {
    for (const quality of POSTER.qualities) {
      const buf = await sharp(frame).resize({ width, withoutEnlargement: true }).webp({ quality, effort: 6, smartSubsample: true }).toBuffer();
      if (buf.length <= POSTER.budget) {
        mkdirSync(dir, { recursive: true });
        await sharp(buf).toFile(out);
        console.log(`  + poster: ${name} ${fmt(buf.length)} / ${fmt(POSTER.budget)} (${width}w q${quality}, t=${at}s)`);
        pruneStale(dir, POSTER.variant, name);
        return;
      }
    }
  }
  throw new Error(`${slug}/poster cannot fit ${fmt(POSTER.budget)}`);
}

/** The rendered reel must match the composition the chapters came from (±0.1 s). */
function checkReelDuration(master: string) {
  const chapters = join(PUBLIC_VIDEOS, REEL_KEY, CHAPTERS_JSON);
  if (!existsSync(chapters)) throw new Error(`${chapters} is missing: run \`pnpm video:chapters\` first`);
  const expected = (JSON.parse(readFileSync(chapters, "utf8")) as ReelChaptersFile).durationS;
  const actual = probe(master).durationS;
  if (Math.abs(actual - expected) > 0.1) throw new Error(`reel master is ${actual.toFixed(2)} s but the chapters say ${expected} s: re-render`);
}

async function encodeReel(work: string) {
  if (!existsSync(REEL_MASTER)) throw new Error(`No reel master at ${REEL_MASTER} (run \`pnpm video:reel\`)`);
  console.log(`${REEL_KEY}:`);
  checkReelDuration(REEL_MASTER);
  const masterHash = sha(readFileSync(REEL_MASTER));
  const dir = join(PUBLIC_VIDEOS, REEL_KEY);
  for (const spec of REEL_SPECS) encodeVideo(REEL_KEY, REEL_MASTER, masterHash, REEL_FILM, spec, dir, work);
  await encodePoster(REEL_KEY, REEL_MASTER, masterHash, REEL_FILM, dir, work);
}

const work = mkdtempSync(join(tmpdir(), "video-encode-"));
try {
  if (process.argv.includes("--reel")) {
    try {
      await encodeReel(work);
    } catch (error) {
      failures.push(`${REEL_KEY}: ${(error as Error).message}`);
      console.error(`  ✗ ${(error as Error).message}`);
    }
  }
  for (const slug of process.argv.includes("--reel") ? [] : selectSlugs(config, process.argv.slice(2))) {
    const film = config.films[slug];
    if (film.film === false) {
      console.log(`- ${slug}: no film (${film.note ?? "stills only"})`);
      continue;
    }
    const master = masterPath(config, slug);
    if (!existsSync(master)) {
      console.log(`- ${slug}: no master at ${master} (run video:collect after rendering)`);
      continue;
    }
    console.log(`${slug}:`);
    const masterHash = sha(readFileSync(master));
    const dir = join(PUBLIC_VIDEOS, slug);
    try {
      for (const spec of VIDEO_SPECS) encodeVideo(slug, master, masterHash, film, spec, dir, work);
      await encodePoster(slug, master, masterHash, film, dir, work);
    } catch (error) {
      failures.push(`${slug}: ${(error as Error).message}`);
      console.error(`  ✗ ${(error as Error).message}`);
    }
  }
} finally {
  rmSync(work, { recursive: true, force: true });
}

if (failures.length > 0) {
  console.error(`\nEncode FAILED for ${failures.length} film(s):\n${failures.map((f) => `  - ${f}`).join("\n")}`);
  process.exit(1);
}
console.log("\nEncode done. Run `pnpm video:manifest` next.");
