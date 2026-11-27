import Image from "next/image";

import { PlaneWindow } from "@/components/showcase/plane-window";
import { DEV_MASK, PLANE_MEDIA } from "@/components/showcase/plane-classes";
import { SectionHead } from "@/components/site/section-head";
import { hostOf, monthYear } from "@/lib/content/format";
import type { Experience as ExperienceItem, Media, Project } from "@/lib/content/types";

import { ExperienceScenes, Tenure } from "./experience-scenes";

/** "BOT Launchpad: no-code deployment…" → lead + rest, so project names scan first. */
function splitLead(text: string): [string | null, string] {
  const at = text.indexOf(": ");
  return at > 0 && at <= 32 ? [text.slice(0, at), text.slice(at + 2)] : [null, text];
}

type Site = { key: string; label: string; href: string };

type Visual =
  | { kind: "covers"; slugs: string[] }
  | { kind: "ship"; figure: string; of: string; caption: string; note: string; sites: Site[] }
  | { kind: "dossier"; file: string }
  | { kind: "collage"; photo: string; app: string };

const VISUALS: Record<string, Visual> = {
  "freelance-full-stack-developer": {
    kind: "covers",
    slugs: ["ugm-cup-2026", "civil-in-action-14th", "society-of-petroleum-engineer-ugm"],
  },
  "mobile-front-end-developer-katy-sman-1-yk": { kind: "collage", photo: "satel", app: "satu-teladan-apk" },
  "junior-project-builder-intern-girl-meets-tech": {
    kind: "ship",
    figure: "4",
    of: "4",
    caption: "MVPs on BOT Chain mainnet",
    note: "80+ Solidity tests",
    sites: [
      { key: "gmt-botlaunchpad", label: "BOT Launchpad", href: "https://botlaunchpad.vercel.app/" },
      { key: "gmt-instantblog", label: "InstantBlog", href: "https://www.instantblog.my.id/" },
      { key: "gmt-gitaura", label: "GitAura", href: "https://www.gitaura-bot.my.id/" },
      { key: "gmt-abi-studio", label: "ABI Studio", href: "https://abi-studio-botchain.vercel.app/" },
    ],
  },
  "software-programmer-gamaforce": { kind: "dossier", file: "04" },
};

type Shot = { media: Media; name: string; year: string; position?: string };

function focus(media: Media, fallback: string) {
  return media.focalX != null && media.focalY != null ? `${media.focalX * 100}% ${media.focalY * 100}%` : fallback;
}

/** The four dApps as small browser prints, 2 × 2, developing one after another. */
function Browsers({ sites }: { sites: (Site & { media: Media })[] }) {
  return (
    <ul className="grid h-full min-h-0 grid-cols-2 gap-3 lg:grid-rows-2" aria-label="Shipped dApps">
      {sites.map((site) => (
        <li key={site.key} className="grid min-h-0 min-w-0 grid-cols-1 grid-rows-[1fr_auto] gap-2">
          <div
            data-frame
            data-reel-frame
            className="relative grid min-h-0 grid-rows-[auto_1fr] overflow-hidden rounded-[8px] bg-ink-950 shadow-[inset_0_0_0_1px_var(--color-line)] max-lg:aspect-[16/11] gl-plane:bg-transparent"
          >
            <span className="slate truncate border-b border-line bg-ink-950 px-2.5 py-1.5 text-[9px] tracking-[0.12em] text-bone-400 normal-case">
              {hostOf(site.href)}
            </span>
            <div className="relative min-h-0">
              <PlaneWindow className="absolute inset-0 overflow-hidden rounded-b-[8px] bg-ink-950 gl-plane:bg-transparent" behavior="static">
                <Image
                  src={site.media.src}
                  alt={site.media.alt || site.label}
                  fill
                  sizes="(min-width: 1024px) 19vw, 46vw"
                  quality={75}
                  data-reel-img
                  className={`object-cover ${PLANE_MEDIA} ${DEV_MASK}`}
                  style={{ objectPosition: "50% 0%" }}
                />
              </PlaneWindow>
            </div>
          </div>
          <a
            href={site.href}
            target="_blank"
            rel="noreferrer"
            data-cursor="open"
            data-xp-line
            className="slate truncate text-bone-400 transition-colors duration-(--dur-fast) hover:text-bone-100"
          >
            {site.label} ↗
          </a>
        </li>
      ))}
    </ul>
  );
}

/**
 * Team photo developing through the GL wave, the app in a phone frame laid over its edge.
 * The phone is DOM (it sits above the canvas, so it layers over the photo's plane) and
 * drifts on its own (`data-reel-phone`). Both share one grid cell, so the photo frame's
 * offset parent stays the card, as the plane's pose measurement expects.
 */
function Collage({ photo, app }: { photo: Media; app: Project | undefined }) {
  return (
    <div className="grid h-full min-h-0 grid-cols-12 grid-rows-1 max-lg:pb-[30%]">
      <figure className="col-[1/13] row-start-1 grid min-h-0 grid-cols-1 gap-2 self-start lg:col-[1/9] lg:self-center">
        <div data-frame data-reel-frame className="relative aspect-[4/3] overflow-hidden rounded-[8px] bg-ink-950 gl-plane:bg-transparent">
          <PlaneWindow className="absolute inset-0 overflow-hidden rounded-[8px] bg-ink-950 gl-plane:bg-transparent" behavior="static">
            <Image
              src={photo.src}
              alt={photo.alt || "The team at work"}
              fill
              sizes="(min-width: 1024px) 26vw, 92vw"
              quality={75}
              placeholder={photo.lqip ? "blur" : "empty"}
              blurDataURL={photo.lqip ?? undefined}
              data-reel-img
              className={`object-cover ${PLANE_MEDIA} ${DEV_MASK}`}
              style={{ objectPosition: focus(photo, "50% 45%") }}
            />
          </PlaneWindow>
        </div>
        <figcaption data-xp-line className="slate flex justify-between gap-3 text-bone-400 max-lg:justify-end">
          <span className="min-w-0 truncate">Team · KATY SMAN 1 Yogyakarta</span>
        </figcaption>
      </figure>
      {app?.cover ? (
        <div
          data-reel-frame
          data-reel-phone
          className="relative z-10 col-[1/5] row-start-1 self-end max-lg:ml-3 max-lg:translate-y-[38%] lg:col-[8/13] lg:h-[88%] lg:self-center lg:justify-self-end"
        >
          <div className="h-full rounded-[clamp(16px,2.2vw,30px)] bg-[#101217] p-[clamp(4px,0.45vw,7px)] shadow-[inset_0_0_0_1px_rgb(255_255_255/0.12),0_24px_60px_-18px_rgb(0_0_0/0.8)]">
            <div className="relative aspect-[9/19.5] overflow-hidden rounded-[clamp(12px,1.8vw,24px)] lg:h-full">
              <Image
                src={app.cover.src}
                alt={app.cover.alt || app.name}
                fill
                sizes="(min-width: 1024px) 12vw, 30vw"
                quality={75}
                className={`object-cover object-top ${DEV_MASK}`}
              />
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function Shots({ shots }: { shots: Shot[] }) {
  const trio = shots.length >= 3;
  return (
    <div className={`grid h-full min-h-0 gap-3 ${trio ? "grid-cols-2 lg:grid-rows-[1.7fr_1fr]" : ""}`}>
      {shots.map((shot, i) => (
        <figure key={shot.media.id} className={`grid min-h-0 min-w-0 grid-cols-1 grid-rows-[1fr_auto] gap-2 ${trio && i === 0 ? "col-span-2" : ""}`}>
          <div
            data-frame
            data-reel-frame
            className={`relative min-h-0 overflow-hidden rounded-[8px] bg-ink-950 gl-plane:bg-transparent ${
              trio && i > 0 ? "max-lg:aspect-[16/11]" : "max-lg:aspect-[16/10]"
            }`}
          >
            <PlaneWindow className="absolute inset-0 overflow-hidden rounded-[8px] bg-ink-950 gl-plane:bg-transparent" behavior="static">
              <Image
                src={shot.media.src}
                alt={shot.media.alt || shot.name}
                fill
                sizes={trio && i > 0 ? "(min-width: 1024px) 19vw, 46vw" : "(min-width: 1024px) 38vw, 92vw"}
                quality={75}
                placeholder={shot.media.lqip ? "blur" : "empty"}
                blurDataURL={shot.media.lqip ?? undefined}
                data-reel-img
                className={`object-cover ${PLANE_MEDIA} ${DEV_MASK}`}
                style={{ objectPosition: focus(shot.media, shot.position ?? "50% 0%") }}
              />
            </PlaneWindow>
          </div>
          <figcaption data-xp-line className="slate flex justify-between gap-3 text-bone-400 tabular-nums">
            <span className="min-w-0 truncate">{shot.name}</span>
            <span className="shrink-0">{shot.year}</span>
          </figcaption>
        </figure>
      ))}
    </div>
  );
}

const GRAPHIC = `relative grid h-full min-h-[22rem] overflow-hidden rounded-[8px] bg-ink-950 p-[clamp(1.25rem,2vw,2rem)] shadow-[inset_0_0_0_1px_var(--color-line)] ${DEV_MASK}`;

function Hairline({ className = "" }: { className?: string }) {
  return (
    <div aria-hidden="true" className={`relative h-px bg-line-strong ${className}`}>
      <span className="absolute top-1/2 left-0 size-[5px] -translate-1/2 rounded-full bg-bone-100" />
      <span className="absolute top-1/2 right-0 size-[5px] translate-x-1/2 -translate-y-1/2 rounded-full bg-bone-100" />
    </div>
  );
}

function ShipLog({ visual, nodes }: { visual: Extract<Visual, { kind: "ship" }>; nodes: string[] }) {
  return (
    <div data-frame data-reel-frame className={`${GRAPHIC} grid-rows-[auto_1fr_auto] gap-6`}>
      <div className="slate flex justify-between gap-4 text-bone-400">
        <span>Ship log</span>
        <span>One-week cycles</span>
      </div>
      <div className="self-center">
        <p className="text-[min(11vw,26vh)] leading-[0.8] font-light tracking-[-0.07em] text-bone-100 tabular-nums">
          {visual.figure}
          <span className="text-bone-400">/{visual.of}</span>
        </p>
        <p className="slate mt-4 text-bone-100">{visual.caption}</p>
      </div>
      <div>
        <ol className="grid grid-cols-4 gap-2" aria-label="Shipped">
          {nodes.map((n, i) => (
            <li key={n} className="grid gap-2">
              <span className="slate text-bone-400 tabular-nums">W{i + 1}</span>
              <span aria-hidden="true" className="h-6 w-px bg-line-strong" />
              <span className="text-[0.82rem] leading-tight text-bone-100">{n}</span>
            </li>
          ))}
        </ol>
        <Hairline className="mt-4" />
        <p className="slate mt-3 text-right text-bone-400">{visual.note}</p>
      </div>
    </div>
  );
}

const REDACT = "h-[0.9em] origin-left bg-ink-950 [scale:clamp(0,calc((var(--dev,1)-0.45)*3),1)_1]";

/** The GCS is confidential: a synthetic dossier (map grid, flight hairlines, redactions), no real screens. */
function Dossier({ visual, stack }: { visual: Extract<Visual, { kind: "dossier" }>; stack: string[] }) {
  return (
    <div
      data-frame
      data-reel-frame
      role="img"
      aria-label="Confidential: the ground control station is not shown"
      className={`${GRAPHIC} grid-rows-[auto_1fr_auto] gap-4`}
    >
      <div className="slate flex justify-between gap-4 text-bone-400">
        <span className="text-bone-100">File {visual.file}</span>
        <span>Clearance: team only</span>
      </div>
      <div className="relative min-h-0">
        <svg viewBox="0 0 400 220" preserveAspectRatio="xMidYMid slice" aria-hidden="true" className="absolute inset-0 size-full">
          <g stroke="var(--color-line)" strokeWidth="1" vectorEffect="non-scaling-stroke">
            {Array.from({ length: 11 }, (_, i) => (
              <path key={`v${i}`} d={`M${i * 40} 0V220`} />
            ))}
            {Array.from({ length: 6 }, (_, i) => (
              <path key={`h${i}`} d={`M0 ${i * 44}H400`} />
            ))}
          </g>
          <g fill="none" stroke="var(--color-line-strong)" strokeWidth="1" vectorEffect="non-scaling-stroke">
            <path d="M-10 150C60 120 90 170 150 140S250 70 310 100 380 90 410 70" />
            <path d="M-10 180C70 150 110 196 170 168S260 110 320 132 390 126 410 110" />
            <path d="M40 -10C70 40 50 80 90 120" />
          </g>
          <path
            d="M48 176L112 96L196 124L262 52L344 84"
            fill="none"
            stroke="var(--color-bone-100)"
            strokeWidth="1.25"
            strokeDasharray="5 5"
            vectorEffect="non-scaling-stroke"
          />
          <g fill="none" stroke="var(--color-bone-100)" strokeWidth="1" vectorEffect="non-scaling-stroke">
            {[
              [48, 176],
              [112, 96],
              [196, 124],
              [262, 52],
              [344, 84],
            ].map(([x, y]) => (
              <circle key={`${x}-${y}`} cx={x} cy={y} r="5" />
            ))}
            <path d="M344 66V102M326 84H362" stroke="var(--color-lilac-500)" />
          </g>
        </svg>
        <p className="slate absolute top-2 left-2 text-bone-400 tabular-nums">Grid ██-██ · Alt ███ m</p>
        <p className="absolute top-1/2 left-1/2 -translate-1/2 -rotate-[9deg] rounded-[4px] px-3 py-2 font-label text-[clamp(0.7rem,1vw,0.95rem)] font-medium tracking-[0.16em] whitespace-nowrap text-lilac-500 uppercase shadow-[inset_0_0_0_1.5px_var(--color-lilac-500)]">
          Confidential · Gamaforce GCS
        </p>
      </div>
      <div className="grid gap-2 rounded-[6px] bg-bone-100 px-4 py-3.5 font-label text-[0.72rem] leading-none tracking-[0.04em] text-ink-950/70 uppercase">
        <p className="flex items-center gap-2">
          System: ground control station <span className={`${REDACT} w-[28%]`} />
        </p>
        <p className="flex items-center gap-2">
          <span className={`${REDACT} w-[62%]`} /> Redacted
        </p>
        <p className="flex items-center gap-2">
          Stack: {stack.slice(0, 3).join(" · ")}
        </p>
        <p className="flex items-center gap-2">
          <span className={`${REDACT} w-[18%]`} /> Mission <span className={`${REDACT} w-[40%]`} />
        </p>
      </div>
    </div>
  );
}

/**
 * Experience as full-screen scenes: one role per screen, current roles first, then most
 * recent start. Motion and layout live in <ExperienceScenes>; periods read as months
 * ("Mar 2025 — Present") with the tenure beside them.
 */
export function Experience({
  items,
  projects,
  media,
}: {
  items: ExperienceItem[];
  projects: Project[];
  media: Record<string, Media>;
}) {
  if (items.length === 0) return null;
  const sorted = [...items].sort(
    (a, b) => Number(b.endDate === null) - Number(a.endDate === null) || b.startDate.localeCompare(a.startDate),
  );
  const bySlug = new Map(projects.map((p) => [p.slug, p]));
  const total = String(sorted.length).padStart(2, "0");

  const rail = (
    <ol
      aria-hidden="true"
      className="absolute inset-x-gutter top-[calc(var(--spacing-header)+1.5rem)] z-10 hidden grid-cols-[repeat(var(--xp-n),minmax(0,1fr))] gap-3 motion-on:lg:grid"
    >
      {sorted.map((item, i) => (
        <li key={item.id} data-xp-label className="grid gap-2.5 opacity-40 first:opacity-100">
          <span className="relative h-px overflow-hidden bg-line-strong">
            <span data-xp-bar className="absolute inset-0 origin-left scale-x-0 bg-bone-100" />
          </span>
          <span className="slate truncate text-bone-100 tabular-nums">
            {String(i + 1).padStart(2, "0")} <span className="text-bone-400">· {item.org.split(" · ")[0]}</span>
          </span>
        </li>
      ))}
    </ol>
  );

  return (
    <section id="experience" aria-labelledby="exp-title" className="border-t border-line">
      <SectionHead
        id="exp-title"
        variant="booth"
        kicker="Career"
        title="experience"
        lede="Internship, freelance and team work, most recent first."
      />
      <ExperienceScenes count={sorted.length} rail={rail}>
        {sorted.map((item, i) => {
          const [org, place] = item.org.split(" · ");
          const visual = VISUALS[item.slug];
          const shots: Shot[] =
            visual?.kind === "covers"
              ? visual.slugs.flatMap((slug) => {
                  const p = bySlug.get(slug);
                  return p?.cover ? [{ media: p.cover, name: p.name, year: p.year }] : [];
                })
              : [];
          const sites =
            visual?.kind === "ship" ? visual.sites.flatMap((site) => (media[site.key] ? [{ ...site, media: media[site.key] }] : [])) : [];
          const highlights = item.highlights.slice(0, 4).map(splitLead);
          const from = monthYear(item.startDate);
          const to = monthYear(item.endDate);
          return (
            <li
              key={item.id}
              data-xp-panel
              aria-labelledby={`xp-${item.slug}`}
              className="relative border-t border-line px-gutter py-[clamp(2.5rem,8vw,4rem)] lg:h-svh lg:pt-[calc(var(--spacing-header)+5.5rem)] lg:pb-[clamp(1.5rem,4svh,3rem)] motion-on:lg:absolute motion-on:lg:inset-0 motion-on:lg:border-t-0 motion-on:lg:not-first:invisible"
            >
              <div className="grid h-full min-h-0 grid-cols-1 gap-8 lg:grid-cols-12 lg:gap-x-[4vw]">
                <div className="flex min-h-0 flex-col gap-5 lg:col-span-6">
                  <div data-xp-line className="grid gap-3">
                    <p className="slate text-bone-400 tabular-nums motion-on:lg:hidden">
                      {String(i + 1).padStart(2, "0")} / {total}
                    </p>
                    <p aria-label={`${from} to ${to}`} className="grid leading-[0.9] font-light tracking-[-0.05em]">
                      <span className="text-[clamp(2.75rem,min(5.4vw,11svh),6.25rem)] text-bone-100">{from}</span>
                      <span className="text-[clamp(1.5rem,min(2.8vw,5.5svh),3.25rem)] text-bone-400">
                        — <span className={item.endDate ? "" : "text-lilac-500"}>{to}</span>
                      </span>
                    </p>
                    <p className="slate text-bone-400"><Tenure start={item.startDate} end={item.endDate} /></p>
                  </div>
                  <div className="mt-auto grid gap-4">
                    <header data-xp-line className="grid gap-2">
                      <h3
                        id={`xp-${item.slug}`}
                        className="text-[clamp(1.75rem,min(2.8vw,6svh),3.25rem)] leading-[0.98] font-light tracking-[-0.04em] text-balance text-bone-100 lowercase"
                      >
                        {item.role}
                      </h3>
                      <p className="slate text-bone-400">
                        @ <span className="text-bone-100">{org}</span>
                        {place ? ` · ${place}` : null}
                      </p>
                    </header>
                    {item.summary ? (
                      <p data-xp-line className="max-w-[62ch] leading-snug text-pretty text-bone-100">
                        {item.summary}
                      </p>
                    ) : null}
                    {highlights.length > 0 ? (
                      <ul data-xp-line className="grid gap-x-6 gap-y-2.5 text-[0.875rem] leading-snug text-bone-400 sm:grid-cols-2">
                        {highlights.map(([lead, rest]) => (
                          <li key={rest} className="grid grid-cols-[0.875rem_1fr] gap-x-1.5">
                            <span aria-hidden="true" className="mt-[0.65em] h-px w-2 bg-line-strong" />
                            <span className="lg:line-clamp-3">
                              {lead ? <span className="text-bone-100">{lead} · </span> : null}
                              {rest}
                            </span>
                          </li>
                        ))}
                      </ul>
                    ) : null}
                    {item.stack.length > 0 ? (
                      <ul data-xp-line className="slate flex flex-wrap gap-x-4 gap-y-1 text-bone-400" aria-label="Stack">
                        {item.stack.map((s) => (
                          <li key={s}>{s}</li>
                        ))}
                      </ul>
                    ) : null}
                  </div>
                </div>
                <div className="min-h-0 max-lg:order-first lg:col-span-6">
                  {visual?.kind === "collage" && media[visual.photo] ? (
                    <Collage photo={media[visual.photo]} app={bySlug.get(visual.app)} />
                  ) : shots.length > 0 ? (
                    <Shots shots={shots} />
                  ) : sites.length > 0 ? (
                    <Browsers sites={sites} />
                  ) : visual?.kind === "ship" ? (
                    <ShipLog visual={visual} nodes={highlights.map(([lead, rest]) => lead ?? rest.split(" ").slice(0, 2).join(" "))} />
                  ) : visual?.kind === "dossier" ? (
                    <Dossier visual={visual} stack={item.stack} />
                  ) : null}
                </div>
              </div>
            </li>
          );
        })}
      </ExperienceScenes>
    </section>
  );
}
