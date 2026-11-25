import { Markup } from "@/components/site/markup";
import { SectionHead } from "@/components/site/section-head";
import { dateRange } from "@/lib/content/format";
import type { Experience as ExperienceItem } from "@/lib/content/types";

/**
 * Credits roll. `<details name="exp">` makes an exclusive accordion with no JS;
 * `interpolate-size` + `::details-content` (site.css) animate the height where supported.
 */
export function Experience({ items }: { items: ExperienceItem[] }) {
  if (items.length === 0) return null;
  // Current roles first, then most recent start.
  const sorted = [...items].sort(
    (a, b) => Number(b.endDate === null) - Number(a.endDate === null) || b.startDate.localeCompare(a.startDate),
  );

  return (
    <section aria-labelledby="exp-title" className="border-t border-line pb-[clamp(4rem,8vw,8rem)]">
      <SectionHead id="exp-title" title="Credits" lede="Teams, internships and organisations I have built with." />
      <div className="mx-gutter border-b border-line">
        {sorted.map((item, i) => (
          <details key={item.id} name="exp" className="exp-row group border-t border-line" open={i === 0 ? true : undefined}>
            <summary className="grid cursor-pointer list-none grid-cols-[1fr_auto] items-baseline gap-x-6 gap-y-1.5 py-[clamp(1.25rem,2.2vw,2rem)] md:grid-cols-[minmax(0,6fr)_minmax(0,3fr)_minmax(0,3fr)_auto]">
              <span className="text-[clamp(1.4rem,2.6vw,2.6rem)] leading-[1.05] font-bold tracking-[-0.025em] [font-stretch:112%] transition-[transform,color] duration-(--dur-base) ease-fluid group-hover:translate-x-3.5 group-hover:text-ember-300 group-open:text-bone-100">
                {item.role}
              </span>
              <span className="col-start-1 text-bone-400 md:col-start-auto">{item.org}</span>
              <span className="slate col-start-1 inline-flex items-center gap-2.5 text-bone-400 tabular-nums md:col-start-auto">
                {dateRange(item.startDate, item.endDate)}
                {item.endDate === null ? (
                  <span className="rounded-full bg-tide-400/18 px-2 py-0.5 text-tide-400">Now</span>
                ) : null}
              </span>
              <span
                aria-hidden="true"
                className="relative col-start-2 row-start-1 size-[18px] before:absolute before:top-1/2 before:left-0 before:h-[1.5px] before:w-full before:bg-current after:absolute after:top-1/2 after:left-0 after:h-[1.5px] after:w-full after:rotate-90 after:bg-current after:transition-transform after:duration-(--dur-base) group-open:after:rotate-0 md:col-start-4"
              />
            </summary>
            <div className="grid max-w-[68ch] gap-4 pb-8 leading-relaxed text-bone-400">
              {item.summary ? <Markup source={item.summary} className="grid gap-3" /> : null}
              {item.highlights.length > 0 ? (
                <ul className="grid list-disc gap-1.5 pl-4.5">
                  {item.highlights.map((h) => (
                    <li key={h}>{h}</li>
                  ))}
                </ul>
              ) : null}
              {item.stack.length > 0 ? <p className="slate">{item.stack.join(" · ")}</p> : null}
            </div>
          </details>
        ))}
      </div>
    </section>
  );
}
