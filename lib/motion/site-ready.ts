"use client";

/**
 * One-shot "the curtain is up" signal. The preloader calls `markSiteReady()` when it
 * starts lifting; the hero waits on `onSiteReady()` to begin its entrance. If no
 * preloader runs (reduced motion, client navigation), subscribers fire immediately.
 */
let ready = false;
const waiting = new Set<() => void>();

export function markSiteReady() {
  if (ready) return;
  ready = true;
  document.documentElement.dataset.ready = "true";
  for (const cb of waiting) cb();
  waiting.clear();
}

export function isSiteReady(): boolean {
  if (ready) return true;
  // No overlay in the document → nothing to wait for.
  if (typeof document !== "undefined" && !document.querySelector("[data-preloader]")) {
    ready = true;
  }
  return ready;
}

export function onSiteReady(cb: () => void): () => void {
  if (isSiteReady()) {
    cb();
    return () => {};
  }
  waiting.add(cb);
  return () => {
    waiting.delete(cb);
  };
}
