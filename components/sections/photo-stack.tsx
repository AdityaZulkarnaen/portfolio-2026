"use client";

import Image from "next/image";
import { useState } from "react";

import type { Media } from "@/lib/content/types";

const TILTS = [-4, 3, -2, 5, -3];

/**
 * A loose stack of contact prints. Click / Enter / Space sends the top print to the back.
 * The button exposes position ("Photo 2 of 4") so it is useful without sight.
 * On phones it sits 2.5rem narrower than its column: the fanned back prints reach past
 * the button box, and must not widen the layout viewport.
 */
export function PhotoStack({ photos, name }: { photos: Media[]; name: string }) {
  const [top, setTop] = useState(0);
  if (photos.length === 0) return null;
  const n = photos.length;

  return (
    <button
      type="button"
      className="group/stack relative mx-auto block aspect-[4/5] w-[calc(100%-2.5rem)] max-w-110 md:w-full cursor-pointer rounded-md"
      data-cursor="next"
      onClick={() => setTop((t) => (t + 1) % n)}
      aria-label={`Photo ${top + 1} of ${n} of ${name}. Show next photo.`}
    >
      {photos.map((photo, i) => {
        const depth = (i - top + n) % n; // 0 = top of the stack
        return (
          <span
            key={photo.id}
            className="absolute inset-0 overflow-hidden rounded bg-ink-800 shadow-[0_0_0_8px_#e9e4d8,0_30px_60px_-20px_rgb(0_0_0/0.8)] transition-[transform,opacity] duration-900 ease-out-expo"
            data-depth={depth}
            style={{
              zIndex: n - depth,
              transform: `translate(${depth * 10}px, ${depth * -8}px) rotate(${TILTS[(i + depth) % TILTS.length] * (depth === 0 ? 0.4 : 1)}deg) scale(${1 - depth * 0.04})`,
              opacity: depth > 2 ? 0 : 1,
            }}
          >
            <Image
              src={photo.src}
              alt={depth === 0 ? photo.alt || name : ""}
              fill
              sizes="(min-width: 768px) 30vw, 80vw"
              quality={75}
              className="object-cover contrast-[1.05] saturate-[0.85]"
              placeholder={photo.lqip ? "blur" : "empty"}
              blurDataURL={photo.lqip ?? undefined}
            />
          </span>
        );
      })}
      <span className="slate absolute -right-1 -bottom-10 text-bone-400 tabular-nums" aria-hidden="true">
        {String(top + 1).padStart(2, "0")} / {String(n).padStart(2, "0")}
      </span>
    </button>
  );
}
