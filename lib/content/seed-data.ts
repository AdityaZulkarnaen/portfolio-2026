/**
 * Merge legacy-content.json + extra-content.json into DB-shaped seed records.
 *
 * Shared by `scripts/seed/seed.ts` (Node native TS) and the offline fallback in
 * `queries.ts`, so it must stay framework-free: no `@/` alias, no `server-only`,
 * runtime imports with explicit `.ts` extensions.
 */
import { defaultPresetFor, isTallImage, layoutForCount, type LayoutPreset } from "./layout-presets.ts";
import type { FrameLayout } from "./types.ts";

export type LegacyImage = {
  url: string;
  width: number;
  height: number;
  ext: string;
  alt: string;
  lqip: string | null;
  focal_x: number | null;
  focal_y: number | null;
};

export type LegacyContent = {
  profile: {
    full_name: string;
    roles: string[];
    bio: string[];
    resume_url: string | null;
    photos: LegacyImage[];
  };
  projects: {
    slug: string;
    name: string;
    year: string;
    kind: string;
    role: string;
    featured: boolean;
    device: string;
    stack: string[];
    live_url: string | null;
    repo_url: string | null;
    summary: string;
    body: string;
    cover: LegacyImage | null;
    tile_width: string;
    position: number;
    updated_at?: string | null;
  }[];
  experiences: {
    slug: string;
    role: string;
    org: string;
    start_date: string;
    end_date: string | null;
    summary: string;
    position: number;
  }[];
  tools: { name: string; label: string; logo_url: string | null; reverse: boolean; position: number }[];
};

export type ExtraContent = {
  profile: {
    full_name: string;
    short_name: string;
    wordmark_top: string;
    wordmark_bottom: string;
    headline: string;
    roles?: string[];
    bio?: string[];
    location: string;
    timezone: string;
    availability: string;
    email: string;
    socials: { label: string; href: string }[];
    metrics?: { value: string; label: string }[];
    resume_path: string;
    footer_tagline: string;
  };
  projects: {
    order: string[];
    featured: string[];
    accents: Record<string, string>;
    overrides?: Record<string, ProjectOverride | string>;
  };
  experiences?: SeedExperience[];
  retired?: { experiences?: string[]; skills?: string[]; achievements?: string[] };
  skills: { name: string; category: string; marquee_row: number }[];
  achievements: {
    slug: string;
    kind: string;
    title: string;
    org: string;
    period: string;
    summary: string;
    url?: string | null;
  }[];
  testimonials?: SeedTestimonial[];
  clients?: SeedClient[];
};

/** Logo files live in public/ (served as-is offline, uploaded to storage by the seed). */
export type SeedClient = {
  name: string;
  kind: string;
  url: string | null;
  project_slug: string | null;
  logo: { file: string; width: number; height: number; alt: string } | null;
};

export type ProjectOverride = Partial<Pick<LegacyContent["projects"][number], "name" | "year" | "role" | "summary" | "body" | "stack">>;

export type SeedExperience = Omit<LegacyContent["experiences"][number], "position"> & {
  highlights: string[];
  stack: string[];
};

export type SeedProfile = {
  full_name: string;
  short_name: string;
  wordmark_top: string;
  wordmark_bottom: string;
  headline: string;
  roles: string[];
  bio: string[];
  location: string;
  timezone: string;
  availability: string;
  email: string;
  socials: { label: string; href: string }[];
  metrics: { value: string; label: string }[];
  resume_path: string | null;
  footer_tagline: string;
};

export type SeedTestimonial = {
  quote: string;
  author_name: string;
  author_role: string;
  author_org: string;
  project_slug: string | null;
  photo: { file: string; width: number; height: number; alt: string; focal_x: number; focal_y: number } | null;
};

export type SeedFrame = FrameLayout & {
  placement: "showcase" | "case" | "both";
  caption: string;
  is_cover: boolean;
  position: number;
};

export type SeedProject = {
  slug: string;
  name: string;
  year: string;
  kind: string;
  role: string;
  summary: string;
  body: string;
  stack: string[];
  live_url: string | null;
  repo_url: string | null;
  device: "desktop" | "mobile";
  accent: string | null;
  featured: boolean;
  published: boolean;
  position: number;
  cover: LegacyImage | null;
  preset: LayoutPreset;
  /** Default frames for the project's images (currently: the cover). */
  frames: SeedFrame[];
};

export type SeedBundle = {
  profile: SeedProfile;
  photos: { image: LegacyImage; slot: "portrait" | "about"; position: number }[];
  projects: SeedProject[];
  experiences: (SeedExperience & { position: number })[];
  retired: { experiences: string[]; skills: string[]; achievements: string[] };
  skills: { name: string; category: string; marquee_row: number; position: number }[];
  achievements: (ExtraContent["achievements"][number] & { position: number })[];
  testimonials: (SeedTestimonial & { position: number })[];
  clients: (SeedClient & { position: number })[];
};

/** Single-image default frame from the device/shape preset. */
export function defaultFramesFor(device: "desktop" | "mobile", cover: LegacyImage | null): {
  preset: LayoutPreset;
  frames: SeedFrame[];
} {
  const preset = defaultPresetFor(device, cover);
  if (!cover) return { preset, frames: [] };
  const [layout] = layoutForCount(preset, 1);
  const tall = isTallImage(cover.width, cover.height);
  const imageRatio = cover.width / cover.height;

  const frame: FrameLayout =
    device === "mobile"
      ? { ...layout, colStart: 4, colEnd: 10, ratio: imageRatio, format: "portrait", frame: "phone", behavior: "static" }
      : tall
        ? { ...layout, format: "tall", frame: "browser", behavior: "scroll" }
        : { ...layout, colStart: 1, colEnd: 13, ratio: imageRatio, format: imageRatio >= 1 ? "landscape" : "portrait", frame: "browser" };

  return {
    preset,
    frames: [{ ...frame, placement: "both", caption: "", is_cover: true, position: 0 }],
  };
}

export function buildSeedBundle(legacy: LegacyContent, extra: ExtraContent): SeedBundle {
  const order = new Map(extra.projects.order.map((slug, i) => [slug, i]));
  const featured = new Set(extra.projects.featured);

  const projects = legacy.projects
    .map((source) => {
      const override = extra.projects.overrides?.[source.slug];
      return typeof override === "object" ? { ...source, ...override } : source;
    })
    .map((p): SeedProject => {
      const device = p.device === "mobile" ? "mobile" : "desktop";
      const { preset, frames } = defaultFramesFor(device, p.cover);
      return {
        slug: p.slug,
        name: p.name,
        year: p.year,
        kind: p.kind.trim(),
        role: p.role,
        summary: p.summary,
        body: p.body,
        stack: p.stack,
        live_url: p.live_url,
        repo_url: p.repo_url,
        device,
        accent: extra.projects.accents[p.slug] ?? null,
        featured: featured.has(p.slug),
        published: true,
        position: order.get(p.slug) ?? order.size + p.position,
        cover: p.cover,
        preset,
        frames,
      };
    })
    .sort((a, b) => a.position - b.position)
    .map((p, i) => ({ ...p, position: i }));

  const photos = legacy.profile.photos.map((image, i) => ({
    image,
    slot: i === 0 ? ("portrait" as const) : ("about" as const),
    position: i,
  }));

  return {
    profile: {
      full_name: extra.profile.full_name || legacy.profile.full_name,
      short_name: extra.profile.short_name,
      wordmark_top: extra.profile.wordmark_top,
      wordmark_bottom: extra.profile.wordmark_bottom,
      headline: extra.profile.headline,
      roles: extra.profile.roles ?? legacy.profile.roles,
      bio: extra.profile.bio ?? legacy.profile.bio,
      location: extra.profile.location,
      timezone: extra.profile.timezone,
      availability: extra.profile.availability,
      email: extra.profile.email,
      socials: extra.profile.socials,
      metrics: extra.profile.metrics ?? [],
      resume_path: extra.profile.resume_path || null,
      footer_tagline: extra.profile.footer_tagline,
    },
    photos,
    projects,
    experiences: extra.experiences
      ? extra.experiences.map((e, i) => ({ ...e, position: i }))
      : legacy.experiences.map((e) => ({ ...e, highlights: [], stack: [] })),
    retired: {
      experiences: extra.retired?.experiences ?? [],
      skills: extra.retired?.skills ?? [],
      achievements: extra.retired?.achievements ?? [],
    },
    skills: extra.skills.map((s, i) => ({ ...s, position: i })),
    achievements: extra.achievements.map((a, i) => ({ ...a, position: i })),
    testimonials: (extra.testimonials ?? []).map((t, i) => ({ ...t, position: i })),
    clients: (extra.clients ?? []).map((c, i) => ({ ...c, position: i })),
  };
}
