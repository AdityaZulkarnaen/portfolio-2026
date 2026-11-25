"use client";

import { useState } from "react";

import { Magnetic } from "@/components/motion/magnetic";
import { ReelDialog, type ReelChapterMark } from "@/components/reel/reel-dialog";

type Props = {
  src: string;
  poster?: string | null;
  title: string;
  chapters: ReelChapterMark[];
};

/** Glass "Play reel" circle. Rendered only when an active reel has an encoded source. */
export function PlayReelButton({ src, poster, title, chapters }: Props) {
  const [open, setOpen] = useState(false);
  const [origin, setOrigin] = useState<{ x: number; y: number } | null>(null);

  return (
    <>
      <Magnetic strength={0.3} className="inline-block">
        <button
          type="button"
          className="glass grid size-[116px] place-items-center content-center gap-1.5 rounded-full text-bone-100 transition-[transform,background-color] duration-(--dur-base) ease-fluid hover:scale-[1.04] hover:bg-bone-100/15"
          data-cursor="play"
          aria-haspopup="dialog"
          onClick={(e) => {
            const r = e.currentTarget.getBoundingClientRect();
            setOrigin(e.clientX || e.clientY ? { x: e.clientX, y: e.clientY } : { x: r.left + r.width / 2, y: r.top + r.height / 2 });
            setOpen(true);
          }}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true" className="size-5">
            <path d="M8 5.5v13l10.5-6.5z" fill="currentColor" />
          </svg>
          <span className="slate">Play reel</span>
        </button>
      </Magnetic>
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
