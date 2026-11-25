"use client";

import { useSyncExternalStore } from "react";

/**
 * Motion preferences: OS reduced motion + the site's own "Pause motion" toggle
 * (WCAG 2.2.2). The toggle persists in localStorage. An inline script in the (site)
 * layout mirrors both onto <html data-motion="on|off"> before first paint so CSS loops
 * (grain, slideshow, marquees) never flash.
 */
import { MOTION_STORAGE_KEY } from "./boot-script";

export { MOTION_STORAGE_KEY };

type Snapshot = { reduced: boolean; paused: boolean };

const listeners = new Set<() => void>();
const SERVER: Snapshot = { reduced: false, paused: false };
let snapshot: Snapshot = SERVER;
let initialized = false;

function readPaused(): boolean {
  try {
    return window.localStorage.getItem(MOTION_STORAGE_KEY) === "paused";
  } catch {
    return false;
  }
}

function syncDom() {
  const root = document.documentElement;
  root.dataset.motion = snapshot.reduced || snapshot.paused ? "off" : "on";
  if (snapshot.paused) root.dataset.motionPaused = "true";
  else delete root.dataset.motionPaused;
}

function emit() {
  syncDom();
  listeners.forEach((l) => l());
}

function init() {
  if (initialized || typeof window === "undefined") return;
  initialized = true;
  const mql = window.matchMedia("(prefers-reduced-motion: reduce)");
  snapshot = { reduced: mql.matches, paused: readPaused() };
  mql.addEventListener("change", (e) => {
    snapshot = { ...snapshot, reduced: e.matches };
    emit();
  });
}

function subscribe(listener: () => void) {
  init();
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot(): Snapshot {
  init();
  return snapshot;
}

export function setMotionPaused(paused: boolean) {
  init();
  snapshot = { ...snapshot, paused };
  try {
    if (paused) window.localStorage.setItem(MOTION_STORAGE_KEY, "paused");
    else window.localStorage.removeItem(MOTION_STORAGE_KEY);
  } catch {
    /* storage blocked: the toggle still works for this page view */
  }
  emit();
}

export function useMotionPrefs(): Snapshot {
  return useSyncExternalStore(subscribe, getSnapshot, () => SERVER);
}

const noopSubscribe = () => () => {};

/** False on the server and during hydration, true afterwards. */
export function useHydrated(): boolean {
  return useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  );
}

/** True when continuous/decorative motion may run (not reduced, not paused, hydrated). */
export function useMotionAllowed(): boolean {
  const { reduced, paused } = useMotionPrefs();
  const hydrated = useHydrated();
  return hydrated && !reduced && !paused;
}
