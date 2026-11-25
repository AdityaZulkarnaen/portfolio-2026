"use client";

import { useLayoutEffect, useRef } from "react";

import { bindStageTint } from "@/gl/hooks";

/**
 * Tints the GL ambient field with `accent` (drop it inside a server component).
 * `scope="parent"`: only while the parent element crosses the middle of the viewport.
 * `scope="page"`: for as long as the page is shown.
 */
export function StageTint({ accent, scope = "parent" }: { accent: string; scope?: "parent" | "page" }) {
  const ref = useRef<HTMLSpanElement>(null);
  useLayoutEffect(() => {
    if (scope === "page") return bindStageTint(null, accent);
    const parent = ref.current?.parentElement;
    if (!parent) return;
    return bindStageTint(parent, accent);
  }, [accent, scope]);
  return <span ref={ref} hidden />;
}
