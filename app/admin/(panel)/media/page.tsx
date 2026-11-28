import type { Metadata } from "next";

import { MEDIA_COLUMNS, toAdminMedia } from "@/lib/admin/media";
import { requireAdmin } from "@/lib/auth/dal";

import { MediaTile } from "./media-tile";
import { Uploader } from "./uploader";

export const metadata: Metadata = { title: "Media" };

export default async function MediaPage({ searchParams }: PageProps<"/admin/media">) {
  const { folder } = await searchParams;
  const { supabase } = await requireAdmin();
  const [{ data, error }, used] = await Promise.all([
    supabase.from("media").select(MEDIA_COLUMNS).order("created_at", { ascending: false }),
    usage(supabase),
  ]);
  const all = (data ?? []).map(toAdminMedia);
  const folders = [...new Set(all.map((m) => m.path.split("/")[0]))].sort();
  const current = typeof folder === "string" && folders.includes(folder) ? folder : null;
  const shown = current ? all.filter((m) => m.path.startsWith(`${current}/`)) : all;

  return (
    <div>
      <h1 className="text-4xl font-bold tracking-tight">Media</h1>
      <p className="mt-2 max-w-[70ch] text-bone-400">
        Images are resized to at most 2560px and converted to WebP in your browser before upload. Videos are encoded with the
        video scripts and attach to projects by slug.
      </p>
      <Uploader />
      {error ? <p className="mt-6 text-[#ff9b8a]">{error.message}</p> : null}
      <nav aria-label="Folders" className="mt-10 flex flex-wrap gap-2">
        <a href="/admin/media" aria-current={!current ? "page" : undefined} className="slate rounded-full px-3 py-1.5 text-bone-400 shadow-[inset_0_0_0_1px_var(--color-line)] aria-[current]:bg-bone-100 aria-[current]:text-ink-950">
          All {all.length}
        </a>
        {folders.map((f) => (
          <a
            key={f}
            href={`/admin/media?folder=${encodeURIComponent(f)}`}
            aria-current={current === f ? "page" : undefined}
            className="slate rounded-full px-3 py-1.5 text-bone-400 shadow-[inset_0_0_0_1px_var(--color-line)] aria-[current]:bg-bone-100 aria-[current]:text-ink-950"
          >
            {f}
          </a>
        ))}
      </nav>
      <ul className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {shown.map((m) => (
          <MediaTile key={m.id} media={m} uses={used.get(m.id) ?? 0} />
        ))}
      </ul>
    </div>
  );
}

/** How many places reference each media row (so deleting shows what it affects). */
async function usage(supabase: Awaited<ReturnType<typeof requireAdmin>>["supabase"]) {
  const counts = new Map<string, number>();
  const add = (id: string | null) => {
    if (id) counts.set(id, (counts.get(id) ?? 0) + 1);
  };
  const [frames, projects, profile, clients, testimonials, skills] = await Promise.all([
    supabase.from("project_media").select("media_id"),
    supabase.from("projects").select("cover_media_id"),
    supabase.from("profile_media").select("media_id"),
    supabase.from("clients").select("logo_media_id"),
    supabase.from("testimonials").select("avatar_media_id"),
    supabase.from("skills").select("logo_media_id"),
  ]);
  frames.data?.forEach((r) => add(r.media_id));
  projects.data?.forEach((r) => add(r.cover_media_id));
  profile.data?.forEach((r) => add(r.media_id));
  clients.data?.forEach((r) => add(r.logo_media_id));
  testimonials.data?.forEach((r) => add(r.avatar_media_id));
  skills.data?.forEach((r) => add(r.logo_media_id));
  return counts;
}
