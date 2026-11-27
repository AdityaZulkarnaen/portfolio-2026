"use client";

import { useRef, type CSSProperties, type ReactNode } from "react";

import { gsap, ScrollTrigger, useGSAP } from "@/lib/motion/gsap";
import { useMotionAllowed } from "@/lib/motion/motion-prefs";

const WALL = "(min-width: 1024px)";
const SPEED = [0.03, -0.025, 0.035, -0.03, 0.02, -0.035];
const DEPTH = [1, 0.93, 0.97, 0.91, 0.99, 0.94];

const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);
const ease = (v: number) => v * v * (3 - 2 * v);

/**
 * Desktop: the wall holds for its run and the strip moves sideways. Nothing is pinned:
 * the run is reserved in CSS (`--run`, only with motion on) and the strip and its chrome
 * are translated down to stay put, so the page never changes height. Each card is a
 * `[data-pose]` (its GL plane follows), drifts at its own speed about the centre, sits at
 * its own depth, and comes forward a little as it reaches the middle.
 * Small screens / motion off: a native snap strip; the counter and the progress line
 * follow its scroll.
 */
export function TrophyWall({ count, children }: { count: number; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const allowed = useMotionAllowed();

  useGSAP(
    () => {
      const root = ref.current;
      if (!root || !allowed) return;
      const stage = root.querySelector<HTMLElement>("[data-wall-stage]")!;
      const track = root.querySelector<HTMLElement>("[data-wall-track]")!;
      const chrome = gsap.utils.toArray<HTMLElement>("[data-wall-chrome]", root);
      const bar = root.querySelector<HTMLElement>("[data-wall-fill]")!;
      const counter = root.querySelector<HTMLElement>("[data-wall-count]")!;
      const cards = gsap.utils.toArray<HTMLElement>("[data-trophy]", root);
      const frames = cards.map((c) => c.querySelector<HTMLElement>("[data-trophy-frame]"));
      const total = String(cards.length).padStart(2, "0");
      let shown = -1;

      const paint = (focus: number[], progress: number) => {
        let best = 0;
        focus.forEach((f, i) => {
          if (f > focus[best]) best = i;
        });
        bar.style.transform = `scaleX(${progress.toFixed(4)})`;
        if (best !== shown) {
          shown = best;
          counter.textContent = `${String(best + 1).padStart(2, "0")} / ${total}`;
        }
      };

      const mm = gsap.matchMedia();

      mm.add(WALL, () => {
        const setX = cards.map((c) => gsap.quickSetter(c, "x", "px"));
        const setY = cards.map((c) => gsap.quickSetter(c, "y", "px"));
        const setS = cards.map((c) => gsap.quickSetter(c, "scale"));
        const chromeY = chrome.map((c) => gsap.quickSetter(c, "y", "px"));
        let top = 0;
        let run = 0;
        let reach = 0;
        let vw = 0;
        let left: number[] = [];
        let width: number[] = [];

        const measure = () => {
          vw = document.documentElement.clientWidth;
          run = Math.max(0, root.offsetHeight - stage.offsetHeight);
          const hosts = cards.map((c) => c.parentElement!);
          left = hosts.map((h) => h.getBoundingClientRect().left + window.scrollX);
          width = hosts.map((h) => h.offsetWidth);
          const pad = parseFloat(getComputedStyle(track).paddingRight) || 0;
          const last = cards.length - 1;
          reach = Math.max(0, left[last] + width[last] + pad - vw);
        };

        const render = () => {
          top = root.getBoundingClientRect().top + window.scrollY;
          const hold = Math.min(run, Math.max(0, window.scrollY - top));
          const p = run > 0 ? hold / run : 0;
          const shift = p * reach;
          const focus = cards.map((_, i) => {
            const off = left[i] + width[i] / 2 - shift - vw / 2;
            const f = 1 - clamp01(Math.abs(off) / (vw * 0.42));
            setX[i](-shift + off * SPEED[i % SPEED.length]);
            setY[i](hold);
            setS[i](DEPTH[i % DEPTH.length] + 0.04 * ease(f));
            // Develops from entering at the right edge until its left edge is ~20% in from the
            // left, or by the end of the run for the last cards, which never get that far.
            const span = Math.max(vw * 0.25, Math.min(vw * 0.8, vw - (left[i] - reach) - vw * 0.04));
            frames[i]?.style.setProperty("--dev", clamp01((vw - (left[i] - shift)) / span).toFixed(4));
            return f;
          });
          chromeY.forEach((set) => set(hold));
          paint(focus, p);
        };

        const st = ScrollTrigger.create({
          trigger: root,
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

        return () => {
          st.kill();
          gsap.set([...cards, ...chrome], { clearProps: "transform" });
          frames.forEach((f) => f?.style.removeProperty("--dev"));
        };
      });

      mm.add(`not all and ${WALL}`, () => {
        const update = () => {
          const vw = document.documentElement.clientWidth;
          const focus = cards.map((c) => {
            const r = c.getBoundingClientRect();
            return 1 - clamp01(Math.abs(r.left + r.width / 2 - vw / 2) / (vw * 0.5));
          });
          const max = track.scrollWidth - track.clientWidth;
          paint(focus, max > 0 ? track.scrollLeft / max : 0);
        };
        update();
        track.addEventListener("scroll", update, { passive: true });
        window.addEventListener("resize", update);
        return () => {
          track.removeEventListener("scroll", update);
          window.removeEventListener("resize", update);
        };
      });

      return () => {
        mm.revert();
        bar.style.removeProperty("transform");
        counter.textContent = `01 / ${total}`;
      };
    },
    { scope: ref, dependencies: [allowed], revertOnUpdate: true },
  );

  const total = String(count).padStart(2, "0");
  return (
    <div
      ref={ref}
      className="overflow-x-clip lg:motion-on:h-[calc(100svh+var(--run))]"
      style={{ "--run": `${count * 26}vw` } as CSSProperties}
    >
      <div data-wall-stage className="lg:motion-on:flex lg:motion-on:h-svh lg:motion-on:flex-col lg:motion-on:pt-[5.5rem] lg:motion-on:pb-[clamp(1rem,3svh,2rem)]">
        <div data-wall-chrome className="slate mb-4 flex justify-between gap-4 px-gutter text-bone-400 tabular-nums">
          <span>Trophy wall</span>
          <span data-wall-count className="text-bone-100">
            01 / {total}
          </span>
        </div>
        <ol
          data-wall-track
          className="flex snap-x snap-mandatory scroll-px-gutter gap-3 overflow-x-auto px-gutter pb-2 [scrollbar-width:none] lg:gap-[3.5vw] lg:motion-on:min-h-0 lg:motion-on:flex-1 lg:motion-on:snap-none lg:motion-on:overflow-visible lg:motion-on:pb-0"
        >
          {children}
        </ol>
        <div data-wall-chrome className="mt-5 px-gutter">
          <div aria-hidden="true" className="relative h-px bg-line-strong">
            <span
              data-wall-fill
              className="absolute inset-0 origin-left scale-x-0 bg-bone-100 motion-off:scale-x-100"
            />
            <span className="absolute top-1/2 left-0 size-[5px] -translate-1/2 rounded-full bg-bone-100" />
            <span className="absolute top-1/2 right-0 size-[5px] translate-x-1/2 -translate-y-1/2 rounded-full bg-bone-100" />
          </div>
        </div>
      </div>
    </div>
  );
}
