/**
 * BarrelDistortionCanvas.jsx
 *
 * A1 — Animated grid with barrel/pincushion distortion (slider k)
 * A2 — Ray-marched sphere scene with distortion (slider k)
 *
 * Both use shared useWebGL hook + a shared ControlPanel UI.
 * No duplicated WebGL boilerplate.
 */
import { useState, useRef, useEffect } from "react";
import { createShader, createProgram, FULLSCREEN_VS } from "../../utils/webgl";

/* ─── Shared UI slider ───────────────────────────────────────────── */
function ControlPanel({ label, value, min, max, step, onChange }) {
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <div style={{
      position: "absolute", bottom: "1.25rem",
      left: "50%", transform: "translateX(-50%)",
      display: "flex", alignItems: "center", gap: "0.75rem",
      padding: "0.5rem 1rem",
      background: "rgba(10,10,20,0.85)",
      border: "1px solid rgba(255,255,255,0.1)",
      borderRadius: "2rem",
      backdropFilter: "blur(8px)",
      pointerEvents: "auto",
      userSelect: "none",
      whiteSpace: "nowrap",
      zIndex: 10,
    }}>
      <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.78rem", color: "var(--text-secondary)" }}>
        {label}
      </span>
      <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.85rem", color: "var(--accent-primary)", minWidth: "3rem", textAlign: "right" }}>
        {value.toFixed(2)}
      </span>
      <input
        type="range" min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        style={{
          width: "120px", height: "4px", borderRadius: "2px",
          appearance: "none", cursor: "pointer",
          background: `linear-gradient(to right, var(--accent-primary) ${pct}%, rgba(255,255,255,0.1) ${pct}%)`,
          outline: "none", border: "none",
        }}
      />
    </div>
  );
}

/* ─── useDistortionCanvas hook ───────────────────────────────────── */
/**
 * Creates a WebGL canvas running the given fragment shader and re-compiles
 * when `k` (the distortion coefficient) changes.
 */
function useDistortionCanvas(fragmentSource, k) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const gl = canvas.getContext("webgl");
    if (!gl) return;

    const vs   = createShader(gl, gl.VERTEX_SHADER,   FULLSCREEN_VS);
    const fs   = createShader(gl, gl.FRAGMENT_SHADER, fragmentSource);
    const prog = createProgram(gl, vs, fs);
    if (!prog) return;

    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER,
      new Float32Array([-1,-1, 1,-1, -1,1, -1,1, 1,-1, 1,1]), gl.STATIC_DRAW);

    const aPos  = gl.getAttribLocation(prog, "a_position");
    const uRes  = gl.getUniformLocation(prog, "u_resolution");
    const uTime = gl.getUniformLocation(prog, "u_time");
    const uDist = gl.getUniformLocation(prog, "u_distortion");

    const resize = () => {
      const p = canvas.parentElement;
      if (!p) return;
      canvas.width = p.clientWidth;
      canvas.height = p.clientWidth;
    };
    resize();
    window.addEventListener("resize", resize);

    const start = performance.now();
    let raf;
    const loop = () => {
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.useProgram(prog);
      gl.bindBuffer(gl.ARRAY_BUFFER, buf);
      gl.enableVertexAttribArray(aPos);
      gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);
      gl.uniform2f(uRes,  canvas.width, canvas.height);
      gl.uniform1f(uTime, (performance.now() - start) / 1000);
      gl.uniform1f(uDist, k);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
      raf = requestAnimationFrame(loop);
    };
    loop();

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      gl.deleteProgram(prog);
      gl.deleteShader(vs);
      gl.deleteShader(fs);
      gl.deleteBuffer(buf);
    };
  }, [k]); // re-run when k changes (re-links with correct uniform value)

  return canvasRef;
}

/* ─── A1 shader — animated grid ──────────────────────────────────── */
const GRID_FS = `
precision highp float;
uniform vec2  u_resolution;
uniform float u_time;
uniform float u_distortion;

void main() {
  vec2 uv = (gl_FragCoord.xy - 0.5 * u_resolution) / min(u_resolution.x, u_resolution.y);
  float k = u_distortion;

  // Barrel / pincushion distortion
  float r2 = dot(uv, uv);
  vec2 d = uv * (1.0 + k * r2 + k * k * r2 * r2 * 0.3); // 4th-order term for accuracy

  // Animated grid in distorted space
  float freq = 10.0;
  vec2 grid  = fract(d * freq + u_time * 0.35);
  float lineX = smoothstep(0.47, 0.53, grid.x);
  float lineY = smoothstep(0.47, 0.53, grid.y);
  float line  = max(lineX, lineY);

  vec3 gridCol = mix(vec3(0.06, 0.07, 0.14), vec3(0.65, 0.80, 1.00), line);

  // Subtle pulsing accent color
  vec3 accent = vec3(0.5 + 0.5 * cos(u_time * 0.5 + d.x * 3.0),
                     0.5 + 0.5 * cos(u_time * 0.4 + d.y * 2.5 + 1.0),
                     0.5 + 0.5 * cos(u_time * 0.3 + length(d) * 4.0 + 2.0));
  gridCol = mix(gridCol, accent, line * 0.35);

  // Vignette + clamp to circle
  float vign  = 1.0 - smoothstep(0.7, 1.0, length(uv));
  float clip  = step(length(d), 1.0);

  gl_FragColor = vec4(gridCol * vign * clip, 1.0);
}
`;

/* ─── A2 shader — sphere scene ───────────────────────────────────── */
const SPHERE_FS = `
precision highp float;
uniform vec2  u_resolution;
uniform float u_time;
uniform float u_distortion;

float sdSphere(vec3 p, float r) { return length(p) - r; }
float sdBox(vec3 p, vec3 b)     { vec3 q=abs(p)-b; return length(max(q,0.))+min(max(q.x,max(q.y,q.z)),0.); }
float smin(float a,float b,float k){float h=clamp(.5+.5*(b-a)/k,0.,1.);return mix(b,a,h)-k*h*(1.-h);}

float map(vec3 p) {
  float t = u_time * 0.5;
  float d1 = sdSphere(p - vec3(sin(t)*0.5, cos(t*0.7)*0.3, 0.), 0.45);
  float d2 = sdSphere(p - vec3(cos(t)*0.6, 0.2, sin(t)*0.5), 0.35);
  float d3 = sdBox(p - vec3(0., -0.65, 0.), vec3(2., 0.05, 2.));
  return smin(smin(d1, d2, 0.3), d3, 0.05);
}

vec3 calcNormal(vec3 p) {
  const float h = 0.001;
  const vec2 k = vec2(1,-1);
  return normalize(k.xyy*map(p+k.xyy*h)+k.yyx*map(p+k.yyx*h)+
                   k.yxy*map(p+k.yxy*h)+k.xxx*map(p+k.xxx*h));
}

void main() {
  vec2 uv = (gl_FragCoord.xy - 0.5 * u_resolution) / min(u_resolution.x, u_resolution.y);
  float k = u_distortion;

  // Apply barrel distortion to ray direction
  float r2 = dot(uv, uv);
  vec2  d  = uv * (1.0 + k * r2 + k * k * r2 * r2 * 0.3);

  if (length(d) > 1.02) { gl_FragColor = vec4(0.0); return; }

  vec3 ro = vec3(0.0, 0.8, -2.5);
  vec3 rd = normalize(vec3(d, 1.5));

  float t = 0.0;
  for (int i = 0; i < 80; i++) {
    float dist = map(ro + rd * t);
    t += dist;
    if (dist < 0.001 || t > 10.0) break;
  }

  vec3 col = vec3(0.05, 0.06, 0.12); // background
  if (t < 10.0) {
    vec3 p = ro + rd * t;
    vec3 n = calcNormal(p);
    vec3 L = normalize(vec3(1.2, 2.0, -1.5));
    float diff = max(dot(n, L), 0.0);
    vec3 H = normalize(L - rd);
    float spec = pow(max(dot(n, H), 0.0), 48.0);
    // Smooth position-based color
    vec3 baseCol = 0.5 + 0.5*cos(vec3(0,1,2) + p.x*2. + u_time*0.3);
    col = baseCol * (diff * 0.85 + 0.15) + vec3(1.0)*spec*0.6;
    // Subtle fog
    col = mix(vec3(0.05,0.06,0.12), col, exp(-t*0.06));
  }

  float vign = 1.0 - smoothstep(0.7, 1.0, length(uv));
  gl_FragColor = vec4(pow(col, vec3(0.4545)) * vign, 1.0);
}
`;

/* ─── Exported components ─────────────────────────────────────────── */
export function A1() {
  const [k, setK] = useState(0.35);
  const canvasRef = useDistortionCanvas(GRID_FS, k);
  return (
    <div style={{ width: "100%", position: "relative" }}>
      <canvas ref={canvasRef} style={{ width: "100%", display: "block" }} />
      <ControlPanel label="k =" value={k} min={-0.8} max={0.8} step={0.01} onChange={setK} />
    </div>
  );
}

export function A2() {
  const [k, setK] = useState(0.40);
  const canvasRef = useDistortionCanvas(SPHERE_FS, k);
  return (
    <div style={{ width: "100%", position: "relative" }}>
      <canvas ref={canvasRef} style={{ width: "100%", display: "block" }} />
      <ControlPanel label="k =" value={k} min={-0.8} max={0.8} step={0.01} onChange={setK} />
    </div>
  );
}
