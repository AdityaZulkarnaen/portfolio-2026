import { noiseChunk } from "./common";

/**
 * Generative field, rendered at ~¼ resolution and upsampled by the background pass
 * (it is low-frequency smoke, so bilinear upsampling is free quality).
 *
 * Two-level domain warp of fbm (iq-style), slowly drifting; the pointer trail pushes
 * the domain so the smoke parts around the cursor.
 *   r = density (0..1)  gb = warp vector (0..1 encoded)  a = filament ridge
 */
export const fieldFrag = /* glsl */ `
precision highp float;
in vec2 vUv;
out vec4 fragColor;

uniform float uTime;
uniform float uAspect;
uniform sampler2D uTrail;
uniform float uTrailOn;
uniform float uScrollVel;

${noiseChunk}

void main() {
  vec2 p = (vUv - 0.5) * vec2(uAspect, 1.0) * 0.85;
  float t = uTime * 0.028;

  vec2 tr = uTrailOn > 0.5 ? texture(uTrail, vUv).xy : vec2(0.0);
  p -= tr * 0.18;
  p.y += uScrollVel * 0.04;

  vec2 w1 = vec2(fbm3(vec3(p, t)), fbm3(vec3(p + vec2(5.2, 1.3), t + 3.1)));
  vec2 q = p + 1.6 * w1;
  vec2 w2 = vec2(fbm3(vec3(q + vec2(1.7, 9.2), t * 1.3)), fbm3(vec3(q + vec2(8.3, 2.8), t * 1.3 + 7.0)));
  float f = fbm4(vec3(p + 1.8 * w2, t * 0.7));

  float density = clamp(f * 0.5 + 0.5, 0.0, 1.0);
  float ridge = pow(clamp(1.0 - abs(f + 0.1) * 1.8, 0.0, 1.0), 2.0) * smoothstep(0.15, 0.8, length(w2));
  fragColor = vec4(density, w2 * 0.5 + 0.5, ridge);
}
`;
