"use client";

import { usePathname } from "next/navigation";
import { useLayoutEffect, useRef, useState, type MouseEvent } from "react";

import { gsap } from "@/lib/motion/gsap";
import { lockScroll, scrollToTarget, unlockScroll } from "@/lib/motion/lenis-store";

import { LocalTime } from "./local-time";
import { TransitionLink } from "./transition-link";

const NAV = [
  { href: "/work", label: "Work", hash: null },
  { href: "/#about", label: "About", hash: "#about" },
  { href: "/#contact", label: "Contact", hash: "#contact" },
] as const;

type Props = { shortName: string; timezone: string; location: string };

export function Header({ shortName, timezone, location }: Props) {
  const pathname = usePathname();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [open, setOpen] = useState(false);

  // Close the menu when Activity hides this tree or the route changes.
  useLayoutEffect(() => {
    const dialog = dialogRef.current;
    return () => {
      if (dialog?.open) dialog.close();
    };
  }, [pathname]);

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
        { yPercent: 0, duration: 1, ease: "expo", stagger: 0.06, delay: 0.1 },
      );
    }
  };

  const onClose = () => {
    setOpen(false);
    unlockScroll("menu");
  };

  const onHashClick = (e: MouseEvent<HTMLAnchorElement>, hash: string | null) => {
    if (dialogRef.current?.open) dialogRef.current.close();
    if (!hash || pathname !== "/") return;
    e.preventDefault();
    history.replaceState(null, "", hash);
    scrollToTarget(hash);
  };

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
          className="size-3.5 animate-spin-slow rounded-full bg-[conic-gradient(var(--color-ember-500)_0_25%,transparent_0_50%,var(--color-ember-500)_0_75%,transparent_0)] shadow-[inset_0_0_0_1.5px_var(--color-ember-500)] motion-off:animate-none"
        />
        <span className="slate">{shortName}</span>
      </TransitionLink>

      <nav aria-label="Primary" className="glass hidden h-11 items-center gap-2 rounded-full pr-2 pl-1.5 md:inline-flex">
        <ul className="flex">
          {NAV.map((item) => {
            const current = item.hash === null && pathname.startsWith("/work");
            return (
              <li key={item.href}>
                <TransitionLink
                  href={item.href}
                  transition={item.hash ? "nav-back" : "nav-forward"}
                  className="slate inline-flex h-9 items-center rounded-full px-3.5 text-bone-400 transition-colors duration-(--dur-fast) hover:bg-white/6 hover:text-bone-100 aria-[current=page]:bg-white/6 aria-[current=page]:text-bone-100"
                  aria-current={current ? "page" : undefined}
                  onClick={(e) => onHashClick(e, item.hash)}
                >
                  {item.label}
                </TransitionLink>
              </li>
            );
          })}
        </ul>
        <span className="slate inline-flex items-center gap-2 border-l border-line pr-3 pl-3.5 text-bone-400 tabular-nums" aria-hidden="true">
          YK <LocalTime timeZone={timezone} />
        </span>
      </nav>

      <button
        type="button"
        className="glass slate h-11 rounded-full px-5 text-bone-100 md:hidden"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={openMenu}
      >
        Menu
      </button>

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
          <ul className="grid gap-1 self-center">
            {[{ href: "/", label: "Home", hash: null }, ...NAV].map((item, i) => (
              <li key={item.href} className="overflow-hidden border-b border-line">
                <TransitionLink
                  href={item.href}
                  transition={item.href === "/work" ? "nav-forward" : "nav-back"}
                  className="block py-2.5"
                  onClick={(e) => onHashClick(e, item.hash)}
                >
                  <span data-menu-item className="display flex items-baseline gap-4 text-[clamp(3rem,15vw,6rem)] leading-[0.95]">
                    <span className="slate text-ember-500">{String(i).padStart(2, "0")}</span>
                    {item.label}
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
