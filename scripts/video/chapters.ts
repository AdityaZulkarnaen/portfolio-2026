/**
 * Chapters for the showreel, from the HyperFrames composition itself.
 *
 *   pnpm video:chapters                    # runs `hyperframes timeline --json` in video/reel
 *   pnpm video:chapters --from tl.json     # or reads a saved timeline JSON
 *
 * Timing: each chapter is a lower-third clip `#lt-<slug>` in video/reel/compositions/chapters.html
 * (absStart/absEnd from the timeline). Labels: that element's data-chapter / data-label / data-role.
 * Sync check: the chapter must start within ±0.1 s of the `<video id="<slug>">` cut it captions,
 * and end within ±0.1 s of that cut's end; otherwise the script fails.
 *
 * Writes public/videos/<REEL_KEY>/chapters.json (also the admin import format: one row per
 * reel_chapters record) and chapters.vtt (WebVTT chapters track). `pnpm video:manifest` embeds them.
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { CHAPTERS_JSON, CHAPTERS_VTT, PUBLIC_VIDEOS, REEL_DIR, REEL_KEY, hyperframes, type ReelChapterData, type ReelChaptersFile } from "./lib.ts";

const TOLERANCE_S = 0.1;

type Row = { id: string; kind: string; absStart: number; absEnd: number; file: string; children?: Row[] };
type Timeline = { timeline: { duration: number; tracks: { kind: string; rows: Row[] }[] } };

function readTimeline(): Timeline {
  const at = process.argv.indexOf("--from");
  const raw = at > 0 ? readFileSync(process.argv[at + 1], "utf8") : hyperframes(["timeline", "--json"], { quiet: true });
  return JSON.parse(raw.slice(raw.indexOf("{"))) as Timeline;
}

function flatten(rows: Row[], out: Row[] = []): Row[] {
  for (const r of rows) {
    out.push(r);
    if (r.children?.length) flatten(r.children, out);
  }
  return out;
}

/** `data-*` attributes of the element with this id in a composition file. */
function attrsOf(html: string, id: string): Record<string, string> {
  const open = new RegExp(`<[a-z0-9]+\\s[^>]*\\bid="${id}"[^>]*>`, "i").exec(html);
  if (!open) throw new Error(`#${id} not found in the composition`);
  const attrs: Record<string, string> = {};
  for (const m of open[0].matchAll(/\bdata-([a-z-]+)="([^"]*)"/g)) attrs[m[1]] = m[2];
  return attrs;
}

const round = (s: number) => Math.round(s * 1000) / 1000;

function vttTime(s: number): string {
  const ms = Math.round(s * 1000);
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  const sec = Math.floor((ms % 60_000) / 1000);
  const pad = (n: number, w = 2) => String(n).padStart(w, "0");
  return `${pad(h)}:${pad(m)}:${pad(sec)}.${pad(ms % 1000, 3)}`;
}

const tl = readTimeline();
const rows = flatten(tl.timeline.tracks.flatMap((t) => t.rows));
const videos = new Map(rows.filter((r) => r.kind === "video").map((r) => [r.id, r]));
const lowerThirds = rows.filter((r) => r.id?.startsWith("lt-")).sort((a, b) => a.absStart - b.absStart);
if (lowerThirds.length === 0) throw new Error("No #lt-<slug> chapter clips in the timeline");

const files = new Map<string, string>();
const html = (file: string) => {
  if (!files.has(file)) files.set(file, readFileSync(join(REEL_DIR, file), "utf8"));
  return files.get(file)!;
};

const problems: string[] = [];
const chapters: ReelChapterData[] = lowerThirds.map((lt) => {
  const a = attrsOf(html(lt.file), lt.id);
  const slug = a.slug ?? lt.id.slice(3);
  const cut = videos.get(slug);
  if (!cut) problems.push(`${lt.id}: no <video id="${slug}"> in the timeline`);
  else {
    if (Math.abs(cut.absStart - lt.absStart) > TOLERANCE_S) problems.push(`${lt.id} starts at ${lt.absStart}s but its cut starts at ${cut.absStart}s`);
    if (Math.abs(cut.absEnd - lt.absEnd) > TOLERANCE_S) problems.push(`${lt.id} ends at ${lt.absEnd}s but its cut ends at ${cut.absEnd}s`);
  }
  if (!/^\d{2}$/.test(a.chapter ?? "")) problems.push(`${lt.id}: data-chapter must be two digits`);
  return { number: a.chapter ?? "", slug, label: a.label ?? slug, role: a.role ?? "", startS: round(lt.absStart), endS: round(lt.absEnd) };
});
for (let i = 1; i < chapters.length; i++) {
  if (chapters[i].startS < chapters[i - 1].endS - TOLERANCE_S) problems.push(`${chapters[i].slug} overlaps ${chapters[i - 1].slug}`);
}
if (problems.length > 0) {
  console.error(`Chapters out of sync:\n${problems.map((p) => `  - ${p}`).join("\n")}`);
  process.exit(1);
}

const file: ReelChaptersFile = { key: REEL_KEY, title: "Showreel", durationS: round(tl.timeline.duration), chapters };
const vtt = ["WEBVTT", "", ...chapters.flatMap((c, i) => [`${i + 1}`, `${vttTime(c.startS)} --> ${vttTime(c.endS)}`, `${c.number} · ${c.label}`, ""])].join("\n");

const dir = join(PUBLIC_VIDEOS, REEL_KEY);
mkdirSync(dir, { recursive: true });
writeFileSync(join(dir, CHAPTERS_JSON), `${JSON.stringify(file, null, 2)}\n`);
writeFileSync(join(dir, CHAPTERS_VTT), vtt);
console.table(chapters.map((c) => ({ "#": c.number, project: c.label, start: c.startS, end: c.endS })));
console.log(`Wrote ${join(dir, CHAPTERS_JSON)} and ${CHAPTERS_VTT} (${file.durationS} s reel).`);
