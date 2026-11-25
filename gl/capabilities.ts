/**
 * Device tiers for the GL stage. No three.js here: this module ships in the initial
 * chunk and decides whether the stage chunk is ever requested.
 *
 * - T0: no canvas. No WebGL2, Save-Data, `?gl=0`, reduced motion or "Pause motion".
 *       The DOM stills stay exactly as they are.
 * - T1: coarse pointer or ≤4 cores. DPR ≤ 1, no trail FBO (pointer velocity uniform only).
 * - T2: desktop. DPR = min(dpr, 2, √(2MP / (w·h))), adaptive quality.
 *
 * Motion preferences can change at runtime, so they are not baked into the static tier:
 * `detectBaseTier()` covers what cannot change during a page view and the provider
 * combines it with the live motion snapshot.
 */
export type Tier = 0 | 1 | 2;

export type TierInfo = { tier: Tier; reason: string };

const MAX_PIXELS = 2.0e6;

const probed = new Map<boolean, boolean>();

/**
 * `strict` rejects software rasterizers (failIfMajorPerformanceCaveat): a shader
 * background on SwiftShader costs more than it gives. `?gl=1|2` forces a tier and
 * skips that check (useful for headless QA).
 */
function hasWebGL2(strict: boolean): boolean {
  const known = probed.get(strict);
  if (known !== undefined) return known;
  let ok = false;
  try {
    const canvas = document.createElement("canvas");
    const gl = canvas.getContext("webgl2", { failIfMajorPerformanceCaveat: strict });
    ok = !!gl;
    // Free the probe context right away; browsers cap live contexts (~16).
    gl?.getExtension("WEBGL_lose_context")?.loseContext();
  } catch {
    ok = false;
  }
  probed.set(strict, ok);
  return ok;
}

function saveData(): boolean {
  const conn = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
  return conn?.saveData === true;
}

/** Static tier for this page view (ignores motion prefs; see `effectiveTier`). */
export function detectBaseTier(): TierInfo {
  if (typeof window === "undefined") return { tier: 0, reason: "server" };
  const gl = new URLSearchParams(window.location.search).get("gl");
  if (gl === "0") return { tier: 0, reason: "?gl=0" };
  if (saveData()) return { tier: 0, reason: "save-data" };
  if (gl === "1" || gl === "2") {
    if (!hasWebGL2(false)) return { tier: 0, reason: "no-webgl2" };
    return { tier: gl === "1" ? 1 : 2, reason: `?gl=${gl}` };
  }
  if (!hasWebGL2(true)) return { tier: 0, reason: "no-webgl2" };

  const coarse = window.matchMedia("(pointer: coarse)").matches || !window.matchMedia("(hover: hover)").matches;
  const cores = navigator.hardwareConcurrency || 4;
  if (coarse) return { tier: 1, reason: "coarse-pointer" };
  if (cores <= 4) return { tier: 1, reason: `cores=${cores}` };
  return { tier: 2, reason: "desktop" };
}

export function effectiveTier(base: Tier, motion: { reduced: boolean; paused: boolean }): Tier {
  if (motion.reduced || motion.paused) return 0;
  return base;
}

/** Device pixel ratio for the drawing buffer (before adaptive scaling). */
export function targetDpr(tier: Tier, width: number, height: number): number {
  const dpr = window.devicePixelRatio || 1;
  if (tier <= 1) return Math.min(dpr, 1);
  const budget = Math.sqrt(MAX_PIXELS / Math.max(1, width * height));
  return Math.max(0.5, Math.min(dpr, 2, budget));
}
