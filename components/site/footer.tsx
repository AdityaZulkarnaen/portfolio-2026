import { cacheLife } from "next/cache";

import { VariableLetters } from "@/components/motion/variable-letters";
import type { Profile } from "@/lib/content/types";

import { LocalTime } from "./local-time";
import { InlineMarkup } from "./markup";
import { MotionToggle } from "./motion-toggle";

async function currentYear() {
  "use cache";
  cacheLife("days");
  return new Date().getFullYear();
}

/** Only on pages without the home Contact section above (it already carries the ask and the address). */
const OFF_HOME = "[body:has(#contact)_&]:hidden";

const arrow = (
  <svg viewBox="0 0 12 12" aria-hidden="true" className="size-[0.7em] text-lilac-500 transition-transform duration-(--dur-base) ease-fluid group-hover/l:translate-x-0.5 group-hover/l:-translate-y-0.5">
    <path d="M3 9 9 3M4 3h5v5" fill="none" stroke="currentColor" strokeWidth="1.3" />
  </svg>
);

const linkCls =
  "group/l inline-flex items-center gap-2 text-[clamp(1.25rem,2vw,1.9rem)] font-light tracking-[-0.02em] text-bone-100 transition-colors duration-(--dur-fast) hover:text-lilac-300";

/**
 * The floor of every page. On home it continues the Contact section with no rule between
 * them, so the ask, the ways to reach me and the name read as one closing block; elsewhere it
 * opens with the tagline and the address itself. Each fact appears once.
 */
export async function Footer({ profile }: { profile: Profile | null }) {
  const year = await currentYear();
  const name = profile?.fullName ?? "Aditya Zulkarnaen";
  const wordmark = profile?.wordmarkBottom ?? "ZULKARNAEN";

  return (
    <footer className="relative overflow-clip border-t border-line px-gutter pt-[clamp(4rem,8vw,7rem)] pb-6 [body:has(#contact)_&]:border-t-0 [body:has(#contact)_&]:pt-[clamp(4rem,8vw,7rem)]">
      {/* Elsewhere: the tagline and the address (home has them in Contact). */}
      <div className={`mb-[clamp(3rem,6vw,5rem)] grid gap-6 md:grid-cols-12 md:gap-x-[4vw] ${OFF_HOME}`}>
        <p className="max-w-[34ch] text-[clamp(1.25rem,1.9vw,1.9rem)] leading-tight tracking-[-0.015em] text-bone-400 md:col-span-7 [&_strong]:font-semibold [&_strong]:text-bone-100">
          {profile?.footerTagline ? <InlineMarkup source={profile.footerTagline} /> : null}
        </p>
        {profile?.email ? (
          <a href={`mailto:${profile.email}`} className={`${linkCls} self-end md:col-span-5 md:justify-self-end`}>
            {profile.email}
            {arrow}
          </a>
        ) : null}
      </div>

      <nav aria-label="Elsewhere" className="flex flex-wrap items-end justify-between gap-x-10 gap-y-6 border-t border-line pt-6">
        <ul className="flex flex-wrap gap-x-[clamp(1.5rem,3vw,3rem)] gap-y-3">
          {profile?.socials.map((s) => (
            <li key={s.href}>
              <a href={s.href} target="_blank" rel="noreferrer" className={linkCls} data-cursor="open">
                {s.label}
                {arrow}
              </a>
            </li>
          ))}
          {profile?.resumePath ? (
            <li>
              <a href={profile.resumePath} target="_blank" rel="noreferrer" className={linkCls} data-cursor="open">
                Résumé
                {arrow}
              </a>
            </li>
          ) : null}
        </ul>
        <p className="slate text-bone-400 tabular-nums">
          {profile?.location ?? "Yogyakarta, Indonesia"} · <LocalTime timeZone={profile?.timezone} />
        </p>
      </nav>

      <div className="mt-[clamp(2.5rem,6vw,5rem)] text-center select-none">
        <VariableLetters
          text={wordmark}
          className="block text-[clamp(2.5rem,13.6vw,18rem)] leading-[0.82] font-[760] tracking-[-0.04em] whitespace-nowrap [font-variation-settings:'wdth'_112,'wght'_760]"
        />
      </div>

      <div className="slate mt-6 flex flex-wrap items-center justify-between gap-4 border-t border-line pt-5 text-bone-400">
        <span>
          © {year} {name}
        </span>
        <MotionToggle />
        <a href="#main" className="transition-colors duration-(--dur-fast) hover:text-lilac-300">
          Back to top ↑
        </a>
      </div>
    </footer>
  );
}
