import Link from "next/link";

import { Grain } from "./grain";

/** Branded 404, shared by the root and (site) not-found boundaries. Plain links: no runtime needed. */
export function NotFoundScreen() {
  return (
    <section className="relative grid min-h-svh content-center gap-7 overflow-hidden px-gutter py-header">
      <Grain className="opacity-60" />
      <p className="slate text-ember-500">Error 404 · Reel missing · 00:00:00:00</p>
      <h1 className="display text-[clamp(4rem,17vw,20rem)] leading-[0.82]">
        Lost <em className="hl">frame</em>
      </h1>
      <p className="max-w-[40ch] text-xl leading-normal text-bone-400">This page was cut from the final edit, or never made it onto the reel.</p>
      <div className="flex flex-wrap items-center gap-6">
        <Link href="/" className="pill-btn">
          <span>Back to the projection room</span>
        </Link>
        <Link href="/work" className="slate text-link">
          Browse the index
        </Link>
      </div>
    </section>
  );
}
