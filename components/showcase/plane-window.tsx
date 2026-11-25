"use client";

import { type CSSProperties, type ReactNode, useLayoutEffect, useRef } from "react";

import { stageBridge } from "@/gl/bridge";

type Props = { className: string; style?: CSSProperties; behavior: "scroll" | "static"; children: ReactNode };

/**
 * The media window of a <MediaFrame> or a featured card, registered as a GL plane while
 * mounted and shown. The layout-effect cleanup releases it synchronously, so a page hidden
 * by <Activity> gets its DOM media back before it is hidden. Inside a `[data-pose]` card
 * the plane follows the card's GSAP transform (gl/plane.ts).
 */
export function PlaneWindow({ className, style, behavior, children }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const handle = stageBridge.registerPlane(el);
    return () => handle.release();
  }, []);

  return (
    <div ref={ref} className={className} data-behavior={behavior} data-gl-media style={style}>
      {children}
    </div>
  );
}
