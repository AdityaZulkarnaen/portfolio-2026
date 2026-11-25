"use client";

import { useEffect, useRef, type ReactNode } from "react";

import { gsap } from "@/lib/motion/gsap";
import { subscribeVelocity } from "@/lib/motion/lenis-store";
import { useMotionAllowed } from "@/lib/motion/motion-prefs";
import { cn } from "@/lib/utils";

type Props = {
  children: ReactNode;
  /** Base speed in px/s. */
  speed?: number;
  /** 1 = leftward at rest, -1 = rightward. */
  direction?: 1 | -1;
  className?: string;
  label?: string;
};

/**
 * A marquee row whose speed follows scroll: base + |lenis velocity|·k, and whose
 * direction flips with the scroll direction. Paused offscreen and when motion is off.
 * The second copy is aria-hidden so the list is announced once.
 */
export function VelocityMarquee({ children, speed = 40, direction = 1, className, label }: Props) {
  const trackRef = useRef<HTMLDivElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const allowed = useMotionAllowed();

  useEffect(() => {
    const track = trackRef.current;
    const root = rootRef.current;
    if (!track || !root || !allowed) return;

    let x = 0;
    let velocity = 0;
    let sign: 1 | -1 = direction;
    let visible = false;
    let half = track.scrollWidth / 2;

    const ro = new ResizeObserver(() => {
      half = track.scrollWidth / 2;
    });
    ro.observe(track);
    const io = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
    });
    io.observe(root);
    const unsub = subscribeVelocity((v) => {
      velocity = v;
      if (Math.abs(v) > 0.5) sign = v > 0 ? direction : direction === 1 ? -1 : 1;
    });

    const tick = (_time: number, deltaMs: number) => {
      if (!visible || half === 0) return;
      const dt = Math.min(deltaMs, 64) / 1000;
      const boost = Math.min(Math.abs(velocity) * 22, 900);
      velocity *= 0.92;
      x -= sign * (speed + boost) * dt;
      if (x <= -half) x += half;
      if (x > 0) x -= half;
      track.style.transform = `translate3d(${x}px,0,0)`;
    };
    gsap.ticker.add(tick);

    return () => {
      gsap.ticker.remove(tick);
      ro.disconnect();
      io.disconnect();
      unsub();
      track.style.transform = "";
    };
  }, [allowed, direction, speed]);

  return (
    <div
      ref={rootRef}
      className={cn("overflow-hidden border-y border-line py-[clamp(0.6rem,1.2vw,1.1rem)]", className)}
      role="group"
      aria-label={label}
    >
      {/* Motion off: the row wraps into a static list and the duplicate is removed. */}
      <div ref={trackRef} className="flex w-max will-change-transform motion-off:w-auto motion-off:flex-wrap motion-off:px-gutter">
        <div className="flex flex-none motion-off:flex-wrap">{children}</div>
        <div className="flex flex-none motion-off:hidden" aria-hidden="true">
          {children}
        </div>
      </div>
    </div>
  );
}
