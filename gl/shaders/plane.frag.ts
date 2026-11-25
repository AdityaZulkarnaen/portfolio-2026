import { noiseChunk } from "./common";

/**
 * Media plane: object-fit cover via an affine uv map computed on the CPU (uUvA + local·uUvB,
 * matching the DOM image box and its transform), clipped to the window's rounded rect and
 * the frame's clip-path inset. Hover RGB split and a noise wipe on first reveal.
 */
export const planeFrag = /* glsl */ `
precision highp float;
in vec2 vPx;
in vec2 vLocal;
uniform sampler2D uMap;
uniform vec4 uRect;
uniform vec4 uRadii;
uniform vec4 uClip;
uniform vec2 uUvA;
uniform vec2 uUvB;
uniform float uRgb; // horizontal split in window-local units
uniform float uReveal;
uniform float uOpacity;
uniform float uSeed;
out vec4 outColor;

${noiseChunk}

float roundedMask(vec2 p, vec4 rect, vec4 r) {
  vec2 c = rect.xy + rect.zw * 0.5;
  vec2 q = p - c;
  float rad = q.x < 0.0 ? (q.y < 0.0 ? r.x : r.w) : (q.y < 0.0 ? r.y : r.z);
  vec2 d = abs(q) - rect.zw * 0.5 + rad;
  float dist = min(max(d.x, d.y), 0.0) + length(max(d, 0.0)) - rad;
  return clamp(0.5 - dist, 0.0, 1.0);
}

vec3 sampleMap(vec2 local) {
  vec2 uv = uUvA + local * uUvB;
  return texture(uMap, clamp(vec2(uv.x, 1.0 - uv.y), 0.0, 1.0)).rgb;
}

void main() {
  float mask = roundedMask(vPx, uRect, uRadii);
  vec2 inClip = step(uClip.xy, vPx) * step(vPx, uClip.zw);
  mask *= inClip.x * inClip.y;
  if (mask <= 0.0) discard;

  vec2 shift = vec2(uRgb, 0.0);
  vec3 col = uRgb > 1e-5
    ? vec3(sampleMap(vLocal + shift).r, sampleMap(vLocal).g, sampleMap(vLocal - shift).b)
    : sampleMap(vLocal);

  float alpha = 1.0;
  if (uReveal < 1.0) {
    float aspect = uRect.z / max(1.0, uRect.w);
    float n = snoise(vec3(vLocal.x * 3.0 * aspect, vLocal.y * 3.0, uSeed)) * 0.5 + 0.5;
    float edge = vLocal.y * 0.65 + n * 0.35;
    float t = uReveal * 1.25 - 0.12;
    alpha = smoothstep(edge, edge + 0.1, t);
    col += vec3(0.9, 0.95, 1.0) * (alpha * (1.0 - alpha)) * 0.8;
  }

  outColor = vec4(col, mask * alpha * uOpacity);
}
`;
