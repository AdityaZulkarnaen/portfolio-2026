"use client";

import Image from "next/image";
import { useCallback, useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore } from "react";

import { Magnetic } from "@/components/motion/magnetic";
import { Grain } from "@/components/site/grain";
import { TransitionLink } from "@/components/site/transition-link";
import { stageBridge } from "@/gl/bridge";
import { useHeroSource, useHeroWindow } from "@/gl/hooks";
import { accentOrDefault } from "@/lib/content/format";
import { gsap, useGSAP } from "@/lib/motion/gsap";
import { useSequenceState } from "@/lib/motion/home-sequence";
import { scrollToTarget } from "@/lib/motion/lenis-store";
import { useMotionAllowed } from "@/lib/motion/motion-prefs";
import { onSiteReady } from "@/lib/motion/site-ready";

import { DevReelProbe } from "./dev-reel-probe";
import { HERO_PILL, PlayReelButton } from "./play-reel-button";

export type HeroSlide = {
  slug: string;
  name: string;
  kind: string;
  year: string;
  accent: string | null;
  image: { src: string; width: number; height: number; alt: string; lqip: string | null } | null;
};

export type HeroReel = {
  /** Modal source (with sound). */
  src: string;
  poster: string | null;
  title: string;
  /** Muted loops for the hero window (video mode); null = stills only. */
  hero: { large: string; small: string } | null;
  /** `number` follows the site's project numbering; `slug` links the chapter to its slide/case. */
  chapters: { label: string; startS: number; slug: string | null; number: string }[];
};

type Props = {
  slides: HeroSlide[];
  reel: HeroReel | null;
  /** h1 text, e.g. "Aditya Zulkarnaen" (set lowercase by CSS). */
  name: string;
  descriptor: [string, string];
  discipline: string;
  devProbe: boolean;
};

const SLIDE_MS = 6000;
/** When no other cover is ready yet, look again this often. */
const RETRY_MS = 400;
/**
 * One verb per slide; the big word turns over with the reel. "scales" is from his own
 * headline (scalable architectures). Max 6 letters: the verb's size is tuned to that.
 */
const VERBS = ["builds", "ships", "scales", "debugs"];
/** Yogyakarta. */
const LAT = "-7.7956°";
const LON = "110.3695°";

const pad = (n: number) => String(n).padStart(2, "0");
const timecode = (ms: number) => {
  const s = Math.floor(ms / 1000);
  return `${pad(Math.floor(s / 60))}:${pad(s % 60)}`;
};

/** Ring dots, in degrees from 12 o'clock. One ember marker; the rest bone. */
const ORBIT_DOTS = [
  { deg: 32, accent: true },
  { deg: 148, accent: false },
  { deg: 205, accent: false },
  { deg: 291, accent: false },
];

function polar(deg: number, r = 99.5) {
  const a = ((deg - 90) * Math.PI) / 180;
  return { cx: 100 + r * Math.cos(a), cy: 100 + r * Math.sin(a) };
}

/**
 * The next slide after `from` that can be shown right now: its cover has loaded in the
 * DOM (a failed or still-loading cover is skipped this round) and, with GL drawing, its
 * texture is uploaded. Caption, index, verb and timecode only ever change together with
 * a picture that is actually there.
 */
function nextReadySlide(root: HTMLElement | null, from: number, count: number): number | null {
  if (!root) return null;
  for (let k = 1; k < count; k++) {
    const i = (from + k) % count;
    const img = root.querySelector<HTMLImageElement>(`[data-slide="${i}"] img`);
    if (!img || !img.complete || !img.naturalWidth) continue;
    if (!stageBridge.slideReady(i)) continue;
    return i;
  }
  return null;
}

const noop = () => () => {};

/**
 * Which hero loop this page view may play: none with Save-Data (or before hydration), the
 * 480p loop on phones / coarse pointers, else 720p. Fixed for the page view.
 */
function useHeroVideoSize(enabled: boolean): "large" | "small" | null {
  return useSyncExternalStore(
    noop,
    () => {
      if (!enabled) return null;
      const conn = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
      if (conn?.saveData) return null;
      return window.matchMedia("(pointer: coarse), (max-width: 767px)").matches ? "small" : "large";
    },
    () => null,
  );
}

/** Index of the chapter playing at `t` (chapters sorted by start), or -1 before the first. */
function chapterAt(chapters: { startS: number }[], t: number): number {
  let at = -1;
  for (let i = 0; i < chapters.length; i++) if (chapters[i].startS <= t + 0.05) at = i;
  return at;
}

function Plus({ className }: { className: string }) {
  return (
    <svg viewBox="0 0 11 11" aria-hidden="true" data-hud-fade className={`pointer-events-none absolute size-[11px] text-bone-400/70 ${className}`}>
      <path d="M5.5 0v11M0 5.5h11" stroke="currentColor" strokeWidth="1" />
    </svg>
  );
}

/**
 * The hero, "projection booth".
 *
 * Featured covers cycle inside a small reel window at the centre of the room (stills
 * mode, 6s per slide). With the GL stage on, the stage draws the room (generative smoke)
 * and the window content itself (`useHeroSource` + the window rect); the DOM <img>s and
 * the CSS room stay underneath as the T0 / no-GL experience and fade out once GL draws.
 *
 * Reel video (P7) drops in through the same path: a reel with an encoded source turns the
 * pill into Play reel and the left HUD label into PLAY REEL. With hero loops encoded (and no
 * Save-Data / reduced motion) the window switches to video mode: the muted reel loop plays in
 * the window (and is the GL source), the slide follows the chapter on screen, and a
 * "Now playing: 0X / Project" chip under the window scrolls to that project's card.
 */
export function HeroProjector({ slides, reel, name, descriptor, discipline, devProbe }: Props) {
  const [cycled, setIndex] = useState(0);
  const [visible, setVisible] = useState(true);
  const [chapter, setChapter] = useState(0);
  const [reelOpen, setReelOpen] = useState(false);
  const rootRef = useRef<HTMLElement>(null);
  const windowRef = useRef<HTMLDivElement>(null);
  const spinRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const motion = useMotionAllowed();
  const seq = useSequenceState();
  const videoSize = useHeroVideoSize(!!reel?.hero);
  const videoMode = videoSize !== null && motion;
  // Zooming out into the featured works, the reel parks on the lead project (slide 0),
  // so the frame lands on the card that shows the same cover.
  const parked = seq.active && seq.phase === "out";
  const videoLive = videoMode && !parked;
  const current = videoMode ? reel?.chapters[chapter] : undefined;
  const chapterSlide = current?.slug ? slides.findIndex((s) => s.slug === current.slug) : -1;
  const index = parked ? 0 : videoLive && chapterSlide >= 0 ? chapterSlide : cycled;
  const running = motion && visible && slides.length > 1 && !parked && !videoMode;

  useHeroSource(rootRef, {
    index,
    count: slides.length,
    accents: slides.map((s) => accentOrDefault(s.accent)),
    key: slides.map((s) => s.slug).join("|"),
    manualProgress: seq.active,
    video: videoLive,
  });

  // Video mode: the loop plays only while the hero is on screen, the tab is visible and the
  // reel dialog is closed.
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    const sync = () => {
      if (videoLive && visible && !reelOpen && document.visibilityState === "visible") v.play().catch(() => {});
      else v.pause();
    };
    sync();
    document.addEventListener("visibilitychange", sync);
    return () => document.removeEventListener("visibilitychange", sync);
  }, [videoLive, visible, reelOpen]);

  // Chapter chip + timecode follow the loop's playhead.
  const onReelTime = useCallback(
    (t: number) => {
      if (!reel) return;
      setChapter(Math.max(0, chapterAt(reel.chapters, t)));
      const text = timecode(t * 1000);
      rootRef.current?.querySelectorAll<HTMLElement>("[data-timecode]").forEach((n) => (n.textContent = text));
    },
    [reel],
  );
  useHeroWindow(windowRef);

  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setVisible(e.isIntersecting), { threshold: 0.05 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // Advance only to a slide whose cover is ready (see nextReadySlide). The timer lives in
  // a layout effect so Activity-hiding the page clears it synchronously.
  useLayoutEffect(() => {
    if (!running) return;
    let timer = 0;
    const advance = () => {
      if (document.visibilityState === "visible") {
        const next = nextReadySlide(rootRef.current, index, slides.length);
        if (next !== null) {
          setIndex(next);
          return;
        }
      }
      timer = window.setTimeout(advance, RETRY_MS);
    };
    timer = window.setTimeout(advance, SLIDE_MS);
    return () => window.clearTimeout(timer);
  }, [running, slides.length, index]);

  // Reel playhead: slide start + time into the slide, written straight to the nodes
  // (HUD label and the fullscreen slate).
  useEffect(() => {
    const nodes = rootRef.current?.querySelectorAll<HTMLElement>("[data-timecode]");
    if (!nodes?.length || !running || videoMode) return;
    const base = index * SLIDE_MS;
    const t0 = performance.now();
    const id = window.setInterval(() => {
      const text = timecode(base + Math.min(SLIDE_MS - 1, performance.now() - t0));
      for (const n of nodes) n.textContent = text;
    }, 250);
    return () => window.clearInterval(id);
  }, [index, running, videoMode]);

  // Entrance, once the curtain lifts: line draws out from the centre, the window opens
  // from it, the ring settles, words rise through their masks.
  useGSAP(
    () => {
      const root = rootRef.current;
      if (!root || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      if (document.documentElement.dataset.motion === "off") return;
      const q = gsap.utils.selector(root);
      const line = q("[data-hud-line]");
      const ring = q("[data-ring]");
      const rise = q("[data-rise]");
      const fade = q("[data-hud-fade]");
      const win = windowRef.current;
      gsap.set(line, { scaleX: 0 });
      gsap.set(ring, { autoAlpha: 0, scale: 0.94 });
      gsap.set(rise, { yPercent: 112 });
      gsap.set(fade, { autoAlpha: 0 });
      if (win) gsap.set(win, { "--reveal": 0 });
      return onSiteReady(() => {
        const tl = gsap.timeline({ delay: 0.1 });
        tl.to(line, { scaleX: 1, duration: 1.5, ease: "expo" }, 0);
        if (win) tl.to(win, { "--reveal": 1, duration: 1.25, ease: "expo" }, 0.4);
        tl.to(ring, { autoAlpha: 1, scale: 1, duration: 2, ease: "fluid" }, 0.3);
        tl.to(rise, { yPercent: 0, duration: 1.3, ease: "expo", stagger: 0.07 }, 0.5);
        tl.to(fade, { autoAlpha: 1, duration: 0.9, ease: "fluid", stagger: 0.035 }, 0.8);
      });
    },
    { scope: rootRef },
  );

  // Ring turns with the scroll-out; static when motion is off.
  useGSAP(
    () => {
      const el = spinRef.current;
      if (!motion || !el) return;
      gsap.fromTo(
        el,
        { rotate: 0 },
        { rotate: 40, ease: "none", scrollTrigger: { trigger: rootRef.current, start: "top top", end: "bottom top", scrub: 0.8 } },
      );
    },
    { dependencies: [motion], revertOnUpdate: true },
  );

  const slide = slides[index];
  const accent = slide?.accent ?? "var(--color-ember-500)";
  const verb = VERBS[index % VERBS.length];
  const prevVerb = slides.length > 1 ? VERBS[(index - 1 + VERBS.length) % VERBS.length] : null;
  const hudLabel = reel ? "Play reel" : "Now showing";

  const caseLink = slide ? (
    <TransitionLink
      href={`/work/${slide.slug}`}
      transition="to-case"
      className={HERO_PILL}
      data-cursor="view"
      data-cursor-label="Case"
      aria-label={`View case: ${slide.name}`}
    >
      View case
      <svg viewBox="0 0 12 12" aria-hidden="true" className="size-3">
        <path d="M2 6h8M6.5 2.5 10 6l-3.5 3.5" fill="none" stroke="currentColor" strokeWidth="1.4" />
      </svg>
    </TransitionLink>
  ) : null;

  return (
    <section
      ref={rootRef}
      aria-labelledby="hero-title"
      className="group/hero relative isolate z-10 flex min-h-[max(100svh,640px)] flex-col overflow-clip px-gutter pt-[calc(var(--spacing-header)+1rem)] pb-[clamp(1.25rem,3svh,2.5rem)] md:block md:p-0"
      data-gl-hero
      data-hero-mode={videoMode ? "video" : "stills"}
      data-running={running || (videoLive && visible) || undefined}
      style={{ "--accent": accent } as React.CSSProperties}
    >
      {/* The room without GL (T0): deep teal pools + film grain. GL draws its own. */}
      <div
        aria-hidden="true"
        data-gl-media
        data-seq-room
        className="absolute inset-0 -z-10 bg-ink-950 bg-[radial-gradient(60%_55%_at_26%_36%,rgb(14_44_49/0.85),transparent_72%),radial-gradient(52%_48%_at_78%_64%,rgb(11_34_40/0.8),transparent_74%),radial-gradient(38%_30%_at_62%_16%,rgb(20_56_58/0.45),transparent_70%)]"
      >
        <Grain className="opacity-45" />
      </div>

      <div data-seq-out>
        <Plus className="top-[calc(var(--spacing-header)+0.75rem)] left-gutter max-md:hidden" />
        <Plus className="right-gutter bottom-[clamp(1.25rem,3.2svh,2.75rem)] max-md:hidden" />
      </div>

      {/* Top right: who, where, what, and the one call to action. */}
      <div data-seq-out className="order-1 md:absolute md:top-[calc(var(--spacing-header)+2rem)] md:right-gutter md:w-[min(28vw,24rem)]">
        <p className="slate grid text-bone-400">
          {descriptor.map((line) => (
            <span key={line} className="block overflow-clip">
              <span data-rise className="block">
                {line}
              </span>
            </span>
          ))}
        </p>
        <p className="mt-2 overflow-clip pb-[0.1em] text-[clamp(2.75rem,4.4vw,5rem)] leading-[0.92] font-light tracking-[-0.04em] text-bone-100">
          <span data-rise className="block">
            {discipline}
          </span>
        </p>
        <div data-hud-fade className="mt-5">
          <Magnetic strength={0.25}>
            <a
              href="#contact"
              onClick={(e) => {
                e.preventDefault();
                history.replaceState(null, "", "#contact");
                scrollToTarget("#contact");
              }}
              className="slate group/cta inline-flex h-11 items-center gap-3 rounded-full pr-4 pl-5 text-bone-100 shadow-[inset_0_0_0_1px_var(--color-line-strong)] transition-[background-color,color,box-shadow] duration-(--dur-fast) ease-fluid hover:bg-bone-100 hover:text-ink-950 hover:shadow-[inset_0_0_0_1px_var(--color-bone-100)]"
            >
              Start a project
              <svg viewBox="0 0 12 12" aria-hidden="true" className="size-3 transition-transform duration-(--dur-base) ease-fluid group-hover/cta:translate-x-0.5">
                <path d="M2 6h8M6.5 2.5 10 6l-3.5 3.5" fill="none" stroke="currentColor" strokeWidth="1.4" />
              </svg>
            </a>
          </Magnetic>
        </div>
      </div>

      {/* The instrument: ring, HUD line, reel window. */}
      <div data-seq-row className="pointer-events-none relative z-10 order-2 my-auto pt-16 pb-16 [--ring:112vw] [--win:86vw] md:absolute md:inset-x-gutter md:top-1/2 md:my-0 md:-translate-y-1/2 md:p-0 md:[--ring:max(42vw,calc(var(--win)*1.5))] md:[--win:clamp(300px,27vw,620px)]">
        <div className="relative">
          <div data-seq-ring className="pointer-events-none absolute inset-0">
          <div data-ring aria-hidden="true" className="pointer-events-none absolute top-1/2 left-1/2 size-(--ring) -translate-1/2 text-[rgb(236_233_226/0.09)] md:text-[rgb(236_233_226/0.15)]">
            <svg viewBox="0 0 200 200" className="absolute inset-0 size-full overflow-visible max-md:hidden">
              {[0, 90, 180, 270].map((deg) => {
                const a = polar(deg, 101.5);
                const b = polar(deg, 104);
                return <line key={deg} x1={a.cx} y1={a.cy} x2={b.cx} y2={b.cy} stroke="currentColor" vectorEffect="non-scaling-stroke" />;
              })}
            </svg>
            <div ref={spinRef} className="size-full">
              <div className="size-full animate-orbit [animation-play-state:paused] group-data-running/hero:[animation-play-state:running] motion-off:animate-none">
                <svg viewBox="0 0 200 200" className="size-full overflow-visible max-md:opacity-60">
                  <circle cx="100" cy="100" r="99.5" fill="none" stroke="currentColor" vectorEffect="non-scaling-stroke" />
                  {ORBIT_DOTS.map(({ deg, accent: a }) => {
                    const p = polar(deg);
                    return (
                      <circle
                        key={deg}
                        {...p}
                        r={a ? 1.15 : 0.85}
                        className={a ? "fill-ember-500" : "fill-bone-400"}
                      />
                    );
                  })}
                </svg>
              </div>
            </div>
          </div>
          </div>

          <div data-seq-out className="pointer-events-none absolute inset-0">
          <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-1/2 h-px -translate-y-1/2">
            <div data-hud-line className="absolute inset-0 origin-center bg-[rgb(236_233_226/0.2)]" />
            <span data-hud-fade className="absolute top-1/2 left-0 size-[5px] -translate-1/2 rounded-full bg-bone-100" />
            <span data-hud-fade className="absolute top-1/2 right-0 size-[5px] translate-x-1/2 -translate-y-1/2 rounded-full bg-bone-100" />
          </div>

          {/* HUD labels: along the line on desktop, above the window on phones. */}
          <div
            data-hud-fade
            className="slate pointer-events-none absolute bottom-[calc(50%+var(--win)*0.28125+0.75rem)] left-0 flex w-1/2 gap-3 tracking-[0.12em] text-bone-400 tabular-nums md:right-[calc(50%+var(--win)/2+2.75rem)] md:bottom-[calc(50%+0.625rem)] md:w-auto md:justify-between md:tracking-[0.16em]"
          >
            <span>{LAT}</span>
            <span className="text-bone-100">{hudLabel}</span>
          </div>
          <div
            data-hud-fade
            className="slate pointer-events-none absolute right-0 bottom-[calc(50%+var(--win)*0.28125+0.75rem)] flex w-1/2 justify-end gap-3 tracking-[0.12em] text-bone-400 tabular-nums md:bottom-[calc(50%+0.625rem)] md:left-[calc(50%+var(--win)/2+2.75rem)] md:w-auto md:justify-between md:tracking-[0.16em]"
          >
            <span className="text-bone-100">
              <span data-timecode>{timecode(index * SLIDE_MS)}</span> sec
            </span>
            <span>{LON}</span>
          </div>
          </div>

          <div data-seq-slot className="relative mx-auto aspect-video w-(--win)">
            {/* Absolute in a slot of the same size, so the home sequence can drive its box
                (left/top/width/height, --win-r) without moving anything around it. */}
            <div
              ref={windowRef}
              data-hero-window
              className="pointer-events-auto absolute inset-0 overflow-hidden rounded-[var(--win-r,14px)] [clip-path:inset(calc((1-var(--reveal,1))*50%)_0_round_var(--win-r,14px))]"
            >
              <div data-gl-media className="absolute inset-0 bg-ink-900" />
              {slides.map((s, i) =>
                s.image ? (
                  <div
                    key={s.slug}
                    className="group/slide absolute inset-0 opacity-0 transition-opacity duration-[1.8s] ease-io data-active:opacity-100"
                    data-active={i === index || undefined}
                    data-hero-still={i === 0 ? "" : undefined}
                    data-slide={i}
                    data-gl-media
                  >
                    <Image
                      src={s.image.src}
                      alt=""
                      fill
                      // The same <img> is the GL texture, and the home sequence zooms the
                      // window to fullscreen: request a full-width source, never a thumbnail.
                      sizes="100vw"
                      quality={72}
                      preload={i === 0}
                      fetchPriority={i === 0 ? "high" : "low"}
                      loading="eager"
                      placeholder={s.image.lqip ? "blur" : "empty"}
                      blurDataURL={s.image.lqip ?? undefined}
                      className="origin-[55%_30%] scale-[1.04] object-cover object-top brightness-[0.82] saturate-[0.8] motion-on:group-data-running/hero:group-data-active/slide:animate-ken-burns"
                    />
                  </div>
                ) : null,
              )}
              {videoMode && reel?.hero ? (
                <video
                  ref={videoRef}
                  data-hero-video
                  data-gl-media
                  data-active={videoLive || undefined}
                  className="absolute inset-0 size-full object-cover opacity-0 transition-opacity duration-700 ease-io data-active:opacity-100"
                  src={videoSize === "small" ? reel.hero.small : reel.hero.large}
                  poster={reel.poster ?? undefined}
                  muted
                  loop
                  playsInline
                  preload="auto"
                  aria-hidden="true"
                  tabIndex={-1}
                  onTimeUpdate={(e) => onReelTime(e.currentTarget.currentTime)}
                />
              ) : null}
              <div data-gl-media className="pointer-events-none absolute inset-0 rounded-[inherit] shadow-[inset_0_0_40px_rgb(0_0_0/0.45)]" />
            </div>

            <div data-seq-out className="pointer-events-none absolute inset-0">
            {(["-top-2.5 -left-2.5", "-top-2.5 -right-2.5", "-bottom-2.5 -left-2.5", "-bottom-2.5 -right-2.5"] as const).map((pos) => (
              <span key={pos} aria-hidden="true" data-hud-fade className={`absolute size-[3px] rounded-full bg-bone-100/80 ${pos}`} />
            ))}

            <div data-hud-fade className="pointer-events-none absolute inset-0 grid place-items-center">
              {reel ? (
                <PlayReelButton
                  src={reel.src}
                  poster={reel.poster}
                  title={reel.title}
                  chapters={reel.chapters.map((c) => ({ label: `${c.number} · ${c.label}`, startS: c.startS }))}
                  onOpenChange={setReelOpen}
                />
              ) : devProbe ? (
                <DevReelProbe fallback={caseLink} />
              ) : (
                caseLink
              )}
            </div>

            {slide ? (
              <div className="absolute inset-x-0 top-full mt-3.5 flex items-start justify-between gap-4" aria-live="off">
                {current ? (
                  <button
                    type="button"
                    data-hud-fade
                    data-cursor="view"
                    className="pointer-events-auto grid min-w-0 gap-1 text-left"
                    onClick={() => {
                      if (current.slug) scrollToTarget(`#work a[href="/work/${current.slug}"]`, { offset: -120 });
                    }}
                    aria-label={`Now playing: ${current.number} / ${current.label}. Show the project`}
                  >
                    <span className="slate text-bone-400">Now playing</span>
                    <span key={current.number} className="animate-fade-up truncate text-sm leading-tight font-medium text-bone-100">
                      <span className="tabular-nums">{current.number}</span> / {current.label}
                    </span>
                  </button>
                ) : (
                  <p className="min-w-0">
                    <span key={slide.slug} data-hud-fade className="grid animate-fade-up gap-1">
                      <span className="truncate text-sm leading-tight font-medium text-bone-100">{slide.name}</span>
                      <span className="slate truncate text-bone-400">
                        {slide.kind} · {slide.year}
                      </span>
                    </span>
                  </p>
                )}
                <p data-hud-fade className="slate shrink-0 text-bone-400 tabular-nums">
                  <span className="text-bone-100">{pad(index + 1)}</span> / {pad(slides.length)}
                </p>
              </div>
            ) : null}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom left: the name, small, over the verb that turns with the reel. */}
      <div data-seq-out className="order-3 md:absolute md:bottom-[clamp(1.25rem,3.2svh,2.75rem)] md:left-gutter">
        <h1 id="hero-title" className="overflow-clip pb-[0.08em] text-[clamp(1.375rem,2.2vw,2.5rem)] leading-none font-light tracking-[-0.03em] text-bone-100 lowercase">
          <span data-rise className="block">
            {name}
          </span>
        </h1>
        <p aria-hidden="true" className="overflow-clip pb-[0.2em] text-[24vw] leading-[0.9] font-light tracking-[-0.04em] text-bone-100 md:-ml-[0.05em] md:text-[min(10vw,21svh)]">
          <span data-rise className="grid">
            {VERBS.map((w) => {
              const state = w === verb ? "active" : w === prevVerb ? "past" : "next";
              return (
                <span
                  key={w}
                  data-state={state}
                  className="col-start-1 row-start-1 translate-y-[35%] opacity-0 transition-[translate,opacity] duration-500 ease-io data-[state=active]:translate-y-0 data-[state=active]:opacity-100 data-[state=active]:delay-[450ms] data-[state=active]:duration-[900ms] data-[state=active]:ease-fluid data-[state=next]:transition-none data-[state=past]:-translate-y-[25%]"
                >
                  {w}
                </span>
              );
            })}
          </span>
        </p>
      </div>

      {/* Fullscreen hold (home sequence): the reel's slate, bottom left. Hidden otherwise. */}
      {slide ? (
        <div
          data-seq-slate
          aria-hidden="true"
          className="pointer-events-none invisible absolute bottom-[clamp(1.25rem,3.2svh,2.75rem)] left-gutter z-20 flex max-w-[calc(100vw-2rem)] items-baseline gap-x-4 opacity-0"
        >
          <span className="truncate text-base leading-tight font-light tracking-[-0.01em] text-bone-100">{slide.name}</span>
          <span className="slate flex shrink-0 gap-3 text-bone-400 tabular-nums">
            <span className="text-bone-100">
              <span data-timecode>{timecode(index * SLIDE_MS)}</span> sec
            </span>
            <span>
              {pad(index + 1)} / {pad(slides.length)}
            </span>
          </span>
        </div>
      ) : null}
    </section>
  );
}
