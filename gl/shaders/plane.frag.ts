import { noiseChunk, waveChunk } from "./common";

/**
 * Media plane: object-fit cover via an affine uv map computed on the CPU (uUvA + local·uUvB,
 * matching the DOM image box and its transform), clipped to the window's rounded rect and
 * the frame's clip-path inset. Hover RGB split.
 *
 * Reveal (scroll- or page-driven, reverses when scrolling back): the shared wave washes
 * down the picture like a print developing. Ahead of it the plane is see-through;
 * at its front the image refracts, darkens and splits RGB on the crest, a ripple trails
 * behind, and once the front has passed the image is clean.
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
uniform float uTime;
uniform vec4 uToneA; // grayscale, sepia, contrast, brightness (identity: 0, 0, 1, 1)
uniform vec4 uToneB; // the same on hover
uniform float uHover;
uniform vec3 uFade;  // axis (0 none, 1 x, 2 y), opaque until, transparent at
uniform vec3 uBg;    // shown through transparent texels and the contain letterbox
out vec4 outColor;

${noiseChunk}
${waveChunk}

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
  vec4 t = texture(uMap, clamp(vec2(uv.x, 1.0 - uv.y), 0.0, 1.0));
  // Outside the texture (contain letterbox) or transparent texels: the window background.
  vec2 inside = step(0.0, uv) * step(uv, vec2(1.0));
  return mix(uBg, t.rgb, t.a * inside.x * inside.y);
}

vec3 grade(vec3 c, vec4 t) {
  float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
  c = mix(c, vec3(l), t.x);
  vec3 sep = vec3(dot(c, vec3(0.393, 0.769, 0.189)), dot(c, vec3(0.349, 0.686, 0.168)), dot(c, vec3(0.272, 0.534, 0.131)));
  c = mix(c, min(sep, vec3(1.0)), t.y);
  c = (c - 0.5) * t.z + 0.5;
  return clamp(c * t.w, 0.0, 1.0);
}

void main() {
  float mask = roundedMask(vPx, uRect, uRadii);
  vec2 inClip = step(uClip.xy, vPx) * step(vPx, uClip.zw);
  mask *= inClip.x * inClip.y;
  if (mask <= 0.0) discard;

  vec2 local = vLocal;
  float split = uRgb;
  float alpha = 1.0;
  vec3 w = vec3(0.0, 0.0, 1.0);
  if (uReveal < 0.999) {
    float aspect = uRect.z / max(1.0, uRect.w);
    vec2 e = waveEdge(vLocal, aspect, uSeed, uTime);
    w = waveTerms(waveProgress(uReveal) - e.x, uTime);
    local += waveOffset(w, e.y);
    split += w.x * 0.009 + abs(w.y) * 0.002;
    alpha = w.z;
  }

  vec2 shift = vec2(split, 0.0);
  vec3 col = split > 1e-5
    ? vec3(sampleMap(local + shift).r, sampleMap(local).g, sampleMap(local - shift).b)
    : sampleMap(local);
  col = grade(col, mix(uToneA, uToneB, uHover));

  // Dark crest, a thin cold glint riding its leading edge.
  col *= 1.0 - w.x * 0.6;
  col += vec3(0.85, 0.95, 1.0) * w.x * (1.0 - w.z) * 0.35;

  // Ahead of the wave nothing is there yet (see-through); the front itself carries a thin
  // dark-ink fringe, so the wave still reads as a dark front washing the picture in.
  col = mix(vec3(0.047, 0.055, 0.071), col, alpha);
  float fade = 1.0;
  if (uFade.x > 0.5) {
    float t = uFade.x < 1.5 ? vLocal.x : vLocal.y;
    fade = 1.0 - clamp((t - uFade.y) / max(1e-3, uFade.z - uFade.y), 0.0, 1.0);
  }
  outColor = vec4(col, mask * uOpacity * fade * smoothstep(0.0, 0.35, alpha));
}
`;
