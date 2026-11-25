import { Markup } from "@/components/site/markup";
import { SectionHead } from "@/components/site/section-head";
import type { Achievement, AchievementKind } from "@/lib/content/types";

import { AchievementsRail } from "./achievements-rail";

const KIND: Record<AchievementKind, string> = {
  award: "Award",
  competition: "Competition",
  certification: "Certification",
  education: "Education",
  organization: "Organisation",
};

export function Achievements({ items }: { items: Achievement[] }) {
  if (items.length === 0) return null;

  return (
    <section aria-labelledby="ach-title" className="border-t border-line">
      <AchievementsRail
        head={
          <SectionHead
            id="ach-title"
            title={
              <>
                Festival <em className="hl">laurels</em>
              </>
            }
            lede="Hackathon podiums, national funding and the schools behind them."
          />
        }
      >
        <ol className="flex w-max px-gutter">
          {items.map((item) => (
            <li
              key={item.id}
              className="group relative grid min-h-[clamp(22rem,52svh,34rem)] w-[min(82vw,30rem)] snap-start grid-rows-[auto_1fr_auto_auto] gap-4 border-l border-line px-[clamp(1.25rem,2.4vw,2.5rem)] pt-6 last:border-r"
            >
              <div className="slate flex justify-between gap-4">
                <span className="text-ember-500">{KIND[item.kind]}</span>
                <span className="text-right text-bone-400">{item.org}</span>
              </div>
              <p
                aria-hidden="true"
                className="display self-center text-[clamp(3.5rem,7vw,7.5rem)] leading-[0.9] whitespace-nowrap text-bone-100/20 transition-colors duration-(--dur-base) group-hover:text-bone-100"
              >
                {item.period}
              </p>
              <h3 className="text-[clamp(1.3rem,1.8vw,1.75rem)] leading-[1.15] font-bold tracking-[-0.015em] text-balance">
                {item.url ? (
                  <a href={item.url} target="_blank" rel="noreferrer" className="link-underline" data-cursor="open">
                    {item.title}
                  </a>
                ) : (
                  item.title
                )}
                <span className="sr-only">, {item.period}</span>
              </h3>
              {item.summary ? (
                <Markup source={item.summary} className="pb-2 text-[0.95rem] leading-relaxed text-bone-400" />
              ) : (
                <span />
              )}
            </li>
          ))}
        </ol>
      </AchievementsRail>
    </section>
  );
}
