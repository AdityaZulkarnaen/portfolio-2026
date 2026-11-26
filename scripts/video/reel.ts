/**
 * Build the chaptered showreel end to end.
 *
 *   pnpm video:reel                 # stage masters → music → render → chapters → encode → manifest
 *   pnpm video:reel --skip-render   # reuse video/reel/out/reel.mp4 (re-cut chapters / encodes only)
 *   pnpm video:reel --force         # re-encode even if the hashed outputs exist
 *
 * The composition is video/reel/ (HyperFrames). Its masters and music are build inputs, not
 * committed: the 8 approved masters are hard-linked (copied across drives) from films.config.json's
 * mastersDir into video/reel/assets/masters/, and video/reel/music.py (numpy + scipy) writes
 * assets/music.wav. Rendering uses 2 workers (each is a Chrome process; the machine is low on RAM).
 */
import { spawnSync } from "node:child_process";
import { copyFileSync, existsSync, linkSync, mkdirSync, readFileSync, statSync, unlinkSync } from "node:fs";
import { join } from "node:path";

import { REEL_DIR, REEL_MASTER, ROOT, hyperframes, loadConfig, masterPath, probe } from "./lib.ts";

const skipRender = process.argv.includes("--skip-render");
const force = process.argv.includes("--force");

function step(title: string) {
  console.log(`\n▸ ${title}`);
}

function node(script: string, args: string[] = []) {
  const res = spawnSync(process.execPath, ["--disable-warning=MODULE_TYPELESS_PACKAGE_JSON", join(ROOT, "scripts", "video", script), ...args], {
    stdio: "inherit",
  });
  if (res.status !== 0) process.exit(res.status ?? 1);
}

/** Every `assets/masters/<slug>.mp4` the composition references. */
function referencedMasters(): string[] {
  const html = readFileSync(join(REEL_DIR, "index.html"), "utf8");
  return [...new Set([...html.matchAll(/src="assets\/masters\/([a-z0-9-]+)\.mp4"/g)].map((m) => m[1]))];
}

if (!skipRender) {
  step("Stage masters");
  const config = loadConfig();
  const dir = join(REEL_DIR, "assets", "masters");
  mkdirSync(dir, { recursive: true });
  for (const slug of referencedMasters()) {
    const from = masterPath(config, slug);
    const to = join(dir, `${slug}.mp4`);
    if (!existsSync(from)) throw new Error(`No approved master for ${slug} at ${from}`);
    if (existsSync(to) && statSync(to).size === statSync(from).size && statSync(to).mtimeMs >= statSync(from).mtimeMs) continue;
    if (existsSync(to)) unlinkSync(to);
    try {
      linkSync(from, to);
    } catch {
      copyFileSync(from, to); // different drive
    }
    console.log(`  ${slug}.mp4`);
  }

  step("Music bed (120 BPM, numpy)");
  const py = spawnSync(process.platform === "win32" ? "python" : "python3", [join(REEL_DIR, "music.py")], { stdio: "inherit" });
  if (py.status !== 0) throw new Error("music.py failed (needs numpy + scipy)");

  step("Render (2 workers)");
  mkdirSync(join(REEL_DIR, "out"), { recursive: true });
  hyperframes(["render", "--workers", "2", "--quality", "delivery", "--output", "out/reel.mp4"]);
}

if (!existsSync(REEL_MASTER)) throw new Error(`No render at ${REEL_MASTER}`);
const info = probe(REEL_MASTER);
console.log(`  reel.mp4: ${info.width}×${info.height} @ ${info.fps} fps, ${info.durationS.toFixed(2)} s, audio ${info.hasAudio ? "yes" : "NO"}`);
if (!info.hasAudio) throw new Error("The reel render has no audio track");

step("Chapters (hyperframes timeline --json)");
node("chapters.ts");

step("Encode reel variants");
node("encode.ts", ["--reel", ...(force ? ["--force"] : [])]);

step("Manifest");
node("manifest.ts");
