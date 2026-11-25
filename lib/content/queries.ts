import "server-only";

/**
 * Public content reads. Every function is a `'use cache'` scope with the `days` profile and
 * `content` + entity tags, so public routes stay fully static under `ensureStatic = 'navigation'`.
 * Admin actions call `updateTag(...)`; `/api/revalidate` calls `revalidateTag(tag, 'max')`.
 *
 * Without Supabase env vars, reads fall back to supabase/seed/*.json (see fallback.ts).
 */
import { cacheLife, cacheTag } from "next/cache";

import { getPublicClient } from "@/lib/supabase/public";

import {
  fallbackAchievements,
  fallbackClients,
  fallbackExperiences,
  fallbackProfile,
  fallbackProjects,
  fallbackSectionMedia,
  fallbackSkills,
  fallbackTestimonials,
} from "./fallback";
import {
  mapAchievement,
  mapClient,
  mapExperience,
  mapMedia,
  mapProfile,
  mapProject,
  mapReel,
  mapSkill,
  mapTestimonial,
  type ClientRowWithLogo,
  type ProfileRowWithMedia,
  type ProjectRowWithRelations,
  type ReelRowWithChapters,
  type TestimonialRowWithRelations,
} from "./mappers";
import { SECTION_MEDIA_DIRS, sectionKey } from "./section-media";
import type { Achievement, Client, Experience, Media, Profile, Project, Reel, Skill, Testimonial } from "./types";

const PROJECT_SELECT = `
  *,
  cover:media!projects_cover_media_id_fkey(*),
  film:media!projects_film_media_id_fkey(*),
  loop:media!projects_loop_media_id_fkey(*),
  project_media(*, media:media!project_media_media_id_fkey(*))
`;

function fail(entity: string, error: { message: string }): never {
  throw new Error(`[content] Failed to load ${entity}: ${error.message}`);
}

export async function getProfile(): Promise<Profile | null> {
  "use cache";
  cacheLife("days");
  cacheTag("content", "profile");

  const supabase = getPublicClient();
  if (!supabase) return fallbackProfile();

  const { data, error } = await supabase
    .from("profile")
    .select("*, profile_media(*, media(*))")
    .eq("id", 1)
    .maybeSingle()
    .overrideTypes<ProfileRowWithMedia | null, { merge: false }>();
  if (error) fail("profile", error);
  return data ? mapProfile(data) : null;
}

export async function getAllProjects(): Promise<Project[]> {
  "use cache";
  cacheLife("days");
  cacheTag("content", "projects");

  const supabase = getPublicClient();
  if (!supabase) return fallbackProjects();

  const { data, error } = await supabase
    .from("projects")
    .select(PROJECT_SELECT)
    .eq("published", true)
    .order("position", { ascending: true })
    .overrideTypes<ProjectRowWithRelations[], { merge: false }>();
  if (error) fail("projects", error);
  return (data ?? []).map(mapProject);
}

export async function getFeaturedProjects(): Promise<Project[]> {
  "use cache";
  cacheLife("days");
  cacheTag("content", "projects", "projects:featured");

  const supabase = getPublicClient();
  if (!supabase) return (await fallbackProjects()).filter((p) => p.featured);

  const { data, error } = await supabase
    .from("projects")
    .select(PROJECT_SELECT)
    .eq("published", true)
    .eq("featured", true)
    .order("position", { ascending: true })
    .overrideTypes<ProjectRowWithRelations[], { merge: false }>();
  if (error) fail("featured projects", error);
  return (data ?? []).map(mapProject);
}

export async function getProject(slug: string): Promise<Project | null> {
  "use cache";
  cacheLife("days");
  cacheTag("content", "projects", `project:${slug}`);

  const supabase = getPublicClient();
  if (!supabase) return (await fallbackProjects()).find((p) => p.slug === slug) ?? null;

  const { data, error } = await supabase
    .from("projects")
    .select(PROJECT_SELECT)
    .eq("published", true)
    .eq("slug", slug)
    .maybeSingle()
    .overrideTypes<ProjectRowWithRelations | null, { merge: false }>();
  if (error) fail(`project "${slug}"`, error);
  return data ? mapProject(data) : null;
}

export async function getProjectSlugs(): Promise<string[]> {
  "use cache";
  cacheLife("days");
  cacheTag("content", "projects");

  const supabase = getPublicClient();
  if (!supabase) return (await fallbackProjects()).map((p) => p.slug);

  const { data, error } = await supabase
    .from("projects")
    .select("slug")
    .eq("published", true)
    .order("position", { ascending: true });
  if (error) fail("project slugs", error);
  return (data ?? []).map((row) => row.slug);
}

export async function getExperiences(): Promise<Experience[]> {
  "use cache";
  cacheLife("days");
  cacheTag("content", "experiences");

  const supabase = getPublicClient();
  if (!supabase) return fallbackExperiences();

  const { data, error } = await supabase
    .from("experiences")
    .select("*")
    .eq("published", true)
    .order("position", { ascending: true });
  if (error) fail("experiences", error);
  return (data ?? []).map(mapExperience);
}

export async function getSkills(): Promise<Skill[]> {
  "use cache";
  cacheLife("days");
  cacheTag("content", "skills");

  const supabase = getPublicClient();
  if (!supabase) return fallbackSkills();

  const { data, error } = await supabase
    .from("skills")
    .select("*")
    .eq("published", true)
    .order("marquee_row", { ascending: true })
    .order("position", { ascending: true });
  if (error) fail("skills", error);
  return (data ?? []).map(mapSkill);
}

export async function getAchievements(): Promise<Achievement[]> {
  "use cache";
  cacheLife("days");
  cacheTag("content", "achievements");

  const supabase = getPublicClient();
  if (!supabase) return fallbackAchievements();

  const { data, error } = await supabase
    .from("achievements")
    .select("*")
    .eq("published", true)
    .order("position", { ascending: true });
  if (error) fail("achievements", error);
  return (data ?? []).map(mapAchievement);
}

/** Experience and trophy images, linked by storage path (`experience/<key>.*`), keyed by `<key>`. */
export async function getSectionMedia(): Promise<Record<string, Media>> {
  "use cache";
  cacheLife("days");
  cacheTag("content", "media");

  const supabase = getPublicClient();
  if (!supabase) return fallbackSectionMedia();

  const { data, error } = await supabase
    .from("media")
    .select("*")
    .eq("source", "storage")
    .or(SECTION_MEDIA_DIRS.map((d) => `path.like.${d}/%`).join(","));
  if (error) fail("section media", error);
  return Object.fromEntries((data ?? []).map((row) => [sectionKey(row.path), mapMedia(row)]));
}

export async function getActiveReel(): Promise<Reel | null> {
  "use cache";
  cacheLife("days");
  cacheTag("content", "reels");

  const supabase = getPublicClient();
  if (!supabase) return null; // No reel until Phase 2.

  const { data, error } = await supabase
    .from("reels")
    .select("*, reel_chapters(*, project:projects(slug))")
    .eq("is_active", true)
    .maybeSingle()
    .overrideTypes<ReelRowWithChapters | null, { merge: false }>();
  if (error) fail("active reel", error);
  return data ? mapReel(data) : null;
}

export async function getClients(): Promise<Client[]> {
  "use cache";
  cacheLife("days");
  cacheTag("content", "clients");

  const supabase = getPublicClient();
  if (!supabase) return fallbackClients();

  const { data, error } = await supabase
    .from("clients")
    .select("*, logo:media!clients_logo_media_id_fkey(*)")
    .eq("published", true)
    .order("position", { ascending: true })
    .overrideTypes<ClientRowWithLogo[], { merge: false }>();
  if (error) fail("clients", error);
  const rows = data ?? [];
  // Projects are resolved separately so the query works before and after `project_id` exists.
  const ids = [...new Set(rows.map((r) => r.project_id).filter((id): id is string => Boolean(id)))];
  if (ids.length === 0) return rows.map(mapClient);
  const projects = await supabase.from("projects").select("id, slug, name, published").in("id", ids);
  if (projects.error) fail("client projects", projects.error);
  const byId = new Map((projects.data ?? []).map((p) => [p.id, p]));
  return rows.map((r) => mapClient({ ...r, project: r.project_id ? (byId.get(r.project_id) ?? null) : null }));
}

export async function getTestimonials(): Promise<Testimonial[]> {
  "use cache";
  cacheLife("days");
  cacheTag("content", "testimonials");

  const supabase = getPublicClient();
  if (!supabase) return fallbackTestimonials();

  const { data, error } = await supabase
    .from("testimonials")
    .select(
      "*, avatar:media!testimonials_avatar_media_id_fkey(*), project:projects!testimonials_project_id_fkey(slug, name, published)",
    )
    .eq("published", true)
    .order("position", { ascending: true })
    .overrideTypes<TestimonialRowWithRelations[], { merge: false }>();
  if (error) fail("testimonials", error);
  return (data ?? []).map(mapTestimonial);
}
