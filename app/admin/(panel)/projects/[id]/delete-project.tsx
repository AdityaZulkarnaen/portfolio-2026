"use client";

import { useTransition } from "react";

import { CARD, DANGER, SMALL_BTN } from "@/components/admin/ui";

import { deleteProject } from "../actions";

export function DeleteProject({ id, name }: { id: string; name: string }) {
  const [pending, start] = useTransition();
  return (
    <section className={`${CARD} flex flex-wrap items-center justify-between gap-4`}>
      <div>
        <h2 className="font-semibold">Delete project</h2>
        <p className="text-sm text-bone-400">Removes it and its gallery. Images stay in the media library.</p>
      </div>
      <button
        type="button"
        disabled={pending}
        className={`${SMALL_BTN} ${DANGER}`}
        onClick={() => {
          if (confirm(`Delete "${name}"? This can't be undone. Unpublishing hides it instead.`)) start(() => deleteProject(id));
        }}
      >
        {pending ? "Deleting…" : "Delete"}
      </button>
    </section>
  );
}
