import { utilChunk } from "./common";

/**
 * Background pass: one fullscreen triangle, every frame.
 *
 * Hero layer (uHero → 1 on the homepage hero):
 *   - stills: covers A/B crossfaded by uSourceMix, object-fit: cover + Ken Burns per slot,
 *     graded like the DOM fallback (saturate .55, contrast 1.12, brightness .5, teal →
 *     accent split tone, top/bottom falloff).
 *   - video: same path; the slots hold a VideoTexture (P7).
 *   - generative: when no source is ready (uHasSource 0), a brighter version of the field.
 * Ambient layer: the low-intensity field tinted by uTint (accent of the reel in view).
 *
 * Shared: field-warp + trail displacement on the source UVs, click ripple, per-channel
 * RGB offset scaled by pointer speed + pulse, pulse scanline + hue kick, vignette, grain.
 * uProgress (hero scroll-out): zoom 1 → 0.92, darken, noise-threshold dissolve with a
 * faint ember burn edge into the ambient layer.
 */
export const backgroundFrag = /* glsl */ `
precision highp float;
in vec2 vUv;
out vec4 fragColor;

uniform vec2 uResolution;
uniform float uTime;
uniform sampler2D uField;
uniform sampler2D uTrail;
uniform float uTrailOn;

uniform sampler2D uSourceA;
uniform sampler2D uSourceB;
uniform vec2 uResA;
uniform vec2 uResB;
uniform float uSourceMix;
uniform float uKbA;
uniform float uKbB;
uniform float uHasSource;
uniform float uHero;

uniform float uDisplacement;
uniform float uAberration;
uniform float uHueShift;
uniform float uClickPulse;
uniform vec2 uClickPos;
uniform float uScanline;
uniform float uVignette;
uniform float uGrain;
uniform float uProgress;
uniform vec3 uTint;
uniform vec3 uHeroTint;
uniform float uAmbient;
uniform vec2 uMouse;
uniform vec2 uMouseVel;
uniform float uScrollVel;

const vec3 INK = vec3(0.027, 0.031, 0.043);
const vec3 TIDE = vec3(0.247, 0.788, 0.745);
const vec3 EMBER = vec3(1.0, 0.357, 0.18);

${utilChunk}

// The DOM grade: filter brightness(.5) contrast(1.12) saturate(.55), then a 100deg
// tide → accent split tone. Highlights lean to the accent, shadows to tide.
vec3 gradeStill(vec3 c, vec2 uv) {
  float l = luma(c);
  c = mix(vec3(l), c, 0.55);
  c = (c - 0.5) * 1.12 + 0.5;
  c = clamp(c, 0.0, 1.0) * 0.5;
  // Highlight roll-off: white UI screenshots settle into a dim projected grey, not a slab.
  c = mix(c, c * 0.74, smoothstep(0.22, 0.5, luma(c)));
  float x = uv.x + (1.0 - uv.y) * 0.18;
  c = mix(c, TIDE * 0.55, 0.2 * (1.0 - smoothstep(0.0, 0.5, x)));
  c = mix(c, uHeroTint * 0.7, 0.2 * smoothstep(0.5, 1.05, x));
  float l2 = luma(c);
  c += TIDE * 0.035 * (1.0 - smoothstep(0.0, 0.18, l2));
  c += uHeroTint * 0.05 * smoothstep(0.22, 0.5, l2);
  return c;
}

// Top/bottom falloff toward ink (header + wordmark legibility). Matches the DOM stops.
float falloff(float yTop) {
  float a = mix(0.72, 0.06, smoothstep(0.0, 0.26, yTop));
  a = mix(a, 0.16, smoothstep(0.26, 0.5, yTop));
  a = mix(a, 0.95, smoothstep(0.5, 0.86, yTop));
  a = mix(a, 1.0, smoothstep(0.88, 1.0, yTop));
  return a;
}

// Smoke from the field: broad deep-tide clouds, soft tinted light where they thicken.
vec3 smoke(vec4 f, vec3 tint, float intensity) {
  vec2 w = f.gb * 2.0 - 1.0;
  float body = smoothstep(0.4, 0.92, f.r);
  float core = smoothstep(0.6, 1.0, f.r) * (0.55 + 0.45 * w.y);
  vec3 deep = mix(vec3(0.07, 0.16, 0.19), vec3(0.06, 0.08, 0.15), 0.5 + 0.5 * w.x);
  vec3 c = INK + deep * 0.55 * body;
  c += tint * 0.12 * core;
  c += tint * 0.035 * f.a * body;
  return mix(INK, c, intensity);
}

vec3 sampleSource(sampler2D tex, vec2 res, float kb, vec2 uv, vec2 dir, float ab, float zoom) {
  float scale = mix(1.08, 1.2, kb) * zoom;
  vec2 drift = vec2(0.016, -0.024) * kb;
  vec2 origin = vec2(0.6, 0.6);
  vec3 c;
  c.r = texture(tex, coverUv(uv + dir * ab, uResolution, res, scale, origin, drift)).r;
  c.g = texture(tex, coverUv(uv, uResolution, res, scale, origin, drift)).g;
  c.b = texture(tex, coverUv(uv - dir * ab, uResolution, res, scale, origin, drift)).b;
  return c;
}

void main() {
  vec2 uv = vUv;
  float aspect = uResolution.x / max(uResolution.y, 1.0);
  vec4 field = texture(uField, uv);
  vec3 tr = uTrailOn > 0.5 ? texture(uTrail, uv).xyz : vec3(0.0);
  float prog = clamp(uProgress, 0.0, 1.0);

  // ---- displacement ----
  vec2 warp = field.gb * 2.0 - 1.0;
  vec2 disp = warp * uDisplacement;
  disp += clamp(tr.xy, vec2(-1.5), vec2(1.5)) * 0.006;
  disp.y += uScrollVel * 0.004 * warp.x;

  vec2 dp = uv - uClickPos;
  dp.x *= aspect;
  float dist = length(dp);
  float ring = sin(dist * 34.0 - uClickPulse * 12.0) * exp(-dist * 3.0) * uClickPulse;
  disp += (dp / max(dist, 1e-4)) * vec2(1.0 / aspect, 1.0) * ring * 0.01;

  // ---- RGB offset: lens-radial, scaled by pointer speed, trail and pulse ----
  vec2 dir = uv - 0.5;
  dir = dir / max(length(dir), 1e-3);
  float speed = min(length(uMouseVel), 3.0);
  float ab = uAberration * (0.0008 + speed * 0.0016 + length(tr.xy) * 0.003 + uClickPulse * 0.006);

  // ---- hero layer (uniform branches: skipped entirely in ambient, one slot when settled) ----
  float zoom = mix(1.0, 0.92, prog);
  vec3 hero = INK;
  if (uHero > 0.002) {
    vec2 suv = uv + disp;
    vec3 src = vec3(0.0);
    if (uHasSource > 0.002) {
      if (uSourceMix < 0.999) src = sampleSource(uSourceA, uResA, uKbA, suv, dir, ab, zoom) * (1.0 - uSourceMix);
      if (uSourceMix > 0.001) src += sampleSource(uSourceB, uResB, uKbB, suv, dir, ab, zoom) * uSourceMix;
    }
    vec3 img = gradeStill(src, uv);
    vec3 gen = vec3(0.0);
    if (uHasSource < 0.998) {
      vec4 heroField = texture(uField, (uv - 0.5) * zoom + 0.5 + disp * 2.0);
      gen = smoke(heroField, uHeroTint, 1.0) * 1.35;
    }
    hero = mix(gen, img, uHasSource);
    hero += uHeroTint * tr.z * 0.03;
    hero = mix(hero, INK, falloff(1.0 - uv.y));
    hero *= 1.0 - 0.5 * prog;
  }

  // ---- ambient layer ----
  vec3 amb = smoke(field, uTint, uAmbient);
  amb += uTint * tr.z * 0.02 * uAmbient;

  // ---- scroll-out dissolve ----
  float n = field.r * 0.7 + field.a * 0.3;
  float th = prog * 1.2 - 0.12;
  float keep = 1.0 - smoothstep(n - 0.06, n + 0.06, th);
  float edge = (1.0 - smoothstep(0.0, 0.05, abs(n - th))) * step(0.001, prog) * (1.0 - prog);
  float h = uHero * keep;
  vec3 col = mix(amb, hero, h);
  col += EMBER * edge * 0.12 * uHero;

  // ---- pulse: hue kick + scanline ----
  col = hueRotate(col, uHueShift + uClickPulse * 0.22);
  float scan = 0.5 + 0.5 * sin(uv.y * 90.0 + uTime * 18.0);
  col *= 1.0 - uScanline * uClickPulse * scan * 0.2;
  col += uHeroTint * uClickPulse * 0.025 * exp(-dist * 2.5);

  // ---- vignette + grain ----
  vec2 vv = (uv - 0.5) * vec2(aspect * 0.75, 1.0);
  float vig = smoothstep(1.05, 0.25, length(vv));
  col *= mix(1.0, vig, uVignette);
  float g = hash12(gl_FragCoord.xy + fract(uTime * 7.31) * 913.0) - 0.5;
  col += g * uGrain;

  fragColor = vec4(max(col, 0.0), 1.0);
}
`;
