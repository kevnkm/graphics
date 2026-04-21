/**
 * Fire2D.jsx — Procedural turbulent fire fragment shader.
 * Uses the shared useWebGL hook; zero boilerplate.
 */
import { useWebGL } from "../../utils/webgl";

const FIRE_FS = `
precision mediump float;
uniform vec2  u_resolution;
uniform float u_time;
uniform vec2  u_mouse;

// ── Noise ──────────────────────────────────────────────────────────
float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }

float valueNoise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i),           hash(i + vec2(1,0)), u.x),
             mix(hash(i + vec2(0,1)), hash(i + vec2(1,1)), u.x), u.y);
}

// 4-octave FBM with domain-warping for turbulent look
float fbm(vec2 p) {
  float v = 0.0, a = 0.5;
  // Domain warp pass
  vec2 warp = vec2(valueNoise(p + vec2(0.0, u_time * 0.3)),
                   valueNoise(p + vec2(5.2, u_time * 0.2))) * 0.4;
  p += warp;
  for (int i = 0; i < 4; i++) {
    v += a * valueNoise(p);
    p = p * 2.0 + vec2(3.1, 1.7);
    a *= 0.5;
  }
  return v;
}

void main() {
  vec2 uv = gl_FragCoord.xy / u_resolution.xy;

  // Mouse nudge (horizontal push towards mouse)
  float mx = u_mouse.x * 0.5 + 0.5;
  uv.x += (mx - uv.x) * 0.08 * smoothstep(0.0, 0.4, 1.0 - uv.y);

  vec2 p = uv * vec2(3.0, 4.0);
  p.y -= u_time * 1.8;          // scroll upward

  float n = fbm(p);

  // Shape: strong at bottom, fade to nothing at top
  float base = smoothstep(1.0, 0.0, uv.y) * 1.3;
  // Narrow flame towards top
  float shape = 1.0 - abs(uv.x - 0.5) * 2.0;
  shape = pow(max(shape, 0.0), 0.5 + uv.y * 2.0);

  float flame = smoothstep(0.1, 0.9, n * base * shape);

  // Color ramp: black → deep red → orange → yellow → white
  vec3 col = vec3(0.0);
  col = mix(col,       vec3(0.7, 0.0, 0.0),  smoothstep(0.0,  0.25, flame));
  col = mix(col,       vec3(1.0, 0.35, 0.0), smoothstep(0.25, 0.55, flame));
  col = mix(col,       vec3(1.0, 0.8,  0.0), smoothstep(0.55, 0.78, flame));
  col = mix(col,       vec3(1.0, 1.0,  0.9), smoothstep(0.78, 1.0,  flame));

  // Subtle emissive glow bloom (additive rim)
  float glow = pow(flame, 3.0) * 0.4;
  col += vec3(1.0, 0.5, 0.1) * glow;

  gl_FragColor = vec4(col, 1.0);
}
`;

export function Fire2D() {
  const canvasRef = useWebGL(FIRE_FS);
  return <canvas ref={canvasRef} style={{ width: "100%", display: "block" }} />;
}
