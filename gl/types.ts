/**
 * Stage contract shared by the lazy stage chunk and the React glue. Type-only: importing
 * this never pulls three.js into a chunk.
 */
export type StageMode = "hero" | "ambient";

export type HeroSource =
  | { kind: "images"; images: (HTMLImageElement | null)[]; accents: string[] }
  | { kind: "video"; video: HTMLVideoElement; accent?: string }
  | null;

export type StageDebug = {
  tier: number;
  running: boolean;
  lost: boolean;
  mode: StageMode;
  dpr: number;
  quality: number;
  aberration: boolean;
  size: [number, number];
  textures: number;
  geometries: number;
  programs: number;
  drawCalls: number;
  cache: { images: { total: number; live: number }; videos: { total: number; live: number } };
  avgFrameMs: number;
};

export interface StageApi {
  setMode(mode: StageMode): void;
  /** Replace the hero sources; `index` is the slide to show immediately (no crossfade). */
  setHeroSources(source: HeroSource, index?: number): void;
  /** Sync with the DOM slideshow; `progress` is how far into the slide (0..1) it already is. */
  setSlide(index: number, progress?: number): void;
  setTint(hex: string): void;
  /** Click pulse at client px (defaults to the last pointer position). */
  pulse(x?: number, y?: number): void;
  setScrollProgress(p: number): void;
  remeasure(): void;
  pause(): void;
  resume(): void;
  dispose(): void;
  debug(): StageDebug;
}

export type StageOptions = {
  tier: 1 | 2;
  /** Fired after the first frame of each run (initial, resume, context restore) once the hero source is drawn. */
  onVisible: () => void;
  /** WebGL context lost: the DOM must take over immediately. */
  onLost: () => void;
};
