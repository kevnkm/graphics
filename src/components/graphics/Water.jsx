/**
 * Water.jsx — Stylized water surface with FBM waves, refraction & Fresnel.
 * Uses the shared useWebGL hook; zero boilerplate.
 */
import { useWebGL } from "../../utils/webgl";

const WATER_FS = `
precision highp float;
uniform vec2  u_resolution;
uniform float u_time;
uniform vec2  u_mouse;
uniform vec2  u_click_pos[5];
uniform float u_click_time[5];

// ── Noise ──────────────────────────────────────────────────────────
vec2 hash2(vec2 p) {
  return fract(sin(vec2(dot(p, vec2(127.1, 311.7)),
                        dot(p, vec2(269.5, 183.3)))) * 43758.5453);
}

float perlin(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  vec2 a = hash2(i),           b = hash2(i + vec2(1,0));
  vec2 c = hash2(i + vec2(0,1)), d = hash2(i + vec2(1,1));
  return mix(mix(dot(a*2.-1., f),          dot(b*2.-1., f-vec2(1,0)), u.x),
             mix(dot(c*2.-1., f-vec2(0,1)), dot(d*2.-1., f-vec2(1,1)), u.x), u.y) * .5 + .5;
}

float fbm(vec2 p) {
  float v = 0.0, a = 0.5;
  for (int i = 0; i < 6; i++) { v += a * perlin(p); p *= 2.03; a *= 0.5; }
  return v;
}

// ── Click ripples ──────────────────────────────────────────────────
float rippleHeight(vec2 p) {
  float r = 0.0;
  for (int i = 0; i < 5; i++) {
    if (u_click_time[i] < 0.0) continue;
    float dt  = u_time - u_click_time[i];
    vec2  cp  = (u_click_pos[i] + 1.0) * 0.5 * vec2(u_resolution.x / u_resolution.y, 1.0) * 5.0;
    float d   = distance(p, cp);
    if (d > 3.5) continue;
    float env = (1.0 - exp(-dt * 1.5)) * exp(-dt * 0.35);
    r += sin(d * 18.0 - dt * 6.0) * exp(-d * 2.5) * env * 0.06;
  }
  return r;
}

// ── Water height field ─────────────────────────────────────────────
float H(vec2 p) {
  // Mouse tilt: subtle parallax
  vec2 tilt = u_mouse * 0.06;
  float waves =  0.05 * sin(p.x * 2.1 + u_time * 1.1 + tilt.x)
              +  0.03 * sin(p.y * 3.3 + p.x * 1.4 + u_time * 0.85 + tilt.y)
              +  0.02 * sin((p.x + p.y) * 4.0 + u_time * 1.4);
  float detail = fbm(p * 1.8 + vec2(u_time * 0.12, u_time * 0.07)) * 0.07 - 0.035;
  return waves + detail + rippleHeight(p);
}

// ── Sandy bottom texture ───────────────────────────────────────────
vec3 sandColor(vec2 p) {
  float n = fbm(p * 2.5 + 18.3);
  return mix(vec3(0.74, 0.68, 0.48), vec3(0.93, 0.85, 0.63), n);
}

void main() {
  vec2 uv    = gl_FragCoord.xy / u_resolution.xy;
  float asp  = u_resolution.x / u_resolution.y;
  uv.x      *= asp;
  float sc   = 5.0;
  vec2 p     = uv * sc;

  float h    = H(p);
  float eps  = 0.003;
  float dx   = H(p + vec2(eps, 0)) - H(p - vec2(eps, 0));
  float dy   = H(p + vec2(0, eps)) - H(p - vec2(0, eps));
  vec3 nrm   = normalize(vec3(dx / (2.*eps) * 0.6, dy / (2.*eps) * 0.6, 1.0));

  // Refraction offset → sample sandy bottom through water
  vec2 refOff = nrm.xy * (0.08 + h * 0.5);
  vec3 bottom  = sandColor(p + refOff);

  // Depth-based water tint (absorption)
  vec3 waterTint = vec3(0.02, 0.22, 0.55);
  float depth    = clamp(0.45 + abs(h) * 4.0, 0.0, 1.0);
  vec3 absorbed  = mix(bottom, waterTint, depth * 0.7);

  // Directional lighting
  vec3 L   = normalize(vec3(0.6, 0.8, 1.0));
  vec3 V   = vec3(0, 0, 1);
  vec3 H2  = normalize(L + V);
  float df = max(dot(nrm, L), 0.0) * 0.7 + 0.3;
  float sp = pow(max(dot(nrm, H2), 0.0), 160.0) * 1.8; // tight glint

  vec3 col = absorbed * df + vec3(1.0, 0.97, 0.9) * sp;

  // Foam on crests (approx. curvature)
  float dxx = H(p+vec2(eps*2.,0.)) + H(p-vec2(eps*2.,0.)) - 2.*h;
  float dyy = H(p+vec2(0.,eps*2.)) + H(p-vec2(0.,eps*2.)) - 2.*h;
  float curv = (dxx + dyy) * -8.0;
  float foam = smoothstep(0.15, 0.45, curv) * smoothstep(0.04, 0.1, abs(h));
  col = mix(col, vec3(1.0), foam * 0.75);

  // Fresnel sky reflection
  float fr  = pow(1.0 - max(dot(nrm, V), 0.0), 4.0);
  vec3 sky  = vec3(0.45, 0.65, 1.0);
  col = mix(col, sky, fr * 0.45);

  // Subtle vignette
  vec2 q = uv / vec2(asp, 1.0) * 2.0 - 1.0;
  col *= 1.0 - 0.15 * dot(q, q);

  gl_FragColor = vec4(col, 1.0);
}
`;

export function WaterTexture() {
  const canvasRef = useWebGL(WATER_FS);
  return (
    <div style={{ width: "100%", position: "relative" }}>
      <canvas ref={canvasRef} style={{ width: "100%", display: "block" }} />
      <div style={{
        position: "absolute", bottom: 8, right: 10,
        fontFamily: "var(--font-mono)", fontSize: "0.68rem",
        color: "rgba(255,255,255,0.4)", pointerEvents: "none",
      }}>
        move mouse to tilt · click for ripples
      </div>
    </div>
  );
}
