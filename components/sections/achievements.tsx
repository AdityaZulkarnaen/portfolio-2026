import { existsSync } from "node:fs";
import { join } from "node:path";

import Image from "next/image";
import type { CSSProperties } from "react";

import { PlaneWindow } from "@/components/showcase/plane-window";
import { DEV_MASK, PLANE_MEDIA } from "@/components/showcase/plane-classes";
import { Markup } from "@/components/site/markup";
import { SectionHead } from "@/components/site/section-head";
import type { Achievement, AchievementKind, Media, Project } from "@/lib/content/types";

import { TrophyWall } from "./trophy-wall";

const KIND: Record<AchievementKind, string> = {
  award: "Award",
  competition: "Competition",
  certification: "Certification",
  education: "Education",
  organization: "Organisation",
};

const PHOTOS: Record<string, string> = {
  "monad-blitz-v2": "depths",
  "monad-blitz-hackathon-2026": "vista",
  "gdgoc-ugm-hackathon-2026": "tbxpert",
};

/** Owner photos (supabase/seed/assets/achievements/<key>.*), used when present. */
const OWNER_PHOTOS: Record<string, string> = {
  "krti-2025": "krti-2025",
  "pkm-kc-2026": "pkm-2026",
  "monad-blitz-v2": "monad-blitz-v2",
  "monad-blitz-hackathon-2026": "monad-blitz-2026",
  "gdgoc-ugm-hackathon-2026": "gdgoc-2026",
};

type Photo = { media: Media; name: string; position: string; own: boolean; lift?: number };

/**
 * Owner prints that sit too low in the portrait card (a landscape photo, so object-position
 * can't move it): the picture is raised by this fraction of the card, cropping its top, so
 * the faces clear the caption. The GL plane reads the image box, so the develop follows.
 */
const OWNER_LIFT: Record<string, number> = { "pkm-kc-2026": 0.26 };

/** A team or school logo dropped in public/crew as `<slug>.svg|png|webp`; null until there is one. */
function crewLogo(slug: string): string | null {
  for (const ext of ["svg", "png", "webp"]) {
    if (existsSync(join(process.cwd(), "public", "crew", `${slug}.${ext}`))) return `/crew/${slug}.${ext}`;
  }
  return null;
}

/** Placeholder mark: "Universitas Gadjah Mada" → "UGM", "GDGoC UGM" → "GU". */
function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter((w) => /^[A-Za-z]/.test(w))
    .map((w) => w[0].toUpperCase())
    .join("")
    .slice(0, 3);
}

type Glyph = "pulse" | "wing";

const GLYPHS: Record<string, Glyph> = {
  "pkm-kc-2026": "pulse",
  "krti-2025": "wing",
};

/** Height and drop of each card as a share of the strip, cycled. */
const RHYTHM = [
  { h: 84, mt: 8 },
  { h: 100, mt: 0 },
  { h: 90, mt: 6 },
  { h: 80, mt: 16 },
  { h: 98, mt: 2 },
  { h: 78, mt: 20 },
];

/** "2nd Place, Monad Blitz V2" → ["2nd Place", "Monad Blitz V2"]. */
function splitTitle(title: string): [string | null, string] {
  const at = title.indexOf(", ");
  return at > 0 ? [title.slice(0, at), title.slice(at + 2)] : [null, title];
}

function Pulse() {
  const beat = "c6 0 8-2 12-22s6-22 10-2 4 10 8 8 6-4 10 0 8 16 30 16";
  return (
    <svg viewBox="0 0 300 120" preserveAspectRatio="none" aria-hidden="true" className="size-full">
      <path d="M0 96H300" stroke="var(--color-line-strong)" strokeWidth="1" vectorEffect="non-scaling-stroke" />
      {[0, 75, 150, 225, 300].map((x) => (
        <path key={x} d={`M${x} 90V102`} stroke="var(--color-line-strong)" strokeWidth="1" vectorEffect="non-scaling-stroke" />
      ))}
      <path
        d={`M0 80${beat.replace(/^c/, " c")} ${beat} ${beat} ${beat}`}
        fill="none"
        stroke="var(--color-bone-100)"
        strokeWidth="1.25"
        vectorEffect="non-scaling-stroke"
        transform="translate(0 -6)"
      />
    </svg>
  );
}

function Wing() {
  return (
    <svg viewBox="0 0 300 150" aria-hidden="true" className="size-full">
      <g fill="none" stroke="var(--color-bone-100)" strokeWidth="1.25" vectorEffect="non-scaling-stroke" strokeLinejoin="round">
        <path d="M150 18 L272 84 L262 96 L196 78 L150 92 L104 78 L38 96 L28 84 Z" />
        <path d="M150 18 V92" strokeDasharray="3 4" stroke="var(--color-line-strong)" />
        {[
          [92, 52],
          [208, 52],
          [74, 88],
          [226, 88],
        ].map(([cx, cy]) => (
          <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r="11" stroke="var(--color-line-strong)" />
        ))}
      </g>
      <g stroke="var(--color-line-strong)" strokeWidth="1" vectorEffect="non-scaling-stroke" fill="none">
        {Array.from({ length: 6 }, (_, i) => (
          <rect key={i} x={45 + i * 36} y={116} width="30" height="22" />
        ))}
      </g>
      <path d="M45 127H261" stroke="var(--color-lilac-500)" strokeWidth="1" vectorEffect="non-scaling-stroke" strokeDasharray="2 5" />
    </svg>
  );
}

function Visual({ item, photo }: { item: Achievement; photo: Photo | null }) {
  if (photo) {
    return (
      <div
        data-frame
        data-trophy-frame
        className="relative aspect-[16/10] overflow-hidden rounded-[8px] bg-ink-950 gl-plane:bg-transparent lg:motion-on:aspect-auto lg:motion-on:min-h-0 lg:motion-on:flex-1"
      >
        <PlaneWindow className="absolute inset-0 overflow-hidden rounded-[8px] bg-ink-950 gl-plane:bg-transparent" behavior="static">
          <Image
            src={photo.media.src}
            alt={photo.media.alt || photo.name}
            fill
            sizes="(min-width: 1024px) 30vw, 82vw"
            quality={75}
            placeholder={photo.media.lqip ? "blur" : "empty"}
            blurDataURL={photo.media.lqip ?? undefined}
            className={`object-cover ${PLANE_MEDIA} ${DEV_MASK}`}
            style={{
              objectPosition:
                photo.media.focalX != null && photo.media.focalY != null
                  ? `${photo.media.focalX * 100}% ${photo.media.focalY * 100}%`
                  : photo.position,
            }}
          />
        </PlaneWindow>
        <span className="slate absolute bottom-2 left-2.5 text-bone-100 [text-shadow:0_1px_6px_rgb(0_0_0/0.6)]">{photo.name}</span>
      </div>
    );
  }
  const glyph = GLYPHS[item.slug];
  if (!glyph) return <div className="lg:motion-on:flex-1" />;
  return (
    <div
      data-frame
      data-trophy-frame
      className={`grid aspect-[16/9] place-items-center rounded-[8px] px-3 py-4 shadow-[inset_0_0_0_1px_var(--color-line)] lg:motion-on:aspect-auto lg:motion-on:min-h-0 lg:motion-on:flex-1 ${DEV_MASK}`}
    >
      <div className="size-full max-h-[11rem]">{glyph === "pulse" ? <Pulse /> : <Wing />}</div>
    </div>
  );
}

function Slate({ item, index, total }: { item: Achievement; index: number; total: number }) {
  return (
    <div className="slate flex justify-between gap-3 text-bone-400 tabular-nums">
      <span className="text-bone-100">
        No. {String(index + 1).padStart(2, "0")} / {String(total).padStart(2, "0")}
      </span>
      <span>{KIND[item.kind]}</span>
    </div>
  );
}

function Caption({ item, clamp }: { item: Achievement; clamp: boolean }) {
  const [category, event] = splitTitle(item.title);
  return (
    <>
      <div className="grid gap-2">
        <p className="slate text-bone-100 tabular-nums">
          {(category
            ? [category, event, event?.includes(item.period ?? "\u0000") ? null : item.period]
            : [item.org, item.period]
          )
            .filter(Boolean)
            .join(" · ")}
        </p>
        <h3 className="text-[clamp(1.35rem,1.7vw,1.85rem)] leading-[1.02] font-light tracking-[-0.03em] text-balance text-bone-100 lowercase">
          {item.url ? (
            <a href={item.url} target="_blank" rel="noreferrer" className="link-underline" data-cursor="open">
              {event}
            </a>
          ) : (
            event
          )}
        </h3>
        {category && item.org ? <p className="slate text-bone-400">{item.org}</p> : null}
      </div>
      {item.summary ? (
        <Markup
          source={item.summary}
          className={`text-[0.875rem] leading-snug text-pretty text-bone-400 [&_.hl]:font-sans [&_.hl]:text-bone-100 [&_.hl]:not-italic ${
            clamp ? "line-clamp-3" : "lg:motion-on:line-clamp-3"
          }`}
        />
      ) : null}
    </>
  );
}

const SLOT = "shrink-0 snap-start lg:motion-on:grid lg:motion-on:h-full lg:motion-on:grid-rows-[var(--mt)_var(--h)]";

type TrophyProps = { item: Achievement; index: number; total: number; photo: Photo | null };

/** An owner photo: a portrait print, full bleed, the text on a gradient at its foot. */
function PortraitTrophy({ item, index, total, photo }: TrophyProps & { photo: Photo }) {
  const rhythm = RHYTHM[index % RHYTHM.length];
  return (
    <li data-trophy-slot className={SLOT} style={{ "--h": `${rhythm.h}%`, "--mt": `${rhythm.mt}%` } as CSSProperties}>
      <div className="aspect-[4/5] w-[78vw] sm:w-[22rem] lg:motion-on:row-start-2 lg:motion-on:h-full lg:motion-on:w-auto">
        <article
          data-pose
          data-trophy
          className="relative flex h-full flex-col justify-between overflow-hidden rounded-[14px] p-[clamp(1rem,1.4vw,1.4rem)] lg:motion-on:will-change-transform"
        >
          <div data-frame data-trophy-frame className="absolute inset-0 rounded-[14px] bg-ink-900 gl-plane:bg-transparent">
            <PlaneWindow className="absolute inset-0 overflow-hidden rounded-[14px] bg-ink-900 gl-plane:bg-transparent" behavior="static">
              <Image
                src={photo.media.src}
                alt={photo.media.alt || photo.name}
                fill
                sizes="(min-width: 1024px) 28vw, 78vw"
                quality={75}
                placeholder={photo.media.lqip ? "blur" : "empty"}
                blurDataURL={photo.media.lqip ?? undefined}
                className={`object-cover ${PLANE_MEDIA} ${DEV_MASK}`}
                style={{
                  objectPosition: photo.position,
                  ...(photo.lift ? { top: `${-photo.lift * 100}%`, bottom: "auto" } : null),
                }}
              />
            </PlaneWindow>
          </div>
          <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-[38%] bg-linear-to-b from-ink-950/80 to-transparent" />
          <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-0 h-[64%] bg-linear-to-t from-ink-950 via-ink-950/80 to-transparent" />
          <div className="relative">
            <Slate item={item} index={index} total={total} />
          </div>
          <div className="relative grid gap-3">
            <Caption item={item} clamp />
          </div>
          <div aria-hidden="true" className="pointer-events-none absolute inset-0 rounded-[inherit] shadow-[inset_0_0_0_1px_var(--color-line)]" />
        </article>
      </div>
    </li>
  );
}

function Trophy({ item, index, total, photo }: TrophyProps) {
  if (photo?.own) return <PortraitTrophy item={item} index={index} total={total} photo={photo} />;
  const rhythm = RHYTHM[index % RHYTHM.length];
  return (
    <li data-trophy-slot className={SLOT} style={{ "--h": `${rhythm.h}%`, "--mt": `${rhythm.mt}%` } as CSSProperties}>
      <div
        className={`h-full lg:motion-on:row-start-2 ${
          photo ? "w-[82vw] sm:w-[24rem] lg:w-[clamp(20rem,29vw,34rem)]" : "w-[78vw] sm:w-[21rem] lg:w-[clamp(17rem,22vw,26rem)]"
        }`}
      >
        <article
          data-pose
          data-trophy
          className="relative flex h-full flex-col gap-4 rounded-[14px] bg-ink-900 p-[clamp(1rem,1.4vw,1.4rem)] shadow-[inset_0_0_0_1px_var(--color-line)] lg:motion-on:will-change-transform"
        >
          <Slate item={item} index={index} total={total} />
          <Visual item={item} photo={photo} />
          <Caption item={item} clamp={false} />
        </article>
      </div>
    </li>
  );
}

/**
 * Laurels as a trophy wall: on desktop the strip holds and runs sideways, each card at
 * its own depth (<TrophyWall>), the owner's photo carrying it with the result in a slate line.
 * Small screens and motion off: a snap-scrolling strip. Organisations and schools run
 * underneath as a marquee.
 */
export function Achievements({
  items,
  projects,
  media,
}: {
  items: Achievement[];
  projects: Project[];
  media: Record<string, Media>;
}) {
  if (items.length === 0) return null;
  const wall = items.filter((a) => a.kind === "award" || a.kind === "competition" || a.kind === "certification");
  const crew = items.filter((a) => a.kind === "organization" || a.kind === "education");
  const bySlug = new Map(projects.map((p) => [p.slug, p]));
  const photoOf = (a: Achievement): Photo | null => {
    const own = media[OWNER_PHOTOS[a.slug] ?? ""];
    if (own) return { media: own, name: splitTitle(a.title)[1], position: "50% 30%", own: true, lift: OWNER_LIFT[a.slug] };
    const p = bySlug.get(PHOTOS[a.slug] ?? "");
    return p?.cover ? { media: p.cover, name: p.name, position: "50% 0%", own: false } : null;
  };

  return (
    <section id="achievements" aria-labelledby="ach-title" className="border-t border-line pb-[clamp(4rem,8vw,8rem)]">
      <SectionHead
        id="ach-title"
        variant="booth"
        kicker="Achievements"
        title="festival laurels"
        lede="Hackathon podiums, national funding, a flying-robot final, and the teams behind them."
      />
      {wall.length > 0 ? (
        <TrophyWall count={wall.length}>
          {wall.map((item, i) => (
            <Trophy key={item.id} item={item} index={i} total={wall.length} photo={photoOf(item)} />
          ))}
        </TrophyWall>
      ) : null}
      {crew.length > 0 ? (
        <div className="mt-[clamp(3.5rem,7vw,6rem)] px-gutter">
          <p className="slate mb-5 text-bone-400">Teams & schools</p>
          <ul className="border-b border-line">
            {crew.map((a) => {
              const logo = crewLogo(a.slug);
              return (
                <li
                  key={a.id}
                  className="grid grid-cols-[3rem_minmax(0,1fr)] items-center gap-x-5 gap-y-1 border-t border-line py-5 md:grid-cols-[3.5rem_minmax(0,1.4fr)_minmax(0,1fr)_8rem] md:gap-x-8"
                >
                  <span className="relative row-span-2 grid size-12 place-items-center overflow-hidden rounded-[12px] bg-ink-900 shadow-[inset_0_0_0_1px_var(--color-line)] md:row-span-1 md:size-14">
                    {logo ? (
                      <Image src={logo} alt="" fill sizes="56px" className="object-contain p-2" />
                    ) : (
                      <span aria-hidden="true" className="slate text-bone-400">
                        {initials(a.title)}
                      </span>
                    )}
                  </span>
                  <span className="text-[clamp(1.3rem,2.3vw,2.2rem)] leading-tight font-light tracking-[-0.025em] text-bone-100">{a.title}</span>
                  <span className="text-bone-400 md:text-[1.05rem]">
                    {a.org}
                    <span className="md:hidden"> · {a.period}</span>
                  </span>
                  <span className="slate hidden text-right text-bone-400 tabular-nums md:block">{a.period}</span>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
