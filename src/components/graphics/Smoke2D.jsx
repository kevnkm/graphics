/**
 * Smoke2D.jsx — Curl-noise smoke simulation fragment shader.
 * Uses the shared useWebGL hook; zero boilerplate.
 */
import { useWebGL } from "../../utils/webgl";

const SMOKE_FS = `
precision highp float;
uniform vec2  u_resolution;
uniform float u_time;
uniform vec2  u_mouse;

// ── Fast Permutation Hash (Dave Hoskins) ───────────────────────────
float hash(vec3 p3) {
    p3  = fract(p3 * vec3(.1031, .1030, .0973));
    p3 += dot(p3, p3.yxz + 33.33);
    return fract((p3.x + p3.y) * p3.z);
}

// ── 3D Value Noise ─────────────────────────────────────────────────
float noise(vec3 x) {
    vec3 i = floor(x), f = fract(x);
    vec3 u = f * f * (3.0 - 2.0 * f);
    return mix(
        mix(mix(hash(i + vec3(0,0,0)), hash(i + vec3(1,0,0)), u.x),
            mix(hash(i + vec3(0,1,0)), hash(i + vec3(1,1,0)), u.x), u.y),
        mix(mix(hash(i + vec3(0,0,1)), hash(i + vec3(1,0,1)), u.x),
            mix(hash(i + vec3(0,1,1)), hash(i + vec3(1,1,1)), u.x), u.y), u.z);
}

// ── 6-Octave FBM ───────────────────────────────────────────────────
const mat3 m3 = mat3(
     0.00,  0.80,  0.60,
    -0.80,  0.36, -0.48,
    -0.60, -0.48,  0.64
);

float fbm(vec3 q) {
    float f = 0.0, a = 0.5;
    for (int i = 0; i < 6; i++) {
        f += a * noise(q);
        q = m3 * q * 2.05;
        a *= 0.5;
    }
    return f;
}

// ── Density Map ────────────────────────────────────────────────────
float map(vec2 p, float t, vec2 mo) {
    // Scroll upwards
    vec3 q = vec3(p.x * 2.2, p.y * 2.2 - t * 1.5, t * 0.4);
    
    // Large-scale swaying
    q.x += sin(p.y * 1.5 + t * 0.5) * 0.35;
    
    // ── Mouse Interaction (Repulsion Field) ──
    if (dot(mo, mo) > 0.0001) {
        float md = length(p - mo);
        float stir = exp(-md * 6.0);
        q.x += (p.x - mo.x) * stir * 3.5;
        q.y += (p.y - mo.y) * stir * 3.5;
    }
    
    // Mild domain warp for organic turbulence
    vec3 warp = vec3(
        fbm(q * 0.4 + vec3(1.2, 3.4, 1.1) + t * 0.3),
        fbm(q * 0.4 + vec3(5.6, 2.1, 8.9) - t * 0.3),
        0.0
    );
    
    float n = fbm(q + warp * 1.3);
    
    // Plume expansion: Smoke spreads out as it rises
    float width = 0.45 + clamp(p.y + 1.0, 0.0, 2.5) * 0.6;
    
    // Exponential bell curve for feathery horizontal falloff
    float shape = exp(-pow(abs(p.x) / width, 2.5));
    float vertical = smoothstep(-1.2, -0.4, p.y); // Fade out at very bottom
    
    float d = n * shape * vertical;
    
    // Sharpen into crisp smoky wisps
    return smoothstep(0.20, 0.75, d);
}

void main() {
    vec2 uv = gl_FragCoord.xy / u_resolution.xy;
    vec2 p = uv * 2.0 - 1.0;
    p.x *= u_resolution.x / u_resolution.y;

    float t = u_time * 0.7;
    
    vec2 mo = u_mouse;
    mo.x *= u_resolution.x / u_resolution.y;

    // Evaluate density
    float d = map(p, t, mo);

    // ── Fake 2D Volumetric Dual-Lighting ───────────────────────────
    vec2 lDir1 = normalize(vec2(0.6, -0.8)); // Main Cold Light (Top-Right)
    vec2 lDir2 = normalize(vec2(-0.8, 0.5)); // Warm Rim Fire Light (Bottom-Left)
    
    float dL1 = map(p + lDir1 * 0.07, t, mo);
    float dL2 = map(p + lDir2 * 0.07, t, mo);
    
    float diff1 = clamp((d - dL1) * 3.5, 0.0, 1.0);
    float diff2 = clamp((d - dL2) * 3.5, 0.0, 1.0);
    float trans = clamp((dL1 - d) * 1.8, 0.0, 1.0);

    // ── Cinematic Colors ───────────────────────────────────────────
    vec3 bg    = vec3(0.04, 0.05, 0.06); // Extremely dark studio gray
    vec3 sDark = vec3(0.12, 0.14, 0.18); // Thick shadowed smoke
    vec3 cCol1 = vec3(0.40, 0.75, 1.00); // Ethereal icy blue
    vec3 cCol2 = vec3(1.00, 0.35, 0.05); // Intense fiery orange

    vec3 col = bg;
    
    if (d > 0.001) { 
        col = mix(col, sDark, d);
        // Cool main light + scattering
        col = mix(col, cCol1 * 0.4, trans * d); 
        col = mix(col, cCol1, diff1 * d);
        // Warm under-lighting from the left
        col = mix(col, cCol2, diff2 * d * 1.5);
    }

    // ── Floating Embers ────────────────────────────────────────────
    vec2 ep = p;
    ep.x += sin(ep.y * 2.0 + t) * 0.2; // Wavy vertical path
    ep.y -= t * 1.5;                   // Drift upwards extremely fast
    
    vec2 id = floor(ep * 12.0);
    vec2 gv = fract(ep * 12.0) - 0.5;
    float h = hash(vec3(id.x, id.y, 1.1));
    
    if (h > 0.88) { // Only spawn in 12% of cells
        vec3 eCol = mix(vec3(1.0, 0.1, 0.0), vec3(1.0, 0.9, 0.2), h);
        float tw = t * 4.0 + h * 100.0;
        
        vec2 offset = vec2(sin(tw * 0.7) * 0.3, cos(tw * 0.9) * 0.3);
        float eDist = length(gv - offset);
        
        // Soft glowing spark
        float spark = exp(-eDist * 40.0) * (sin(tw * 2.0) * 0.5 + 0.5);
        
        // Embers only exist where the smoke is
        float limit = smoothstep(0.0, 0.5, map(p + vec2(0.0, 0.1), t, mo));
        col += spark * eCol * limit * 4.0;
    }

    // Subtle edge vignette
    float v = length(p);
    col *= 1.0 - 0.20 * v*v;

    // Filmic tone mapping (ACES approx)
    col = (col * (2.51 * col + 0.03)) / (col * (2.43 * col + 0.59) + 0.14);
    
    gl_FragColor = vec4(pow(max(col, 0.0), vec3(1.0 / 2.2)), 1.0);
}
`;

export function Smoke2D() {
  const canvasRef = useWebGL(SMOKE_FS);
  return <canvas ref={canvasRef} style={{ width: "100%", display: "block" }} />;
}
