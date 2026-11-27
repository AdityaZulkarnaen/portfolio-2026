/** Canonical origin and the site-wide words search engines and link previews use. */
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://www.adityazulkarnaen.xyz").replace(/\/$/, "");
export const SITE_NAME = "Aditya Zulkarnaen";
export const SITE_TITLE = "Aditya Zulkarnaen — Full-stack & Creative Developer";
export const SITE_DESCRIPTION =
  "Portfolio of Aditya Lucky Zulkarnaen, a full-stack web, mobile and Web3 developer studying Software Engineering at Universitas Gadjah Mada, Yogyakarta.";
export const SITE_KEYWORDS = [
  "Aditya Zulkarnaen",
  "Aditya Lucky Zulkarnaen",
  "full-stack developer",
  "creative developer",
  "web developer Indonesia",
  "Next.js developer",
  "mobile developer",
  "Web3 developer",
  "Universitas Gadjah Mada",
  "Software Engineering UGM",
  "portfolio",
];

/** JSON for a <script type="application/ld+json">, with `<` escaped (no tag breakout). */
export function jsonLd(data: unknown): string {
  return JSON.stringify(data).replace(/</g, "\u003c");
}

export const abs = (path: string) => (path.startsWith("http") ? path : `${SITE_URL}${path.startsWith("/") ? "" : "/"}${path}`);
