import type { Metadata } from "next";
import Link from "next/link";

import { getAllProjects } from "@/lib/content/queries";

export const metadata: Metadata = {
  title: "Work",
};

export default async function WorkPage() {
  const projects = await getAllProjects();

  return (
    <section className="min-h-svh px-6 pt-32 pb-16 md:px-10">
      <p className="slate text-bone-400">Index · All reels</p>
      <h1 className="mt-4 text-5xl font-bold tracking-tight md:text-7xl">Work</h1>
      <ul className="mt-10 flex flex-col gap-3">
        {projects.map((project) => (
          <li key={project.id}>
            <Link href={`/work/${project.slug}`} className="text-bone-100 hover:text-ember-300">
              {project.name}
            </Link>{" "}
            <span className="slate text-bone-400">
              {project.kind} · {project.year}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
