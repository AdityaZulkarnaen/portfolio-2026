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
 * Cards 1–4 start scattered around the frame and settle as they reach their place;
 * the rest scatter locally as they enter.
 *
 * One scroll function writes every inline style and the stage's window rect from the same
 * numbers (no per-frame layout reads: rects are measured on ScrollTrigger refresh). Without
 * motion nothing here runs and the page is the hero followed by the settled grid.
 */

type Rect = { x: number; y: number; w: number; h: number };

const RADIUS = 14;

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
const range = (v: number, a: number, b: number) => clamp01((v - a) / (b - a));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const lerpRect = (a: Rect, b: Rect, t: number): Rect => ({ x: lerp(a.x, b.x, t), y: lerp(a.y, b.y, t), w: lerp(a.w, b.w, t), h: lerp(a.h, b.h, t) });
const inOut = gsap.parseEase("power3.inOut");
const out = gsap.parseEase("power2.out");
const landEase = gsap.parseEase("power3.out");

/** Deterministic 0..1 noise per (card, channel). */
function seeded(i: number, k: number) {
  const s = Math.sin(i * 127.1 + k * 311.7) * 43758.5453;
  return s - Math.floor(s);
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
      const A = touch ? 0.6 : 0.9;
      const B = touch ? 0.25 : 0.45;
      const C = touch ? 0.5 : 0.6;
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
      const near = touch ? 2 : 4;
      const pulledEls = poses.slice(0, near);

      const render = (self: ScrollTrigger) => {
        const p = self.progress;
        const scroll = self.scroll();
        const a = range(p, 0, pA);
        const c = range(p, pB, 1);
        // Hero box in the viewport: pinned at 0, then pushed down by the spacer.
        const heroTop = scroll <= self.end ? 0 : self.end - scroll;
        const slotV: Rect = { ...slotRel, y: slotRel.y + heroTop };
        // Fullscreen; on a portrait screen a centred band instead, so a landscape cover
        // is not cropped to a sliver and magnified.
        const fullH = vh / vw > 1.2 ? Math.min(vh, vw * 1.1) : vh;
        const full: Rect = { x: 0, y: (vh - fullH) / 2, w: vw, h: fullH };

        let rect: Rect;
        let radius: number;
        if (c > 0) {
          const target: Rect = { ...leadDoc, y: leadDoc.y - scroll };
          // Front-loaded: the frame clears the top of the viewport early, so the heading
          // can arrive above it rather than under it.
          const k = landEase(c);
          rect = lerpRect(full, target, k);
          radius = RADIUS * k;
        } else {
          const k = inOut(a);
          rect = lerpRect(slotV, full, k);
          radius = RADIUS * (1 - k);
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
        }

        // T0 room (no GL): fade so the cards show. Under GL the CSS rule hides it; never
        // write an inline opacity there or it would cover the canvas.
        if (room) {
          const glOn = document.documentElement.dataset.gl === "on";
          if (glOn) {
            if (lastRoomGl !== true) room.style.opacity = "";
          } else room.style.opacity = String(1 - range(c, 0, 0.5));
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

      // Scatter → settle. Cards 1..near start tossed around the edges and corners of the
      // viewport during C (behind the lead, captions hidden); later cards scatter locally
      // as they enter. Every card is at identity by the time its top is ~65% down.
      const maxRot = touch ? 4 : 8;
      const leadPose = lead.closest<HTMLElement>("[data-pose]");
      const syncLead = () => {
        // The lead's GL plane would draw under the DOM prints; keep its DOM image (above
        // them, z-10) until every tossed print has settled.
        if (!leadPose) return;
        const all = pulledEls.every((el) => el.dataset.settled !== undefined);
        if (all && leadPose.dataset.settled === undefined) leadPose.dataset.settled = "";
        else if (!all && leadPose.dataset.settled !== undefined) leadPose.removeAttribute("data-settled");
      };
      // Where the tossed prints sit at the landing moment (fractions of the viewport): the
      // bottom corners, beside and below the lead, never above its caption, so on their
      // way into the grid they only travel down and inward, behind the lead.
      const SPOTS = touch
        ? [
            [0.12, 1.1],
            [0.88, 1.16],
          ]
        : [
            [0.04, 0.98],
            [0.96, 0.96],
            [0.1, 1.16],
            [0.9, 1.14],
          ];
      const appliers: (() => void)[] = [];
      const tweens = poses.map((el, j) => {
        const i = j + 1;
        const r = (k: number) => seeded(i, k);
        const rotation = (r(3) * 2 - 1) * maxRot;
        const scale = touch ? 0.62 + r(4) * 0.18 : 0.6 + r(4) * 0.3;
        const pulled = i <= near;
        const spot = SPOTS[(i - 1) % SPOTS.length];
        const spotX = () => vw * (spot[0] + (r(1) - 0.5) * 0.06);
        const spotY = () => vh * (spot[1] + (r(2) - 0.5) * 0.08);
        // Pulled prints ride up with the section through C and are on their spot when the
        // pin ends; they settle from there.
        const landAt = () => pin.end;
        const caption = el.querySelector<HTMLElement>("[data-pose-caption]");

        el.removeAttribute("data-settled");
        // Earlier prints above later ones, all below the lead (z-10): a print still on its
        // way never lands on a caption that has already settled above it.
        el.style.zIndex = String(Math.max(1, 9 - i));
        if (caption) caption.style.opacity = "0";
        // Caption + settled state from the animation's progress. Also run after every
        // refresh: a refresh can re-seat the scrubbed tween without an onUpdate.
        const apply = (t: number) => {
          if (caption) caption.style.opacity = String(range(t, 0.82, 1));
          const settled = t > 0.999;
          if (settled !== (el.dataset.settled !== undefined)) {
            if (settled) el.dataset.settled = "";
            else el.removeAttribute("data-settled");
            if (pulled) syncLead();
          }
        };
        const tween = gsap.fromTo(
          el,
          {
            x: () => {
              if (!pulled) return (r(1) * 2 - 1) * vw * (touch ? 0.06 : 0.14);
              const b = el.getBoundingClientRect();
              return spotX() - (b.left + b.width / 2 - (Number(gsap.getProperty(el, "x")) || 0));
            },
            y: () => {
              if (!pulled) return vh * (touch ? 0.06 : 0.12) * (0.5 + r(2));
              const b = el.getBoundingClientRect();
              const naturalDocY = b.top + window.scrollY - (Number(gsap.getProperty(el, "y")) || 0) + b.height / 2;
              return spotY() - (naturalDocY - landAt());
            },
            rotation,
            scale,
          },
          {
            x: 0,
            y: 0,
            rotation: 0,
            scale: 1,
            ease: "none",
            immediateRender: true,
            // The scrubbed animation's own progress (it lags the scroll): a card counts as
            // settled, and gets its GL plane, only once it really sits at identity.
            onUpdate() {
              apply(this.progress());
            },
            scrollTrigger: {
              // The untransformed link around the pose: the pose itself is translated
              // and would skew the measured start/end.
              trigger: el.parentElement ?? el,
              start: pulled ? () => landAt() : "top bottom",
              end: "top 75%",
              scrub: touch ? 0.3 : 0.5,
              invalidateOnRefresh: true,
            },
          },
        );
        appliers.push(() => apply(tween.progress()));
        return tween;
      });
      syncLead();
      const syncAll = () => {
        for (const fn of appliers) fn();
      };
      ScrollTrigger.addEventListener("refresh", syncAll);

      setSequenceState({ active: true });

      return () => {
        ScrollTrigger.removeEventListener("refreshInit", setOverlap);
        ScrollTrigger.removeEventListener("refresh", syncAll);
        for (const t of tweens) t.scrollTrigger?.kill();
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
        }
        if (leadPose) leadPose.dataset.settled = "";
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
