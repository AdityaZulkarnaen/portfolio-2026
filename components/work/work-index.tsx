"use client";

import Image from "next/image";
import { useEffect, useLayoutEffect, useRef, useState, ViewTransition, type CSSProperties } from "react";

import { TransitionLink } from "@/components/site/transition-link";
import { gsap } from "@/lib/motion/gsap";

export type WorkRow = {
  slug: string;
  name: string;
  kind: string;
  year: string;
  role: string;
  accent: string;
  featured: boolean;
  /** A mobile app: the hover preview is a phone, not a landscape screen. */
  phone: boolean;
  cover: { src: string; width: number; height: number; lqip: string | null } | null;
};

/**
 * Typographic index of every project. Kind filters are local state; on fine pointers a
 * cover preview trails the cursor and carries the `cover-<slug>` view-transition name of
 * the hovered row, so clicking morphs it into the case hero.
 */
export function WorkIndex({ rows }: { rows: WorkRow[] }) {
  const kinds = Array.from(new Set(rows.map((r) => r.kind)));
  const [filter, setFilter] = useState<string | null>(null);
  const [hovered, setHovered] = useState<string | null>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  const [fine, setFine] = useState(false);

  useEffect(() => {
    const mql = window.matchMedia("(hover: hover) and (pointer: fine)");
    const update = () => setFine(mql.matches);
    update();
    mql.addEventListener("change", update);
    return () => mql.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    const el = previewRef.current;
    if (!el || !fine) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const xTo = gsap.quickTo(el, "x", { duration: reduced ? 0 : 0.7, ease: "expo" });
    const yTo = gsap.quickTo(el, "y", { duration: reduced ? 0 : 0.7, ease: "expo" });
    const rTo = gsap.quickTo(el, "rotation", { duration: 0.9, ease: "expo" });
    let lastX = 0;
    const onMove = (e: PointerEvent) => {
      xTo(e.clientX);
      yTo(e.clientY);
      if (!reduced) rTo(Math.max(-8, Math.min(8, (e.clientX - lastX) * 0.4)));
      lastX = e.clientX;
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
  }, [fine]);

  // Reset hover state when Activity hides the page.
  useLayoutEffect(() => () => setHovered(null), []);

  const visible = rows.filter((r) => !filter || r.kind === filter);
  const active = rows.find((r) => r.slug === hovered) ?? null;

  return (
    <div>
      <div className="mb-10 flex flex-wrap gap-2" role="group" aria-label="Filter by kind">
        <button type="button" className="slate inline-flex min-h-[38px] items-center gap-2 rounded-full px-4 text-bone-400 shadow-[inset_0_0_0_1px_var(--color-line-strong)] transition-colors hover:text-bone-100 aria-pressed:bg-bone-100 aria-pressed:text-ink-950 aria-pressed:shadow-none" aria-pressed={filter === null} onClick={() => setFilter(null)}>
          All <span className="opacity-60">{rows.length}</span>
        </button>
        {kinds.map((k) => (
          <button key={k} type="button" className="slate inline-flex min-h-[38px] items-center gap-2 rounded-full px-4 text-bone-400 shadow-[inset_0_0_0_1px_var(--color-line-strong)] transition-colors hover:text-bone-100 aria-pressed:bg-bone-100 aria-pressed:text-ink-950 aria-pressed:shadow-none" aria-pressed={filter === k} onClick={() => setFilter(k)}>
            {k} <span className="opacity-60">{rows.filter((r) => r.kind === k).length}</span>
          </button>
        ))}
      </div>

      <div className="slate hidden pb-3 text-bone-400 md:grid md:grid-cols-[4rem_minmax(0,1fr)_12rem_14rem_6rem] md:gap-6" aria-hidden="true">
        <span>No.</span>
        <span>Project</span>
        <span>Kind</span>
        <span>Role</span>
        <span className="text-right">Year</span>
      </div>

      <ol className="group/list border-b border-line" onPointerLeave={() => setHovered(null)}>
        {visible.map((row) => {
          const n = rows.indexOf(row) + 1;
          return (
            <li key={row.slug} className="border-t border-line" style={{ "--accent": row.accent } as CSSProperties}>
              <TransitionLink
                href={`/work/${row.slug}`}
                transition="to-case"
                className="group/row grid grid-cols-[auto_1fr] items-baseline gap-x-4 gap-y-1 py-4.5 transition-opacity duration-(--dur-base) ease-fluid md:py-6 md:grid md:grid-cols-[4rem_minmax(0,1fr)_12rem_14rem_6rem] md:gap-6 pointer-fine:group-hover/list:not-data-active:opacity-30"
                data-cursor="view"
                onPointerEnter={() => setHovered(row.slug)}
                onFocus={() => setHovered(row.slug)}
                data-active={hovered === row.slug || undefined}
              >
                <span className="slate text-(--accent)">{String(n).padStart(2, "0")}</span>
                <span className="text-[clamp(1.9rem,5.4vw,5.8rem)] leading-[0.95] font-extrabold tracking-[-0.035em] [font-stretch:118%] transition-[transform,color] duration-(--dur-base) ease-fluid group-data-[active]/row:translate-x-5 group-data-[active]/row:text-(--accent)">{row.name}</span>
                <span className="slate col-start-2 text-bone-400 md:col-start-auto">{row.kind}</span>
                <span className="slate hidden text-bone-400 md:block">{row.role}</span>
                <span className="slate col-start-2 text-bone-400 md:col-start-auto md:text-right">{row.year}</span>
              </TransitionLink>
            </li>
          );
        })}
      </ol>

      {fine ? (
        <div ref={previewRef} className="pointer-events-none fixed top-0 left-0 z-40" aria-hidden="true">
          {/* Centred on the cursor; a phone shape for mobile apps, a landscape screen otherwise. */}
          <div
            className={`-translate-1/2 scale-85 opacity-0 transition-[opacity,scale] duration-(--dur-base) ease-fluid data-[visible]:scale-100 data-[visible]:opacity-100 ${
              active?.phone
                ? "aspect-[9/19.5] w-[clamp(150px,13vw,230px)] rounded-[clamp(20px,2vw,32px)] bg-[#101217] p-[clamp(4px,0.45vw,7px)] shadow-[inset_0_0_0_1px_rgb(255_255_255/0.14),0_40px_80px_-30px_rgb(0_0_0/0.9)]"
                : "aspect-[16/10] w-[clamp(240px,26vw,440px)]"
            }`}
            data-visible={active?.cover ? true : undefined}
          >
          {active?.cover ? (
            <ViewTransition key={active.slug} name={`cover-${active.slug}`} share="morph" default="none">
              <div
                className={`relative size-full overflow-hidden ${
                  active.phone ? "rounded-[clamp(16px,1.6vw,26px)]" : "rounded-[10px] shadow-[0_40px_80px_-30px_rgb(0_0_0/0.9)]"
                }`}
              >
                <Image
                  src={active.cover.src}
                  alt=""
                  fill
                  sizes="28vw"
                  quality={60}
                  placeholder={active.cover.lqip ? "blur" : "empty"}
                  blurDataURL={active.cover.lqip ?? undefined}
                  className="object-cover object-top"
                />
              </div>
            </ViewTransition>
          ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
