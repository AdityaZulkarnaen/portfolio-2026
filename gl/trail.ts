import {
  type Camera,
  HalfFloatType,
  LinearFilter,
  type Mesh,
  RawShaderMaterial,
  RGBAFormat,
  type Scene,
  type Texture,
  Vector2,
  WebGLRenderTarget,
  type WebGLRenderer,
  GLSL3,
} from "three";

import { fullscreenVert } from "./shaders/fullscreen.vert";
import { trailFrag } from "./shaders/trail.frag";

const SIZE = 128;

/**
 * Pointer trail (T2 only): 128² half-float ping-pong FBO.
 * decay ×0.96/frame (at 60fps), gaussian splat of pointer velocity, one semi-Lagrangian
 * self-advection step. The background and field passes read `texture`.
 */
export class Trail {
  private targets: [WebGLRenderTarget, WebGLRenderTarget];
  private material: RawShaderMaterial;
  private index = 0;

  constructor() {
    const make = () =>
      new WebGLRenderTarget(SIZE, SIZE, {
        type: HalfFloatType,
        format: RGBAFormat,
        minFilter: LinearFilter,
        magFilter: LinearFilter,
        depthBuffer: false,
        stencilBuffer: false,
        generateMipmaps: false,
      });
    this.targets = [make(), make()];
    this.material = new RawShaderMaterial({
      glslVersion: GLSL3,
      vertexShader: fullscreenVert,
      fragmentShader: trailFrag,
      uniforms: {
        uPrev: { value: null },
        uPointer: { value: new Vector2(0.5, 0.5) },
        uPointerVel: { value: new Vector2() },
        uAspect: { value: 1 },
        uRadius: { value: 0.0045 },
        uDecay: { value: 0.96 },
        uDt: { value: 1 / 60 },
      },
      depthTest: false,
      depthWrite: false,
    });
  }

  get texture(): Texture {
    return this.targets[this.index].texture;
  }

  update(
    renderer: WebGLRenderer,
    quad: Mesh,
    scene: Scene,
    camera: Camera,
    pointer: Vector2,
    velocity: Vector2,
    aspect: number,
    dt: number,
  ) {
    const read = this.targets[this.index];
    const write = this.targets[1 - this.index];
    const u = this.material.uniforms;
    u.uPrev.value = read.texture;
    u.uPointer.value.copy(pointer);
    u.uPointerVel.value.copy(velocity);
    u.uAspect.value = aspect;
    u.uDecay.value = Math.pow(0.96, dt * 60);
    u.uDt.value = dt;
    quad.material = this.material;
    renderer.setRenderTarget(write);
    renderer.render(scene, camera);
    this.index = 1 - this.index;
  }

  /** Clear both buffers (after a context restore, or on resume). */
  clear(renderer: WebGLRenderer) {
    const prev = renderer.getRenderTarget();
    for (const t of this.targets) {
      renderer.setRenderTarget(t);
      renderer.clear(true, false, false);
    }
    renderer.setRenderTarget(prev);
  }

  dispose() {
    this.targets.forEach((t) => t.dispose());
    this.material.dispose();
  }
}
