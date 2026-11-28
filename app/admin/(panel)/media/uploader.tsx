"use client";

import { useRef, useState } from "react";

import { CARD, INPUT, LABEL } from "@/components/admin/ui";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";

import { registerMedia } from "./actions";

const MAX_EDGE = 2560;

type Job = { name: string; state: "working" | "done" | "error"; note?: string };

const slug = (s: string) =>
  s
    .toLowerCase()
    .replace(/\.[a-z0-9]+$/, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60) || "image";

function canvasBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Encoding failed"))), type, quality));
}

/** Decode → scale to ≤2560px → WebP; plus a 16px-wide blurred placeholder (LQIP) as a data URL. */
async function prepare(file: File) {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, width, height);
  const blob = await canvasBlob(canvas, "image/webp", 0.86);

  const tiny = document.createElement("canvas");
  tiny.width = 16;
  tiny.height = Math.max(1, Math.round((16 * height) / width));
  tiny.getContext("2d")!.drawImage(bitmap, 0, 0, tiny.width, tiny.height);
  const lqip = tiny.toDataURL("image/jpeg", 0.6);
  bitmap.close();
  return { blob, width, height, lqip };
}

export function Uploader() {
  const input = useRef<HTMLInputElement>(null);
  const [folder, setFolder] = useState("uploads");
  const [jobs, setJobs] = useState<Job[]>([]);
  const [over, setOver] = useState(false);

  const setJob = (i: number, patch: Partial<Job>) => setJobs((all) => all.map((j, k) => (k === i ? { ...j, ...patch } : j)));

  const upload = async (files: File[]) => {
    const images = files.filter((f) => f.type.startsWith("image/"));
    if (images.length === 0) return;
    const base = jobs.length;
    setJobs((all) => [...all, ...images.map((f) => ({ name: f.name, state: "working" as const }))]);
    const dir =
      folder
        .toLowerCase()
        .replace(/[^a-z0-9/_-]+/g, "-")
        .replace(/^\/+|\/+$/g, "") || "uploads";
    const supabase = getSupabaseBrowserClient();

    for (const [n, file] of images.entries()) {
      const i = base + n;
      try {
        const { blob, width, height, lqip } = await prepare(file);
        const path = `${dir}/${slug(file.name)}-${crypto.randomUUID().slice(0, 8)}.webp`;
        const { error } = await supabase.storage.from("media").upload(path, blob, { contentType: "image/webp", cacheControl: "31536000" });
        if (error) throw new Error(error.message);
        const res = await registerMedia({ path, width, height, lqip, alt: "" });
        if (res.error) throw new Error(res.error);
        setJob(i, { state: "done", note: `${width}×${height}, ${Math.round(blob.size / 1024)} KB` });
      } catch (e) {
        setJob(i, { state: "error", note: e instanceof Error ? e.message : "Upload failed" });
      }
    }
  };

  return (
    <div className={`${CARD} mt-8 grid gap-5`}>
      <div className="grid gap-5 md:grid-cols-[16rem_1fr] md:items-end">
        <label className={LABEL}>
          Folder
          <input value={folder} onChange={(e) => setFolder(e.target.value)} placeholder="projects/resku" className={INPUT} />
        </label>
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setOver(true);
          }}
          onDragLeave={() => setOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setOver(false);
            void upload([...e.dataTransfer.files]);
          }}
          className={`grid min-h-[44px] place-items-center rounded-lg border border-dashed px-4 py-3 text-center text-sm transition-colors ${over ? "border-lilac-500 text-bone-100" : "border-line-strong text-bone-400"}`}
        >
          <span>
            Drop images here or{" "}
            <button type="button" className="link-underline text-bone-100" onClick={() => input.current?.click()}>
              choose files
            </button>
          </span>
          <input
            ref={input}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/avif"
            multiple
            hidden
            onChange={(e) => {
              void upload([...(e.target.files ?? [])]);
              e.target.value = "";
            }}
          />
        </div>
      </div>
      {jobs.length ? (
        <ul className="grid gap-1.5 text-sm" aria-live="polite">
          {jobs.map((j, i) => (
            <li key={i} className="flex justify-between gap-4">
              <span className="truncate">{j.name}</span>
              <span className={j.state === "error" ? "text-[#ff9b8a]" : "text-bone-400"}>
                {j.state === "working" ? "Uploading…" : j.state === "done" ? `Done · ${j.note}` : j.note}
              </span>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
