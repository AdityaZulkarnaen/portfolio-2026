"use client";

import Image from "next/image";
import { useRef } from "react";

import { DEV_MASK, PLANE_MEDIA } from "@/components/showcase/plane-classes";
import { PlaneWindow } from "@/components/showcase/plane-window";
import type { Media } from "@/lib/content/types";
import { ScrollTrigger, useGSAP } from "@/lib/motion/gsap";

/**
 * The portrait develops from dark as it comes up: `--dev` on the frame drives the GL wave
 * (gl/plane.ts) and the DOM mask alike. Reduced motion leaves it unset, so it shows whole.
 */
export function AboutPortrait({ photo, name }: { photo: Media; name: string }) {
  const frameRef = useRef<HTMLDivElement>(null);
  const readoutRef = useRef<HTMLSpanElement>(null);

  useGSAP(() => {
    const frame = frameRef.current;
    if (!frame || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const develop = (d: number) => {
      frame.style.setProperty("--dev", d.toFixed(4));
      if (readoutRef.current) readoutRef.current.textContent = String(Math.round(d * 100)).padStart(3, "0");
    };
    develop(0);
    const st = ScrollTrigger.create({
      trigger: frame,
      start: "top 90%",
      end: "top 30%",
      refreshPriority: -1,
      onUpdate: (self) => develop(self.progress),
      onRefresh: (self) => develop(self.progress),
    });
    return () => {
      st.kill();
      frame.style.removeProperty("--dev");
    };
  });

  return (
    <figure className="grid gap-3">
      <div ref={frameRef} data-frame className="relative aspect-[4/5] overflow-hidden rounded-[10px]">
        <PlaneWindow className="absolute inset-0 overflow-hidden bg-ink-900 gl-plane:bg-transparent" behavior="static">
          <Image
            src={photo.src}
            alt={photo.alt || name}
            fill
            sizes="(min-width: 768px) 34vw, 90vw"
            quality={75}
            placeholder={photo.lqip ? "blur" : "empty"}
            blurDataURL={photo.lqip ?? undefined}
            className={`object-cover saturate-[0.85] ${PLANE_MEDIA} ${DEV_MASK}`}
            style={{
              objectPosition:
                photo.focalX != null && photo.focalY != null ? `${photo.focalX * 100}% ${photo.focalY * 100}%` : "50% 30%",
            }}
          />
        </PlaneWindow>
        {(["top-2 left-2", "top-2 right-2", "bottom-2 left-2", "right-2 bottom-2"] as const).map((pos) => (
          <span key={pos} aria-hidden="true" className={`absolute size-[3px] rounded-full bg-bone-100/70 ${pos}`} />
        ))}
      </div>
      <figcaption className="slate flex justify-between gap-4 text-bone-400 tabular-nums">
        <span className="truncate">Print 01 · {name}</span>
        <span aria-hidden="true" className="shrink-0">
          Dev <span ref={readoutRef} className="text-bone-100">100</span>%
        </span>
      </figcaption>
    </figure>
  );
}
