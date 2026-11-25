import { SectionHead } from "@/components/site/section-head";
import { TransitionLink } from "@/components/site/transition-link";
import type { Project } from "@/lib/content/types";

import { CaseArticle } from "./case-article";

export function Showcase({ projects, total }: { projects: Project[]; total: number }) {
  if (projects.length === 0) return null;
  const years = projects.map((p) => p.year.slice(0, 4)).sort();
  const span = years[0] === years.at(-1) ? years[0] : `${years[0]}–${years.at(-1)}`;

  return (
    <section id="work"  aria-labelledby="showcase-title">
      <SectionHead
        id="showcase-title"
        size="lg"
        title={
          <>
            Selected <em className="hl">reels</em>
          </>
        }
        lede={
          <>
            {projects.length} productions from {span}. Event platforms, on-chain games, Web3 protocols and mobile health
            tools, each with its role, stack and frames.
          </>
        }
      >
        <TransitionLink href="/work" className="slate text-link" data-cursor="open">
          Full index · {total} projects
        </TransitionLink>
      </SectionHead>

      <div className="grid">
        {projects.map((project, i) => (
          <CaseArticle key={project.id} project={project} index={i} />
        ))}
      </div>
    </section>
  );
}
