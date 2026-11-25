/**
 * Capture live-site screenshots for projects with a `live_url` and add them as editorial frames.
 *
 *   pnpm seed:capture                 # every project with a live_url
 *   pnpm seed:capture depths vista    # only these slugs
 *
 * Per project: 3 desktop frames (1600×1000 @1.5x: ~1 viewport down, mid-page, further down) and
 * 1 mobile frame (393×852 @2x, top of page). Blank (near-uniform), duplicate and form-heavy frames are
 * skipped. Images are converted to WebP inside Chromium (canvas.toDataURL), uploaded to
 * `media/projects/<slug>/capture-<n>.webp` (upsert), upserted into `media`, and the project's frames
 * are rebuilt via `replace_project_media`: non-capture frames (the cover) are kept, capture frames are
 * replaced. Re-running replaces captures; stale capture-<n> objects/rows are removed.
 *
 * Node 22 native TypeScript: erasable syntax only, explicit `.ts` imports, no `@/` alias.
 */
import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";

import { createClient } from "@supabase/supabase-js";
import { chromium, devices, type Browser, type Page } from "@playwright/test";

import type { Database, Json } from "../../lib/supabase/database.types.ts";

const BUCKET = "media";
const DESKTOP = { width: 1600, height: 1000, dsf: 1.5 };
const MOBILE = { width: 393, height: 852, dsf: 2 };
const PAGE_TIMEOUT = 45_000;
const SETTLE_MS = 2_500;
const WEBP_QUALITY = 0.86;
const MAX_BYTES = 10 * 1024 * 1024;
const MAX_SHOWCASE = 4;

const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const secret = process.env.SUPABASE_SECRET_KEY?.trim();
if (!url || !secret) {
  console.error("✗ Missing env: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY must be set in .env.local.");
  process.exit(1);
}
const only = process.argv.slice(2).filter((a) => !a.startsWith("-"));

const db = createClient<Database>(url, secret, {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
});

type Shot = {
  kind: "desktop" | "mobile";
  label: string;
  webp: Buffer;
  width: number;
  height: number;
  hash: number[];
};

type Stat = { slug: string; captured: number; uploaded: number; failed: number; note: string };

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error(`${label}: timed out after ${ms}ms`)), ms)),
  ]);
}

// ---------------------------------------------------------------------------
// In-browser image analysis + WebP conversion
// ---------------------------------------------------------------------------
let converter: Page | null = null;

async function analyse(
  browser: Browser,
  jpeg: Buffer,
): Promise<{ webp: Buffer; width: number; height: number; std: number; dominant: number; hash: number[] }> {
  if (!converter) {
    const ctx = await browser.newContext();
    converter = await ctx.newPage();
    await converter.setContent("<!doctype html><html><body></body></html>");
  }
  const result = await converter.evaluate(
    async ({ b64, quality }) => {
      const img = new Image();
      img.src = `data:image/jpeg;base64,${b64}`;
      await img.decode();
      const w = img.naturalWidth;
      const h = img.naturalHeight;

      // Variance / dominant colour on a small sample.
      const s = document.createElement("canvas");
      s.width = 96;
      s.height = 60;
      const sc = s.getContext("2d", { willReadFrequently: true })!;
      sc.drawImage(img, 0, 0, s.width, s.height);
      const px = sc.getImageData(0, 0, s.width, s.height).data;
      const lum: number[] = [];
      const buckets = new Map<string, number>();
      for (let i = 0; i < px.length; i += 4) {
        lum.push(0.2126 * px[i] + 0.7152 * px[i + 1] + 0.0722 * px[i + 2]);
        const key = `${px[i] >> 4},${px[i + 1] >> 4},${px[i + 2] >> 4}`;
        buckets.set(key, (buckets.get(key) ?? 0) + 1);
      }
      const mean = lum.reduce((a, b) => a + b, 0) / lum.length;
      const std = Math.sqrt(lum.reduce((a, b) => a + (b - mean) ** 2, 0) / lum.length);
      const dominant = Math.max(...buckets.values()) / lum.length;

      // Perceptual hash: 32×20 grayscale.
      const hc = document.createElement("canvas");
      hc.width = 32;
      hc.height = 20;
      const hx = hc.getContext("2d", { willReadFrequently: true })!;
      hx.drawImage(img, 0, 0, hc.width, hc.height);
      const hp = hx.getImageData(0, 0, hc.width, hc.height).data;
      const hash: number[] = [];
      for (let i = 0; i < hp.length; i += 4) hash.push(Math.round(0.299 * hp[i] + 0.587 * hp[i + 1] + 0.114 * hp[i + 2]));

      const c = document.createElement("canvas");
      c.width = w;
      c.height = h;
      c.getContext("2d")!.drawImage(img, 0, 0);
      const data = c.toDataURL("image/webp", quality);
      return { data, w, h, std, dominant, hash };
    },
    { b64: jpeg.toString("base64"), quality: WEBP_QUALITY },
  );
  if (!result.data.startsWith("data:image/webp")) throw new Error("canvas WebP encoding unsupported");
  return {
    webp: Buffer.from(result.data.slice(result.data.indexOf(",") + 1), "base64"),
    width: result.w,
    height: result.h,
    std: result.std,
    dominant: result.dominant,
    hash: result.hash,
  };
}

function hashDiff(a: number[], b: number[]): number {
  let sum = 0;
  for (let i = 0; i < a.length; i++) sum += Math.abs(a[i] - b[i]);
  return sum / a.length;
}

// ---------------------------------------------------------------------------
// Page helpers
// ---------------------------------------------------------------------------
async function open(page: Page, target: string) {
  await page.goto(target, { waitUntil: "load", timeout: PAGE_TIMEOUT });
  await page.waitForLoadState("networkidle", { timeout: 15_000 }).catch(() => {});
  await sleep(SETTLE_MS);
  await dismissOverlays(page);
}

async function dismissOverlays(page: Page) {
  const pattern = /^(accept( all)?|agree|i agree|got it|ok(ay)?|allow( all)?|setuju|terima|mengerti|tutup|close|dismiss|skip|lewati)$/i;
  try {
    const buttons = page.getByRole("button", { name: pattern });
    const count = Math.min(await buttons.count(), 3);
    for (let i = 0; i < count; i++) {
      const b = buttons.nth(i);
      if (await b.isVisible().catch(() => false)) await b.click({ timeout: 1_500 }).catch(() => {});
    }
  } catch {
    // best effort
  }
  await page.keyboard.press("Escape").catch(() => {});
  await sleep(300);
}

async function metrics(page: Page) {
  return page.evaluate(() => {
    const el = document.scrollingElement ?? document.documentElement;
    return { scrollHeight: Math.max(el.scrollHeight, document.body?.scrollHeight ?? 0), vh: window.innerHeight, y: window.scrollY };
  });
}

/** Scroll to `y`: native first, then wheel (smooth-scroll libraries like Lenis hijack native scroll). */
async function scrollTo(page: Page, y: number) {
  await page.evaluate((top) => window.scrollTo({ top, behavior: "instant" as ScrollBehavior }), y);
  await sleep(250);
  let { y: now } = await metrics(page);
  if (Math.abs(now - y) > 40) {
    await page.mouse.move(800, 500);
    for (let i = 0; i < 40 && Math.abs(now - y) > 40; i++) {
      await page.mouse.wheel(0, Math.max(-600, Math.min(600, y - now)));
      await sleep(120);
      const next = (await metrics(page)).y;
      if (next === now && i > 3) break;
      now = next;
    }
  }
  await sleep(1_300);
}

async function filledFormFields(page: Page): Promise<number> {
  return page.evaluate(() => {
    let n = 0;
    for (const el of Array.from(document.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>("input, textarea"))) {
      if (el instanceof HTMLInputElement && ["hidden", "checkbox", "radio", "submit", "button"].includes(el.type)) continue;
      const r = el.getBoundingClientRect();
      if (r.bottom < 0 || r.top > window.innerHeight || r.width === 0) continue;
      if (el.value.trim()) n++;
    }
    return n;
  });
}

async function shoot(page: Page): Promise<Buffer> {
  return page.screenshot({ type: "jpeg", quality: 95, timeout: 20_000, animations: "allow" });
}

// ---------------------------------------------------------------------------
// Capture
// ---------------------------------------------------------------------------
async function captureProject(browser: Browser, name: string, liveUrl: string, log: string[]): Promise<{ shots: Shot[]; failed: number }> {
  const shots: Shot[] = [];
  let failed = 0;

  const keep = async (kind: Shot["kind"], label: string, jpeg: Buffer, page: Page) => {
    const a = await analyse(browser, jpeg);
    if (a.std < 6 || a.dominant > 0.9) {
      log.push(`skip ${label}: near-uniform (std ${a.std.toFixed(1)}, dominant ${(a.dominant * 100).toFixed(0)}%)`);
      return;
    }
    if ((await filledFormFields(page)) >= 2) {
      log.push(`skip ${label}: filled form fields`);
      return;
    }
    const dup = shots.find((s) => s.kind === kind && hashDiff(s.hash, a.hash) < 5);
    if (dup) {
      log.push(`skip ${label}: duplicate of ${dup.label}`);
      return;
    }
    if (a.webp.byteLength > MAX_BYTES) {
      log.push(`skip ${label}: ${a.webp.byteLength} bytes exceeds bucket limit`);
      return;
    }
    shots.push({ kind, label, webp: a.webp, width: a.width, height: a.height, hash: a.hash });
  };

  // Desktop
  const desktop = await browser.newContext({
    viewport: { width: DESKTOP.width, height: DESKTOP.height },
    deviceScaleFactor: DESKTOP.dsf,
    reducedMotion: "no-preference",
  });
  try {
    const page = await desktop.newPage();
    page.setDefaultTimeout(PAGE_TIMEOUT);
    await withTimeout(
      (async () => {
        await open(page, liveUrl);
        const { scrollHeight, vh } = await metrics(page);
        const max = Math.max(0, scrollHeight - vh);
        if (max < vh * 0.4) {
          log.push(`desktop: page not scrollable (${scrollHeight}px) — hero already covered by the cover image`);
          return;
        }
        // Warm-up pass so lazy images and reveal animations load.
        for (let y = vh; y < max; y += vh) await page.evaluate((t) => window.scrollTo(0, t), y).then(() => sleep(150));
        await page.evaluate(() => window.scrollTo(0, 0));
        await sleep(400);

        const targets = [
          { label: "desktop section 2", y: Math.min(max, vh) },
          { label: "desktop mid-page", y: Math.min(max, Math.round(scrollHeight / 2 - vh / 2)) },
          { label: "desktop lower section", y: Math.min(max, Math.round(scrollHeight * 0.78 - vh / 2)) },
        ];
        for (const t of targets) {
          try {
            await scrollTo(page, t.y);
            await keep("desktop", t.label, await shoot(page), page);
          } catch (error) {
            failed++;
            log.push(`fail ${t.label}: ${error instanceof Error ? error.message.split("\n")[0] : String(error)}`);
          }
        }
      })(),
      PAGE_TIMEOUT * 3,
      "desktop",
    );
  } catch (error) {
    failed++;
    log.push(`fail desktop: ${error instanceof Error ? error.message.split("\n")[0] : String(error)}`);
  } finally {
    await desktop.close().catch(() => {});
  }

  // Mobile
  const mobile = await browser.newContext({
    userAgent: devices["iPhone 13"].userAgent,
    viewport: { width: MOBILE.width, height: MOBILE.height },
    deviceScaleFactor: MOBILE.dsf,
    isMobile: true,
    hasTouch: true,
  });
  try {
    const page = await mobile.newPage();
    page.setDefaultTimeout(PAGE_TIMEOUT);
    await withTimeout(
      (async () => {
        await open(page, liveUrl);
        await page.evaluate(() => window.scrollTo(0, 0));
        await sleep(400);
        await keep("mobile", "mobile view", await shoot(page), page);
      })(),
      PAGE_TIMEOUT * 2,
      "mobile",
    );
  } catch (error) {
    failed++;
    log.push(`fail mobile: ${error instanceof Error ? error.message.split("\n")[0] : String(error)}`);
  } finally {
    await mobile.close().catch(() => {});
  }

  void name;
  return { shots, failed };
}

// ---------------------------------------------------------------------------
// Layout
// ---------------------------------------------------------------------------
type Frame = {
  media_id: string;
  placement: "showcase" | "case" | "both";
  col_start: number;
  col_end: number;
  row_index: number;
  ratio: number;
  shift: number;
  depth: number;
  format: "landscape" | "portrait" | "square" | "tall";
  frame: "none" | "browser" | "phone";
  behavior: "static" | "scroll";
  mobile_span: number;
  caption: string;
  is_cover: boolean;
  position: number;
};

type Slot = { col_start: number; col_end: number; shift: number; depth: number; row: number };

/** Two mirrored editorial rhythms; alternated across projects. */
const RHYTHMS: { cover: [number, number]; desktop: Slot[]; phone: Slot }[] = [
  {
    // left emphasis
    cover: [1, 10],
    desktop: [
      { col_start: 8, col_end: 13, shift: 0.6, depth: 0.3, row: 2 },
      { col_start: 5, col_end: 12, shift: -0.4, depth: 0.1, row: 3 },
      { col_start: 1, col_end: 8, shift: 0.3, depth: -0.1, row: 4 },
    ],
    phone: { col_start: 2, col_end: 5, shift: 0.2, depth: -0.2, row: 3 },
  },
  {
    // right emphasis
    cover: [4, 13],
    desktop: [
      { col_start: 1, col_end: 6, shift: 0.6, depth: 0.3, row: 2 },
      { col_start: 2, col_end: 9, shift: -0.4, depth: 0.1, row: 3 },
      { col_start: 6, col_end: 13, shift: 0.3, depth: -0.1, row: 4 },
    ],
    phone: { col_start: 9, col_end: 12, shift: 0.2, depth: -0.2, row: 3 },
  },
];

function buildFrames(
  existing: Frame[],
  captures: { id: string; shot: Shot }[],
  rhythmIndex: number,
): Frame[] {
  const rhythm = RHYTHMS[rhythmIndex % RHYTHMS.length];
  const kept = existing.map((f) => ({ ...f }));
  const cover = kept.find((f) => f.is_cover);
  if (cover && captures.length) {
    // Tall scrolling covers keep their 8-col width; others become the big emphasised frame.
    const span = cover.behavior === "scroll" ? 8 : rhythm.cover[1] - rhythm.cover[0];
    const start = rhythm.cover[0] === 1 ? 1 : 13 - span;
    cover.col_start = start;
    cover.col_end = start + span;
    cover.row_index = 1;
    cover.shift = 0;
    cover.depth = 0;
  }
  const baseRow = Math.max(1, ...kept.map((f) => f.row_index)) - 1;

  const out: Frame[] = [...kept];
  let showcase = kept.filter((f) => f.placement !== "case").length;
  let d = 0;
  let extraRow = baseRow + 5;
  for (const { id, shot } of captures) {
    const isPhone = shot.kind === "mobile";
    let slot: Slot;
    if (isPhone)
      slot = captures.some((c) => c.shot.kind === "desktop") ? rhythm.phone : { ...rhythm.phone, row: 2 };
    else if (d < rhythm.desktop.length) slot = rhythm.desktop[d++];
    else slot = { col_start: 1, col_end: 13, shift: 0, depth: 0, row: extraRow++ - baseRow };
    const inShowcase = showcase < MAX_SHOWCASE;
    if (inShowcase) showcase++;
    out.push({
      media_id: id,
      placement: inShowcase ? "both" : "case",
      col_start: slot.col_start,
      col_end: slot.col_end,
      row_index: Math.min(64, baseRow + slot.row),
      ratio: Number((shot.width / shot.height).toFixed(4)),
      shift: slot.shift,
      depth: slot.depth,
      format: isPhone ? "portrait" : "landscape",
      frame: isPhone ? "phone" : "browser",
      behavior: "static",
      mobile_span: isPhone ? 6 : 12,
      caption: "",
      is_cover: false,
      position: 0,
    });
  }
  // Case-only extras go to their own rows after the showcase rhythm.
  let caseRow = Math.max(...out.filter((f) => f.placement !== "case").map((f) => f.row_index)) + 1;
  for (const f of out) if (f.placement === "case" && !f.is_cover && captures.some((c) => c.id === f.media_id)) {
    f.col_start = 1;
    f.col_end = 13;
    f.shift = 0;
    f.depth = 0;
    f.row_index = Math.min(64, caseRow++);
  }
  out.sort((a, b) => a.row_index - b.row_index || a.col_start - b.col_start);
  return out.map((f, i) => ({ ...f, position: i }));
}

// ---------------------------------------------------------------------------
// Persist
// ---------------------------------------------------------------------------
async function persist(project: { id: string; slug: string; name: string }, shots: Shot[], rhythmIndex: number): Promise<number> {
  // Order: first desktop frame, the phone frame, then the remaining desktop frames
  // (so the phone makes the 4-frame showcase cut).
  const desk = shots.filter((s) => s.kind === "desktop");
  const ordered = [...desk.slice(0, 1), ...shots.filter((s) => s.kind === "mobile"), ...desk.slice(1)];
  const captures: { id: string; shot: Shot }[] = [];
  for (const [i, shot] of ordered.entries()) {
    const path = `projects/${project.slug}/capture-${i + 1}.webp`;
    const up = await db.storage.from(BUCKET).upload(path, shot.webp, {
      contentType: "image/webp",
      cacheControl: "3600",
      upsert: true,
    });
    if (up.error) throw new Error(`upload ${path}: ${up.error.message}`);
    const row = await db
      .from("media")
      .upsert(
        {
          kind: "image",
          source: "storage",
          path,
          width: shot.width,
          height: shot.height,
          alt: `${project.name} — ${shot.label}`,
          lqip: null,
          position: i + 1,
        },
        { onConflict: "source,path" },
      )
      .select("id")
      .single();
    if (row.error || !row.data) throw new Error(`media ${path}: ${row.error?.message ?? "no row"}`);
    captures.push({ id: row.data.id, shot });
  }

  // Existing frames, minus previous capture frames.
  const current = await db
    .from("project_media")
    .select("*, media(path)")
    .eq("project_id", project.id)
    .order("position");
  if (current.error) throw new Error(`frames ${project.slug}: ${current.error.message}`);
  const isCapture = (path: string | undefined) => Boolean(path && /\/capture-\d+\.webp$/.test(path));
  const existing: Frame[] = current.data
    .filter((f) => !isCapture((f.media as { path: string } | null)?.path))
    .map((f) => ({
      media_id: f.media_id,
      placement: f.placement as Frame["placement"],
      col_start: f.col_start,
      col_end: f.col_end,
      row_index: f.row_index,
      ratio: Number(f.ratio),
      shift: Number(f.shift),
      depth: Number(f.depth),
      format: f.format as Frame["format"],
      frame: f.frame as Frame["frame"],
      behavior: f.behavior as Frame["behavior"],
      mobile_span: f.mobile_span,
      caption: f.caption,
      is_cover: f.is_cover,
      position: f.position,
    }));

  const frames = buildFrames(existing, captures, rhythmIndex);
  const rpc = await db.rpc("replace_project_media", { p_project: project.id, p_frames: frames as unknown as Json });
  if (rpc.error) throw new Error(`replace_project_media ${project.slug}: ${rpc.error.message}`);

  // Remove stale capture objects/rows beyond the new count.
  const listed = await db.storage.from(BUCKET).list(`projects/${project.slug}`, { limit: 1000 });
  const stale = (listed.data ?? [])
    .map((e) => `projects/${project.slug}/${e.name}`)
    .filter((p) => isCapture(p) && Number(p.match(/capture-(\d+)/)![1]) > ordered.length);
  if (stale.length) {
    await db.from("media").delete().eq("source", "storage").in("path", stale);
    await db.storage.from(BUCKET).remove(stale);
  }
  return captures.length;
}

/** Launch Chromium; fall back to any cached ms-playwright build when the pinned one is missing. */
async function launchBrowser(): Promise<Browser> {
  try {
    return await chromium.launch({ headless: true });
  } catch (error) {
    const root = process.env.PLAYWRIGHT_BROWSERS_PATH || join(process.env.LOCALAPPDATA ?? "", "ms-playwright");
    const candidates: string[] = [];
    if (existsSync(root)) {
      for (const dir of readdirSync(root).sort().reverse()) {
        if (dir.startsWith("chromium_headless_shell-"))
          candidates.push(join(root, dir, "chrome-headless-shell-win64", "chrome-headless-shell.exe"));
        else if (dir.startsWith("chromium-")) candidates.push(join(root, dir, "chrome-win64", "chrome.exe"));
      }
    }
    const executablePath = process.env.CHROMIUM_PATH || candidates.find((c) => existsSync(c));
    if (!executablePath) throw error;
    console.log(`  · using cached Chromium at ${executablePath}`);
    return chromium.launch({ headless: true, executablePath });
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  const res = await db
    .from("projects")
    .select("id, slug, name, live_url, position")
    .not("live_url", "is", null)
    .order("position");
  if (res.error) throw new Error(`projects: ${res.error.message}`);
  const projects = res.data.filter((p) => !only.length || only.includes(p.slug));
  console.log(`Capturing ${projects.length} project(s) on ${new URL(url as string).host}`);

  const browser = await launchBrowser();
  const stats: Stat[] = [];
  try {
    for (const p of projects) {
      const log: string[] = [];
      const stat: Stat = { slug: p.slug, captured: 0, uploaded: 0, failed: 0, note: "" };
      console.log(`\n▸ ${p.slug} — ${p.live_url}`);
      try {
        const { shots, failed } = await captureProject(browser, p.name, p.live_url as string, log);
        stat.captured = shots.length;
        stat.failed = failed;
        if (shots.length) stat.uploaded = await persist(p, shots, res.data.indexOf(p));
        else log.push("no usable frames — project frames left unchanged");
      } catch (error) {
        stat.failed++;
        log.push(`fail: ${error instanceof Error ? error.message.split("\n")[0] : String(error)}`);
      }
      for (const line of log) console.log(`  · ${line}`);
      stat.note = log.filter((l) => l.startsWith("fail") || l.startsWith("no usable") || l.startsWith("desktop:")).join("; ");
      console.log(`  ✓ captured ${stat.captured} · uploaded ${stat.uploaded} · failed ${stat.failed}`);
      stats.push(stat);
    }
  } finally {
    await browser.close().catch(() => {});
  }

  console.log("\nslug | captured | uploaded | failed | note");
  console.log("--- | --- | --- | --- | ---");
  for (const s of stats) console.log(`${s.slug} | ${s.captured} | ${s.uploaded} | ${s.failed} | ${s.note}`);
  console.log("\nDone. Revalidate the site (tag `content`) to see changes.");
}

main().catch((error: unknown) => {
  console.error(`✗ Capture failed: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
