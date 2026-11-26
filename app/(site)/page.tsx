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

  return (
    <PageTransition>
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
