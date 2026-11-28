"use client";

import Image from "next/image";
import { useActionState, useState } from "react";

import { MediaPicker } from "@/components/admin/media-picker";
import { CARD, INPUT, LABEL, SMALL_BTN } from "@/components/admin/ui";
import type { AdminMedia } from "@/lib/admin/media";

import { saveProject, type ProjectFormState } from "../actions";

export type ProjectValues = {
  id: string;
  name: string;
  slug: string;
  year: string;
  kind: string;
  role: string;
  client: string;
  summary: string;
  body: string;
  stack: string;
  live_url: string;
  repo_url: string;
  device: "desktop" | "mobile";
  accent: string;
  facts: string;
  seo_title: string;
  seo_description: string;
  published: boolean;
  featured: boolean;
  cover_media_id: string;
};

const slugify = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

export function ProjectForm({ initial, media }: { initial: ProjectValues; media: AdminMedia[] }) {
  const [state, action, pending] = useActionState<ProjectFormState, FormData>(saveProject, { error: null, fieldErrors: {}, saved: false });
  const [slug, setSlug] = useState(initial.slug);
  const [slugTouched, setSlugTouched] = useState(Boolean(initial.id));
  const [accent, setAccent] = useState(initial.accent);
  const [coverId, setCoverId] = useState(initial.cover_media_id);
  const cover = media.find((m) => m.id === coverId) ?? null;
  const err = (k: string) =>
    state.fieldErrors[k] ? <span className="mt-1.5 block text-sm normal-case tracking-normal text-[#ff9b8a]">{state.fieldErrors[k]}</span> : null;

  const text = (name: keyof ProjectValues, label: string, opts: { placeholder?: string; type?: string } = {}) => (
    <label className={LABEL}>
      {label}
      <input name={name} type={opts.type ?? "text"} defaultValue={String(initial[name] ?? "")} placeholder={opts.placeholder} className={INPUT} />
      {err(name)}
    </label>
  );

  return (
    <form action={action} className="grid gap-8">
      <input type="hidden" name="id" value={initial.id} />
      <input type="hidden" name="cover_media_id" value={coverId} />

      <div className={`${CARD} grid gap-5 md:grid-cols-2`}>
        <label className={LABEL}>
          Name
          <input
            name="name"
            required
            defaultValue={initial.name}
            className={INPUT}
            onChange={(e) => {
              if (!slugTouched) setSlug(slugify(e.target.value));
            }}
          />
          {err("name")}
        </label>
        <label className={LABEL}>
          Slug (URL)
          <input
            name="slug"
            required
            value={slug}
            onChange={(e) => {
              setSlugTouched(true);
              setSlug(e.target.value);
            }}
            className={INPUT}
          />
          {err("slug")}
        </label>
        {text("kind", "Kind", { placeholder: "Web platforms, Mobile apps…" })}
        {text("year", "Year")}
        {text("role", "Role", { placeholder: "Full-stack developer" })}
        {text("client", "Client (optional)")}
        <label className={LABEL}>
          Device
          <select name="device" defaultValue={initial.device} className={INPUT}>
            <option value="desktop">Desktop (screens)</option>
            <option value="mobile">Mobile (phone screens)</option>
          </select>
        </label>
        <label className={LABEL}>
          Accent colour
          <span className="mt-2 flex gap-2">
            <input
              type="color"
              aria-label="Pick accent colour"
              value={/^#[0-9a-f]{6}$/i.test(accent) ? accent : "#a99bff"}
              onChange={(e) => setAccent(e.target.value)}
              className="h-[42px] w-14 shrink-0 cursor-pointer rounded-lg bg-ink-950 p-1 shadow-[inset_0_0_0_1px_var(--color-line-strong)]"
            />
            <input name="accent" value={accent} onChange={(e) => setAccent(e.target.value)} placeholder="#A99BFF (empty = lilac)" className={`${INPUT} mt-0`} />
          </span>
          {err("accent")}
        </label>
        <div className="flex gap-8 md:col-span-2">
          <label className="slate flex items-center gap-3 text-bone-100">
            <input type="checkbox" name="published" defaultChecked={initial.published} className="size-4 accent-lilac-500" /> Published
          </label>
          <label className="slate flex items-center gap-3 text-bone-100">
            <input type="checkbox" name="featured" defaultChecked={initial.featured} className="size-4 accent-lilac-500" /> Featured on home
          </label>
        </div>
      </div>

      <div className={`${CARD} flex flex-wrap items-center gap-5`}>
        <span className="relative h-24 w-40 overflow-hidden rounded-lg bg-ink-800 shadow-[inset_0_0_0_1px_var(--color-line)]">
          {cover ? <Image src={cover.url} alt="" fill sizes="160px" className="object-cover object-top" unoptimized /> : null}
        </span>
        <div className="grid gap-3">
          <p className={LABEL}>Cover image</p>
          <p className="text-sm text-bone-400">{cover ? cover.path : "None. The cover is the card, hero and preview image."}</p>
          <div className="flex gap-2">
            <MediaPicker media={media} label={cover ? "Change cover" : "Choose cover"} onPick={(m) => setCoverId(m.id)} />
            {cover ? (
              <button type="button" className={SMALL_BTN} onClick={() => setCoverId("")}>
                Remove
              </button>
            ) : null}
          </div>
        </div>
      </div>

      <div className={`${CARD} grid gap-5`}>
        <label className={LABEL}>
          Summary
          <textarea name="summary" rows={3} defaultValue={initial.summary} className={INPUT} />
          {err("summary")}
        </label>
        <label className={LABEL}>
          Body (paragraphs separated by a blank line; *word* for the serif highlight)
          <textarea name="body" rows={10} defaultValue={initial.body} className={INPUT} />
        </label>
        <label className={LABEL}>
          Stack (comma separated)
          <input name="stack" defaultValue={initial.stack} placeholder="Next.js, Supabase, Tailwind" className={INPUT} />
        </label>
        <label className={LABEL}>
          Facts (one per line: Label | Value)
          <textarea name="facts" rows={4} defaultValue={initial.facts} placeholder={"Users | 300+\nTimeline | 6 weeks"} className={INPUT} />
        </label>
        <div className="grid gap-5 md:grid-cols-2">
          {text("live_url", "Live URL", { placeholder: "https://", type: "url" })}
          {text("repo_url", "Repository URL", { placeholder: "https://", type: "url" })}
        </div>
      </div>

      <div className={`${CARD} grid gap-5 md:grid-cols-2`}>
        {text("seo_title", "SEO title (empty = name)")}
        <label className={LABEL}>
          SEO description (empty = summary; about 125 characters)
          <textarea name="seo_description" rows={2} defaultValue={initial.seo_description} className={INPUT} />
          {err("seo_description")}
        </label>
      </div>

      <div className="sticky bottom-4 z-10 flex items-center gap-5 rounded-full bg-ink-900/90 p-2 pr-6 shadow-[inset_0_0_0_1px_var(--color-line-strong)] backdrop-blur">
        <button type="submit" disabled={pending} className="pill-btn bg-bone-100 text-ink-950">
          {pending ? "Saving…" : initial.id ? "Save changes" : "Create project"}
        </button>
        <p role="status" className={`text-sm ${state.error ? "text-[#ff9b8a]" : "text-bone-400"}`}>
          {state.error ?? (state.saved && !pending ? "Saved. The site refreshes on its next visit." : "")}
        </p>
      </div>
    </form>
  );
}
