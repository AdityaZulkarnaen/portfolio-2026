/** Domain types consumed by the site. Decoupled from DB rows (see mappers.ts). */

/** Raw markup-lite string: blank line = paragraph, `**bold**`, `*highlight*`, `[text](https://…)`. */
export type Markup = string;

export type MediaKind = "image" | "video";
export type MediaSource = "storage" | "public";

export type Media = {
  id: string;
  kind: MediaKind;
  source: MediaSource;
  /** Storage path, public/videos key, or (legacy/fallback) absolute URL. */
  path: string;
  /** Resolved URL ready for next/image or <video>. */
  src: string;
  width: number | null;
  height: number | null;
  alt: string;
  lqip: string | null;
  focalX: number | null;
  focalY: number | null;
  durationS: number | null;
};

export type FramePlacement = "showcase" | "case" | "both";
export type FrameFormat = "landscape" | "portrait" | "square" | "tall";
export type FrameChrome = "none" | "browser" | "phone";
export type FrameBehavior = "static" | "scroll";

/** Layout vars for one frame of the 12-column editorial grid (rendered as CSS variables). */
export type FrameLayout = {
  colStart: number;
  /** Exclusive grid line, 2–13. */
  colEnd: number;
  rowIndex: number;
  /** Width / height of the frame window. */
  ratio: number;
  /** Vertical offset in grid rows. */
  shift: number;
  /** Parallax factor −1…1. */
  depth: number;
  format: FrameFormat;
  frame: FrameChrome;
  behavior: FrameBehavior;
  /** Column span on the mobile grid (out of 12). */
  mobileSpan: number;
};

export type ProjectFrame = FrameLayout & {
  id: string;
  media: Media;
  placement: FramePlacement;
  caption: string;
  isCover: boolean;
  position: number;
};

export type ProjectDevice = "desktop" | "mobile";

export type ProjectFact = { label: string; value: string };

export type Project = {
  id: string;
  slug: string;
  name: string;
  year: string;
  kind: string;
  role: string;
  client: string | null;
  summary: string;
  body: Markup;
  stack: string[];
  liveUrl: string | null;
  repoUrl: string | null;
  device: ProjectDevice;
  /** Hex color, e.g. `#3FC9BE`. */
  accent: string | null;
  featured: boolean;
  position: number;
  cover: Media | null;
  film: Media | null;
  loop: Media | null;
  facts: ProjectFact[];
  seoTitle: string | null;
  seoDescription: string | null;
  frames: ProjectFrame[];
};

export type SocialLink = { label: string; href: string };

/** A headline number on the home page, e.g. { value: "5+", label: "Clients" }. */
export type Metric = { value: string; label: string };

export type Profile = {
  fullName: string;
  shortName: string;
  wordmarkTop: string;
  wordmarkBottom: string;
  headline: string;
  roles: string[];
  /** Paragraphs in markup-lite. */
  bio: Markup[];
  location: string;
  timezone: string;
  availability: string;
  email: string;
  socials: SocialLink[];
  /** Featured-works metrics; defaults apply when the row has none (see mapProfile). */
  metrics: Metric[];
  resumePath: string | null;
  footerTagline: Markup;
  portrait: Media[];
  aboutPhotos: Media[];
};

export type Experience = {
  id: string;
  slug: string;
  role: string;
  org: string;
  /** ISO date (YYYY-MM-DD). */
  startDate: string;
  /** ISO date, or null = present. */
  endDate: string | null;
  summary: Markup;
  highlights: string[];
  stack: string[];
  position: number;
};

export type SkillCategory = "language" | "frontend" | "backend" | "mobile" | "data" | "web3" | "tools";

export type Skill = {
  id: string;
  name: string;
  category: SkillCategory;
  marqueeRow: 1 | 2 | 3;
  position: number;
};

export type AchievementKind = "award" | "competition" | "certification" | "education" | "organization";

export type Achievement = {
  id: string;
  slug: string;
  kind: AchievementKind;
  title: string;
  org: string;
  period: string;
  summary: Markup;
  url: string | null;
  position: number;
};

export type ReelChapter = {
  id: string;
  label: string;
  startS: number;
  endS: number;
  projectId: string | null;
  projectSlug: string | null;
  position: number;
};

export type Reel = {
  id: string;
  /** Key into generated/video-manifest.json. */
  key: string;
  title: string;
  chapters: ReelChapter[];
};

export type Client = {
  id: string;
  name: string;
  logo: Media | null;
  url: string | null;
  /** Short slate line under the name, e.g. "Internship", "Government". */
  kind: string;
  /** The case study this client links to, when there is one (internal link wins over `url`). */
  project: { slug: string; name: string } | null;
  position: number;
};

export type Testimonial = {
  id: string;
  quote: string;
  authorName: string;
  authorRole: string;
  authorOrg: string;
  avatar: Media | null;
  project: { slug: string; name: string } | null;
  position: number;
};
