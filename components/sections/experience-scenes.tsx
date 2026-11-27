"use client";

import { type CSSProperties, type ReactNode, useRef, useSyncExternalStore } from "react";

import { tenure } from "@/lib/content/format";
import { gsap, ScrollTrigger, useGSAP } from "@/lib/motion/gsap";
import { useMotionAllowed } from "@/lib/motion/motion-prefs";

const SCENES = "(min-width: 1024px)";
/** Scroll per role, in viewport heights (the track's CSS height uses the same number). */
const PER_ROLE = 0.85;

const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);
const SHOWN = "inset(0% 0% 0% 0%)";
const BELOW = "inset(100% 0% 0% 0%)";
const ABOVE = "inset(0% 0% 100% 0%)";

/**
 * Experience as full-screen scenes (desktop, motion on): the stage holds the viewport
 * while the track scrolls past, and each role takes the whole screen in turn. The text of
 * the outgoing role lifts away, the next one rises in, and its pictures are wiped up from
 * the bottom (a frame clip-path inset, which the GL planes follow too).
 *
 * The stage is held by translating it (it is a `[data-pose]`, so its GL planes follow the
 * same transform), never by a CSS pin, so the page layout and plane measurements hold.
 * Small screens and reduced motion: the roles are full-height panels in plain flow whose
 * prints develop as they scroll in.
 */
export function ExperienceScenes({ count, rail, children }: { count: number; rail: ReactNode; children: ReactNode }) {
  const trackRef = useRef<HTMLDivElement>(null);
  const allowed = useMotionAllowed();

  useGSAP(
    () => {
      const track = trackRef.current;
      if (!track || !allowed) return;
      const stage = track.querySelector<HTMLElement>("[data-xp-stage]");
      if (!stage) return;
      const mm = gsap.matchMedia();

      mm.add(SCENES, () => {
        const panels = gsap.utils.toArray<HTMLElement>("[data-xp-panel]", stage);
        const n = panels.length;
        const lines = panels.map((p) => gsap.utils.toArray<HTMLElement>("[data-xp-line]", p));
        const frames = panels.map((p) => gsap.utils.toArray<HTMLElement>("[data-reel-frame]", p));
        const imgs = panels.map((p) => gsap.utils.toArray<HTMLElement>("[data-reel-img]", p));
        const bars = gsap.utils.toArray<HTMLElement>("[data-xp-bar]", stage);
        const labels = gsap.utils.toArray<HTMLElement>("[data-xp-label]", stage);

        // Role i owns [i, i + 1] of the timeline; the hand-over runs across each boundary.
        const tl = gsap.timeline({ paused: true, defaults: { ease: "power3.inOut" } });
        tl.set({}, {}, n);
        gsap.set(panels, { visibility: (i: number) => (i === 0 ? "visible" : "hidden") });
        gsap.set(labels, { opacity: (i: number) => (i === 0 ? 1 : 0.4) });
        gsap.set(bars, { scaleX: 0, transformOrigin: "0% 50%" });

        for (let i = 0; i < n; i++) {
          if (bars[i]) tl.fromTo(bars[i], { scaleX: 0 }, { scaleX: 1, ease: "none", duration: 1, immediateRender: false }, i);
          if (i === n - 1) break;
          const at = i + 1;
          // Out: text lifts and fades, pictures are wiped up and away.
          tl.to(lines[i], { yPercent: -40, opacity: 0, duration: 0.26, stagger: 0.025, ease: "power2.in" }, at - 0.42);
          tl.to(frames[i], { clipPath: ABOVE, opacity: 0, duration: 0.3, stagger: 0.04, ease: "power3.in" }, at - 0.42);
          tl.set(panels[i], { visibility: "hidden" }, at);
          if (labels[i]) tl.to(labels[i], { opacity: 0.4, duration: 0.2 }, at - 0.1);
          // In: the next role rises, its pictures wipe up from the bottom and settle.
          tl.set(panels[at], { visibility: "visible" }, at - 0.02);
          tl.fromTo(lines[at], { yPercent: 60, opacity: 0 }, { yPercent: 0, opacity: 1, duration: 0.4, stagger: 0.04, ease: "power3.out" }, at);
          tl.fromTo(frames[at], { clipPath: BELOW, opacity: 0 }, { clipPath: SHOWN, opacity: 1, duration: 0.5, stagger: 0.06, ease: "power3.out" }, at - 0.02);
          if (imgs[at].length) tl.fromTo(imgs[at], { scale: 1.18 }, { scale: 1, duration: 0.7, ease: "power3.out" }, at - 0.02);
          if (labels[at]) tl.to(labels[at], { opacity: 1, duration: 0.2 }, at - 0.1);
        }

        let span = 0;
        let lastY = NaN;
        const measure = () => {
          span = Math.max(1, track.offsetHeight - stage.offsetHeight);
        };
        const render = () => {
          // Read live: pins above (the hero) shift this track after it was measured.
          const top = track.getBoundingClientRect().top;
          const y = Math.min(span, Math.max(0, -top));
          if (y !== lastY) {
            lastY = y;
            gsap.set(stage, { y });
          }
          gsap.to(tl, { progress: clamp01(-top / span), duration: 0.45, ease: "power3.out", overwrite: true });
        };

        const st = ScrollTrigger.create({
          trigger: track,
          start: "top bottom",
          end: "bottom top",
          refreshPriority: -1,
          onUpdate: render,
          onRefresh: () => {
            measure();
            render();
          },
        });
        measure();
        render();
        tl.progress(clamp01(-track.getBoundingClientRect().top / span));

        return () => {
          st.kill();
          gsap.killTweensOf(tl);
          tl.kill();
          gsap.set([stage, ...panels, ...lines.flat(), ...frames.flat(), ...imgs.flat(), ...bars, ...labels], {
            clearProps: "transform,visibility,opacity,clipPath",
          });
        };
      });

      // Small screens: each print develops as it scrolls in.
      mm.add(`not all and ${SCENES}`, () => {
        const triggers = gsap.utils.toArray<HTMLElement>("[data-reel-frame]", stage).map((frame) => {
          const develop = (d: number) => frame.style.setProperty("--dev", d.toFixed(4));
          develop(0);
          return ScrollTrigger.create({
            trigger: frame,
            start: "top 92%",
            end: "top 40%",
            refreshPriority: -1,
            onUpdate: (self) => develop(self.progress),
            onRefresh: (self) => develop(self.progress),
          });
        });
        return () => {
          triggers.forEach((t) => {
            (t.trigger as HTMLElement | undefined)?.style.removeProperty("--dev");
            t.kill();
          });
        };
      });

      return () => mm.revert();
    },
    { scope: trackRef, dependencies: [allowed], revertOnUpdate: true },
  );

  return (
    <div
      ref={trackRef}
      className="relative motion-on:lg:h-[calc(100svh+var(--xp-n)*var(--xp-per)*100svh)]"
      style={{ "--xp-n": count, "--xp-per": PER_ROLE } as CSSProperties}
    >
      <div data-xp-stage data-pose className="relative motion-on:lg:h-svh motion-on:lg:overflow-clip">
        {rail}
        <ol className="relative motion-on:lg:h-full">{children}</ol>
      </div>
    </div>
  );
}

const noop = () => () => {};

/**
 * "1 yr 4 mos". A closed role is plain string math; an open-ended one counts up to this
 * month, read on the client only (the prerender must not depend on the clock).
 */
export function Tenure({ start, end }: { start: string; end: string | null }) {
  const today = useSyncExternalStore(
    noop,
    () => {
      const d = new Date();
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    },
    () => null,
  );
  const to = end ?? today;
  return to ? <>{tenure(start, to)}</> : null;
}
