"use client";

import type { HeroSource, StageApi, StageMode } from "./types";

/**
 * The always-available front of the stage (no three.js). Pages talk to this; it keeps
 * the desired state and forwards to the real stage once the lazy chunk has loaded, then
 * replays everything on attach. Calls made before the stage exists are never lost, and
 * a page hidden by <Activity> simply releases its registrations.
 *
 * Mode and tint are registries rather than setters, so overlapping registrations
 * (e.g. the old and new page during a transition) resolve deterministically:
 * - mode: "hero" while any hero registration exists, else "ambient".
 * - tint: the most recently activated active entry, else the default.
 */
const DEFAULT_TINT = "#ff5b2e";

let stage: StageApi | null = null;
let modeSeq = 0;
const modes = new Map<number, StageMode>();
let tintSeq = 0;
const tints = new Map<number, { hex: string; active: boolean; at: number }>();
let tintClock = 0;
let heroSource: HeroSource = null;
let slide = { index: 0, progress: 0 };
let progress = 0;

function resolvedMode(): StageMode {
  for (const m of modes.values()) if (m === "hero") return "hero";
  return "ambient";
}

function resolvedTint(): string {
  let best: { hex: string; at: number } | null = null;
  for (const t of tints.values()) if (t.active && (!best || t.at > best.at)) best = t;
  return best?.hex ?? DEFAULT_TINT;
}

export const stageBridge = {
  attach(next: StageApi) {
    stage = next;
    next.setMode(resolvedMode());
    next.setTint(resolvedTint());
    next.setHeroSources(heroSource, slide.index);
    if (heroSource) next.setSlide(slide.index, slide.progress);
    next.setScrollProgress(progress);
  },
  detach() {
    stage = null;
  },
  get(): StageApi | null {
    return stage;
  },

  /** Register a mode; returns the release function. */
  pushMode(mode: StageMode): () => void {
    const id = ++modeSeq;
    modes.set(id, mode);
    stage?.setMode(resolvedMode());
    return () => {
      modes.delete(id);
      stage?.setMode(resolvedMode());
    };
  },

  /** Register a tint entry; returns a setter for its active flag and a release. */
  pushTint(hex: string, active: boolean) {
    const id = ++tintSeq;
    tints.set(id, { hex, active, at: active ? ++tintClock : 0 });
    stage?.setTint(resolvedTint());
    return {
      setActive(next: boolean) {
        const entry = tints.get(id);
        if (!entry || entry.active === next) return;
        entry.active = next;
        if (next) entry.at = ++tintClock;
        stage?.setTint(resolvedTint());
      },
      release() {
        tints.delete(id);
        stage?.setTint(resolvedTint());
      },
    };
  },

  setHeroSources(source: HeroSource, index = 0) {
    heroSource = source;
    slide = { index, progress: 0 };
    stage?.setHeroSources(source, index);
  },
  /** Only releases if `source` is still the registered one (a newer owner may exist). */
  clearHeroSources(source: HeroSource) {
    if (heroSource !== source) return;
    heroSource = null;
    stage?.setHeroSources(null);
  },
  setSlide(index: number, p = 0) {
    slide = { index, progress: p };
    stage?.setSlide(index, p);
  },
  setScrollProgress(p: number) {
    progress = p;
    stage?.setScrollProgress(p);
  },
  pulse(x?: number, y?: number) {
    stage?.pulse(x, y);
  },
  remeasure() {
    stage?.remeasure();
  },
};

export type StageBridge = typeof stageBridge;
