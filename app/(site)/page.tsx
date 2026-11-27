import { Hero } from "@/components/hero/hero";
import { HomeSequence } from "@/components/home/home-sequence";
import { RouteSignal } from "@/components/runtime/route-signal";
import { About } from "@/components/sections/about";
import { Achievements } from "@/components/sections/achievements";
import { Clients } from "@/components/sections/clients";
import { Contact } from "@/components/sections/contact";
import { Experience } from "@/components/sections/experience";
import { Stack } from "@/components/sections/stack";
import { Showcase } from "@/components/showcase/showcase";
import { PageTransition } from "@/components/site/page-transition";
import { TintZone } from "@/components/site/tint-zone";
import {
  getAchievements,
  getActiveReel,
  getAllProjects,
  getClients,
  getExperiences,
  getFeaturedProjects,
  getProfile,
  getSectionMedia,
  getSkills,
  getTestimonials,
} from "@/lib/content/queries";
import { DEFAULT_METRICS } from "@/lib/content/mappers";
import { abs, jsonLd, SITE_DESCRIPTION, SITE_NAME, SITE_URL } from "@/lib/site";

export default async function HomePage() {
  const [profile, featured, all, reel, skills, experiences, achievements, clients, testimonials, sectionMedia] = await Promise.all([
    getProfile(),
    getFeaturedProjects(),
    getAllProjects(),
    getActiveReel(),
    getSkills(),
    getExperiences(),
    getAchievements(),
    getClients(),
    getTestimonials(),
    getSectionMedia(),
  ]);

  const ld = [
    {
      "@context": "https://schema.org",
      "@type": "WebSite",
      name: SITE_NAME,
      url: SITE_URL,
      description: SITE_DESCRIPTION,
      inLanguage: "en",
    },
    {
      "@context": "https://schema.org",
      "@type": "Person",
      name: profile?.fullName ?? "Aditya Lucky Zulkarnaen",
      alternateName: "Aditya Zulkarnaen",
      url: SITE_URL,
      image: profile?.portrait[0]?.src ?? abs("/apple-icon.png"),
      jobTitle: profile?.roles[0] ?? "Full-stack developer",
      description: profile?.headline ?? SITE_DESCRIPTION,
      email: profile?.email ? `mailto:${profile.email}` : undefined,
      address: { "@type": "PostalAddress", addressLocality: "Yogyakarta", addressCountry: "ID" },
      alumniOf: { "@type": "CollegeOrUniversity", name: "Universitas Gadjah Mada", url: "https://ugm.ac.id" },
      knowsAbout: skills.slice(0, 24).map((s) => s.name),
      sameAs: (profile?.socials ?? []).map((s) => s.href).filter((h) => h.startsWith("http")),
    },
  ];

  return (
    <PageTransition>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(ld) }} />
      <RouteSignal />
      <HomeSequence>
        <Hero profile={profile} featured={featured} reel={reel} order={all.map((p) => p.slug)} />
        <Showcase projects={featured} metrics={profile?.metrics ?? DEFAULT_METRICS} total={all.length} />
      </HomeSequence>
      <TintZone tone="clients">
        <Clients profile={profile} clients={clients} testimonials={testimonials} />
      </TintZone>
      <TintZone tone="about">
        <About profile={profile} />
      </TintZone>
      <TintZone tone="experience">
        <Experience items={experiences} projects={all} media={sectionMedia} />
      </TintZone>
      <TintZone tone="achievements">
        <Achievements items={achievements} projects={all} media={sectionMedia} />
      </TintZone>
      <TintZone tone="stack">
        <Stack skills={skills} />
      </TintZone>
      <TintZone tone="contact">
        <Contact profile={profile} />
      </TintZone>
    </PageTransition>
  );
}
