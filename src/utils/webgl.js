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
      u_drag:       gl.getUniformLocation(prog, "u_drag"),
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

    // Prevent default scroll on touch
    canvas.style.touchAction = "none";

    // Let the caller add extra uniform locations / state
    let extraCleanup;
    if (onSetup) extraCleanup = onSetup(gl, prog, locs);

    // Mouse & Drag tracking
    const mouseState = { x: 0, y: 0 };
    const dragState  = { x: 0, y: 0, isDragging: false, lastX: 0, lastY: 0 };

    const getCoords = (clientX, clientY) => {
      const r = canvas.getBoundingClientRect();
      return {
        x: ((clientX - r.left) / canvas.width) * 2 - 1,
        y: -(((clientY - r.top) / canvas.height) * 2 - 1)
      };
    };

    const handlePointerDown = (e) => {
      dragState.isDragging = true;
      const pts = e.touches ? e.touches[0] : e;
      const c = getCoords(pts.clientX, pts.clientY);
      mouseState.x = c.x; mouseState.y = c.y;
      dragState.lastX = c.x; dragState.lastY = c.y;
    };

    const handlePointerMove = (e) => {
      // For touch events, e.touches might be empty on end, but move will have it
      const pts = e.touches ? e.touches[0] : e;
      if (!pts) return;
      const c = getCoords(pts.clientX, pts.clientY);
      mouseState.x = c.x; mouseState.y = c.y;
      
      if (dragState.isDragging) {
        dragState.x -= (c.x - dragState.lastX) * 2.0; // Reversed for natural pan feeling
        dragState.y += (c.y - dragState.lastY) * 2.0;
        dragState.lastX = c.x; dragState.lastY = c.y;
      }
      if (onMouse) onMouse(e, canvas, mouseState);
    };

    const handlePointerUp = () => { dragState.isDragging = false; };

    canvas.addEventListener("mousedown", handlePointerDown);
    canvas.addEventListener("mousemove", handlePointerMove);
    window.addEventListener("mouseup",   handlePointerUp);
    
    canvas.addEventListener("touchstart", handlePointerDown, { passive: true });
    canvas.addEventListener("touchmove",  handlePointerMove, { passive: true });
    window.addEventListener("touchend",   handlePointerUp);

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
      if (locs.u_drag)       gl.uniform2f(locs.u_drag, dragState.x, dragState.y);
      if (onFrame) onFrame(gl, prog, locs, t);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
      raf = requestAnimationFrame(loop);
    };
    loop();

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      canvas.removeEventListener("mousedown", handlePointerDown);
      canvas.removeEventListener("mousemove", handlePointerMove);
      window.removeEventListener("mouseup",   handlePointerUp);
      canvas.removeEventListener("touchstart", handlePointerDown);
      canvas.removeEventListener("touchmove",  handlePointerMove);
      window.removeEventListener("touchend",   handlePointerUp);
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
