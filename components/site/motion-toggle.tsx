"use client";

import { cn } from "@/lib/utils";
import { setMotionPaused, useMotionPrefs } from "@/lib/motion/motion-prefs";

/** WCAG 2.2.2 control: stops slideshow, marquees, grain and smooth scroll. Persists. */
export function MotionToggle({ className }: { className?: string }) {
  const { paused, reduced } = useMotionPrefs();
  return (
    <button
      type="button"
      className={cn(
        "slate inline-flex min-h-9 items-center gap-2.5 rounded-full px-3.5 text-bone-100 shadow-[inset_0_0_0_1px_var(--color-line-strong)] transition-colors hover:bg-white/6",
        className,
      )}
      aria-pressed={paused}
      onClick={() => setMotionPaused(!paused)}
      title={reduced ? "Your system already asks for reduced motion" : undefined}
    >
      <svg viewBox="0 0 10 10" aria-hidden="true" className="size-2.5 fill-current">
        {paused ? <path d="M2 1v8l7-4z" /> : <path d="M2 1h2v8H2zM6 1h2v8H6z" />}
      </svg>
      {paused ? "Resume motion" : "Pause motion"}
    </button>
  );
}
