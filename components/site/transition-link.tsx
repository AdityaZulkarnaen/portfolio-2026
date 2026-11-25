"use client";

import Link from "next/link";
import type { ComponentProps } from "react";

import { stageBridge } from "@/gl/bridge";

export type TransitionKind = "to-case" | "nav-forward" | "nav-back";

type Props = Omit<ComponentProps<typeof Link>, "transitionTypes"> & {
  transition?: TransitionKind;
};

/**
 * Link that tags its navigation with a view-transition type. Case links prefetch the full
 * route so the cover morph pairs in the same commit. `onNavigate` fires the stage's click
 * pulse and sets `data-gl-handoff` (P4: DOM media visible before the snapshot).
 */
export function TransitionLink({ transition = "nav-forward", prefetch, onNavigate, ...props }: Props) {
  return (
    <Link
      {...props}
      prefetch={prefetch ?? (transition === "to-case" ? true : undefined)}
      transitionTypes={[transition]}
      onNavigate={(e) => {
        document.documentElement.dataset.glHandoff = "true";
        stageBridge.pulse();
        window.setTimeout(() => delete document.documentElement.dataset.glHandoff, 1200);
        onNavigate?.(e);
      }}
    />
  );
}
