"use client";

import gsap from "gsap";
import { CustomEase } from "gsap/CustomEase";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";
import { useGSAP } from "@gsap/react";

// Registered once at module scope so plugin availability never depends on effect order.
if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger, SplitText, CustomEase, useGSAP);
  // Same curves as the CSS tokens (--ease-fluid / --ease-out-expo / --ease-io).
  CustomEase.create("fluid", "0.22,1,0.36,1");
  CustomEase.create("expo", "0.16,1,0.3,1");
  CustomEase.create("io", "0.65,0,0.35,1");
  gsap.defaults({ ease: "fluid", duration: 0.9 });
}

/**
 * Kills every ScrollTrigger whose trigger lives inside `root`. Call before pinning an
 * end state in a reduced-motion branch: ScrollTriggers spawned by a reverted timeline
 * can otherwise keep writing to the DOM on scroll.
 */
export function killScrollTriggersIn(root: Element | null | undefined) {
  if (!root) return;
  for (const trigger of ScrollTrigger.getAll()) {
    const el = trigger.trigger;
    if (el instanceof Element && root.contains(el)) trigger.kill();
  }
}

export { CustomEase, gsap, ScrollTrigger, SplitText, useGSAP };
