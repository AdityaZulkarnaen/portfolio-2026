"use client";

import { usePathname } from "next/navigation";
import { useEffect, useLayoutEffect, useRef, useState, type MouseEvent } from "react";

import { gsap } from "@/lib/motion/gsap";
import { lockScroll, scrollToTarget, unlockScroll } from "@/lib/motion/lenis-store";

import { LocalTime } from "./local-time";
import { TransitionLink } from "./transition-link";

/** Home sections in page order. `Work` is the featured grid on home and its own route elsewhere. */
const SECTIONS = [
  { id: "work", label: "Work" },
  { id: "clients", label: "Clients" },
  { id: "about", label: "About" },
  { id: "experience", label: "Experience" },
  { id: "achievements", label: "Awards" },
  { id: "stack", label: "Stack" },
] as const;

type SectionId = (typeof SECTIONS)[number]["id"] | "contact";

const hrefOf = (id: SectionId, home: boolean) => (id === "work" && !home ? "/work" : `/#${id}`);

/**
 * Which home section is under the reading line (40% down the viewport): the last one whose
 * top has passed it. Null above the first (the hero).
 */
function useActiveSection(enabled: boolean): SectionId | null {
  const [active, setActive] = useState<SectionId | null>(null);
  useEffect(() => {
    if (!enabled) return;
    const ids: SectionId[] = [...SECTIONS.map((s) => s.id), "contact"];
    let raf = 0;
    const read = () => {
      raf = 0;
      const line = window.innerHeight * 0.4;
      let at: SectionId | null = null;
      for (const id of ids) {
        const el = document.getElementById(id);
        if (el && el.getBoundingClientRect().top <= line) at = id;
      }
      setActive(at);
    };
    const onScroll = () => {
      raf ||= requestAnimationFrame(read);
    };
    read();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [enabled]);
  return enabled ? active : null;
}

/** Scrolling down past the hero folds the island; scrolling up (or the top of the page) opens it. */
function useFolded(): boolean {
  const [folded, setFolded] = useState(false);
  useEffect(() => {
    let last = window.scrollY;
    let raf = 0;
    const read = () => {
      raf = 0;
      const y = window.scrollY;
      const dy = y - last;
      if (Math.abs(dy) < 6) return;
      last = y;
      setFolded(dy > 0 && y > window.innerHeight * 0.6);
    };
    const onScroll = () => {
      raf ||= requestAnimationFrame(read);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
    };
  }, []);
  return folded;
}

type Props = { shortName: string; timezone: string; location: string };

/**
 * Site header: wordmark left, a floating "island" of the home sections centred, local time
 * and the Contact call to action right.
 *
 * The island is a scroll-spy: a soft lilac marker slides under the section being read. While
 * scrolling down it folds to just that section ("04 Experience"); scrolling up, hovering or
 * focusing it opens the full index again. Small screens: a Menu button and a full-screen index.
 */
export function Header({ shortName, timezone, location }: Props) {
  const pathname = usePathname();
  const home = pathname === "/";
  const dialogRef = useRef<HTMLDialogElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const fullRef = useRef<HTMLDivElement>(null);
  const compactRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [hover, setHover] = useState(false);
  const [marker, setMarker] = useState<{ x: number; w: number } | null>(null);
  const [widths, setWidths] = useState<{ full: number; compact: number } | null>(null);

  const active = useActiveSection(home);
  const folded = useFolded();
  const current: SectionId | null = home ? active : pathname.startsWith("/work") ? "work" : null;
  const index = SECTIONS.findIndex((s) => s.id === current);
  const currentItem = index >= 0 ? SECTIONS[index] : null;
  const collapsed = home && folded && !hover && currentItem !== null;

  // Close the menu when Activity hides this tree or the route changes.
  useLayoutEffect(() => {
    const dialog = dialogRef.current;
    return () => {
      if (dialog?.open) dialog.close();
    };
  }, [pathname]);

  // Marker under the current link; island widths for the fold (measured, so it animates).
  useLayoutEffect(() => {
    const item = currentItem ? listRef.current?.querySelector<HTMLElement>(`[data-nav="${currentItem.id}"]`)?.closest("li") : null;
    setMarker(item ? { x: item.offsetLeft, w: item.offsetWidth } : null);
    const measure = () => {
      const full = fullRef.current?.scrollWidth ?? 0;
      const compact = compactRef.current?.scrollWidth ?? 0;
      if (full && compact) setWidths({ full, compact });
    };
    measure();
    document.fonts?.ready.then(measure);
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [currentItem]);

  const openMenu = () => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    dialog.showModal();
    setOpen(true);
    lockScroll("menu");
    if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      gsap.fromTo(
        dialog.querySelectorAll("[data-menu-item]"),
        { yPercent: 110 },
        { yPercent: 0, duration: 1, ease: "expo", stagger: 0.05, delay: 0.1 },
      );
    }
  };

  const onClose = () => {
    setOpen(false);
    unlockScroll("menu");
  };

  const onSectionClick = (e: MouseEvent<HTMLAnchorElement>, id: SectionId) => {
    if (dialogRef.current?.open) dialogRef.current.close();
    if (!home) return;
    e.preventDefault();
    history.replaceState(null, "", `#${id}`);
    scrollToTarget(`#${id}`);
  };

  const transitionOf = (id: SectionId) => (id === "work" && !home ? "nav-forward" : "nav-back");

  return (
    <header
      className="pointer-events-none fixed inset-x-0 top-0 z-60 flex items-center justify-between gap-4 px-gutter py-3.5 *:pointer-events-auto"
      style={{ viewTransitionName: "site-header" }}
    >
      <TransitionLink
        href="/"
        transition="nav-back"
        className="glass inline-flex h-11 items-center gap-3 rounded-full pr-[1.1rem] pl-3.5 transition-colors duration-(--dur-fast) hover:bg-ink-800/80"
        aria-label={`${shortName}, home`}
      >
        <span
          aria-hidden="true"
          className="size-3.5 animate-spin-slow rounded-full bg-[conic-gradient(var(--color-lilac-500)_0_25%,transparent_0_50%,var(--color-lilac-500)_0_75%,transparent_0)] shadow-[inset_0_0_0_1.5px_var(--color-lilac-500)] motion-off:animate-none"
        />
        <span className="slate">{shortName}</span>
      </TransitionLink>

      {/* The island. */}
      <nav
        aria-label="Sections"
        className="glass absolute top-3.5 left-1/2 hidden h-11 -translate-x-1/2 overflow-hidden rounded-full transition-[width] duration-500 ease-fluid lg:block"
        style={widths ? { width: collapsed ? widths.compact : widths.full } : undefined}
        onPointerEnter={() => setHover(true)}
        onPointerLeave={() => setHover(false)}
        onFocus={() => setHover(true)}
        onBlur={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setHover(false);
        }}
      >
        <div
          ref={fullRef}
          className="absolute top-0 left-0 flex h-full w-max items-center px-1.5 transition-[opacity,filter] duration-300 data-collapsed:pointer-events-none data-collapsed:opacity-0 data-collapsed:blur-[3px]"
          data-collapsed={collapsed || undefined}
        >
          <ul ref={listRef} className="relative flex">
            {marker ? (
              <li
                aria-hidden="true"
                className="pointer-events-none absolute top-0 h-9 rounded-full bg-lilac-500/14 shadow-[inset_0_0_0_1px_rgb(169_155_255/0.32)] transition-[translate,width] duration-500 ease-fluid"
                style={{ translate: `${marker.x}px 0`, width: marker.w }}
              />
            ) : null}
            {SECTIONS.map((s, i) => (
              <li key={s.id} className="relative">
                <TransitionLink
                  href={hrefOf(s.id, home)}
                  transition={transitionOf(s.id)}
                  data-nav={s.id}
                  className="slate inline-flex h-9 items-center gap-1.5 rounded-full px-3.5 text-bone-400 transition-colors duration-(--dur-fast) hover:text-bone-100 aria-[current=true]:text-bone-100"
                  aria-current={current === s.id ? "true" : undefined}
                  onClick={(e) => onSectionClick(e, s.id)}
                >
                  <span className="text-[0.85em] text-lilac-500/80 tabular-nums">{String(i + 1).padStart(2, "0")}</span>
                  {s.label}
                </TransitionLink>
              </li>
            ))}
          </ul>
        </div>
        <div
          ref={compactRef}
          aria-hidden="true"
          className="pointer-events-none absolute top-0 left-0 flex h-full w-max items-center gap-2.5 px-5 opacity-0 transition-opacity duration-300 data-collapsed:opacity-100 data-collapsed:delay-150"
          data-collapsed={collapsed || undefined}
        >
          <span className="size-1.5 rounded-full bg-lilac-500" />
          <span className="slate text-lilac-500 tabular-nums">{String(index + 1).padStart(2, "0")}</span>
          <span className="slate text-bone-100">{currentItem?.label ?? ""}</span>
        </div>
      </nav>

      <div className="flex items-center gap-2">
        <span className="glass slate hidden h-11 items-center gap-2 rounded-full px-4 text-bone-400 tabular-nums xl:inline-flex" aria-hidden="true">
          YK <LocalTime timeZone={timezone} />
        </span>
        <TransitionLink
          href="/#contact"
          transition="nav-back"
          className="slate hidden h-11 items-center gap-2 rounded-full bg-lilac-500 px-5 text-ink-950 transition-[background-color,translate] duration-(--dur-fast) ease-fluid hover:-translate-y-px hover:bg-lilac-300 aria-[current=true]:bg-lilac-300 lg:inline-flex"
          aria-current={current === "contact" || active === "contact" ? "true" : undefined}
          onClick={(e) => onSectionClick(e, "contact")}
        >
          Contact
          <svg viewBox="0 0 12 12" aria-hidden="true" className="size-3">
            <path d="M2 6h8M6.5 2.5 10 6l-3.5 3.5" fill="none" stroke="currentColor" strokeWidth="1.4" />
          </svg>
        </TransitionLink>
        <button
          type="button"
          className="glass slate h-11 rounded-full px-5 text-bone-100 lg:hidden"
          aria-haspopup="dialog"
          aria-expanded={open}
          onClick={openMenu}
        >
          Menu
        </button>
      </div>

      <dialog
        ref={dialogRef}
        aria-label="Menu"
        onClose={onClose}
        className="fixed inset-0 m-0 size-full max-h-none max-w-none bg-ink-950 p-0 text-bone-100 backdrop:bg-transparent open:animate-wipe-in"
      >
        <div className="grid min-h-full grid-rows-[auto_1fr_auto] px-gutter pt-[22px] pb-[calc(var(--spacing-gutter)+env(safe-area-inset-bottom))]">
          <div className="flex h-11 items-center justify-between">
            <span className="slate text-bone-400">Index</span>
            <button
              type="button"
              className="slate h-11 rounded-full px-5 shadow-[inset_0_0_0_1px_var(--color-line-strong)]"
              onClick={() => dialogRef.current?.close()}
            >
              Close
            </button>
          </div>
          <ul className="grid self-center">
            {[...SECTIONS, { id: "contact" as const, label: "Contact" }].map((s, i) => (
              <li key={s.id} className="overflow-hidden border-b border-line">
                <TransitionLink
                  href={hrefOf(s.id, home)}
                  transition={transitionOf(s.id)}
                  className="block py-2"
                  aria-current={current === s.id ? "true" : undefined}
                  onClick={(e) => onSectionClick(e, s.id)}
                >
                  <span
                    data-menu-item
                    className="flex items-baseline gap-4 text-[clamp(2.25rem,10vw,4.5rem)] leading-[1] font-light tracking-[-0.04em] lowercase"
                  >
                    <span className="slate text-lilac-500">{String(i + 1).padStart(2, "0")}</span>
                    {s.label}
                  </span>
                </TransitionLink>
              </li>
            ))}
          </ul>
          <p className="slate text-bone-400">
            {location} · <LocalTime timeZone={timezone} />
          </p>
        </div>
      </dialog>
    </header>
  );
}
