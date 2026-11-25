"use client";

import Lenis from "lenis";
import { useEffect } from "react";

import { gsap, ScrollTrigger } from "@/lib/motion/gsap";
import { emitVelocity, setLenis } from "@/lib/motion/lenis-store";
import { useMotionPrefs } from "@/lib/motion/motion-prefs";

/**
 * Document-level runtime, mounted once by the (site) layout.
 *
 * - Owns the single Lenis instance, driven by gsap.ticker (one clock for the page).
 * - Lenis is off under reduced motion and while "Pause motion" is on.
 * - Declares the GL tier. P2 ships no canvas, so the document is always `data-gl="off"`;
 *   the P3 stage will flip this once a WebGL2 context is live.
 */
export function SiteRuntime() {
  const { reduced, paused } = useMotionPrefs();
  const smooth = !reduced && !paused;

  useEffect(() => {
    const root = document.documentElement;
    root.dataset.gl = "off";
    root.dataset.pointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches ? "fine" : "coarse";
    ScrollTrigger.config({ ignoreMobileResize: true });
  }, []);

  useEffect(() => {
    if (!smooth) return;

    const lenis = new Lenis({ autoRaf: false, lerp: 0.085, smoothWheel: true, wheelMultiplier: 0.9, anchors: { offset: -24 } });
    setLenis(lenis);
    document.documentElement.classList.add("lenis");

    const onScroll = () => {
      emitVelocity(lenis.velocity);
      ScrollTrigger.update();
    };
    lenis.on("scroll", onScroll);

    const raf = (time: number) => lenis.raf(time * 1000);
    gsap.ticker.add(raf);
    gsap.ticker.lagSmoothing(0);
    ScrollTrigger.refresh();

    return () => {
      lenis.off("scroll", onScroll);
      gsap.ticker.remove(raf);
      gsap.ticker.lagSmoothing(500, 33);
      lenis.destroy();
      setLenis(null);
      document.documentElement.classList.remove("lenis");
      emitVelocity(0);
    };
  }, [smooth]);

  return null;
}
