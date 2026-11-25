import { SplitReveal } from "@/components/motion/split-reveal";
import { LocalTime } from "@/components/site/local-time";
import type { Profile } from "@/lib/content/types";

import { ContactForm } from "./contact-form";
import { CopyEmail } from "./copy-email";

export function Contact({ profile }: { profile: Profile | null }) {
  const facts = [
    { label: "Status", value: profile?.availability ?? "Open for work" },
    {
      label: "Based in",
      value: (
        <>
          {profile?.location ?? "Yogyakarta, Indonesia"} · <LocalTime timeZone={profile?.timezone} />
        </>
      ),
    },
    {
      label: "Elsewhere",
      value: (
        <span className="flex flex-wrap gap-x-6 gap-y-2">
          {profile?.socials.map((s) => (
            <a key={s.href} href={s.href} target="_blank" rel="noreferrer" className="link-underline" data-cursor="open">
              {s.label}
            </a>
          ))}
        </span>
      ),
    },
  ];

  return (
    <section
      id="contact"
      aria-labelledby="contact-title"
      className="border-t border-line px-gutter pt-[clamp(5rem,10vw,10rem)] pb-[clamp(5rem,9vw,9rem)]"
    >
      <SplitReveal
        as="h2"
        id="contact-title"
        type="lines"
        className="display max-w-[14ch] text-[clamp(3.2rem,10.5vw,13rem)] [&_.hl]:text-[1.06em]"
      >
        Let&rsquo;s make the <em className="hl">next reel</em>
      </SplitReveal>

      <div className="mt-[clamp(3rem,7vw,7rem)] grid gap-[clamp(3rem,6vw,6rem)] md:grid-cols-12 md:gap-x-[4vw]">
        <div className="grid content-start gap-12 md:col-span-6">
          {profile?.email ? <CopyEmail email={profile.email} /> : null}
          <dl className="grid gap-6">
            {facts.map((f) => (
              <div key={f.label} className="grid gap-1.5 border-t border-line pt-4">
                <dt className="slate text-bone-400">{f.label}</dt>
                <dd className="text-lg">{f.value}</dd>
              </div>
            ))}
          </dl>
        </div>
        <div className="md:col-span-6">
          <p className="slate mb-6 text-bone-400">Or leave a note</p>
          <ContactForm />
        </div>
      </div>
    </section>
  );
}
