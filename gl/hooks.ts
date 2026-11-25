"use client";

import { type RefObject, useLayoutEffect, useRef } from "react";

import { ScrollTrigger } from "@/lib/motion/gsap";

import { stageBridge } from "./bridge";
import type { HeroSource, StageMode } from "./types";

/**
 * React glue for the stage. Every registration lives in a layout effect with a cleanup,
 * so a page hidden by <Activity> releases synchronously and re-registers when shown.
 * Nothing here imports three.js.
 */

export function useStage() {
  return stageBridge;
}

export function useStageMode(mode: StageMode, enabled = true) {
  useLayoutEffect(() => {
    if (!enabled) return;
    return stageBridge.pushMode(mode);
  }, [mode, enabled]);
}

/**
 * Feeds the hero projector's DOM stills to the stage: `[data-slide="i"] img` inside
 * `rootRef`, the current slide index, hero click pulses and the hero scroll-out progress.
 * `key` changes when the slide set changes.
 */
export function useHeroSource(
  rootRef: RefObject<HTMLElement | null>,
  opts: { index: number; count: number; accents: string[]; key: string },
) {
  const { index, count, key } = opts;
  const accentsKey = opts.accents.join(",");
  const indexRef = useRef(index);

  // Declared first so it runs first when <Activity> shows the page again: the sources
  // are then re-registered at the slide the DOM is on, without a crossfade from slide 0.
  useLayoutEffect(() => {
    indexRef.current = index;
  }, [index]);

  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const images: (HTMLImageElement | null)[] = [];
    for (let i = 0; i < count; i++) images.push(root.querySelector<HTMLImageElement>(`[data-slide="${i}"] img`));
    const source: HeroSource = { kind: "images", images, accents: accentsKey.split(",") };
    stageBridge.setHeroSources(source, indexRef.current);
    const release = stageBridge.pushMode("hero");

    // Click anywhere on the hero (it sits behind the copy) → pulse at the pointer.
    const section = root.closest("section") ?? root;
    const onClick = (e: MouseEvent) => stageBridge.pulse(e.clientX, e.clientY);
    section.addEventListener("click", onClick);

    // Scroll-out: 0 at the top, 1 once the hero has fully left the viewport.
    const st = ScrollTrigger.create({
      trigger: root,
      start: "top top",
      end: "bottom top",
      onUpdate: (self) => stageBridge.setScrollProgress(self.progress),
      onRefresh: (self) => stageBridge.setScrollProgress(self.progress),
    });
    stageBridge.setScrollProgress(st.progress);

    return () => {
      st.kill();
      section.removeEventListener("click", onClick);
      release();
      stageBridge.clearHeroSources(source);
      stageBridge.setScrollProgress(0);
    };
  }, [rootRef, count, accentsKey, key]);

  useLayoutEffect(() => {
    stageBridge.setSlide(index, 0);
  }, [index, key]);
}

/**
 * Ambient tint. With an element: active while it crosses the middle of the viewport
 * (one ScrollTrigger). With null: active until released. Returns the release function.
 */
export function bindStageTint(el: HTMLElement | null, hex: string): () => void {
  const entry = stageBridge.pushTint(hex, el === null);
  if (!el) return () => entry.release();
  const st = ScrollTrigger.create({
    trigger: el,
    start: "top 55%",
    end: "bottom 45%",
    onToggle: (self) => entry.setActive(self.isActive),
    onRefresh: (self) => entry.setActive(self.isActive),
  });
  entry.setActive(st.isActive);
  return () => {
    st.kill();
    entry.release();
  };
}

/** Hook form of `bindStageTint`; `ref` null = page-wide tint while mounted. */
export function useStageTint(ref: RefObject<HTMLElement | null> | null, hex: string) {
  useLayoutEffect(() => bindStageTint(ref ? ref.current : null, hex), [ref, hex]);
}
