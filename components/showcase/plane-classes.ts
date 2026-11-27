/**
 * Class strings shared by server and client components. They live outside any "use client"
 * module: imported from one, a server component would receive a client reference, not the string.
 */

/** DOM image under a GL plane: faded out once the plane draws, instantly back for snapshots. */
export const PLANE_MEDIA = "transition-opacity duration-500 ease-io gl-plane:opacity-0 gl-handoff:transition-none";

/**
 * Without GL (phones, no WebGL) the same `--dev` (0..1, on the frame) develops the media with
 * a wavy-edged mask sweeping down (`dev-mask`, globals.css), so the DOM fallback reads as
 * the same wave. Unset (reduced motion, other pages) = fully shown.
 */
export const DEV_MASK = "dev-mask";
