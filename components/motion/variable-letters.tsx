"use client";

import { useEffect, useRef } from "react";

import { cn } from "@/lib/utils";

type Props = {
  text: string;
  className?: string;
  /** Element whose pointer movement drives the effect (defaults to the letters' parent). */
  scope?: "parent" | "window";
  /** Resting and excited axis values. */
  rest?: { wdth: number; wght: number };
  peak?: { wdth: number; wght: number };
  /** Influence radius as a fraction of viewport width. */
  radius?: number;
};

/**
 * Letters that swell on Mona Sans' wdth/wght axes as the pointer nears them.
 * Rendered as plain text for assistive tech (`aria-label`), spans are decorative.
 * Fine pointers only; static at rest values otherwise.
 */
export function VariableLetters({
  text,
  className,
  scope = "parent",
  rest = { wdth: 112, wght: 760 },
  peak = { wdth: 125, wght: 900 },
  radius = 0.22,
}: Props) {
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const letters = Array.from(el.querySelectorAll<HTMLSpanElement>("[data-letter]"));
    const values = letters.map(() => 0);
    const targetEl: HTMLElement | Window = scope === "window" ? window : (el.parentElement ?? el);
    let px = -1e5;
    let py = -1e5;
    let raf = 0;
    let running = false;

    const step = () => {
      raf = 0;
      const r = radius * window.innerWidth;
      let moving = false;
      letters.forEach((letter, i) => {
        const b = letter.getBoundingClientRect();
        const dx = px - (b.left + b.width / 2);
        const dy = (py - (b.top + b.height / 2)) * 0.6;
        const d = Math.sqrt(dx * dx + dy * dy);
        const target = Math.max(0, 1 - d / r);
        const eased = target * target * (3 - 2 * target);
        values[i] += (eased - values[i]) * 0.14;
        if (Math.abs(eased - values[i]) > 0.002) moving = true;
        const v = values[i];
        letter.style.fontVariationSettings = `"wdth" ${(rest.wdth + (peak.wdth - rest.wdth) * v).toFixed(1)}, "wght" ${Math.round(rest.wght + (peak.wght - rest.wght) * v)}`;
      });
      if (moving) raf = requestAnimationFrame(step);
      else running = false;
    };
    const kick = () => {
      if (!running) {
        running = true;
        raf = requestAnimationFrame(step);
      }
    };
    const onMove = (e: Event) => {
      const p = e as PointerEvent;
      px = p.clientX;
      py = p.clientY;
      kick();
    };
    const onLeave = () => {
      px = -1e5;
      py = -1e5;
      kick();
    };

    targetEl.addEventListener("pointermove", onMove, { passive: true });
    targetEl.addEventListener("pointerleave", onLeave);
    return () => {
      cancelAnimationFrame(raf);
      targetEl.removeEventListener("pointermove", onMove);
      targetEl.removeEventListener("pointerleave", onLeave);
    };
  }, [scope, radius, rest.wdth, rest.wght, peak.wdth, peak.wght]);

  return (
    <span ref={ref} className={cn("relative", className)}>
      <span className="sr-only">{text}</span>
      {Array.from(text).map((ch, i) => (
        <span key={i} data-letter aria-hidden="true" className="inline-block">
          {ch === " " ? " " : ch}
        </span>
      ))}
    </span>
  );
}
