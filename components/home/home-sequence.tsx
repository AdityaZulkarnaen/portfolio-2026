"use client";

import { type ReactNode, useRef } from "react";

import { stageBridge } from "@/gl/bridge";
import { gsap, ScrollTrigger, useGSAP } from "@/lib/motion/gsap";
import { resetSequenceState, setSequenceState } from "@/lib/motion/home-sequence";
import { useMotionAllowed } from "@/lib/motion/motion-prefs";

/**
 * Home scroll sequence: hero → reel zoom → featured works.
 *
 * The hero is pinned for A + B + C viewport heights:
 *   A  the reel window grows from its slot to the full viewport (radius → 0); the HUD,
 *      ring, type and CTA fall away.
 *   B  hold: the reel keeps cycling fullscreen with its slate bottom left.
 *   C  the frame shrinks into the lead card's live rect while the featured section
 *      (pulled up under the pin by −C) scrolls in; the reel parks on slide 0, which is
 *      the lead project, then the frame fades over the identical card underneath.
 * The grid cards hold still and only develop (the GL wave) as they scroll in.
 *
 * One scroll function writes every inline style and the stage's window rect from the same
 * numbers (no per-frame layout reads: rects are measured on ScrollTrigger refresh). Without
 * motion nothing here runs and the page is the hero followed by the settled grid.
 */

type Rect = { x: number; y: number; w: number; h: number };

const RADIUS = 14;
/** The held reel: just under the header pills, 56px clear above the viewport bottom. */
const HOLD_TOP = 63;
const HOLD_BOTTOM = 56;
const HOLD_RADIUS = 10;

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
const range = (v: number, a: number, b: number) => clamp01((v - a) / (b - a));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const lerpRect = (a: Rect, b: Rect, t: number): Rect => ({ x: lerp(a.x, b.x, t), y: lerp(a.y, b.y, t), w: lerp(a.w, b.w, t), h: lerp(a.h, b.h, t) });
const inOut = gsap.parseEase("power3.inOut");
const out = gsap.parseEase("power2.out");
const landEase = gsap.parseEase("power3.out");

/**
 * The held reel frame: under the header pills, HOLD_BOTTOM clear of the bottom, ~82vw
 * wide and centred. Portrait screens: full content width, a band no taller than ~1.25x
 * its width, centred in the same space, so a landscape cover isn't cropped to a sliver.
 */
function holdRect(vw: number, vh: number): Rect {
  const space = vh - HOLD_TOP - HOLD_BOTTOM;
  if (vh / vw > 1.2) {
    const w = vw - 32;
    const h = Math.min(space, w * 1.25);
    return { x: 16, y: HOLD_TOP + (space - h) / 2, w, h };
  }
  const w = Math.min(vw * 0.82, space * 2.4);
  return { x: (vw - w) / 2, y: HOLD_TOP, w, h: space };
}

export function HomeSequence({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const motion = useMotionAllowed();

  useGSAP(
    () => {
      const root = ref.current;
      if (!root || !motion || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      const hero = root.querySelector<HTMLElement>("[data-gl-hero]");
      const work = root.querySelector<HTMLElement>("[data-work]");
      const slot = hero?.querySelector<HTMLElement>("[data-seq-slot]");
      const win = hero?.querySelector<HTMLElement>("[data-hero-window]");
      const lead = work?.querySelector<HTMLElement>("[data-work-lead]");
      if (!hero || !work || !slot || !win || !lead) return;

      const outs = [...hero.querySelectorAll<HTMLElement>("[data-seq-out]")];
      const ring = hero.querySelector<HTMLElement>("[data-seq-ring]");
      const slate = hero.querySelector<HTMLElement>("[data-seq-slate]");
      const room = hero.querySelector<HTMLElement>("[data-seq-room]");
      const row = hero.querySelector<HTMLElement>("[data-seq-row]");
      const head = work.querySelector<HTMLElement>("[data-work-head]");
      const poses = [...work.querySelectorAll<HTMLElement>("[data-pose]")].filter((el) => el.dataset.pose !== "0");

      const touch = window.matchMedia("(pointer: coarse)").matches || window.innerWidth < 768;
      // Lengths in viewport heights. The hold (B) is long on purpose: a small flick of the
      // wheel while the reel is fullscreen should linger on it, not throw the page onward.
      const A = touch ? 0.75 : 1.1;
      const B = touch ? 0.7 : 1.4;
      const C = touch ? 0.6 : 0.85;
      const T = A + B + C;
      const pA = A / T;
      const pB = (A + B) / T;

      // Measured on every refresh (pins reverted, no transforms on what we read).
      let vw = window.innerWidth;
      let vh = window.innerHeight;
      let slotRel: Rect = { x: 0, y: 0, w: 1, h: 1 };
      let leadDoc: Rect = { x: 0, y: 0, w: 1, h: 1 };

      // Pull the section up a full viewport: at the pin's end its top sits at the top of
      // the viewport, so heading, metrics and the lead card land composed together.
      const setOverlap = () => {
        work.style.marginTop = `${-Math.round(window.innerHeight)}px`;
      };
      setOverlap();
      ScrollTrigger.addEventListener("refreshInit", setOverlap);

      const measure = () => {
        vw = window.innerWidth;
        vh = window.innerHeight;
        const h = hero.getBoundingClientRect();
        const s = slot.getBoundingClientRect();
        slotRel = { x: s.left - h.left, y: s.top - h.top, w: s.width, h: s.height };
        const l = lead.getBoundingClientRect();
        leadDoc = { x: l.left, y: l.top + window.scrollY, w: l.width, h: l.height };
      };

      let lastRoomGl: boolean | null = null;
      // No prints are tossed in from the edges any more (they landed over settled cards):
      // every card scatters locally and develops as it scrolls in, like the rest of the grid.
      const near = 0;
      const pulledEls = poses.slice(0, near);

      const render = (self: ScrollTrigger) => {
        const p = self.progress;
        const scroll = self.scroll();
        const a = range(p, 0, pA);
        const c = range(p, pB, 1);
        // Hero box in the viewport: pinned at 0, then pushed down by the spacer.
        const heroTop = scroll <= self.end ? 0 : self.end - scroll;
        const slotV: Rect = { ...slotRel, y: slotRel.y + heroTop };
        const full = holdRect(vw, vh);

        let rect: Rect;
        let radius: number;
        if (c > 0) {
          const target: Rect = { ...leadDoc, y: leadDoc.y - scroll };
          // Front-loaded: the frame clears the top of the viewport early, so the heading
          // can arrive above it rather than under it.
          const k = landEase(c);
          rect = lerpRect(full, target, k);
          radius = lerp(HOLD_RADIUS, RADIUS, k);
        } else {
          const k = inOut(a);
          rect = lerpRect(slotV, full, k);
          radius = lerp(RADIUS, HOLD_RADIUS, k);
        }
        const frameOpacity = 1 - range(c, 0.9, 1);

        // DOM window inside its slot (same numbers the stage gets).
        win.style.inset = "auto";
        win.style.left = `${rect.x - slotV.x}px`;
        win.style.top = `${rect.y - slotV.y}px`;
        win.style.width = `${rect.w}px`;
        win.style.height = `${rect.h}px`;
        win.style.setProperty("--win-r", `${radius}px`);
        win.style.opacity = String(frameOpacity);
        win.style.pointerEvents = p > 0.02 ? "none" : "";
        stageBridge.setHeroWindowRect({ x: rect.x, y: rect.y, w: rect.w, h: rect.h, radius, opacity: frameOpacity });
        stageBridge.setScrollProgress(out(c));

        // Hero furniture falls away in A.
        const fade = 1 - out(range(a, 0, 0.55));
        for (const el of outs) {
          el.style.opacity = String(fade);
          el.style.translate = `0 ${(-24 * (1 - fade)).toFixed(2)}px`;
          el.style.visibility = fade < 0.01 ? "hidden" : "";
        }
        if (ring) {
          const r = range(a, 0, 0.75);
          ring.style.opacity = String(1 - r);
          ring.style.scale = String(1 + out(r) * 0.9);
        }
        if (row) row.style.zIndex = "20";
        hero.style.pointerEvents = p > pA ? "none" : "";

        // Slate: in at the end of A, through B, out early in C.
        if (slate) {
          const s = range(a, 0.8, 1) * (1 - range(c, 0, 0.15));
          slate.style.opacity = String(s);
          slate.style.visibility = s > 0.01 ? "visible" : "hidden";
          // In the band under the held frame, aligned to its left edge.
          slate.style.left = `${full.x}px`;
          slate.style.bottom = `${Math.max(8, (HOLD_BOTTOM - 22) / 2)}px`;
        }

        // T0 room (no GL): fade so the cards show. Under GL the CSS rule hides it; never
        // write an inline opacity there or it would cover the canvas.
        if (room) {
          const glOn = document.documentElement.dataset.gl === "on";
          if (glOn) {
            if (lastRoomGl !== true) room.style.opacity = "";
          } else {
            // Only write while actually fading: a leftover inline "1" would beat the GL rule
            // (opacity 0) if GL comes on before the next scroll render, covering the canvas.
            const o = 1 - range(c, 0, 0.5);
            room.style.opacity = o >= 1 ? "" : String(o);
          }
          lastRoomGl = glOn;
        }

        // Featured head + lead card hand-off.
        if (head) {
          const h = out(range(c, 0.35, 0.8));
          head.style.opacity = String(h);
          head.style.translate = `0 ${(16 * (1 - h)).toFixed(2)}px`;
        }
        lead.style.opacity = String(range(c, 0.8, 0.9));
        // Cards pulled into the viewport stay out of the zoom-in and the hold.
        const pulledIn = String(range(c, 0, 0.3));
        for (const el of pulledEls) el.style.opacity = pulledIn;

        setSequenceState({ active: true, phase: c > 0.001 ? "out" : "in" });
      };

      const pin = ScrollTrigger.create({
        trigger: hero,
        pin: hero,
        start: "top top",
        end: () => `+=${Math.round(T * window.innerHeight)}`,
        pinSpacing: true,
        anticipatePin: 1,
        invalidateOnRefresh: true,
        onRefresh: (self) => {
          measure();
          render(self);
        },
        onUpdate: render,
      });
      measure();
      render(pin);

      // The grid holds still: every card sits in its place from the start and only develops
      // (dark ink → picture, the GL wave) as it scrolls in, and goes dark again going back.
      const devTriggers = poses.map((el) => {
        const caption = el.querySelector<HTMLElement>("[data-pose-caption]");
        const frame = el.querySelector<HTMLElement>("[data-frame]");
        // Develop (0 = dark ink, 1 = picture): the GL wave reads it from the frame
        // (gl/plane.ts), the DOM mask reads the same CSS variable. The caption follows.
        const develop = (d: number) => {
          frame?.style.setProperty("--dev", d.toFixed(4));
          if (caption) caption.style.opacity = String(range(d, 0.7, 1));
        };
        develop(0);
        el.dataset.settled = "";
        return ScrollTrigger.create({
          trigger: el.parentElement ?? el,
          start: "top 88%",
          end: "top 35%",
          onUpdate: (self) => develop(self.progress),
          onRefresh: (self) => develop(self.progress),
        });
      });

      setSequenceState({ active: true });

      return () => {
        ScrollTrigger.removeEventListener("refreshInit", setOverlap);
        for (const t of devTriggers) t.kill();
        pin.kill(true);
        work.style.marginTop = "";
        for (const prop of ["inset", "left", "top", "width", "height", "opacity", "pointerEvents"] as const) win.style[prop] = "";
        win.style.removeProperty("--win-r");
        for (const el of outs) {
          el.style.opacity = "";
          el.style.translate = "";
          el.style.visibility = "";
        }
        if (ring) {
          ring.style.opacity = "";
          ring.style.scale = "";
        }
        if (slate) {
          slate.style.opacity = "";
          slate.style.visibility = "";
          slate.style.left = "";
          slate.style.bottom = "";
        }
        if (room) room.style.opacity = "";
        if (row) row.style.zIndex = "";
        if (head) {
          head.style.opacity = "";
          head.style.translate = "";
        }
        hero.style.pointerEvents = "";
        lead.style.opacity = "";
        for (const el of poses) {
          el.dataset.settled = "";
          el.style.zIndex = "";
          el.style.opacity = "";
          const caption = el.querySelector<HTMLElement>("[data-pose-caption]");
          if (caption) caption.style.opacity = "";
          const fr = el.querySelector<HTMLElement>("[data-frame]");
          fr?.style.removeProperty("--dev");
          if (fr) fr.style.boxShadow = "";
        }
        stageBridge.setHeroWindowRect(null);
        resetSequenceState();
        requestAnimationFrame(() => {
          ScrollTrigger.refresh();
          stageBridge.remeasure();
        });
      };
    },
    { scope: ref, dependencies: [motion], revertOnUpdate: true },
  );

  return (
    <div ref={ref} className="relative">
      {children}
    </div>
  );
}
