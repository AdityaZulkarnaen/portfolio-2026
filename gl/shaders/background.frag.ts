import { noiseChunk, utilChunk, waveChunk } from "./common";

/**
 * Background pass: one fullscreen triangle, every frame.
 *
 * Hero layer (uHero → 1 on the homepage hero), "projection booth":
 *   - room: a generative volumetric smoke field (two parallax layers of the ¼-res
 *     domain-warped field, self-shadowed by a density gradient toward a top-right key
 *     light), ink → deep teal, a very faint ember lift from the current slide's accent,
 *     printed through a fine 45° halftone screen. The pointer trail pushes the domain.
 *   - reel window: a rounded rect (uWin, device px, y up) that is the only place project
 *     media appears. Covers change with the shared wave (waveChunk) under a slow push-in; fluid + trail
 *     distortion, a thin-film iridescent sheen, RGB split that grows toward the edge, and
 *     the click ripple. uWinReveal opens it vertically from the HUD line.
 *   - with no source ready, the window shows a brighter, iridescent cut of the smoke.
 * Ambient layer: the low-intensity field tinted by uTint (accent of the reel in view).
 *
 * Shared: click ripple, pulse scanline + hue kick, vignette, grain.
 * uProgress (hero scroll-out): smoke zoom 1 → 0.92, darken, noise-threshold dissolve
 * with a faint ember burn edge into the ambient layer.
 */
export const backgroundFrag = /* glsl */ `
precision highp float;
in vec2 vUv;
out vec4 fragColor;

uniform vec2 uResolution;
uniform float uDpr;
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

uniform vec4 uWin;
uniform float uWinRadius;
uniform float uWinReveal;
uniform float uWinOn;
uniform float uWinOpacity;
// 0 at the small reel window → 1 at fullscreen: the film effects calm down as it grows.
uniform float uWinGrow;

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
const vec3 TEAL_FAR = vec3(0.030, 0.070, 0.082);
const vec3 TEAL_MID = vec3(0.052, 0.138, 0.150);
const vec3 TEAL_LIT = vec3(0.110, 0.250, 0.255);

${utilChunk}
${noiseChunk}
${waveChunk}

// Ambient smoke from the field: broad deep-tide clouds, soft tinted light where they thicken.
vec3 smoke(vec4 f, vec3 tint, float intensity) {
  vec2 w = f.gb * 2.0 - 1.0;
  float body = smoothstep(0.4, 0.92, f.r);
  float core = smoothstep(0.6, 1.0, f.r) * (0.55 + 0.45 * w.y);
  vec3 deep = mix(vec3(0.07, 0.16, 0.19), vec3(0.06, 0.08, 0.15), 0.5 + 0.5 * w.x);
  vec3 c = INK + deep * 0.55 * body;
  c += tint * 0.12 * core;
  c += tint * 0.035 * f.a * body;
  c += tint * 0.05 * (0.2 + 0.8 * body);
  return mix(INK, c, intensity);
}

// 45° halftone screen in device px. Returns 0..1 ink coverage for a tone.
float halftone(float tone) {
  float cell = 3.0 * max(uDpr, 0.75);
  vec2 p = gl_FragCoord.xy / cell;
  p = mat2(0.7071, -0.7071, 0.7071, 0.7071) * p;
  vec2 c = fract(p) - 0.5;
  float r = sqrt(clamp(tone, 0.0, 1.0)) * 0.62;
  return 1.0 - smoothstep(r - 0.14, r + 0.14, length(c));
}

// The booth: layered, self-shadowed smoke. Returns colour and (in .w) density for the dissolve.
// The field is sampled zoomed in (×0.6) so the room reads as large soft clouds rather than
// the finer ambient texture; a far layer at ×0.32 drifts the other way for depth.
vec4 roomSmoke(vec2 uv, float zoom, vec2 push) {
  vec2 suv = (uv - 0.5) * zoom * 0.6 + 0.5 + push;
  vec4 a = texture(uField, suv);
  vec4 b = texture(uField, (uv - 0.5) * zoom * 0.32 + vec2(0.5) + vec2(-uTime * 0.0035, uTime * 0.0021) + push * 0.5);
  // Key light from the top right: density falling toward the light = lit face.
  vec4 a2 = texture(uField, suv + vec2(0.022, 0.03));
  float lit = clamp((a.r - a2.r) * 3.2, -1.0, 1.0);

  float far = smoothstep(0.3, 0.95, b.r);
  float dens = smoothstep(0.34, 1.0, a.r);
  dens *= dens * (3.0 - 2.0 * dens);
  float core = smoothstep(0.72, 1.0, a.r);

  vec3 c = mix(INK, TEAL_FAR, far);
  c = mix(c, TEAL_MID, dens * 0.85);
  c += TEAL_LIT * dens * max(lit, 0.0) * 0.5;
  c *= 1.0 - 0.22 * dens * max(-lit, 0.0);
  c += TEAL_LIT * a.a * dens * 0.035;
  c += uHeroTint * 0.02 * core * (0.6 + 0.4 * max(lit, 0.0));

  // Keep the top band (header) and the lower-left (type) a touch deeper.
  float y = uv.y;
  c = mix(c, INK, 0.38 * smoothstep(0.82, 1.0, y));
  c = mix(c, INK, 0.22 * smoothstep(0.55, 0.0, y) * smoothstep(0.65, 0.0, uv.x));

  // Halftone print: modulates the lit smoke only, never the shadows (no screen in the ink).
  float tone = luma(c) * 5.5;
  float ht = halftone(tone);
  c *= mix(1.0, 0.82 + 0.36 * ht, 0.5 * smoothstep(0.04, 0.4, tone));
  return vec4(c, a.r * 0.7 + b.r * 0.3);
}

float sdRoundBox(vec2 p, vec2 b, float r) {
  vec2 q = abs(p) - b + r;
  return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r;
}

vec3 sampleWin(sampler2D tex, vec2 res, float kb, vec2 wuv, vec2 dir, float ab) {
  float scale = mix(1.04, 1.13, kb);
  vec2 drift = vec2(0.012, -0.018) * kb;
  vec2 origin = vec2(0.55, 0.7);
  vec3 c;
  c.r = texture(tex, coverUv(wuv + dir * ab, uWin.zw, res, scale, origin, drift)).r;
  c.g = texture(tex, coverUv(wuv, uWin.zw, res, scale, origin, drift)).g;
  c.b = texture(tex, coverUv(wuv - dir * ab, uWin.zw, res, scale, origin, drift)).b;
  return c;
}

vec3 film(float t) {
  return 0.5 + 0.5 * cos(6.28318 * (t + vec3(0.0, 0.33, 0.67)));
}

vec3 windowContent(vec2 wuv, vec2 warp, vec3 tr, vec2 ripple, float edgeDist, vec2 suv) {
  // edge: 1 at the frame, 0 from ~32 css px inward.
  float edge = 1.0 - smoothstep(0.0, 32.0 * uDpr, edgeDist);
  // Effect strength: full in the small window, a trace at fullscreen (reads as film).
  float fx = 1.0 - 0.88 * uWinGrow;
  vec2 q = wuv + (warp * 0.010 + clamp(tr.xy, vec2(-1.5), vec2(1.5)) * 0.012) * fx + ripple * 1.6;
  q += warp * 0.012 * edge * fx;
  vec2 dir = wuv - 0.5;
  dir = dir / max(length(dir), 1e-3);
  float speed = min(length(uMouseVel), 3.0);
  float ab = uAberration * ((0.0012 + edge * 0.0055 + speed * 0.0012 + length(tr.xy) * 0.003) * fx + uClickPulse * 0.008);

  vec3 c = vec3(0.0);
  if (uHasSource > 0.002) {
    if (uSourceMix >= 0.999) c = sampleWin(uSourceB, uResB, uKbB, q, dir, ab);
    else if (uSourceMix <= 0.001) c = sampleWin(uSourceA, uResA, uKbA, q, dir, ab);
    else {
      // Slide change: the shared wave sweeps down the frame, the old cover out ahead of
      // it, the new one behind, refracting and darkening at the front (cards use it too).
      vec2 local = vec2(wuv.x, 1.0 - wuv.y);
      vec2 e = waveEdge(local, uWin.z / max(uWin.w, 1.0), 7.3, uTime);
      vec3 w = waveTerms(waveProgress(uSourceMix) - e.x, uTime);
      vec2 off = waveOffset(w, e.y);
      vec2 qw = q + vec2(off.x, -off.y);
      float abw = ab + w.x * 0.009 + abs(w.y) * 0.002;
      vec3 ca = sampleWin(uSourceA, uResA, uKbA, qw, dir, abw);
      vec3 cb = sampleWin(uSourceB, uResB, uKbB, qw, dir, abw);
      c = mix(ca, cb, w.z) * (1.0 - w.x * 0.65);
    }
    float l = luma(c);
    c = mix(vec3(l), c, 0.8);
    // White UI screenshots settle into a projected grey, not a light box.
    c = mix(c, c * 0.78, smoothstep(0.45, 0.95, l));
    c *= 0.9;
  }
  vec3 gen = vec3(0.0);
  if (uHasSource < 0.998) {
    vec4 f = texture(uField, suv * 1.4);
    gen = mix(TEAL_FAR, TEAL_LIT * 1.6, smoothstep(0.35, 0.95, f.r)) + uHeroTint * 0.05 * f.a;
  }
  c = mix(gen, c, uHasSource);

  // Thin-film sheen: hue walks with tone, the fluid warp, edge and time.
  float l = luma(c);
  vec3 sheen = film(l * 1.8 + warp.x * 0.7 + warp.y * 0.4 + edge * 0.5 + uTime * 0.035);
  // Mostly at the frame; a light wash across bright covers so white UIs stay readable.
  c = mix(c, c * (0.5 + sheen), (0.1 + 0.32 * edge) * fx);
  c += sheen * TIDE * 0.035 * edge * fx;
  c += uHeroTint * tr.z * 0.04;
  // Lens falloff inside the frame.
  c *= mix(mix(0.72, 0.9, uWinGrow), 1.0, smoothstep(0.0, 70.0 * uDpr, edgeDist));
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
  vec2 ripple = (dp / max(dist, 1e-4)) * vec2(1.0 / aspect, 1.0) * ring * 0.01;
  disp += ripple;

  // ---- hero layer (uniform branch: skipped entirely in ambient) ----
  float zoom = mix(1.0, 0.92, prog);
  vec3 hero = INK;
  float heroN = field.r;
  if (uHero > 0.002) {
    vec4 room = roomSmoke(uv, zoom, disp * 2.0);
    hero = room.rgb;
    heroN = room.w;
    hero += uHeroTint * tr.z * 0.02;
    hero *= 1.0 - 0.5 * prog;
  }

  // ---- ambient layer ----
  vec3 amb = smoke(field, uTint, uAmbient);
  amb += uTint * tr.z * 0.02 * uAmbient;

  // ---- scroll-out dissolve ----
  float n = heroN;
  float th = prog * 1.2 - 0.12;
  float keep = 1.0 - smoothstep(n - 0.06, n + 0.06, th);
  float edge = (1.0 - smoothstep(0.0, 0.05, abs(n - th))) * step(0.001, prog) * (1.0 - prog);
  float h = uHero * keep;
  vec3 col = mix(amb, hero, h);
  col += EMBER * edge * 0.1 * uHero;

  // ---- reel window: over the dissolve, so the frame survives the scroll-out (home
  // sequence: it zooms to fullscreen, then out into the lead card, then fades) ----
  if (uHero > 0.002 && uWinOn > 0.5 && uWinOpacity > 0.001) {
    vec2 fc = gl_FragCoord.xy;
    vec2 hs = uWin.zw * 0.5;
    vec2 c = uWin.xy + hs;
    vec2 hsr = vec2(hs.x, hs.y * clamp(uWinReveal, 0.0, 1.0));
    float d = sdRoundBox(fc - c, hsr, min(uWinRadius, hsr.y));
    float m = (1.0 - smoothstep(-0.8, 0.8, d)) * uWinOpacity * uHero;
    if (m > 0.001) {
      vec2 wuv = (fc - uWin.xy) / max(uWin.zw, vec2(1.0));
      vec3 win = windowContent(wuv, warp, tr, ripple, -d, uv);
      col = mix(col, win, m);
    }
  }

  // ---- pulse: hue kick + scanline ----
  col = hueRotate(col, uHueShift + uClickPulse * 0.22);
  float scan = 0.5 + 0.5 * sin(uv.y * 90.0 + uTime * 18.0);
  col *= 1.0 - uScanline * uClickPulse * scan * 0.2;

  // ---- vignette + grain ----
  vec2 vv = (uv - 0.5) * vec2(aspect * 0.75, 1.0);
  float vig = smoothstep(1.05, 0.25, length(vv));
  col *= mix(1.0, vig, uVignette);
  float g = hash12(gl_FragCoord.xy + fract(uTime * 7.31) * 913.0) - 0.5;
  col += g * uGrain;

  fragColor = vec4(max(col, 0.0), 1.0);
}
`;
