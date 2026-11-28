"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";

import type { AdminMedia } from "@/lib/admin/media";

import { INPUT, SMALL_BTN } from "./ui";

type Props = {
  media: AdminMedia[];
  label: string;
  onPick: (m: AdminMedia) => void;
};

/** A button that opens a searchable grid of library images (native <dialog>). */
export function MediaPicker({ media, label, onPick }: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  const [query, setQuery] = useState("");
  const images = useMemo(
    () => media.filter((m) => m.kind === "image" && m.path.toLowerCase().includes(query.trim().toLowerCase())),
    [media, query],
  );
  useEffect(() => {
    const d = ref.current;
    const close = (e: MouseEvent) => {
      if (e.target === d) d?.close();
    };
    d?.addEventListener("click", close);
    return () => d?.removeEventListener("click", close);
  }, []);

  return (
    <>
      <button type="button" className={SMALL_BTN} onClick={() => ref.current?.showModal()}>
        {label}
      </button>
      <dialog
        ref={ref}
        className="m-auto w-[min(92vw,960px)] rounded-2xl bg-ink-900 p-0 text-bone-100 shadow-[inset_0_0_0_1px_var(--color-line-strong)] backdrop:bg-ink-950/80"
      >
        <div className="flex items-center gap-4 border-b border-line p-4">
          <input autoFocus value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search by path, e.g. projects/resku" className={`${INPUT} mt-0`} />
          <button type="button" className={SMALL_BTN} onClick={() => ref.current?.close()}>
            Close
          </button>
        </div>
        <ul className="grid max-h-[70vh] grid-cols-2 gap-3 overflow-y-auto p-4 sm:grid-cols-4">
          {images.map((m) => (
            <li key={m.id}>
              <button
                type="button"
                className="group grid w-full gap-2 text-left"
                onClick={() => {
                  onPick(m);
                  ref.current?.close();
                }}
              >
                <span className="relative aspect-[4/3] overflow-hidden rounded-lg bg-ink-800 shadow-[inset_0_0_0_1px_var(--color-line)] group-hover:shadow-[0_0_0_2px_var(--color-lilac-500)]">
                  <Image src={m.url} alt="" fill sizes="220px" className="object-cover object-top" unoptimized />
                </span>
                <span className="truncate text-xs text-bone-400">{m.path}</span>
              </button>
            </li>
          ))}
          {images.length === 0 ? <li className="col-span-full p-6 text-bone-400">Nothing matches. Upload images in Media.</li> : null}
        </ul>
      </dialog>
    </>
  );
}
