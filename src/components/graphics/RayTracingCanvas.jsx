/**
 * RayTracingCanvas.jsx
 *
 * 2D demonstrations (A1–A5, B1–B3): built on a single shared Scene2D primitive.
 * 3D ray tracer (C1): GPU GLSL shader via useWebGL hook.
 *
 * All boilerplate is in utils/webgl.js — nothing duplicated here.
 */
import { useRef, useEffect } from "react";
import { use2DCanvas, useWebGL } from "../../utils/webgl";

/* ═══════════════════════════════════════════════════════════════════
   Shared 2D scene data & math helpers
   ══════════════════════════════════════════════════════════════════ */
const DEFAULT_OBSTACLES = [
  { x: -0.70, y:  0.30, w: 0.20, h: 0.40 },
  { x:  0.20, y: -0.50, w: 0.30, h: 0.20 },
  { x: -0.20, y:  0.00, w: 0.15, h: 0.60 },
];

/**
 * Cast a single ray against axis-aligned rect obstacles.
 * Returns { x, y, normalX, normalY, hit }
 */
function castRay(sx, sy, dx, dy, obstacles) {
  let tMin = Infinity, nx = 0, ny = 0;
  for (const o of obstacles) {
    const [l, r, t, b] = [o.x, o.x + o.w, o.y, o.y - o.h];
    const txA = dx ? (l - sx) / dx : Infinity;
    const txB = dx ? (r - sx) / dx : Infinity;
    const tyA = dy ? (t - sy) / dy : Infinity;
    const tyB = dy ? (b - sy) / dy : Infinity;
    const tNear = Math.max(Math.min(txA, txB), Math.min(tyA, tyB));
    const tFar  = Math.min(Math.max(txA, txB), Math.max(tyA, tyB));
    if (tNear > 0 && tNear < tFar && tNear < tMin) {
      tMin = tNear;
      // Determine surface normal from which pair was the limiting face
      if (Math.min(txA, txB) > Math.min(tyA, tyB)) {
        nx = dx < 0 ? 1 : -1; ny = 0;
      } else {
        nx = 0; ny = dy < 0 ? 1 : -1;
      }
    }
  }
  if (tMin === Infinity) return { x: sx + dx * 2, y: sy + dy * 2, hit: false, nx: 0, ny: 0 };
  return { x: sx + dx * tMin, y: sy + dy * tMin, hit: true, nx, ny };
}

/** Reflect direction d around surface normal n */
function reflect(dx, dy, nx, ny) {
  const dot = dx * nx + dy * ny;
  return [dx - 2 * dot * nx, dy - 2 * dot * ny];
}

/* ═══════════════════════════════════════════════════════════════════
   Shared 2D drawing helpers (Canvas2D)
   ══════════════════════════════════════════════════════════════════ */
function drawObstacles(ctx, obstacles, cx, cy) {
  obstacles.forEach((o) => {
    ctx.fillStyle = "rgba(180,190,210,0.12)";
    ctx.fillRect(cx(o.x), cy(o.y), cx(o.x + o.w) - cx(o.x), cy(o.y - o.h) - cy(o.y));
    ctx.strokeStyle = "rgba(160,180,220,0.5)";
    ctx.lineWidth = 1.5;
    ctx.strokeRect(cx(o.x), cy(o.y), cx(o.x + o.w) - cx(o.x), cy(o.y - o.h) - cy(o.y));
  });
}

function drawRaySegment(ctx, x0, y0, x1, y1, col) {
  ctx.strokeStyle = col;
  ctx.lineWidth = 1.2;
  ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
}

function fillCircle(ctx, x, y, r, col) {
  ctx.fillStyle = col;
  ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
}

function drawBackground(ctx, W, H) {
  ctx.fillStyle = "#060910";
  ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = "rgba(255,255,255,0.03)";
  ctx.lineWidth = 1;
  for (let x = -1; x <= 1.01; x += 0.25) {
    const px = ((x + 1) * W) / 2;
    ctx.beginPath(); ctx.moveTo(px, 0); ctx.lineTo(px, H); ctx.stroke();
  }
  for (let y = -1; y <= 1.01; y += 0.25) {
    const py = ((-y + 1) * H) / 2;
    ctx.beginPath(); ctx.moveTo(0, py); ctx.lineTo(W, py); ctx.stroke();
  }
}

/* ═══════════════════════════════════════════════════════════════════
   Scene2D — single configurable component that all A/B tabs use
   ══════════════════════════════════════════════════════════════════ */
function Scene2D({
  fov = 0,          // field of view in radians (0 = single ray)
  rayCount = 1,     // number of rays in FOV
  showReflections = false,
  showShadows = false,      // B1/B2/B3: shadow feelers
  showVisibility = false,   // A5/B3 style: visibility polygon
  lightMode = false,        // draggable light source
}) {
  const mouseRef = useRef({ x: 0, y: 0 });
  const hoverRef = useRef(false);
  const angleRef = useRef(0);
  const lightRef = useRef({ x: 0.3, y: 0.4 });
  const dragRef  = useRef({ what: null }); // 'light' | null
  const obstRef  = useRef(DEFAULT_OBSTACLES.map((o) => ({ ...o })));

  const canvasRef = use2DCanvas(
    (ctx, canvas, _t, dt) => {
      const W = canvas.width, H = canvas.height;
      const cx = (x) => ((x + 1) * W) / 2;
      const cy = (y) => ((-y + 1) * H) / 2;
      const obstacles = obstRef.current;

      drawBackground(ctx, W, H);
      drawObstacles(ctx, obstacles, cx, cy);

      // Ray emitter position
      const emX = lightMode ? lightRef.current.x : 0;
      const emY = lightMode ? lightRef.current.y : 0;

      // Direction: auto-rotate or follow mouse
      let baseAngle;
      if (hoverRef.current && !lightMode) {
        const { x, y } = mouseRef.current;
        baseAngle = Math.atan2(y - emY, x - emX);
      } else {
        angleRef.current += dt * 0.5;
        baseAngle = angleRef.current;
      }

      // Build ray angles
      const angles = [];
      if (fov === 0) {
        angles.push(baseAngle);
      } else {
        const step = fov / Math.max(rayCount - 1, 1);
        for (let i = 0; i < rayCount; i++) angles.push(baseAngle - fov / 2 + i * step);
      }

      // Full 360 for visibility mode
      const rayAngles = showVisibility
        ? Array.from({ length: 360 }, (_, i) => (i / 360) * Math.PI * 2)
        : angles;

      // Cast all rays
      const hits = rayAngles.map((a) => {
        const d = { dx: Math.cos(a), dy: Math.sin(a) };
        const h = castRay(emX, emY, d.dx, d.dy, obstacles);
        let ref = null;
        if (showReflections && h.hit) {
          const [rdx, rdy] = reflect(d.dx, d.dy, h.nx, h.ny);
          ref = castRay(h.x + rdx * 0.001, h.y + rdy * 0.001, rdx, rdy, obstacles);
        }
        return { ...d, h, ref };
      });

      // Draw visibility polygon fill
      if (showVisibility && hits.length) {
        ctx.fillStyle = "rgba(255, 220, 80, 0.08)";
        ctx.beginPath();
        ctx.moveTo(cx(emX), cy(emY));
        hits.forEach(({ h }) => ctx.lineTo(cx(h.x), cy(h.y)));
        ctx.closePath();
        ctx.fill();
      }

      // Draw rays
      hits.forEach(({ h, ref }) => {
        const alpha = showVisibility ? 0.15 : fov > 0 ? 0.45 : 1.0;
        drawRaySegment(ctx, cx(emX), cy(emY), cx(h.x), cy(h.y),
          `rgba(255, 220, 60, ${alpha})`);
        if (ref) {
          drawRaySegment(ctx, cx(h.x), cy(h.y), cx(ref.x), cy(ref.y),
            "rgba(100, 220, 255, 0.7)");
        }
      });

      // Draw shadow feelers (B-series)
      if (showShadows) {
        const lx = lightRef.current.x, ly = lightRef.current.y;
        obstacles.forEach((o) => {
          const corners = [
            [o.x, o.y], [o.x + o.w, o.y],
            [o.x, o.y - o.h], [o.x + o.w, o.y - o.h],
          ];
          corners.forEach(([px, py]) => {
            const ldx = px - lx, ldy = py - ly;
            const ll = Math.hypot(ldx, ldy);
            const h = castRay(lx, ly, ldx / ll, ldy / ll, obstacles);
            drawRaySegment(ctx, cx(lx), cy(ly), cx(h.x), cy(h.y),
              "rgba(255,150,50,0.25)");
          });
        });
      }

      // Draw hit dots
      if (!showVisibility) {
        hits.forEach(({ h }) => {
          if (h.hit) fillCircle(ctx, cx(h.x), cy(h.y), 4.5, "#ff4060");
        });
      }

      // Emitter dot
      if (lightMode) {
        // Glow
        const g = ctx.createRadialGradient(cx(emX), cy(emY), 0, cx(emX), cy(emY), 24);
        g.addColorStop(0, "rgba(255,200,60,0.5)");
        g.addColorStop(1, "transparent");
        ctx.fillStyle = g; ctx.beginPath();
        ctx.arc(cx(emX), cy(emY), 24, 0, Math.PI * 2); ctx.fill();
      }
      fillCircle(ctx, cx(emX), cy(emY), lightMode ? 7 : 6,
        lightMode ? "#ffdb50" : "#50ff90");
    },
    (canvas) => {
      const toScene = (ex, ey) => {
        const r = canvas.getBoundingClientRect();
        return [((ex - r.left) / r.width) * 2 - 1, -(((ey - r.top) / r.height) * 2 - 1)];
      };
      const onEnter = () => { hoverRef.current = true; };
      const onLeave = () => { hoverRef.current = false; dragRef.current.what = null; };
      const onDown  = (e) => {
        const [x, y] = toScene(e.clientX, e.clientY);
        if (lightMode && Math.hypot(x - lightRef.current.x, y - lightRef.current.y) < 0.08) {
          dragRef.current.what = "light";
        }
      };
      const onMove  = (e) => {
        const [x, y] = toScene(e.clientX, e.clientY);
        mouseRef.current = { x, y };
        if (dragRef.current.what === "light") {
          lightRef.current = { x, y };
        }
      };
      const onUp = () => { dragRef.current.what = null; };

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

  const hint = lightMode
    ? "drag light · rays cast from light"
    : showVisibility
      ? "full 360° visibility"
      : fov > 0
        ? "hover to aim · FOV cone"
        : "hover to aim ray";

  return (
    <div style={{ width: "100%", position: "relative" }}>
      <canvas ref={canvasRef} style={{ width: "100%", display: "block" }} />
      <div style={{
        position: "absolute", bottom: 8, right: 10,
        fontFamily: "var(--font-mono)", fontSize: "0.68rem",
        color: "var(--text-muted)", pointerEvents: "none",
      }}>{hint}</div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   Exported 2D scenes — each is just a config of Scene2D
   ══════════════════════════════════════════════════════════════════ */
// A1: single ray, no reflections
export const A1 = () => <Scene2D />;

// A2: single ray + single reflection
export const A2 = () => <Scene2D showReflections />;

// A3: FOV cone, no reflections
export const A3 = () => <Scene2D fov={Math.PI / 3} rayCount={24} />;

// A4: FOV cone + reflections
export const A4 = () => <Scene2D fov={Math.PI / 3} rayCount={24} showReflections />;

// A5: Full 360° visibility polygon (like a lantern)
export const A5 = () => <Scene2D showVisibility />;

// B1: Draggable point light + shadow feelers
export const B1 = () => <Scene2D lightMode showShadows fov={Math.PI * 2} rayCount={80} />;

// B2: Draggable point light + reflections
export const B2 = () => <Scene2D lightMode showReflections fov={Math.PI * 2} rayCount={80} />;

// B3: Draggable light + full shadow + reflections + visibility
export const B3 = () => <Scene2D lightMode showShadows showReflections showVisibility />;

/* ═══════════════════════════════════════════════════════════════════
   C1 — GPU 3D Ray Tracer (GLSL fragment shader)
   ══════════════════════════════════════════════════════════════════ */
const RAY_TRACE_FS = `
precision highp float;
uniform vec2  u_resolution;
uniform float u_time;
uniform vec2  u_mouse;
uniform vec2  u_drag;

// ── Sphere intersection ────────────────────────────────────────────
float hitSphere(vec3 ro, vec3 rd, vec3 c, float r) {
  vec3 oc = ro - c;
  float b = dot(oc, rd), disc = b*b - (dot(oc,oc) - r*r);
  if (disc < 0.0) return -1.0;
  float t = -b - sqrt(disc);
  return t > 0.001 ? t : -1.0;
}

// ── Scene: 7 spheres + infinite ground plane ───────────────────────
const int N = 7;
vec3  centers[N];
float radii[N];
vec3  albedo[N];
float rough[N];   // 0 = mirror, 1 = diffuse

// Ground plane (y = -0.5) analytical hit
float hitPlane(vec3 ro, vec3 rd) {
  if (abs(rd.y) < 0.0001) return -1.0;
  float t = -(ro.y + 0.5) / rd.y;
  return t > 0.001 ? t : -1.0;
}

// ── Simple sky gradient ────────────────────────────────────────────
vec3 skyColor(vec3 rd) {
  float t = clamp(rd.y * 0.5 + 0.5, 0.0, 1.0);
  return mix(vec3(0.9, 0.6, 0.3), vec3(0.25, 0.45, 0.80), t);
}

// ── Soft lighting with one sun + ambient ───────────────────────────
vec3 shade(vec3 ro, vec3 rd, vec3 hit, vec3 nor, vec3 alb, float roughness) {
  vec3 sunDir = normalize(vec3(0.7, 0.9, 0.5));
  vec3 sunCol = vec3(1.0, 0.95, 0.85) * 2.5;
  vec3 sky    = vec3(0.25, 0.45, 0.80) * 0.6;

  float diff = max(dot(nor, sunDir), 0.0);

  // Specular (GGX-like blinn approximation)
  vec3 H = normalize(sunDir - rd);
  float spec = pow(max(dot(nor, H), 0.0), 2.0 / (roughness * roughness + 0.001));

  // Simple shadow: re-test scene for sun direction
  float shadow = 1.0;
  for (int i = 0; i < N; i++) {
    float ts = hitSphere(hit + nor*0.002, sunDir, centers[i], radii[i]);
    if (ts > 0.0) { shadow = 0.12; break; }
  }

  vec3 col  = alb * (diff * sunCol * shadow + sky);
  col      += sunCol * spec * (1.0 - roughness) * 0.5 * shadow;
  return col;
}

mat3 rotY(float a) { float c=cos(a),s=sin(a); return mat3(c,0,-s, 0,1,0, s,0,c); }

void main() {
  // Init scene (GLSL ES 1.0 arrays can't use initializer lists inline)
  centers[0] = vec3( 0.0,  0.0,  0.0); radii[0] = 0.50; albedo[0] = vec3(0.9, 0.15, 0.1); rough[0] = 0.05;
  centers[1] = vec3( 1.4,  0.15, 0.3); radii[1] = 0.45; albedo[1] = vec3(0.2, 0.75, 0.3); rough[1] = 0.4;
  centers[2] = vec3(-1.4,  0.1,  0.4); radii[2] = 0.42; albedo[2] = vec3(0.2, 0.4,  0.9); rough[2] = 0.55;
  centers[3] = vec3( 0.5, -0.15, 1.2); radii[3] = 0.35; albedo[3] = vec3(0.9, 0.85, 0.1); rough[3] = 0.02;
  centers[4] = vec3(-0.8,  0.0,  1.0); radii[4] = 0.38; albedo[4] = vec3(0.8, 0.5,  0.2); rough[4] = 0.65;
  centers[5] = vec3( 0.0,  0.6, -0.8); radii[5] = 0.30; albedo[5] = vec3(0.85,0.85, 0.9); rough[5] = 0.0;
  centers[6] = vec3(-0.3, -0.2,  1.6); radii[6] = 0.28; albedo[6] = vec3(0.6, 0.1,  0.8); rough[6] = 0.3;

  vec2 uv = (gl_FragCoord.xy - 0.5 * u_resolution) / u_resolution.y;

  // Mouse-orbit camera
  float yaw   =  u_drag.x * 2.5 + u_time * 0.05;
  float pitch = -u_drag.y * 1.5 - 0.15;
  float dist  = 3.8;
  vec3 ro = rotY(yaw) * vec3(0.0, sin(pitch)*dist, cos(pitch)*dist);
  vec3 target = vec3(0.0, 0.1, 0.0);
  vec3 fwd = normalize(target - ro);
  vec3 right = normalize(cross(fwd, vec3(0,1,0)));
  vec3 up    = cross(right, fwd);
  vec3 rd = normalize(fwd * 1.5 + right * uv.x + up * uv.y);

  // ── Primary hit ─────────────────────────────────────────────────
  float tMin = 1e9; int iHit = -2; // -2 = sky, -1 = ground
  vec3 hitNor, hitAlb; float hitRough;

  float tp = hitPlane(ro, rd);
  if (tp > 0.0) { 
      tMin = tp; iHit = -1;
      hitNor = vec3(0.0, 1.0, 0.0);
      hitRough = 0.9;
  }

  for (int i = 0; i < N; i++) {
    float t = hitSphere(ro, rd, centers[i], radii[i]);
    if (t > 0.0 && t < tMin) { 
        tMin = t; iHit = i; 
        hitNor = centers[i]; // Store center temporarily
        hitAlb = albedo[i];
        hitRough = rough[i];
    }
  }

  vec3 col;
  if (iHit == -2) {
    col = skyColor(rd);
  } else {
    vec3 hit = ro + rd * tMin;
    if (iHit == -1) {
      // Checkerboard ground
      float chk = mod(floor(hit.x * 2.0) + floor(hit.z * 2.0), 2.0);
      hitAlb = mix(vec3(0.75), vec3(0.45), chk);
      // hitNor is already vec3(0,1,0)
    } else {
      hitNor = normalize(hit - hitNor); // compute real normal from center
    }
    col = shade(ro, rd, hit, hitNor, hitAlb, hitRough);

    // ── Mirror reflection (one bounce for low-roughness surfaces) ──
    if (hitRough < 0.15) {
      vec3 rrd = reflect(rd, hitNor);
      vec3 rro = hit + hitNor * 0.003;
      float t2 = 1e9; int i2 = -2;
      vec3 rn, ra; float rrough;

      float tp2 = hitPlane(rro, rrd);
      if (tp2 > 0.0) { 
          t2 = tp2; i2 = -1;
          rn = vec3(0.0, 1.0, 0.0);
          rrough = 0.9;
      }
      for (int j = 0; j < N; j++) {
        float ts = hitSphere(rro, rrd, centers[j], radii[j]);
        if (ts > 0.0 && ts < t2) { 
            t2 = ts; i2 = j; 
            rn = centers[j];
            ra = albedo[j];
            rrough = rough[j];
        }
      }
      
      vec3 rcol;
      if (i2 == -2) {
        rcol = skyColor(rrd);
      } else {
        vec3 rh = rro + rrd * t2;
        if (i2 == -1) {
          float chk2 = mod(floor(rh.x*2.0)+floor(rh.z*2.0), 2.0);
          ra = mix(vec3(0.75), vec3(0.45), chk2); 
        } else {
          rn = normalize(rh - rn); 
        }
        rcol = shade(rro, rrd, rh, rn, ra, rrough);
      }
      float reflectance = 1.0 - hitRough * hitRough;
      col = mix(col, rcol, reflectance * 0.85);
    }

    // Distance fog
    col = mix(skyColor(rd), col, exp(-tMin * 0.08));
  }

  // ACES tone-map + gamma
  col = col * (col + 0.0245786) / (col*(0.983729*col+0.432951)+0.238081);
  col = pow(max(col, 0.0), vec3(0.4545));

  gl_FragColor = vec4(col, 1.0);
}
`;

export function C1() {
  const canvasRef = useWebGL(RAY_TRACE_FS);
  return (
    <div style={{ width: "100%", position: "relative" }}>
      <canvas ref={canvasRef} style={{ width: "100%", display: "block" }} />
      <div style={{
        position: "absolute", bottom: 8, right: 10,
        fontFamily: "var(--font-mono)", fontSize: "0.68rem",
        color: "rgba(255,255,255,0.35)", pointerEvents: "none",
      }}>
        drag to orbit · auto-rotates
      </div>
    </div>
  );
}
