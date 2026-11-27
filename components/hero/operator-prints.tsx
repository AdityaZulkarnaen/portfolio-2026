"use client";

import Image from "next/image";
import { type CSSProperties, useEffect, useState } from "react";

import { DEV_MASK } from "@/components/showcase/plane-classes";

import type { HeroPhoto } from "./hero-projector";

/** How long each print stays on top before it is flicked to the back. */
const SHUFFLE_MS = 2800;

/** Each print gets its own cut: an arch, a pebble, a soft blob. */
const SHAPES = [
  "999px 999px 22px 22px",
  "58% 42% 52% 48% / 46% 54% 46% 54%",
  "40% 60% 34% 66% / 56% 38% 62% 44%",
  "26px 26px 999px 999px",
];

/** Resting pose by depth in the stack (0 = front). */
const POSES = [
  { x: "0%", y: "0%", r: "-3deg", s: "1" },
  { x: "14%", y: "5%", r: "7deg", s: "0.92" },
  { x: "-12%", y: "9%", r: "-11deg", s: "0.86" },
];
const HIDDEN = { x: "0%", y: "10%", r: "0deg", s: "0.8" };

/**
 * The operator's prints: a small, tilted stack of photos in playful cuts. Every few
 * seconds (or on click) the front print is flicked off and tucked in at the back.
 */
export function OperatorPrints({ photos, name, running }: { photos: HeroPhoto[]; name: string; running: boolean }) {
  const [top, setTop] = useState(0);
  const [flung, setFlung] = useState<number | null>(null);
  const n = photos.length;

  const next = () => {
    if (n < 2) return;
    setFlung(top);
    setTop((t) => (t + 1) % n);
  };

  useEffect(() => {
    if (!running || n < 2) return;
    const id = window.setTimeout(next, SHUFFLE_MS);
    return () => window.clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running, n, top]);

  return (
    <button
      type="button"
      onClick={next}
      aria-label={n > 1 ? `Photos of ${name}. Show the next one` : `Photo of ${name}`}
      data-cursor="view"
      data-cursor-label="Next"
      className="group/prints relative block aspect-[4/5] w-full cursor-pointer rounded-[24px] outline-none focus-visible:ring-1 focus-visible:ring-bone-100/60 focus-visible:ring-offset-8 focus-visible:ring-offset-transparent"
    >
      {photos.map((photo, i) => {
        const depth = (i - top + n) % n;
        const pose = POSES[depth] ?? HIDDEN;
        const isFlung = flung === i;
        return (
          <span
            key={photo.src}
            onAnimationEnd={(e) => {
              if (e.animationName === "print-fling") setFlung(null);
            }}
            className={`absolute inset-0 block overflow-hidden bg-ink-900 shadow-[0_18px_40px_-18px_rgb(0_0_0/0.7),0_0_0_1px_rgb(236_233_226/0.14)] transition-[transform,opacity,border-radius] duration-[900ms] ease-fluid [transform:translate(var(--x),var(--y))_rotate(var(--r))_scale(var(--s))] ${
              depth === 0 ? "group-hover/prints:[transform:translate(0,-3%)_rotate(2deg)_scale(1.03)]" : ""
            } ${isFlung ? "animate-[print-fling_1s_var(--ease-fluid)]" : ""}`}
            style={
              {
                "--x": pose.x,
                "--y": pose.y,
                "--r": pose.r,
                "--s": pose.s,
                zIndex: n - depth,
                opacity: POSES[depth] ? 1 : 0,
                borderRadius: SHAPES[i % SHAPES.length],
              } as CSSProperties
            }
          >
            <Image
              src={photo.src}
              alt={depth === 0 ? photo.alt || name : ""}
              fill
              sizes="(min-width: 768px) 14vw, 22vw"
              quality={75}
              placeholder={photo.lqip ? "blur" : "empty"}
              blurDataURL={photo.lqip ?? undefined}
              className={`object-cover filter-[grayscale(1)_sepia(0.14)_contrast(1.12)_brightness(0.62)] transition-[filter] duration-700 ease-fluid group-hover/prints:filter-[grayscale(0)_contrast(1.05)_brightness(0.85)] ${DEV_MASK}`}
              style={{
                objectPosition: photo.focalX != null && photo.focalY != null ? `${photo.focalX * 100}% ${photo.focalY * 100}%` : "50% 25%",
              }}
            />
          </span>
        );
      })}
    </button>
  );
}
