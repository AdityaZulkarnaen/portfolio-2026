import {
  BufferAttribute,
  BufferGeometry,
  Camera,
  Color,
  DataTexture,
  GLSL3,
  HalfFloatType,
  LinearFilter,
  Mesh,
  RawShaderMaterial,
  RGBAFormat,
  Scene,
  UnsignedByteType,
  Vector2,
  Vector3,
  WebGLRenderer,
  WebGLRenderTarget,
} from "three";

import { gsap } from "@/lib/motion/gsap";
import { subscribeVelocity } from "@/lib/motion/lenis-store";

import { targetDpr } from "./capabilities";
import { PlaneSystem } from "./plane";
import { backgroundFrag } from "./shaders/background.frag";
import { fieldFrag } from "./shaders/field.frag";
import { fullscreenVert } from "./shaders/fullscreen.vert";
import { type TextureHandle, TextureCache } from "./texture-cache";
import { Trail } from "./trail";
import type { HeroSource, PlaneHandle, PlaneProbe, StageApi, StageDebug, StageMode, StageOptions } from "./types";

/**
 * The persistent GL stage. One renderer, one fixed canvas, owned by the (site) layout
 * runtime for the whole document; pages only talk to it through the bridge and release
 * what they registered in layout-effect cleanups (Activity-safe).
 *
 * Per frame (gsap.ticker, after Lenis): trail FBO (T2) → ¼-res generative field →
 * fullscreen background → media planes (T2, fine pointer; gl/plane.ts).
 *
 * No React in here. This module (and three.js) is only reachable through a dynamic
 * import, so it never lands in the initial route chunk.
 */

const KEN_BURNS_MS = 8000;
const CROSSFADE_S = 1.8;
const FIELD_DIVISOR = 4;
const READY_TIMEOUT_MS = 3000;
const DEFAULT_TINT = "#ff5b2e";

type Slot = { index: number; start: number };

export function createStage(canvas: HTMLCanvasElement, opts: StageOptions): StageApi {
  return new Stage(canvas, opts);
}

class Stage implements StageApi {
  private renderer: WebGLRenderer;
  private scene = new Scene();
  private camera = new Camera();
  private quad: Mesh;
  private geometry: BufferGeometry;
  private bgMat: RawShaderMaterial;
  private fieldMat: RawShaderMaterial;
  private fieldRT: WebGLRenderTarget;
  private trail: Trail | null = null;
  private cache: TextureCache;
  private black: DataTexture;
  private planes: PlaneSystem;

  private tier: 1 | 2;
  private opts: StageOptions;
  private canvas: HTMLCanvasElement;

  private wantRunning = true;
  private ticking = false;
  private lost = false;
  private disposed = false;
  private signalled = false;
  private runStart = 0;
  private time = 0;

  private width = 1;
  private height = 1;
  private dpr = 1;
  private quality = 1;
  private degradeLevel = 0;
  private slowWindows = 0;
  private aberrationOn = true;
  private frameSum = 0;
  private frameCount = 0;
  private windowStart = 0;
  private avgFrameMs = 0;
  private lastCalls = 0;
  private tickSum = 0;
  private tickMs = 0;

  private mode: StageMode = "ambient";
  private source: HeroSource = null;
  private handles: (TextureHandle | null)[] = [];
  private accents: string[] = [];
  private current = -1;
  private slotA: Slot = { index: -1, start: 0 };
  private slotB: Slot = { index: -1, start: 0 };
  private mix = { v: 1 };
  private pendingMix = false;
  private mixTween: gsap.core.Tween | null = null;

  private pulseState = { v: 0 };
  private pulseTl: gsap.core.Timeline | null = null;

  private pointerPx = new Vector2(-1, -1);
  private pointerUv = new Vector2(0.5, 0.5);
  private prevPointerUv = new Vector2(0.5, 0.5);
  private pointerVel = new Vector2();
  private rawVel = new Vector2();
  private hasPointer = false;
  private scrollVelTarget = 0;
  private scrollVel = 0;
  private progress = 0;

  private tint = new Color(DEFAULT_TINT);
  private tintTarget = new Color(DEFAULT_TINT);
  private heroTint = new Color(DEFAULT_TINT);
  private heroTintTarget = new Color(DEFAULT_TINT);

  private unsubVelocity: () => void;
  private resizeRaf = 0;

  constructor(canvas: HTMLCanvasElement, opts: StageOptions) {
    this.canvas = canvas;
    this.opts = opts;
    this.tier = opts.tier;

    this.renderer = new WebGLRenderer({
      canvas,
      antialias: false,
      alpha: false,
      depth: false,
      stencil: false,
      premultipliedAlpha: false,
      preserveDrawingBuffer: false,
      powerPreference: "high-performance",
    });
    this.renderer.autoClear = false;
    this.renderer.info.autoReset = false;
    this.renderer.setClearColor(0x000000, 1);

    const ext = this.renderer.extensions;
    const floatTargets = ext.has("EXT_color_buffer_float") || ext.has("EXT_color_buffer_half_float");

    this.cache = new TextureCache(this.renderer);
    this.black = new DataTexture(new Uint8Array([7, 8, 11, 255]), 1, 1, RGBAFormat);
    this.black.needsUpdate = true;
    this.planes = new PlaneSystem(this.cache, this.tier);

    this.geometry = new BufferGeometry();
    this.geometry.setAttribute("position", new BufferAttribute(new Float32Array([-1, -1, 0, 3, -1, 0, -1, 3, 0]), 3));
    this.fieldRT = new WebGLRenderTarget(1, 1, {
      type: floatTargets ? HalfFloatType : UnsignedByteType,
      format: RGBAFormat,
      minFilter: LinearFilter,
      magFilter: LinearFilter,
      depthBuffer: false,
      stencilBuffer: false,
      generateMipmaps: false,
    });
    if (this.tier === 2 && floatTargets) this.trail = new Trail();

    this.fieldMat = new RawShaderMaterial({
      glslVersion: GLSL3,
      vertexShader: fullscreenVert,
      fragmentShader: fieldFrag,
      uniforms: {
        uTime: { value: 0 },
        uAspect: { value: 1 },
        uTrail: { value: this.black },
        uTrailOn: { value: 0 },
        uScrollVel: { value: 0 },
      },
      depthTest: false,
      depthWrite: false,
    });

    this.bgMat = new RawShaderMaterial({
      glslVersion: GLSL3,
      vertexShader: fullscreenVert,
      fragmentShader: backgroundFrag,
      uniforms: {
        uResolution: { value: new Vector2(1, 1) },
        uTime: { value: 0 },
        uField: { value: this.fieldRT.texture },
        uTrail: { value: this.black },
        uTrailOn: { value: 0 },
        uSourceA: { value: this.black },
        uSourceB: { value: this.black },
        uResA: { value: new Vector2(16, 9) },
        uResB: { value: new Vector2(16, 9) },
        uSourceMix: { value: 1 },
        uKbA: { value: 0 },
        uKbB: { value: 0 },
        uHasSource: { value: 0 },
        uHero: { value: 0 },
        uDisplacement: { value: this.tier === 2 ? 0.006 : 0.004 },
        uAberration: { value: this.tier === 2 ? 1 : 0.6 },
        uHueShift: { value: 0 },
        uClickPulse: { value: 0 },
        uClickPos: { value: new Vector2(0.5, 0.5) },
        uScanline: { value: 1 },
        uVignette: { value: 0.6 },
        uGrain: { value: 0.036 },
        uProgress: { value: 0 },
        uTint: { value: new Vector3() },
        uHeroTint: { value: new Vector3() },
        uAmbient: { value: 1 },
        uMouse: { value: new Vector2(0.5, 0.5) },
        uMouseVel: { value: new Vector2() },
        uScrollVel: { value: 0 },
      },
      depthTest: false,
      depthWrite: false,
    });

    this.quad = new Mesh(this.geometry, this.bgMat);
    this.quad.frustumCulled = false;
    this.scene.add(this.quad);

    canvas.addEventListener("webglcontextlost", this.onContextLost, false);
    canvas.addEventListener("webglcontextrestored", this.onContextRestored, false);
    window.addEventListener("pointermove", this.onPointerMove, { passive: true });
    window.addEventListener("resize", this.onResize, { passive: true });
    this.unsubVelocity = subscribeVelocity((v) => {
      this.scrollVelTarget = v;
    });

    this.measure();
    this.trail?.clear(this.renderer);
    this.start();
  }

  // ------------------------------------------------------------------ public API

  setMode(mode: StageMode) {
    this.mode = mode;
  }

  setHeroSources(source: HeroSource, index = 0) {
    for (const h of this.handles) h?.release();
    this.handles = [];
    this.accents = [];
    this.source = source;
    this.current = -1;
    this.pendingMix = false;
    this.mixTween?.kill();
    this.mix.v = 1;
    if (!source) return;
    if (source.kind === "images") {
      this.handles = source.images.map((img) => (img ? this.cache.acquireImage(img) : null));
      this.accents = source.accents;
    } else {
      this.handles = [this.cache.acquireVideo(source.video)];
      this.accents = [source.accent ?? DEFAULT_TINT];
    }
    this.setSlide(index);
  }

  setSlide(index: number, progress = 0) {
    if (!this.source) return;
    const i = this.source.kind === "video" ? 0 : Math.max(0, Math.min(index, this.handles.length - 1));
    const start = performance.now() - Math.max(0, Math.min(1, progress)) * KEN_BURNS_MS;
    const accent = this.accents[i];
    if (accent) this.heroTintTarget.set(accent);
    if (i === this.current) return;
    if (this.current < 0) {
      this.current = i;
      this.slotA = { index: i, start };
      this.slotB = { index: i, start };
      this.mix.v = 1;
      return;
    }
    this.slotA = this.slotB;
    this.slotB = { index: i, start };
    this.current = i;
    this.mixTween?.kill();
    this.mix.v = 0;
    this.pendingMix = true;
  }

  setTint(hex: string) {
    try {
      this.tintTarget.set(hex);
    } catch {
      this.tintTarget.set(DEFAULT_TINT);
    }
  }

  pulse(x?: number, y?: number) {
    const px = x ?? (this.hasPointer ? this.pointerPx.x : this.width / 2);
    const py = y ?? (this.hasPointer ? this.pointerPx.y : this.height / 2);
    (this.bgMat.uniforms.uClickPos.value as Vector2).set(px / this.width, 1 - py / this.height);
    this.pulseTl?.kill();
    this.pulseTl = gsap
      .timeline()
      .to(this.pulseState, { v: 1, duration: 0.2, ease: "power2.out" })
      .to(this.pulseState, { v: 0, duration: 0.4, ease: "power2.in" });
  }

  setScrollProgress(p: number) {
    this.progress = Math.max(0, Math.min(1, p));
  }

  remeasure() {
    this.measure();
    this.planes.invalidate();
  }

  registerPlane(el: HTMLElement): PlaneHandle {
    return this.planes.register(el);
  }

  setHandoff(on: boolean) {
    this.planes.setHandoff(on);
  }

  debugPlanes(): PlaneProbe[] {
    return this.planes.probe();
  }

  pause() {
    this.wantRunning = false;
    this.stop();
    this.planes.setPaused(true);
  }

  resume() {
    this.wantRunning = true;
    this.planes.setPaused(false);
    if (!this.lost) this.start();
  }

  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    this.stop();
    this.canvas.removeEventListener("webglcontextlost", this.onContextLost);
    this.canvas.removeEventListener("webglcontextrestored", this.onContextRestored);
    window.removeEventListener("pointermove", this.onPointerMove);
    window.removeEventListener("resize", this.onResize);
    cancelAnimationFrame(this.resizeRaf);
    this.unsubVelocity();
    this.mixTween?.kill();
    this.pulseTl?.kill();
    for (const h of this.handles) h?.release();
    this.handles = [];
    this.planes.dispose();
    this.cache.dispose();
    this.trail?.dispose();
    this.fieldRT.dispose();
    this.bgMat.dispose();
    this.fieldMat.dispose();
    this.geometry.dispose();
    this.black.dispose();
    this.renderer.dispose();
    this.renderer.forceContextLoss();
  }

  debug(): StageDebug {
    const info = this.renderer.info;
    return {
      tier: this.tier,
      running: this.ticking,
      lost: this.lost,
      mode: this.mode,
      dpr: Number(this.dpr.toFixed(3)),
      quality: Number(this.quality.toFixed(3)),
      aberration: this.aberrationOn,
      size: [this.width, this.height],
      textures: info.memory.textures,
      geometries: info.memory.geometries,
      programs: info.programs?.length ?? 0,
      drawCalls: this.lastCalls,
      cache: this.cache.stats(),
      avgFrameMs: Number(this.avgFrameMs.toFixed(2)),
      tickMs: Number(this.tickMs.toFixed(3)),
      planes: this.planes.stats(),
    };
  }

  // ------------------------------------------------------------------ lifecycle

  private start() {
    if (this.ticking || this.disposed) return;
    this.ticking = true;
    this.signalled = false;
    this.runStart = performance.now();
    this.windowStart = this.runStart;
    this.frameSum = 0;
    this.frameCount = 0;
    this.tickSum = 0;
    this.trail?.clear(this.renderer);
    // Added after Lenis (Lenis registers with priority), so scroll state is current.
    gsap.ticker.add(this.tick);
  }

  private stop() {
    if (!this.ticking) return;
    this.ticking = false;
    gsap.ticker.remove(this.tick);
  }

  private onContextLost = (e: Event) => {
    e.preventDefault();
    this.lost = true;
    this.stop();
    this.planes.setLost(true);
    this.opts.onLost();
  };

  private onContextRestored = () => {
    // three re-initialises its GL state on restore; our resources upload again lazily.
    this.lost = false;
    this.cache.invalidate();
    this.planes.setLost(false);
    this.black.needsUpdate = true;
    this.measure();
    if (this.wantRunning) this.start();
  };

  private onPointerMove = (e: PointerEvent) => {
    this.pointerPx.set(e.clientX, e.clientY);
    if (!this.hasPointer) {
      this.hasPointer = true;
      this.pointerUv.set(e.clientX / this.width, 1 - e.clientY / this.height);
      this.prevPointerUv.copy(this.pointerUv);
    }
  };

  private onResize = () => {
    cancelAnimationFrame(this.resizeRaf);
    this.resizeRaf = requestAnimationFrame(() => this.measure());
  };

  private measure() {
    const w = Math.max(1, this.canvas.clientWidth || window.innerWidth);
    const h = Math.max(1, this.canvas.clientHeight || window.innerHeight);
    this.width = w;
    this.height = h;
    this.dpr = targetDpr(this.tier, w, h) * this.quality;
    this.renderer.setPixelRatio(this.dpr);
    this.renderer.setSize(w, h, false);
    this.fieldRT.setSize(Math.ceil(w / FIELD_DIVISOR), Math.ceil(h / FIELD_DIVISOR));
    (this.bgMat.uniforms.uResolution.value as Vector2).set(Math.round(w * this.dpr), Math.round(h * this.dpr));
    this.planes.setViewport(w, h);
  }

  // ------------------------------------------------------------------ frame

  private tick = (_time: number, deltaMs: number) => {
    if (this.lost || this.disposed) return;
    const now = performance.now();
    const dt = Math.min(0.1, Math.max(0.001, deltaMs / 1000));
    this.time += dt;
    this.adapt(deltaMs, now);

    const first = !this.signalled;
    const ease = (rate: number) => (first ? 1 : 1 - Math.exp(-dt * rate));

    // Pointer: uv (y up) + smoothed velocity in uv/s.
    if (this.hasPointer) {
      this.pointerUv.set(this.pointerPx.x / this.width, 1 - this.pointerPx.y / this.height);
      this.rawVel.subVectors(this.pointerUv, this.prevPointerUv).divideScalar(dt);
      this.prevPointerUv.copy(this.pointerUv);
    } else this.rawVel.set(0, 0);
    this.pointerVel.lerp(this.rawVel, 1 - Math.exp(-dt * 14));
    this.scrollVel += (Math.max(-1.5, Math.min(1.5, this.scrollVelTarget / 30)) - this.scrollVel) * (1 - Math.exp(-dt * 6));
    this.scrollVelTarget *= Math.exp(-dt * 4);

    // Sources.
    const hA = this.slotA.index >= 0 ? this.handles[this.slotA.index] : null;
    const hB = this.slotB.index >= 0 ? this.handles[this.slotB.index] : null;
    if (this.pendingMix && hB?.ready) {
      this.pendingMix = false;
      this.mixTween = gsap.to(this.mix, { v: 1, duration: CROSSFADE_S, ease: "io" });
    }
    const visibleReady = !!(hB?.ready || (this.pendingMix && hA?.ready));
    const u = this.bgMat.uniforms;
    const texA = hA?.texture ?? hB?.texture ?? null;
    const texB = hB?.texture ?? texA;
    const resA = hA?.ready ? hA : hB;
    const resB = hB?.ready ? hB : hA;
    u.uSourceA.value = texA ?? this.black;
    u.uSourceB.value = texB ?? this.black;
    (u.uResA.value as Vector2).set(resA?.width || 16, resA?.height || 9);
    (u.uResB.value as Vector2).set(resB?.width || 16, resB?.height || 9);
    u.uSourceMix.value = this.pendingMix ? 0 : this.mix.v;
    u.uKbA.value = Math.min(1, (now - this.slotA.start) / KEN_BURNS_MS);
    u.uKbB.value = Math.min(1, (now - this.slotB.start) / KEN_BURNS_MS);
    u.uHasSource.value += ((visibleReady ? 1 : 0) - u.uHasSource.value) * ease(2.5);
    u.uHero.value += ((this.mode === "hero" ? 1 : 0) - u.uHero.value) * ease(2.2);

    this.tint.lerp(this.tintTarget, ease(2));
    this.heroTint.lerp(this.heroTintTarget, ease(1.2));
    (u.uTint.value as Vector3).set(this.tint.r, this.tint.g, this.tint.b);
    (u.uHeroTint.value as Vector3).set(this.heroTint.r, this.heroTint.g, this.heroTint.b);

    u.uTime.value = this.time;
    u.uProgress.value = this.progress;
    u.uClickPulse.value = this.pulseState.v;
    u.uAberration.value = this.aberrationOn ? (this.tier === 2 ? 1 : 0.6) : 0;
    (u.uMouse.value as Vector2).copy(this.pointerUv);
    (u.uMouseVel.value as Vector2).copy(this.pointerVel);
    u.uScrollVel.value = this.scrollVel;

    // Draw.
    const r = this.renderer;
    r.info.reset();
    const aspect = this.width / this.height;
    if (this.trail) {
      this.trail.update(r, this.quad, this.scene, this.camera, this.pointerUv, this.pointerVel, aspect, dt);
      u.uTrail.value = this.trail.texture;
      u.uTrailOn.value = 1;
      this.fieldMat.uniforms.uTrail.value = this.trail.texture;
      this.fieldMat.uniforms.uTrailOn.value = 1;
    }
    const fu = this.fieldMat.uniforms;
    fu.uTime.value = this.time;
    fu.uAspect.value = aspect;
    fu.uScrollVel.value = this.scrollVel;
    this.quad.material = this.fieldMat;
    r.setRenderTarget(this.fieldRT);
    r.render(this.scene, this.camera);

    this.quad.material = this.bgMat;
    r.setRenderTarget(null);
    r.render(this.scene, this.camera);
    if (this.planes.update(dt, this.scrollVel)) r.render(this.planes.scene, this.camera);
    this.lastCalls = r.info.render.calls;

    if (first) {
      const sourcePending = this.mode === "hero" && this.source !== null && !visibleReady;
      if (!sourcePending || now - this.runStart > READY_TIMEOUT_MS) {
        this.signalled = true;
        this.opts.onVisible();
      }
    }
    this.tickSum += performance.now() - now;
  };

  /** T2 adaptive quality: avg frame > 20ms for 2s (×2 windows) → DPR ×0.85, then aberration off, then more DPR. */
  private adapt(deltaMs: number, now: number) {
    if (deltaMs > 0 && deltaMs < 100) {
      this.frameSum += deltaMs;
      this.frameCount++;
    }
    if (now - this.windowStart < 2000) return;
    this.avgFrameMs = this.frameCount ? this.frameSum / this.frameCount : 0;
    this.tickMs = this.frameCount ? this.tickSum / this.frameCount : 0;
    this.tickSum = 0;
    const warm = now - this.runStart > 2000;
    this.windowStart = now;
    this.frameSum = 0;
    this.frameCount = 0;
    // Two slow windows in a row: a single one is usually a transition or a decode.
    const slow = this.tier === 2 && warm && this.avgFrameMs > 20;
    this.slowWindows = slow ? this.slowWindows + 1 : 0;
    if (this.slowWindows < 2) return;
    this.slowWindows = 0;
    this.degradeLevel++;
    if (this.degradeLevel === 2 && this.aberrationOn) {
      this.aberrationOn = false;
      return;
    }
    if (this.quality > 0.5) {
      this.quality = Math.max(0.5, this.quality * 0.85);
      this.measure();
    }
  }
}
