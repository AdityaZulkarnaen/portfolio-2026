"use client";

import { useEffect, useRef } from "react";

import { markSiteReady } from "@/lib/motion/site-ready";

const HARD_CAP_MS = 3500;
const MIN_MS = 1100;

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

function timecode(ms: number): string {
  const totalFrames = Math.floor(ms / (1000 / 24));
  const f = totalFrames % 24;
  const s = Math.floor(totalFrames / 24) % 60;
  return `00:00:${String(s).padStart(2, "0")}:${String(f).padStart(2, "0")}`;
}

/**
 * Drives the server-rendered curtain: weighted progress from real work (fonts + the
 * hero still's decode) with a time floor, a 3.5s hard cap, then a shutter lift.
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

    if (mode === "quick") {
      overlay.dataset.state = "quick";
      markSiteReady();
      const t = window.setTimeout(finish, 420);
      return () => window.clearTimeout(t);
    }

    const count = overlay.querySelector<HTMLElement>("[data-preloader-count]");
    const bar = overlay.querySelector<HTMLElement>("[data-preloader-bar]");
    const tc = overlay.querySelector<HTMLElement>("[data-preloader-tc]");

    let fontsDone = 0;
    let imageDone = 0;
    let shown = 0;
    let raf = 0;
    let leaveTimer = 0;
    let cancelled = false;
    const start = performance.now();

    document.fonts?.ready.then(() => (fontsDone = 1)).catch(() => (fontsDone = 1));
    waitForHeroImage().then(() => (imageDone = 1));

    const tick = (now: number) => {
      if (cancelled) return;
      const elapsed = now - start;
      const work = 0.12 + 0.44 * fontsDone + 0.44 * imageDone;
      const floor = Math.min(1, elapsed / MIN_MS);
      let target = Math.min(work, floor);
      if (elapsed >= HARD_CAP_MS) target = 1;
      shown += (target - shown) * 0.09;
      if (target === 1 && 1 - shown < 0.004) shown = 1;

      const pct = Math.round(shown * 100);
      if (count) count.textContent = String(pct).padStart(3, "0");
      if (bar) bar.style.transform = `scaleX(${shown})`;
      if (tc) tc.textContent = timecode(elapsed);

      if (shown >= 1) {
        overlay.dataset.state = "leaving";
        markSiteReady();
        leaveTimer = window.setTimeout(finish, 1100);
        return;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      window.clearTimeout(leaveTimer);
    };
  }, []);

  return <span ref={ref} hidden />;
}
