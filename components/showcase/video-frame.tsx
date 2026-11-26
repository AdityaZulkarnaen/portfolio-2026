"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";

import type { FrameChrome } from "@/lib/content/types";
import { useMotionAllowed } from "@/lib/motion/motion-prefs";

import { frameClass, windowClass } from "./media-frame";
import { IN_VIEW_RATIO, IN_VIEW_THRESHOLDS, releasePlayback, requestPlayback } from "./playback";

type Props = {
  src: string;
  poster?: string | null;
  ratio: number;
  chrome: FrameChrome;
  label: string;
};

const R = 15;
const C = 2 * Math.PI * R;

/**
 * Muted looping frame: plays only while ≥50% visible (and motion is allowed), pauses in a
 * layout-effect cleanup so Activity-hidden pages never keep decoding. The progress ring
 * doubles as the play/pause toggle.
 */
export function VideoFrame({ src, poster, ratio, chrome, label }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const ringRef = useRef<SVGCircleElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [userPaused, setUserPaused] = useState(false);
  const [inView, setInView] = useState(false);
  const motion = useMotionAllowed();

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    const io = new IntersectionObserver(
      ([e]) => setInView(e.isIntersecting && e.intersectionRatio >= IN_VIEW_RATIO),
      { threshold: IN_VIEW_THRESHOLDS },
    );
    io.observe(v);
    return () => io.disconnect();
  }, []);

  useLayoutEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    if (inView && motion && !userPaused) requestPlayback(v);
    else releasePlayback(v);
    return () => releasePlayback(v);
  }, [inView, motion, userPaused]);

  useEffect(() => {
    const v = videoRef.current;
    const ring = ringRef.current;
    if (!v || !ring || !isPlaying) return;
    let raf = 0;
    const loop = () => {
      const p = v.duration ? v.currentTime / v.duration : 0;
      ring.style.strokeDashoffset = String(C * (1 - p));
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [isPlaying]);

  return (
    <div data-frame className={frameClass(chrome)}>
      <div className={windowClass(chrome)} data-gl-media style={{ aspectRatio: String(chrome === "phone" ? 9 / 19.5 : ratio) }}>
        <video
          ref={videoRef}
          className="absolute inset-0 size-full object-cover"
          src={src}
          poster={poster ?? undefined}
          muted
          loop
          playsInline
          preload="none"
          aria-label={label}
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
        />
        <button
          type="button"
          className="absolute right-3.5 bottom-3.5 size-12 rounded-full bg-ink-950/55 text-bone-100 backdrop-blur-sm"
          data-cursor={isPlaying ? "pause" : "play"}
          aria-label={isPlaying ? `Pause ${label}` : `Play ${label}`}
          onClick={() => {
            const v = videoRef.current;
            if (!v) return;
            if (v.paused) {
              setUserPaused(false);
              requestPlayback(v);
            } else {
              setUserPaused(true);
              releasePlayback(v);
            }
          }}
        >
          <svg viewBox="0 0 36 36" aria-hidden="true" className="size-full -rotate-90">
            <circle cx="18" cy="18" r={R} className="fill-none stroke-white/20 stroke-[1.5]" />
            <circle
              ref={ringRef}
              cx="18"
              cy="18"
              r={R}
              className="fill-none stroke-(--accent) stroke-[1.5] [stroke-linecap:round]"
              style={{ strokeDasharray: C, strokeDashoffset: C }}
            />
            {isPlaying ? (
              <path d="M14.5 12.5v11M21.5 12.5v11" className="origin-center rotate-90 fill-none stroke-current stroke-[1.8]" />
            ) : (
              <path d="M15 12.5v11l8.5-5.5z" className="origin-center rotate-90 fill-current" />
            )}
          </svg>
        </button>
      </div>
    </div>
  );
}
