import { SectionHead } from "@/components/site/section-head";
import type { Skill, SkillCategory } from "@/lib/content/types";

import { type DriftGroup, StackDrift } from "./stack-drift";

const CATEGORIES: { key: SkillCategory; label: string }[] = [
  { key: "language", label: "Languages" },
  { key: "frontend", label: "Frontend" },
  { key: "backend", label: "Backend" },
  { key: "mobile", label: "Mobile" },
  { key: "data", label: "Data & cloud" },
  { key: "web3", label: "Web3" },
  { key: "tools", label: "Tools" },
];

/** The stack: marks that drift in on the current and settle into category columns (<StackDrift>). */
export function Stack({ skills }: { skills: Skill[] }) {
  if (skills.length === 0) return null;
  const groups: DriftGroup[] = CATEGORIES.map(({ key, label }) => ({
    key,
    label,
    items: skills
      .filter((s) => s.category === key)
      .sort((a, b) => a.marqueeRow - b.marqueeRow || a.position - b.position)
      .map((s) => ({ id: s.id, name: s.name, logo: s.logo ? { src: s.logo.src, alt: s.logo.alt } : null })),
  })).filter((g) => g.items.length > 0);

  return (
    <section aria-labelledby="stack-title" className="overflow-clip border-t border-line pb-[clamp(3rem,6vw,6rem)]">
      <SectionHead
        id="stack-title"
        variant="booth"
        kicker="Stack"
        title="what i build with"
        lede="Languages, frameworks and the tools around them, grouped the way I use them."
      />
      <StackDrift groups={groups} />
    </section>
  );
}
