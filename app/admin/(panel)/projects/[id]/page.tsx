import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { MEDIA_COLUMNS, toAdminMedia } from "@/lib/admin/media";
import { requireAdmin } from "@/lib/auth/dal";
import { projectVideo } from "@/lib/content/video-manifest";

import { DeleteProject } from "./delete-project";
import { FramesEditor, type EditorFrame } from "./frames-editor";
import { ProjectForm, type ProjectValues } from "./project-form";

export const metadata: Metadata = { title: "Edit project" };

const EMPTY: ProjectValues = {
  id: "",
  name: "",
  slug: "",
  year: String(new Date().getFullYear()),
  kind: "",
  role: "",
  client: "",
  summary: "",
  body: "",
  stack: "",
  live_url: "",
  repo_url: "",
  device: "desktop",
  accent: "",
  facts: "",
  seo_title: "",
  seo_description: "",
  published: false,
  featured: false,
  cover_media_id: "",
};

export default async function ProjectEditPage({ params }: PageProps<"/admin/projects/[id]">) {
  const { id } = await params;
  const isNew = id === "new";
  const { supabase } = await requireAdmin();

  const [mediaRes, projectRes, framesRes] = await Promise.all([
    supabase.from("media").select(MEDIA_COLUMNS).order("path"),
    isNew ? Promise.resolve({ data: null }) : supabase.from("projects").select("*").eq("id", id).maybeSingle(),
    isNew
      ? Promise.resolve({ data: [] })
      : supabase.from("project_media").select("*").eq("project_id", id).order("position"),
  ]);
  const media = (mediaRes.data ?? []).map(toAdminMedia);
  const p = projectRes.data;
  if (!isNew && !p) notFound();

  const values: ProjectValues = p
    ? {
        id: p.id,
        name: p.name,
        slug: String(p.slug),
        year: p.year,
        kind: p.kind,
        role: p.role,
        client: p.client ?? "",
        summary: p.summary,
        body: p.body,
        stack: p.stack.join(", "),
        live_url: p.live_url ?? "",
        repo_url: p.repo_url ?? "",
        device: p.device as "desktop" | "mobile",
        accent: p.accent ?? "",
        facts: ((p.facts as { label: string; value: string }[]) ?? []).map((f) => `${f.label} | ${f.value}`).join("\n"),
        seo_title: p.seo_title ?? "",
        seo_description: p.seo_description ?? "",
        published: p.published,
        featured: p.featured,
        cover_media_id: p.cover_media_id ?? "",
      }
    : EMPTY;

  const frames: EditorFrame[] = (framesRes.data ?? []).map((f) => ({
    key: f.id,
    media_id: f.media_id,
    placement: f.placement as EditorFrame["placement"],
    frame: f.frame as EditorFrame["frame"],
    caption: f.caption,
    is_cover: f.is_cover,
    col_start: f.col_start,
    col_end: f.col_end,
    row_index: f.row_index,
    ratio: Number(f.ratio),
    shift: Number(f.shift),
    depth: Number(f.depth),
    format: f.format as EditorFrame["format"],
    behavior: f.behavior as EditorFrame["behavior"],
    mobile_span: f.mobile_span,
  }));

  const videos = p
    ? (["film", "loop", "phoneLoop"] as const).filter((role) => projectVideo(String(p.slug), role)).map((r) => (r === "phoneLoop" ? "phone loop" : r))
    : [];

  return (
    <div className="grid gap-12">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <Link href="/admin/projects" className="slate text-link">
            ← Projects
          </Link>
          <h1 className="mt-4 text-4xl font-bold tracking-tight">{p ? p.name : "New project"}</h1>
        </div>
        {p ? (
          <Link href={`/work/${String(p.slug)}`} target="_blank" className="slate text-link">
            Open on site ↗
          </Link>
        ) : null}
      </div>

      <ProjectForm initial={values} media={media} />

      {p ? (
        <>
          <section>
            <h2 className="text-2xl font-bold tracking-tight">Gallery</h2>
            <p className="mt-2 max-w-[70ch] text-bone-400">
              The case page shows up to two screens and one phone view. &ldquo;Showcase&rdquo; frames feed the home page card.
              Videos come from the encoded files for this slug
              {videos.length ? ` (found: ${videos.join(", ")})` : " (none found)"}.
            </p>
            <FramesEditor projectId={p.id} initial={frames} media={media} />
          </section>
          <DeleteProject id={p.id} name={p.name} />
        </>
      ) : null}
    </div>
  );
}
