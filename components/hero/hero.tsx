import type { Profile, Project, Reel } from "@/lib/content/types";
import { resolveReelSource } from "@/lib/content/video-manifest";

import { DevReelProbe } from "./dev-reel-probe";
import { HeroProjector, type HeroSlide } from "./hero-projector";
import { PlayReelButton } from "./play-reel-button";
import { Wordmark } from "./wordmark";

type Props = { profile: Profile | null; featured: Project[]; reel: Reel | null };

export function Hero({ profile, featured, reel }: Props) {
  const slides: HeroSlide[] = featured.map((p) => ({
    slug: p.slug,
    name: p.name,
    kind: p.kind,
    year: p.year,
    accent: p.accent,
    image:
      p.cover && p.cover.width && p.cover.height
        ? { src: p.cover.src, width: p.cover.width, height: p.cover.height, alt: p.cover.alt, lqip: p.cover.lqip }
        : null,
  }));
  const reelSource = reel ? resolveReelSource(reel.key) : null;
  const roles = profile?.roles ?? [];

  return (
    <section className="relative isolate grid min-h-[max(100svh,640px)] grid-cols-1 overflow-clip" aria-labelledby="hero-title">
      <HeroProjector slides={slides} />

      <div className="grid min-w-0 grid-cols-1 grid-rows-[1fr_auto] gap-8 px-gutter pt-[calc(var(--spacing-header)+2.5rem)] pb-[clamp(1.25rem,2.6vw,2.5rem)]">
        <div className="flex flex-wrap content-start items-start justify-between gap-x-8 gap-y-4">
          <p data-hero-after className="flex max-w-136 flex-wrap text-[clamp(1.05rem,1.6vw,1.5rem)] leading-tight font-medium">
            {roles.map((role, i) => (
              <span key={role}>
                {role}
                {i < roles.length - 1 ? (
                  <span className="mx-2 font-light text-ember-500" aria-hidden="true">
                    /
                  </span>
                ) : null}
              </span>
            ))}
          </p>
          {profile?.availability ? (
            <p data-hero-after className="slate inline-flex items-center gap-2.5">
              <span className="size-[7px] animate-pulse-ring rounded-full bg-tide-400 motion-off:animate-none" aria-hidden="true" />
              {profile.availability}
            </p>
          ) : null}
        </div>

        <div className="row-start-2 grid min-w-0 gap-[clamp(1rem,2vw,2rem)]">
          <div className="flex min-h-16 items-end justify-between gap-4">
            <a
              href="#work"
              data-hero-after
              className="slate group/cue inline-flex items-center gap-3.5 text-bone-400 transition-colors hover:text-bone-100"
            >
              <span className="relative h-11 w-px overflow-hidden bg-line" aria-hidden="true">
                <span className="absolute inset-0 -translate-y-full animate-cue bg-ember-500 motion-off:translate-y-0 motion-off:animate-none" />
              </span>
              Roll the reels
            </a>
            {reel && reelSource ? (
              <div data-hero-after>
                <PlayReelButton
                  src={reelSource.src}
                  poster={reelSource.poster}
                  title={reel.title}
                  chapters={reel.chapters.map((c) => ({ label: c.label, startS: c.startS }))}
                />
              </div>
            ) : process.env.NODE_ENV === "development" ? (
              <DevReelProbe />
            ) : null}
          </div>
          <div id="hero-title">
            <Wordmark top={profile?.wordmarkTop ?? "ADITYA"} bottom={profile?.wordmarkBottom ?? "ZULKARNAEN"} />
          </div>
        </div>
      </div>
    </section>
  );
}
