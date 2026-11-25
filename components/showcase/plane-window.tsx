"use client";

import { type CSSProperties, type ReactNode, useLayoutEffect, useRef } from "react";

import { stageBridge } from "@/gl/bridge";

type Props = {
  className: string;
  style?: CSSProperties;
  behavior: "scroll" | "static";
  /**
   * Register only while the closest `[data-pose]` carries `data-settled`. GL planes follow
   * the DOM box but not arbitrary transforms, so a card that is scattered (moved, rotated,
   * scaled) shows its DOM image and gets its plane back once it has settled.
   */
  gated?: boolean;
  children: ReactNode;
};

/**
 * The media window of a <MediaFrame> or a featured card, registered as a GL plane while
 * mounted and shown. The layout-effect cleanup releases it synchronously, so a page hidden
 * by <Activity> gets its DOM media back before it is hidden.
 */
export function PlaneWindow({ className, style, behavior, gated = false, children }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (!gated) {
      const handle = stageBridge.registerPlane(el);
      return () => handle.release();
    }
    const pose = el.closest<HTMLElement>("[data-pose]");
    let handle: { release(): void } | null = null;
    const sync = () => {
      const settled = !pose || pose.dataset.settled !== undefined;
      if (settled && !handle) handle = stageBridge.registerPlane(el);
      else if (!settled && handle) {
        handle.release();
        handle = null;
      }
    };
    sync();
    const mo = pose ? new MutationObserver(sync) : null;
    if (pose) mo?.observe(pose, { attributes: true, attributeFilter: ["data-settled"] });
    return () => {
      mo?.disconnect();
      handle?.release();
    };
  }, [gated]);

  return (
    <div ref={ref} className={className} data-behavior={behavior} data-gl-media style={style}>
      {children}
    </div>
  );
}
