"use client";

import Link from "next/link";
import type { ComponentProps } from "react";

export type TransitionKind = "to-case" | "nav-forward" | "nav-back";

type Props = Omit<ComponentProps<typeof Link>, "transitionTypes"> & {
  transition?: TransitionKind;
};

/**
 * Link that tags its navigation with a view-transition type. Case links prefetch the full
 * route so the cover morph pairs in the same commit. `onNavigate` is the hook point for
 * the P4 GL handoff (`data-gl-handoff` makes DOM media visible before the snapshot).
 */
export function TransitionLink({ transition = "nav-forward", prefetch, onNavigate, ...props }: Props) {
  return (
    <Link
      {...props}
      prefetch={prefetch ?? (transition === "to-case" ? true : undefined)}
      transitionTypes={[transition]}
      onNavigate={(e) => {
        document.documentElement.dataset.glHandoff = "true";
        window.setTimeout(() => delete document.documentElement.dataset.glHandoff, 1200);
        onNavigate?.(e);
      }}
    />
  );
}
