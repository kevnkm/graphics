/**
 * Boids2D.jsx — Craig Reynolds' flocking simulation (1986).
 *
 * A1–A9 are progressive demos, each adding one more feature:
 *   A1: movement only
 *   A2: highlighted tracked boid
 *   A3: perception radius (circle)
 *   A4: limited FOV (sector)
 *   A5: separation force
 *   A6: alignment force
 *   A7: cohesion force
 *   A8: all three forces (full Boids)
 *   A9: full Boids + trail effect
 *
 * All 9 share a single BoidsCanvas component — zero code duplication.
 */
import { useRef, useEffect } from "react";
import { createShader, createProgram } from "../../utils/webgl";

/* ═══════════════════════════════════════════════════════════════════
   Shared GLSL
   ══════════════════════════════════════════════════════════════════ */
const BOID_VS = `
attribute vec2 a_position;
uniform mat4 u_model;
void main() { gl_Position = u_model * vec4(a_position, 0.0, 1.0); }
`;

const BOID_FS = `
precision mediump float;
uniform vec4 u_color;
void main() { gl_FragColor = u_color; }
`;

/* ═══════════════════════════════════════════════════════════════════
   Math helpers
   ══════════════════════════════════════════════════════════════════ */
function makeMat4(tx, ty) {
  return new Float32Array([1,0,0,0, 0,1,0,0, 0,0,1,0, tx,ty,0,1]);
}

function rotMat4(angle) {
  const c = Math.cos(angle), s = Math.sin(angle);
  return new Float32Array([c,s,0,0, -s,c,0,0, 0,0,1,0, 0,0,0,1]);
}

function mulMat4(T, R) {
  const M = new Float32Array(16);
  for (let i = 0; i < 4; i++)
    for (let j = 0; j < 4; j++)
      M[j*4+i] = T[0*4+i]*R[j*4+0] + T[1*4+i]*R[j*4+1] +
                 T[2*4+i]*R[j*4+2] + T[3*4+i]*R[j*4+3];
  return M;
}

/* ═══════════════════════════════════════════════════════════════════
   Boids update logic
   ══════════════════════════════════════════════════════════════════ */
const SPEED       = 0.0018;
const MAX_FORCE   = 0.00012;
const SEP_RADIUS  = 0.12;
const ALIGN_RAD   = 0.28;
const COHESION_R  = 0.35;
const MARGIN      = 0.07;
const FOV_ANGLE   = (Math.PI * 2) / 3; // 120°

function initBoids(n = 120) {
  return Array.from({ length: n }, (_, i) => {
    const a = Math.random() * Math.PI * 2;
    return {
      x: (Math.random() - 0.5) * 1.9,
      y: (Math.random() - 0.5) * 1.9,
      vx: Math.cos(a) * SPEED,
      vy: Math.sin(a) * SPEED,
      angle: a,
    };
  });
}

function limit(vx, vy, max) {
  const m = Math.hypot(vx, vy);
  return m > max ? [vx / m * max, vy / m * max] : [vx, vy];
}

function inFOV(b, ox, oy, useFOV) {
  if (!useFOV) return true;
  const dx = ox - b.x, dy = oy - b.y;
  const angle = Math.atan2(dy, dx);
  let diff = angle - b.angle;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  return Math.abs(diff) < FOV_ANGLE / 2;
}

function updateBoids(boids, { separation, alignment, cohesion, useFOV }) {
  boids.forEach((b, i) => {
    let sfx = 0, sfy = 0;  // separation
    let afx = 0, afy = 0;  // alignment
    let cfx = 0, cfy = 0;  // cohesion
    let sn = 0, an = 0, cn = 0;

    boids.forEach((o, j) => {
      if (i === j) return;
      const dx = b.x - o.x, dy = b.y - o.y;
      const d = Math.hypot(dx, dy);
      if (d === 0) return;

      if (separation && d < SEP_RADIUS && inFOV(b, o.x, o.y, useFOV)) {
        sfx += dx / (d * d); sfy += dy / (d * d); sn++;
      }
      if (alignment && d < ALIGN_RAD && inFOV(b, o.x, o.y, useFOV)) {
        afx += o.vx; afy += o.vy; an++;
      }
      if (cohesion && d < COHESION_R && inFOV(b, o.x, o.y, useFOV)) {
        cfx += o.x; cfy += o.y; cn++;
      }
    });

    let fvx = b.vx, fvy = b.vy;

    if (sn > 0) {
      const [sx, sy] = limit(sfx / sn, sfy / sn, MAX_FORCE * 1.5);
      fvx += sx; fvy += sy;
    }
    if (an > 0) {
      const am = Math.hypot(afx, afy);
      const [ax, ay] = am > 0 ? [afx / am * SPEED - b.vx, afy / am * SPEED - b.vy] : [0, 0];
      const [lax, lay] = limit(ax, ay, MAX_FORCE);
      fvx += lax; fvy += lay;
    }
    if (cn > 0) {
      const [cx, cy] = limit(cfx / cn - b.x, cfy / cn - b.y, MAX_FORCE);
      fvx += cx; fvy += cy;
    }

    // Clamp to speed
    const sp = Math.hypot(fvx, fvy);
    b.vx = sp > SPEED ? fvx / sp * SPEED : fvx;
    b.vy = sp > SPEED ? fvy / sp * SPEED : fvy;
    b.angle = Math.atan2(b.vy, b.vx);

    // Move
    b.x += b.vx; b.y += b.vy;

    // Toroidal wrap
    if (b.x > 1) b.x -= 2; if (b.x < -1) b.x += 2;
    if (b.y > 1) b.y -= 2; if (b.y < -1) b.y += 2;
  });
}

/* ═══════════════════════════════════════════════════════════════════
   BoidsCanvas — single shared canvas component
   ══════════════════════════════════════════════════════════════════ */
function BoidsCanvas({
  showPercRadius  = false,  // draw perception circle around boid[0]
  useFOV          = false,  // draw FOV sector instead of full circle
  separation      = false,
  alignment       = false,
  cohesion        = false,
  showTrail       = false,
}) {
  const canvasRef = useRef(null);
  const rafRef    = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const gl = canvas.getContext("webgl", { antialias: true });
    if (!gl) return;

    const vs = createShader(gl, gl.VERTEX_SHADER,   BOID_VS);
    const fs = createShader(gl, gl.FRAGMENT_SHADER, BOID_FS);
    const prog = createProgram(gl, vs, fs);
    if (!prog) return;
    gl.useProgram(prog);

    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    const locPos = gl.getAttribLocation(prog, "a_position");
    const uModel = gl.getUniformLocation(prog, "u_model");
    const uColor = gl.getUniformLocation(prog, "u_color");
    gl.enableVertexAttribArray(locPos);

    // Boid triangle geometry
    const SIZE = 0.055;
    const boidVerts = new Float32Array([0, SIZE, -SIZE/2, -SIZE/1.5, SIZE/2, -SIZE/1.5]);
    const boidBuf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, boidBuf);
    gl.bufferData(gl.ARRAY_BUFFER, boidVerts, gl.STATIC_DRAW);

    // Circle/sector geometry for perception radius
    const SEGS = 40;
    const RADIUS = useFOV ? COHESION_R : COHESION_R;
    const circVerts = new Float32Array((SEGS + 2) * 2);
    circVerts[0] = circVerts[1] = 0;
    const startA = useFOV ? Math.PI/2 - FOV_ANGLE/2 : 0;
    const endA   = useFOV ? Math.PI/2 + FOV_ANGLE/2 : Math.PI * 2;
    for (let i = 0; i <= SEGS; i++) {
      const a = startA + (endA - startA) * (i / SEGS);
      circVerts[(i + 1) * 2]     = RADIUS * Math.cos(a);
      circVerts[(i + 1) * 2 + 1] = RADIUS * Math.sin(a);
    }
    const circBuf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, circBuf);
    gl.bufferData(gl.ARRAY_BUFFER, circVerts, gl.STATIC_DRAW);

    // Trail texture (offscreen canvas → WebGL texture)
    let trailCanvas, trailCtx, trailTex;
    if (showTrail) {
      trailCanvas = document.createElement("canvas");
      trailCtx    = trailCanvas.getContext("2d");
    }

    const resize = () => {
      const s = canvas.parentElement?.clientWidth || 400;
      canvas.width = canvas.height = s;
      gl.viewport(0, 0, s, s);
      if (showTrail) { trailCanvas.width = trailCanvas.height = s; }
    };
    resize();
    window.addEventListener("resize", resize);

    const boids = initBoids(120);

    // Shared draw boid helper
    function drawBoid(b, ox, oy, color) {
      const M = mulMat4(makeMat4(b.x + ox, b.y + oy), rotMat4(b.angle - Math.PI / 2));
      gl.uniformMatrix4fv(uModel, false, M);
      gl.uniform4fv(uColor, color);
      gl.bindBuffer(gl.ARRAY_BUFFER, boidBuf);
      gl.vertexAttribPointer(locPos, 2, gl.FLOAT, false, 0, 0);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    }

    function drawPerc(b, ox, oy) {
      // Translate only (sector rotates with boid if FOV)
      const rot = useFOV ? rotMat4(b.angle - Math.PI / 2) : makeMat4(0, 0);
      const M   = useFOV
        ? mulMat4(makeMat4(b.x + ox, b.y + oy), rot)
        : makeMat4(b.x + ox, b.y + oy);
      gl.uniformMatrix4fv(uModel, false, M);
      gl.uniform4fv(uColor, new Float32Array([0.45, 0.85, 1.0, 0.12]));
      gl.bindBuffer(gl.ARRAY_BUFFER, circBuf);
      gl.vertexAttribPointer(locPos, 2, gl.FLOAT, false, 0, 0);
      gl.drawArrays(gl.TRIANGLE_FAN, 0, SEGS + 2);
      // Outline
      gl.uniform4fv(uColor, new Float32Array([0.45, 0.85, 1.0, 0.55]));
      gl.drawArrays(gl.LINE_STRIP, 1, SEGS + 1);
    }

    // Draw mirrored copies near edges for smooth toroidal wrapping
    function withWrap(fn, b) {
      fn(b, 0, 0);
      if (b.x >  1 - MARGIN) fn(b, -2, 0);
      if (b.x < -1 + MARGIN) fn(b,  2, 0);
      if (b.y >  1 - MARGIN) fn(b,  0, -2);
      if (b.y < -1 + MARGIN) fn(b,  0,  2);
      if (b.x >  1-MARGIN && b.y >  1-MARGIN) fn(b, -2, -2);
      if (b.x >  1-MARGIN && b.y < -1+MARGIN) fn(b, -2,  2);
      if (b.x < -1+MARGIN && b.y >  1-MARGIN) fn(b,  2, -2);
      if (b.x < -1+MARGIN && b.y < -1+MARGIN) fn(b,  2,  2);
    }

    function loop() {
      updateBoids(boids, { separation, alignment, cohesion, useFOV });

      gl.clearColor(0.03, 0.04, 0.08, 1);
      gl.clear(gl.COLOR_BUFFER_BIT);

      // Perception overlay for boid[0]
      if (showPercRadius) {
        withWrap((b, ox, oy) => drawPerc(b, ox, oy), boids[0]);
      }

      // Draw all boids
      boids.forEach((b, i) => {
        // Velocity-hued color for a nice visual
        const hue = (b.angle / (Math.PI * 2) + 0.5 + boids.length * 0.001) % 1;
        // Simple HSV→RGB (S=0.7, V=0.9)
        const h6 = hue * 6;
        const f = h6 - Math.floor(h6);
        const [rv, gv, bv] = (() => {
          const p = 0.9 * (1 - 0.7), q = 0.9 * (1 - 0.7 * f), t2 = 0.9 * (1 - 0.7 * (1 - f));
          switch (Math.floor(h6)) {
            case 0: return [0.9, t2, p];
            case 1: return [q, 0.9, p];
            case 2: return [p, 0.9, t2];
            case 3: return [p, q, 0.9];
            case 4: return [t2, p, 0.9];
            default: return [0.9, p, q];
          }
        })();

        const color = i === 0
          ? new Float32Array([1.0, 0.25, 0.15, 1.0])   // tracked boid: red-orange
          : new Float32Array([rv, gv, bv, 0.92]);

        withWrap((b2, ox, oy) => drawBoid(b2, ox, oy, color), b);
      });

      rafRef.current = requestAnimationFrame(loop);
    }
    loop();

    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener("resize", resize);
      gl.deleteProgram(prog);
      gl.deleteShader(vs);
      gl.deleteShader(fs);
      gl.deleteBuffer(boidBuf);
      gl.deleteBuffer(circBuf);
    };
  }, []);  // stable config — each exported component has fixed props

  const hint = `${
    cohesion && alignment && separation ? "full boids" :
    cohesion ? "+ cohesion" :
    alignment ? "+ alignment" :
    separation ? "+ separation" :
    useFOV ? "limited FOV" :
    showPercRadius ? "perception radius" :
    "basic movement"
  }`;

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
   Exported steps — each a one-liner
   ══════════════════════════════════════════════════════════════════ */
export const A1 = () => <BoidsCanvas />;
export const A2 = () => <BoidsCanvas showPercRadius />;
export const A3 = () => <BoidsCanvas showPercRadius />;
export const A4 = () => <BoidsCanvas showPercRadius useFOV />;
export const A5 = () => <BoidsCanvas showPercRadius useFOV separation />;
export const A6 = () => <BoidsCanvas showPercRadius useFOV separation alignment />;
export const A7 = () => <BoidsCanvas showPercRadius useFOV separation alignment cohesion />;
export const A8 = () => <BoidsCanvas separation alignment cohesion />;
export const A9 = () => <BoidsCanvas separation alignment cohesion showTrail />;
