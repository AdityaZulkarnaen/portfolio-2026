import type { ProjectFrame } from "@/lib/content/types";

import { MediaFrame } from "./media-frame";

type Props = {
  frames: ProjectFrame[];
  /** Domain shown in browser chrome. */
  address?: string | null;
};

const SHOT_RATIO = 16 / 10;
const PHONE_RATIO = 9 / 19.5;

/**
 * The case study's supporting views, kept small and tidy: up to two more screens and one
 * phone view. Desktop: the screens stacked on the left (8 columns), the phone beside them
 * (4 columns); without a phone the two screens sit side by side. Phones: one column, the
 * phone centred. Every print develops through the GL wave as it scrolls in (MediaFrame).
 */
export function CaseGallery({ frames, address }: Props) {
  const images = frames.filter((f) => f.media.kind === "image");
  const shots = images.filter((f) => f.frame !== "phone").slice(0, 2);
  const phone = images.find((f) => f.frame === "phone") ?? null;
  if (shots.length === 0 && !phone) return null;

  const shot = (f: ProjectFrame, sizes: string) => (
    <figure key={f.id} className="grid gap-3">
      <MediaFrame media={f.media} chrome={f.frame === "none" ? "none" : "browser"} behavior="static" ratio={SHOT_RATIO} sizes={sizes} address={address} />
      {f.caption ? <figcaption className="slate text-bone-400">{f.caption}</figcaption> : null}
    </figure>
  );

  if (!phone) {
    return (
      <div className={`grid gap-[clamp(1.5rem,3vw,3rem)] ${shots.length > 1 ? "md:grid-cols-2" : "mx-auto w-full max-w-[880px]"}`}>
        {shots.map((f) => shot(f, shots.length > 1 ? "(min-width: 768px) 46vw, 92vw" : "(min-width: 768px) 60vw, 92vw"))}
      </div>
    );
  }

  if (shots.length === 0) {
    return (
      <div className="mx-auto w-[min(62vw,280px)]">
        <MediaFrame media={phone.media} chrome="phone" behavior="static" ratio={PHONE_RATIO} sizes="(min-width: 768px) 20vw, 62vw" />
      </div>
    );
  }

  return (
    <div className="mx-auto grid max-w-[1200px] items-center gap-[clamp(1.5rem,3vw,3rem)] md:grid-cols-12">
      <div className="grid gap-[clamp(1.5rem,3vw,3rem)] md:col-span-8">{shots.map((f) => shot(f, "(min-width: 768px) 56vw, 92vw"))}</div>
      <figure className="mx-auto grid w-[min(62vw,280px)] gap-3 md:col-span-4 md:w-full md:max-w-[300px]">
        <MediaFrame media={phone.media} chrome="phone" behavior="static" ratio={PHONE_RATIO} sizes="(min-width: 768px) 22vw, 62vw" />
        {phone.caption ? <figcaption className="slate text-center text-bone-400">{phone.caption}</figcaption> : null}
      </figure>
    </div>
  );
}
