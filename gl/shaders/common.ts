/**
 * Shared GLSL chunks.
 *
 * Simplex noise: Ashima / Stefan Gustavson 3D simplex, ported from the previous
 * portfolio (components/hero/shaders/noise.ts). fbm, hash, hue rotation and the
 * object-fit: cover helper are shared by the background and field passes.
 */
export const noiseChunk = /* glsl */ `
vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 permute(vec4 x) { return mod289(((x * 34.0) + 1.0) * x); }
vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }

float snoise(vec3 v) {
  const vec2 C = vec2(1.0 / 6.0, 1.0 / 3.0);
  const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);

  vec3 i  = floor(v + dot(v, C.yyy));
  vec3 x0 = v - i + dot(i, C.xxx);

  vec3 g = step(x0.yzx, x0.xyz);
  vec3 l = 1.0 - g;
  vec3 i1 = min(g.xyz, l.zxy);
  vec3 i2 = max(g.xyz, l.zxy);

  vec3 x1 = x0 - i1 + C.xxx;
  vec3 x2 = x0 - i2 + C.yyy;
  vec3 x3 = x0 - D.yyy;

  i = mod289(i);
  vec4 p = permute(permute(permute(
             i.z + vec4(0.0, i1.z, i2.z, 1.0))
           + i.y + vec4(0.0, i1.y, i2.y, 1.0))
           + i.x + vec4(0.0, i1.x, i2.x, 1.0));

  float n_ = 0.142857142857;
  vec3 ns = n_ * D.wyz - D.xzx;

  vec4 j = p - 49.0 * floor(p * ns.z * ns.z);

  vec4 x_ = floor(j * ns.z);
  vec4 y_ = floor(j - 7.0 * x_);

  vec4 x = x_ * ns.x + ns.yyyy;
  vec4 y = y_ * ns.x + ns.yyyy;
  vec4 h = 1.0 - abs(x) - abs(y);

  vec4 b0 = vec4(x.xy, y.xy);
  vec4 b1 = vec4(x.zw, y.zw);

  vec4 s0 = floor(b0) * 2.0 + 1.0;
  vec4 s1 = floor(b1) * 2.0 + 1.0;
  vec4 sh = -step(h, vec4(0.0));

  vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy;
  vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww;

  vec3 p0 = vec3(a0.xy, h.x);
  vec3 p1 = vec3(a0.zw, h.y);
  vec3 p2 = vec3(a1.xy, h.z);
  vec3 p3 = vec3(a1.zw, h.w);

  vec4 norm = taylorInvSqrt(vec4(dot(p0, p0), dot(p1, p1), dot(p2, p2), dot(p3, p3)));
  p0 *= norm.x;
  p1 *= norm.y;
  p2 *= norm.z;
  p3 *= norm.w;

  vec4 m = max(0.6 - vec4(dot(x0, x0), dot(x1, x1), dot(x2, x2), dot(x3, x3)), 0.0);
  m = m * m;
  return 42.0 * dot(m * m, vec4(dot(p0, x0), dot(p1, x1), dot(p2, x2), dot(p3, x3)));
}

float fbm3(vec3 p) {
  float a = 0.5;
  float s = 0.0;
  for (int i = 0; i < 3; i++) {
    s += a * snoise(p);
    p = p * 2.03 + vec3(17.1, 9.2, 3.7);
    a *= 0.5;
  }
  return s;
}

float fbm4(vec3 p) {
  float a = 0.5;
  float s = 0.0;
  for (int i = 0; i < 4; i++) {
    s += a * snoise(p);
    p = p * 2.01 + vec3(17.1, 9.2, 3.7);
    a *= 0.5;
  }
  return s;
}
`;

export const utilChunk = /* glsl */ `
float hash12(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

// Rodrigues rotation around the grey axis: a cheap, luminance-stable hue rotate.
vec3 hueRotate(vec3 c, float a) {
  const vec3 k = vec3(0.57735);
  float ca = cos(a);
  return c * ca + cross(k, c) * sin(a) + k * dot(k, c) * (1.0 - ca);
}

float luma(vec3 c) { return dot(c, vec3(0.2126, 0.7152, 0.0722)); }

// object-fit: cover; object-position: center top. uv.y = 1 is the top of the view and,
// with flipY textures, the top of the image. Then scale about origin (Ken Burns).
vec2 coverUv(vec2 uv, vec2 view, vec2 tex, float scale, vec2 origin, vec2 drift) {
  float rv = view.x / max(view.y, 1.0);
  float rt = tex.x / max(tex.y, 1.0);
  vec2 s = rv > rt ? vec2(1.0, rt / rv) : vec2(rv / rt, 1.0);
  vec2 o = vec2((1.0 - s.x) * 0.5, 1.0 - s.y);
  vec2 t = uv * s + o;
  vec2 org = origin * s + o;
  return (t - org) / scale + org + drift * s;
}
`;

/**
 * The "wave": a dark, noise-edged liquid front washing across an image. One look shared
 * by the card reveals (plane.frag) and the hero/reel slide change (background.frag).
 * Needs noiseChunk (snoise).
 *
 *   waveEdge(local, aspect, seed, time): x = where the front passes each point, 0 (first)
 *     → ~1 (last), sweeping top → bottom (local.y down) with a slowly churning noise
 *     edge; y = that noise (0..1), reused to bend the refraction.
 *   waveProgress(t): maps 0..1 progress to the front position so 0 is fully ahead and 1
 *     fully passed.
 *   waveTerms(d, time): d = front − edge (> 0: already washed). Returns
 *     x crest (bell at the front), y trailing ripple (decays behind it), z coverage (0 → 1).
 *   waveOffset(terms, n): uv push for refraction: mostly along the sweep, bent by the noise.
 */
export const waveChunk = /* glsl */ `
const float WAVE_W = 0.075;

vec2 waveEdge(vec2 local, float aspect, float seed, float time) {
  float n = snoise(vec3(local.x * 2.6 * aspect, local.y * 2.2 - time * 0.12, seed + time * 0.08)) * 0.5 + 0.5;
  return vec2(local.y * 0.62 + n * 0.38, n);
}

float waveProgress(float t) {
  return t * (1.0 + 4.0 * WAVE_W) - 2.0 * WAVE_W;
}

vec3 waveTerms(float d, float time) {
  float crest = exp(-(d * d) / (WAVE_W * WAVE_W));
  float behind = max(d, 0.0);
  float ripple = sin(behind * 46.0 - time * 4.0) * exp(-behind * 11.0) * step(0.0, d);
  float cover = smoothstep(-WAVE_W * 0.6, WAVE_W * 0.6, d);
  return vec3(crest, ripple, cover);
}

vec2 waveOffset(vec3 w, float n) {
  float push = w.x * 0.05 + w.y * 0.012;
  return vec2((n - 0.5) * 0.6, -1.0) * push;
}
`;
