/**
 * Pointer trail: 128² half-float ping-pong. xy = velocity (uv/s), z = density.
 * One semi-Lagrangian self-advection step per frame (sample upstream along the
 * stored velocity), frame-rate independent decay, gaussian splat of pointer velocity.
 * Cheap enough to run every frame; reads as a soft fluid swirl once upsampled.
 */
export const trailFrag = /* glsl */ `
precision highp float;
in vec2 vUv;
out vec4 fragColor;

uniform sampler2D uPrev;
uniform vec2 uPointer;     // uv, y up
uniform vec2 uPointerVel;  // uv / s
uniform float uAspect;
uniform float uRadius;     // gaussian variance, aspect-corrected uv²
uniform float uDecay;      // per-frame decay already adjusted for dt
uniform float uDt;

void main() {
  vec4 prev = texture(uPrev, vUv);
  vec2 back = vUv - prev.xy * uDt * 0.5;
  vec4 s = texture(uPrev, back) * uDecay;

  vec2 d = vUv - uPointer;
  d.x *= uAspect;
  float g = exp(-dot(d, d) / uRadius);
  s.xy += uPointerVel * g * 0.35;
  s.z += min(length(uPointerVel), 4.0) * g * 0.12;

  s.xy = clamp(s.xy, vec2(-3.0), vec2(3.0));
  s.z = clamp(s.z, 0.0, 1.0);
  fragColor = vec4(s.xyz, 1.0);
}
`;
