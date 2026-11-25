import type { CSSProperties } from "react";

import { SplitReveal } from "@/components/motion/split-reveal";
import { TransitionLink } from "@/components/site/transition-link";
import { accentOrDefault, framesFor, hostOf, reelNumber } from "@/lib/content/format";
import type { Project } from "@/lib/content/types";

import { EditorialGrid } from "./editorial-grid";
import { GridMotion } from "./grid-motion";

/** One reel in the homepage showcase: slate, title, summary, chips, then its frames. */
export function CaseArticle({ project, index }: { project: Project; index: number }) {
  const frames = framesFor(project.frames, "showcase");
  const accent = accentOrDefault(project.accent);
  const headingId = `case-${project.slug}-title`;

  return (
    <article
      id={`case-${project.slug}`}
      className="relative border-t border-line px-gutter pt-[clamp(4rem,9vw,9rem)] pb-[clamp(5rem,10vw,10rem)] before:absolute before:-top-px before:left-gutter before:h-px before:w-[clamp(80px,12vw,200px)] before:bg-(--accent)"
      aria-labelledby={headingId}
      style={{ "--accent": accent } as CSSProperties}
    >
      <header className="mb-[clamp(3rem,7vw,7rem)] grid gap-6 md:grid-cols-12 md:items-end md:gap-x-[4vw]">
        <p className="slate col-span-full flex flex-wrap gap-2.5 text-bone-400">
          <span className="text-(--accent)">Reel {reelNumber(index)}</span>
          <span aria-hidden="true">·</span>
          <span>{project.kind}</span>
          <span aria-hidden="true">·</span>
          <span>{project.year}</span>
        </p>
        <SplitReveal as="h3" id={headingId} className="display text-[clamp(3rem,9vw,10.5rem)] wrap-anywhere md:col-span-8" type="chars">
          {project.name}
        </SplitReveal>
        <div className="grid justify-items-start gap-5 md:col-span-4">
          <p className="max-w-[46ch] text-[clamp(1.05rem,1.3vw,1.3rem)] leading-normal text-pretty text-bone-400">{project.summary}</p>
          <dl className="flex flex-wrap gap-1.5">
            <div className="inline-flex min-h-7 items-center rounded-full bg-(--accent) px-3 font-mono text-[11px] tracking-[0.08em] text-ink-950 uppercase">
              <dt className="sr-only">Role</dt>
              <dd>{project.role}</dd>
            </div>
            {project.stack.slice(0, 5).map((tech) => (
              <div key={tech} className="chip">
                <dt className="sr-only">Stack</dt>
                <dd>{tech}</dd>
              </div>
            ))}
          </dl>
          <TransitionLink
            href={`/work/${project.slug}`}
            transition="to-case"
            className="group/vc inline-flex min-h-13 items-center gap-3.5 rounded-full bg-bone-100 pr-2 pl-5.5 font-semibold text-ink-950 transition-[background-color,gap] duration-(--dur-base) ease-fluid hover:gap-5 hover:bg-(--accent)"
            data-cursor="view"
            aria-label={`View case: ${project.name}`}
          >
            <span>View case</span>
            <svg viewBox="0 0 24 24" aria-hidden="true" className="size-10 rounded-full bg-ink-950 p-2.5 text-bone-100 transition-transform duration-(--dur-base) ease-fluid group-hover/vc:-rotate-45">
              <path d="M5 12h14M13 6l6 6-6 6" fill="none" stroke="currentColor" strokeWidth="1.5" />
            </svg>
          </TransitionLink>
        </div>
      </header>

      <GridMotion>
        <EditorialGrid
          frames={frames}
          address={hostOf(project.liveUrl)}
          coverTransitionName={`cover-${project.slug}`}
          poster={project.cover?.src}
        />
      </GridMotion>
    </article>
  );
}
