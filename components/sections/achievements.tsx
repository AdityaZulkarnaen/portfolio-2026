import { Markup } from "@/components/site/markup";
import { SectionHead } from "@/components/site/section-head";
import type { Achievement, AchievementKind } from "@/lib/content/types";

const KIND: Record<AchievementKind, string> = {
  award: "Award",
  competition: "Competition",
  certification: "Certification",
  education: "Education",
  organization: "Organisation",
};

const GROUPS: { label: string; kinds: AchievementKind[] }[] = [
  { label: "Awards & competitions", kinds: ["award", "competition", "certification"] },
  { label: "Education", kinds: ["education"] },
  { label: "Organisations", kinds: ["organization"] },
];

function Row({ item, index }: { item: Achievement; index: number }) {
  return (
    <li className="group grid gap-x-[4vw] gap-y-2 border-t border-line py-[clamp(1.1rem,2vw,1.75rem)] md:grid-cols-12 md:items-baseline">
      <span className="slate flex gap-3 text-bone-400 tabular-nums md:col-span-2">
        <span className="text-bone-100">{String(index + 1).padStart(2, "0")}</span>
        {KIND[item.kind]}
      </span>
      <div className="grid gap-1.5 md:col-span-6">
        <h4 className="text-[clamp(1.35rem,2.1vw,2.1rem)] leading-[1.08] font-light tracking-[-0.03em] text-balance text-bone-100">
          {item.url ? (
            <a href={item.url} target="_blank" rel="noreferrer" className="link-underline" data-cursor="open">
              {item.title}
            </a>
          ) : (
            item.title
          )}
        </h4>
        {item.summary ? (
          <Markup
            source={item.summary}
            className="max-w-[58ch] leading-relaxed text-bone-400 [&_.hl]:font-sans [&_.hl]:text-bone-100 [&_.hl]:not-italic"
          />
        ) : null}
      </div>
      <span className="slate text-bone-400 md:col-span-3">{item.org}</span>
      <span className="slate text-bone-100 tabular-nums md:col-span-1 md:text-right">{item.period}</span>
    </li>
  );
}

/** Laurels as a ledger: grouped by kind, one hairline row each, numbered across the whole list. */
export function Achievements({ items }: { items: Achievement[] }) {
  if (items.length === 0) return null;
  const groups = GROUPS.map((g) => ({ ...g, rows: items.filter((a) => g.kinds.includes(a.kind)) })).filter((g) => g.rows.length > 0);
  const order = new Map(groups.flatMap((g) => g.rows).map((a, i) => [a.id, i]));

  return (
    <section aria-labelledby="ach-title" className="border-t border-line pb-[clamp(4rem,8vw,8rem)]">
      <SectionHead
        id="ach-title"
        variant="booth"
        kicker="Achievements"
        title="festival laurels"
        lede="Hackathon podiums, national funding, and the school and teams behind them."
      />
      <div className="mx-gutter grid gap-[clamp(2.5rem,5vw,4.5rem)]">
        {groups.map((g) => (
          <section key={g.label} aria-label={g.label}>
            <div className="mb-3 flex items-center gap-3">
              <h3 className="slate text-bone-100">{g.label}</h3>
              <div aria-hidden="true" className="relative h-px flex-1 bg-[rgb(236_233_226/0.2)]">
                <span className="absolute top-1/2 right-0 size-[5px] translate-x-1/2 -translate-y-1/2 rounded-full bg-bone-100" />
              </div>
              <span className="slate text-bone-400 tabular-nums">{String(g.rows.length).padStart(2, "0")}</span>
            </div>
            <ol>
              {g.rows.map((item) => (
                <Row key={item.id} item={item} index={order.get(item.id) ?? 0} />
              ))}
            </ol>
          </section>
        ))}
      </div>
    </section>
  );
}
