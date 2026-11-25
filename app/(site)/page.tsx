import { Hero } from "@/components/hero/hero";
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
      <Hero profile={profile} featured={featured} reel={reel} />
      <Showcase projects={featured} total={all.length} />
      <About profile={profile} />
      <Stack skills={skills} />
      <Experience items={experiences} />
      <Achievements items={achievements} />
      <Contact profile={profile} />
    </PageTransition>
  );
}
