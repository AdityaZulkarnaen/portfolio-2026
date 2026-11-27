/**
 * The "z." mark: a z whose top and bottom strokes are waves (the background's current),
 * closed by a lilac point. On hover of an enclosing `group/home` the stroke redraws itself.
 * The favicon (app/icon.svg) is the same path on an ink tile.
 */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true" className={className}>
      <path
        d="M7.00 8.50L7.85 8.04L8.70 7.62L9.55 7.29L10.40 7.07L11.25 7.00L12.10 7.07L12.95 7.29L13.80 7.62L14.65 8.04L15.50 8.50L16.35 8.96L17.20 9.38L18.05 9.71L18.90 9.93L19.75 10.00L20.60 9.93L21.45 9.71L22.30 9.38L23.15 8.96L24.00 8.50L7.50 23.50L8.35 23.96L9.20 24.38L10.05 24.71L10.90 24.93L11.75 25.00L12.60 24.93L13.45 24.71L14.30 24.38L15.15 23.96L16.00 23.50L16.85 23.04L17.70 22.62L18.55 22.29L19.40 22.07L20.25 22.00L21.10 22.07L21.95 22.29L22.80 22.62L23.65 23.04L24.50 23.50"
        pathLength={1}
        fill="none"
        stroke="currentColor"
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="[stroke-dasharray:1] motion-on:group-hover/home:animate-mark-draw"
      />
      <circle cx="28.6" cy="23.5" r="2.1" className="fill-lilac-500" />
    </svg>
  );
}
