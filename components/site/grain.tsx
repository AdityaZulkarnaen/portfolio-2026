import { cn } from "@/lib/utils";

const TILE =
  "pointer-events-none absolute -inset-[100px] bg-[url(/grain.png)] bg-size-[160px] mix-blend-overlay animate-grain motion-off:animate-none";

/**
 * Animated film grain (pre-rendered noise tile). Decorative; stops when motion is off.
 * `fixed` pins it over the viewport inside a clipping frame, so the oversized,
 * jittering tile never adds horizontal scroll.
 */
export function Grain({ className, fixed = false }: { className?: string; fixed?: boolean }) {
  if (fixed) {
    return (
      <div aria-hidden="true" className={cn("pointer-events-none fixed inset-0 overflow-hidden mix-blend-overlay", className)}>
        <div className={TILE} />
      </div>
    );
  }
  return <div aria-hidden="true" className={cn(TILE, className)} />;
}
