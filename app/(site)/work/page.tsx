import type { Metadata } from "next";

import { SplitReveal } from "@/components/motion/split-reveal";
import { RouteSignal } from "@/components/runtime/route-signal";
import { PageTransition } from "@/components/site/page-transition";
import { WorkIndex, type WorkRow } from "@/components/work/work-index";
import { accentOrDefault } from "@/lib/content/format";
import { getAllProjects } from "@/lib/content/queries";

export const metadata: Metadata = {
  title: "Work",
  description: "Every project by Aditya Zulkarnaen: web platforms, mobile apps, Web3 and games, 2024–2026.",
};

export default async function WorkPage() {
  const projects = await getAllProjects();
  const rows: WorkRow[] = projects.map((p) => ({
    slug: p.slug,
    name: p.name,
    kind: p.kind,
    year: p.year,
    role: p.role,
    accent: accentOrDefault(p.accent),
    featured: p.featured,
    phone: p.device === "mobile",
    cover:
      p.cover && p.cover.width && p.cover.height
        ? { src: p.cover.src, width: p.cover.width, height: p.cover.height, lqip: p.cover.lqip }
        : null,
  }));

  return (
    <PageTransition>
      <RouteSignal />
      <section className="px-gutter pt-[calc(var(--spacing-header)+4rem)] pb-[clamp(5rem,9vw,9rem)]" aria-labelledby="work-title">
        <header className="mb-[clamp(2.5rem,5vw,4.5rem)] grid gap-6 md:grid-cols-[1fr_auto] md:items-end">
          <SplitReveal as="h1" id="work-title" className="display -ml-[0.04em] text-[clamp(4.5rem,21vw,24rem)] leading-[0.8]" type="chars">
            Index
          </SplitReveal>
          <p className="max-w-[30ch] pb-4 text-lg leading-normal text-bone-400">
            All {projects.length} reels, from on-chain games to event platforms. Pick one to open the case.
          </p>
        </header>
        <WorkIndex rows={rows} />
      </section>
    </PageTransition>
  );
}
