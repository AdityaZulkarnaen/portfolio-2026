"use client";

import { useRef, type ReactNode } from "react";

import { gsap, useGSAP } from "@/lib/motion/gsap";

/**
 * Desktop: the section pins and the track slides horizontally with scroll.
 * Mobile / reduced motion: a native scroll-snap rail (CSS only).
 */
export function AchievementsRail({ children, head }: { children: ReactNode; head: ReactNode }) {
  const sectionRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const section = sectionRef.current;
      const track = trackRef.current;
      if (!section || !track || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      const mm = gsap.matchMedia();
      mm.add("(min-width: 1024px)", () => {
        section.dataset.pinned = "true";
        const distance = () => Math.max(0, track.scrollWidth - track.clientWidth);
        gsap.to(track.children, {
          x: () => -distance(),
          ease: "none",
          scrollTrigger: {
            trigger: section,
            start: "top top",
            end: () => `+=${distance()}`,
            pin: true,
            scrub: 0.6,
            invalidateOnRefresh: true,
          },
        });
        return () => {
          delete section.dataset.pinned;
        };
      });
      return () => mm.revert();
    },
    { scope: sectionRef },
  );

  return (
    <div ref={sectionRef} className="group/rail grid grid-rows-[auto_1fr] data-[pinned]:h-svh">
      {head}
      <div
        ref={trackRef}
        className="snap-x snap-mandatory overflow-x-auto pb-[clamp(3rem,6vw,5rem)] [scrollbar-width:none] group-data-[pinned]/rail:overflow-hidden"
      >
        {children}
      </div>
    </div>
  );
}
