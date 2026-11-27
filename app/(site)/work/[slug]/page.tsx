import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { ViewTransition, type CSSProperties } from "react";

import { SplitReveal } from "@/components/motion/split-reveal";
import { RouteSignal } from "@/components/runtime/route-signal";
import { StageTint } from "@/components/runtime/stage-tint";
import { CaseGallery } from "@/components/showcase/case-gallery";
import { MediaFrame } from "@/components/showcase/media-frame";
import { Markup } from "@/components/site/markup";
import { PageTransition } from "@/components/site/page-transition";
import { TransitionLink } from "@/components/site/transition-link";
import { accentOrDefault, framesFor, hostOf, reelNumber } from "@/lib/content/format";
import { getAllProjects, getProject, getProjectSlugs } from "@/lib/content/queries";

const EMPTY_SLUG = "__none__";

/** ensureStatic = 'navigation' requires at least one complete param set. */
export async function generateStaticParams() {
  const slugs = await getProjectSlugs();
  return slugs.length > 0 ? slugs.map((slug) => ({ slug })) : [{ slug: EMPTY_SLUG }];
}

export async function generateMetadata({ params }: PageProps<"/work/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const project = slug === EMPTY_SLUG ? null : await getProject(slug);
  if (!project) return {};
  return {
    title: project.seoTitle ?? project.name,
    description: project.seoDescription ?? project.summary,
    openGraph: project.cover ? { images: [{ url: project.cover.src }] } : undefined,
  };
}

export default async function CasePage({ params }: PageProps<"/work/[slug]">) {
  const { slug } = await params;
  if (slug === EMPTY_SLUG) notFound();
  const [project, all] = await Promise.all([getProject(slug), getAllProjects()]);
  if (!project) notFound();

  const index = Math.max(0, all.findIndex((p) => p.slug === project.slug));
  const next = all.length > 1 ? all[(index + 1) % all.length] : null;
  const accent = accentOrDefault(project.accent);
  const host = hostOf(project.liveUrl);
  const coverFrame = project.frames.find((f) => f.isCover);
  const frames = framesFor(project.frames, "case").filter((f) => f.media.id !== project.cover?.id);
  const isPhone = project.device === "mobile";

  return (
    <PageTransition>
      <RouteSignal />
      <StageTint accent={accent} scope="page" />
      <article className="px-gutter pt-[calc(var(--spacing-header)+3rem)]" style={{ "--accent": accent } as CSSProperties} aria-labelledby="case-title">
        <header className="mb-[clamp(2.5rem,5vw,5rem)] grid gap-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <TransitionLink href="/work" transition="nav-back" className="slate text-link">
              ← Index
            </TransitionLink>
            <p className="slate text-bone-400">
              <span className="text-(--accent)">Reel {reelNumber(index)}</span> · {project.kind} · {project.year}
            </p>
          </div>
          <SplitReveal as="h1" id="case-title" className="display text-[clamp(3.2rem,11.5vw,14rem)] leading-[0.84] tracking-[-0.045em] wrap-anywhere" type="chars">
            {project.name}
          </SplitReveal>
          <p className="max-w-[40ch] text-[clamp(1.2rem,2vw,1.9rem)] leading-[1.3] tracking-[-0.01em] text-pretty text-bone-400">{project.summary}</p>
        </header>

        {project.cover ? (
          <div className={isPhone ? "mx-auto w-[min(70vw,300px)]" : "mx-auto max-w-[1100px]"}>
            <ViewTransition name={`cover-${project.slug}`} share="morph" default="none">
              <div>
                <MediaFrame
                  media={project.cover}
                  chrome={coverFrame?.frame ?? (isPhone ? "phone" : "browser")}
                  behavior="static"
                  ratio={isPhone ? 9 / 19.5 : Math.max(1.3, coverFrame?.ratio ?? 16 / 9)}
                  sizes={isPhone ? "(min-width: 768px) 22vw, 70vw" : "(min-width: 1200px) 1100px, 92vw"}
                  address={host}
                  preload
                  quality={85}
                />
              </div>
            </ViewTransition>
          </div>
        ) : null}

        <div className="grid gap-[clamp(2.5rem,5vw,5rem)] py-[clamp(4rem,8vw,8rem)] md:grid-cols-12 md:gap-x-[4vw]">
          <dl className="grid content-start md:col-span-4 [&>div]:grid [&>div]:grid-cols-[6rem_1fr] [&>div]:gap-4 [&>div]:border-t [&>div]:border-line [&>div]:py-4 [&_dt]:pt-0.5 [&_dt]:text-bone-400">
            <div>
              <dt className="slate">Year</dt>
              <dd>{project.year}</dd>
            </div>
            <div>
              <dt className="slate">Kind</dt>
              <dd>{project.kind}</dd>
            </div>
            <div>
              <dt className="slate">Role</dt>
              <dd>{project.role}</dd>
            </div>
            {project.client ? (
              <div>
                <dt className="slate">Client</dt>
                <dd>{project.client}</dd>
              </div>
            ) : null}
            {project.stack.length > 0 ? (
              <div>
                <dt className="slate">Stack</dt>
                <dd className="flex flex-wrap gap-1.5">
                  {project.stack.map((s) => (
                    <span key={s} className="chip">
                      {s}
                    </span>
                  ))}
                </dd>
              </div>
            ) : null}
            {project.liveUrl || project.repoUrl ? (
              <div>
                <dt className="slate">Links</dt>
                <dd className="grid gap-1.5">
                  {project.liveUrl ? (
                    <a href={project.liveUrl} target="_blank" rel="noreferrer" className="link-underline" data-cursor="open">
                      Live site{host ? ` · ${host}` : ""}
                    </a>
                  ) : null}
                  {project.repoUrl ? (
                    <a href={project.repoUrl} target="_blank" rel="noreferrer" className="link-underline" data-cursor="open">
                      Source code
                    </a>
                  ) : null}
                </dd>
              </div>
            ) : null}
          </dl>

          <div className="grid content-start gap-12 md:col-span-7 md:col-start-6">
            {project.body ? <Markup source={project.body} className="grid max-w-[62ch] gap-[1.2em] text-[clamp(1.15rem,1.5vw,1.45rem)] leading-normal" /> : null}
            {project.facts.length > 0 ? (
              <ul className="grid grid-cols-[repeat(auto-fit,minmax(10rem,1fr))] gap-6">
                {project.facts.map((f) => (
                  <li key={f.label} className="grid gap-1.5 border-t border-(--accent) pt-4">
                    <span className="display text-[clamp(2rem,3.5vw,3.5rem)]">{f.value}</span>
                    <span className="slate text-bone-400">{f.label}</span>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        </div>

        {frames.length > 0 ? (
          <div className="pb-[clamp(5rem,10vw,10rem)]">
            <CaseGallery frames={frames} address={host} />
          </div>
        ) : null}

        {next ? (
          <TransitionLink
            href={`/work/${next.slug}`}
            transition="to-case"
            className="group/next relative isolate -mx-gutter grid gap-4 overflow-hidden border-t border-line px-gutter py-[clamp(4rem,9vw,9rem)] before:absolute before:inset-0 before:-z-10 before:origin-bottom before:scale-y-0 before:bg-(--accent) before:transition-transform before:duration-800 before:ease-out-expo hover:text-ink-950 hover:before:scale-y-100 focus-visible:text-ink-950 focus-visible:before:scale-y-100"
            data-cursor="view"
            data-cursor-label="Next"
            style={{ "--accent": accentOrDefault(next.accent) } as CSSProperties}
          >
            <span className="slate opacity-70">Next project · {reelNumber((index + 1) % all.length)}</span>
            <span className="display max-w-[12ch] text-[clamp(3rem,11vw,13rem)] tracking-[-0.045em] wrap-anywhere">{next.name}</span>
            {next.cover ? (
              <ViewTransition name={`cover-${next.slug}`} share="morph" default="none">
                <span
                  className={`relative block shadow-[0_30px_60px_-30px_rgb(0_0_0/0.8)] md:absolute md:top-1/2 md:right-gutter md:-translate-y-1/2 md:rotate-3 md:transition-transform md:duration-900 md:ease-out-expo md:group-hover/next:-rotate-2 md:group-hover/next:scale-105 ${
                    next.device === "mobile"
                      ? "aspect-[9/19.5] w-[clamp(120px,13vw,200px)] rounded-[clamp(18px,2vw,30px)] bg-[#101217] p-[clamp(4px,0.45vw,7px)]"
                      : "aspect-[16/10] w-[clamp(180px,24vw,380px)] overflow-hidden rounded-[10px]"
                  }`}
                  aria-hidden="true"
                >
                  <span className={`relative block size-full overflow-hidden ${next.device === "mobile" ? "rounded-[clamp(14px,1.6vw,24px)]" : ""}`}>
                    <Image src={next.cover.src} alt="" fill sizes="(min-width: 768px) 24vw, 60vw" quality={60} className="object-cover object-top" />
                  </span>
                </span>
              </ViewTransition>
            ) : null}
            <span className="slate opacity-70">
              {next.kind} · {next.year}
            </span>
          </TransitionLink>
        ) : null}
      </article>
    </PageTransition>
  );
}
