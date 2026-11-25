"use client";

import { useRef, type ReactNode } from "react";

import { gsap, ScrollTrigger, useGSAP } from "@/lib/motion/gsap";
import { useMotionAllowed } from "@/lib/motion/motion-prefs";

const STACK = "(min-width: 1024px)";
const TICK_MONTHS = 14;

const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);

function stamp(months: number) {
  const y = Math.floor(months / 12);
  return `${String((months % 12) + 1).padStart(2, "0")}.${y}`;
}

/**
 * Desktop: the reels hold under the header and stack. Each card is translated to stay put
 * (root position read live, once per frame, so pins refreshing above can't skew it;
 * no pin, no spacer, so the page layout never changes) and is a `[data-pose]`, so its GL
 * planes follow the same transform. The card underneath scales back, darkens, and is clipped
 * to the strip still showing, so the transparent GL windows of the card on top never sit
 * over its panel; its frames that are fully covered go to opacity 0, which hides their
 * planes. Small screens: each print just develops as it scrolls in.
 */
export function ReelStack({ children, className }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLOListElement>(null);
  const allowed = useMotionAllowed();

  useGSAP(
    () => {
      const root = ref.current;
      if (!root || !allowed) return;
      const mm = gsap.matchMedia();

      mm.add(STACK, () => {
        const slots = gsap.utils.toArray<HTMLElement>("[data-reel-slot]", root);
        const cards = slots.map((s) => s.querySelector<HTMLElement>("[data-reel]")!);
        const dims = cards.map((c) => c.querySelector<HTMLElement>("[data-reel-dim]"));
        const frames = cards.map((c) => [...c.querySelectorAll<HTMLElement>("[data-reel-frame]")]);
        const imgs = cards.map((c) => [...c.querySelectorAll<HTMLElement>("[data-reel-img]")]);
        const ticks = cards.map((c) =>
          [...c.querySelectorAll<HTMLElement>("[data-tick]")].map((el) => {
            const [y, m] = (el.dataset.tick ?? "").split("-").map(Number);
            return { el, target: y * 12 + m - 1, shown: -1 };
          }),
        );
        const setY = cards.map((c) => gsap.quickSetter(c, "y", "px"));
        const setS = cards.map((c) => gsap.quickSetter(c, "scale"));
        const imgY = imgs.map((list) => list.map((img) => gsap.quickSetter(img, "y", "px")));
        const phones = cards.map((c) => c.querySelector<HTMLElement>("[data-reel-phone]"));
        const phoneY = phones.map((el) => (el ? gsap.quickSetter(el, "y", "px") : null));
        gsap.set(cards, { transformOrigin: "50% 50%" });
        gsap.set(imgs.flat(), { scale: 1.12 });

        const n = cards.length;
        let offsets: number[] = [];
        let docTop: number[] = [];
        let stick: number[] = [];
        let h = 0;
        let step = 0;
        let hold = 0;
        const clips: string[] = cards.map(() => "");
        let boxes: { top: number; h: number; clip: string }[][] = [];

        const measure = () => {
          const rem = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
          step = 0.875 * rem;
          offsets = slots.map((s) => s.offsetTop);
          stick = slots.map((_, i) => 5.5 * rem + i * step);
          h = slots[0]?.offsetHeight ?? 0;
          boxes = frames.map((list, i) =>
            list.map((f) => {
              let top = 0;
              for (let el: HTMLElement | null = f; el && el !== cards[i]; el = el.offsetParent as HTMLElement | null) top += el.offsetTop;
              return { top, h: f.offsetHeight, clip: "" };
            }),
          );
        };

        const render = () => {
          if (h === 0) return;
          const sy = window.scrollY;
          const base = root.getBoundingClientRect().top + sy;
          docTop = offsets.map((o) => base + o);
          hold = docTop[n - 1] - stick[n - 1];
          const vh = window.innerHeight;
          const s = Math.min(sy, hold);
          const ys = docTop.map((top, i) => Math.max(0, s + stick[i] - top));
          const tops = docTop.map((top, i) => top + ys[i] - sy);
          const cover = tops.map((top, i) => (i < n - 1 ? clamp01((top + h - tops[i + 1]) / (h - step)) : 0));
          for (let i = 0; i < n; i++) {
            let later = 0;
            for (let j = i + 1; j < n; j++) later += cover[j];
            const d = Math.min(1.6, cover[i] + later * 0.5);
            const scale = 1 - 0.08 * Math.min(d, 1) - 0.04 * Math.max(0, d - 1);
            setY[i](ys[i] - (h * (1 - scale)) / 2);
            setS[i](scale);
            const dim = dims[i];
            if (dim) dim.style.opacity = (Math.min(1, d) * 0.62).toFixed(3);

            const visible = i < n - 1 ? Math.max(0, (tops[i + 1] - tops[i]) / scale) : h;
            const clip = visible < h ? `inset(0px 0px ${Math.ceil(h - visible)}px 0px)` : "";
            if (clip !== clips[i]) {
              clips[i] = clip;
              cards[i].style.clipPath = clip;
            }
            boxes[i]?.forEach((b, k) => {
              const hidden = b.top >= visible - 2 ? "0" : "";
              if (hidden !== b.clip) {
                b.clip = hidden;
                frames[i][k].style.opacity = hidden;
              }
            });

            const arrive = clamp01((vh - (docTop[i] - sy)) / Math.max(1, vh - stick[i]));
            frames[i].forEach((f, k) => f.style.setProperty("--dev", clamp01(arrive * 1.3 - k * 0.14).toFixed(4)));
            const drift = h * 0.035;
            imgY[i].forEach((set) => set((1 - arrive) * drift - Math.min(1, d) * drift));
            phoneY[i]?.((1 - arrive) * drift * 3.2 - Math.min(1, d) * drift * 1.6);
            const back = Math.round((1 - arrive) * TICK_MONTHS);
            for (const t of ticks[i]) {
              const v = t.target - back;
              if (v !== t.shown) {
                t.shown = v;
                t.el.textContent = stamp(v);
              }
            }
          }
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
          gsap.set([...cards, ...imgs.flat(), ...phones.filter((p) => p !== null)], { clearProps: "transform,transformOrigin,clipPath" });
          frames.flat().forEach((f) => f.style.removeProperty("opacity"));
          dims.forEach((d) => d?.style.removeProperty("opacity"));
          frames.flat().forEach((f) => f.style.removeProperty("--dev"));
          ticks.flat().forEach((t) => (t.el.textContent = stamp(t.target)));
        };
      });

      mm.add(`not all and ${STACK}`, () => {
        const triggers = gsap.utils.toArray<HTMLElement>("[data-reel-frame]", root).map((frame) => {
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
    { scope: ref, dependencies: [allowed], revertOnUpdate: true },
  );

  return (
    <ol ref={ref} className={`relative ${className ?? ""}`}>
      {children}
    </ol>
  );
}
