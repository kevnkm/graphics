/**
 * ShaderFXCanvas.jsx — Stylized shader demos (cel-shading, pencil sketch).
 * Currently not shown in the UI (commented out in ShaderFX.jsx page).
 * Uses the shared useWebGL hook.
 */
import { useWebGL } from "../../utils/webgl";

const CEL_FS = `
precision mediump float;
uniform vec2  u_resolution;
uniform float u_time;

float sdSphere(vec3 p) { return length(p) - 1.0; }
vec3 calcNormal(vec3 p) {
  const float h = 0.001;
  return normalize(vec3(sdSphere(p+vec3(h,0,0))-sdSphere(p-vec3(h,0,0)),
                        sdSphere(p+vec3(0,h,0))-sdSphere(p-vec3(0,h,0)),
                        sdSphere(p+vec3(0,0,h))-sdSphere(p-vec3(0,0,h))));
}

void main() {
  vec2 uv = (gl_FragCoord.xy - 0.5*u_resolution) / u_resolution.y;
  float a  = u_time * 0.3;
  vec3 ro  = vec3(sin(a)*3.5, 0.5, cos(a)*3.5);
  vec3 rd  = normalize(vec3(uv, 1.0) - ro * 0.1);

  float t = 0.0;
  for (int i = 0; i < 80; i++) {
    float d = sdSphere(ro + rd*t);
    t += d * 0.7;
    if (d < 0.001 || t > 10.0) break;
  }

  vec3 col = vec3(0.05, 0.05, 0.08);
  if (t < 10.0) {
    vec3 n = calcNormal(ro + rd*t);
    vec3 L = normalize(vec3(1, 2, 1));
    float diff = max(dot(n, L), 0.0);
    // Quantise to 4 bands (cel-shading)
    diff = floor(diff * 4.0) / 4.0;
    // Silhouette edge
    float edge = 1.0 - smoothstep(0.0, 0.35, dot(n, -rd));
    col = mix(vec3(0.9, 0.7, 0.3) * diff, vec3(0.0), step(0.4, edge));
  }
  gl_FragColor = vec4(col, 1.0);
}
`;

const SKETCH_FS = `
precision mediump float;
uniform vec2  u_resolution;
uniform float u_time;

float sdSphere(vec3 p) { return length(p) - 1.0; }

float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }

void main() {
  vec2 uv = (gl_FragCoord.xy - 0.5*u_resolution) / u_resolution.y;
  vec3 ro = vec3(0, 0, -3.5);
  vec3 rd = normalize(vec3(uv, 1.0));

  float t = 0.0;
  for (int i = 0; i < 80; i++) {
    float d = sdSphere(ro + rd*t);
    t += d * 0.7;
    if (d < 0.001 || t > 10.0) break;
  }

  float d0 = t < 10.0 ? t : 100.0;
  float shade = 1.0 - smoothstep(0.0, 8.0, d0);

  // Derivative-based edge (pencil outline)
  float gx = dFdx(shade), gy = dFdy(shade);
  float edge = smoothstep(0.02, 0.08, length(vec2(gx, gy)));

  // Paper grain
  vec2 paper = gl_FragCoord.xy / u_resolution;
  float grain = hash(paper) * 0.06;
  shade = clamp(shade + grain - 0.03, 0.0, 1.0);

  // Hatch lines (approximate cross-hatching)
  float h1 = smoothstep(0.48, 0.50, fract((paper.x - paper.y) * 20.0)) * (1.0 - shade);
  float h2 = smoothstep(0.48, 0.50, fract((paper.x + paper.y) * 20.0)) * (1.0 - shade) * 0.5;
  shade -= (h1 + h2) * 0.25;

  vec3 col = mix(vec3(0.97, 0.95, 0.90), vec3(0.08), clamp(1.0 - shade, 0.0, 1.0));
  col = mix(col, vec3(0.0), edge * 0.85);

  gl_FragColor = vec4(col, 1.0);
}
`;

export function F1() {
  const ref = useWebGL(CEL_FS);
  return <canvas ref={ref} style={{ width: "100%", display: "block" }} />;
}

export function F2() {
  const ref = useWebGL(SKETCH_FS);
  return <canvas ref={ref} style={{ width: "100%", display: "block" }} />;
}
