"use client";

import { useRef } from "react";

import { VariableLetters } from "@/components/motion/variable-letters";
import { gsap, useGSAP } from "@/lib/motion/gsap";
import { onSiteReady } from "@/lib/motion/site-ready";

/**
 * The hero h1. Painted in the server HTML (LCP) under the preloader; once the curtain
 * lifts, letters rise out of their line masks. Letters swell on wdth/wght near the pointer.
 */
export function Wordmark({ top, bottom }: { top: string; bottom: string }) {
  const ref = useRef<HTMLHeadingElement>(null);

  useGSAP(
    () => {
      const el = ref.current;
      if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      const letters = el.querySelectorAll("[data-letter]");
      const scope = el.closest("section") ?? document;
      const after = scope.querySelectorAll("[data-hero-after]");
      gsap.set(letters, { yPercent: 105 });
      gsap.set(after, { autoAlpha: 0, y: 16 });
      const off = onSiteReady(() => {
        const tl = gsap.timeline({ delay: 0.15 });
        tl.to(letters, { yPercent: 0, duration: 1.35, ease: "expo", stagger: { each: 0.035, from: "start" } });
        tl.to(after, { autoAlpha: 1, y: 0, duration: 1, ease: "fluid", stagger: 0.08 }, 0.55);
      });
      return off;
    },
    { scope: ref },
  );

  return (
    <h1
      ref={ref}
      className="-ml-[0.05em] grid text-[clamp(2.5rem,11.8vw,16rem)] leading-[0.8] font-extrabold tracking-[-0.04em] [font-variation-settings:'wdth'_125,'wght'_800]"
    >
      <span className="block overflow-clip pb-[0.04em] whitespace-nowrap text-bone-400">
        <VariableLetters text={top} scope="window" rest={{ wdth: 125, wght: 800 }} peak={{ wdth: 100, wght: 900 }} radius={0.16} />
      </span>
      <span className="block overflow-clip pb-[0.04em] whitespace-nowrap">
        <VariableLetters text={bottom} scope="window" rest={{ wdth: 125, wght: 800 }} peak={{ wdth: 100, wght: 900 }} radius={0.16} />
      </span>
    </h1>
  );
}
