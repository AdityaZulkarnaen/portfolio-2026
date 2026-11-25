import Link from "next/link";

import { getFeaturedProjects, getProfile } from "@/lib/content/queries";

export default async function HomePage() {
  const [profile, featured] = await Promise.all([getProfile(), getFeaturedProjects()]);

  return (
    <section className="flex min-h-svh flex-col justify-end gap-6 px-6 pt-32 pb-16 md:px-10">
      <p className="slate text-bone-400">Reel 00 · Projection room</p>
      <h1 className="text-6xl font-extrabold tracking-tight md:text-9xl">
        {profile?.fullName ?? "Aditya Zulkarnaen"}
      </h1>
      {profile?.headline ? <p className="max-w-xl text-lg text-bone-400">{profile.headline}</p> : null}
      <ol className="mt-8 flex flex-col gap-2">
        {featured.map((project, i) => (
          <li key={project.id}>
            <Link href={`/work/${project.slug}`} className="slate text-bone-100 hover:text-ember-300">
              {String(i + 1).padStart(2, "0")} · {project.name}
            </Link>
          </li>
        ))}
      </ol>
    </section>
  );
}
