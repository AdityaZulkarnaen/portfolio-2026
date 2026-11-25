import { VelocityMarquee } from "@/components/motion/velocity-marquee";
import { SectionHead } from "@/components/site/section-head";
import type { Skill, SkillCategory } from "@/lib/content/types";
import { cn } from "@/lib/utils";

const CATEGORY_LABEL: Record<SkillCategory, string> = {
  language: "Languages",
  frontend: "Frontend",
  backend: "Backend",
  mobile: "Mobile",
  data: "Database & Cloud",
  web3: "Web3",
  tools: "Tools",
};

/** Each row gets its own voice: expanded heavy, light muted, serif italic. */
const ROW_STYLE = [
  "font-extrabold font-stretch-expanded tracking-[-0.035em]",
  "font-light tracking-[-0.035em] text-bone-400",
  "font-serif italic font-normal text-ember-300",
];

export function Stack({ skills }: { skills: Skill[] }) {
  if (skills.length === 0) return null;
  const rows = ([1, 2, 3] as const).map((row) => skills.filter((s) => s.marqueeRow === row)).filter((r) => r.length > 0);

  return (
    <section aria-labelledby="stack-title" className="border-t border-line pb-[clamp(4rem,8vw,8rem)]">
      <SectionHead
        id="stack-title"
        title={
          <>
            The <em className="hl">kit</em>
          </>
        }
        lede="Tools I reach for, grouped the way I use them. Scroll faster and they run faster."
      />
      <div className="grid grid-cols-1 gap-[clamp(1.5rem,3vw,2.5rem)]">
        {rows.map((row, i) => {
          const labels = Array.from(new Set(row.map((s) => s.category))).map((c) => CATEGORY_LABEL[c]);
          return (
            <div key={i} className="min-w-0">
              <p className="slate px-gutter pb-2.5 text-bone-400">{labels.join(" · ")}</p>
              <VelocityMarquee speed={28 + i * 10} direction={i % 2 === 0 ? 1 : -1} label={labels.join(", ")}>
                {row.map((skill) => (
                  <span
                    key={skill.id}
                    className={cn(
                      "inline-flex items-center gap-[clamp(1rem,2.4vw,2.4rem)] pr-[clamp(1rem,2.4vw,2.4rem)] text-[clamp(2.4rem,6.6vw,7.5rem)] leading-none whitespace-nowrap",
                      ROW_STYLE[i % ROW_STYLE.length],
                    )}
                  >
                    {skill.name}
                    <span
                      aria-hidden="true"
                      className="size-[0.32em] bg-ember-500 [clip-path:polygon(50%_0,61%_39%,100%_50%,61%_61%,50%_100%,39%_61%,0_50%,39%_39%)]"
                    />
                  </span>
                ))}
              </VelocityMarquee>
            </div>
          );
        })}
      </div>
    </section>
  );
}
