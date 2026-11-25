/** DB rows → domain types. Pure and defensive: unknown vocab values fall back to safe defaults. */
import type { Json, Tables } from "@/lib/supabase/database.types";

import { resolveMediaUrl } from "./media-url";
import type {
  Achievement,
  AchievementKind,
  Client,
  Experience,
  FrameBehavior,
  FrameChrome,
  FrameFormat,
  FramePlacement,
  Media,
  Profile,
  Project,
  ProjectFact,
  ProjectFrame,
  Reel,
  Metric,
  ReelChapter,
  Skill,
  SkillCategory,
  SocialLink,
  Testimonial,
} from "./types";

export type MediaRow = Tables<"media">;

export type ProjectMediaRow = Tables<"project_media"> & { media: MediaRow | null };

export type ProjectRowWithRelations = Tables<"projects"> & {
  cover: MediaRow | null;
  film: MediaRow | null;
  loop: MediaRow | null;
  project_media: ProjectMediaRow[] | null;
};

export type ProfileRowWithMedia = Tables<"profile"> & {
  profile_media: (Tables<"profile_media"> & { media: MediaRow | null })[] | null;
};

export type ReelRowWithChapters = Tables<"reels"> & {
  reel_chapters: (Tables<"reel_chapters"> & { project: { slug: string } | null })[] | null;
};

function oneOf<T extends string>(value: string, allowed: readonly T[], fallback: T): T {
  return (allowed as readonly string[]).includes(value) ? (value as T) : fallback;
}

function num(value: number | string | null | undefined, fallback: number): number {
  const n = typeof value === "string" ? Number(value) : value;
  return typeof n === "number" && Number.isFinite(n) ? n : fallback;
}

function numOrNull(value: number | string | null | undefined): number | null {
  const n = typeof value === "string" ? Number(value) : value;
  return typeof n === "number" && Number.isFinite(n) ? n : null;
}

export function mapMedia(row: MediaRow): Media {
  const source = row.source === "public" ? "public" : "storage";
  return {
    id: row.id,
    kind: row.kind === "video" ? "video" : "image",
    source,
    path: row.path,
    src: resolveMediaUrl(source, row.path),
    width: row.width,
    height: row.height,
    alt: row.alt,
    lqip: row.lqip,
    focalX: numOrNull(row.focal_x),
    focalY: numOrNull(row.focal_y),
    durationS: numOrNull(row.duration_s),
  };
}

const PLACEMENTS: readonly FramePlacement[] = ["showcase", "case", "both"];
const FORMATS: readonly FrameFormat[] = ["landscape", "portrait", "square", "tall"];
const CHROMES: readonly FrameChrome[] = ["none", "browser", "phone"];
const BEHAVIORS: readonly FrameBehavior[] = ["static", "scroll"];

export function mapFrame(row: ProjectMediaRow): ProjectFrame | null {
  if (!row.media) return null;
  return {
    id: row.id,
    media: mapMedia(row.media),
    placement: oneOf(row.placement, PLACEMENTS, "both"),
    caption: row.caption,
    isCover: row.is_cover,
    position: row.position,
    colStart: num(row.col_start, 1),
    colEnd: num(row.col_end, 13),
    rowIndex: num(row.row_index, 1),
    ratio: num(row.ratio, 16 / 9),
    shift: num(row.shift, 0),
    depth: num(row.depth, 0),
    format: oneOf(row.format, FORMATS, "landscape"),
    frame: oneOf(row.frame, CHROMES, "none"),
    behavior: oneOf(row.behavior, BEHAVIORS, "static"),
    mobileSpan: num(row.mobile_span, 12),
  };
}

function mapFacts(value: Json): ProjectFact[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (item && typeof item === "object" && !Array.isArray(item)) {
      const label = item.label;
      const factValue = item.value;
      if (typeof label === "string" && typeof factValue === "string") return [{ label, value: factValue }];
    }
    return [];
  });
}

/** Shown when profile.metrics is empty. */
export const DEFAULT_METRICS: Metric[] = [
  { value: "5+", label: "Awards" },
  { value: "5+", label: "Clients" },
  { value: "1k+", label: "Web users" },
  { value: "iOS + Android", label: "Shipped to App Store & Play Store" },
];

function mapMetrics(value: Json): Metric[] {
  if (!Array.isArray(value)) return DEFAULT_METRICS;
  const list = value.flatMap((item) => {
    if (item && typeof item === "object" && !Array.isArray(item)) {
      const { value: v, label } = item;
      if (typeof v === "string" && typeof label === "string" && v && label) return [{ value: v, label }];
    }
    return [];
  });
  return list.length > 0 ? list : DEFAULT_METRICS;
}

function mapSocials(value: Json): SocialLink[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (item && typeof item === "object" && !Array.isArray(item)) {
      const { label, href } = item;
      if (typeof label === "string" && typeof href === "string" && href) return [{ label, href }];
    }
    return [];
  });
}

export function mapProject(row: ProjectRowWithRelations): Project {
  const frames = (row.project_media ?? [])
    .map(mapFrame)
    .filter((f): f is ProjectFrame => f !== null)
    .sort((a, b) => a.position - b.position || a.rowIndex - b.rowIndex || a.colStart - b.colStart);

  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    year: row.year,
    kind: row.kind,
    role: row.role,
    client: row.client,
    summary: row.summary,
    body: row.body,
    stack: row.stack ?? [],
    liveUrl: row.live_url,
    repoUrl: row.repo_url,
    device: row.device === "mobile" ? "mobile" : "desktop",
    accent: row.accent,
    featured: row.featured,
    position: row.position,
    cover: row.cover ? mapMedia(row.cover) : (frames.find((f) => f.isCover)?.media ?? null),
    film: row.film ? mapMedia(row.film) : null,
    loop: row.loop ? mapMedia(row.loop) : null,
    facts: mapFacts(row.facts),
    seoTitle: row.seo_title,
    seoDescription: row.seo_description,
    frames,
  };
}

export function mapProfile(row: ProfileRowWithMedia): Profile {
  const media = [...(row.profile_media ?? [])].sort((a, b) => a.position - b.position);
  const pick = (slot: string) =>
    media.filter((m) => m.slot === slot && m.media).map((m) => mapMedia(m.media as MediaRow));

  return {
    fullName: row.full_name,
    shortName: row.short_name,
    wordmarkTop: row.wordmark_top,
    wordmarkBottom: row.wordmark_bottom,
    headline: row.headline,
    roles: row.roles ?? [],
    bio: row.bio ?? [],
    location: row.location,
    timezone: row.timezone,
    availability: row.availability,
    email: row.email,
    socials: mapSocials(row.socials),
    metrics: mapMetrics(row.metrics),
    resumePath: row.resume_path,
    footerTagline: row.footer_tagline,
    portrait: pick("portrait"),
    aboutPhotos: pick("about"),
  };
}

export function mapExperience(row: Tables<"experiences">): Experience {
  return {
    id: row.id,
    slug: row.slug,
    role: row.role,
    org: row.org,
    startDate: row.start_date,
    endDate: row.end_date,
    summary: row.summary,
    highlights: row.highlights ?? [],
    stack: row.stack ?? [],
    position: row.position,
  };
}

const CATEGORIES: readonly SkillCategory[] = ["language", "frontend", "backend", "mobile", "data", "web3", "tools"];

export function mapSkill(row: Tables<"skills">): Skill {
  const marqueeRow = num(row.marquee_row, 1);
  return {
    id: row.id,
    name: row.name,
    category: oneOf(row.category, CATEGORIES, "tools"),
    marqueeRow: marqueeRow === 2 || marqueeRow === 3 ? marqueeRow : 1,
    position: row.position,
  };
}

const ACHIEVEMENT_KINDS: readonly AchievementKind[] = ["award", "competition", "certification", "education", "organization"];

export function mapAchievement(row: Tables<"achievements">): Achievement {
  return {
    id: row.id,
    slug: row.slug,
    kind: oneOf(row.kind, ACHIEVEMENT_KINDS, "award"),
    title: row.title,
    org: row.org,
    period: row.period,
    summary: row.summary,
    url: row.url,
    position: row.position,
  };
}

export function mapReel(row: ReelRowWithChapters): Reel {
  const chapters: ReelChapter[] = (row.reel_chapters ?? [])
    .map((c) => ({
      id: c.id,
      label: c.label,
      startS: num(c.start_s, 0),
      endS: num(c.end_s, 0),
      projectId: c.project_id,
      projectSlug: c.project?.slug ?? null,
      position: c.position,
    }))
    .sort((a, b) => a.startS - b.startS);

  return { id: row.id, key: row.key, title: row.title, chapters };
}

/** `kind` / `project_id` are optional at runtime until migration 20261128000100 is applied. */
export type ClientRowWithLogo = Omit<Tables<"clients">, "kind" | "project_id"> &
  Partial<Pick<Tables<"clients">, "kind" | "project_id">> & {
    logo: MediaRow | null;
    project?: { slug: string; name: string; published: boolean } | null;
  };

export function mapClient(row: ClientRowWithLogo): Client {
  return {
    id: row.id,
    name: row.name,
    logo: row.logo ? mapMedia(row.logo) : null,
    url: row.url,
    kind: row.kind ?? "",
    project: row.project?.published ? { slug: row.project.slug, name: row.project.name } : null,
    position: row.position,
  };
}

export type TestimonialRowWithRelations = Tables<"testimonials"> & {
  avatar: MediaRow | null;
  project: { slug: string; name: string; published: boolean } | null;
};

export function mapTestimonial(row: TestimonialRowWithRelations): Testimonial {
  return {
    id: row.id,
    quote: row.quote,
    authorName: row.author_name,
    authorRole: row.author_role,
    authorOrg: row.author_org,
    avatar: row.avatar ? mapMedia(row.avatar) : null,
    project: row.project?.published ? { slug: row.project.slug, name: row.project.name } : null,
    position: row.position,
  };
}
