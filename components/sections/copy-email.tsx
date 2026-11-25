"use client";

import { useLayoutEffect, useRef, useState } from "react";

import { Magnetic } from "@/components/motion/magnetic";

/** Magnetic copy-to-clipboard button with an announced confirmation. */
export function CopyEmail({ email }: { email: string }) {
  const [copied, setCopied] = useState(false);
  const timer = useRef(0);

  useLayoutEffect(() => () => window.clearTimeout(timer.current), []);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(email);
      setCopied(true);
      window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => setCopied(false), 2400);
    } catch {
      window.location.href = `mailto:${email}`;
    }
  };

  return (
    <div>
      <Magnetic strength={0.25}>
        <button type="button" className="group grid justify-items-start gap-3 text-left" onClick={copy} data-copied={copied || undefined}>
          <span className="link-underline text-[clamp(1.35rem,2.6vw,2.6rem)] font-bold tracking-[-0.02em] wrap-anywhere group-hover:text-ember-300">{email}</span>
          <span className="slate inline-flex min-h-[34px] items-center rounded-full px-4 shadow-[inset_0_0_0_1px_var(--color-line-strong)] transition-colors group-data-[copied]:bg-tide-400 group-data-[copied]:text-ink-950 group-data-[copied]:shadow-none">{copied ? "Email copied" : "Copy email"}</span>
        </button>
      </Magnetic>
      <span className="sr-only" role="status" aria-live="polite">
        {copied ? "Email address copied to clipboard" : ""}
      </span>
    </div>
  );
}
