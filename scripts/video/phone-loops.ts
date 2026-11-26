/**
 * Portrait loops for mobile projects (`loop-phone`), cut from the phone-screen scene clips each
 * film's HyperFrames composition already holds (824×1784, the 9:19.5 screen). The 16:9 film
 * loops only show a sliver when cropped into the home page's phone shells.
 *
 *   pnpm video:phone [slug…]   then   pnpm video:manifest
 *
 * Output: public/videos/<slug>/loop-phone.<hash>.mp4 (480×1040, muted, ≤1.5 MB), with
 * crossfades between clips and a crossfade seam so it loops cleanly.
 */
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, unlinkSync } from "node:fs";
import { join } from "node:path";

import { ffmpegBin, PUBLIC_VIDEOS, parseOutputName, probe, run } from "./lib.ts";

const VARIANT = "loop-phone";
const BUDGET = 1_500_000;
const W = 480;
const H = 1040;
const XFADE = 0.4;

/** Scene clips (in order) from each film's composition/assets. */
const PHONE_FILMS: Record<string, string[]> = {
  tbxpert: ["D:\\coding\\tbxpert\\brag-output\\composition\\assets\\onb.mp4", "D:\\coding\\tbxpert\\brag-output\\composition\\assets\\diag.mp4"],
  "satu-teladan-apk": [
    "D:\\coding\\SatelFrontEnd\\Frontend\\brag-output\\composition\\assets\\home.mp4",
    "D:\\coding\\SatelFrontEnd\\Frontend\\brag-output\\composition\\assets\\dir.mp4",
    "D:\\coding\\SatelFrontEnd\\Frontend\\brag-output\\composition\\assets\\map.mp4",
  ],
};

function build(slug: string, clips: string[]) {
  for (const c of clips) if (!existsSync(c)) throw new Error(`${slug}: missing clip ${c}`);
  const durations = clips.map((c) => probe(c).durationS);

  const hash = createHash("sha1");
  for (const c of clips) hash.update(readFileSync(c));
  hash.update(JSON.stringify({ W, H, XFADE, BUDGET, v: 1 }));
  const name = `${VARIANT}.${hash.digest("hex").slice(0, 10)}.mp4`;
  const dir = join(PUBLIC_VIDEOS, slug);
  const out = join(dir, name);
  if (existsSync(out)) {
    console.log(`  = ${slug}/${name} (unchanged)`);
    return;
  }
  mkdirSync(dir, { recursive: true });

  // Chain the clips with xfade, then loop the seam: the head is crossfaded over the tail.
  const scale = (i: number) => `[${i}:v]scale=${W}:${H}:flags=lanczos,setsar=1,fps=30,format=yuv420p[s${i}]`;
  const parts = clips.map((_, i) => scale(i));
  let label = "s0";
  let length = durations[0];
  for (let i = 1; i < clips.length; i++) {
    const next = `x${i}`;
    parts.push(`[${label}][s${i}]xfade=transition=fade:duration=${XFADE}:offset=${(length - XFADE).toFixed(3)}[${next}]`);
    label = next;
    length += durations[i] - XFADE;
  }
  const total = length - XFADE;
  parts.push(
    `[${label}]split[a][b]`,
    `[a]trim=start=${XFADE},setpts=PTS-STARTPTS[body]`,
    `[b]trim=end=${XFADE},setpts=PTS-STARTPTS[head]`,
    `[body][head]xfade=transition=fade:duration=${XFADE}:offset=${(total - XFADE).toFixed(3)}[out]`,
  );

  let kbps = Math.floor((BUDGET * 8 * 0.92) / total / 1000);
  for (let attempt = 0; attempt < 2; attempt++) {
    const args = [
      "-y",
      ...clips.flatMap((c) => ["-i", c]),
      "-filter_complex",
      parts.join(";"),
      "-map",
      "[out]",
      "-an",
      "-c:v",
      "libx264",
      "-profile:v",
      "high",
      "-pix_fmt",
      "yuv420p",
      "-b:v",
      `${kbps}k`,
      "-maxrate",
      `${Math.floor(kbps * 1.5)}k`,
      "-bufsize",
      `${kbps * 2}k`,
      "-g",
      "60",
      "-keyint_min",
      "60",
      "-sc_threshold",
      "0",
      "-movflags",
      "+faststart",
      out,
    ];
    run(ffmpegBin(), ["-loglevel", "error", ...args], { quiet: true });
    const size = statSync(out).size;
    if (size <= BUDGET) {
      console.log(`  + ${slug}/${name} ${(size / 1e6).toFixed(2)} MB / ${(BUDGET / 1e6).toFixed(2)} MB · ${total.toFixed(1)}s`);
      for (const f of readdirSync(dir)) {
        const p = parseOutputName(f);
        if (p && p.variant === VARIANT && f !== name) unlinkSync(join(dir, f));
      }
      return;
    }
    kbps = Math.floor(kbps * (BUDGET / size) * 0.95);
  }
  unlinkSync(out);
  throw new Error(`${slug}/${VARIANT} exceeds its budget`);
}

const wanted = process.argv.slice(2);
for (const [slug, clips] of Object.entries(PHONE_FILMS)) {
  if (wanted.length && !wanted.includes(slug)) continue;
  build(slug, clips);
}
