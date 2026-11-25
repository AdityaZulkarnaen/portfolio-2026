/**
 * The one place parallax is computed (DOM figures now, GL planes in P4).
 *
 * `depth` is the frame's −1…1 factor; `progress` is 0 when the element's top meets the
 * viewport bottom and 1 when its bottom leaves the top. Returns a translateY in px:
 * positive depth lags behind the page (recedes), negative depth leads it.
 */
export const PARALLAX_RANGE_VH = 14;

export function parallaxOffset(depth: number, progress: number, viewportHeight: number): number {
  const centered = progress - 0.5;
  return centered * depth * (PARALLAX_RANGE_VH / 100) * viewportHeight * 2;
}
