/**
 * Document-wide scheduler for inline muted loops. Every video that is in view asks to play;
 * the most recent MAX_PLAYING requests run and the rest wait paused. When one leaves view
 * (or is paused by the user), the next waiting video takes its slot, so a video never stays
 * frozen just because it lost a slot earlier.
 */
const MAX_PLAYING = 3;
const wanting: HTMLVideoElement[] = [];

function drop(video: HTMLVideoElement) {
  const i = wanting.indexOf(video);
  if (i !== -1) wanting.splice(i, 1);
}

function schedule() {
  const active = new Set(wanting.slice(-MAX_PLAYING));
  for (const v of wanting) {
    if (active.has(v)) {
      if (v.paused) v.play().catch(() => {});
    } else if (!v.paused) {
      v.pause();
    }
  }
}

export function requestPlayback(video: HTMLVideoElement) {
  drop(video);
  wanting.push(video);
  schedule();
}

export function releasePlayback(video: HTMLVideoElement) {
  drop(video);
  video.pause();
  schedule();
}

/** In view = at least this share of the element is visible. Low so loops keep running while scrolling past. */
export const IN_VIEW_RATIO = 0.25;
export const IN_VIEW_THRESHOLDS = [0, IN_VIEW_RATIO, 0.5, 1];
