/**
 * Class strings shared by server and client components. They live outside any "use client"
 * module: imported from one, a server component would receive a client reference, not the string.
 */

/** DOM image under a GL plane: faded out once the plane draws, instantly back for snapshots. */
export const PLANE_MEDIA = "transition-opacity duration-500 ease-io gl-plane:opacity-0 gl-handoff:transition-none";

/**
 * Without GL the same `--dev` (0..1, set by the home sequence on the frame) develops the
 * media with a soft top-down mask. Unset (reduced motion, other pages) = fully shown.
 */
export const DEV_MASK =
  "[mask-image:linear-gradient(to_bottom,#000_calc(var(--dev,1)*130%-30%),transparent_calc(var(--dev,1)*130%))]";
