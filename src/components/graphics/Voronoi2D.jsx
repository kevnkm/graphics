/**
 * Voronoi2D.jsx — Interactive Voronoi diagram with rich GLSL shading.
 * Uses the shared useWebGL hook.
 */
import { useRef, useCallback } from "react";
import { useWebGL } from "../../utils/webgl";

const NUM_POINTS = 24; // visible, draggable seed points

const VORONOI_FS = `
precision highp float;
uniform vec2  u_resolution;
uniform float u_time;
uniform vec2  u_points[${NUM_POINTS}];

#define N ${NUM_POINTS}

// ── Smooth voronoi + distance to edge ─────────────────────────────
// Returns: x = dist to nearest, y = dist to 2nd nearest, z = cell id
vec3 voronoi(vec2 p) {
  float d1 = 1e9, d2 = 1e9;
  float id = 0.0;
  for (int i = 0; i < N; i++) {
    vec2 pt = u_points[i];
    // Subtle time-drift per seed
    pt += 0.012 * vec2(sin(u_time * 0.4 + float(i) * 1.3),
                       cos(u_time * 0.3 + float(i) * 2.1));
    float d = distance(p, pt);
    if (d < d1) { d2 = d1; d1 = d; id = float(i); }
    else if (d < d2) { d2 = d; }
  }
  return vec3(d1, d2, id);
}

// ── Palette (one colour per cell via hash) ─────────────────────────
vec3 cellPalette(float id, float t) {
  float h = fract(id * 0.61803398874 + 0.3);
  // HSV → RGB (approximate, no branch)
  vec3 rgb = clamp(abs(mod(h * 6.0 + vec3(0,4,2), 6.0) - 3.0) - 1.0, 0.0, 1.0);
  // Slightly desaturate & darken, then pulse brightness with time
  rgb = mix(vec3(dot(rgb, vec3(0.299, 0.587, 0.114))), rgb, 0.65);
  rgb *= 0.55 + 0.15 * sin(t * 0.5 + id);
  return rgb;
}

void main() {
  vec2 uv = gl_FragCoord.xy / u_resolution.xy * 2.0 - 1.0;
  // Correct aspect
  uv.x *= u_resolution.x / u_resolution.y;

  vec3 v   = voronoi(uv);
  float d1 = v.x, d2 = v.y, id = v.z;

  float edge   = d2 - d1;                      // distance to cell boundary
  float border = 1.0 - smoothstep(0.0, 0.025, edge);
  float center = smoothstep(0.12, 0.0, d1);    // bright dot at seed

  // Cell base colour
  vec3 col = cellPalette(id, u_time);

  // Interior shading: subtle radial darkening towards boundary
  col *= 0.7 + 0.3 * smoothstep(0.0, 0.4, edge);

  // Edge glow (white-ish)
  col = mix(col, vec3(0.9, 0.95, 1.0), border * 0.85);

  // Seed dot highlight
  col = mix(col, vec3(1.0), center * 0.9);

  // Very subtle vignette
  float vign = 1.0 - 0.3 * dot(uv / 1.5, uv / 1.5);
  col *= vign;

  gl_FragColor = vec4(col, 1.0);
}
`;

export function Voronoi2D() {
  // Mutable seed positions, kept in sync with the shader via Float32Array
  const pointsRef   = useRef(
    Array.from({ length: NUM_POINTS }, () => [
      (Math.random() * 2 - 1) * 0.9,
      (Math.random() * 2 - 1) * 0.9,
    ])
  );
  const pointsArray = useRef(new Float32Array(NUM_POINTS * 2));

  // Sync pointsRef → Float32Array
  const syncArray = () => {
    const pts = pointsRef.current;
    const arr = pointsArray.current;
    for (let i = 0; i < NUM_POINTS; i++) {
      arr[i * 2]     = pts[i][0];
      arr[i * 2 + 1] = pts[i][1];
    }
  };
  syncArray();

  const dragRef = useRef({ idx: -1 });

  const canvasRef = useWebGL(VORONOI_FS, {
    onSetup(gl, prog, locs) {
      locs.u_points = gl.getUniformLocation(prog, "u_points[0]");
    },
    onFrame(gl, prog, locs) {
      if (locs.u_points) gl.uniform2fv(locs.u_points, pointsArray.current);
    },
  });

  // Attach interaction events after canvasRef is valid
  const wiredRef = useRef(false);
  const attachRef = useCallback((el) => {
    canvasRef.current = el;
    if (!el || wiredRef.current) return;
    wiredRef.current = true;

    const toNDC = (cx, cy) => {
      const r   = el.getBoundingClientRect();
      const nx  = ((cx - r.left) / r.width) * 2 - 1;
      const ny  = -(((cy - r.top) / r.height) * 2 - 1);
      // Undo aspect correction done in shader
      return [nx * (r.width / r.height), ny];
    };

    const nearest = (x, y) => {
      let best = -1, bd = 0.08;
      pointsRef.current.forEach(([px, py], i) => {
        const d = Math.hypot(x - px, y - py);
        if (d < bd) { bd = d; best = i; }
      });
      return best;
    };

    const DOWN = (cx, cy) => {
      const [x, y] = toNDC(cx, cy);
      dragRef.current.idx = nearest(x, y);
    };
    const MOVE = (cx, cy) => {
      const i = dragRef.current.idx;
      if (i === -1) return;
      const [x, y] = toNDC(cx, cy);
      pointsRef.current[i] = [x, y];
      syncArray();
    };
    const UP = () => { dragRef.current.idx = -1; };

    el.addEventListener("mousedown",  (e) => DOWN(e.clientX, e.clientY));
    el.addEventListener("mousemove",  (e) => MOVE(e.clientX, e.clientY));
    el.addEventListener("mouseup",    UP);
    el.addEventListener("mouseleave", UP);
    el.addEventListener("touchstart", (e) => { e.preventDefault(); DOWN(e.touches[0].clientX, e.touches[0].clientY); }, { passive: false });
    el.addEventListener("touchmove",  (e) => { e.preventDefault(); MOVE(e.touches[0].clientX, e.touches[0].clientY); }, { passive: false });
    el.addEventListener("touchend",   UP);
  }, []);

  return (
    <div style={{ width: "100%", position: "relative" }}>
      <canvas ref={attachRef} style={{ width: "100%", display: "block" }} />
      <div style={{
        position: "absolute", bottom: 8, right: 10,
        fontFamily: "var(--font-mono)", fontSize: "0.68rem",
        color: "var(--text-muted)", pointerEvents: "none",
      }}>
        drag seeds to reshape cells
      </div>
    </div>
  );
}
