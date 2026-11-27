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

/** Muted loop: plays while ≥50% visible and motion is allowed; shares the document-wide cap of two. */
function CardLoop({ src, poster, label }: { src: string; poster: string | null; label: string }) {
  const ref = useRef<HTMLVideoElement>(null);
  const [inView, setInView] = useState(false);
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
      className={`absolute inset-0 size-full object-cover object-top ${DEV_MASK}`}
      src={src}
      poster={poster ?? undefined}
      muted
      loop
      playsInline
      preload="none"
      aria-label={label}
    />
  );
}

/**
 * Card media: the loop video when the project has one, otherwise the cover still drawn
 * through a GL plane (which follows the card's pose transform).
 */
export function WorkCardMedia({ cover, loop, sizes, preload = false, label, className = "" }: Props) {
  if (loop && loop.kind === "video") {
    return (
      <div className="absolute inset-0 bg-ink-900">
        <CardLoop src={loop.src} poster={cover?.src ?? null} label={label} />
      </div>
    );
  }
  if (!cover) return <div className="absolute inset-0 bg-ink-900" />;
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
