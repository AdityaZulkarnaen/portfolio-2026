import { ViewTransition, type CSSProperties } from "react";

import { TransitionLink } from "@/components/site/transition-link";
import { accentOrDefault } from "@/lib/content/format";
import type { Metric, Project } from "@/lib/content/types";
import { projectVideo } from "@/lib/content/video-manifest";

import { WorkCardMedia } from "./work-card-media";

type Props = { projects: Project[]; metrics: Metric[]; total: number };

type Variant = "big" | "small" | "phone";
type Item = { project: Project; index: number; variant: Variant };
type Row = { kind: "big" | "small" | "phones"; items: Item[] };

/**
 * Rows from the ordered list: web projects cycle big, small, small (so the order reads
 * big / 2 small / big / …), consecutive mobile projects group into 3-up phone rows.
 */
function buildRows(projects: Project[]): Row[] {
  const rows: Row[] = [];
  let web = 0;
  projects.forEach((project, index) => {
    if (project.device === "mobile") {
      const last = rows.at(-1);
      const item: Item = { project, index, variant: "phone" };
      if (last?.kind === "phones" && last.items.length < 3 && last.items.at(-1)!.index === index - 1) last.items.push(item);
      else rows.push({ kind: "phones", items: [item] });
      return;
    }
    const variant: Variant = web % 3 === 0 ? "big" : "small";
    web++;
    rows.push({ kind: variant === "big" ? "big" : "small", items: [{ project, index, variant }] });
  });
  return rows;
}

const SIZES: Record<Variant, string> = {
  big: "(min-width: 768px) min(1440px, 140vh, 94vw), 94vw",
  small: "(min-width: 768px) 46vw, 94vw",
  phone: "(min-width: 768px) 16rem, 30vw",
};

/** One card: the media (desktop frame or phone shell), title and a one-line slate. */
function WorkCard({ project, index, variant }: Item) {
  const lead = index === 0;
  const phone = variant === "phone";
  return (
    <TransitionLink
      href={`/work/${project.slug}`}
      transition="to-case"
      className="group/card block rounded-[14px] focus-visible:outline-offset-8"
      data-cursor="view"
      data-cursor-label="Case"
      style={{ "--accent": accentOrDefault(project.accent) } as CSSProperties}
    >
      <div data-pose={index} data-settled="" className={`relative origin-center ${lead ? "z-10" : ""}`}>
        <ViewTransition name={`cover-${project.slug}`} share="morph" default="none">
          {phone ? (
            <div
              data-frame
              className="relative rounded-[clamp(18px,2.6vw,34px)] bg-[#101217] p-[clamp(4px,0.5vw,7px)] shadow-[inset_0_0_0_1px_rgb(255_255_255/0.12)] gl-plane:bg-transparent gl-plane:shadow-[inset_0_0_0_1px_rgb(255_255_255/calc(0.12*var(--dev,1))),inset_0_0_0_clamp(4px,0.5vw,7px)_rgb(16_18_23/var(--dev,1))]"
            >
              <div className="relative aspect-[9/19.5] overflow-hidden rounded-[clamp(14px,2.1vw,27px)]">
                <WorkCardMedia
                  cover={project.cover}
                  // The 16:9 film loop would be cropped to a sliver here; phone shells only take a portrait loop.
                  loop={projectVideo(project.slug, "phoneLoop")}
                  sizes={SIZES.phone}
                  label={project.name}
                  className="rounded-[clamp(14px,2.1vw,27px)]"
                />
              </div>
            </div>
          ) : (
            <div
              data-frame
              data-work-lead={lead ? "" : undefined}
              className={`relative overflow-hidden rounded-[14px] bg-ink-900 shadow-[inset_0_0_0_1px_var(--color-line)] gl-plane:bg-transparent gl-plane:shadow-[inset_0_0_0_1px_rgb(236_233_226/calc(0.12*var(--dev,1)))] ${
                variant === "big" ? "aspect-video md:aspect-[12/5]" : "aspect-[16/10]"
              }`}
            >
              <WorkCardMedia cover={project.cover} loop={project.loop} sizes={SIZES[variant]} label={project.name} />
            </div>
          )}
        </ViewTransition>
        <div data-pose-caption className={`flex items-start justify-between ${phone ? "mt-3 gap-2" : "mt-4 gap-6"}`}>
          <div className="min-w-0">
            <h3
              className={`leading-tight text-bone-100 transition-colors duration-(--dur-fast) group-hover/card:text-lilac-300 ${
                phone ? "text-[clamp(0.95rem,1.4vw,1.25rem)] tracking-[-0.01em]" : "text-[clamp(1.25rem,1.6vw,1.5rem)] tracking-[-0.02em]"
              }`}
            >
              {project.name}
            </h3>
            <p className={`slate mt-1.5 truncate text-bone-400 ${phone ? "max-md:text-[9px] max-md:tracking-[0.1em]" : ""}`}>
              {phone ? project.kind : `${project.kind} · ${project.role}`}
            </p>
          </div>
          {phone ? null : <Dots />}
        </div>
      </div>
    </TransitionLink>
  );
}

function Dots() {
  return (
    <svg viewBox="0 0 18 4" aria-hidden="true" className="mt-2.5 h-1 w-[18px] flex-none text-bone-400 transition-colors duration-(--dur-fast) group-hover/card:text-lilac-500">
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
      <div className="mx-auto w-full md:max-w-[min(85vw,1440px)]">
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
          {buildRows(projects).map((row) =>
            row.kind === "phones" ? (
              <li key={row.items[0].project.id} className="md:col-span-2">
                <ul className="mx-auto grid max-w-[52rem] grid-cols-3 gap-x-[clamp(0.75rem,4vw,4rem)]">
                  {row.items.map((item) => (
                    <li key={item.project.id}>
                      <WorkCard {...item} />
                    </li>
                  ))}
                </ul>
              </li>
            ) : (
              <li key={row.items[0].project.id} className={row.kind === "big" ? "md:col-span-2" : undefined}>
                <WorkCard {...row.items[0]} />
              </li>
            ),
          )}
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
