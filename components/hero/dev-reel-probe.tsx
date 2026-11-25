"use client";

import { type ReactNode, useSyncExternalStore } from "react";

import { PlayReelButton } from "./play-reel-button";

const noop = () => () => {};

/**
 * Development only: `?reel=/videos/any.mp4` mounts the Play reel pill + dialog with that
 * file, so the modal can be exercised before the P7 reel exists. Otherwise `fallback`.
 */
export function DevReelProbe({ fallback }: { fallback: ReactNode }) {
  const src = useSyncExternalStore(
    noop,
    () => new URLSearchParams(window.location.search).get("reel"),
    () => null,
  );
  if (!src || !src.startsWith("/")) return fallback;
  return (
    <PlayReelButton
      src={src}
      title="Showreel (dev probe)"
      chapters={[
        { label: "Chapter 1", startS: 0 },
        { label: "Chapter 2", startS: 4 },
        { label: "Chapter 3", startS: 8 },
      ]}
    />
  );
}
