"use client";

import Lenis from "lenis";
import { useEffect } from "react";

import { StageProvider } from "@/gl/stage-provider";

import { DevScroll } from "./dev-scroll";
import { gsap, ScrollTrigger } from "@/lib/motion/gsap";
import { emitVelocity, setLenis } from "@/lib/motion/lenis-store";
import { useMotionPrefs } from "@/lib/motion/motion-prefs";

/**
 * Document-level runtime, mounted once by the (site) layout.
 *
 * - Owns the single Lenis instance, driven by gsap.ticker (one clock for the page).
 * - Lenis is off under reduced motion and while "Pause motion" is on.
 * - Mounts <StageProvider>, which owns the GL tier, the fixed canvas and `html[data-gl]`.
 *   Lenis is registered on gsap.ticker with priority, so the stage tick (added later,
 *   without priority) always runs after the scroll position has been updated.
 */
export function SiteRuntime() {
  const { reduced, paused } = useMotionPrefs();
  const smooth = !reduced && !paused;

  useEffect(() => {
    const root = document.documentElement;
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
    gsap.ticker.add(raf, false, true);
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

  return (
    <>
      <StageProvider />
      <DevScroll />
    </>
  );
}
