"use client";

import { useRef, type ElementType, type ReactNode } from "react";

import { gsap, ScrollTrigger, SplitText, useGSAP } from "@/lib/motion/gsap";

type Props = {
  as?: ElementType;
  children: ReactNode;
  className?: string;
  /** chars: a rising per-letter wipe; lines: masked line rise. */
  type?: "chars" | "lines";
  delay?: number;
  stagger?: number;
  id?: string;
};

/**
 * Masked text rise when the element enters the viewport. Content is visible by default
 * (no-JS, reduced motion); GSAP only sets the hidden state at the moment it animates.
 */
export function SplitReveal({ as: Tag = "div", children, className, type = "lines", delay = 0, stagger, id }: Props) {
  const ref = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const el = ref.current;
      if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

      const split = SplitText.create(el, {
        type: type === "chars" ? "lines,chars" : "lines",
        mask: "lines",
        // The masks get `split-line-mask` (globals.css): room under each line for descenders.
        linesClass: "split-line",
        autoSplit: true,
        onSplit(self) {
          const targets = type === "chars" ? self.chars : self.lines;
          return gsap.from(targets, {
            yPercent: 110,
            duration: type === "chars" ? 1.1 : 1.2,
            ease: "expo",
            stagger: stagger ?? (type === "chars" ? 0.022 : 0.09),
            delay,
            scrollTrigger: { trigger: el, start: "top 88%", once: true },
          });
        },
      });
      return () => {
        split.revert();
        ScrollTrigger.getAll().forEach((t) => t.trigger === el && t.kill());
      };
    },
    { scope: ref },
  );

  return (
    <Tag ref={ref} className={className} id={id}>
      {children}
    </Tag>
  );
}
