/**
 * Copy rendered brag films into the masters folder (outside the repo).
 *
 *   pnpm video:collect                 # every film in films.config.json
 *   pnpm video:collect depths          # just these slugs
 *
 * For each film: take `<source>/<master>` (or the newest `brag-output*\/brag.mp4` when that
 * is missing) and copy it to `<mastersDir>/<slug>.mp4` when it is new or changed. Source
 * repos only get `brag-output*\/` appended to `.git/info/exclude`; tracked files are never touched.
 */
import { appendFileSync, copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

import { loadConfig, masterPath, selectSlugs } from "./lib.ts";

const EXCLUDE_LINE = "brag-output*/";

function findMaster(source: string, preferred: string | undefined): string | null {
  if (preferred) {
    const p = join(source, preferred);
    if (existsSync(p)) return p;
  }
  const candidates = readdirSync(source, { withFileTypes: true })
    .filter((d) => d.isDirectory() && d.name.startsWith("brag-output"))
    .map((d) => join(source, d.name, "brag.mp4"))
    .filter((p) => existsSync(p))
    .sort((a, b) => statSync(b).mtimeMs - statSync(a).mtimeMs);
  return candidates[0] ?? null;
}

function ensureExclude(source: string): string {
  const gitDir = join(source, ".git");
  if (!existsSync(gitDir)) return "not a git repo";
  if (!statSync(gitDir).isDirectory()) return ".git is a file (worktree/submodule), exclude skipped";
  const infoDir = join(gitDir, "info");
  const exclude = join(infoDir, "exclude");
  mkdirSync(infoDir, { recursive: true });
  const current = existsSync(exclude) ? readFileSync(exclude, "utf8") : "";
  if (current.split(/\r?\n/).some((l) => l.trim() === EXCLUDE_LINE)) return "exclude ok";
  appendFileSync(exclude, `${current && !current.endsWith("\n") ? "\n" : ""}${EXCLUDE_LINE}\n`);
  return "exclude added";
}

const config = loadConfig();
mkdirSync(config.mastersDir, { recursive: true });

let copied = 0;
let missing = 0;
for (const slug of selectSlugs(config, process.argv.slice(2))) {
  const film = config.films[slug];
  if (film.film === false || !film.source) {
    console.log(`- ${slug}: no film (${film.note ?? "stills only"})`);
    continue;
  }
  if (!existsSync(film.source)) {
    console.log(`! ${slug}: source folder missing: ${film.source}`);
    missing++;
    continue;
  }
  const git = ensureExclude(film.source);
  const src = findMaster(film.source, film.master);
  if (!src) {
    console.log(`! ${slug}: not rendered yet (no brag-output*/brag.mp4 in ${film.source}) [${git}]`);
    missing++;
    continue;
  }
  const dest = masterPath(config, slug);
  const s = statSync(src);
  if (existsSync(dest)) {
    const d = statSync(dest);
    if (d.size === s.size && d.mtimeMs >= s.mtimeMs) {
      console.log(`= ${slug}: up to date (${(s.size / 1e6).toFixed(2)} MB) [${git}]`);
      continue;
    }
  }
  copyFileSync(src, dest);
  copied++;
  console.log(`+ ${slug}: ${src} → ${dest} (${(s.size / 1e6).toFixed(2)} MB) [${git}]`);
}

console.log(`\nCollected ${copied} new master(s); ${missing} film(s) missing. Review each master before encoding.`);
