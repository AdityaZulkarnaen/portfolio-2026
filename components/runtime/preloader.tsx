import { MARK_DOT, MARK_PATH } from "@/components/site/logo-mark";

import { PreloaderController } from "./preloader-controller";

/**
 * Server-rendered curtain. It paints in the first HTML so there is never a flash of the
 * page before the entrance; the hero h1 is already painted underneath (LCP still counts).
 * No counter: the mark draws itself in the centre as the page loads, its point lands when
 * it is ready, then the ink is washed off top to bottom by a churning wave front (the same
 * develop the work prints use), driven by <PreloaderController>.
 *
 * - `html[data-preload="skip"]` (reduced motion) hides it before paint.
 * - `html[data-preload="quick"]` (seen this session): the mark is already drawn and only a
 *   shorter wash plays.
 * - A CSS failsafe lifts it after 4.5s even if JavaScript never runs.
 */
export function Preloader() {
  return (
    <div
      data-preloader
      aria-hidden="true"
      className="fixed inset-0 z-200 text-bone-100 animate-failsafe preload-skip:hidden data-[state=gone]:hidden"
    >
      <div data-preloader-ink className="absolute inset-0 grid place-items-center bg-ink-950">
        <div className="grid justify-items-center gap-6">
          <svg viewBox="0 0 32 32" className="size-[clamp(4.5rem,9vw,7rem)] overflow-visible">
            <path d={MARK_PATH} fill="none" stroke="var(--color-line)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
            <path
              data-preloader-mark
              d={MARK_PATH}
              pathLength={1}
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeDasharray="1"
              strokeDashoffset="1"
              className="preload-quick:[stroke-dashoffset:0]"
            />
            <circle
              data-preloader-dot
              cx={MARK_DOT.cx}
              cy={MARK_DOT.cy}
              r="1.6"
              className="origin-center scale-0 fill-lilac-500 transition-transform duration-500 ease-fluid [transform-box:fill-box] data-ready:scale-100 preload-quick:scale-100"
            />
          </svg>
          <p className="slate text-bone-400">Aditya Zulkarnaen</p>
        </div>
      </div>
      {/* The glint riding the wave front as it washes the ink away. */}
      <svg data-preloader-edge className="pointer-events-none absolute inset-0 size-full opacity-0" preserveAspectRatio="none" viewBox="0 0 100 100">
        <path d="" fill="none" stroke="rgb(214 236 255 / 0.55)" strokeWidth="2.5" vectorEffect="non-scaling-stroke" filter="blur(2px)" />
      </svg>
      <PreloaderController />
    </div>
  );
}
