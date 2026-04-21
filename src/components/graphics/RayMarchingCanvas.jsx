/**
 * RayMarchingCanvas.jsx
 *
 * A1 — Interactive 2D SDF visualization (Canvas 2D API)
 * B1 — 3D Ray Marching GLSL shader (WebGL, mouse-orbit camera)
 *
 * Both use shared hooks from utils/webgl.js — zero boilerplate per component.
 */
import { useRef } from "react";
import { use2DCanvas, useWebGL } from "../../utils/webgl";

/* ═══════════════════════════════════════════════════════════════════
   A1 — 2D SDF step-by-step visualizer
   ══════════════════════════════════════════════════════════════════ */
export function A1() {
  const obstacles = useRef([
    { x: -0.65, y: 0.30, r: 0.16 },
    { x:  0.25, y: -0.50, r: 0.12 },
    { x:  0.50, y:  0.50, r: 0.20 },
  ]).current;

  const mouseRef    = useRef({ x: 0.8, y: 0.0 });
  const hoverRef    = useRef(false);
  const angleRef    = useRef(0);
  const dragRef     = useRef(-1);

  const circleSDF = (px, py, cx, cy, r) =>
    Math.hypot(px - cx, py - cy) - r;
  const sceneSDF = (x, y) =>
    obstacles.reduce((m, ob) => Math.min(m, circleSDF(x, y, ob.x, ob.y, ob.r)), Infinity);

  const canvasRef = use2DCanvas(
    (ctx, canvas, t, dt) => {
      const W = canvas.width, H = canvas.height;
      const cx = (x) => ((x + 1) * W) / 2;
      const cy = (y) => ((-y + 1) * H) / 2;

      // Background
      ctx.fillStyle = "#080b10";
      ctx.fillRect(0, 0, W, H);

      // Grid (faint)
      ctx.strokeStyle = "rgba(255,255,255,0.04)";
      ctx.lineWidth = 1;
      for (let gx = -1; gx <= 1.01; gx += 0.25) {
        ctx.beginPath(); ctx.moveTo(cx(gx), 0); ctx.lineTo(cx(gx), H); ctx.stroke();
      }
      for (let gy = -1; gy <= 1.01; gy += 0.25) {
        ctx.beginPath(); ctx.moveTo(0, cy(gy)); ctx.lineTo(W, cy(gy)); ctx.stroke();
      }

      // Auto-rotate or follow mouse
      let tx, ty;
      if (hoverRef.current) {
        tx = mouseRef.current.x; ty = mouseRef.current.y;
      } else {
        angleRef.current += dt * 0.55;
        tx = Math.cos(angleRef.current) * 0.90;
        ty = Math.sin(angleRef.current) * 0.90;
      }

      // Ray march from origin
      const RAY_ORIGIN = { x: 0, y: 0 };
      const len = Math.hypot(tx - RAY_ORIGIN.x, ty - RAY_ORIGIN.y);
      const rdx = len > 0 ? (tx - RAY_ORIGIN.x) / len : 1;
      const rdy = len > 0 ? (ty - RAY_ORIGIN.y) / len : 0;

      const steps = [];
      let rx = RAY_ORIGIN.x, ry = RAY_ORIGIN.y, total = 0;
      for (let i = 0; i < 64; i++) {
        const d = sceneSDF(rx, ry);
        steps.push({ x: rx, y: ry, d });
        if (d < 0.008 || total > 2.2) break;
        rx += rdx * d; ry += rdy * d; total += d;
      }

      // Draw obstacles (filled + outlined)
      obstacles.forEach((ob) => {
        const grd = ctx.createRadialGradient(cx(ob.x), cy(ob.y), 0, cx(ob.x), cy(ob.y), (ob.r * W) / 2);
        grd.addColorStop(0, "rgba(80,160,255,0.18)");
        grd.addColorStop(1, "rgba(80,160,255,0.03)");
        ctx.fillStyle = grd;
        ctx.beginPath();
        ctx.arc(cx(ob.x), cy(ob.y), (ob.r * W) / 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "rgba(80,160,255,0.55)";
        ctx.lineWidth = 1.5;
        ctx.stroke();
      });

      // Draw ray line
      ctx.strokeStyle = "rgba(255,240,100,0.4)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(cx(RAY_ORIGIN.x), cy(RAY_ORIGIN.y));
      steps.forEach((s) => ctx.lineTo(cx(s.x), cy(s.y)));
      ctx.stroke();

      // Draw step circles + dots
      steps.forEach((s, i) => {
        // Distance sphere
        const pr = Math.max(0, (s.d * W) / 2);
        ctx.strokeStyle = i === steps.length - 1
          ? "rgba(255,80,80,0.35)"
          : "rgba(255,230,80,0.2)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(cx(s.x), cy(s.y), pr, 0, Math.PI * 2);
        ctx.stroke();

        // Step dot
        const isHit = i === steps.length - 1;
        ctx.fillStyle = isHit ? "#ff5050" : "#ffe050";
        ctx.beginPath();
        ctx.arc(cx(s.x), cy(s.y), isHit ? 5 : 3.5, 0, Math.PI * 2);
        ctx.fill();
      });

      // Ray origin dot
      ctx.fillStyle = "#50ff90";
      ctx.beginPath();
      ctx.arc(cx(RAY_ORIGIN.x), cy(RAY_ORIGIN.y), 6, 0, Math.PI * 2);
      ctx.fill();

      // Target cursor
      if (hoverRef.current) {
        ctx.strokeStyle = "rgba(255,255,255,0.4)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(cx(tx), cy(ty), 8, 0, Math.PI * 2);
        ctx.stroke();
      }
    },
    // Event setup
    (canvas) => {
      const toScene = (ex, ey) => {
        const r = canvas.getBoundingClientRect();
        return [
          ((ex - r.left) / r.width)  * 2 - 1,
          -(((ey - r.top) / r.height) * 2 - 1),
        ];
      };
      const findObstacle = (x, y) =>
        obstacles.findIndex((o) => Math.hypot(x - o.x, y - o.y) < o.r);

      const onEnter = () => { hoverRef.current = true; };
      const onLeave = () => { hoverRef.current = false; dragRef.current = -1; };
      const onDown  = (e) => {
        const [x, y] = toScene(e.clientX, e.clientY);
        dragRef.current = findObstacle(x, y);
      };
      const onMove  = (e) => {
        const [x, y] = toScene(e.clientX, e.clientY);
        mouseRef.current = { x, y };
        if (dragRef.current !== -1) {
          obstacles[dragRef.current].x = x;
          obstacles[dragRef.current].y = y;
        }
      };
      const onUp = () => { dragRef.current = -1; };

      canvas.addEventListener("mouseenter",  onEnter);
      canvas.addEventListener("mouseleave",  onLeave);
      canvas.addEventListener("mousedown",   onDown);
      canvas.addEventListener("mousemove",   onMove);
      canvas.addEventListener("mouseup",     onUp);
      return () => {
        canvas.removeEventListener("mouseenter",  onEnter);
        canvas.removeEventListener("mouseleave",  onLeave);
        canvas.removeEventListener("mousedown",   onDown);
        canvas.removeEventListener("mousemove",   onMove);
        canvas.removeEventListener("mouseup",     onUp);
      };
    }
  );

  return (
    <div style={{ width: "100%", position: "relative" }}>
      <canvas ref={canvasRef} style={{ width: "100%", display: "block" }} />
      <div style={{
        position: "absolute", bottom: 8, right: 10,
        fontFamily: "var(--font-mono)", fontSize: "0.68rem",
        color: "var(--text-muted)", pointerEvents: "none",
      }}>
        hover to aim · drag obstacles
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   B1 — 3D Ray Marching GLSL shader
   ══════════════════════════════════════════════════════════════════ */
const RAY_MARCH_FS = `
precision highp float;
uniform vec2  u_resolution;
uniform float u_time;
uniform vec2  u_mouse;
uniform vec2  u_drag;

const int   MAX_STEPS = 120;
const float MAX_DIST  = 30.0;
const float SURF_DIST = 0.0005;

// ── SDF primitives (Inigo Quilez) ──────────────────────────────────
float sdSphere(vec3 p, float r)         { return length(p) - r; }
float sdTorus (vec3 p, vec2 t)          { return length(vec2(length(p.xz)-t.x, p.y))-t.y; }
float sdBox   (vec3 p, vec3 b)          { vec3 q=abs(p)-b; return length(max(q,0.))+min(max(q.x,max(q.y,q.z)),0.); }
float sdCapsule(vec3 p, vec3 a, vec3 b, float r) {
  vec3 pa=p-a, ba=b-a;
  return length(pa-ba*clamp(dot(pa,ba)/dot(ba,ba),0.,1.))-r;
}
float sdOctahedron(vec3 p, float s) {
  p = abs(p); return (p.x+p.y+p.z-s) * 0.57735027;
}

// Smooth min (k = softness)
float smin(float a, float b, float k) {
  float h = clamp(.5 + .5*(b-a)/k, 0., 1.);
  return mix(b, a, h) - k*h*(1.-h);
}

// ── Scene ──────────────────────────────────────────────────────────
float map(vec3 p) {
  float t = u_time * 0.4;
  float k = 0.38;         // blend softness

  // Gently animated positions
  vec3 p1 = p - vec3(-1.8,  sin(t)*0.4, 0.);
  vec3 p2 = p - vec3( 0.0, -0.2, 0.);
  vec3 p3 = p - vec3( 1.9,  cos(t*0.7)*0.35, 0.);
  vec3 p4 = p - vec3( 0.0,  1.4 + sin(t*1.3)*0.2, 0.);

  float d1 = sdSphere (p1, 0.85);
  float d2 = sdTorus  (p2, vec2(1.1 + sin(t*.5)*0.15, 0.28));
  float d3 = sdBox    (p3, vec3(0.70, 0.70, 0.70));
  float d4 = sdCapsule(p4, vec3(0,-0.5,0), vec3(0,0.5,0), 0.28);
  // Rotating octahedron in front
  float ang = t * 0.6;
  float cs = cos(ang), sn = sin(ang);
  vec3 pp = vec3(cs*p.x+sn*p.z, p.y, -sn*p.x+cs*p.z) - vec3(0., -1.3, 0.5);
  float d5 = sdOctahedron(pp, 0.55);

  float d = smin(d1, d2, k);
  d = smin(d,  d3, k);
  d = smin(d,  d4, k * 0.6);
  d = smin(d,  d5, k * 0.5);
  return d;
}

// ── Normal (tetrahedral finite differences) ────────────────────────
vec3 calcNormal(vec3 p) {
  const float h = 0.0002;
  const vec2 k = vec2(1, -1);
  return normalize(k.xyy*map(p+k.xyy*h) + k.yyx*map(p+k.yyx*h) +
                   k.yxy*map(p+k.yxy*h) + k.xxx*map(p+k.xxx*h));
}

// ── Soft shadow ────────────────────────────────────────────────────
float softShadow(vec3 ro, vec3 rd, float tmin, float tmax, float k) {
  float res = 1.0, t = tmin;
  for (int i = 0; i < 24; i++) {
    float h = map(ro + rd*t);
    res = min(res, k*h/t);
    t += clamp(h, 0.015, 0.15);
    if (res < 0.001 || t > tmax) break;
  }
  return clamp(res, 0., 1.);
}

// ── Ambient occlusion ──────────────────────────────────────────────
float calcAO(vec3 pos, vec3 nor) {
  float occ = 0., sca = 1.;
  for (int i = 0; i < 6; i++) {
    float h = 0.01 + 0.2*float(i)/5.;
    occ += (h - map(pos + h*nor)) * sca;
    sca *= 0.85;
  }
  return clamp(1. - 2.5*occ, 0., 1.);
}

// ── Ray march ─────────────────────────────────────────────────────
float rayMarch(vec3 ro, vec3 rd) {
  float t = 0.;
  for (int i = 0; i < MAX_STEPS; i++) {
    float d = map(ro + rd*t);
    t += d;
    if (d < SURF_DIST || t > MAX_DIST) break;
  }
  return t;
}

// ── Camera helpers ─────────────────────────────────────────────────
mat3 rotY(float a) { float c=cos(a),s=sin(a); return mat3(c,0,s, 0,1,0, -s,0,c); }
mat3 rotX(float a) { float c=cos(a),s=sin(a); return mat3(1,0,0, 0,c,-s, 0,s,c); }

void main() {
  vec2 uv = (gl_FragCoord.xy - 0.5*u_resolution) / u_resolution.y;

  // Mouse orbit (yaw + limited pitch)
  float yaw   =  u_drag.x * 2.2;
  float pitch = -u_drag.y * 1.5;
  mat3 cam    = rotX(pitch) * rotY(yaw);

  vec3 ro  = cam * vec3(0., 0., -5.5);
  vec3 rd  = cam * normalize(vec3(uv, 1.6));

  float t  = rayMarch(ro, rd);

  // ── Sky background ───────────────────────────────────────────────
  vec3 skyTop = vec3(0.08, 0.09, 0.15);
  vec3 skyBot = vec3(0.20, 0.22, 0.35);
  vec3 col    = mix(skyBot, skyTop, clamp(rd.y*0.5+0.5, 0., 1.));

  if (t < MAX_DIST) {
    vec3  p   = ro + rd * t;
    vec3  n   = calcNormal(p);
    vec3  L   = normalize(vec3(2., 4., -3.));
    float ao  = calcAO(p, n);

    // ── Material: position-based color blending ────────────────────
    float hue = fract(p.x * 0.15 + p.y * 0.1 + u_time * 0.02);
    vec3  a   = vec3(0.5); vec3 b = vec3(0.5);
    vec3  c2  = vec3(1.);  vec3 d = vec3(0., 0.33, 0.67);
    vec3  baseCol = a + b*cos(6.2832*(c2*hue+d));
    baseCol = mix(baseCol, vec3(0.8, 0.82, 0.88), 0.25); // desaturate slightly

    // ── Lighting ───────────────────────────────────────────────────
    float diff  = max(dot(n, L), 0.);
    float shade = softShadow(p + n*0.002, L, 0.01, 8., 14.);
    vec3  H     = normalize(L - rd);
    float spec  = pow(max(dot(n, H), 0.), 80.) * 1.2;

    vec3 ambient = baseCol * 0.07 * ao;
    vec3 diffuse  = baseCol * diff * shade;
    vec3 specular = vec3(1.0) * spec * shade * ao;
    // faint rim light from below
    float rim  = pow(clamp(1. + dot(n, rd), 0., 1.), 3.) * 0.4;
    vec3 rimC  = vec3(0.4, 0.6, 1.0) * rim;

    col = ambient + diffuse + specular + rimC;

    // Distance fog
    float fog = exp(-0.008 * t * t);
    col = mix(skyBot, col, fog);
  }

  // ACES tone-map + gamma
  col = col * (col + 0.0245786) / (col * (0.983729*col + 0.432951) + 0.238081);
  col = pow(col, vec3(0.4545));

  gl_FragColor = vec4(col, 1.0);
}
`;

export function B1() {
  const canvasRef = useWebGL(RAY_MARCH_FS);
  return (
    <div style={{ width: "100%", position: "relative" }}>
      <canvas ref={canvasRef} style={{ width: "100%", display: "block" }} />
      <div style={{
        position: "absolute", bottom: 8, right: 10,
        fontFamily: "var(--font-mono)", fontSize: "0.68rem",
        color: "rgba(255,255,255,0.35)", pointerEvents: "none",
      }}>
        drag to orbit camera
      </div>
    </div>
  );
}
