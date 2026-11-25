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

const linkCls = "text-[1.05rem] transition-colors duration-(--dur-fast) hover:text-ember-300";

export async function Footer({ profile }: { profile: Profile | null }) {
  const year = await currentYear();
  const name = profile?.fullName ?? "Aditya Zulkarnaen";
  const wordmark = profile?.wordmarkBottom ?? "ZULKARNAEN";

  return (
    <footer className="relative overflow-clip border-t border-line px-gutter pt-[clamp(4rem,8vw,7rem)] pb-6">
      <div className="grid gap-10 md:grid-cols-12 md:gap-x-[4vw]">
        <p className="max-w-[34ch] text-[clamp(1.25rem,1.9vw,1.9rem)] leading-tight tracking-[-0.015em] text-bone-400 md:col-span-6 [&_strong]:font-semibold [&_strong]:text-bone-100">
          {profile?.footerTagline ? <InlineMarkup source={profile.footerTagline} /> : null}
        </p>
        <div className="grid content-start gap-4 md:col-start-8 md:col-end-10">
          <span className="slate text-bone-400">Elsewhere</span>
          <ul className="grid gap-2">
            {profile?.socials.map((s) => (
              <li key={s.href}>
                <a href={s.href} target="_blank" rel="noreferrer" className={linkCls} data-cursor="open">
                  {s.label}
                </a>
              </li>
            ))}
          </ul>
        </div>
        <div className="grid content-start gap-4 md:col-start-10 md:col-end-13">
          <span className="slate text-bone-400">Projection room</span>
          <ul className="grid gap-2">
            {profile?.resumePath ? (
              <li>
                <a href={profile.resumePath} target="_blank" rel="noreferrer" className={linkCls} data-cursor="open">
                  Resume (PDF)
                </a>
              </li>
            ) : null}
            {profile?.email ? (
              <li>
                <a href={`mailto:${profile.email}`} className={linkCls}>
                  Email
                </a>
              </li>
            ) : null}
            <li className="slate text-bone-400">
              {profile?.location ?? "Yogyakarta"} · <LocalTime timeZone={profile?.timezone} />
            </li>
          </ul>
        </div>
      </div>

      <div className="mt-[clamp(3rem,8vw,7rem)] text-center select-none">
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
        <span>End of reel</span>
      </div>
    </footer>
  );
}
