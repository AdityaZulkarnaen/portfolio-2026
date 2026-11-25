import { RevealWords } from "@/components/motion/reveal-words";
import { SplitReveal } from "@/components/motion/split-reveal";
import { Markup } from "@/components/site/markup";
import type { Profile } from "@/lib/content/types";

import { PhotoStack } from "./photo-stack";

export function About({ profile }: { profile: Profile | null }) {
  if (!profile) return null;
  const photos = [...profile.portrait, ...profile.aboutPhotos];

  return (
    <section
      id="about"
      aria-labelledby="about-title"
      className="border-t border-line px-gutter pt-[clamp(6rem,14vw,14rem)] pb-[clamp(4rem,8vw,8rem)]"
    >
      <div className="grid gap-[clamp(3rem,6vw,6rem)] md:grid-cols-12 md:gap-x-[4vw]">
        <div className="md:sticky md:top-[calc(var(--spacing-header)+3rem)] md:col-span-4 md:self-start">
          <PhotoStack photos={photos} name={profile.fullName} />
        </div>

        <div className="grid content-start gap-[clamp(2rem,4vw,3.5rem)] md:col-span-8">
          <SplitReveal
            as="h2"
            id="about-title"
            type="lines"
            className="display text-[clamp(3rem,8.4vw,9.5rem)] [&_.hl]:text-[1.1em] [&_.hl]:leading-[0.8]"
          >
            Behind the <em className="hl">projector</em>
          </SplitReveal>
          <RevealWords className="grid gap-[1.2em] text-[clamp(1.45rem,2.7vw,2.9rem)] leading-[1.16] font-medium tracking-[-0.02em] text-pretty">
            {profile.bio.map((p, i) => (
              <Markup key={i} source={p} />
            ))}
          </RevealWords>
          <p className="max-w-[58ch] text-[clamp(1rem,1.2vw,1.15rem)] leading-relaxed text-bone-400">{profile.headline}</p>
          <div className="flex flex-wrap items-center justify-between gap-6 border-t border-line pt-8">
            <ul className="flex flex-wrap gap-x-6 gap-y-1.5" aria-label="Roles">
              {profile.roles.map((r) => (
                <li key={r} className="slate inline-flex items-center gap-2.5">
                  <span className="size-1.5 rounded-full bg-ember-500" aria-hidden="true" />
                  {r}
                </li>
              ))}
            </ul>
            {profile.resumePath ? (
              <a href={profile.resumePath} target="_blank" rel="noreferrer" className="pill-btn group/pb" data-cursor="open">
                <span>Resume</span>
                <span className="slate text-bone-400 group-hover/pb:text-ink-800">PDF</span>
              </a>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}
