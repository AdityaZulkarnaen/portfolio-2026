"use client";

import { useSyncExternalStore } from "react";

/**
 * Shared state of the home scroll sequence (components/home/home-sequence.tsx), read by
 * the hero projector:
 * - `active`: the pinned sequence is running, so it (not the hero) owns the stage's
 *   scroll-out progress and the reel window rect.
 * - `phase`: "in" (zooming in / holding fullscreen) keeps the reel cycling; "out" (zooming
 *   out into the lead card and beyond) parks the reel on the lead project, slide 0.
 */
export type SequencePhase = "in" | "out";
export type SequenceState = { active: boolean; phase: SequencePhase };

const IDLE: SequenceState = { active: false, phase: "in" };
let state: SequenceState = IDLE;
const listeners = new Set<() => void>();

export function setSequenceState(next: Partial<SequenceState>) {
  const merged = { ...state, ...next };
  if (merged.active === state.active && merged.phase === state.phase) return;
  state = merged;
  for (const l of listeners) l();
}

export function resetSequenceState() {
  setSequenceState(IDLE);
}

function subscribe(l: () => void) {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
}

export function useSequenceState(): SequenceState {
  return useSyncExternalStore(
    subscribe,
    () => state,
    () => IDLE,
  );
}
