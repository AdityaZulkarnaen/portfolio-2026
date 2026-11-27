import { PreloaderController } from "./preloader-controller";

/**
 * Server-rendered curtain. It paints in the first HTML so there is never a flash of the
 * page before the entrance; the hero h1 is already painted underneath (LCP still counts).
 *
 * - `html[data-preload="skip"]` (reduced motion) hides it before paint.
 * - `html[data-preload="quick"]` (seen this session) fades it in 400ms once hydrated.
 * - A CSS failsafe lifts it after 4.5s even if JavaScript never runs.
 */
export function Preloader() {
  return (
    <div
      data-preloader
      aria-hidden="true"
      className="fixed inset-0 z-[200] bg-ink-950 text-bone-100 [clip-path:inset(0_0_0_0)] animate-failsafe preload-skip:hidden data-[state=gone]:hidden data-[state=quick]:opacity-0 data-[state=quick]:transition-opacity data-[state=quick]:duration-400 data-[state=leaving]:[clip-path:inset(0_0_100%_0)] data-[state=leaving]:transition-[clip-path] data-[state=leaving]:duration-1000 data-[state=leaving]:ease-io"
    >
      <div className="absolute inset-gutter grid grid-rows-[auto_1fr_auto_auto]">
        <div className="slate flex justify-between text-bone-400">
          <span>Projection room</span>
          <span>Reel 00 · Leader</span>
        </div>
        <div
          data-preloader-count
          className="display -ml-[0.04em] self-end text-[clamp(6rem,26vw,26rem)] leading-[0.78] tabular-nums"
        >
          000
        </div>
        <div className="mt-6 mb-4 h-px bg-line">
          <span data-preloader-bar className="block h-full origin-left scale-x-0 bg-lilac-500" />
        </div>
        <div className="slate flex justify-between text-bone-400">
          <span>Threading the reel</span>
          <span data-preloader-tc className="tabular-nums">
            00:00:00:00
          </span>
        </div>
      </div>
      <PreloaderController />
    </div>
  );
}
