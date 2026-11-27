import { OG_SIZE, renderOg } from "@/lib/og";

export const alt = "Aditya Zulkarnaen — full-stack and creative developer";
export const size = OG_SIZE;
export const contentType = "image/png";

export default async function Image() {
  return renderOg({
    eyebrow: "Portfolio · 2026",
    title: "Aditya Zulkarnaen",
    lines: ["Full-stack web, mobile and Web3 developer.", "Software Engineering, Universitas Gadjah Mada."],
  });
}
