"use client";

import { useRef, type ReactNode } from "react";

import { gsap, ScrollTrigger, useGSAP } from "@/lib/motion/gsap";
import { parallaxOffset } from "@/lib/motion/parallax";

/**
 * Motion layer over an <EditorialGrid>: shutter reveal (clip-path wipe + scale settle) on
 * enter, depth parallax per figure, and scroll-panning for tall screenshots.
 * Under reduced motion it does nothing; the grid is already in its final state.
 */
export function GridMotion({ children, className }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const root = ref.current;
      if (!root || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      const mm = gsap.matchMedia();

      root.querySelectorAll<HTMLElement>("[data-grid-item]").forEach((figure) => {
        const win = figure.querySelector<HTMLElement>("[data-frame]");
        const img = figure.querySelector<HTMLElement>("[data-gl-media] img, [data-gl-media] video");
        if (win) {
          gsap.fromTo(
            win,
            { clipPath: "inset(18% 0% 18% 0%)", opacity: 0.4 },
            {
              clipPath: "inset(0% 0% 0% 0%)",
              opacity: 1,
              duration: 1.4,
              ease: "expo",
              scrollTrigger: { trigger: figure, start: "top 92%", once: true },
            },
          );
        }
        if (img && !img.hasAttribute("data-tall")) {
          gsap.fromTo(
            img,
            { scale: 1.14 },
            { scale: 1, duration: 1.8, ease: "expo", scrollTrigger: { trigger: figure, start: "top 92%", once: true } },
          );
        }

        const depth = Number(figure.dataset.depth ?? 0);
        if (depth !== 0) {
          mm.add("(min-width: 768px)", () => {
            ScrollTrigger.create({
              trigger: figure,
              start: "top bottom",
              end: "bottom top",
              onUpdate: (self) => {
                gsap.set(figure, { y: parallaxOffset(depth, self.progress, window.innerHeight) });
              },
            });
          });
        }
      });

      root.querySelectorAll<HTMLElement>('[data-behavior="scroll"]').forEach((win) => {
        const img = win.querySelector<HTMLElement>("img");
        if (!img) return;
        gsap.to(img, {
          y: () => -Math.max(0, img.offsetHeight - win.offsetHeight),
          ease: "none",
          scrollTrigger: {
            trigger: win,
            start: "top 70%",
            end: "bottom 20%",
            scrub: 0.8,
            invalidateOnRefresh: true,
          },
        });
      });

      return () => mm.revert();
    },
    { scope: ref },
  );

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}
