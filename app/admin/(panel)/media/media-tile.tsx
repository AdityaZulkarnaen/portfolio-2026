"use client";

import Image from "next/image";
import { useState, useTransition } from "react";

import { INPUT, SMALL_BTN } from "@/components/admin/ui";
import type { AdminMedia } from "@/lib/admin/media";

import { deleteMedia, updateAlt } from "./actions";

export function MediaTile({ media: m, uses }: { media: AdminMedia; uses: number }) {
  const [pending, start] = useTransition();
  const [alt, setAlt] = useState(m.alt);
  const [saved, setSaved] = useState(m.alt);
  const [error, setError] = useState<string | null>(null);

  return (
    <li className={`grid content-start gap-2.5 ${pending ? "opacity-50" : ""}`}>
      <a href={m.url} target="_blank" rel="noreferrer" className="relative aspect-[4/3] overflow-hidden rounded-lg bg-ink-800 shadow-[inset_0_0_0_1px_var(--color-line)]">
        <Image src={m.url} alt={m.alt} fill sizes="(min-width: 1024px) 25vw, 50vw" className="object-cover object-top" unoptimized />
      </a>
      <p className="truncate text-xs text-bone-400" title={m.path}>
        {m.path}
      </p>
      <p className="text-xs text-bone-400 tabular-nums">
        {m.width && m.height ? `${m.width}×${m.height}` : m.kind} · {uses ? `used ${uses}×` : "unused"}
      </p>
      <input
        value={alt}
        onChange={(e) => setAlt(e.target.value)}
        onBlur={() => {
          if (alt !== saved) start(async () => {
            await updateAlt(m.id, alt);
            setSaved(alt);
          });
        }}
        aria-label={`Alt text for ${m.path}`}
        placeholder="Alt text: what the image shows"
        className={`${INPUT} mt-0 py-1.5 text-sm`}
      />
      <div className="flex items-center gap-3">
        <button
          type="button"
          className={`${SMALL_BTN} text-[#ff9b8a]`}
          onClick={() => {
            const note = uses ? ` It is used in ${uses} place${uses > 1 ? "s" : ""}; those lose this image.` : "";
            if (!confirm(`Delete ${m.path}?${note}`)) return;
            start(async () => {
              const res = await deleteMedia(m.id);
              setError(res.error);
            });
          }}
        >
          Delete
        </button>
        {error ? <span className="text-xs text-[#ff9b8a]">{error}</span> : null}
      </div>
    </li>
  );
}
