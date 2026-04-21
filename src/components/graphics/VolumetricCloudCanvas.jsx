/**
 * VolumetricCloudCanvas.jsx — Real-time volumetric cloud via ray marching.
 * Uses the shared useWebGL hook; zero boilerplate.
 */
import { useWebGL } from "../../utils/webgl";

const CLOUD_FS = `
precision highp float;
uniform vec2  u_resolution;
uniform float u_time;
uniform vec2  u_mouse;

// ── Hash / noise ───────────────────────────────────────────────────
float hash(vec3 p) {
  return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453);
}

float valueNoise(vec3 p) {
  vec3 i = floor(p), f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(mix(hash(i),             hash(i+vec3(1,0,0)), f.x),
        mix(hash(i+vec3(0,1,0)), hash(i+vec3(1,1,0)), f.x), f.y),
    mix(mix(hash(i+vec3(0,0,1)), hash(i+vec3(1,0,1)), f.x),
        mix(hash(i+vec3(0,1,1)), hash(i+vec3(1,1,1)), f.x), f.y), f.z);
}

// Worley-style nearest-cell distance
float worley(vec3 p) {
  vec3 i = floor(p);
  float minD = 1e9;
  for (int x=-1; x<=1; x++)
  for (int y=-1; y<=1; y++)
  for (int z=-1; z<=1; z++) {
    vec3 cell = i + vec3(x,y,z);
    vec3 pt   = cell + 0.5 + 0.45 * (2.0*vec3(hash(cell),
                                                hash(cell+vec3(7,3,5)),
                                                hash(cell+vec3(11,17,2)))-1.0);
    minD = min(minD, distance(p, pt));
  }
  return minD;
}

// 4-octave FBM combining value noise + worley for clumpy look
float cloudFBM(vec3 p) {
  float v = 0.0, a = 0.5;
  vec3 q = p;
  for (int i = 0; i < 4; i++) {
    float vn = valueNoise(q);
    float wo = 1.0 - worley(q * 0.7);
    v += a * mix(vn, vn * wo, 0.6);
    q  = q * 2.1 + vec3(1.7, 9.2, 3.5);
    a *= 0.5;
  }
  return v;
}

// Cloud density at world position p
float cloudDensity(vec3 p) {
  // Slow drift
  vec3 sp = p * 1.2 + vec3(0, 0, u_time * 0.06);
  float n = cloudFBM(sp);
  // Bounding sphere falloff
  float r = length(p);
  float falloff = smoothstep(1.0, 0.55, r);
  float d = n - 0.38;                // threshold: higher = thinner cloud
  return max(0.0, d) * falloff * 2.5;
}

// Cheap self-shadow march towards sun
float lightMarch(vec3 pos, vec3 sunDir) {
  float shadow = 0.0;
  float t = 0.0;
  for (int i = 0; i < 8; i++) {
    shadow += cloudDensity(pos + sunDir * t) * 0.12;
    t += 0.12;
  }
  return exp(-shadow * 3.5);
}

void main() {
  vec2 uv  = (gl_FragCoord.xy / u_resolution.xy) * 2.0 - 1.0;
  uv.x    *= u_resolution.x / u_resolution.y;

  // Mouse-driven camera tilt
  vec3 ro  = vec3(0.0, 0.0, -2.5);
  vec3 rd  = normalize(vec3(uv + u_mouse * 0.3, 1.6));

  // ── Sphere intersection ──────────────────────────────────────────
  float a = dot(rd, rd);
  float b = 2.0 * dot(ro, rd);
  float c = dot(ro, ro) - 1.0;
  float disc = b*b - 4.0*a*c;

  // Sky background
  vec3 sky = mix(vec3(0.55, 0.70, 0.95), vec3(0.28, 0.48, 0.80),
                 clamp(rd.y * 0.5 + 0.5, 0.0, 1.0));

  if (disc < 0.0) { gl_FragColor = vec4(sky, 1.0); return; }

  float t0 = (-b - sqrt(disc)) / (2.0*a);
  float t1 = (-b + sqrt(disc)) / (2.0*a);
  if (t1 < 0.0) { gl_FragColor = vec4(sky, 1.0); return; }
  t0 = max(t0, 0.0);

  // ── Volume ray march ─────────────────────────────────────────────
  int STEPS = 48;
  float stepSize = (t1 - t0) / float(STEPS);
  vec3 sunDir  = normalize(vec3(1.2, 1.0, 0.5));
  vec3 sunCol  = vec3(1.0, 0.95, 0.80);
  vec3 skyCol  = vec3(0.60, 0.75, 1.00);

  float transmit = 1.0;
  vec3  accum    = vec3(0.0);

  for (int i = 0; i < 48; i++) {
    if (float(i) >= float(STEPS) || transmit < 0.005) break;
    float t   = t0 + (float(i) + 0.5) * stepSize;
    vec3  pos = ro + rd * t;
    float d   = cloudDensity(pos);
    if (d <= 0.0) continue;

    float alpha = 1.0 - exp(-d * stepSize * 4.0);
    float lit   = lightMarch(pos, sunDir);
    // Two-term scattering: forward sun + ambient sky
    vec3  scat  = sunCol * lit + skyCol * 0.25;

    // Mie scattering phase: back-lit glow
    float cosA = dot(rd, sunDir);
    float phase = 0.75 * (1.0 + cosA * cosA);
    scat *= phase;

    accum   += scat * alpha * transmit;
    transmit *= 1.0 - alpha;
  }

  vec3 col = sky * transmit + accum;
  // Tone-map: simple ACES approximation
  col = col * (col + 0.0245786) / (col * (0.983729 * col + 0.4329510) + 0.238081);

  gl_FragColor = vec4(col, 1.0);
}
`;

export function A1() {
  const canvasRef = useWebGL(CLOUD_FS);
  return (
    <div style={{ width: "100%", position: "relative" }}>
      <canvas ref={canvasRef} style={{ width: "100%", display: "block" }} />
      <div style={{
        position: "absolute", bottom: 8, right: 10,
        fontFamily: "var(--font-mono)", fontSize: "0.68rem",
        color: "rgba(255,255,255,0.35)", pointerEvents: "none",
      }}>
        move mouse to tilt view
      </div>
    </div>
  );
}
