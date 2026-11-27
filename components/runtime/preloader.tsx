import { PreloaderController } from "./preloader-controller";

/** A gentle sine across the width (viewBox 0..1000 × 0..40), drawn in as the page loads. */
const WAVE = Array.from({ length: 41 }, (_, i) => {
  const x = i * 25;
  const y = 20 + Math.sin((i / 40) * Math.PI * 4) * 9;
  return `${i ? "L" : "M"}${x} ${y.toFixed(1)}`;
}).join("");

/**
 * Server-rendered curtain. It paints in the first HTML so there is never a flash of the
 * page before the entrance; the hero h1 is already painted underneath (LCP still counts).
 * While the page loads a wave line draws across it; when ready, the ink is washed off top
 * to bottom by a churning wave front (the same develop the work prints use), driven by
 * <PreloaderController>.
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
      className="fixed inset-0 z-200 text-bone-100 animate-failsafe preload-skip:hidden data-[state=gone]:hidden data-[state=quick]:opacity-0 data-[state=quick]:transition-opacity data-[state=quick]:duration-400"
    >
      <div data-preloader-ink className="absolute inset-0 bg-ink-950">
        <div className="absolute inset-gutter grid grid-rows-[auto_1fr_auto_auto]">
          <div className="slate flex justify-between text-bone-400">
            <span>Aditya Zulkarnaen</span>
            <span>Portfolio · 2026</span>
          </div>
          <div
            data-preloader-count
            className="-ml-[0.04em] self-end text-[clamp(6rem,24vw,24rem)] leading-[0.8] font-light tracking-[-0.06em]"
          >
            000
          </div>
          <svg viewBox="0 0 1000 40" preserveAspectRatio="none" className="mt-6 mb-4 h-8 w-full overflow-visible">
            <path d={WAVE} fill="none" stroke="var(--color-line)" strokeWidth="1" vectorEffect="non-scaling-stroke" />
            <clipPath id="preloader-progress">
              <rect data-preloader-wave width="0" height="40" />
            </clipPath>
            <path
              d={WAVE}
              clipPath="url(#preloader-progress)"
              fill="none"
              stroke="var(--color-lilac-500)"
              strokeWidth="1.5"
              vectorEffect="non-scaling-stroke"
            />
          </svg>
          <div className="slate flex justify-between text-bone-400">
            <span>Loading</span>
            <span>Yogyakarta</span>
          </div>
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
