"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent } from "react";

import { lockScroll, unlockScroll } from "@/lib/motion/lenis-store";

export type ReelChapterMark = { label: string; startS: number };

type Props = {
  open: boolean;
  origin: { x: number; y: number } | null;
  src: string;
  poster?: string | null;
  title: string;
  chapters: ReelChapterMark[];
  onClose: () => void;
};

function fmt(s: number) {
  if (!Number.isFinite(s)) return "0:00";
  const m = Math.floor(s / 60);
  return `${m}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
}

/**
 * Showreel modal on a native <dialog> (focus trap, Esc, focus return for free).
 * Opens with a clip-path circle expanding from the click point. Keys: Space/K play,
 * ←/→ seek 5s, Shift+←/→ chapter, M mute, F fullscreen, Esc close.
 */
export function ReelDialog({ open, origin, src, poster, title, chapters, onClose }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const closingRef = useRef(false);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(0);

  const reduced = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const circle = useCallback(
    (r: string) => {
      const x = origin ? `${origin.x}px` : "50%";
      const y = origin ? `${origin.y}px` : "50%";
      return `circle(${r} at ${x} ${y})`;
    },
    [origin],
  );

  useLayoutEffect(() => {
    const dialog = dialogRef.current;
    const video = videoRef.current;
    if (!open || !dialog || !video) return;
    closingRef.current = false;
    dialog.showModal();
    lockScroll("reel");
    if (!reduced()) {
      dialog.animate([{ clipPath: circle("0px") }, { clipPath: circle("150vmax") }], {
        duration: 900,
        easing: "cubic-bezier(0.16, 1, 0.3, 1)",
      });
    }
    video.play().catch(() => {});
    return () => {
      // Runs on close and when Activity hides the page: never leave a reel playing.
      video.pause();
      if (dialog.open) dialog.close();
      unlockScroll("reel");
    };
  }, [open, circle]);

  const requestClose = useCallback(() => {
    const dialog = dialogRef.current;
    if (!dialog || closingRef.current) return;
    closingRef.current = true;
    videoRef.current?.pause();
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    if (reduced()) {
      onClose();
      return;
    }
    const anim = dialog.animate([{ clipPath: circle("150vmax") }, { clipPath: circle("0px") }], {
      duration: 550,
      easing: "cubic-bezier(0.65, 0, 0.35, 1)",
      fill: "forwards",
    });
    anim.onfinish = () => onClose();
  }, [circle, onClose]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const onCancel = (e: Event) => {
      e.preventDefault();
      requestClose();
    };
    dialog.addEventListener("cancel", onCancel);
    return () => dialog.removeEventListener("cancel", onCancel);
  }, [requestClose]);

  const toggle = () => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) v.play().catch(() => {});
    else v.pause();
  };

  const seek = (s: number) => {
    const v = videoRef.current;
    if (!v) return;
    v.currentTime = Math.max(0, Math.min(v.duration || 0, s));
  };

  const jumpChapter = (dir: 1 | -1) => {
    const v = videoRef.current;
    if (!v || chapters.length === 0) return;
    const t = v.currentTime;
    const starts = chapters.map((c) => c.startS).sort((a, b) => a - b);
    const next = dir > 0 ? starts.find((s) => s > t + 0.5) : [...starts].reverse().find((s) => s < t - 1.5);
    seek(next ?? (dir > 0 ? v.duration : 0));
  };

  const fullscreen = () => {
    const el = dialogRef.current;
    if (!el) return;
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    else el.requestFullscreen?.().catch(() => {});
  };

  const onKeyDown = (e: KeyboardEvent<HTMLDialogElement>) => {
    const target = e.target as HTMLElement;
    if (target.tagName === "INPUT" && (e.key === "ArrowLeft" || e.key === "ArrowRight")) return;
    switch (e.key) {
      case " ":
      case "k":
      case "K":
        if (target.tagName === "BUTTON" && e.key === " ") return;
        e.preventDefault();
        toggle();
        break;
      case "ArrowLeft":
        e.preventDefault();
        if (e.shiftKey) jumpChapter(-1);
        else seek((videoRef.current?.currentTime ?? 0) - 5);
        break;
      case "ArrowRight":
        e.preventDefault();
        if (e.shiftKey) jumpChapter(1);
        else seek((videoRef.current?.currentTime ?? 0) + 5);
        break;
      case "m":
      case "M":
        setMuted((m) => !m);
        break;
      case "f":
      case "F":
        fullscreen();
        break;
    }
  };

  const current = [...chapters].reverse().find((c) => c.startS <= time);

  return (
    <dialog ref={dialogRef} className="fixed inset-0 m-0 size-full max-h-none max-w-none border-0 bg-black p-0 text-bone-100 backdrop:bg-black/60" aria-label={title} onKeyDown={onKeyDown} onClose={() => open && onClose()}>
      <div className="absolute inset-0 grid place-items-center">
        <video
          ref={videoRef}
          className="size-full object-contain"
          src={open ? src : undefined}
          poster={poster ?? undefined}
          muted={muted}
          playsInline
          preload="none"
          onClick={toggle}
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
          onTimeUpdate={(e) => setTime(e.currentTarget.currentTime)}
          onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
          onEnded={() => setPlaying(false)}
        />
      </div>

      <div className="pointer-events-none absolute inset-0 grid grid-rows-[auto_1fr_auto] bg-[linear-gradient(180deg,rgb(0_0_0/0.55),transparent_18%,transparent_78%,rgb(0_0_0/0.7))] p-gutter *:pointer-events-auto">
        <div className="flex items-center justify-between">
          <span className="slate">
            {title}
            {current ? ` · ${current.label}` : ""}
          </span>
          <button type="button" className="slate inline-flex h-10 items-center gap-2.5 rounded-full px-4 shadow-[inset_0_0_0_1px_var(--color-line-strong)] hover:bg-white/10" onClick={requestClose}>
            Close <kbd className="font-mono text-bone-400">Esc</kbd>
          </button>
        </div>

        <div className="row-start-3 flex items-center gap-4">
          <button type="button" className="slate inline-flex h-10 items-center gap-2.5 rounded-full px-4 shadow-[inset_0_0_0_1px_var(--color-line-strong)] hover:bg-white/10" onClick={toggle} aria-label={playing ? "Pause" : "Play"}>
            {playing ? "Pause" : "Play"}
          </button>
          <span className="slate text-bone-400 tabular-nums">
            {fmt(time)} / {fmt(duration)}
          </span>
          <div className="relative flex-1">
            <input
              type="range"
              className="w-full accent-ember-500"
              min={0}
              max={duration || 0}
              step={0.1}
              value={time}
              onChange={(e) => seek(Number(e.target.value))}
              aria-label="Seek"
              aria-valuetext={`${fmt(time)} of ${fmt(duration)}`}
            />
            <div className="pointer-events-none absolute inset-x-0 -top-1.5 h-1.5" aria-hidden="true">
              {duration > 0
                ? chapters.map((c) => (
                    <span key={c.startS} className="absolute top-0 h-1.5 w-px bg-bone-100" style={{ left: `${(c.startS / duration) * 100}%` }} title={c.label} />
                  ))
                : null}
            </div>
          </div>
          <button type="button" className="slate inline-flex h-10 items-center gap-2.5 rounded-full px-4 shadow-[inset_0_0_0_1px_var(--color-line-strong)] hover:bg-white/10" onClick={() => setMuted((m) => !m)} aria-pressed={muted}>
            {muted ? "Unmute" : "Mute"}
          </button>
          <button type="button" className="slate inline-flex h-10 items-center gap-2.5 rounded-full px-4 shadow-[inset_0_0_0_1px_var(--color-line-strong)] hover:bg-white/10" onClick={fullscreen}>
            Full screen
          </button>
        </div>
      </div>
    </dialog>
  );
}
