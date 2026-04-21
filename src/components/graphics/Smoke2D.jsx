/**
 * Smoke2D.jsx — Curl-noise smoke simulation fragment shader.
 * Uses the shared useWebGL hook; zero boilerplate.
 */
import { useWebGL } from "../../utils/webgl";

const SMOKE_FS = `
precision mediump float;
uniform vec2  u_resolution;
uniform float u_time;

// ── Value noise ────────────────────────────────────────────────────
float hash(vec3 p) { return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453); }

float noise3(vec3 p) {
  vec3 i = floor(p), f = fract(p);
  vec3 u = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(mix(hash(i),             hash(i + vec3(1,0,0)), u.x),
        mix(hash(i + vec3(0,1,0)), hash(i + vec3(1,1,0)), u.x), u.y),
    mix(mix(hash(i + vec3(0,0,1)), hash(i + vec3(1,0,1)), u.x),
        mix(hash(i + vec3(0,1,1)), hash(i + vec3(1,1,1)), u.x), u.y), u.z);
}

// 5-octave FBM in 3D (time is the z-axis → natural animation)
float fbm(vec3 p) {
  float v = 0.0, a = 0.5;
  for (int i = 0; i < 5; i++) {
    v += a * noise3(p);
    p = p * 2.02 + vec3(1.7, 9.2, 3.1);
    a *= 0.5;
  }
  return v;
}

// Approximate curl to give rotational, swirling motion
vec2 curl(vec2 p, float t) {
  float eps = 0.01;
  float dx = fbm(vec3(p + vec2(eps, 0), t)) - fbm(vec3(p - vec2(eps, 0), t));
  float dy = fbm(vec3(p + vec2(0, eps), t)) - fbm(vec3(p - vec2(0, eps), t));
  return vec2(dy, -dx) / (2.0 * eps);
}

void main() {
  vec2 uv = gl_FragCoord.xy / u_resolution.xy;
  float t = u_time * 0.25;

  // Advect sampling position by curl field
  vec2 p = uv * 3.5;
  p += curl(p, t) * 0.4;
  p += curl(p * 2.0, t * 1.8) * 0.15;

  float n = fbm(vec3(p, t));
  n = smoothstep(0.30, 0.72, n);

  // Gradient: warm dark background → cool blue-grey smoke
  vec3 background = vec3(0.04, 0.04, 0.06);
  vec3 smokeLight  = vec3(0.75, 0.80, 0.90);
  vec3 smokeDark   = vec3(0.30, 0.32, 0.38);

  vec3 col = mix(background, smokeDark, n);
  col = mix(col, smokeLight, pow(n, 2.5));

  // Subtle edge shimmer
  float shimmer = 0.03 * sin(n * 20.0 + u_time * 2.0);
  col += shimmer;

  gl_FragColor = vec4(col, 1.0);
}
`;

export function Smoke2D() {
  const canvasRef = useWebGL(SMOKE_FS);
  return <canvas ref={canvasRef} style={{ width: "100%", display: "block" }} />;
}
