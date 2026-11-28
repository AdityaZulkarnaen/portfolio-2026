"use client";

import Image from "next/image";
import { useState, useTransition } from "react";

import { MediaPicker } from "@/components/admin/media-picker";
import { INPUT, SMALL_BTN } from "@/components/admin/ui";
import type { AdminMedia } from "@/lib/admin/media";

import { saveFrames, type FrameInput } from "../actions";

export type EditorFrame = FrameInput & { key: string };

const SELECT = `${INPUT.replace("block w-full", "block")} mt-0 py-1.5 text-sm`;

export function FramesEditor({ projectId, initial, media }: { projectId: string; initial: EditorFrame[]; media: AdminMedia[] }) {
  const [frames, setFrames] = useState(initial);
  const [dirty, setDirty] = useState(false);
  const [status, setStatus] = useState<{ error: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();
  const byId = new Map(media.map((m) => [m.id, m]));

  const update = (next: EditorFrame[]) => {
    setFrames(next);
    setDirty(true);
    setStatus(null);
  };
  // Only one cover frame: picking one clears the others.
  const patch = (i: number, p: Partial<EditorFrame>) =>
    update(frames.map((f, j) => (j === i ? { ...f, ...p } : p.is_cover ? { ...f, is_cover: false } : f)));
  const move = (i: number, d: number) => {
    const j = i + d;
    if (j < 0 || j >= frames.length) return;
    const next = [...frames];
    [next[i], next[j]] = [next[j], next[i]];
    update(next);
  };

  const save = () =>
    start(async () => {
      const res = await saveFrames(
        projectId,
        frames.map(({ key, ...f }) => (void key, f)),
      );
      setStatus(res.error ? { error: true, text: res.error } : { error: false, text: "Gallery saved." });
      if (!res.error) setDirty(false);
    });

  return (
    <div className="mt-6 grid gap-3">
      {frames.map((f, i) => {
        const m = byId.get(f.media_id);
        return (
          <div key={f.key} className="flex flex-wrap items-center gap-4 rounded-xl p-3 shadow-[inset_0_0_0_1px_var(--color-line)]">
            <span className={`relative shrink-0 overflow-hidden rounded-md bg-ink-800 ${f.frame === "phone" ? "h-24 w-12" : "h-16 w-24"}`}>
              {m ? <Image src={m.url} alt="" fill sizes="96px" className="object-cover object-top" unoptimized /> : null}
            </span>
            <div className="grid min-w-48 flex-1 gap-2">
              <span className="truncate text-sm text-bone-400">{m?.path ?? "Missing media"}</span>
              <input value={f.caption} onChange={(e) => patch(i, { caption: e.target.value })} placeholder="Caption (optional)" className={`${SELECT} w-full`} />
            </div>
            <select aria-label="Frame" value={f.frame} onChange={(e) => patch(i, { frame: e.target.value as EditorFrame["frame"] })} className={SELECT}>
              <option value="browser">Browser screen</option>
              <option value="none">Plain screen</option>
              <option value="phone">Phone</option>
            </select>
            <select
              aria-label="Where it shows"
              value={f.placement}
              onChange={(e) => patch(i, { placement: e.target.value as EditorFrame["placement"] })}
              className={SELECT}
            >
              <option value="both">Home + case</option>
              <option value="case">Case page only</option>
              <option value="showcase">Home only</option>
            </select>
            <label className="slate flex items-center gap-2 text-bone-400">
              <input type="radio" name="is_cover" checked={f.is_cover} onChange={() => patch(i, { is_cover: true })} className="accent-lilac-500" /> Cover frame
            </label>
            <div className="flex gap-1.5">
              <button type="button" aria-label="Move up" disabled={i === 0} className={SMALL_BTN} onClick={() => move(i, -1)}>
                ↑
              </button>
              <button type="button" aria-label="Move down" disabled={i === frames.length - 1} className={SMALL_BTN} onClick={() => move(i, 1)}>
                ↓
              </button>
              <button type="button" aria-label="Remove from gallery" className={`${SMALL_BTN} text-[#ff9b8a]`} onClick={() => update(frames.filter((_, j) => j !== i))}>
                ✕
              </button>
            </div>
          </div>
        );
      })}
      {frames.length === 0 ? <p className="text-bone-400">No gallery images yet.</p> : null}
      <div className="mt-2 flex flex-wrap items-center gap-4">
        <MediaPicker
          media={media}
          label="Add image"
          onPick={(m) =>
            update([
              ...frames,
              {
                key: `new-${m.id}-${frames.length}`,
                media_id: m.id,
                placement: "case",
                frame: m.height && m.width && m.height > m.width * 1.4 ? "phone" : "browser",
                caption: "",
                is_cover: false,
              },
            ])
          }
        />
        <button type="button" disabled={!dirty || pending} className="pill-btn min-h-10" onClick={save}>
          {pending ? "Saving…" : "Save gallery"}
        </button>
        <p role="status" className={`text-sm ${status?.error ? "text-[#ff9b8a]" : "text-bone-400"}`}>
          {status?.text ?? (dirty ? "Unsaved changes." : "")}
        </p>
      </div>
    </div>
  );
}
