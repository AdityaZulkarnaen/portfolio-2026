"use client";

import Image from "next/image";
import { useEffect, useLayoutEffect, useRef, useState } from "react";

import type { Media } from "@/lib/content/types";
import { useMotionAllowed } from "@/lib/motion/motion-prefs";

import { DEV_MASK, PLANE_MEDIA } from "./plane-classes";
import { PlaneWindow } from "./plane-window";
import { IN_VIEW_RATIO, IN_VIEW_THRESHOLDS, releasePlayback, requestPlayback } from "./playback";

type Props = {
  cover: Media | null;
  /** The project's loop video (P7). When present it plays instead of the still. */
  loop: Media | null;
  sizes: string;
  preload?: boolean;
  label: string;
  /** Extra classes on the media window (e.g. a phone screen radius). */
  className?: string;
};

/**
 * Muted loop: plays while ≥50% visible and motion is allowed; shares the document-wide cap of
 * two. No poster (the optimised cover is already drawn underneath); the video only shows once
 * it is actually playing, so it never covers the cover with an empty frame.
 */
function CardLoop({ src, label }: { src: string; label: string }) {
  const ref = useRef<HTMLVideoElement>(null);
  const [inView, setInView] = useState(false);
  const [playing, setPlaying] = useState(false);
  const motion = useMotionAllowed();

  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    const io = new IntersectionObserver(
      ([e]) => setInView(e.isIntersecting && e.intersectionRatio >= IN_VIEW_RATIO),
      { threshold: IN_VIEW_THRESHOLDS },
    );
    io.observe(v);
    return () => io.disconnect();
  }, []);

  useLayoutEffect(() => {
    const v = ref.current;
    if (!v) return;
    if (inView && motion) requestPlayback(v);
    else releasePlayback(v);
    return () => releasePlayback(v);
  }, [inView, motion]);

  return (
    <video
      ref={ref}
      className="absolute inset-0 size-full object-cover object-top opacity-0 transition-opacity duration-300 data-playing:opacity-100"
      data-playing={playing || undefined}
      onPlaying={() => setPlaying(true)}
      src={src}
      muted
      loop
      playsInline
      preload="none"
      aria-label={label}
    />
  );
}

/** The cover still, drawn through a GL plane (which follows the card's pose transform). */
function CoverPlane({ cover, sizes, preload, label, className }: { cover: Media; sizes: string; preload: boolean; label: string; className: string }) {
  return (
    <PlaneWindow className={`absolute inset-0 overflow-hidden bg-ink-900 gl-plane:bg-transparent ${className}`} behavior="static">
      <Image
        src={cover.src}
        alt={cover.alt || label}
        fill
        sizes={sizes}
        quality={75}
        preload={preload}
        placeholder={cover.lqip ? "blur" : "empty"}
        blurDataURL={cover.lqip ?? undefined}
        className={`object-cover ${PLANE_MEDIA} ${DEV_MASK}`}
        style={{
          objectPosition: cover.focalX != null && cover.focalY != null ? `${cover.focalX * 100}% ${cover.focalY * 100}%` : "50% 0%",
        }}
      />
    </PlaneWindow>
  );
}

/**
 * Card media: the cover still through a GL plane, so every card develops with the same wave
 * (dark ink, the front washing down). A project with a loop video lays it over the still
 * once the develop has all but finished (`--dev` on the frame; unset = shown), so the wave
 * plays on the poster and the motion takes over from the same picture.
 */
export function WorkCardMedia({ cover, loop, sizes, preload = false, label, className = "" }: Props) {
  const still = cover ? (
    <CoverPlane cover={cover} sizes={sizes} preload={preload} label={label} className={className} />
  ) : (
    <div className="absolute inset-0 bg-ink-900" />
  );
  if (!loop || loop.kind !== "video") return still;
  return (
    <>
      {still}
      <div className="absolute inset-0 [opacity:clamp(0,calc((var(--dev,1)-0.92)*12.5),1)]">
        <CardLoop src={loop.src} label={label} />
      </div>
    </>
  );
}
