"use client";

import { useRef, type ReactNode } from "react";

import { gsap, ScrollTrigger, useGSAP } from "@/lib/motion/gsap";
import { useMotionAllowed } from "@/lib/motion/motion-prefs";

/**
 * Counts every `[data-count]` number in its subtree up from zero once its sentence scrolls
 * into view. Nodes are queried at setup (not held as refs) because <RevealWords> splits and
 * restores this markup. Motion off: the server-rendered final values stay.
 */
export function FactCounters({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const allowed = useMotionAllowed();

  useGSAP(
    () => {
      const root = ref.current;
      if (!root || !allowed) return;
      const cleanups: (() => void)[] = [];
      for (const el of root.querySelectorAll<HTMLElement>("[data-count]")) {
        const out = el.querySelector<HTMLElement>("[data-count-value]");
        if (!out) continue;
        const target = Number(el.dataset.count);
        const decimals = Number(el.dataset.decimals ?? 0);
        const suffix = el.dataset.suffix ?? "";
        const final = target.toFixed(decimals) + suffix;
        const state = { v: 0 };
        const write = () => (out.textContent = state.v.toFixed(decimals));
        write();
        const tween = gsap.to(state, {
          v: target,
          duration: decimals > 0 ? 1.6 : 1.3,
          ease: "expo",
          paused: true,
          onUpdate: write,
          onComplete: () => (out.textContent = final),
        });
        const st = ScrollTrigger.create({
          trigger: el,
          start: "top 90%",
          end: "max",
          once: true,
          refreshPriority: -1,
          onEnter: () => tween.play(),
        });
        if (window.scrollY > st.start + window.innerHeight) tween.progress(1);
        cleanups.push(() => {
          st.kill();
          tween.kill();
          out.textContent = final;
        });
      }
      return () => cleanups.forEach((c) => c());
    },
    { scope: ref, dependencies: [allowed], revertOnUpdate: true },
  );

  return <div ref={ref}>{children}</div>;
}
