import type { Metadata, Viewport } from "next";
import { fontVariables } from "@/lib/fonts";
import "./globals.css";

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL || "https://www.adityazulkarnaen.xyz";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    template: "%s — Aditya Zulkarnaen",
    default: "Aditya Zulkarnaen — Creative Developer",
  },
  description:
    "Portfolio of Aditya Lucky Zulkarnaen, a full-stack web and mobile developer studying Software Engineering at Universitas Gadjah Mada.",
};

export const viewport: Viewport = {
  themeColor: "#07080B",
  colorScheme: "dark",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={fontVariables} suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
