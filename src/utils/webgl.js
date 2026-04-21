/**
 * webgl.js — shared WebGL helpers used by every canvas component.
 * Nothing here is component-specific.
 */
import { useRef, useEffect } from "react";

// ─── Shader / program creation ─────────────────────────────────────────────

export function createShader(gl, type, source) {
  const shader = gl.createShader(type);
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (gl.getShaderParameter(shader, gl.COMPILE_STATUS)) return shader;
  console.error("Shader compile error:", gl.getShaderInfoLog(shader));
  gl.deleteShader(shader);
  return null;
}

export function createProgram(gl, vs, fs) {
  if (!vs || !fs) return null;
  const prog = gl.createProgram();
  gl.attachShader(prog, vs);
  gl.attachShader(prog, fs);
  gl.linkProgram(prog);
  if (gl.getProgramParameter(prog, gl.LINK_STATUS)) return prog;
  console.error("Program link error:", gl.getProgramInfoLog(prog));
  gl.deleteProgram(prog);
  return null;
}

// Standard full-screen quad vertex shader (clip-space position only)
export const FULLSCREEN_VS = `
attribute vec2 a_position;
void main() { gl_Position = vec4(a_position, 0.0, 1.0); }
`;

// Full-screen quad geometry (two triangles)
const QUAD_VERTS = new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]);

// ─── useWebGL hook ────────────────────────────────────────────────────────
/**
 * Sets up a WebGL canvas that runs a full-screen fragment shader.
 *
 * @param {string} fragmentSource   - GLSL fragment shader source
 * @param {object} opts
 *   opts.onSetup(gl, prog, locs)   - called once after program links; return cleanup fn
 *   opts.onFrame(gl, prog, locs, t)- called every rAF; draw here
 *   opts.onMouse(event, canvas)    - optional mouse-move handler (returns nothing)
 *   opts.antialias                 - passed to getContext (default true)
 *
 * Returns { canvasRef }
 */
export function useWebGL(fragmentSource, { onSetup, onFrame, onMouse } = {}) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const gl = canvas.getContext("webgl", { antialias: true });
    if (!gl) { console.error("WebGL not supported"); return; }

    const vs = createShader(gl, gl.VERTEX_SHADER, FULLSCREEN_VS);
    const fs = createShader(gl, gl.FRAGMENT_SHADER, fragmentSource);
    const prog = createProgram(gl, vs, fs);
    if (!prog) return;

    // Upload quad
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, QUAD_VERTS, gl.STATIC_DRAW);
    const aPos = gl.getAttribLocation(prog, "a_position");
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

    // Standard uniform locations
    const locs = {
      u_resolution: gl.getUniformLocation(prog, "u_resolution"),
      u_time:       gl.getUniformLocation(prog, "u_time"),
      u_mouse:      gl.getUniformLocation(prog, "u_mouse"),
    };

    // Resize helper — makes canvas square to parent width
    const resize = () => {
      const p = canvas.parentElement;
      if (!p) return;
      canvas.width = p.clientWidth;
      canvas.height = p.clientWidth;
    };
    resize();
    window.addEventListener("resize", resize);

    // Let the caller add extra uniform locations / state
    let extraCleanup;
    if (onSetup) extraCleanup = onSetup(gl, prog, locs);

    // Mouse tracking
    const mouseState = { x: 0, y: 0 };
    const handleMouse = (e) => {
      const r = canvas.getBoundingClientRect();
      mouseState.x = ((e.clientX - r.left) / canvas.width) * 2 - 1;
      mouseState.y = -(((e.clientY - r.top) / canvas.height) * 2 - 1);
      if (onMouse) onMouse(e, canvas, mouseState);
    };
    canvas.addEventListener("mousemove", handleMouse);

    // rAF render loop
    const start = performance.now();
    let raf;
    const loop = () => {
      const t = (performance.now() - start) * 0.001;
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.useProgram(prog);
      gl.bindBuffer(gl.ARRAY_BUFFER, buf);
      gl.enableVertexAttribArray(aPos);
      gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);
      if (locs.u_resolution) gl.uniform2f(locs.u_resolution, canvas.width, canvas.height);
      if (locs.u_time)       gl.uniform1f(locs.u_time, t);
      if (locs.u_mouse)      gl.uniform2f(locs.u_mouse, mouseState.x, mouseState.y);
      if (onFrame) onFrame(gl, prog, locs, t);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
      raf = requestAnimationFrame(loop);
    };
    loop();

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      canvas.removeEventListener("mousemove", handleMouse);
      if (extraCleanup) extraCleanup();
      gl.deleteProgram(prog);
      gl.deleteShader(vs);
      gl.deleteShader(fs);
      gl.deleteBuffer(buf);
    };
  }, []);   // intentionally stable — fragment source is constant per component

  return canvasRef;
}

// ─── use2DCanvas hook ─────────────────────────────────────────────────────
/**
 * Sets up a 2D canvas with resize + rAF.
 *
 * @param {function} draw(ctx, canvas, t, dt) - called every frame
 * @param {function} setupEvents(canvas)      - optional; return cleanup fn
 */
export function use2DCanvas(draw, setupEvents) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resize = () => {
      const p = canvas.parentElement;
      if (!p) return;
      canvas.width = p.clientWidth;
      canvas.height = p.clientWidth;
    };
    resize();
    window.addEventListener("resize", resize);

    let eventsCleanup;
    if (setupEvents) eventsCleanup = setupEvents(canvas);

    const start = performance.now();
    let prev = start, raf;
    const loop = (now) => {
      const t  = (now - start) * 0.001;
      const dt = (now - prev)  * 0.001;
      prev = now;
      draw(ctx, canvas, t, dt);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      if (eventsCleanup) eventsCleanup();
    };
  }, []);

  return canvasRef;
}
