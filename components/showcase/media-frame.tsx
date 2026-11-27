import Image from "next/image";

import type { FrameBehavior, FrameChrome, Media } from "@/lib/content/types";
import { cn } from "@/lib/utils";

import { PlaneWindow } from "./plane-window";

const FRAME = {
  base: "relative overflow-hidden rounded-xl bg-ink-800 gl-plane:bg-transparent shadow-[inset_0_1px_0_0_rgb(255_255_255/0.06),0_50px_90px_-40px_rgb(0_0_0/0.85),0_20px_40px_-20px_color-mix(in_oklab,var(--accent)_18%,transparent)]",
  phone:
    "relative overflow-hidden rounded-[clamp(26px,3.2vw,44px)] bg-[#101217] p-[7px] shadow-[inset_0_0_0_1px_rgb(255_255_255/0.12),0_50px_90px_-40px_rgb(0_0_0/0.85)] gl-plane:bg-transparent gl-plane:shadow-[inset_0_0_0_1px_rgb(255_255_255/0.12),inset_0_0_0_7px_#101217,0_50px_90px_-40px_rgb(0_0_0/0.85)]",
  none: "relative overflow-hidden",
} as const;

/** Outer chrome classes for a frame. Exported for VideoFrame. */
export function frameClass(chrome: FrameChrome) {
  return chrome === "phone" ? FRAME.phone : chrome === "none" ? FRAME.none : FRAME.base;
}

/** Inner window classes (phone screens get their own radius). */
export function windowClass(chrome: FrameChrome) {
  return cn("relative overflow-hidden bg-ink-900 gl-plane:bg-transparent", chrome === "phone" && "rounded-[clamp(20px,2.7vw,37px)]");
}

/** DOM image under a GL plane: faded out once the plane draws, instantly back for snapshots. */
const PLANE_MEDIA = "transition-opacity duration-500 ease-io gl-plane:opacity-0 gl-handoff:transition-none";

type Props = {
  media: Media;
  chrome: FrameChrome;
  behavior: FrameBehavior;
  /** Window ratio (width / height). */
  ratio: number;
  sizes: string;
  /** Label in the browser bar, e.g. the live domain. */
  address?: string | null;
  preload?: boolean;
  quality?: number;
};

/** Browser bar (three lights + address) for desktop frames. */
function BrowserBar({ address }: { address?: string | null }) {
  return (
    <div className="flex h-[30px] items-center gap-4 border-b border-white/5 bg-[#111318] px-3" aria-hidden="true">
      <span className="flex gap-1.5">
        <i className="size-[9px] rounded-full bg-[color-mix(in_oklab,var(--accent)_70%,transparent)]" />
        <i className="size-[9px] rounded-full bg-bone-100/15" />
        <i className="size-[9px] rounded-full bg-bone-100/15" />
      </span>
      {address ? <span className="mx-auto max-w-[260px] flex-1 -translate-x-5 truncate rounded-md bg-white/4 px-2.5 py-[3px] text-center font-label text-[10px] tracking-[0.06em] text-bone-400">{address}</span> : null}
    </div>
  );
}

/**
 * One image inside its device chrome. `behavior="scroll"` keeps the tall screenshot at its
 * natural height so the grid's motion layer can pan it inside the window on scroll.
 * The window registers as a GL plane (desktop T2); the DOM image stays until its texture is drawn.
 */
export function MediaFrame({ media, chrome, behavior, ratio, sizes, address, preload = false, quality = 75 }: Props) {
  const scroll = behavior === "scroll" && media.width && media.height;
  const windowRatio = chrome === "phone" ? 9 / 19.5 : ratio;

  return (
    <div data-frame className={frameClass(chrome)}>
      {chrome === "browser" ? <BrowserBar address={address} /> : null}
      <PlaneWindow className={windowClass(chrome)} behavior={scroll ? "scroll" : "static"} style={{ aspectRatio: String(windowRatio) }}>
        {scroll ? (
          <Image
            src={media.src}
            alt={media.alt}
            width={media.width!}
            height={media.height!}
            sizes={sizes}
            quality={quality}
            preload={preload}
            placeholder={media.lqip ? "blur" : "empty"}
            blurDataURL={media.lqip ?? undefined}
            data-tall
            className={cn("block h-auto w-full will-change-transform", PLANE_MEDIA)}
          />
        ) : (
          <Image
            src={media.src}
            alt={media.alt}
            fill
            sizes={sizes}
            quality={quality}
            preload={preload}
            placeholder={media.lqip ? "blur" : "empty"}
            blurDataURL={media.lqip ?? undefined}
            className={cn("object-cover", PLANE_MEDIA)}
            style={{
              objectPosition:
                media.focalX != null && media.focalY != null ? `${media.focalX * 100}% ${media.focalY * 100}%` : "50% 0%",
            }}
          />
        )}
      </PlaneWindow>
      {chrome === "phone" ? <span className="absolute top-3.5 left-1/2 h-4 w-[28%] -translate-x-1/2 rounded-full bg-[#050608]" aria-hidden="true" /> : null}
    </div>
  );
}
