import "./site.css";

import { Cursor } from "@/components/runtime/cursor";
import { Preloader } from "@/components/runtime/preloader";
import { SiteRuntime } from "@/components/runtime/site-runtime";
import { Footer } from "@/components/site/footer";
import { Grain } from "@/components/site/grain";
import { Header } from "@/components/site/header";
import { ScrollProgress } from "@/components/site/scroll-progress";
import { getProfile } from "@/lib/content/queries";
import { MOTION_BOOT_SCRIPT } from "@/lib/motion/boot-script";

/** Guardrail: public pages must be fully static (no cookies/headers/uncached IO). */
export const ensureStatic = "navigation";

export default async function SiteLayout({ children }: LayoutProps<"/">) {
  const profile = await getProfile();

  return (
    <>
      <script dangerouslySetInnerHTML={{ __html: MOTION_BOOT_SCRIPT }} />
      <a href="#main" className="skip-link">
        Skip to content
      </a>
      <Preloader />
      <SiteRuntime />
      <ScrollProgress />
      <Header
        shortName={profile?.shortName ?? "Aditya Z"}
        timezone={profile?.timezone ?? "Asia/Jakarta"}
        location={profile?.location ?? "Yogyakarta, Indonesia"}
      />
      <main id="main" tabIndex={-1}>
        {children}
      </main>
      <Footer profile={profile} />
      {/* Site-wide grain: the page is never a flat, dead surface. */}
      <Grain fixed className="z-90 opacity-30" />
      <Cursor />
    </>
  );
}
