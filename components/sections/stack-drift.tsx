"use client";

import Image from "next/image";
import { useRef } from "react";

import { gsap, ScrollTrigger, useGSAP } from "@/lib/motion/gsap";
import { useMotionAllowed } from "@/lib/motion/motion-prefs";

export type DriftItem = { id: string; name: string; logo: { src: string; alt: string } | null };
export type DriftGroup = { key: string; label: string; items: DriftItem[] };

/** Deterministic 0..1 noise per (item, channel). */
function seeded(i: number, k: number) {
  const s = Math.sin(i * 127.1 + k * 311.7) * 43758.5453;
  return s - Math.floor(s);
}

const smooth = (a: number, b: number, v: number) => {
  const t = Math.min(1, Math.max(0, (v - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

/**
 * The stack, carried in by the same current as the background smoke: while the section
 * arrives the marks are scattered and drift on a slow flow field, turning as they go; as it
 * settles in view each mark sinks into its place in its category column and the names
 * surface beside them. The pointer parts the marks like it parts the smoke (strongly while
 * they drift, a little once settled). Scroll back and they lift into the current again.
 *
 * The settled layout is the plain DOM layout (no JS, reduced motion: just the list); motion
 * only ever adds a transform on top of it.
 */
export function StackDrift({ groups }: { groups: DriftGroup[] }) {
  const ref = useRef<HTMLDivElement>(null);
  const allowed = useMotionAllowed();

  useGSAP(
    () => {
      const root = ref.current;
      if (!root || !allowed) return;
      const items = gsap.utils.toArray<HTMLElement>("[data-drift]", root);
      const marks = items.map((el) => el.querySelector<HTMLElement>("[data-drift-mark]"));
      const names = items.map((el) => el.querySelector<HTMLElement>("[data-drift-name]"));
      const labels = gsap.utils.toArray<HTMLElement>("[data-drift-label]", root);
      const touch = window.matchMedia("(pointer: coarse)").matches;

      // Home centres (untransformed, relative to the root) and scatter offsets.
      let home: { x: number; y: number }[] = [];
      let scatter: { x: number; y: number }[] = [];
      const measure = () => {
        const r = root.getBoundingClientRect();
        const w = r.width;
        const h = r.height;
        home = items.map((el) => {
          let x = el.offsetWidth * 0.1;
          let y = el.offsetHeight / 2;
          for (let n: HTMLElement | null = el; n && n !== root; n = n.offsetParent as HTMLElement | null) {
            x += n.offsetLeft;
            y += n.offsetTop;
          }
          return { x, y };
        });
        scatter = home.map((p, i) => ({
          x: (seeded(i, 1) * 1.1 - 0.05) * w - p.x,
          y: (seeded(i, 2) * 1.5 - 0.35) * h - p.y,
        }));
      };

      const push = items.map(() => ({ x: 0, y: 0 }));
      const spin = items.map((_, i) => (seeded(i, 3) * 2 - 1) * 160);
      const pointer = { x: -1e4, y: -1e4, on: false };
      let target = 0;
      let shown = 0;
      let running = false;

      const onMove = (e: PointerEvent) => {
        if (e.pointerType === "touch") return;
        pointer.x = e.clientX;
        pointer.y = e.clientY;
        pointer.on = true;
      };
      const onLeave = () => {
        pointer.on = false;
      };

      const tick = (time: number) => {
        shown += (target - shown) * 0.06;
        if (Math.abs(target - shown) < 0.0005) shown = target;
        const e = 1 - (1 - shown) ** 3;
        const loose = 1 - e;
        const r = root.getBoundingClientRect();
        const px = pointer.x - r.left;
        const py = pointer.y - r.top;
        const radius = touch ? 0 : 150;
        const force = 70 * (0.25 + 0.75 * loose);
        const t = time * 0.5;

        for (let i = 0; i < items.length; i++) {
          const h = home[i];
          if (!h) continue;
          const sx = h.x + scatter[i].x * loose;
          const sy = h.y + scatter[i].y * loose;
          // The current: a slow, smooth flow field, strong while loose, a breath once settled.
          const amp = 46 * loose + 1.5;
          const fx = (Math.sin(sy * 0.011 + t * 1.2 + i) * 0.6 + Math.sin((sx + sy) * 0.006 - t * 0.8) * 0.4) * amp;
          const fy = (Math.cos(sx * 0.012 - t + i * 0.7) * 0.6 + Math.cos((sx - sy) * 0.005 + t * 0.7) * 0.4) * amp * 0.7;
          let bx = scatter[i].x * loose + fx;
          let by = scatter[i].y * loose + fy;

          // The pointer parts them.
          let tx = 0;
          let ty = 0;
          if (pointer.on && radius > 0) {
            const dx = h.x + bx - px;
            const dy = h.y + by - py;
            const d = Math.hypot(dx, dy);
            if (d < radius && d > 0.001) {
              const k = (1 - d / radius) ** 2 * force;
              tx = (dx / d) * k;
              ty = (dy / d) * k;
            }
          }
          const p = push[i];
          p.x += (tx - p.x) * 0.12;
          p.y += (ty - p.y) * 0.12;
          bx += p.x;
          by += p.y;

          items[i].style.transform = `translate3d(${bx.toFixed(2)}px, ${by.toFixed(2)}px, 0)`;
          const mark = marks[i];
          if (mark) mark.style.transform = `rotate(${(spin[i] * loose + fx * 0.15).toFixed(2)}deg)`;
          const name = names[i];
          if (name) name.style.opacity = smooth(0.7, 1, e).toFixed(3);
        }
        const lo = smooth(0.55, 1, e).toFixed(3);
        for (const l of labels) l.style.opacity = lo;
      };

      const start = () => {
        if (running) return;
        running = true;
        gsap.ticker.add(tick);
      };
      const stop = () => {
        if (!running) return;
        running = false;
        gsap.ticker.remove(tick);
      };

      const settle = ScrollTrigger.create({
        trigger: root,
        start: "top 92%",
        end: touch ? "top 30%" : "top 38%",
        onUpdate: (self) => {
          target = self.progress;
        },
        onRefresh: (self) => {
          measure();
          target = self.progress;
        },
      });
      const live = ScrollTrigger.create({
        trigger: root,
        start: "top bottom",
        end: "bottom top",
        onToggle: (self) => (self.isActive ? start() : stop()),
      });

      measure();
      target = settle.progress;
      shown = target;
      tick(gsap.ticker.time);
      if (live.isActive) start();
      window.addEventListener("pointermove", onMove, { passive: true });
      document.documentElement.addEventListener("pointerleave", onLeave);

      return () => {
        stop();
        settle.kill();
        live.kill();
        window.removeEventListener("pointermove", onMove);
        document.documentElement.removeEventListener("pointerleave", onLeave);
        for (const el of [...items, ...marks, ...names, ...labels]) {
          if (!el) continue;
          el.style.transform = "";
          el.style.opacity = "";
        }
      };
    },
    { scope: ref, dependencies: [allowed], revertOnUpdate: true },
  );

  return (
    <div
      ref={ref}
      className="relative grid grid-cols-2 gap-x-6 gap-y-12 px-gutter py-[clamp(2rem,6vw,5rem)] sm:grid-cols-3 lg:grid-cols-6 lg:gap-x-[2.5vw]"
    >
      {groups.map((group) => (
        <section key={group.key} aria-label={group.label} className="min-w-0">
          <p data-drift-label className="slate flex justify-between gap-3 border-b border-line pb-3 text-bone-400 tabular-nums">
            <span>{group.label}</span>
            <span>{String(group.items.length).padStart(2, "0")}</span>
          </p>
          <ul className="mt-5 grid gap-3.5">
            {group.items.map((item) => (
              <li key={item.id} data-drift className="group/skill flex min-w-0 items-center gap-3 will-change-transform">
                <span data-drift-mark aria-hidden="true" className="relative grid size-7 shrink-0 place-items-center">
                  {item.logo ? (
                    <Image
                      src={item.logo.src}
                      alt=""
                      fill
                      sizes="28px"
                      className="object-contain opacity-75 transition-opacity duration-(--dur-fast) group-hover/skill:opacity-100"
                    />
                  ) : (
                    <span className="size-2 rounded-full bg-bone-400" />
                  )}
                </span>
                <span
                  data-drift-name
                  className="min-w-0 text-[clamp(1rem,1.3vw,1.35rem)] leading-tight font-light tracking-[-0.02em] text-bone-100 transition-transform duration-(--dur-fast) ease-fluid group-hover/skill:translate-x-1"
                >
                  {item.name}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
