/**
 * Extract the legacy Sanity content from the old portfolio's Next fetch cache.
 *
 *   node scripts/seed/extract-legacy.ts D:\coding\portfolio-latest
 *
 * Reads `<root>/.next/cache/fetch-cache/*` only (never `.env*`), picks the newest
 * response per GROQ document type, converts Portable Text to markup-lite and
 * Sanity asset refs to CDN URLs, and writes `supabase/seed/legacy-content.json`.
 *
 * Runs on Node 22 native TypeScript (erasable syntax only).
 */
import { readdirSync, readFileSync, statSync, writeFileSync, mkdirSync } from "node:fs";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const SANITY_PROJECT = "revvtx1j";
const SANITY_DATASET = "production";

type Json = null | boolean | number | string | Json[] | { [key: string]: Json };
type Obj = { [key: string]: Json };

export type LegacyImage = {
  url: string;
  width: number;
  height: number;
  ext: string;
  alt: string;
  lqip: string | null;
  focal_x: number | null;
  focal_y: number | null;
};

const root = process.argv[2];
if (!root) {
  console.error("Usage: node scripts/seed/extract-legacy.ts <path-to-portfolio-latest>");
  process.exit(1);
}

const cacheDir = join(resolve(root), ".next", "cache", "fetch-cache");
const here = dirname(fileURLToPath(import.meta.url));
const outFile = resolve(here, "..", "..", "supabase", "seed", "legacy-content.json");

/** JSON.parse that tolerates trailing bytes (some cache files have garbage after the object). */
function lenientParse(text: string): Json {
  try {
    return JSON.parse(text) as Json;
  } catch (error) {
    const match = /position (\d+)/.exec(String((error as Error).message));
    if (match) return JSON.parse(text.slice(0, Number(match[1]))) as Json;
    throw error;
  }
}

function decodeBody(body: string): Json {
  try {
    const decoded = Buffer.from(body, "base64").toString("utf8");
    return lenientParse(decoded);
  } catch {
    return lenientParse(body);
  }
}

function isObj(value: Json | undefined): value is Obj {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function str(value: Json | undefined): string | null {
  return typeof value === "string" && value.trim() !== "" ? value.trim() : null;
}

// ---------------------------------------------------------------------------
// 1. Collect the newest Sanity response per document type
// ---------------------------------------------------------------------------
type Entry = { file: string; mtime: number; type: string; result: Json };
const newest = new Map<string, Entry>();

for (const file of readdirSync(cacheDir)) {
  const full = join(cacheDir, file);
  if (!statSync(full).isFile()) continue;
  let entry: Json;
  try {
    entry = lenientParse(readFileSync(full, "utf8"));
  } catch {
    continue;
  }
  if (!isObj(entry) || !isObj(entry.data)) continue;
  const url = str(entry.data.url);
  const body = entry.data.body;
  if (!url || typeof body !== "string" || !url.includes("sanity.io")) continue;

  const query = new URL(url).searchParams.get("query") ?? "";
  const typeMatch = /_type\s*==\s*"([^"]+)"/.exec(query);
  if (!typeMatch) continue;

  let payload: Json;
  try {
    payload = decodeBody(body);
  } catch {
    continue;
  }
  if (!isObj(payload) || !("result" in payload)) continue;

  const type = typeMatch[1];
  const mtime = statSync(full).mtimeMs;
  const prev = newest.get(type);
  if (!prev || mtime > prev.mtime) {
    newest.set(type, { file, mtime, type, result: payload.result });
  }
}

for (const entry of newest.values()) {
  console.log(`· ${entry.type.padEnd(12)} ← ${entry.file.slice(0, 12)}… (${new Date(entry.mtime).toISOString()})`);
}

// ---------------------------------------------------------------------------
// 2. Converters
// ---------------------------------------------------------------------------

/** `image-<id>-<W>x<H>-<ext>` → CDN URL with dimensions. */
function imageFromRef(ref: string): Omit<LegacyImage, "alt" | "lqip" | "focal_x" | "focal_y"> | null {
  const match = /^image-([a-f0-9]+)-(\d+)x(\d+)-([a-z0-9]+)$/i.exec(ref);
  if (!match) return null;
  const [, id, w, h, ext] = match;
  return {
    url: `https://cdn.sanity.io/images/${SANITY_PROJECT}/${SANITY_DATASET}/${id}-${w}x${h}.${ext}`,
    width: Number(w),
    height: Number(h),
    ext: ext.toLowerCase(),
  };
}

/** `file-<id>-<ext>` → CDN URL. */
export function fileFromRef(ref: string): string | null {
  const match = /^file-([a-f0-9]+)-([a-z0-9]+)$/i.exec(ref);
  if (!match) return null;
  return `https://cdn.sanity.io/files/${SANITY_PROJECT}/${SANITY_DATASET}/${match[1]}.${match[2]}`;
}

function round(n: number): number {
  return Math.round(n * 10000) / 10000;
}

/** Accepts `{ image: {asset, hotspot}, alt, lqip }` or a bare image object. */
function toImage(value: Json | undefined, fallbackAlt: string): LegacyImage | null {
  if (!isObj(value)) return null;
  const image = isObj(value.image) ? value.image : value;
  const asset = isObj(image.asset) ? image.asset : null;
  const ref = asset ? str(asset._ref) : null;
  if (!ref) return null;
  const base = imageFromRef(ref);
  if (!base) return null;
  const hotspot = isObj(image.hotspot) ? image.hotspot : null;
  const alt = str(value.alt);
  return {
    ...base,
    alt: alt && !/^\d+$/.test(alt) ? alt : fallbackAlt,
    lqip: str(value.lqip),
    focal_x: hotspot && typeof hotspot.x === "number" ? round(hotspot.x) : null,
    focal_y: hotspot && typeof hotspot.y === "number" ? round(hotspot.y) : null,
  };
}

/** Portable Text → markup-lite (`**strong**`, `*highlight*`, `[text](url)`, blank line between blocks). */
function portableTextToMarkup(value: Json | undefined): string {
  if (typeof value === "string") return value.trim();
  const blocks = Array.isArray(value) ? value : isObj(value) ? [value] : [];
  const paragraphs: string[] = [];
  for (const block of blocks) {
    if (typeof block === "string") {
      if (block.trim()) paragraphs.push(block.trim());
      continue;
    }
    if (!isObj(block) || block._type !== "block" || !Array.isArray(block.children)) continue;
    const defs = new Map<string, Obj>();
    if (Array.isArray(block.markDefs)) {
      for (const def of block.markDefs) if (isObj(def) && typeof def._key === "string") defs.set(def._key, def);
    }
    let text = "";
    for (const child of block.children) {
      if (!isObj(child) || typeof child.text !== "string") continue;
      let piece = child.text;
      const marks = Array.isArray(child.marks) ? child.marks.filter((m): m is string => typeof m === "string") : [];
      // Keep surrounding whitespace outside the markers.
      const lead = /^\s*/.exec(piece)?.[0] ?? "";
      const trail = /\s*$/.exec(piece)?.[0] ?? "";
      let core = piece.trim();
      if (core) {
        for (const mark of marks) {
          const def = defs.get(mark);
          if (def && def._type === "link" && typeof def.href === "string") core = `[${core}](${def.href})`;
          else if (mark === "strong") core = `**${core}**`;
          else if (mark === "em" || mark === "highlight" || mark === "hl") core = `*${core}*`;
        }
        piece = `${lead}${core}${trail}`;
      }
      text += piece;
    }
    if (text.trim()) paragraphs.push(text.trim());
  }
  return paragraphs.join("\n\n");
}

const MONTHS = [
  "january", "february", "march", "april", "may", "june",
  "july", "august", "september", "october", "november", "december",
];

/** "October 2026" → "2026-10-01"; "Present"/empty → null. */
function parseMonth(text: string): string | null {
  const t = text.trim().toLowerCase();
  if (!t || t === "present" || t === "now" || t === "current") return null;
  const match = /^([a-z]+)\.?\s+(\d{4})$/.exec(t);
  if (match) {
    const idx = MONTHS.findIndex((m) => m.startsWith(match[1].slice(0, 3)));
    if (idx >= 0) return `${match[2]}-${String(idx + 1).padStart(2, "0")}-01`;
  }
  const year = /^(\d{4})$/.exec(t);
  if (year) return `${year[1]}-01-01`;
  throw new Error(`Unparseable period part: "${text}"`);
}

function parsePeriod(period: string): { start_date: string; end_date: string | null } {
  const [startRaw, endRaw = "Present"] = period.split(/\s+[-–—]\s+/);
  const start = parseMonth(startRaw);
  if (!start) throw new Error(`Experience period without start: "${period}"`);
  return { start_date: start, end_date: parseMonth(endRaw) };
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function arr(value: Json | undefined): Json[] {
  return Array.isArray(value) ? value : [];
}

// ---------------------------------------------------------------------------
// 3. Build
// ---------------------------------------------------------------------------
const about = newest.get("about")?.result;
const work = arr(newest.get("work")?.result);
const experience = arr(newest.get("experience")?.result);
const tools = arr(newest.get("tool")?.result);

if (!isObj(about)) throw new Error("No `about` response in the fetch cache");

const bio = arr(about.bio).every((p) => typeof p === "string")
  ? arr(about.bio).map((p) => String(p).trim()).filter(Boolean)
  : portableTextToMarkup(about.bio).split("\n\n");

const fullName = str(about.name) ?? "Aditya Lucky Zulkarnaen";

const profile = {
  full_name: fullName,
  roles: arr(about.roles).map(str).filter((r): r is string => r !== null),
  bio,
  resume_url: str(about.resumeUrl),
  photos: arr(about.photos)
    .map((photo, i) => toImage(photo, `Portrait of ${fullName} (${i + 1})`))
    .filter((p): p is LegacyImage => p !== null),
};

const projects = work.filter(isObj).map((p, index) => {
  const name = str(p.name) ?? "";
  const width = str(p.width);
  return {
    slug: str(p.slug) ?? slugify(name),
    name,
    year: str(p.year) ?? "",
    kind: str(p.kind) ?? "",
    role: str(p.role) ?? "",
    featured: p.featured === true,
    device: p.device === "mobile" ? "mobile" : "desktop",
    stack: arr(p.stack).map(str).filter((s): s is string => s !== null),
    live_url: str(p.live),
    repo_url: str(p.repo),
    summary: str(p.summary) ?? "",
    body: portableTextToMarkup(p.body),
    cover: toImage(p.cover, name),
    tile_width: width === "row" ? "row" : "half",
    position: index,
    updated_at: str(p.updatedAt),
  };
});

const experiences = experience.filter(isObj).map((e, index) => {
  const role = str(e.role) ?? "";
  const org = str(e.org) ?? "";
  return {
    slug: str(e.slug) ?? slugify(`${role}-${org}`),
    role,
    org,
    ...parsePeriod(str(e.period) ?? ""),
    period: str(e.period) ?? "",
    summary: (str(e.summary) ?? "").replace(/"+$/, "").trim(),
    position: index,
  };
});

const toolList = tools.filter(isObj).map((t, index) => ({
  name: str(t.name) ?? "",
  label: str(t.label) ?? "",
  logo_url: str(t.src),
  reverse: t.reverse === true,
  position: index,
}));

const output = {
  $comment:
    "Generated by scripts/seed/extract-legacy.ts from the legacy Next fetch cache. Do not edit by hand; edit extra-content.json instead.",
  source: {
    sanity_project: SANITY_PROJECT,
    dataset: SANITY_DATASET,
    files: Object.fromEntries([...newest.values()].map((e) => [e.type, e.file])),
  },
  profile,
  projects,
  experiences,
  tools: toolList,
};

mkdirSync(dirname(outFile), { recursive: true });
writeFileSync(outFile, `${JSON.stringify(output, null, 2)}\n`);

console.log(
  `\nWrote ${outFile}\n  projects: ${projects.length}\n  experiences: ${experiences.length}\n  tools: ${toolList.length}\n  photos: ${profile.photos.length}\n  bio paragraphs: ${bio.length}`,
);
if (projects.length !== 14) console.warn(`! expected 14 projects, got ${projects.length}`);
if (experiences.length !== 8) console.warn(`! expected 8 experiences, got ${experiences.length}`);
