"use client";

import type Lenis from "lenis";

/**
 * The single Lenis instance for the document (owned by <SiteRuntime>), or null when
 * smooth scroll is off (reduced motion, paused motion).
 *
 * Anything that moves the page goes through `scrollToTarget`, so Lenis never animates
 * toward a stale target while something else writes scrollTop.
 */
let current: Lenis | null = null;
const lockReasons = new Set<string>();

export function getLenis(): Lenis | null {
  return current;
}

export function setLenis(lenis: Lenis | null) {
  current = lenis;
  if (lenis && lockReasons.size > 0) lenis.stop();
}

/**
 * Velocity listeners live in a module set so subscribers can register before Lenis exists
 * (child effects run before the layout's effect) and simply start receiving values later.
 */
const velocityListeners = new Set<(velocity: number) => void>();

export function emitVelocity(velocity: number) {
  for (const listener of velocityListeners) listener(velocity);
}

export function subscribeVelocity(listener: (velocity: number) => void): () => void {
  velocityListeners.add(listener);
  return () => {
    velocityListeners.delete(listener);
  };
}

/** Stop smooth scrolling while a dialog/menu owns the page. Reasons are tracked by name. */
export function lockScroll(reason: string) {
  lockReasons.add(reason);
  current?.stop();
  document.documentElement.dataset.scrollLocked = "true";
}

export function unlockScroll(reason: string) {
  lockReasons.delete(reason);
  if (lockReasons.size === 0) {
    current?.start();
    delete document.documentElement.dataset.scrollLocked;
  }
}

function expoOut(t: number) {
  return t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
}

/** Scroll to an element or selector: through Lenis when it runs, natively otherwise. */
export function scrollToTarget(
  target: string | HTMLElement,
  opts: { offset?: number; immediate?: boolean } = {},
) {
  const el = typeof target === "string" ? document.querySelector<HTMLElement>(target) : target;
  if (!el) return;
  const offset = opts.offset ?? 0;
  if (current) {
    current.scrollTo(el, { offset, immediate: opts.immediate, duration: 1.4, easing: expoOut });
    return;
  }
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const top = el.getBoundingClientRect().top + window.scrollY + offset;
  window.scrollTo({ top, behavior: opts.immediate || reduced ? "auto" : "smooth" });
}
