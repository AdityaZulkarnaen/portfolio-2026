import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

import { requireAdmin } from "@/lib/auth/dal";
import { resolveMediaUrl } from "@/lib/content/media-url";

import { ProjectRowControls } from "./row-controls";

export const metadata: Metadata = { title: "Projects" };

export default async function ProjectsPage() {
  const { supabase } = await requireAdmin();
  const { data, error } = await supabase
    .from("projects")
    .select("id, slug, name, year, kind, published, featured, cover:media!projects_cover_media_id_fkey(source, path)")
    .order("position")
    .order("created_at");
  const rows = data ?? [];

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold tracking-tight">Projects</h1>
          <p className="mt-2 text-bone-400">Order here is the order on the site. Featured ones show on the home page.</p>
        </div>
        <Link href="/admin/projects/new" className="pill-btn">
          New project
        </Link>
      </div>
      {error ? <p className="mt-6 text-[#ff9b8a]">{error.message}</p> : null}
      <ol className="mt-8 grid gap-2">
        {rows.map((p, i) => (
          <li key={p.id} className="flex items-center gap-4 rounded-xl p-3 pr-4 shadow-[inset_0_0_0_1px_var(--color-line)]">
            <span className="w-6 text-right text-sm text-bone-400 tabular-nums">{i + 1}</span>
            <span className="relative h-12 w-20 shrink-0 overflow-hidden rounded-md bg-ink-800">
              {p.cover ? <Image src={resolveMediaUrl(p.cover.source, p.cover.path)} alt="" fill sizes="80px" className="object-cover object-top" unoptimized /> : null}
            </span>
            <Link href={`/admin/projects/${p.id}`} className="min-w-0 flex-1">
              <span className="block truncate font-semibold hover:text-lilac-300">{p.name}</span>
              <span className="block truncate text-sm text-bone-400">
                {[p.kind, p.year].filter(Boolean).join(" · ")} · /work/{p.slug}
              </span>
            </Link>
            <ProjectRowControls id={p.id} published={p.published} featured={p.featured} first={i === 0} last={i === rows.length - 1} />
          </li>
        ))}
      </ol>
    </div>
  );
}
