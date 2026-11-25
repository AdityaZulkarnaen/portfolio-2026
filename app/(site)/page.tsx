import { Hero } from "@/components/hero/hero";
import { HomeSequence } from "@/components/home/home-sequence";
import { RouteSignal } from "@/components/runtime/route-signal";
import { About } from "@/components/sections/about";
import { Achievements } from "@/components/sections/achievements";
import { Contact } from "@/components/sections/contact";
import { Experience } from "@/components/sections/experience";
import { Stack } from "@/components/sections/stack";
import { Showcase } from "@/components/showcase/showcase";
import { PageTransition } from "@/components/site/page-transition";
import {
  getAchievements,
  getActiveReel,
  getAllProjects,
  getExperiences,
  getFeaturedProjects,
  getProfile,
  getSkills,
} from "@/lib/content/queries";
import { DEFAULT_METRICS } from "@/lib/content/mappers";

export default async function HomePage() {
  const [profile, featured, all, reel, skills, experiences, achievements] = await Promise.all([
    getProfile(),
    getFeaturedProjects(),
    getAllProjects(),
    getActiveReel(),
    getSkills(),
    getExperiences(),
    getAchievements(),
  ]);

  return (
    <PageTransition>
      <RouteSignal />
      <HomeSequence>
        <Hero profile={profile} featured={featured} reel={reel} />
        <Showcase projects={featured} metrics={profile?.metrics ?? DEFAULT_METRICS} total={all.length} />
      </HomeSequence>
      <About profile={profile} />
      <Stack skills={skills} />
      <Experience items={experiences} />
      <Achievements items={achievements} />
      <Contact profile={profile} />
    </PageTransition>
  );
}
