"use client";

import { type RefObject, useEffect, useState } from "react";

/**
 * True once the element comes within `margin` of the viewport (and stays true). Gates the
 * GSAP setup of below-the-fold sections, so their ScrollTriggers, text splitting and layout
 * reads happen just before they are needed instead of all at once on load (main-thread
 * blocking time). Content is fully readable before that: motion only ever adds to it.
 */
export function useNear<T extends Element>(ref: RefObject<T | null>, margin = "100% 0px"): boolean {
  const [near, setNear] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || near) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setNear(true);
          io.disconnect();
        }
      },
      { rootMargin: margin },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [ref, margin, near]);
  return near;
}
