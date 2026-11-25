/**
 * Media plane in CSS-pixel space (y down). Local x/y in 0..1 cover the window plus a
 * vertical overscan, so the velocity bend never opens a gap at the window edges.
 */
export const planeVert = /* glsl */ `
precision highp float;
in vec3 position;
uniform vec2 uViewport;
uniform vec4 uRect;
uniform float uOverscan;
uniform float uBend;
out vec2 vPx;
out vec2 vLocal;
void main() {
  float x = uRect.x + position.x * uRect.z;
  float y = uRect.y - uOverscan + position.y * (uRect.w + 2.0 * uOverscan);
  vLocal = vec2(position.x, (y - uRect.y) / uRect.w);
  float c = position.x * 2.0 - 1.0;
  y += uBend * (1.0 - c * c);
  vPx = vec2(x, y);
  gl_Position = vec4(x / uViewport.x * 2.0 - 1.0, 1.0 - y / uViewport.y * 2.0, 0.0, 1.0);
}
`;
