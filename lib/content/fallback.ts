import "server-only";

/**
 * Offline content source: used only when Supabase env vars are missing.
 * Builds DB-shaped rows from the seed JSON and runs them through the same mappers,
 * so the site renders identical domain objects with or without Supabase.
 * Images point at the Sanity CDN (absolute URLs pass through media-url).
 */
import type { Tables } from "@/lib/supabase/database.types";

import {
  mapAchievement,
  mapExperience,
  mapProfile,
  mapProject,
  mapSkill,
  type MediaRow,
  type ProjectRowWithRelations,
} from "./mappers";
import { buildSeedBundle, type ExtraContent, type LegacyContent, type LegacyImage, type SeedBundle } from "./seed-data";
import type { Achievement, Experience, Profile, Project, Skill } from "./types";

const EPOCH = "1970-01-01T00:00:00.000Z";
const stamps = { created_at: EPOCH, updated_at: EPOCH };

let warned = false;
let bundlePromise: Promise<SeedBundle> | undefined;

function loadBundle(): Promise<SeedBundle> {
  if (!warned) {
    warned = true;
    console.warn(
      "[content] Supabase env vars are missing — serving content from supabase/seed/*.json (offline fallback).",
    );
  }
  bundlePromise ??= Promise.all([
    import("@/supabase/seed/legacy-content.json"),
    import("@/supabase/seed/extra-content.json"),
  ]).then(([legacy, extra]) =>
    buildSeedBundle(
      (legacy.default ?? legacy) as unknown as LegacyContent,
      (extra.default ?? extra) as unknown as ExtraContent,
    ),
  );
  return bundlePromise;
}

function mediaRow(id: string, image: LegacyImage, position = 0): MediaRow {
  return {
    id,
    kind: "image",
    source: "storage",
    path: image.url,
    width: image.width,
    height: image.height,
    alt: image.alt,
    lqip: image.lqip,
    focal_x: image.focal_x,
    focal_y: image.focal_y,
    duration_s: null,
    position,
    ...stamps,
  };
}

function projectRows(bundle: SeedBundle): ProjectRowWithRelations[] {
  return bundle.projects.map((p) => {
    const id = `seed-project-${p.slug}`;
    const cover = p.cover ? mediaRow(`seed-media-${p.slug}-cover`, p.cover) : null;
    return {
      id,
      slug: p.slug,
      name: p.name,
      year: p.year,
      kind: p.kind,
      role: p.role,
      client: null,
      summary: p.summary,
      body: p.body,
      stack: p.stack,
      live_url: p.live_url,
      repo_url: p.repo_url,
      device: p.device,
      accent: p.accent,
      featured: p.featured,
      published: p.published,
      position: p.position,
      cover_media_id: cover?.id ?? null,
      film_media_id: null,
      loop_media_id: null,
      facts: [],
      seo_title: null,
      seo_description: null,
      ...stamps,
      cover,
      film: null,
      loop: null,
      project_media: cover
        ? p.frames.map((f, i) => ({
            id: `${id}-frame-${i}`,
            project_id: id,
            media_id: cover.id,
            placement: f.placement,
            col_start: f.colStart,
            col_end: f.colEnd,
            row_index: f.rowIndex,
            ratio: f.ratio,
            shift: f.shift,
            depth: f.depth,
            format: f.format,
            frame: f.frame,
            behavior: f.behavior,
            mobile_span: f.mobileSpan,
            caption: f.caption,
            is_cover: f.is_cover,
            position: f.position,
            ...stamps,
            media: cover,
          }))
        : [],
    };
  });
}

export async function fallbackProjects(): Promise<Project[]> {
  const bundle = await loadBundle();
  return projectRows(bundle)
    .filter((p) => p.published)
    .map(mapProject);
}

export async function fallbackProfile(): Promise<Profile> {
  const bundle = await loadBundle();
  const p = bundle.profile;
  return mapProfile({
    id: 1,
    ...p,
    socials: p.socials,
    ...stamps,
    profile_media: bundle.photos.map((photo) => {
      const media = mediaRow(`seed-media-profile-${photo.position}`, photo.image, photo.position);
      return {
        id: `seed-profile-media-${photo.position}`,
        profile_id: 1,
        media_id: media.id,
        slot: photo.slot,
        caption: "",
        position: photo.position,
        ...stamps,
        media,
      };
    }),
  });
}

export async function fallbackExperiences(): Promise<Experience[]> {
  const bundle = await loadBundle();
  return bundle.experiences.map((e) =>
    mapExperience({
      id: `seed-experience-${e.slug}`,
      slug: e.slug,
      role: e.role,
      org: e.org,
      start_date: e.start_date,
      end_date: e.end_date,
      summary: e.summary,
      highlights: [],
      stack: [],
      published: true,
      position: e.position,
      ...stamps,
    } satisfies Tables<"experiences">),
  );
}

export async function fallbackSkills(): Promise<Skill[]> {
  const bundle = await loadBundle();
  return bundle.skills.map((s) =>
    mapSkill({
      id: `seed-skill-${s.position}`,
      name: s.name,
      category: s.category,
      marquee_row: s.marquee_row,
      published: true,
      position: s.position,
      ...stamps,
    }),
  );
}

export async function fallbackAchievements(): Promise<Achievement[]> {
  const bundle = await loadBundle();
  return bundle.achievements.map((a) =>
    mapAchievement({
      id: `seed-achievement-${a.slug}`,
      slug: a.slug,
      kind: a.kind,
      title: a.title,
      org: a.org,
      period: a.period,
      summary: a.summary,
      url: a.url ?? null,
      published: true,
      position: a.position,
      ...stamps,
    }),
  );
}
