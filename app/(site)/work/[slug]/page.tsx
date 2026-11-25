import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { getProject, getProjectSlugs } from "@/lib/content/queries";

const EMPTY_SLUG = "__none__";

/** ensureStatic = 'navigation' requires at least one complete param set. */
export async function generateStaticParams() {
  const slugs = await getProjectSlugs();
  return slugs.length > 0 ? slugs.map((slug) => ({ slug })) : [{ slug: EMPTY_SLUG }];
}

export async function generateMetadata({ params }: PageProps<"/work/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const project = slug === EMPTY_SLUG ? null : await getProject(slug);
  if (!project) return {};
  return {
    title: project.seoTitle ?? project.name,
    description: project.seoDescription ?? project.summary,
  };
}

export default async function CasePage({ params }: PageProps<"/work/[slug]">) {
  const { slug } = await params;
  if (slug === EMPTY_SLUG) notFound();
  const project = await getProject(slug);
  if (!project) notFound();

  return (
    <article className="min-h-svh px-6 pt-32 pb-16 md:px-10">
      <p className="slate text-bone-400">
        Case · {project.kind} · {project.year}
      </p>
      <h1 className="mt-4 text-5xl font-bold tracking-tight md:text-7xl">{project.name}</h1>
      <p className="mt-6 max-w-2xl text-bone-400">{project.summary}</p>
    </article>
  );
}
