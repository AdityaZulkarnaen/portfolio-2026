"use client";

import Image from "next/image";
import { useEffect, useLayoutEffect, useRef, useState } from "react";

import type { Media } from "@/lib/content/types";
import { useMotionAllowed } from "@/lib/motion/motion-prefs";

import { PlaneWindow } from "./plane-window";
import { claim, releasePlayback } from "./video-frame";

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

/** DOM image under a GL plane: faded out once the plane draws, instantly back for snapshots. */
const PLANE_MEDIA = "transition-opacity duration-500 ease-io gl-plane:opacity-0 gl-handoff:transition-none";

/** Muted loop: plays while ≥50% visible and motion is allowed; shares the document-wide cap of two. */
function CardLoop({ src, poster, label }: { src: string; poster: string | null; label: string }) {
  const ref = useRef<HTMLVideoElement>(null);
  const [inView, setInView] = useState(false);
  const motion = useMotionAllowed();

  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    const io = new IntersectionObserver(([e]) => setInView(e.intersectionRatio >= 0.5), { threshold: [0, 0.5, 1] });
    io.observe(v);
    return () => io.disconnect();
  }, []);

  useLayoutEffect(() => {
    const v = ref.current;
    if (!v) return;
    if (inView && motion) {
      claim(v);
      v.play().catch(() => releasePlayback(v));
    } else {
      v.pause();
      releasePlayback(v);
    }
    return () => {
      v.pause();
      releasePlayback(v);
    };
  }, [inView, motion]);

  return (
    <video
      ref={ref}
      className="absolute inset-0 size-full object-cover object-top"
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
 * through a GL plane (gated: only while the card is settled, see PlaneWindow).
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
    <PlaneWindow className={`absolute inset-0 overflow-hidden bg-ink-900 gl-plane:bg-transparent ${className}`} behavior="static" gated>
      <Image
        src={cover.src}
        alt={cover.alt || label}
        fill
        sizes={sizes}
        quality={75}
        preload={preload}
        placeholder={cover.lqip ? "blur" : "empty"}
        blurDataURL={cover.lqip ?? undefined}
        className={`object-cover ${PLANE_MEDIA}`}
        style={{
          objectPosition: cover.focalX != null && cover.focalY != null ? `${cover.focalX * 100}% ${cover.focalY * 100}%` : "50% 0%",
        }}
      />
    </PlaneWindow>
  );
}
