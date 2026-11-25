import { ViewTransition, type CSSProperties } from "react";

import { TransitionLink } from "@/components/site/transition-link";
import { accentOrDefault } from "@/lib/content/format";
import type { Metric, Project } from "@/lib/content/types";

import { WorkCardMedia } from "./work-card-media";

type Props = { projects: Project[]; metrics: Metric[]; total: number };

function Dots() {
  return (
    <svg viewBox="0 0 18 4" aria-hidden="true" className="mt-2.5 h-1 w-[18px] flex-none text-bone-400 transition-colors duration-(--dur-fast) group-hover/card:text-ember-500">
      <circle cx="2" cy="2" r="1.6" fill="currentColor" />
      <circle cx="9" cy="2" r="1.6" fill="currentColor" />
      <circle cx="16" cy="2" r="1.6" fill="currentColor" />
    </svg>
  );
}

/**
 * Featured works on the home page: the lead project full width, the rest in two columns.
 *
 * Motion lives in <HomeSequence>: the hero's reel frame zooms out into the lead card
 * (`data-work-lead`), the other cards start scattered (`data-pose`) and settle as they
 * scroll in. Without motion this is exactly the settled layout.
 */
export function Showcase({ projects, metrics, total }: Props) {
  if (projects.length === 0) return null;
  const years = projects.map((p) => p.year.slice(0, 4)).filter(Boolean).sort();
  const span = years.length === 0 ? "" : years[0] === years.at(-1) ? years[0] : `${years[0]}–${years.at(-1)}`;

  return (
    <section id="work" data-work aria-labelledby="work-title" className="relative overflow-x-clip px-gutter pt-[calc(var(--spacing-header)+clamp(1rem,3svh,2rem))] pb-[clamp(5rem,10vw,9rem)]">
      <div className="mx-auto w-full max-w-[min(100%,140svh,1440px)]">
        <header data-work-head className="mb-[clamp(1.75rem,4svh,3rem)] grid gap-x-[4vw] gap-y-8 md:grid-cols-12 md:items-end">
          <div className="md:col-span-6">
            <p className="slate text-bone-400">Featured works</p>
            <h2 id="work-title" className="mt-3 text-[clamp(2.5rem,min(4.6vw,9svh),5rem)] leading-[0.95] font-light tracking-[-0.04em] text-balance">
              selected work{span ? <span className="text-bone-400">, {span}</span> : null}
            </h2>
          </div>
          <dl className="grid grid-cols-2 gap-x-6 gap-y-6 sm:grid-cols-3 md:col-span-6">
            {metrics.map((m) => (
              <div key={m.label} className="flex flex-col-reverse gap-2 border-t border-line pt-4">
                <dt className="slate text-bone-400">{m.label}</dt>
                <dd className="text-[clamp(1.75rem,2.8vw,2.75rem)] leading-none font-light tracking-[-0.03em] text-bone-100">{m.value}</dd>
              </div>
            ))}
          </dl>
        </header>

        <ol className="grid gap-x-[clamp(1rem,2.4vw,2rem)] gap-y-[clamp(2.75rem,5vw,4.5rem)] md:grid-cols-2">
          {projects.map((project, i) => {
            const lead = i === 0;
            return (
              <li key={project.id} className={lead ? "md:col-span-2" : undefined} style={{ "--accent": accentOrDefault(project.accent) } as CSSProperties}>
                <TransitionLink
                  href={`/work/${project.slug}`}
                  transition="to-case"
                  className="group/card block rounded-[14px] focus-visible:outline-offset-8"
                  data-cursor="view"
                  data-cursor-label="Case"
                >
                  <div data-pose={i} data-settled="" className={`relative origin-center ${lead ? "z-10" : ""}`}>
                    <ViewTransition name={`cover-${project.slug}`} share="morph" default="none">
                      <div
                        data-frame
                        data-work-lead={lead ? "" : undefined}
                        className={`relative overflow-hidden rounded-[14px] bg-ink-800 gl-plane:bg-transparent ${lead ? "aspect-video md:aspect-[12/5]" : "aspect-[16/10]"}`}
                      >
                        <WorkCardMedia
                          cover={project.cover}
                          loop={project.loop}
                          sizes={lead ? "(min-width: 768px) min(1440px, 140vh, 94vw), 94vw" : "(min-width: 768px) 46vw, 94vw"}
                          label={project.name}
                        />
                      </div>
                    </ViewTransition>
                    <div data-pose-caption className="mt-4 flex items-start justify-between gap-6">
                      <div className="min-w-0">
                        <h3 className="text-[clamp(1.25rem,1.6vw,1.5rem)] leading-tight tracking-[-0.02em] text-bone-100 transition-colors duration-(--dur-fast) group-hover/card:text-ember-300">
                          {project.name}
                        </h3>
                        <p className="slate mt-1.5 truncate text-bone-400">
                          {project.kind} · {project.role}
                        </p>
                      </div>
                      <Dots />
                    </div>
                  </div>
                </TransitionLink>
              </li>
            );
          })}
        </ol>

        <p className="mt-[clamp(3rem,6vw,5rem)] flex justify-end">
          <TransitionLink href="/work" className="slate text-link" data-cursor="open">
            Full index · {total} projects
          </TransitionLink>
        </p>
      </div>
    </section>
  );
}
