"use server";

import { refresh, updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { requireAdmin } from "@/lib/auth/dal";

const uuid = z.string().uuid();
const optionalUrl = z
  .string()
  .trim()
  .transform((v) => v || null)
  .refine((v) => v === null || /^https?:\/\//.test(v), "Start the link with https://");

const projectSchema = z.object({
  name: z.string().trim().min(1, "Give it a name.").max(160),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "Lowercase letters, numbers and single dashes only.")
    .max(96),
  year: z.string().trim().max(20),
  kind: z.string().trim().max(80),
  role: z.string().trim().max(120),
  client: z.string().trim().max(160).transform((v) => v || null),
  summary: z.string().trim().max(600),
  body: z.string().trim().max(20000),
  stack: z.string().transform((v) =>
    v
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean),
  ),
  live_url: optionalUrl,
  repo_url: optionalUrl,
  device: z.enum(["desktop", "mobile"]),
  accent: z
    .string()
    .trim()
    .transform((v) => v || null)
    .refine((v) => v === null || /^#[0-9a-fA-F]{6}$/.test(v), "Use a hex colour like #A99BFF."),
  facts: z.string().transform((v) =>
    v
      .split("\n")
      .map((line) => line.split("|").map((s) => s.trim()))
      .filter(([label, value]) => label && value)
      .map(([label, value]) => ({ label, value })),
  ),
  seo_title: z.string().trim().max(120).transform((v) => v || null),
  seo_description: z.string().trim().max(300).transform((v) => v || null),
  published: z.boolean(),
  featured: z.boolean(),
  cover_media_id: z
    .string()
    .transform((v) => v || null)
    .pipe(uuid.nullable()),
});

export type ProjectFormState = { error: string | null; fieldErrors: Record<string, string>; saved: boolean };

export async function saveProject(_prev: ProjectFormState, formData: FormData): Promise<ProjectFormState> {
  const { supabase } = await requireAdmin();
  const raw = Object.fromEntries(formData) as Record<string, string>;
  const parsed = projectSchema.safeParse({ ...raw, published: raw.published === "on", featured: raw.featured === "on" });
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) fieldErrors[String(issue.path[0])] ??= issue.message;
    return { error: "Some fields need another look.", fieldErrors, saved: false };
  }

  const id = raw.id ? uuid.parse(raw.id) : null;
  if (id) {
    const { error } = await supabase.from("projects").update(parsed.data).eq("id", id);
    if (error) return { error: friendly(error.message), fieldErrors: {}, saved: false };
    updateTag("content");
    refresh();
    return { error: null, fieldErrors: {}, saved: true };
  }

  const { data: last } = await supabase.from("projects").select("position").order("position", { ascending: false }).limit(1).maybeSingle();
  const { data, error } = await supabase
    .from("projects")
    .insert({ ...parsed.data, position: (last?.position ?? -1) + 1 })
    .select("id")
    .single();
  if (error) return { error: friendly(error.message), fieldErrors: {}, saved: false };
  updateTag("content");
  redirect(`/admin/projects/${data.id}`);
}

function friendly(message: string) {
  if (message.includes("projects_slug_key") || message.includes("duplicate key")) return "Another project already uses that slug.";
  return message;
}

export async function toggleProject(id: string, field: "published" | "featured", value: boolean) {
  const { supabase } = await requireAdmin();
  await supabase
    .from("projects")
    .update(field === "published" ? { published: value } : { featured: value })
    .eq("id", uuid.parse(id));
  updateTag("content");
  refresh();
}

/** Swap with the neighbour and renumber every project 0..n (14 rows: cheap and self-healing). */
export async function moveProject(id: string, direction: -1 | 1) {
  const { supabase } = await requireAdmin();
  const { data } = await supabase.from("projects").select("id").order("position").order("created_at");
  if (!data) return;
  const ids = data.map((r) => r.id);
  const i = ids.indexOf(uuid.parse(id));
  const j = i + direction;
  if (i < 0 || j < 0 || j >= ids.length) return;
  [ids[i], ids[j]] = [ids[j], ids[i]];
  await Promise.all(ids.map((pid, position) => supabase.from("projects").update({ position }).eq("id", pid)));
  updateTag("content");
  refresh();
}

export async function deleteProject(id: string) {
  const { supabase } = await requireAdmin();
  await supabase.from("projects").delete().eq("id", uuid.parse(id));
  updateTag("content");
  redirect("/admin/projects");
}

const frameSchema = z.object({
  media_id: uuid,
  placement: z.enum(["showcase", "case", "both"]),
  frame: z.enum(["none", "browser", "phone"]),
  caption: z.string().max(200),
  is_cover: z.boolean(),
  // Legacy editorial-grid fields ride along unchanged.
  col_start: z.number().int().min(1).max(12).optional(),
  col_end: z.number().int().min(2).max(13).optional(),
  row_index: z.number().int().min(1).max(64).optional(),
  ratio: z.number().positive().max(10).optional(),
  shift: z.number().min(-4).max(4).optional(),
  depth: z.number().min(-1).max(1).optional(),
  format: z.enum(["landscape", "portrait", "square", "tall"]).optional(),
  behavior: z.enum(["static", "scroll"]).optional(),
  mobile_span: z.number().int().min(1).max(12).optional(),
});

export type FrameInput = z.input<typeof frameSchema>;

export async function saveFrames(projectId: string, frames: FrameInput[]): Promise<{ error: string | null }> {
  const { supabase } = await requireAdmin();
  const parsed = z.array(frameSchema).max(40).safeParse(frames);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid frames." };
  const { error } = await supabase.rpc("replace_project_media", {
    p_project: uuid.parse(projectId),
    p_frames: parsed.data.map((f, position) => ({ ...f, position })),
  });
  if (error) return { error: error.message };
  updateTag("content");
  refresh();
  return { error: null };
}
