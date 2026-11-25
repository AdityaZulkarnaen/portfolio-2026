"use client";

import { useRef, type ReactNode } from "react";

import { gsap, ScrollTrigger, useGSAP } from "@/lib/motion/gsap";
import { useMotionAllowed } from "@/lib/motion/motion-prefs";

export function ClientsMotion({ children, className }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const allowed = useMotionAllowed();

  useGSAP(
    () => {
      const root = ref.current;
      if (!root || !allowed) return;
      const cards = gsap.utils.toArray<HTMLElement>("[data-rise]", root);
      gsap.set(cards, { autoAlpha: 0, y: 48 });
      const batch = ScrollTrigger.batch(cards, {
        start: "top 90%",
        once: true,
        onEnter: (els) =>
          gsap.to(els, { autoAlpha: 1, y: 0, duration: 1.1, ease: "fluid", stagger: 0.08, overwrite: true }),
      });
      return () => batch.forEach((t) => t.kill());
    },
    { scope: ref, dependencies: [allowed], revertOnUpdate: true },
  );

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}
