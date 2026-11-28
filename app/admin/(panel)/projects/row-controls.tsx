"use client";

import { useTransition } from "react";

import { SMALL_BTN } from "@/components/admin/ui";

import { moveProject, toggleProject } from "./actions";

type Props = { id: string; published: boolean; featured: boolean; first: boolean; last: boolean };

export function ProjectRowControls({ id, published, featured, first, last }: Props) {
  const [pending, start] = useTransition();
  const chip = (on: boolean) =>
    `slate rounded-full px-3 py-1.5 transition-colors ${on ? "bg-lilac-500 text-ink-950" : "text-bone-400 shadow-[inset_0_0_0_1px_var(--color-line-strong)] hover:text-bone-100"}`;
  return (
    <div className={`flex shrink-0 items-center gap-2 ${pending ? "opacity-50" : ""}`}>
      <button type="button" aria-pressed={published} className={chip(published)} onClick={() => start(() => toggleProject(id, "published", !published))}>
        {published ? "Live" : "Draft"}
      </button>
      <button type="button" aria-pressed={featured} className={chip(featured)} onClick={() => start(() => toggleProject(id, "featured", !featured))}>
        Featured
      </button>
      <button type="button" aria-label="Move up" disabled={first || pending} className={SMALL_BTN} onClick={() => start(() => moveProject(id, -1))}>
        ↑
      </button>
      <button type="button" aria-label="Move down" disabled={last || pending} className={SMALL_BTN} onClick={() => start(() => moveProject(id, 1))}>
        ↓
      </button>
    </div>
  );
}
