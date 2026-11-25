"use client";

import { useLayoutEffect } from "react";

import { stageBridge } from "@/gl/bridge";
import { ScrollTrigger } from "@/lib/motion/gsap";
import { getLenis, scrollToTarget } from "@/lib/motion/lenis-store";

/**
 * Rendered by every page. Layout effects re-run each time <Activity> shows the page
 * again, so this is the "page is visible" signal: re-measure Lenis, honour the hash,
 * refresh ScrollTrigger and re-measure the GL stage.
 */
export function RouteSignal() {
  useLayoutEffect(() => {
    const lenis = getLenis();
    lenis?.resize();

    const hash = window.location.hash;
    let frame = 0;
    const jump = () => {
      try {
        getLenis()?.resize();
        if (document.querySelector(hash)) scrollToTarget(hash, { immediate: true });
      } catch {
        /* invalid selector in hash */
      }
    };
    const intents = ["wheel", "touchstart", "keydown", "pointerdown"] as const;
    const stopFollowing = () => {
      ScrollTrigger.removeEventListener("refresh", jump);
      for (const type of intents) window.removeEventListener(type, stopFollowing);
    };
    let followTimer = 0;
    if (hash.length > 1) {
      frame = requestAnimationFrame(jump);
      ScrollTrigger.addEventListener("refresh", jump);
      for (const type of intents) window.addEventListener(type, stopFollowing, { passive: true });
      followTimer = window.setTimeout(stopFollowing, 4000);
    }
    const refresh = requestAnimationFrame(() => {
      ScrollTrigger.refresh();
      stageBridge.remeasure();
    });
    document.fonts?.ready.then(() => ScrollTrigger.refresh()).catch(() => {});

    return () => {
      cancelAnimationFrame(frame);
      cancelAnimationFrame(refresh);
      window.clearTimeout(followTimer);
      stopFollowing();
    };
  }, []);

  return null;
}
