import type { Profile, Project, Reel } from "@/lib/content/types";
import { resolveReelSource } from "@/lib/content/video-manifest";

import { HeroProjector, type HeroReel, type HeroSlide } from "./hero-projector";

type Props = {
  profile: Profile | null;
  featured: Project[];
  reel: Reel | null;
  /** Every published project slug in site order: chapter numbers follow the site's (Resku is 06). */
  order: string[];
};

const DEFAULT_ROLES = ["Full-stack developer", "Blockchain engineer", "Mobile developer", "ML engineer"];

function titleCase(word: string): string {
  const w = word.trim().toLowerCase();
  return w.charAt(0).toUpperCase() + w.slice(1);
}

/**
 * Home hero, "projection booth": a reel window in the dead centre of a smoke-filled room,
 * an instrument HUD across it, the name top left and a large rotating role bottom left.
 */
export function Hero({ profile, featured, reel, order }: Props) {
  const slides: HeroSlide[] = featured.map((p) => ({
    slug: p.slug,
    name: p.name,
    kind: p.kind,
    year: p.year,
    accent: p.accent,
    image:
      p.cover && p.cover.width && p.cover.height
        ? { src: p.cover.src, width: p.cover.width, height: p.cover.height, alt: p.cover.alt, lqip: p.cover.lqip }
        : null,
  }));

  const source = reel ? resolveReelSource(reel.key) : null;
  const heroReel: HeroReel | null =
    reel && source
      ? {
          src: source.src,
          poster: source.poster,
          title: reel.title,
          hero: source.hero,
          chapters: reel.chapters.map((c) => {
            const at = c.projectSlug ? order.indexOf(c.projectSlug) : -1;
            return { label: c.label, startS: c.startS, slug: c.projectSlug, number: String((at >= 0 ? at : c.position) + 1).padStart(2, "0") };
          }),
        }
      : null;

  const name = `${titleCase(profile?.wordmarkTop ?? "Aditya")} ${titleCase(profile?.wordmarkBottom ?? "Zulkarnaen")}`;
  const city = (profile?.location ?? "Yogyakarta, Indonesia").split(",")[0].trim();
  // The large rotating line: profile roles (admin-editable), lowercase, "Full-stack developer" → "full-stack / developer".
  const roles = (profile?.roles?.length ? profile.roles : DEFAULT_ROLES).map((r) => r.trim().toLowerCase()).filter(Boolean);

  return (
    <HeroProjector
      slides={slides}
      reel={heroReel}
      name={name}
      descriptor={["Software engineer", `Based in ${city}`]}
      roles={roles}
      devProbe={process.env.NODE_ENV === "development"}
    />
  );
}
