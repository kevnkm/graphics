/**
 * Fractals2D.jsx — Mandelbrot & Julia sets with pan/zoom and smooth coloring.
 * Both use the shared useWebGL hook; zero boilerplate.
 */
import { useRef } from "react";
import { useWebGL } from "../../utils/webgl";

// ── Shared coloring function (injected into both shaders) ──────────────────
const FRACTAL_COMMON = `
precision highp float;
uniform vec2  u_resolution;
uniform float u_time;
uniform vec2  u_center;
uniform float u_zoom;

// Smooth iteration count → continuous color
float smoothIter(float iter, vec2 z, float maxIter) {
  if (iter >= maxIter) return maxIter;
  // Normalized iteration count (Munafo / linas formula)
  return iter - log2(log2(dot(z, z))) + 4.0;
}

// Multi-stop HSV-like palette
vec3 palette(float t) {
  // Four-frequency cosine palette (Inigo Quilez style)
  vec3 a = vec3(0.5, 0.5, 0.5);
  vec3 b = vec3(0.5, 0.5, 0.5);
  vec3 c = vec3(1.0, 1.0, 1.0);
  vec3 d = vec3(0.00, 0.33, 0.67);
  return a + b * cos(6.2832 * (c * t + d));
}
`;

const MANDELBROT_FS = FRACTAL_COMMON + `
const float MAX_ITER = 512.0;

void main() {
  vec2 uv  = (gl_FragCoord.xy - 0.5 * u_resolution) / u_resolution.y;
  vec2 c   = u_center + uv * u_zoom;

  vec2 z   = vec2(0.0);
  float i  = 0.0;
  for (float n = 0.0; n < MAX_ITER; n++) {
    if (dot(z, z) > 4.0) break;
    z = vec2(z.x*z.x - z.y*z.y, 2.0*z.x*z.y) + c;
    i++;
  }

  vec3 col = vec3(0.0);
  if (i < MAX_ITER) {
    float s = smoothIter(i, z, MAX_ITER) / MAX_ITER;
    col = palette(s + u_time * 0.04);
  }
  gl_FragColor = vec4(col, 1.0);
}
`;

const JULIA_FS = FRACTAL_COMMON + `
// Slowly orbit to show different Julia sets
const float MAX_ITER = 512.0;

void main() {
  vec2 uv = (gl_FragCoord.xy - 0.5 * u_resolution) / u_resolution.y;
  vec2 z  = u_center + uv * u_zoom;

  // Slowly orbit to show different Julia sets
  float angle = u_time * 0.15;
  vec2 c = vec2(
    -0.4 + 0.4 * cos(angle),
     0.6 * sin(angle * 0.7)
  );

  float i = 0.0;
  for (float n = 0.0; n < MAX_ITER; n++) {
    if (dot(z, z) > 4.0) break;
    z = vec2(z.x*z.x - z.y*z.y, 2.0*z.x*z.y) + c;
    i++;
  }

  vec3 col = vec3(0.0);
  if (i < MAX_ITER) {
    float s = smoothIter(i, z, MAX_ITER) / MAX_ITER;
    col = palette(s + u_time * 0.02);
  }
  gl_FragColor = vec4(col, 1.0);
}
`;

// ── Reusable fractal canvas with pan/zoom/reset ───────────────────────────
function FractalCanvas({ fragmentSource, defaultCenter, defaultZoom }) {
  const state = useRef({
    center:      [...defaultCenter],
    zoom:        defaultZoom,
    isDragging:  false,
    lastMouse:   [0, 0],
  });

  const canvasRef = useWebGL(fragmentSource, {
    onSetup(gl, prog, locs) {
      locs.u_center = gl.getUniformLocation(prog, "u_center");
      locs.u_zoom   = gl.getUniformLocation(prog, "u_zoom");
    },
    onFrame(gl, prog, locs) {
      const s = state.current;
      if (locs.u_center) gl.uniform2f(locs.u_center, s.center[0], s.center[1]);
      if (locs.u_zoom)   gl.uniform1f(locs.u_zoom, s.zoom);
    },
    // override default mouse — we want drag + wheel here
    onMouse() {}, // noop — events wired below
  });

  // Wire drag + wheel + double-click after canvasRef is set
  const wiredRef = useRef(false);
  const attachRef = (el) => {
    canvasRef.current = el;
    if (!el || wiredRef.current) return;
    wiredRef.current = true;
    const s = state.current;

    const ndcPos = (e) => {
      const r = el.getBoundingClientRect();
      return [
        ((e.clientX - r.left) / el.clientWidth)  * 2 - 1,
        -(((e.clientY - r.top) / el.clientHeight) * 2 - 1),
      ];
    };

    el.addEventListener("mousedown", (e) => {
      if (e.button !== 0) return;
      s.isDragging = true;
      s.lastMouse  = ndcPos(e);
    });
    el.addEventListener("mouseup",    () => { s.isDragging = false; });
    el.addEventListener("mouseleave", () => { s.isDragging = false; });
    el.addEventListener("mousemove", (e) => {
      if (!s.isDragging) return;
      const [cx, cy] = ndcPos(e);
      const [lx, ly] = s.lastMouse;
      s.center[0] -= (cx - lx) * s.zoom;
      s.center[1] -= (cy - ly) * s.zoom;
      s.lastMouse = [cx, cy];
    });
    el.addEventListener("wheel", (e) => {
      e.preventDefault();
      const [mx, my] = ndcPos(e);
      const factor = e.deltaY < 0 ? 0.85 : 1 / 0.85;
      // zoom towards cursor
      s.center[0] += mx * s.zoom * (1 - factor);
      s.center[1] += my * s.zoom * (1 - factor);
      s.zoom *= factor;
      s.zoom = Math.max(1e-10, Math.min(s.zoom, 10));
    }, { passive: false });
    el.addEventListener("dblclick", () => {
      s.center = [...defaultCenter];
      s.zoom   = defaultZoom;
    });
  };

  return (
    <div style={{ width: "100%", position: "relative" }}>
      <canvas ref={attachRef} style={{ width: "100%", display: "block" }} />
      <div style={{
        position: "absolute", bottom: 8, right: 10,
        fontFamily: "var(--font-mono)", fontSize: "0.68rem",
        color: "var(--text-muted)", pointerEvents: "none",
      }}>
        scroll to zoom · drag to pan · dbl-click reset
      </div>
    </div>
  );
}

export function Mandelbrot() {
  return (
    <FractalCanvas
      fragmentSource={MANDELBROT_FS}
      defaultCenter={[-0.75, 0.0]}
      defaultZoom={3.0}
    />
  );
}

export function Julia() {
  return (
    <FractalCanvas
      fragmentSource={JULIA_FS}
      defaultCenter={[0.0, 0.0]}
      defaultZoom={3.0}
    />
  );
}
