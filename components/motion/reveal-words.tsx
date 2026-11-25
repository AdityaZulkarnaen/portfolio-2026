"use client";

import { useRef, type ReactNode } from "react";

import { gsap, SplitText, useGSAP } from "@/lib/motion/gsap";

/**
 * Scroll-scrubbed reading light: each word brightens from 12% to full opacity as the
 * block passes through the viewport. Works on nested markup (serif highlights survive).
 */
export function RevealWords({ children, className }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const el = ref.current;
      if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      const split = SplitText.create(el, { type: "words" });
      gsap.fromTo(
        split.words,
        { opacity: 0.12 },
        {
          opacity: 1,
          ease: "none",
          stagger: 0.08,
          scrollTrigger: { trigger: el, start: "top 80%", end: "bottom 45%", scrub: 0.6 },
        },
      );
      return () => split.revert();
    },
    { scope: ref },
  );

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}
