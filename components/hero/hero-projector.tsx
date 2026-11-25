"use client";

import Image from "next/image";
import { useEffect, useLayoutEffect, useRef, useState } from "react";

import { scrollToTarget } from "@/lib/motion/lenis-store";
import { Grain } from "@/components/site/grain";
import { useMotionAllowed } from "@/lib/motion/motion-prefs";

export type HeroSlide = {
  slug: string;
  name: string;
  kind: string;
  year: string;
  accent: string | null;
  image: { src: string; width: number; height: number; alt: string; lqip: string | null } | null;
};

const SLIDE_MS = 6000;

/**
 * Hero "stills mode": featured covers projected behind a grade, crossfading every 6s with
 * a slow push-in, synced to the "Now playing" chip. The P3 stage will take over this slot
 * (`data-gl-hero`) and redraw the same sources through the shader; until then the DOM
 * version is the experience and stays the fallback.
 */
export function HeroProjector({ slides }: { slides: HeroSlide[] }) {
  const [index, setIndex] = useState(0);
  const [visible, setVisible] = useState(true);
  const rootRef = useRef<HTMLDivElement>(null);
  const motion = useMotionAllowed();
  const running = motion && visible && slides.length > 1;

  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setVisible(e.isIntersecting), { threshold: 0.05 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // Interval lives in a layout effect so Activity-hiding the page clears it synchronously.
  useLayoutEffect(() => {
    if (!running) return;
    const id = window.setInterval(() => {
      if (document.visibilityState === "visible") setIndex((i) => (i + 1) % slides.length);
    }, SLIDE_MS);
    return () => window.clearInterval(id);
  }, [running, slides.length, index]);

  const slide = slides[index];
  if (!slide) return null;
  const n = String(index + 1).padStart(2, "0");

  return (
    <>
      <div
        ref={rootRef}
        className="group/proj absolute inset-0 -z-10 bg-ink-950"
        data-gl-hero
        data-hero-mode="stills"
        data-running={running || undefined}
        style={{ "--accent": slide.accent ?? "var(--color-ember-500)" } as React.CSSProperties}
        aria-hidden="true"
      >
        {slides.map((s, i) =>
          s.image ? (
            <div
              key={s.slug}
              className="group/slide absolute inset-0 opacity-0 transition-opacity duration-[1.8s] ease-io data-[active]:opacity-100"
              data-active={i === index || undefined}
              data-hero-still={i === 0 ? "" : undefined}
              data-gl-media
            >
              <Image
                src={s.image.src}
                alt=""
                fill
                sizes="100vw"
                quality={60}
                preload={i === 0}
                fetchPriority={i === 0 ? "high" : "low"}
                loading={i === 0 ? "eager" : "lazy"}
                placeholder={s.image.lqip ? "blur" : "empty"}
                blurDataURL={s.image.lqip ?? undefined}
                className="origin-[60%_40%] scale-[1.08] object-cover object-top brightness-50 contrast-[1.12] saturate-[0.55] motion-on:group-data-[running]/proj:group-data-[active]/slide:animate-ken-burns"
              />
            </div>
          ) : null,
        )}
        {/* Grade: top/bottom falloff + teal→accent split tone. */}
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgb(7_8_11/0.72)_0%,rgb(7_8_11/0.05)_26%,rgb(7_8_11/0.1)_52%,rgb(7_8_11/0.94)_88%,var(--color-ink-950)_100%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(100deg,color-mix(in_oklab,var(--color-tide-400)_22%,transparent),transparent_46%,color-mix(in_oklab,var(--accent)_24%,transparent))] transition-[background] duration-[1.8s]" />
        <Grain className="opacity-55" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_120%_90%_at_50%_40%,transparent_50%,rgb(0_0_0/0.7)_100%)]" />
      </div>

      <button
        type="button"
        className="glass group/np absolute right-gutter bottom-[calc(clamp(1.25rem,2.6vw,2.5rem)+clamp(2.5rem,11.8vw,16rem)*1.68+clamp(1rem,2vw,2rem)+5rem)] z-10 grid w-[min(360px,calc(100%-2*var(--spacing-gutter)))] grid-cols-[auto_1fr] items-center gap-x-4 gap-y-1.5 rounded-[14px] px-4 pt-3.5 pb-3 text-left text-bone-100 transition-[transform,background-color] duration-(--dur-base) ease-fluid hover:-translate-y-0.5 hover:bg-ink-800/75"
        data-cursor="view"
        data-cursor-label="Jump"
        onClick={() => scrollToTarget(`#case-${slide.slug}`, { offset: -24 })}
        aria-label={`Now playing: ${slide.name}. Jump to case.`}
      >
        <span className="slate row-span-2 inline-flex items-center gap-2 self-start pt-0.5 text-bone-400">
          <span className="size-[7px] animate-blink rounded-full bg-ember-500 motion-off:animate-none" aria-hidden="true" />
          Now playing
        </span>
        <span className="block min-h-[3.6em] overflow-hidden">
          <span key={slide.slug} className="grid animate-roll-in gap-0.5">
            <span className="slate text-bone-400 tabular-nums">
              {n} / {String(slides.length).padStart(2, "0")}
            </span>
            <span className="text-lg leading-tight font-bold tracking-[-0.01em] [font-stretch:112%]">{slide.name}</span>
            <span className="slate text-bone-400">
              {slide.kind} · {slide.year}
            </span>
          </span>
        </span>
        <span className="col-span-full mt-1.5 h-px overflow-hidden bg-line" aria-hidden="true">
          <span
            key={`${slide.slug}-${running}`}
            className="block h-full origin-left scale-x-0 bg-ember-500 data-[running]:animate-fill"
            data-running={running || undefined}
          />
        </span>
      </button>
    </>
  );
}
