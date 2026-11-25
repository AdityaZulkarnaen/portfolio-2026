"use client";

import { useLayoutEffect } from "react";

import { ScrollTrigger } from "@/lib/motion/gsap";
import { getLenis, scrollToTarget } from "@/lib/motion/lenis-store";

/**
 * Rendered by every page. Layout effects re-run each time <Activity> shows the page
 * again, so this is the "page is visible" signal: re-measure Lenis, honour the hash,
 * refresh ScrollTrigger (and, from P3, `stage.remeasureAll()`).
 */
export function RouteSignal() {
  useLayoutEffect(() => {
    const lenis = getLenis();
    lenis?.resize();

    const hash = window.location.hash;
    let frame = 0;
    if (hash.length > 1) {
      frame = requestAnimationFrame(() => {
        try {
          if (document.querySelector(hash)) scrollToTarget(hash, { immediate: true });
        } catch {
          /* invalid selector in hash */
        }
      });
    }
    const refresh = requestAnimationFrame(() => ScrollTrigger.refresh());
    document.fonts?.ready.then(() => ScrollTrigger.refresh()).catch(() => {});

    return () => {
      cancelAnimationFrame(frame);
      cancelAnimationFrame(refresh);
    };
  }, []);

  return null;
}
