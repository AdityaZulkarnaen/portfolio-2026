"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";

import { useMotionPrefs } from "@/lib/motion/motion-prefs";

import { stageBridge } from "./bridge";
import { detectBaseTier, effectiveTier, type TierInfo } from "./capabilities";
import type { StageApi } from "./types";

let baseTier: TierInfo | null = null;
const noopSubscribe = () => () => {};
function getBaseTier(): TierInfo {
  baseTier ??= detectBaseTier();
  return baseTier;
}

const DEBUG_KEY = "az:gl-debug";

function debugEnabled(): boolean {
  if (process.env.NODE_ENV !== "production") return true;
  try {
    if (new URLSearchParams(window.location.search).has("gldebug")) sessionStorage.setItem(DEBUG_KEY, "1");
    return sessionStorage.getItem(DEBUG_KEY) === "1";
  } catch {
    return false;
  }
}

function setGl(state: "on" | "off") {
  document.documentElement.dataset.gl = state;
}

function idle(cb: () => void): () => void {
  if (typeof window.requestIdleCallback === "function") {
    const id = window.requestIdleCallback(cb, { timeout: 1500 });
    return () => window.cancelIdleCallback(id);
  }
  const id = setTimeout(cb, 200);
  return () => clearTimeout(id);
}

/**
 * Owns the GL stage for the document (mounted once by <SiteRuntime> in the (site) layout).
 *
 * - Decides the tier; T0 never creates a canvas or requests the stage chunk.
 * - Loads `@/gl/stage` (and three.js) in an idle callback: never in the initial chunk.
 * - Creates the fixed canvas imperatively so each stage gets a fresh context
 *   (StrictMode / remounts never reuse a context we already released).
 * - `html[data-gl="on"]` is set only after the stage has drawn a frame with the hero
 *   source in it; CSS fades the DOM stills out from there, so there is no blank frame.
 * - Reduced motion / "Pause motion" at runtime → stage.pause() and data-gl="off"
 *   (DOM stills come back); turning motion on again resumes the same stage.
 */
export function StageProvider() {
  const base = useSyncExternalStore(noopSubscribe, getBaseTier, () => null);
  const motion = useMotionPrefs();
  const tier = base ? effectiveTier(base.tier, motion) : 0;
  const active = tier > 0;

  // Arm on the first moment the stage is wanted; stay armed so toggling is cheap.
  const [armed, setArmed] = useState(false);
  if (active && !armed) setArmed(true);

  const [stage, setStage] = useState<StageApi | null>(null);
  const activeRef = useRef(active);

  useEffect(() => {
    activeRef.current = active;
  }, [active]);

  // Back/forward navigations also snapshot the page for a view transition.
  useEffect(() => {
    const onPop = () => stageBridge.beginHandoff();
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    if (base) root.dataset.glTier = String(base.tier);
    if (!armed || !base || base.tier === 0) {
      setGl("off");
      return;
    }
    const stageTier = base.tier;

    let cancelled = false;
    let created: StageApi | null = null;
    let canvas: HTMLCanvasElement | null = null;

    const cancelIdle = idle(() => {
      import("@/gl/stage")
        .then(({ createStage }) => {
          if (cancelled) return;
          canvas = document.createElement("canvas");
          canvas.className = "gl-stage";
          canvas.setAttribute("aria-hidden", "true");
          canvas.tabIndex = -1;
          document.body.prepend(canvas);
          try {
            created = createStage(canvas, {
              tier: stageTier,
              onVisible: () => {
                if (activeRef.current) setGl("on");
              },
              onLost: () => setGl("off"),
            });
          } catch {
            canvas.remove();
            canvas = null;
            setGl("off");
            return;
          }
          stageBridge.attach(created);
          if (!activeRef.current) created.pause();
          if (debugEnabled()) (window as Window & { __stage?: StageApi }).__stage = created;
          setStage(created);
        })
        .catch(() => setGl("off"));
    });

    return () => {
      cancelled = true;
      cancelIdle();
      setGl("off");
      if (created) {
        stageBridge.detach();
        created.dispose();
        const w = window as Window & { __stage?: StageApi };
        if (w.__stage === created) delete w.__stage;
      }
      canvas?.remove();
      setStage(null);
    };
  }, [armed, base]);

  useEffect(() => {
    if (!stage) return;
    if (active) {
      stage.resume();
    } else {
      stage.pause();
      setGl("off");
    }
  }, [stage, active]);

  return null;
}
