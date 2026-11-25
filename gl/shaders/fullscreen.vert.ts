/** Fullscreen triangle: positions (-1,-1) (3,-1) (-1,3); no matrices, no index buffer. */
export const fullscreenVert = /* glsl */ `
precision highp float;
in vec3 position;
out vec2 vUv;
void main() {
  vUv = position.xy * 0.5 + 0.5;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`;
