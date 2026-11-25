"use client";

import { useEffect, useRef, useSyncExternalStore } from "react";

import { gsap } from "@/lib/motion/gsap";

const LABELS: Record<string, string> = {
  view: "View",
  play: "Play",
  pause: "Pause",
  open: "Open",
  drag: "Drag",
  next: "Next",
};

const FINE = "(hover: hover) and (pointer: fine)";

function subscribeFine(cb: () => void) {
  const mql = window.matchMedia(FINE);
  mql.addEventListener("change", cb);
  return () => mql.removeEventListener("change", cb);
}

/**
 * Contextual cursor for fine pointers. Event delegation on `[data-cursor]` (view | play |
 * pause | open | drag | next; `data-cursor-label` overrides the text). The native cursor
 * stays visible: this is a companion, never a replacement, so nothing is lost if it lags.
 */
export function Cursor() {
  const fine = useSyncExternalStore(
    subscribeFine,
    () => window.matchMedia(FINE).matches,
    () => false,
  );
  const ref = useRef<HTMLDivElement>(null);
  const labelRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const el = ref.current;
    const label = labelRef.current;
    if (!fine || !el || !label) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const dur = reduced ? 0 : 0.5;
    const xTo = gsap.quickTo(el, "x", { duration: dur, ease: "expo" });
    const yTo = gsap.quickTo(el, "y", { duration: dur, ease: "expo" });
    let active: Element | null = null;

    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      el.dataset.visible = "true";
      xTo(e.clientX);
      yTo(e.clientY);
      const target = (e.target as Element | null)?.closest?.("[data-cursor]") ?? null;
      if (target === active) return;
      active = target;
      if (target) {
        const kind = target.getAttribute("data-cursor") ?? "view";
        label.textContent = target.getAttribute("data-cursor-label") ?? LABELS[kind] ?? kind;
        el.dataset.kind = kind;
      } else {
        delete el.dataset.kind;
      }
    };
    const onLeave = () => {
      el.dataset.visible = "false";
    };
    const onDown = () => el.classList.add("is-down");
    const onUp = () => el.classList.remove("is-down");

    window.addEventListener("pointermove", onMove, { passive: true });
    document.documentElement.addEventListener("pointerleave", onLeave);
    window.addEventListener("pointerdown", onDown, { passive: true });
    window.addEventListener("pointerup", onUp, { passive: true });
    return () => {
      window.removeEventListener("pointermove", onMove);
      document.documentElement.removeEventListener("pointerleave", onLeave);
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointerup", onUp);
    };
  }, [fine]);

  if (!fine) return null;

  return (
    <div
      ref={ref}
      data-visible="false"
      aria-hidden="true"
      className="group pointer-events-none fixed top-0 left-0 z-[150] transition-opacity duration-(--dur-fast) data-[visible=false]:opacity-0"
    >
      <span className="absolute -top-[5px] -left-[5px] size-2.5 rounded-full bg-ember-500 transition-transform duration-500 ease-out-expo group-data-[kind]:scale-0 group-[.is-down]:scale-60" />
      <span
        ref={labelRef}
        className="slate absolute -top-[46px] -left-[46px] grid size-[92px] scale-0 place-items-center rounded-full bg-bone-100 font-semibold text-ink-950 transition-transform duration-[550ms] ease-out-expo group-data-[kind]:scale-100 group-data-[kind=pause]:bg-ember-500 group-data-[kind=play]:bg-ember-500 group-[.is-down]:group-data-[kind]:scale-90"
      />
    </div>
  );
}
