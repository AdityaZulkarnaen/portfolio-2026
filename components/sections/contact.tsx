import { SplitReveal } from "@/components/motion/split-reveal";
import type { Profile } from "@/lib/content/types";

import { ContactForm } from "./contact-form";
import { CopyEmail } from "./copy-email";

/**
 * The close of the page, and one block with the footer under it: the ask, the address and a
 * note form. Everything else (socials, résumé, where and when) lives once, in the footer,
 * which picks up straight below this with no rule between them.
 */
export function Contact({ profile }: { profile: Profile | null }) {
  return (
    <section id="contact" aria-labelledby="contact-title" className="border-t border-line px-gutter pt-[clamp(5rem,10vw,10rem)]">
      <p className="slate text-bone-400">
        {profile?.availability ?? "Open for work"}
      </p>
      <SplitReveal
        as="h2"
        id="contact-title"
        type="lines"
        className="mt-6 max-w-[16ch] pb-[0.08em] text-[clamp(3rem,9vw,10.5rem)] leading-[1.02] font-light tracking-[-0.05em] text-balance lowercase [&_.hl]:text-[1.04em]"
      >
        got something <em className="hl">worth</em> building?
      </SplitReveal>

      <div className="mt-[clamp(3rem,7vw,6rem)] grid gap-[clamp(3rem,6vw,6rem)] md:grid-cols-12 md:gap-x-[4vw]">
        <div className="grid content-start gap-5 md:col-span-6">
          <p className="slate text-bone-400">Write to me</p>
          {profile?.email ? <CopyEmail email={profile.email} /> : null}
          <p className="max-w-[40ch] leading-relaxed text-pretty text-bone-400">
            A role, a product, a half-formed idea: tell me what it should do and I&rsquo;ll tell you how I&rsquo;d build it.
          </p>
        </div>
        <div className="md:col-span-6">
          <p className="slate mb-6 text-bone-400">Or leave a note here</p>
          <ContactForm />
        </div>
      </div>
    </section>
  );
}
