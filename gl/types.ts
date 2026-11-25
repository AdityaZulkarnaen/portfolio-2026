/**
 * Stage contract shared by the lazy stage chunk and the React glue. Type-only: importing
 * this never pulls three.js into a chunk.
 */
export type StageMode = "hero" | "ambient";

export type HeroSource =
  | { kind: "images"; images: (HTMLImageElement | null)[]; accents: string[] }
  | { kind: "video"; video: HTMLVideoElement; accent?: string }
  | null;

/** A driven hero-window rect in viewport CSS px (home scroll sequence). */
export type HeroWindowRect = { x: number; y: number; w: number; h: number; radius: number; opacity: number };

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
  /** Average CPU time spent inside the stage tick (ms). */
  tickMs: number;
  planes: PlaneStats;
};

export type PlaneStats = { registered: number; ready: number; visible: number; enabled: boolean };

/** Plane vs DOM rect of one registered window, in client px: [x, y, w, h]. Debug only. */
export type PlaneProbe = { plane: [number, number, number, number] | null; dom: [number, number, number, number] };

export type PlaneHandle = { release(): void };

export interface StageApi {
  setMode(mode: StageMode): void;
  /** Replace the hero sources; `index` is the slide to show immediately (no crossfade). */
  setHeroSources(source: HeroSource, index?: number): void;
  /** Sync with the DOM slideshow; `progress` is how far into the slide (0..1) it already is. */
  setSlide(index: number, progress?: number): void;
  /**
   * The hero "reel window": the stage draws the hero media inside this element's rect
   * (rounded by its border-radius). An inline `--reveal` (0..1) on it opens the window
   * vertically from its centre line. null = no window (smoke only).
   */
  setHeroWindow(el: HTMLElement | null): void;
  /**
   * Drive the window rect directly (the home sequence animates it from its own tween
   * values, so the stage never measures it mid-animation). null = back to measuring.
   */
  setHeroWindowRect(rect: HeroWindowRect | null): void;
  /** Whether hero slide `index` is uploaded and can be shown without a blank/stale frame. */
  slideReady(index: number): boolean;
  setTint(hex: string): void;
  /** Click pulse at client px (defaults to the last pointer position). */
  pulse(x?: number, y?: number): void;
  setScrollProgress(p: number): void;
  /** Re-measure the canvas and every plane (route show, layout changes). */
  remeasure(): void;
  /**
   * Draw `el` (a `[data-gl-media]` window holding one <img>) as a GL plane. T2 + fine
   * pointer only; elsewhere the handle is inert and the DOM stays as it is.
   */
  registerPlane(el: HTMLElement): PlaneHandle;
  /** While on, planes are not drawn and CSS keeps the DOM media visible (view-transition snapshots). */
  setHandoff(on: boolean): void;
  debugPlanes(): PlaneProbe[];
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
