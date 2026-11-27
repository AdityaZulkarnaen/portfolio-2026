import { accentOrDefault } from "@/lib/content/format";
import { getProject, getProjectSlugs } from "@/lib/content/queries";
import { coverDataUrl, OG_SIZE, renderOg } from "@/lib/og";

export const alt = "A case study by Aditya Zulkarnaen";
export const size = OG_SIZE;
export const contentType = "image/png";

export async function generateStaticParams() {
  const slugs = await getProjectSlugs();
  return slugs.map((slug) => ({ slug }));
}

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const project = await getProject(slug);
  if (!project) {
    return renderOg({ eyebrow: "Work", title: "Aditya Zulkarnaen", lines: ["Selected work, 2024–2026."] });
  }
  const phone = project.device === "mobile";
  const src = project.cover ? await coverDataUrl(project.cover.src, phone ? 460 : 840, phone ? 940 : 600) : null;
  return renderOg({
    eyebrow: `Case · ${project.kind} · ${project.year}`,
    title: project.name,
    lines: [project.role],
    accent: accentOrDefault(project.accent),
    image: src ? { src, phone } : null,
  });
}
