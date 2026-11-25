import { cn } from "@/lib/utils";

const TILE =
  "pointer-events-none absolute -inset-[100px] bg-[url(/grain.png)] bg-size-[160px] mix-blend-overlay animate-grain motion-off:animate-none";

/**
 * Animated film grain (pre-rendered noise tile). Decorative; stops when motion is off.
 * `fixed` pins it over the viewport inside a clipping frame, so the oversized,
 * jittering tile never adds horizontal scroll.
 *
 * `data-grain`: with the GL stage on, the shader draws grain itself and these layers are
 * dropped. A blend-mode layer over a canvas that changes every frame forces a full
 * viewport re-blend per frame (measured: ~13ms → ~7ms frame interval on an iGPU).
 */
export function Grain({ className, fixed = false }: { className?: string; fixed?: boolean }) {
  if (fixed) {
    return (
      <div aria-hidden="true" data-grain className={cn("pointer-events-none fixed inset-0 overflow-hidden mix-blend-overlay", className)}>
        <div className={TILE} />
      </div>
    );
  }
  return <div aria-hidden="true" data-grain className={cn(TILE, className)} />;
}
