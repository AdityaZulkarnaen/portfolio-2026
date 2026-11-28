"use client";

import { useState, useTransition } from "react";

import { revalidateSite } from "../actions";

export function RevalidateButton() {
  const [pending, start] = useTransition();
  const [done, setDone] = useState(false);
  return (
    <div className="mt-6 flex items-center gap-4">
      <button
        type="button"
        disabled={pending}
        className="pill-btn"
        onClick={() =>
          start(async () => {
            await revalidateSite();
            setDone(true);
          })
        }
      >
        {pending ? "Refreshing…" : "Refresh site cache"}
      </button>
      <p role="status" className="text-sm text-bone-400">
        {done && !pending ? "Done. The site rebuilds on the next visit." : ""}
      </p>
    </div>
  );
}
