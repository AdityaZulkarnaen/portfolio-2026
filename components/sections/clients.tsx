import Image from "next/image";
import Link from "next/link";
import type { CSSProperties } from "react";

import { PlaneWindow } from "@/components/showcase/plane-window";
import { TransitionLink } from "@/components/site/transition-link";
import type { Client, Media, Profile, Testimonial } from "@/lib/content/types";
import { cn } from "@/lib/utils";

import { ClientsMotion } from "./clients-motion";

const DEV = process.env.NODE_ENV !== "production";
const MAX_CLIENTS = 6;
const MAX_TESTIMONIALS = 3;

/** DOM media under a GL plane: hidden once the plane draws (same as the work cards' PLANE_MEDIA). */
const PLANE_MEDIA = "transition-opacity duration-500 ease-io gl-plane:opacity-0 gl-handoff:transition-none";
const INK_800 = "#14171d";

type LogoCell = { kind: "client"; client: Client } | { kind: "placeholder"; id: string };
type QuoteCard = { kind: "testimonial"; item: Testimonial } | { kind: "placeholder"; id: string };

type Props = { profile: Profile | null; clients: Client[]; testimonials: Testimonial[] };

export function Clients({ profile, clients, testimonials }: Props) {
  const logos: LogoCell[] =
    clients.length > 0
      ? clients.slice(0, MAX_CLIENTS).map((client) => ({ kind: "client", client }))
      : DEV
        ? Array.from({ length: MAX_CLIENTS }, (_, i) => ({ kind: "placeholder", id: `logo-${i}` }))
        : [];
  const real: QuoteCard[] = testimonials.slice(0, MAX_TESTIMONIALS).map((item) => ({ kind: "testimonial", item }));
  const quotes: QuoteCard[] = DEV
    ? [
        ...real,
        ...Array.from({ length: MAX_TESTIMONIALS - real.length }, (_, i): QuoteCard => ({
          kind: "placeholder",
          id: `quote-${i}`,
        })),
      ]
    : real;

  return (
    <section
      id="clients"
      aria-labelledby="clients-title"
      className="border-t border-line px-gutter pt-[clamp(5rem,10vw,9rem)] pb-[clamp(4rem,8vw,8rem)]"
    >
      <h2 id="clients-title" className="sr-only">
        Clients and testimonials
      </h2>
      <ClientsMotion className="grid gap-3">
        {logos.length > 0 ? <LogoPanel cells={logos} /> : null}
        <div className="grid gap-3">
          {quotes.length > 0 ? (
            <ul className="grid gap-3 md:grid-cols-2" aria-label="Testimonials">
              {quotes.map((card, i) => (
                <li
                  key={card.kind === "testimonial" ? card.item.id : card.id}
                  className={cn("flex", (i === 0 || quotes.length === 2) && "md:col-span-2")}
                >
                  <QuoteCardView card={card} large={i === 0} />
                </li>
              ))}
            </ul>
          ) : null}
          <CtaCard availability={profile?.availability} />
        </div>
      </ClientsMotion>
    </section>
  );
}

function LogoPanel({ cells }: { cells: LogoCell[] }) {
  const n = cells.length;
  return (
    <div data-rise data-gl-mover className="rounded-2xl border border-line bg-ink-900/60 [html[data-gl=on]_&]:bg-transparent">
      <p className="slate flex items-center gap-2.5 px-5 pt-5 text-bone-400">
        <span className="size-1 rounded-full bg-bone-400" aria-hidden="true" />
        Clients
      </p>
      <ul
        className="grid grid-cols-(--cols) md:grid-cols-(--cols-md)"
        style={{ "--cols": `repeat(${Math.min(n, 3)},minmax(0,1fr))`, "--cols-md": `repeat(${n},minmax(0,1fr))` } as CSSProperties}
      >
        {cells.map((cell, i) => (
          <li
            key={cell.kind === "client" ? cell.client.id : cell.id}
            className={cn(
              "flex min-h-24 items-stretch md:min-h-32",
              i % 3 !== 0 && "border-l border-line",
              i >= 3 && "border-t border-line md:border-t-0",
              i % 3 === 0 && i > 0 && "md:border-l md:border-line",
            )}
          >
            {cell.kind === "client" ? (
              <ClientLogo client={cell.client} />
            ) : (
              <span className="slate m-auto text-bone-400/60">Client logo</span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Full-colour logo tile + name; hover lifts the tile and brightens the name. Case-study clients link inward. */
function ClientLogo({ client }: { client: Client }) {
  const body = (
    <>
      <span data-frame className="relative size-12 shrink-0 overflow-hidden rounded-xl bg-ink-800 gl-plane:bg-transparent motion-safe:transition-transform motion-safe:duration-(--dur-base) motion-safe:ease-fluid group-hover/logo:-translate-y-0.5 group-focus-visible/logo:-translate-y-0.5">
        {client.logo ? (
          <PlaneWindow className="absolute inset-0" behavior="static" look={{ fit: "contain", bg: INK_800 }}>
            <Image
              src={client.logo.src}
              alt=""
              fill
              sizes="48px"
              unoptimized={/\.svg(\?|$)/i.test(client.logo.src)}
              className={`object-contain ${PLANE_MEDIA}`}
            />
          </PlaneWindow>
        ) : (
          <span aria-hidden="true" className="grid size-full place-items-center text-sm font-semibold text-bone-400">
            {client.name.charAt(0)}
          </span>
        )}
      </span>
      <span className="grid min-w-0 gap-1">
        <span className="text-[0.95rem] leading-tight font-medium tracking-[-0.01em] text-balance text-bone-100/85 transition-colors duration-(--dur-fast) group-hover/logo:text-bone-100 group-focus-visible/logo:text-bone-100">
          {client.name}
        </span>
        {client.kind ? <span className="slate text-bone-400">{client.kind}</span> : null}
      </span>
    </>
  );
  const cls =
    "group/logo flex h-full w-full flex-col items-center justify-center gap-3 px-3 py-5 text-center outline-offset-[-6px] md:flex-row md:justify-start md:gap-3.5 md:px-5 md:text-left";

  if (client.project) {
    return (
      <TransitionLink href={`/work/${client.project.slug}`} className={cls} aria-label={`${client.name}: ${client.project.name} case study`}>
        {body}
      </TransitionLink>
    );
  }
  if (client.url) {
    return (
      <a href={client.url} target="_blank" rel="noopener noreferrer" className={cls} data-cursor="open">
        {body}
      </a>
    );
  }
  return <div className={cls}>{body}</div>;
}

function CtaCard({ availability }: { availability: string | undefined }) {
  return (
    <div
      data-rise
      className="flex flex-wrap items-center justify-between gap-x-8 gap-y-4 rounded-2xl border border-line bg-ink-900/60 px-6 py-4 md:justify-self-end"
    >
      <div className="grid gap-1">
        <p className="slate text-bone-400">{availability || "Available for work"}</p>
        <h3 className="text-lg leading-tight font-bold tracking-tight font-stretch-112%">
          Got something worth building?
        </h3>
      </div>
      <div className="flex">
        <a href="#contact" className="pill-btn group/pb">
          <span>Start a project</span>
          <svg
            viewBox="0 0 12 12"
            aria-hidden="true"
            className="size-3 transition-transform duration-(--dur-base) ease-fluid group-hover/pb:translate-x-0.5"
          >
            <path d="M1 6h9M6.5 2.5 10 6l-3.5 3.5" fill="none" stroke="currentColor" strokeWidth="1.4" />
          </svg>
        </a>
      </div>
    </div>
  );
}

function QuoteCardView({ card, large }: { card: QuoteCard; large: boolean }) {
  const t = card.kind === "testimonial" ? card.item : null;
  const role = t ? [t.authorRole, t.authorOrg].filter(Boolean).join(" · ") : "Role · Organisation";
  const [lead, rest] = t ? splitLead(t.quote) : ["Testimonial placeholder — add in admin", ""];

  return (
    <figure
      data-rise
      data-frame
      data-gl-mover
      className={cn(
        "group/q relative grid w-full overflow-hidden rounded-2xl border border-line bg-ink-900/60 gl-plane:bg-transparent",
        large ? "md:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]" : "md:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]",
        !t && "border-dashed",
      )}
    >
      <Portrait media={t?.avatar ?? null} large={large} />
      <div
        className={cn(
          "relative flex flex-col justify-between gap-10 p-[clamp(1.5rem,2.4vw,2.25rem)] max-md:-mt-10",
          large ? "md:min-h-104 md:py-[clamp(2rem,3vw,2.75rem)] md:pl-2" : "md:min-h-64 md:pl-1",
        )}
      >
        <blockquote
          className={cn(
            "max-w-[60ch] leading-[1.55] font-light text-pretty text-bone-100/80",
            large ? "text-[clamp(1.05rem,1.3vw,1.25rem)]" : "text-[clamp(1rem,1.1vw,1.1rem)]",
            !t && "text-bone-400",
          )}
        >
          {t ? null : <span className="slate mb-4 block text-ember-300">Dev placeholder</span>}
          <p>
            <span className={cn(t && "font-normal text-bone-100")}>{lead}</span>
            {rest ? ` ${rest}` : null}
          </p>
        </blockquote>
        <figcaption className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
          <span className="grid min-w-0 gap-1.5">
            <span className="slate text-bone-100">{t ? t.authorName : "Name Surname"}</span>
            {role ? <span className="slate text-bone-400">{role}</span> : null}
          </span>
          {t?.project ? (
            <Link href={`/work/${t.project.slug}`} className="slate link-underline text-bone-400" data-cursor="open">
              on {t.project.name}
            </Link>
          ) : null}
        </figcaption>
      </div>
    </figure>
  );
}

function splitLead(quote: string): [string, string] {
  const match = /^(.+?[.!?])\s+(?=\S)/.exec(quote);
  if (!match) return [quote, ""];
  return [match[1], quote.slice(match[0].length)];
}

function Portrait({ media, large }: { media: Media | null; large: boolean }) {
  const frame =
    "relative aspect-4/3 overflow-hidden mask-[linear-gradient(to_bottom,#000_45%,transparent_96%)] md:aspect-auto md:h-full md:mask-[linear-gradient(to_right,#000_35%,transparent_96%)]";
  if (!media) {
    return (
      <div aria-hidden="true" className={cn(frame, "flex items-center justify-center bg-ink-800/60")}>
        <span className="slate text-bone-400/60">Portrait</span>
      </div>
    );
  }
  return (
    <div className={frame}>
      {/* GL: the portrait develops through the scroll wave, graded and faded like the DOM filter + mask. */}
      <PlaneWindow className="absolute inset-0" behavior="static" look={{ tone: "portrait", fade: "portrait", hover: "figure" }}>
        <Image
          src={media.src}
          alt=""
          fill
          sizes={large ? "(min-width: 768px) 26vw, 100vw" : "(min-width: 768px) 14vw, 100vw"}
          quality={75}
          className={`object-cover filter-[grayscale(1)_sepia(0.14)_contrast(1.12)_brightness(0.54)] group-hover/q:filter-[grayscale(0.35)_sepia(0.05)_contrast(1.05)_brightness(0.68)] motion-safe:transition-[filter,opacity] motion-safe:duration-(--dur-slower) motion-safe:ease-fluid ${PLANE_MEDIA}`}
          style={{ objectPosition: `${(media.focalX ?? 0.5) * 100}% ${(media.focalY ?? 0.3) * 100}%` }}
        />
      </PlaneWindow>
    </div>
  );
}
