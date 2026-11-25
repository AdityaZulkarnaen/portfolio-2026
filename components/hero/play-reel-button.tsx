"use client";

import { useState } from "react";

import { ReelDialog, type ReelChapterMark } from "@/components/reel/reel-dialog";

type Props = {
  src: string;
  poster?: string | null;
  title: string;
  chapters: ReelChapterMark[];
};

/** Bone pill used on the hero reel window, shared by the play button and the case link. */
export const HERO_PILL =
  "slate pointer-events-auto inline-flex h-10 items-center gap-2.5 rounded-full bg-bone-100 pr-4.5 pl-3.5 text-ink-950 shadow-[0_6px_24px_-8px_rgb(0_0_0/0.6)] transition-[transform,background-color] duration-(--dur-base) ease-fluid hover:scale-[1.05] hover:bg-white active:scale-[0.98]";

/** "Play reel" pill. Rendered only when an active reel has an encoded source. */
export function PlayReelButton({ src, poster, title, chapters }: Props) {
  const [open, setOpen] = useState(false);
  const [origin, setOrigin] = useState<{ x: number; y: number } | null>(null);

  return (
    <>
      <button
        type="button"
        className={HERO_PILL}
        data-cursor="play"
        aria-haspopup="dialog"
        onClick={(e) => {
          const r = e.currentTarget.getBoundingClientRect();
          setOrigin(e.clientX || e.clientY ? { x: e.clientX, y: e.clientY } : { x: r.left + r.width / 2, y: r.top + r.height / 2 });
          setOpen(true);
        }}
      >
        <svg viewBox="0 0 12 12" aria-hidden="true" className="size-3">
          <path d="M3 1.8v8.4L10 6z" fill="currentColor" />
        </svg>
        Play reel
      </button>
      <ReelDialog
        open={open}
        origin={origin}
        src={src}
        poster={poster}
        title={title}
        chapters={chapters}
        onClose={() => setOpen(false)}
      />
    </>
  );
}
