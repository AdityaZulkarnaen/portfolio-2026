/**
 * The mark: the current rolling into a curl, the way the background smoke curls, ending in a
 * lilac point. Not a letter on purpose. On hover of an enclosing `group/home` the stroke
 * redraws itself. The favicon (app/icon.svg) is the same path on an ink tile.
 */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true" className={className}>
      <path
        d="M3.50 21.60L4.20 22.18L4.91 22.70L5.61 23.12L6.31 23.38L7.01 23.48L7.72 23.38L8.42 23.12L9.12 22.70L9.82 22.18L10.53 21.60L11.23 21.02L11.93 20.50L12.63 20.09L13.34 19.82L14.04 19.73L14.74 19.82L15.45 20.09L16.15 20.50L16.85 21.02L17.55 21.60L18.84 22.02L20.16 22.22L21.47 22.21L22.74 22.00L23.93 21.60L25.04 21.02L26.01 20.29L26.85 19.43L27.52 18.46L28.03 17.42L28.35 16.34L28.50 15.23L28.47 14.14L28.27 13.09L27.91 12.11L27.42 11.22L26.80 10.43L26.07 9.76L25.27 9.24L24.42 8.85L23.53 8.61L22.65 8.52L21.78 8.58L20.95 8.76L20.18 9.07L19.49 9.49L18.89 10.00L18.40 10.58L18.02 11.22L17.75 11.89L17.60 12.57L17.57 13.25L17.64 13.90L17.82 14.51L18.08 15.06L18.42 15.55L18.82 15.95L19.26 16.27L19.73 16.51L20.22 16.65L20.70 16.71L21.16 16.69L21.59 16.59L21.98 16.43L22.32 16.22L22.60 15.96L22.82 15.67L22.97 15.36"
        pathLength={1}
        fill="none"
        stroke="currentColor"
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="[stroke-dasharray:1] motion-on:group-hover/home:animate-mark-draw"
      />
      <circle cx="22.97" cy="15.36" r="2.1" className="fill-lilac-500" />
    </svg>
  );
}
