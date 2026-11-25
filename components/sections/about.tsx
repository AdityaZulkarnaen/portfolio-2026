import { Fragment, type ReactNode } from "react";

import { Magnetic } from "@/components/motion/magnetic";
import { RevealWords } from "@/components/motion/reveal-words";
import { parseInline, type InlineNode } from "@/lib/content/markup";
import type { Profile } from "@/lib/content/types";

import { AboutPortrait } from "./about-portrait";
import { FactCounters } from "./fact-counters";

const SCHOOL = "UGM · Software Engineering · GPA 3.85";
const COORDS = "−7.7956° 110.3695°";

const NUMBER = /(\d+(?:\.(\d+))?)(\+?)/;

/** `4 mainnet dApps` → a counted number set large in the line, the words left as text; detail captions it on hover. */
function Fact({ label, detail }: { label: string; detail?: string }) {
  const m = NUMBER.exec(label);
  if (!m) return <>{label}</>;
  const [match, value, decimals = "", suffix] = m;
  const final = value + suffix;
  return (
    <>
      {label.slice(0, m.index)}
      <span
        data-count={value}
        data-decimals={decimals.length}
        data-suffix={suffix}
        tabIndex={detail ? 0 : undefined}
        className="group/fact relative -my-[0.1em] inline-block text-[1.5em] leading-[0.86] tracking-[-0.04em] whitespace-nowrap text-ember-500 tabular-nums outline-none"
      >
        <span aria-hidden="true" className="invisible">
          {final}
        </span>
        <span aria-hidden="true" data-count-value className="absolute inset-0">
          {final}
        </span>
        <span className="sr-only">{final}</span>
        {detail ? (
          <span className="slate pointer-events-none absolute top-[calc(100%+0.35rem)] left-0 z-10 max-md:hidden text-[11px] tracking-[0.12em] whitespace-nowrap text-bone-400 opacity-0 transition-[opacity,translate] duration-(--dur-fast) group-hover/fact:translate-y-0.5 group-hover/fact:opacity-100 group-focus-visible/fact:opacity-100">
            <span className="sr-only">(</span>
            {detail}
            <span className="sr-only">)</span>
          </span>
        ) : null}
      </span>
      {label.slice(m.index + match.length)}
    </>
  );
}

/** Bio markup in the manifesto: `**fact|detail**` is a counted fact (detail on hover), `*x*` an underlined token. */
function renderManifesto(nodes: InlineNode[], key = ""): ReactNode[] {
  return nodes.map((node, i) => {
    const k = `${key}${i}`;
    switch (node.type) {
      case "text":
        return <Fragment key={k}>{node.value}</Fragment>;
      case "break":
        return <br key={k} />;
      case "highlight":
        return (
          <span key={k} className="underline decoration-(--tint) decoration-1 underline-offset-[0.18em]">
            {renderManifesto(node.children, `${k}-`)}
          </span>
        );
      case "strong": {
        const text = node.children.map((c) => (c.type === "text" ? c.value : "")).join("");
        const [label, detail] = text.split("|").map((s) => s.trim());
        return <Fact key={k} label={label} detail={detail} />;
      }
      case "link":
        return (
          <a key={k} href={node.href} className="link-underline">
            {renderManifesto(node.children, `${k}-`)}
          </a>
        );
    }
  });
}

/**
 * About as a manifesto: one statement in the hero's light lowercase, the CV numbers counted
 * up inside the follow-up, a portrait that develops like the work prints, and the booth HUD.
 */
export function About({ profile }: { profile: Profile | null }) {
  if (!profile) return null;
  const photo = profile.portrait[0] ?? profile.aboutPhotos[0] ?? null;
  const [statement, ...rest] = profile.bio;
  const city = profile.location.split(",")[0].trim();

  return (
    <section
      id="about"
      aria-labelledby="about-title"
      className="overflow-x-clip border-t border-line px-gutter pt-[clamp(5rem,11vw,10rem)] pb-[clamp(4rem,8vw,8rem)]"
    >
      <div className="slate flex items-center justify-between gap-4 text-bone-400">
        <h2 id="about-title" className="inline-flex items-center gap-2.5 text-bone-100">
          <span aria-hidden="true" className="size-1.5 rounded-full bg-(--tint)" />
          About
        </h2>
        <span className="tabular-nums">{profile.fullName}</span>
      </div>

      {statement ? (
        <RevealWords className="mt-[clamp(2rem,5vw,4.5rem)] max-w-[17ch] text-[clamp(2.6rem,6.4vw,7.75rem)] leading-[0.94] font-light tracking-[-0.045em] text-balance text-bone-100">
          <p>{renderManifesto(parseInline(statement))}</p>
        </RevealWords>
      ) : null}

      <div className="mt-[clamp(3rem,7vw,7rem)] grid gap-[clamp(2.5rem,5vw,4rem)] md:grid-cols-12 md:gap-x-[4vw]">
        {photo ? (
          <div className="w-[min(100%,26rem)] md:col-span-4 md:w-auto">
            <AboutPortrait photo={photo} name={profile.fullName} />
          </div>
        ) : null}
        <div className="grid content-between gap-[clamp(3rem,6vw,5rem)] md:col-span-7 md:col-start-6">
          {rest.length > 0 ? (
            <FactCounters>
              <RevealWords className="grid content-start gap-[1em] text-[clamp(1.4rem,2.35vw,2.6rem)] leading-[1.32] font-light tracking-[-0.025em] text-pretty text-bone-100">
                {rest.map((p, i) => (
                  <p key={i}>{renderManifesto(parseInline(p))}</p>
                ))}
              </RevealWords>
            </FactCounters>
          ) : null}
          <div className="md:pb-[calc(1.4em+0.75rem)]">
            <div aria-hidden="true" className="relative h-px bg-[rgb(236_233_226/0.2)]">
              <span className="absolute top-1/2 left-0 size-[5px] -translate-1/2 rounded-full bg-bone-100" />
              <span className="absolute top-1/2 right-0 size-[5px] translate-x-1/2 -translate-y-1/2 rounded-full bg-bone-100" />
            </div>
            <div className="slate mt-3.5 flex flex-wrap justify-between gap-x-8 gap-y-1.5 tracking-[0.14em] text-bone-400 tabular-nums">
              <span className="text-bone-100">{SCHOOL}</span>
              <span>
                {city} <span className="text-bone-100">{COORDS}</span>
              </span>
            </div>
            <div className="mt-[clamp(1.75rem,3vw,2.5rem)] flex flex-wrap items-center justify-between gap-x-8 gap-y-6">
              <p className="slate text-bone-100">
                {profile.availability}
              </p>
              {profile.resumePath ? (
                <Magnetic strength={0.25}>
                  <a
                    href={profile.resumePath}
                    target="_blank"
                    rel="noreferrer"
                    data-cursor="open"
                    className="slate group/cta inline-flex h-11 items-center gap-3 rounded-full pr-4 pl-5 text-bone-100 shadow-[inset_0_0_0_1px_var(--color-line-strong)] transition-[background-color,color,box-shadow] duration-(--dur-fast) ease-fluid hover:bg-bone-100 hover:text-ink-950 hover:shadow-[inset_0_0_0_1px_var(--color-bone-100)]"
                  >
                    Resume · PDF
                    <svg
                      viewBox="0 0 12 12"
                      aria-hidden="true"
                      className="size-3 transition-transform duration-(--dur-base) ease-fluid group-hover/cta:-translate-y-0.5 group-hover/cta:translate-x-0.5"
                    >
                      <path d="M3 9 9 3M4 3h5v5" fill="none" stroke="currentColor" strokeWidth="1.4" />
                    </svg>
                  </a>
                </Magnetic>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
