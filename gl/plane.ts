import {
  BufferAttribute,
  BufferGeometry,
  GLSL3,
  Mesh,
  NormalBlending,
  RawShaderMaterial,
  Scene,
  Vector2,
  Vector4,
  type Texture,
} from "three";

import { gsap, ScrollTrigger } from "@/lib/motion/gsap";

import { planeFrag } from "./shaders/plane.frag";
import { planeVert } from "./shaders/plane.vert";
import type { TextureCache, TextureHandle } from "./texture-cache";
import type { PlaneHandle, PlaneProbe, PlaneStats } from "./types";

/**
 * GL media planes, drawn into the stage's canvas after the background pass.
 *
 * Geometry is measured in batches (ResizeObserver, ScrollTrigger refresh, fonts.ready,
 * window resize, route show) as document-space rects with the figure's parallax removed.
 * Per frame nothing touches layout: screen rect = doc rect − scroll + the figure's current
 * GSAP `y` (the DOM parallax from lib/motion/parallax.ts, read from GSAP's cache, so GL and
 * DOM can never disagree). Image scale/pan and the frame's clip-path reveal are read the
 * same way (GSAP cache / inline style), so the plane tracks the DOM box exactly.
 *
 * Images only: video frames stay DOM. The DOM image is hidden (CSS `gl-plane` variant on
 * `[data-gl-ready]`) only once the texture is uploaded, and shown again on release,
 * disable (tier / pointer change), pause and context loss.
 */

const SEGMENTS = 32;
const OVERSCAN = 48;
const MAX_BEND = 36;
const BEND_PX = 24;
const RGB_SPLIT_PX = 3;
const CULL_MARGIN = 160;
/** Scroll-driven reveal wave: starts when the window's top is at 80% of the viewport, done at 30%. */
const REVEAL_FROM = 0.8;
const REVEAL_TO = 0.3;
const FINE_POINTER = "(hover: hover) and (pointer: fine)";
const NO_CLIP: [number, number, number, number] = [0, 0, 0, 0];
const INSET = /inset\(\s*([-\d.]+)%\s+([-\d.]+)%\s+([-\d.]+)%\s+([-\d.]+)%\s*\)/;

type Rect4 = [number, number, number, number];

type Layout = {
  x: number;
  y: number;
  w: number;
  h: number;
  /** Frame box relative to the window (for the clip-path inset). */
  frame: Rect4;
  radii: Rect4;
  /** Image layout box relative to the window (untransformed). */
  img: Rect4;
  pos: [number, number];
  /** Pose origin (its centre) in document px, when the plane belongs to a pose. */
  origin: [number, number] | null;
};

type Plane = {
  el: HTMLElement;
  img: HTMLImageElement;
  frame: HTMLElement | null;
  mover: HTMLElement | null;
  /**
   * A transformed card (`[data-pose]`, e.g. a scattered featured print): the plane is
   * measured untransformed and follows its GSAP x/y/rotation/scale in the vertex shader.
   */
  pose: HTMLElement | null;
  marker: HTMLElement;
  tex: TextureHandle | null;
  mesh: Mesh;
  mat: RawShaderMaterial;
  layout: Layout | null;
  hover: number;
  hoverTarget: number;
  reveal: number;
  /** Registered under a handoff: always fully revealed. */
  instant: boolean;
  marked: boolean;
  clipSrc: string;
  clip: Rect4;
  rect: Rect4 | null;
  onEnter: () => void;
  onLeave: () => void;
};

function radiiOf(cs: CSSStyleDeclaration): Rect4 {
  return [
    parseFloat(cs.borderTopLeftRadius) || 0,
    parseFloat(cs.borderTopRightRadius) || 0,
    parseFloat(cs.borderBottomRightRadius) || 0,
    parseFloat(cs.borderBottomLeftRadius) || 0,
  ];
}

function positionOf(value: string): [number, number] {
  const parts = value.split(/\s+/);
  const read = (v: string | undefined) => (v && v.endsWith("%") ? parseFloat(v) / 100 : 0.5);
  return [read(parts[0]), read(parts[1])];
}


export class PlaneSystem {
  readonly scene = new Scene();
  private geometry: BufferGeometry;
  private viewport = new Vector2(1, 1);
  private planes = new Set<Plane>();
  private cache: TextureCache;
  private tier: 1 | 2;
  private mql: MediaQueryList;
  private ro: ResizeObserver;
  private fine: boolean;
  private lost = false;
  private paused = false;
  private handoff = false;
  private dirty = true;
  private visible = 0;
  private seed = 0;
  private time = 0;

  constructor(cache: TextureCache, tier: 1 | 2) {
    this.cache = cache;
    this.tier = tier;
    this.geometry = buildGeometry();
    this.mql = window.matchMedia(FINE_POINTER);
    this.fine = this.mql.matches;
    this.mql.addEventListener("change", this.onPointerChange);
    this.ro = new ResizeObserver(this.invalidate);
    this.ro.observe(document.body);
    ScrollTrigger.addEventListener("refresh", this.invalidate);
    document.fonts?.ready.then(this.invalidate).catch(() => {});
  }

  get enabled() {
    return this.tier === 2 && this.fine && !this.lost && !this.paused;
  }

  invalidate = () => {
    this.dirty = true;
  };

  register(el: HTMLElement): PlaneHandle {
    const img = el.querySelector("img");
    if (!img) return { release() {} };

    const mat = new RawShaderMaterial({
      glslVersion: GLSL3,
      vertexShader: planeVert,
      fragmentShader: planeFrag,
      uniforms: {
        uViewport: { value: this.viewport },
        uRect: { value: new Vector4() },
        uOverscan: { value: OVERSCAN },
        uBend: { value: 0 },
        uMap: { value: null as Texture | null },
        uRadii: { value: new Vector4() },
        uClip: { value: new Vector4() },
        uUvA: { value: new Vector2() },
        uUvB: { value: new Vector2(1, 1) },
        uRgb: { value: 0 },
        uReveal: { value: 0 },
        uOpacity: { value: 1 },
        uSeed: { value: (this.seed++ % 17) * 3.7 },
        uTime: { value: 0 },
        uPose: { value: new Vector4(0, 0, 0, 1) },
        uPoseOrigin: { value: new Vector2() },
      },
      transparent: true,
      blending: NormalBlending,
      depthTest: false,
      depthWrite: false,
    });
    const mesh = new Mesh(this.geometry, mat);
    mesh.frustumCulled = false;
    mesh.visible = false;
    this.scene.add(mesh);

    const frame = el.closest<HTMLElement>("[data-frame]");
    const figure = el.closest<HTMLElement>("figure");
    const depth = Number(el.closest<HTMLElement>("[data-depth]")?.dataset.depth ?? 0);
    const plane: Plane = {
      el,
      img,
      frame,
      mover: depth !== 0 ? el.closest<HTMLElement>("[data-depth]") : null,
      pose: el.closest<HTMLElement>("[data-pose]"),
      marker: figure ?? frame ?? el,
      tex: null,
      mesh,
      mat,
      layout: null,
      hover: 0,
      hoverTarget: 0,
      // Registered under a view-transition handoff (arriving on a page): no wave.
      reveal: this.handoff ? 1 : 0,
      instant: this.handoff,
      marked: false,
      clipSrc: "",
      clip: NO_CLIP,
      rect: null,
      onEnter: () => (plane.hoverTarget = 1),
      onLeave: () => (plane.hoverTarget = 0),
    };
    el.addEventListener("pointerenter", plane.onEnter);
    el.addEventListener("pointerleave", plane.onLeave);
    this.ro.observe(el);
    this.planes.add(plane);
    this.dirty = true;

    let released = false;
    return {
      release: () => {
        if (released) return;
        released = true;
        this.drop(plane);
      },
    };
  }

  setViewport(w: number, h: number) {
    this.viewport.set(w, h);
    this.dirty = true;
  }

  setHandoff(on: boolean) {
    this.handoff = on;
  }

  setPaused(paused: boolean) {
    this.paused = paused;
    if (paused) this.unmarkAll();
  }

  setLost(lost: boolean) {
    this.lost = lost;
    if (lost) this.unmarkAll();
    else this.dirty = true;
  }

  /** Updates every plane for this frame; returns true when at least one should be drawn. */
  update(dt: number, scrollVel: number): boolean {
    this.visible = 0;
    this.time += dt;
    if (!this.enabled) {
      for (const p of this.planes) p.mesh.visible = false;
      return false;
    }
    if (this.dirty) this.measure();

    const vw = this.viewport.x;
    const vh = this.viewport.y;
    const sx = window.scrollX;
    const sy = window.scrollY;
    const bend = Math.max(-MAX_BEND, Math.min(MAX_BEND, scrollVel * BEND_PX));
    const hoverEase = 1 - Math.exp(-dt * 7);

    for (const p of this.planes) {
      p.mesh.visible = false;
      p.rect = null;
      p.tex ??= this.cache.acquireImage(p.img);
      const tex = p.tex;
      if (!tex.ready || !tex.texture) continue;
      if (!p.marked) {
        p.marked = true;
        p.marker.dataset.glReady = "";
      }
      const L = p.layout;
      if (!L || this.handoff) continue;

      const my = p.mover ? Number(gsap.getProperty(p.mover, "y")) || 0 : 0;
      const x = L.x - sx;
      const y = L.y - sy + my;
      p.rect = [x, y, L.w, L.h];
      // Pose transform (GSAP cache, no layout): translate, rotate and scale about its centre.
      let ptx = 0;
      let pty = 0;
      let rot = 0;
      let sc = 1;
      if (p.pose && L.origin) {
        ptx = Number(gsap.getProperty(p.pose, "x")) || 0;
        pty = Number(gsap.getProperty(p.pose, "y")) || 0;
        rot = ((Number(gsap.getProperty(p.pose, "rotation")) || 0) * Math.PI) / 180;
        sc = Number(gsap.getProperty(p.pose, "scaleX")) || 1;
      }
      const margin = CULL_MARGIN + Math.abs(ptx) + Math.abs(pty);
      if (y > vh + margin || y + L.h < -margin || x > vw + margin || x + L.w < -margin) continue;

      // The wave: driven by the page when the frame carries `--dev` (featured cards: the
      // home sequence develops them), else by the scroll position. Both run back on
      // scroll-up. Lightly smoothed.
      const dev = p.frame ? parseFloat(p.frame.style.getPropertyValue("--dev")) : NaN;
      const target = p.instant
        ? 1
        : Number.isFinite(dev)
          ? Math.max(0, Math.min(1, dev))
          : Math.max(0, Math.min(1, (vh * REVEAL_FROM - y) / (vh * (REVEAL_FROM - REVEAL_TO))));
      p.reveal += (target - p.reveal) * (1 - Math.exp(-dt * 9));
      if (Math.abs(target - p.reveal) < 0.001) p.reveal = target;
      p.hover += (p.hoverTarget - p.hover) * hoverEase;

      const clipStyle = p.frame?.style.clipPath ?? "";
      if (clipStyle !== p.clipSrc) {
        p.clipSrc = clipStyle;
        const m = INSET.exec(clipStyle);
        p.clip = m ? [Number(m[1]) / 100, Number(m[2]) / 100, Number(m[3]) / 100, Number(m[4]) / 100] : NO_CLIP;
      }
      const opacity = p.frame?.style.opacity ? Number(p.frame.style.opacity) : 1;

      const s = Number(gsap.getProperty(p.img, "scaleX")) || 1;
      const ty = Number(gsap.getProperty(p.img, "y")) || 0;
      const [bx, by, bw, bh] = L.img;
      const w0 = bw * s;
      const h0 = bh * s;
      const x0 = bx + bw / 2 - w0 / 2;
      const y0 = by + bh / 2 - h0 / 2 + ty;
      const ta = tex.width / Math.max(1, tex.height);
      let dw = w0;
      let dh = w0 / ta;
      if (ta > w0 / Math.max(1, h0)) {
        dh = h0;
        dw = h0 * ta;
      }
      const ox = x0 + (w0 - dw) * L.pos[0];
      const oy = y0 + (h0 - dh) * L.pos[1];

      const u = p.mat.uniforms;
      u.uMap.value = tex.texture;
      (u.uRect.value as Vector4).set(x, y, L.w, L.h);
      (u.uRadii.value as Vector4).set(...L.radii);
      const [fl, ft, fw, fh] = L.frame;
      const [ct, cr, cb, cl] = p.clip;
      (u.uClip.value as Vector4).set(x + fl + fw * cl, y + ft + fh * ct, x + fl + fw * (1 - cr), y + ft + fh * (1 - cb));
      (u.uUvA.value as Vector2).set(-ox / dw, -oy / dh);
      (u.uUvB.value as Vector2).set(L.w / dw, L.h / dh);
      u.uBend.value = bend;
      u.uRgb.value = (p.hover * RGB_SPLIT_PX) / L.w;
      u.uReveal.value = p.reveal;
      (u.uPose.value as Vector4).set(ptx, pty, rot, sc);
      if (L.origin) (u.uPoseOrigin.value as Vector2).set(L.origin[0] - sx, L.origin[1] - sy);
      u.uTime.value = this.time;
      u.uOpacity.value = opacity;
      p.mesh.visible = true;
      this.visible++;
    }
    return this.visible > 0;
  }

  stats(): PlaneStats {
    let ready = 0;
    for (const p of this.planes) if (p.tex?.ready) ready++;
    return { registered: this.planes.size, ready, visible: this.visible, enabled: this.enabled };
  }

  probe(): PlaneProbe[] {
    return [...this.planes].map((p) => {
      const r = p.el.getBoundingClientRect();
      const round = (v: number) => Math.round(v * 100) / 100;
      return {
        plane: p.rect ? (p.rect.map(round) as Rect4) : null,
        dom: [round(r.left), round(r.top), round(r.width), round(r.height)],
      };
    });
  }

  dispose() {
    for (const p of [...this.planes]) this.drop(p);
    this.mql.removeEventListener("change", this.onPointerChange);
    this.ro.disconnect();
    ScrollTrigger.removeEventListener("refresh", this.invalidate);
    this.geometry.dispose();
  }

  private onPointerChange = (e: MediaQueryListEvent) => {
    this.fine = e.matches;
    if (!this.enabled) this.releaseTextures();
  };

  private releaseTextures() {
    this.unmarkAll();
    for (const p of this.planes) {
      p.tex?.release();
      p.tex = null;
    }
  }

  private unmarkAll() {
    for (const p of this.planes) this.unmark(p);
  }

  private unmark(p: Plane) {
    if (!p.marked) return;
    p.marked = false;
    delete p.marker.dataset.glReady;
  }

  private drop(p: Plane) {
    if (!this.planes.delete(p)) return;
    this.unmark(p);
    p.el.removeEventListener("pointerenter", p.onEnter);
    p.el.removeEventListener("pointerleave", p.onLeave);
    this.ro.unobserve(p.el);
    this.scene.remove(p.mesh);
    p.mat.dispose();
    p.tex?.release();
    p.tex = null;
  }

  /** One batched layout read for every plane. */
  private measure() {
    this.dirty = false;
    const sx = window.scrollX;
    const sy = window.scrollY;
    const near = (a: number, b: number) => Math.abs(a - b) < 1.5;
    for (const p of this.planes) {
      if (p.pose) {
        this.measurePose(p, sx, sy);
        continue;
      }
      const r = p.el.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) {
        p.layout = null;
        continue;
      }
      const my = p.mover ? Number(gsap.getProperty(p.mover, "y")) || 0 : 0;
      const f = p.frame?.getBoundingClientRect() ?? r;
      const wr = radiiOf(getComputedStyle(p.el));
      const fr = p.frame ? radiiOf(getComputedStyle(p.frame)) : wr;
      // A window corner that coincides with the frame's corner is clipped by the frame's radius.
      const radii: Rect4 = [
        near(r.left, f.left) && near(r.top, f.top) ? Math.max(wr[0], fr[0]) : wr[0],
        near(r.right, f.right) && near(r.top, f.top) ? Math.max(wr[1], fr[1]) : wr[1],
        near(r.right, f.right) && near(r.bottom, f.bottom) ? Math.max(wr[2], fr[2]) : wr[2],
        near(r.left, f.left) && near(r.bottom, f.bottom) ? Math.max(wr[3], fr[3]) : wr[3],
      ];
      p.layout = {
        x: r.left + sx,
        y: r.top + sy - my,
        w: r.width,
        h: r.height,
        frame: [f.left - r.left, f.top - r.top, f.width, f.height],
        radii,
        img: [p.img.offsetLeft, p.img.offsetTop, p.img.offsetWidth, p.img.offsetHeight],
        pos: positionOf(getComputedStyle(p.img).objectPosition),
        origin: null,
      };
    }
  }

  /**
   * A pose plane, measured without its transform: the pose's untransformed box is its
   * (untransformed) parent's, and the window's offset inside it comes from offsetLeft/Top.
   */
  private measurePose(p: Plane, sx: number, sy: number) {
    const pose = p.pose!;
    const host = pose.parentElement?.getBoundingClientRect();
    const w = p.el.offsetWidth;
    const h = p.el.offsetHeight;
    if (!host || w === 0 || h === 0) {
      p.layout = null;
      return;
    }
    let ox = 0;
    let oy = 0;
    for (let n: HTMLElement | null = p.el; n && n !== pose; n = n.offsetParent as HTMLElement | null) {
      ox += n.offsetLeft;
      oy += n.offsetTop;
    }
    const wr = radiiOf(getComputedStyle(p.el));
    const fr = p.frame ? radiiOf(getComputedStyle(p.frame)) : wr;
    const fx = p.frame && p.frame !== p.el ? p.frame.offsetLeft : ox;
    const fy = p.frame && p.frame !== p.el ? p.frame.offsetTop : oy;
    const coincide = Math.abs(fx - ox) < 1.5 && Math.abs(fy - oy) < 1.5;
    const radii: Rect4 = coincide ? [0, 1, 2, 3].map((k) => Math.max(wr[k], fr[k])) as Rect4 : wr;
    const left = host.left + sx;
    const top = host.top + sy;
    const z = Number(getComputedStyle(pose).zIndex);
    p.mesh.renderOrder = Number.isFinite(z) ? z : 0;
    p.layout = {
      x: left + ox,
      y: top + oy,
      w,
      h,
      frame: [fx - ox, fy - oy, p.frame?.offsetWidth ?? w, p.frame?.offsetHeight ?? h],
      radii,
      img: [p.img.offsetLeft, p.img.offsetTop, p.img.offsetWidth, p.img.offsetHeight],
      pos: positionOf(getComputedStyle(p.img).objectPosition),
      origin: [left + pose.offsetWidth / 2, top + pose.offsetHeight / 2],
    };
  }
}

/** (SEGMENTS + 1) × 2 grid in 0..1 local space (y down, so wound CCW after the clip-space flip). */
function buildGeometry(): BufferGeometry {
  const cols = SEGMENTS + 1;
  const pos = new Float32Array(cols * 2 * 3);
  for (let i = 0; i < cols; i++) {
    const x = i / SEGMENTS;
    pos.set([x, 0, 0], i * 3);
    pos.set([x, 1, 0], (cols + i) * 3);
  }
  const index: number[] = [];
  for (let i = 0; i < SEGMENTS; i++) index.push(i, cols + i, i + 1, i + 1, cols + i, cols + i + 1);
  const g = new BufferGeometry();
  g.setAttribute("position", new BufferAttribute(pos, 3));
  g.setIndex(index);
  return g;
}
