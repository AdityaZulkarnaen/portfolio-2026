import { ViewTransition, type CSSProperties, type ReactNode } from "react";

import type { ProjectFrame } from "@/lib/content/types";
import { cn } from "@/lib/utils";

import { Caption } from "./caption";
import { MediaFrame } from "./media-frame";
import { VideoFrame } from "./video-frame";

type Props = {
  frames: ProjectFrame[];
  /** Domain shown in browser chrome. */
  address?: string | null;
  /** View-transition name for the cover frame (one element per name per page). */
  coverTransitionName?: string;
  /** Poster for video frames without their own. */
  poster?: string | null;
  preloadFirst?: boolean;
  className?: string;
};

function sizesFor(frame: ProjectFrame) {
  const span = Math.max(1, frame.colEnd - frame.colStart);
  const desktop = Math.round((span / 12) * 100);
  const mobile = Math.round((frame.mobileSpan / 12) * 100);
  return `(min-width: 768px) ${desktop}vw, ${mobile}vw`;
}

/**
 * PURE 12-column editorial grid (also used by the admin layout preview). Every
 * position comes from CSS variables, never from class names built out of DB values:
 * --col-start / --col-end / --row / --ratio / --shift / --depth / --mobile-span.
 * Motion (reveal, parallax, scroll-pan) is layered on by <GridMotion>, so this renders
 * identically on server, in admin, and with JavaScript off.
 */
export function EditorialGrid({ frames, address, coverTransitionName, poster, preloadFirst, className }: Props) {
  if (frames.length === 0) return null;
  const coverId = (frames.find((f) => f.isCover) ?? frames[0]).id;

  return (
    <div className={cn("grid grid-cols-12 items-start gap-x-[4vw] gap-y-[clamp(3rem,10vw,11rem)]", className)}>
      {frames.map((frame, i) => {
        const style = {
          "--col-start": frame.colStart,
          "--col-end": frame.colEnd,
          "--row": frame.rowIndex,
          "--ratio": frame.ratio,
          "--shift": frame.shift,
          "--depth": frame.depth,
          "--mobile-span": frame.mobileSpan,
        } as CSSProperties;

        const media =
          frame.media.kind === "video" ? (
            <VideoFrame
              src={frame.media.src}
              poster={poster}
              ratio={frame.ratio}
              chrome={frame.frame}
              label={frame.media.alt || frame.caption || "Project video"}
            />
          ) : (
            <MediaFrame
              media={frame.media}
              chrome={frame.frame}
              behavior={frame.behavior}
              ratio={frame.ratio}
              sizes={sizesFor(frame)}
              address={address}
              preload={preloadFirst && i === 0}
            />
          );

        let content: ReactNode = media;
        if (coverTransitionName && frame.id === coverId) {
          content = (
            <ViewTransition name={coverTransitionName} share="morph" default="none">
              <div>{media}</div>
            </ViewTransition>
          );
        }

        return (
          <figure
            key={frame.id}
            data-grid-item
            className="col-span-(--mobile-span) m-0 min-w-0 md:col-[var(--col-start)/var(--col-end)] md:row-(--row) md:mt-[calc(var(--shift)*9vw)]"
            data-format={frame.format}
            data-chrome={frame.frame}
            data-depth={frame.depth}
            style={style}
          >
            {content}
            <Caption>{frame.caption}</Caption>
          </figure>
        );
      })}
    </div>
  );
}
