import { Markup } from "@/components/site/markup";
import { SectionHead } from "@/components/site/section-head";
import { timecodeRange } from "@/lib/content/format";
import type { Experience as ExperienceItem } from "@/lib/content/types";

/** "BOT Launchpad: no-code deployment…" → lead + rest, so project names scan first. */
function splitLead(text: string): [string | null, string] {
  const at = text.indexOf(": ");
  return at > 0 && at <= 32 ? [text.slice(0, at), text.slice(at + 2)] : [null, text];
}

/** Credits: every role open, timecoded, on HUD hairlines. Current roles first, then most recent start. */
export function Experience({ items }: { items: ExperienceItem[] }) {
  if (items.length === 0) return null;
  const sorted = [...items].sort(
    (a, b) => Number(b.endDate === null) - Number(a.endDate === null) || b.startDate.localeCompare(a.startDate),
  );

  return (
    <section aria-labelledby="exp-title" className="border-t border-line pb-[clamp(4rem,8vw,8rem)]">
      <SectionHead
        id="exp-title"
        variant="booth"
        kicker="Experience"
        title="credits"
        lede="Internship, freelance and team work, most recent first."
      />
      <ol className="mx-gutter">
        {sorted.map((item, i) => (
          <li
            key={item.id}
            className="grid gap-x-[4vw] gap-y-5 py-[clamp(1.75rem,3.2vw,3rem)] md:grid-cols-12"
          >
            <div aria-hidden="true" className="relative h-px bg-line md:col-span-12">
              <span className="absolute top-1/2 left-0 size-[5px] -translate-1/2 rounded-full bg-bone-100" />
            </div>
            <div className="slate grid content-start gap-1.5 text-bone-400 tabular-nums md:col-span-3">
              <span className="flex items-center gap-2 text-bone-100">
                {item.endDate === null ? (
                  <span aria-hidden="true" className="size-1.5 animate-pulse-ring rounded-full bg-tide-400 motion-off:animate-none" />
                ) : null}
                {timecodeRange(item.startDate, item.endDate)}
              </span>
              <span>{String(i + 1).padStart(2, "0")} / {String(sorted.length).padStart(2, "0")}</span>
            </div>
            <div className="grid content-start gap-5 md:col-span-9">
              <header className="grid gap-1.5">
                <h3 className="text-[clamp(1.75rem,3.2vw,3.25rem)] leading-[1] font-light tracking-[-0.04em] text-balance text-bone-100 lowercase">
                  {item.role}
                </h3>
                <p className="slate text-bone-400">{item.org}</p>
              </header>
              <div className="grid gap-x-[4vw] gap-y-5 lg:grid-cols-9">
                <div className="grid content-start gap-4 leading-relaxed text-bone-400 lg:col-span-6">
                  {item.summary ? <Markup source={item.summary} className="grid max-w-[60ch] gap-3 text-bone-100" /> : null}
                  {item.highlights.length > 0 ? (
                    <ul className="grid max-w-[64ch] gap-2.5">
                      {item.highlights.map((h) => {
                        const [lead, rest] = splitLead(h);
                        return (
                          <li key={h} className="grid grid-cols-[0.875rem_1fr] gap-x-2">
                            <span aria-hidden="true" className="mt-[0.7em] h-px w-2 bg-(--tint,var(--color-line-strong))" />
                            <span>
                              {lead ? <span className="text-bone-100">{lead} · </span> : null}
                              {rest}
                            </span>
                          </li>
                        );
                      })}
                    </ul>
                  ) : null}
                </div>
                {item.stack.length > 0 ? (
                  <ul className="slate flex flex-wrap content-start gap-x-4 gap-y-1.5 text-bone-400 lg:col-span-3 lg:grid lg:gap-y-1" aria-label="Stack">
                    {item.stack.map((s) => (
                      <li key={s}>{s}</li>
                    ))}
                  </ul>
                ) : null}
              </div>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
