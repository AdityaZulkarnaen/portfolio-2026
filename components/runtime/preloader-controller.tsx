"use client";

import { useEffect, useRef } from "react";

import { markSiteReady } from "@/lib/motion/site-ready";

const HARD_CAP_MS = 3500;
const MIN_MS = 1100;
/** How long the wave takes to wash the ink off (first visit / later page loads). */
const WASH_MS = 1500;
const QUICK_WASH_MS = 1000;
/** Points across the wave front. */
const STEPS = 32;

function waitForHeroImage(): Promise<void> {
  const img = document.querySelector<HTMLImageElement>("[data-hero-still] img");
  if (!img) return Promise.resolve();
  const decode = () => img.decode().catch(() => {});
  if (img.complete) return decode();
  return new Promise((resolve) => {
    const done = () => decode().then(resolve);
    img.addEventListener("load", done, { once: true });
    img.addEventListener("error", () => resolve(), { once: true });
  });
}

/** Smooth churning noise along the front (0..1 across, time in s), roughly -1..1. */
function churn(x: number, t: number) {
  return (
    Math.sin(x * 7.1 + t * 1.9) * 0.5 +
    Math.sin(x * 13.7 - t * 2.6 + 1.3) * 0.3 +
    Math.sin(x * 23.3 + t * 3.4 + 2.1) * 0.2
  );
}

const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);

/**
 * Drives the server-rendered curtain: weighted progress from real work (fonts + the hero
 * still's decode) with a time floor and a 3.5s hard cap draws the wave line; then a wave
 * front washes the ink off top to bottom (a polygon clip on the ink, a glint on its edge).
 */
export function PreloaderController() {
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const overlay = ref.current?.closest<HTMLElement>("[data-preloader]");
    if (!overlay) return;
    const root = document.documentElement;
    const mode = root.dataset.preload;

    const finish = () => {
      overlay.dataset.state = "gone";
      try {
        sessionStorage.setItem("az:seen", "1");
      } catch {
        /* ignore */
      }
    };

    if (mode === "skip") {
      finish();
      markSiteReady();
      return;
    }

    // JS is running: the CSS failsafe would cut the wash short, so this controller owns the exit.
    overlay.style.animation = "none";
    const quick = mode === "quick";
    const ink = overlay.querySelector<HTMLElement>("[data-preloader-ink]");
    const mark = overlay.querySelector<SVGPathElement>("[data-preloader-mark]");
    const dot = overlay.querySelector<SVGCircleElement>("[data-preloader-dot]");
    const edgeSvg = overlay.querySelector<SVGSVGElement>("[data-preloader-edge]");
    const edge = edgeSvg?.querySelector("path");

    let fontsDone = 0;
    let imageDone = 0;
    let shown = 0;
    let raf = 0;
    let cancelled = false;
    let washFrom = 0;
    const start = performance.now();

    document.fonts?.ready.then(() => (fontsDone = 1)).catch(() => (fontsDone = 1));
    waitForHeroImage().then(() => (imageDone = 1));

    // The front sits at `front` (0 = top, 1 = bottom) give or take the churn; the ink is kept below it.
    const amp = 0.06;
    const wash = (now: number) => {
      if (cancelled) return;
      if (now < washFrom) {
        raf = requestAnimationFrame(wash);
        return;
      }
      const k = Math.min(1, (now - washFrom) / (quick ? QUICK_WASH_MS : WASH_MS));
      const front = easeInOut(k) * (1 + 2 * amp) - amp;
      const t = now / 1000;
      const ys: number[] = [];
      for (let i = 0; i <= STEPS; i++) {
        const x = i / STEPS;
        ys.push(Math.max(0, Math.min(1, front + churn(x, t) * amp)) * 100);
      }
      if (ink) {
        const pts = ys.map((y, i) => `${((i / STEPS) * 100).toFixed(2)}% ${y.toFixed(2)}%`);
        ink.style.clipPath = `polygon(${pts.join(",")},100% 100%,0% 100%)`;
      }
      if (edge && edgeSvg) {
        edge.setAttribute("d", ys.map((y, i) => `${i ? "L" : "M"}${((i / STEPS) * 100).toFixed(2)} ${y.toFixed(2)}`).join(""));
        edgeSvg.style.opacity = String(Math.min(1, k * 6) * (1 - Math.max(0, (k - 0.85) / 0.15)));
      }
      if (k >= 1) {
        finish();
        return;
      }
      raf = requestAnimationFrame(wash);
    };

    const tick = (now: number) => {
      if (cancelled) return;
      const elapsed = now - start;
      const work = 0.12 + 0.44 * fontsDone + 0.44 * imageDone;
      const floor = Math.min(1, elapsed / MIN_MS);
      let target = Math.min(work, floor);
      if (elapsed >= HARD_CAP_MS) target = 1;
      shown += (target - shown) * 0.09;
      if (target === 1 && 1 - shown < 0.004) shown = 1;

      if (mark) mark.style.strokeDashoffset = String(Math.max(0, 1 - shown));

      if (shown >= 1) {
        // The point lands, a beat, then the wash.
        dot?.setAttribute("data-ready", "");
        overlay.dataset.state = "leaving";
        markSiteReady();
        washFrom = performance.now() + 420;
        raf = requestAnimationFrame(wash);
        return;
      }
      raf = requestAnimationFrame(tick);
    };

    if (quick) {
      // Seen this session: the mark is already drawn; just the (shorter) wash.
      if (mark) mark.style.strokeDashoffset = "0";
      dot?.setAttribute("data-ready", "");
      overlay.dataset.state = "leaving";
      markSiteReady();
      washFrom = performance.now() + 120;
      raf = requestAnimationFrame(wash);
    } else {
      raf = requestAnimationFrame(tick);
    }

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
    };
  }, []);

  return <span ref={ref} hidden />;
}
