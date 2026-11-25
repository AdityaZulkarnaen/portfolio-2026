import type { FrameLayout } from "./types";

/**
 * Editorial grid presets (admin layout editor + seed defaults).
 * Each preset is an ordered list of frame layouts; frame i takes media i.
 */
export const LAYOUT_PRESETS = ["desktop-hero", "desktop-pair", "phone-trio", "tall-scroll"] as const;

export type LayoutPreset = (typeof LAYOUT_PRESETS)[number];

const PHONE_RATIO = 9 / 19.5;

const presets: Record<LayoutPreset, readonly FrameLayout[]> = {
  /** One wide browser frame, then two offset supporting frames. */
  "desktop-hero": [
    { colStart: 1, colEnd: 13, rowIndex: 1, ratio: 16 / 9, shift: 0, depth: 0, format: "landscape", frame: "browser", behavior: "static", mobileSpan: 12 },
    { colStart: 2, colEnd: 7, rowIndex: 2, ratio: 4 / 3, shift: 0.5, depth: 0.15, format: "landscape", frame: "browser", behavior: "static", mobileSpan: 12 },
    { colStart: 8, colEnd: 13, rowIndex: 2, ratio: 4 / 3, shift: -0.25, depth: -0.1, format: "landscape", frame: "browser", behavior: "static", mobileSpan: 12 },
  ],
  /** Two browser frames side by side with a staggered rhythm. */
  "desktop-pair": [
    { colStart: 1, colEnd: 8, rowIndex: 1, ratio: 16 / 10, shift: 0, depth: 0.05, format: "landscape", frame: "browser", behavior: "static", mobileSpan: 12 },
    { colStart: 8, colEnd: 13, rowIndex: 1, ratio: 4 / 5, shift: 0.6, depth: -0.15, format: "portrait", frame: "browser", behavior: "static", mobileSpan: 12 },
  ],
  /** Three phones, the middle one raised. */
  "phone-trio": [
    { colStart: 2, colEnd: 5, rowIndex: 1, ratio: PHONE_RATIO, shift: 0.5, depth: 0.1, format: "portrait", frame: "phone", behavior: "static", mobileSpan: 6 },
    { colStart: 5, colEnd: 9, rowIndex: 1, ratio: PHONE_RATIO, shift: 0, depth: -0.1, format: "portrait", frame: "phone", behavior: "static", mobileSpan: 6 },
    { colStart: 9, colEnd: 12, rowIndex: 1, ratio: PHONE_RATIO, shift: 0.75, depth: 0.15, format: "portrait", frame: "phone", behavior: "static", mobileSpan: 6 },
  ],
  /** A tall full-page screenshot that scrolls inside a browser frame, plus a detail frame. */
  "tall-scroll": [
    { colStart: 1, colEnd: 9, rowIndex: 1, ratio: 16 / 10, shift: 0, depth: 0, format: "tall", frame: "browser", behavior: "scroll", mobileSpan: 12 },
    { colStart: 9, colEnd: 13, rowIndex: 1, ratio: 3 / 4, shift: 0.8, depth: -0.12, format: "portrait", frame: "browser", behavior: "static", mobileSpan: 12 },
  ],
};

export function getLayoutPreset(name: LayoutPreset): FrameLayout[] {
  return presets[name].map((frame) => ({ ...frame }));
}

/**
 * Layouts for `count` media items using a preset; extra items repeat the
 * preset's rhythm on following rows.
 */
export function layoutForCount(name: LayoutPreset, count: number): FrameLayout[] {
  const base = presets[name];
  const rowsPerCycle = Math.max(...base.map((f) => f.rowIndex));
  return Array.from({ length: count }, (_, i) => {
    const frame = base[i % base.length];
    const cycle = Math.floor(i / base.length);
    return { ...frame, rowIndex: frame.rowIndex + cycle * rowsPerCycle };
  });
}

/** Very tall screenshots (full-page captures like Vista, Farmasi Cup) scroll inside their frame. */
export function isTallImage(width: number | null, height: number | null): boolean {
  return Boolean(width && height && height / width > 2.2);
}

/** Default preset for a project, by device and cover shape. */
export function defaultPresetFor(
  device: "desktop" | "mobile",
  cover?: { width: number | null; height: number | null } | null,
): LayoutPreset {
  if (device === "mobile") return "phone-trio";
  if (cover && isTallImage(cover.width, cover.height)) return "tall-scroll";
  return "desktop-hero";
}

/** Clamp a layout into the DB constraints (used by admin + seed). */
export function normalizeLayout(frame: FrameLayout): FrameLayout {
  const colStart = Math.min(12, Math.max(1, Math.round(frame.colStart)));
  const colEnd = Math.min(13, Math.max(colStart + 1, Math.round(frame.colEnd)));
  return {
    ...frame,
    colStart,
    colEnd,
    rowIndex: Math.min(64, Math.max(1, Math.round(frame.rowIndex))),
    ratio: Math.min(10, Math.max(0.05, Number(frame.ratio.toFixed(4)))),
    shift: Math.min(4, Math.max(-4, frame.shift)),
    depth: Math.min(1, Math.max(-1, frame.depth)),
    mobileSpan: Math.min(12, Math.max(1, Math.round(frame.mobileSpan))),
  };
}
