"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);

/**
 * Drives `--dev` (the print develop, 0 = not there yet, 1 = shown) from scroll for every
 * `[data-dev-scroll]` element that no section choreography owns: case galleries, testimonial
 * portraits, client marks. The GL planes read the same value (desktop), and the DOM
 * `dev-mask` reads it where there are no planes (phones), so both show the same wave.
 * Develops from entering at 92% of the viewport to 45%; reverses going back up.
 */
export function DevScroll() {
  const pathname = usePathname();

  useEffect(() => {
    if (document.documentElement.dataset.motion === "off") return;
    const near = new Set<HTMLElement>();
    let raf = 0;

    const paint = () => {
      raf = 0;
      const vh = window.innerHeight;
      for (const el of near) {
        const top = el.getBoundingClientRect().top;
        el.style.setProperty("--dev", clamp01((vh * 0.92 - top) / (vh * 0.47)).toFixed(4));
      }
    };
    const schedule = () => {
      raf ||= requestAnimationFrame(paint);
    };

    // Only elements near the viewport are measured each frame.
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          const el = e.target as HTMLElement;
          if (e.isIntersecting) near.add(el);
          else {
            near.delete(el);
            // Settle off-screen: fully developed above the viewport, undeveloped below it.
            el.style.setProperty("--dev", e.boundingClientRect.top < 0 ? "1" : "0");
          }
        }
        schedule();
      },
      { rootMargin: "20% 0px 20% 0px" },
    );

    const seen = new WeakSet<Element>();
    const scan = () => {
      for (const el of document.querySelectorAll<HTMLElement>("[data-dev-scroll]")) {
        if (seen.has(el)) continue;
        seen.add(el);
        el.style.setProperty("--dev", "0");
        io.observe(el);
      }
    };
    scan();
    // Sections mount later (streaming, Activity): pick up new prints as they appear.
    const mo = new MutationObserver(() => scan());
    mo.observe(document.body, { childList: true, subtree: true });

    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
      mo.disconnect();
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
    };
  }, [pathname]);

  return null;
}
