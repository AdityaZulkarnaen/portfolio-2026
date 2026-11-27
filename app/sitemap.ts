import type { MetadataRoute } from "next";

import { getProjectSlugs } from "@/lib/content/queries";
import { SITE_URL } from "@/lib/site";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const slugs = await getProjectSlugs();
  return [
    { url: SITE_URL, changeFrequency: "monthly", priority: 1 },
    { url: `${SITE_URL}/work`, changeFrequency: "monthly", priority: 0.8 },
    ...slugs.map((slug) => ({ url: `${SITE_URL}/work/${slug}`, changeFrequency: "yearly" as const, priority: 0.6 })),
  ];
}
