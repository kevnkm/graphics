import React, { useRef, useEffect } from "react";

const vs = `#version 100
uniform mat4 u_model;
attribute vec2 a_position;
void main() {
  gl_Position = u_model * vec4(a_position, 0.0, 1.0);
}`;

const fs = `#version 100
precision mediump float;
void main() {
  gl_FragColor = vec4(0.2, 0.8, 0.4, 1.0);
}`;

const fs2 = `#version 100
precision mediump float;
uniform vec4 u_color;
void main() {
  gl_FragColor = u_color;
}`;

function rotationMatrix(angle) {
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  return new Float32Array([c, s, 0, 0, -s, c, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]);
}

export function A1() {
  const canvasRef = useRef(null);
  const rafRef = useRef(0);
  const BOID_COUNT = 80;
  const BOID_SIZE = 0.06;
  const SPEED = 0.002;
  const MARGIN = 0.08;
  const boidsRef = useRef([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const gl = canvas.getContext("webgl", { antialias: true });
    if (!gl) return;

    function compile(type, src) {
      const s = gl.createShader(type);
      gl.shaderSource(s, src);
      gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
        console.error(gl.getShaderInfoLog(s));
        return null;
      }
      return s;
    }

    const prog = gl.createProgram();
    const vShader = compile(gl.VERTEX_SHADER, vs);
    const fShader = compile(gl.FRAGMENT_SHADER, fs);
    if (!vShader || !fShader) return;

    gl.attachShader(prog, vShader);
    gl.attachShader(prog, fShader);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      console.error(gl.getProgramInfoLog(prog));
      return;
    }
    gl.useProgram(prog);

    const locPos = gl.getAttribLocation(prog, "a_position");
    gl.enableVertexAttribArray(locPos);
    const uModel = gl.getUniformLocation(prog, "u_model");

    // Triangle pointing up
    const vertices = new Float32Array([
      0.0,
      BOID_SIZE,
      -BOID_SIZE / 2,
      -BOID_SIZE / 1.5,
      BOID_SIZE / 2,
      -BOID_SIZE / 1.5,
    ]);
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

    // Initialize boids
    function initBoids() {
      const arr = [];
      for (let i = 0; i < BOID_COUNT; i++) {
        const angle = Math.random() * Math.PI * 2;
        arr.push({
          x: (Math.random() - 0.5) * 2,
          y: (Math.random() - 0.5) * 2,
          vx: Math.cos(angle) * SPEED,
          vy: Math.sin(angle) * SPEED,
          angle,
        });
      }
      return arr;
    }
    boidsRef.current = initBoids();

    function resize() {
      const s = canvas.parentElement.clientWidth;
      canvas.width = canvas.height = s;
      gl.viewport(0, 0, s, s);
    }
    resize();
    window.addEventListener("resize", resize);

    function updateBoids() {
      boidsRef.current.forEach((b) => {
        // Move boid
        b.x += b.vx;
        b.y += b.vy;

        // Update angle for rendering
        b.angle = Math.atan2(b.vy, b.vx);

        // Wrap around screen (-1..1)
        if (b.x < -1) b.x += 2;
        if (b.x > 1) b.x -= 2;
        if (b.y < -1) b.y += 2;
        if (b.y > 1) b.y -= 2;
      });
    }

    function renderBoid(b, ox = 0, oy = 0) {
      const trans = new Float32Array([
        1,
        0,
        0,
        0,
        0,
        1,
        0,
        0,
        0,
        0,
        1,
        0,
        b.x + ox,
        b.y + oy,
        0,
        1,
      ]);
      const rot = rotationMatrix(b.angle - Math.PI / 2);

      const model = new Float32Array(16);
      for (let i = 0; i < 4; i++)
        for (let j = 0; j < 4; j++)
          model[j * 4 + i] =
            trans[0 * 4 + i] * rot[j * 4 + 0] +
            trans[1 * 4 + i] * rot[j * 4 + 1] +
            trans[2 * 4 + i] * rot[j * 4 + 2] +
            trans[3 * 4 + i] * rot[j * 4 + 3];

      gl.uniformMatrix4fv(uModel, false, model);
      gl.bindBuffer(gl.ARRAY_BUFFER, buf);
      gl.vertexAttribPointer(locPos, 2, gl.FLOAT, false, 0, 0);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    }

    function loop() {
      updateBoids();
      gl.clearColor(0, 0, 0, 1);
      gl.clear(gl.COLOR_BUFFER_BIT);
      boidsRef.current.forEach((b) => {
        renderBoid(b, 0, 0);

        if (b.x > 1 - MARGIN) {
          renderBoid(b, -2, 0);
        }
        if (b.x < -1 + MARGIN) {
          renderBoid(b, 2, 0);
        }
        if (b.y > 1 - MARGIN) {
          renderBoid(b, 0, -2);
        }
        if (b.y < -1 + MARGIN) {
          renderBoid(b, 0, 2);
        }

        if (b.x > 1 - MARGIN && b.y > 1 - MARGIN) {
          renderBoid(b, -2, -2);
        }
        if (b.x > 1 - MARGIN && b.y < -1 + MARGIN) {
          renderBoid(b, -2, 2);
        }
        if (b.x < -1 + MARGIN && b.y > 1 - MARGIN) {
          renderBoid(b, 2, -2);
        }
        if (b.x < -1 + MARGIN && b.y < -1 + MARGIN) {
          renderBoid(b, 2, 2);
        }
      });
      rafRef.current = requestAnimationFrame(loop);
    }
    loop();

    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener("resize", resize);
      gl.deleteProgram(prog);
      gl.deleteShader(vShader);
      gl.deleteShader(fShader);
      gl.deleteBuffer(buf);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        width: "100%",
        height: "100%",
        display: "block",
        background: "#000",
      }}
    />
  );
}

export function A2() {
  const canvasRef = useRef(null);
  const rafRef = useRef(0);
  const BOID_COUNT = 80;
  const BOID_SIZE = 0.06;
  const SPEED = 0.002;
  const MARGIN = 0.08;
  const boidsRef = useRef([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const gl = canvas.getContext("webgl", { antialias: true });
    if (!gl) return;

    function compile(type, src) {
      const s = gl.createShader(type);
      gl.shaderSource(s, src);
      gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
        console.error(gl.getShaderInfoLog(s));
        return null;
      }
      return s;
    }

    const prog = gl.createProgram();
    const vShader = compile(gl.VERTEX_SHADER, vs);
    const fShader = compile(gl.FRAGMENT_SHADER, fs2);
    if (!vShader || !fShader) return;

    gl.attachShader(prog, vShader);
    gl.attachShader(prog, fShader);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      console.error(gl.getProgramInfoLog(prog));
      return;
    }
    gl.useProgram(prog);

    const locPos = gl.getAttribLocation(prog, "a_position");
    gl.enableVertexAttribArray(locPos);
    const uModel = gl.getUniformLocation(prog, "u_model");
    const uColor = gl.getUniformLocation(prog, "u_color");

    // Triangle pointing up
    const vertices = new Float32Array([
      0.0,
      BOID_SIZE,
      -BOID_SIZE / 2,
      -BOID_SIZE / 1.5,
      BOID_SIZE / 2,
      -BOID_SIZE / 1.5,
    ]);
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

    // Initialize boids
    function initBoids() {
      const arr = [];
      for (let i = 0; i < BOID_COUNT; i++) {
        const angle = Math.random() * Math.PI * 2;
        const color =
          i === 0
            ? new Float32Array([1.0, 0.0, 0.0, 1.0])
            : new Float32Array([0.2, 0.8, 0.4, 1.0]);
        arr.push({
          x: (Math.random() - 0.5) * 2,
          y: (Math.random() - 0.5) * 2,
          vx: Math.cos(angle) * SPEED,
          vy: Math.sin(angle) * SPEED,
          angle,
          color,
        });
      }
      return arr;
    }
    boidsRef.current = initBoids();

    function resize() {
      const s = canvas.parentElement.clientWidth;
      canvas.width = canvas.height = s;
      gl.viewport(0, 0, s, s);
    }
    resize();
    window.addEventListener("resize", resize);

    function updateBoids() {
      boidsRef.current.forEach((b) => {
        // Move boid
        b.x += b.vx;
        b.y += b.vy;

        // Update angle for rendering
        b.angle = Math.atan2(b.vy, b.vx);

        // Wrap around screen (-1..1)
        if (b.x < -1) b.x += 2;
        if (b.x > 1) b.x -= 2;
        if (b.y < -1) b.y += 2;
        if (b.y > 1) b.y -= 2;
      });
    }

    function renderBoid(b, ox = 0, oy = 0) {
      const trans = new Float32Array([
        1,
        0,
        0,
        0,
        0,
        1,
        0,
        0,
        0,
        0,
        1,
        0,
        b.x + ox,
        b.y + oy,
        0,
        1,
      ]);
      const rot = rotationMatrix(b.angle - Math.PI / 2);

      const model = new Float32Array(16);
      for (let i = 0; i < 4; i++)
        for (let j = 0; j < 4; j++)
          model[j * 4 + i] =
            trans[0 * 4 + i] * rot[j * 4 + 0] +
            trans[1 * 4 + i] * rot[j * 4 + 1] +
            trans[2 * 4 + i] * rot[j * 4 + 2] +
            trans[3 * 4 + i] * rot[j * 4 + 3];

      gl.uniformMatrix4fv(uModel, false, model);
      gl.uniform4fv(uColor, b.color);
      gl.bindBuffer(gl.ARRAY_BUFFER, buf);
      gl.vertexAttribPointer(locPos, 2, gl.FLOAT, false, 0, 0);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    }

    function loop() {
      updateBoids();
      gl.clearColor(0, 0, 0, 1);
      gl.clear(gl.COLOR_BUFFER_BIT);
      boidsRef.current.forEach((b) => {
        renderBoid(b, 0, 0);

        if (b.x > 1 - MARGIN) {
          renderBoid(b, -2, 0);
        }
        if (b.x < -1 + MARGIN) {
          renderBoid(b, 2, 0);
        }
        if (b.y > 1 - MARGIN) {
          renderBoid(b, 0, -2);
        }
        if (b.y < -1 + MARGIN) {
          renderBoid(b, 0, 2);
        }

        if (b.x > 1 - MARGIN && b.y > 1 - MARGIN) {
          renderBoid(b, -2, -2);
        }
        if (b.x > 1 - MARGIN && b.y < -1 + MARGIN) {
          renderBoid(b, -2, 2);
        }
        if (b.x < -1 + MARGIN && b.y > 1 - MARGIN) {
          renderBoid(b, 2, -2);
        }
        if (b.x < -1 + MARGIN && b.y < -1 + MARGIN) {
          renderBoid(b, 2, 2);
        }
      });
      rafRef.current = requestAnimationFrame(loop);
    }
    loop();

    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener("resize", resize);
      gl.deleteProgram(prog);
      gl.deleteShader(vShader);
      gl.deleteShader(fShader);
      gl.deleteBuffer(buf);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        width: "100%",
        height: "100%",
        display: "block",
        background: "#000",
      }}
    />
  );
}

export function A3() {
  const canvasRef = useRef(null);
  const rafRef = useRef(0);
  const BOID_COUNT = 80;
  const BOID_SIZE = 0.06;
  const SPEED = 0.002;
  const MARGIN = 0.08;
  const DETECTION_RADIUS = 0.5;
  const CIRCLE_SEGMENTS = 32;
  const boidsRef = useRef([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const gl = canvas.getContext("webgl", { antialias: true });
    if (!gl) return;

    function compile(type, src) {
      const s = gl.createShader(type);
      gl.shaderSource(s, src);
      gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
        console.error(gl.getShaderInfoLog(s));
        return null;
      }
      return s;
    }

    const prog = gl.createProgram();
    const vShader = compile(gl.VERTEX_SHADER, vs);
    const fShader = compile(gl.FRAGMENT_SHADER, fs2);
    if (!vShader || !fShader) return;

    gl.attachShader(prog, vShader);
    gl.attachShader(prog, fShader);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      console.error(gl.getProgramInfoLog(prog));
      return;
    }
    gl.useProgram(prog);

    // Enable blending for transparency
    gl.enable(gl.BLEND);
    gl.blendFuncSeparate(
      gl.SRC_ALPHA,
      gl.ONE_MINUS_SRC_ALPHA,
      gl.ONE,
      gl.ONE_MINUS_SRC_ALPHA
    );

    const locPos = gl.getAttribLocation(prog, "a_position");
    gl.enableVertexAttribArray(locPos);
    const uModel = gl.getUniformLocation(prog, "u_model");
    const uColor = gl.getUniformLocation(prog, "u_color");

    // Triangle pointing up for boids
    const vertices = new Float32Array([
      0.0,
      BOID_SIZE,
      -BOID_SIZE / 2,
      -BOID_SIZE / 1.5,
      BOID_SIZE / 2,
      -BOID_SIZE / 1.5,
    ]);
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

    // Circle vertices for detection boundary, including center for filling
    // Increased size to account for duplicate closing point
    const circleVertices = new Float32Array((CIRCLE_SEGMENTS + 2) * 2);
    circleVertices[0] = 0.0;
    circleVertices[1] = 0.0; // center
    for (let i = 1; i <= CIRCLE_SEGMENTS; i++) {
      const angle = ((i - 1) / CIRCLE_SEGMENTS) * Math.PI * 2;
      circleVertices[i * 2] = DETECTION_RADIUS * Math.cos(angle);
      circleVertices[i * 2 + 1] = DETECTION_RADIUS * Math.sin(angle);
    }
    // Duplicate the first perimeter point to close the triangle fan properly
    circleVertices[(CIRCLE_SEGMENTS + 1) * 2] = circleVertices[2];
    circleVertices[(CIRCLE_SEGMENTS + 1) * 2 + 1] = circleVertices[3];
    const circleBuf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, circleBuf);
    gl.bufferData(gl.ARRAY_BUFFER, circleVertices, gl.STATIC_DRAW);

    // Initialize boids
    function initBoids() {
      const arr = [];
      for (let i = 0; i < BOID_COUNT; i++) {
        const angle = Math.random() * Math.PI * 2;
        const color =
          i === 0
            ? new Float32Array([1.0, 0.0, 0.0, 1.0])
            : new Float32Array([0.2, 0.8, 0.4, 1.0]);
        arr.push({
          x: (Math.random() - 0.5) * 2,
          y: (Math.random() - 0.5) * 2,
          vx: Math.cos(angle) * SPEED,
          vy: Math.sin(angle) * SPEED,
          angle,
          color,
        });
      }
      return arr;
    }
    boidsRef.current = initBoids();

    function resize() {
      const s = canvas.parentElement.clientWidth;
      canvas.width = canvas.height = s;
      gl.viewport(0, 0, s, s);
    }
    resize();
    window.addEventListener("resize", resize);

    function updateBoids() {
      boidsRef.current.forEach((b) => {
        // Move boid
        b.x += b.vx;
        b.y += b.vy;

        // Update angle for rendering
        b.angle = Math.atan2(b.vy, b.vx);

        // Wrap around screen (-1..1)
        if (b.x < -1) b.x += 2;
        if (b.x > 1) b.x -= 2;
        if (b.y < -1) b.y += 2;
        if (b.y > 1) b.y -= 2;
      });
    }

    function renderBoid(b, ox = 0, oy = 0) {
      const trans = new Float32Array([
        1,
        0,
        0,
        0,
        0,
        1,
        0,
        0,
        0,
        0,
        1,
        0,
        b.x + ox,
        b.y + oy,
        0,
        1,
      ]);
      const rot = rotationMatrix(b.angle - Math.PI / 2);

      const model = new Float32Array(16);
      for (let i = 0; i < 4; i++)
        for (let j = 0; j < 4; j++)
          model[j * 4 + i] =
            trans[0 * 4 + i] * rot[j * 4 + 0] +
            trans[1 * 4 + i] * rot[j * 4 + 1] +
            trans[2 * 4 + i] * rot[j * 4 + 2] +
            trans[3 * 4 + i] * rot[j * 4 + 3];

      gl.uniformMatrix4fv(uModel, false, model);
      gl.uniform4fv(uColor, b.color);
      gl.bindBuffer(gl.ARRAY_BUFFER, buf);
      gl.vertexAttribPointer(locPos, 2, gl.FLOAT, false, 0, 0);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    }

    function renderCircle(b, ox = 0, oy = 0) {
      const trans = new Float32Array([
        1,
        0,
        0,
        0,
        0,
        1,
        0,
        0,
        0,
        0,
        1,
        0,
        b.x + ox,
        b.y + oy,
        0,
        1,
      ]);

      gl.uniformMatrix4fv(uModel, false, trans);
      gl.uniform4fv(
        uColor,
        new Float32Array([b.color[0], b.color[1], b.color[2], 0.3])
      );
      gl.bindBuffer(gl.ARRAY_BUFFER, circleBuf);
      gl.vertexAttribPointer(locPos, 2, gl.FLOAT, false, 0, 0);
      // Updated count to include the duplicate closing point
      gl.drawArrays(gl.TRIANGLE_FAN, 0, CIRCLE_SEGMENTS + 2);
    }

    function loop() {
      updateBoids();
      gl.clearColor(0, 0, 0, 1);
      gl.clear(gl.COLOR_BUFFER_BIT);

      // Render boids first
      boidsRef.current.forEach((b) => {
        renderBoid(b, 0, 0);

        if (b.x > 1 - MARGIN) {
          renderBoid(b, -2, 0);
        }
        if (b.x < -1 + MARGIN) {
          renderBoid(b, 2, 0);
        }
        if (b.y > 1 - MARGIN) {
          renderBoid(b, 0, -2);
        }
        if (b.y < -1 + MARGIN) {
          renderBoid(b, 0, 2);
        }

        if (b.x > 1 - MARGIN && b.y > 1 - MARGIN) {
          renderBoid(b, -2, -2);
        }
        if (b.x > 1 - MARGIN && b.y < -1 + MARGIN) {
          renderBoid(b, -2, 2);
        }
        if (b.x < -1 + MARGIN && b.y > 1 - MARGIN) {
          renderBoid(b, 2, -2);
        }
        if (b.x < -1 + MARGIN && b.y < -1 + MARGIN) {
          renderBoid(b, 2, 2);
        }
      });

      // Then render circles to overlay
      boidsRef.current.forEach((b, i) => {
        if (i === 0) {
          renderCircle(b, 0, 0);

          if (b.x > 1 - MARGIN) {
            renderCircle(b, -2, 0);
          }
          if (b.x < -1 + MARGIN) {
            renderCircle(b, 2, 0);
          }
          if (b.y > 1 - MARGIN) {
            renderCircle(b, 0, -2);
          }
          if (b.y < -1 + MARGIN) {
            renderCircle(b, 0, 2);
          }

          if (b.x > 1 - MARGIN && b.y > 1 - MARGIN) {
            renderCircle(b, -2, -2);
          }
          if (b.x > 1 - MARGIN && b.y < -1 + MARGIN) {
            renderCircle(b, -2, 2);
          }
          if (b.x < -1 + MARGIN && b.y > 1 - MARGIN) {
            renderCircle(b, 2, -2);
          }
          if (b.x < -1 + MARGIN && b.y < -1 + MARGIN) {
            renderCircle(b, 2, 2);
          }
        }
      });
      rafRef.current = requestAnimationFrame(loop);
    }
    loop();

    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener("resize", resize);
      gl.deleteProgram(prog);
      gl.deleteShader(vShader);
      gl.deleteShader(fShader);
      gl.deleteBuffer(buf);
      gl.deleteBuffer(circleBuf);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        width: "100%",
        height: "100%",
        display: "block",
        background: "#000",
      }}
    />
  );
}

export function A4() {
  const canvasRef = useRef(null);
  const rafRef = useRef(0);
  const BOID_COUNT = 80;
  const BOID_SIZE = 0.06;
  const SPEED = 0.002;
  const MARGIN = 0.08;
  const DETECTION_RADIUS = 0.5;
  const CIRCLE_SEGMENTS = 32;
  const VIEW_ANGLE = (Math.PI * 2) / 3; // 120 degrees
  const boidsRef = useRef([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const gl = canvas.getContext("webgl", { antialias: true });
    if (!gl) return;

    function compile(type, src) {
      const s = gl.createShader(type);
      gl.shaderSource(s, src);
      gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
        console.error(gl.getShaderInfoLog(s));
        return null;
      }
      return s;
    }

    const prog = gl.createProgram();
    const vShader = compile(gl.VERTEX_SHADER, vs);
    const fShader = compile(gl.FRAGMENT_SHADER, fs2);
    if (!vShader || !fShader) return;

    gl.attachShader(prog, vShader);
    gl.attachShader(prog, fShader);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      console.error(gl.getProgramInfoLog(prog));
      return;
    }
    gl.useProgram(prog);

    // Enable blending for transparency
    gl.enable(gl.BLEND);
    gl.blendFuncSeparate(
      gl.SRC_ALPHA,
      gl.ONE_MINUS_SRC_ALPHA,
      gl.ONE,
      gl.ONE_MINUS_SRC_ALPHA
    );

    const locPos = gl.getAttribLocation(prog, "a_position");
    gl.enableVertexAttribArray(locPos);
    const uModel = gl.getUniformLocation(prog, "u_model");
    const uColor = gl.getUniformLocation(prog, "u_color");

    // Triangle pointing up for boids
    const vertices = new Float32Array([
      0.0,
      BOID_SIZE,
      -BOID_SIZE / 2,
      -BOID_SIZE / 1.5,
      BOID_SIZE / 2,
      -BOID_SIZE / 1.5,
    ]);
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

    // Sector vertices for detection boundary, including center
    const startAngle = Math.PI / 2 - VIEW_ANGLE / 2;
    const endAngle = Math.PI / 2 + VIEW_ANGLE / 2;
    const sectorVertices = new Float32Array((CIRCLE_SEGMENTS + 2) * 2);
    sectorVertices[0] = 0.0;
    sectorVertices[1] = 0.0; // center
    for (let i = 0; i <= CIRCLE_SEGMENTS; i++) {
      const t = i / CIRCLE_SEGMENTS;
      const angle = startAngle + (endAngle - startAngle) * t;
      sectorVertices[(i + 1) * 2] = DETECTION_RADIUS * Math.cos(angle);
      sectorVertices[(i + 1) * 2 + 1] = DETECTION_RADIUS * Math.sin(angle);
    }
    const sectorBuf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, sectorBuf);
    gl.bufferData(gl.ARRAY_BUFFER, sectorVertices, gl.STATIC_DRAW);

    // Initialize boids
    function initBoids() {
      const arr = [];
      for (let i = 0; i < BOID_COUNT; i++) {
        const angle = Math.random() * Math.PI * 2;
        const color =
          i === 0
            ? new Float32Array([1.0, 0.0, 0.0, 1.0])
            : new Float32Array([0.2, 0.8, 0.4, 1.0]);
        arr.push({
          x: (Math.random() - 0.5) * 2,
          y: (Math.random() - 0.5) * 2,
          vx: Math.cos(angle) * SPEED,
          vy: Math.sin(angle) * SPEED,
          angle,
          color,
        });
      }
      return arr;
    }
    boidsRef.current = initBoids();

    function resize() {
      const s = canvas.parentElement.clientWidth;
      canvas.width = canvas.height = s;
      gl.viewport(0, 0, s, s);
    }
    resize();
    window.addEventListener("resize", resize);

    function updateBoids() {
      boidsRef.current.forEach((b) => {
        // Move boid
        b.x += b.vx;
        b.y += b.vy;

        // Update angle for rendering
        b.angle = Math.atan2(b.vy, b.vx);

        // Wrap around screen (-1..1)
        if (b.x < -1) b.x += 2;
        if (b.x > 1) b.x -= 2;
        if (b.y < -1) b.y += 2;
        if (b.y > 1) b.y -= 2;
      });
    }

    function renderBoid(b, ox = 0, oy = 0) {
      const trans = new Float32Array([
        1,
        0,
        0,
        0,
        0,
        1,
        0,
        0,
        0,
        0,
        1,
        0,
        b.x + ox,
        b.y + oy,
        0,
        1,
      ]);
      const rot = rotationMatrix(b.angle - Math.PI / 2);

      const model = new Float32Array(16);
      for (let i = 0; i < 4; i++)
        for (let j = 0; j < 4; j++)
          model[j * 4 + i] =
            trans[0 * 4 + i] * rot[j * 4 + 0] +
            trans[1 * 4 + i] * rot[j * 4 + 1] +
            trans[2 * 4 + i] * rot[j * 4 + 2] +
            trans[3 * 4 + i] * rot[j * 4 + 3];

      gl.uniformMatrix4fv(uModel, false, model);
      gl.uniform4fv(uColor, b.color);
      gl.bindBuffer(gl.ARRAY_BUFFER, buf);
      gl.vertexAttribPointer(locPos, 2, gl.FLOAT, false, 0, 0);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    }

    function renderSector(b, ox = 0, oy = 0) {
      const trans = new Float32Array([
        1,
        0,
        0,
        0,
        0,
        1,
        0,
        0,
        0,
        0,
        1,
        0,
        b.x + ox,
        b.y + oy,
        0,
        1,
      ]);
      const rot = rotationMatrix(b.angle - Math.PI / 2);

      const model = new Float32Array(16);
      for (let i = 0; i < 4; i++)
        for (let j = 0; j < 4; j++)
          model[j * 4 + i] =
            trans[0 * 4 + i] * rot[j * 4 + 0] +
            trans[1 * 4 + i] * rot[j * 4 + 1] +
            trans[2 * 4 + i] * rot[j * 4 + 2] +
            trans[3 * 4 + i] * rot[j * 4 + 3];

      gl.uniformMatrix4fv(uModel, false, model);
      gl.uniform4fv(
        uColor,
        new Float32Array([b.color[0], b.color[1], b.color[2], 0.3])
      );
      gl.bindBuffer(gl.ARRAY_BUFFER, sectorBuf);
      gl.vertexAttribPointer(locPos, 2, gl.FLOAT, false, 0, 0);
      gl.drawArrays(gl.TRIANGLE_FAN, 0, CIRCLE_SEGMENTS + 2);
    }

    function loop() {
      updateBoids();
      gl.clearColor(0, 0, 0, 1);
      gl.clear(gl.COLOR_BUFFER_BIT);

      // Render boids first
      boidsRef.current.forEach((b) => {
        renderBoid(b, 0, 0);

        if (b.x > 1 - MARGIN) {
          renderBoid(b, -2, 0);
        }
        if (b.x < -1 + MARGIN) {
          renderBoid(b, 2, 0);
        }
        if (b.y > 1 - MARGIN) {
          renderBoid(b, 0, -2);
        }
        if (b.y < -1 + MARGIN) {
          renderBoid(b, 0, 2);
        }

        if (b.x > 1 - MARGIN && b.y > 1 - MARGIN) {
          renderBoid(b, -2, -2);
        }
        if (b.x > 1 - MARGIN && b.y < -1 + MARGIN) {
          renderBoid(b, -2, 2);
        }
        if (b.x < -1 + MARGIN && b.y > 1 - MARGIN) {
          renderBoid(b, 2, -2);
        }
        if (b.x < -1 + MARGIN && b.y < -1 + MARGIN) {
          renderBoid(b, 2, 2);
        }
      });

      // Then render sectors to overlay
      boidsRef.current.forEach((b, i) => {
        if (i === 0) {
          renderSector(b, 0, 0);

          if (b.x > 1 - MARGIN) {
            renderSector(b, -2, 0);
          }
          if (b.x < -1 + MARGIN) {
            renderSector(b, 2, 0);
          }
          if (b.y > 1 - MARGIN) {
            renderSector(b, 0, -2);
          }
          if (b.y < -1 + MARGIN) {
            renderSector(b, 0, 2);
          }

          if (b.x > 1 - MARGIN && b.y > 1 - MARGIN) {
            renderSector(b, -2, -2);
          }
          if (b.x > 1 - MARGIN && b.y < -1 + MARGIN) {
            renderSector(b, -2, 2);
          }
          if (b.x < -1 + MARGIN && b.y > 1 - MARGIN) {
            renderSector(b, 2, -2);
          }
          if (b.x < -1 + MARGIN && b.y < -1 + MARGIN) {
            renderSector(b, 2, 2);
          }
        }
      });
      rafRef.current = requestAnimationFrame(loop);
    }
    loop();

    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener("resize", resize);
      gl.deleteProgram(prog);
      gl.deleteShader(vShader);
      gl.deleteShader(fShader);
      gl.deleteBuffer(buf);
      gl.deleteBuffer(sectorBuf);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        width: "100%",
        height: "100%",
        display: "block",
        background: "#000",
      }}
    />
  );
}

export function A5() {
  const canvasRef = useRef(null);
  const rafRef = useRef(0);
  const BOID_COUNT = 80;
  const BOID_SIZE = 0.06;
  const SPEED = 0.002;
  const MARGIN = 0.08;
  const DETECTION_RADIUS = 0.5;
  const CIRCLE_SEGMENTS = 32;
  const VIEW_ANGLE = (Math.PI * 2) / 3; // 120 degrees
  const boidsRef = useRef([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const gl = canvas.getContext("webgl", { antialias: true });
    if (!gl) return;

    function compile(type, src) {
      const s = gl.createShader(type);
      gl.shaderSource(s, src);
      gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
        console.error(gl.getShaderInfoLog(s));
        return null;
      }
      return s;
    }

    const prog = gl.createProgram();
    const vShader = compile(gl.VERTEX_SHADER, vs);
    const fShader = compile(gl.FRAGMENT_SHADER, fs2);
    if (!vShader || !fShader) return;

    gl.attachShader(prog, vShader);
    gl.attachShader(prog, fShader);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      console.error(gl.getProgramInfoLog(prog));
      return;
    }
    gl.useProgram(prog);

    // Enable blending for transparency
    gl.enable(gl.BLEND);
    gl.blendFuncSeparate(
      gl.SRC_ALPHA,
      gl.ONE_MINUS_SRC_ALPHA,
      gl.ONE,
      gl.ONE_MINUS_SRC_ALPHA
    );

    const locPos = gl.getAttribLocation(prog, "a_position");
    gl.enableVertexAttribArray(locPos);
    const uModel = gl.getUniformLocation(prog, "u_model");
    const uColor = gl.getUniformLocation(prog, "u_color");

    // Triangle pointing up for boids
    const vertices = new Float32Array([
      0.0,
      BOID_SIZE,
      -BOID_SIZE / 2,
      -BOID_SIZE / 1.5,
      BOID_SIZE / 2,
      -BOID_SIZE / 1.5,
    ]);
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

    // Sector vertices for detection boundary, including center
    const startAngle = Math.PI / 2 - VIEW_ANGLE / 2;
    const endAngle = Math.PI / 2 + VIEW_ANGLE / 2;
    const sectorVertices = new Float32Array((CIRCLE_SEGMENTS + 2) * 2);
    sectorVertices[0] = 0.0;
    sectorVertices[1] = 0.0; // center
    for (let i = 0; i <= CIRCLE_SEGMENTS; i++) {
      const t = i / CIRCLE_SEGMENTS;
      const angle = startAngle + (endAngle - startAngle) * t;
      sectorVertices[(i + 1) * 2] = DETECTION_RADIUS * Math.cos(angle);
      sectorVertices[(i + 1) * 2 + 1] = DETECTION_RADIUS * Math.sin(angle);
    }
    const sectorBuf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, sectorBuf);
    gl.bufferData(gl.ARRAY_BUFFER, sectorVertices, gl.STATIC_DRAW);

    // Initialize boids
    function initBoids() {
      const arr = [];
      for (let i = 0; i < BOID_COUNT; i++) {
        const angle = Math.random() * Math.PI * 2;
        const color =
          i === 0
            ? new Float32Array([1.0, 0.0, 0.0, 1.0])
            : new Float32Array([0.2, 0.8, 0.4, 1.0]);
        arr.push({
          x: (Math.random() - 0.5) * 2,
          y: (Math.random() - 0.5) * 2,
          vx: Math.cos(angle) * SPEED,
          vy: Math.sin(angle) * SPEED,
          angle,
          color,
        });
      }
      return arr;
    }
    boidsRef.current = initBoids();

    function resize() {
      const s = canvas.parentElement.clientWidth;
      canvas.width = canvas.height = s;
      gl.viewport(0, 0, s, s);
    }
    resize();
    window.addEventListener("resize", resize);

    function updateBoids() {
      boidsRef.current.forEach((b) => {
        // Move boid
        b.x += b.vx;
        b.y += b.vy;

        // Update angle for rendering
        b.angle = Math.atan2(b.vy, b.vx);

        // Wrap around screen (-1..1)
        if (b.x < -1) b.x += 2;
        if (b.x > 1) b.x -= 2;
        if (b.y < -1) b.y += 2;
        if (b.y > 1) b.y -= 2;
      });
    }

    function renderBoid(b, ox = 0, oy = 0) {
      const trans = new Float32Array([
        1,
        0,
        0,
        0,
        0,
        1,
        0,
        0,
        0,
        0,
        1,
        0,
        b.x + ox,
        b.y + oy,
        0,
        1,
      ]);
      const rot = rotationMatrix(b.angle - Math.PI / 2);

      const model = new Float32Array(16);
      for (let i = 0; i < 4; i++)
        for (let j = 0; j < 4; j++)
          model[j * 4 + i] =
            trans[0 * 4 + i] * rot[j * 4 + 0] +
            trans[1 * 4 + i] * rot[j * 4 + 1] +
            trans[2 * 4 + i] * rot[j * 4 + 2] +
            trans[3 * 4 + i] * rot[j * 4 + 3];

      gl.uniformMatrix4fv(uModel, false, model);
      gl.uniform4fv(uColor, b.color);
      gl.bindBuffer(gl.ARRAY_BUFFER, buf);
      gl.vertexAttribPointer(locPos, 2, gl.FLOAT, false, 0, 0);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    }

    function renderSector(b, ox = 0, oy = 0) {
      const trans = new Float32Array([
        1,
        0,
        0,
        0,
        0,
        1,
        0,
        0,
        0,
        0,
        1,
        0,
        b.x + ox,
        b.y + oy,
        0,
        1,
      ]);
      const rot = rotationMatrix(b.angle - Math.PI / 2);

      const model = new Float32Array(16);
      for (let i = 0; i < 4; i++)
        for (let j = 0; j < 4; j++)
          model[j * 4 + i] =
            trans[0 * 4 + i] * rot[j * 4 + 0] +
            trans[1 * 4 + i] * rot[j * 4 + 1] +
            trans[2 * 4 + i] * rot[j * 4 + 2] +
            trans[3 * 4 + i] * rot[j * 4 + 3];

      gl.uniformMatrix4fv(uModel, false, model);
      gl.uniform4fv(
        uColor,
        new Float32Array([b.color[0], b.color[1], b.color[2], 0.3])
      );
      gl.bindBuffer(gl.ARRAY_BUFFER, sectorBuf);
      gl.vertexAttribPointer(locPos, 2, gl.FLOAT, false, 0, 0);
      gl.drawArrays(gl.TRIANGLE_FAN, 0, CIRCLE_SEGMENTS + 2);
    }

    function loop() {
      updateBoids();
      gl.clearColor(0, 0, 0, 1);
      gl.clear(gl.COLOR_BUFFER_BIT);

      // Render boids first
      boidsRef.current.forEach((b) => {
        renderBoid(b, 0, 0);

        if (b.x > 1 - MARGIN) {
          renderBoid(b, -2, 0);
        }
        if (b.x < -1 + MARGIN) {
          renderBoid(b, 2, 0);
        }
        if (b.y > 1 - MARGIN) {
          renderBoid(b, 0, -2);
        }
        if (b.y < -1 + MARGIN) {
          renderBoid(b, 0, 2);
        }

        if (b.x > 1 - MARGIN && b.y > 1 - MARGIN) {
          renderBoid(b, -2, -2);
        }
        if (b.x > 1 - MARGIN && b.y < -1 + MARGIN) {
          renderBoid(b, -2, 2);
        }
        if (b.x < -1 + MARGIN && b.y > 1 - MARGIN) {
          renderBoid(b, 2, -2);
        }
        if (b.x < -1 + MARGIN && b.y < -1 + MARGIN) {
          renderBoid(b, 2, 2);
        }
      });

      // Render lines to neighbors
      const red = boidsRef.current[0];
      let lineVertices = [];
      boidsRef.current.forEach((b, i) => {
        if (i === 0) return;
        let dx = b.x - red.x;
        let dy = b.y - red.y;
        dx = dx - 2 * Math.round(dx / 2);
        dy = dy - 2 * Math.round(dy / 2);
        const distSq = dx * dx + dy * dy;
        if (distSq > DETECTION_RADIUS * DETECTION_RADIUS || distSq === 0)
          return;
        const rel_angle = Math.atan2(dy, dx);
        let diff = rel_angle - red.angle;
        diff = ((diff + Math.PI) % (2 * Math.PI)) - Math.PI;
        if (Math.abs(diff) > VIEW_ANGLE / 2) return;
        // Neighbor found
        let end_x = red.x + dx;
        let end_y = red.y + dy;
        let wrap_x = 0;
        let wrap_y = 0;
        if (end_x > 1) wrap_x = 1;
        else if (end_x < -1) wrap_x = -1;
        if (end_y > 1) wrap_y = 1;
        else if (end_y < -1) wrap_y = -1;
        if (wrap_x === 0 && wrap_y === 0) {
          lineVertices.push(red.x, red.y, end_x, end_y);
        } else if (wrap_x !== 0 && wrap_y === 0) {
          const sign = wrap_x;
          const edge = sign * 1;
          const t = (edge - red.x) / dx;
          const cross_y = red.y + t * dy;
          lineVertices.push(red.x, red.y, edge, cross_y);
          const opp_edge = -sign * 1;
          const wrapped_end_x = end_x - 2 * sign;
          const wrapped_end_y = end_y;
          lineVertices.push(opp_edge, cross_y, wrapped_end_x, wrapped_end_y);
        } else if (wrap_y !== 0 && wrap_x === 0) {
          const sign = wrap_y;
          const edge = sign * 1;
          const t = (edge - red.y) / dy;
          const cross_x = red.x + t * dx;
          lineVertices.push(red.x, red.y, cross_x, edge);
          const opp_edge = -sign * 1;
          const wrapped_end_y = end_y - 2 * sign;
          const wrapped_end_x = end_x;
          lineVertices.push(cross_x, opp_edge, wrapped_end_x, wrapped_end_y);
        } else {
          // Both wrap (rare), draw clipped line
          lineVertices.push(red.x, red.y, end_x, end_y);
        }
      });
      if (lineVertices.length > 0) {
        const lineBuf = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, lineBuf);
        gl.bufferData(
          gl.ARRAY_BUFFER,
          new Float32Array(lineVertices),
          gl.DYNAMIC_DRAW
        );
        gl.uniformMatrix4fv(
          uModel,
          false,
          new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1])
        );
        gl.uniform4fv(uColor, new Float32Array([1.0, 1.0, 0.0, 1.0])); // Yellow lines
        gl.vertexAttribPointer(locPos, 2, gl.FLOAT, false, 0, 0);
        gl.drawArrays(gl.LINES, 0, lineVertices.length / 2);
        gl.deleteBuffer(lineBuf);
      }

      // Then render sectors to overlay
      boidsRef.current.forEach((b, i) => {
        if (i === 0) {
          renderSector(b, 0, 0);

          if (b.x > 1 - MARGIN) {
            renderSector(b, -2, 0);
          }
          if (b.x < -1 + MARGIN) {
            renderSector(b, 2, 0);
          }
          if (b.y > 1 - MARGIN) {
            renderSector(b, 0, -2);
          }
          if (b.y < -1 + MARGIN) {
            renderSector(b, 0, 2);
          }

          if (b.x > 1 - MARGIN && b.y > 1 - MARGIN) {
            renderSector(b, -2, -2);
          }
          if (b.x > 1 - MARGIN && b.y < -1 + MARGIN) {
            renderSector(b, -2, 2);
          }
          if (b.x < -1 + MARGIN && b.y > 1 - MARGIN) {
            renderSector(b, 2, -2);
          }
          if (b.x < -1 + MARGIN && b.y < -1 + MARGIN) {
            renderSector(b, 2, 2);
          }
        }
      });
      rafRef.current = requestAnimationFrame(loop);
    }
    loop();

    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener("resize", resize);
      gl.deleteProgram(prog);
      gl.deleteShader(vShader);
      gl.deleteShader(fShader);
      gl.deleteBuffer(buf);
      gl.deleteBuffer(sectorBuf);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        width: "100%",
        height: "100%",
        display: "block",
        background: "#000",
      }}
    />
  );
}

export function A6() {
  const canvasRef = useRef(null);
  const rafRef = useRef(0);
  const BOID_COUNT = 80;
  const BOID_SIZE = 0.06;
  const SPEED = 0.002;
  const MARGIN = 0.08;
  const DETECTION_RADIUS = 0.5;
  const SEPARATION_WEIGHT = 0.005;
  const MAX_TURN = Math.PI / 60; // Reduced to about 3 degrees per frame for smoother turning
  const CIRCLE_SEGMENTS = 32;
  const VIEW_ANGLE = (Math.PI * 2) / 3; // 120 degrees
  const boidsRef = useRef([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const gl = canvas.getContext("webgl", { antialias: true });
    if (!gl) return;

    function compile(type, src) {
      const s = gl.createShader(type);
      gl.shaderSource(s, src);
      gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
        console.error(gl.getShaderInfoLog(s));
        return null;
      }
      return s;
    }

    const prog = gl.createProgram();
    const vShader = compile(gl.VERTEX_SHADER, vs);
    const fShader = compile(gl.FRAGMENT_SHADER, fs2);
    if (!vShader || !fShader) return;

    gl.attachShader(prog, vShader);
    gl.attachShader(prog, fShader);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      console.error(gl.getProgramInfoLog(prog));
      return;
    }
    gl.useProgram(prog);

    // Enable blending for transparency
    gl.enable(gl.BLEND);
    gl.blendFuncSeparate(
      gl.SRC_ALPHA,
      gl.ONE_MINUS_SRC_ALPHA,
      gl.ONE,
      gl.ONE_MINUS_SRC_ALPHA
    );

    const locPos = gl.getAttribLocation(prog, "a_position");
    gl.enableVertexAttribArray(locPos);
    const uModel = gl.getUniformLocation(prog, "u_model");
    const uColor = gl.getUniformLocation(prog, "u_color");

    // Triangle pointing up for boids
    const vertices = new Float32Array([
      0.0,
      BOID_SIZE,
      -BOID_SIZE / 2,
      -BOID_SIZE / 1.5,
      BOID_SIZE / 2,
      -BOID_SIZE / 1.5,
    ]);
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

    // Sector vertices for detection boundary, including center
    const startAngle = Math.PI / 2 - VIEW_ANGLE / 2;
    const endAngle = Math.PI / 2 + VIEW_ANGLE / 2;
    const sectorVertices = new Float32Array((CIRCLE_SEGMENTS + 2) * 2);
    sectorVertices[0] = 0.0;
    sectorVertices[1] = 0.0; // center
    for (let i = 0; i <= CIRCLE_SEGMENTS; i++) {
      const t = i / CIRCLE_SEGMENTS;
      const angle = startAngle + (endAngle - startAngle) * t;
      sectorVertices[(i + 1) * 2] = DETECTION_RADIUS * Math.cos(angle);
      sectorVertices[(i + 1) * 2 + 1] = DETECTION_RADIUS * Math.sin(angle);
    }
    const sectorBuf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, sectorBuf);
    gl.bufferData(gl.ARRAY_BUFFER, sectorVertices, gl.STATIC_DRAW);

    // Initialize boids
    function initBoids() {
      const arr = [];
      for (let i = 0; i < BOID_COUNT; i++) {
        const angle = Math.random() * Math.PI * 2;
        const color =
          i === 0
            ? new Float32Array([1.0, 0.0, 0.0, 1.0])
            : new Float32Array([0.2, 0.8, 0.4, 1.0]);
        arr.push({
          x: (Math.random() - 0.5) * 2,
          y: (Math.random() - 0.5) * 2,
          vx: Math.cos(angle) * SPEED,
          vy: Math.sin(angle) * SPEED,
          angle,
          color,
        });
      }
      return arr;
    }
    boidsRef.current = initBoids();

    function resize() {
      const s = canvas.parentElement.clientWidth;
      canvas.width = canvas.height = s;
      gl.viewport(0, 0, s, s);
    }
    resize();
    window.addEventListener("resize", resize);

    function updateBoids() {
      const boids = boidsRef.current;
      const new_velocities = [];

      for (let i = 0; i < boids.length; i++) {
        const self = boids[i];
        let sep_x = 0;
        let sep_y = 0;
        let count = 0;

        for (let j = 0; j < boids.length; j++) {
          if (i === j) continue;
          const other = boids[j];
          let dx = other.x - self.x;
          let dy = other.y - self.y;
          dx -= 2 * Math.round(dx / 2);
          dy -= 2 * Math.round(dy / 2);
          const dist_sq = dx * dx + dy * dy;
          if (dist_sq >= DETECTION_RADIUS * DETECTION_RADIUS || dist_sq === 0)
            continue;
          const dist = Math.sqrt(dist_sq);
          const rel_angle = Math.atan2(dy, dx);
          let diff = rel_angle - self.angle;
          diff = ((diff + Math.PI) % (2 * Math.PI)) - Math.PI;
          if (Math.abs(diff) > VIEW_ANGLE / 2) continue;
          // Add to separation: unit vector away
          sep_x += -dx / dist;
          sep_y += -dy / dist;
          count++;
        }

        if (count > 0) {
          sep_x /= count;
          sep_y /= count;
          sep_x *= SEPARATION_WEIGHT;
          sep_y *= SEPARATION_WEIGHT;
        }

        let desired_vx = self.vx + sep_x;
        let desired_vy = self.vy + sep_y;
        let desired_mag = Math.sqrt(
          desired_vx * desired_vx + desired_vy * desired_vy
        );

        let new_vx, new_vy;
        if (desired_mag === 0) {
          new_vx = self.vx;
          new_vy = self.vy;
        } else {
          let desired_dir_x = desired_vx / desired_mag;
          let desired_dir_y = desired_vy / desired_mag;

          let current_mag = Math.sqrt(self.vx * self.vx + self.vy * self.vy);
          if (current_mag === 0) {
            new_vx = desired_dir_x * SPEED;
            new_vy = desired_dir_y * SPEED;
          } else {
            let current_dir_x = self.vx / current_mag;
            let current_dir_y = self.vy / current_mag;

            let dot =
              current_dir_x * desired_dir_x + current_dir_y * desired_dir_y;
            dot = Math.max(-1, Math.min(1, dot));
            let angle_diff = Math.acos(dot);

            // Determine rotation direction
            let cross =
              current_dir_x * desired_dir_y - current_dir_y * desired_dir_x;
            let turn_dir = cross >= 0 ? 1 : -1;

            if (angle_diff > MAX_TURN) {
              angle_diff = MAX_TURN;
            }

            // Rotate current direction towards desired
            let cos_turn = Math.cos(turn_dir * angle_diff);
            let sin_turn = Math.sin(turn_dir * angle_diff);
            let new_dir_x = current_dir_x * cos_turn - current_dir_y * sin_turn;
            let new_dir_y = current_dir_x * sin_turn + current_dir_y * cos_turn;

            new_vx = new_dir_x * SPEED;
            new_vy = new_dir_y * SPEED;
          }
        }

        new_velocities.push({ vx: new_vx, vy: new_vy });
      }

      // Apply new velocities
      for (let i = 0; i < boids.length; i++) {
        boids[i].vx = new_velocities[i].vx;
        boids[i].vy = new_velocities[i].vy;
      }

      boids.forEach((b) => {
        // Move boid
        b.x += b.vx;
        b.y += b.vy;

        // Update angle for rendering
        b.angle = Math.atan2(b.vy, b.vx);

        // Wrap around screen (-1..1)
        if (b.x < -1) b.x += 2;
        if (b.x > 1) b.x -= 2;
        if (b.y < -1) b.y += 2;
        if (b.y > 1) b.y -= 2;
      });
    }

    function renderBoid(b, ox = 0, oy = 0) {
      const trans = new Float32Array([
        1,
        0,
        0,
        0,
        0,
        1,
        0,
        0,
        0,
        0,
        1,
        0,
        b.x + ox,
        b.y + oy,
        0,
        1,
      ]);
      const rot = rotationMatrix(b.angle - Math.PI / 2);

      const model = new Float32Array(16);
      for (let i = 0; i < 4; i++)
        for (let j = 0; j < 4; j++)
          model[j * 4 + i] =
            trans[0 * 4 + i] * rot[j * 4 + 0] +
            trans[1 * 4 + i] * rot[j * 4 + 1] +
            trans[2 * 4 + i] * rot[j * 4 + 2] +
            trans[3 * 4 + i] * rot[j * 4 + 3];

      gl.uniformMatrix4fv(uModel, false, model);
      gl.uniform4fv(uColor, b.color);
      gl.bindBuffer(gl.ARRAY_BUFFER, buf);
      gl.vertexAttribPointer(locPos, 2, gl.FLOAT, false, 0, 0);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    }

    function renderSector(b, ox = 0, oy = 0) {
      const trans = new Float32Array([
        1,
        0,
        0,
        0,
        0,
        1,
        0,
        0,
        0,
        0,
        1,
        0,
        b.x + ox,
        b.y + oy,
        0,
        1,
      ]);
      const rot = rotationMatrix(b.angle - Math.PI / 2);

      const model = new Float32Array(16);
      for (let i = 0; i < 4; i++)
        for (let j = 0; j < 4; j++)
          model[j * 4 + i] =
            trans[0 * 4 + i] * rot[j * 4 + 0] +
            trans[1 * 4 + i] * rot[j * 4 + 1] +
            trans[2 * 4 + i] * rot[j * 4 + 2] +
            trans[3 * 4 + i] * rot[j * 4 + 3];

      gl.uniformMatrix4fv(uModel, false, model);
      gl.uniform4fv(
        uColor,
        new Float32Array([b.color[0], b.color[1], b.color[2], 0.3])
      );
      gl.bindBuffer(gl.ARRAY_BUFFER, sectorBuf);
      gl.vertexAttribPointer(locPos, 2, gl.FLOAT, false, 0, 0);
      gl.drawArrays(gl.TRIANGLE_FAN, 0, CIRCLE_SEGMENTS + 2);
    }

    function loop() {
      updateBoids();
      gl.clearColor(0, 0, 0, 1);
      gl.clear(gl.COLOR_BUFFER_BIT);

      // Render boids first
      boidsRef.current.forEach((b) => {
        renderBoid(b, 0, 0);

        if (b.x > 1 - MARGIN) {
          renderBoid(b, -2, 0);
        }
        if (b.x < -1 + MARGIN) {
          renderBoid(b, 2, 0);
        }
        if (b.y > 1 - MARGIN) {
          renderBoid(b, 0, -2);
        }
        if (b.y < -1 + MARGIN) {
          renderBoid(b, 0, 2);
        }

        if (b.x > 1 - MARGIN && b.y > 1 - MARGIN) {
          renderBoid(b, -2, -2);
        }
        if (b.x > 1 - MARGIN && b.y < -1 + MARGIN) {
          renderBoid(b, -2, 2);
        }
        if (b.x < -1 + MARGIN && b.y > 1 - MARGIN) {
          renderBoid(b, 2, -2);
        }
        if (b.x < -1 + MARGIN && b.y < -1 + MARGIN) {
          renderBoid(b, 2, 2);
        }
      });

      // Render lines to neighbors
      const red = boidsRef.current[0];
      let lineVertices = [];
      boidsRef.current.forEach((b, i) => {
        if (i === 0) return;
        let dx = b.x - red.x;
        let dy = b.y - red.y;
        dx = dx - 2 * Math.round(dx / 2);
        dy = dy - 2 * Math.round(dy / 2);
        const distSq = dx * dx + dy * dy;
        if (distSq > DETECTION_RADIUS * DETECTION_RADIUS || distSq === 0)
          return;
        const rel_angle = Math.atan2(dy, dx);
        let diff = rel_angle - red.angle;
        diff = ((diff + Math.PI) % (2 * Math.PI)) - Math.PI;
        if (Math.abs(diff) > VIEW_ANGLE / 2) return;
        // Neighbor found
        let end_x = red.x + dx;
        let end_y = red.y + dy;
        let wrap_x = 0;
        let wrap_y = 0;
        if (end_x > 1) wrap_x = 1;
        else if (end_x < -1) wrap_x = -1;
        if (end_y > 1) wrap_y = 1;
        else if (end_y < -1) wrap_y = -1;
        if (wrap_x === 0 && wrap_y === 0) {
          lineVertices.push(red.x, red.y, end_x, end_y);
        } else if (wrap_x !== 0 && wrap_y === 0) {
          const sign = wrap_x;
          const edge = sign * 1;
          const t = (edge - red.x) / dx;
          const cross_y = red.y + t * dy;
          lineVertices.push(red.x, red.y, edge, cross_y);
          const opp_edge = -sign * 1;
          const wrapped_end_x = end_x - 2 * sign;
          const wrapped_end_y = end_y;
          lineVertices.push(opp_edge, cross_y, wrapped_end_x, wrapped_end_y);
        } else if (wrap_y !== 0 && wrap_x === 0) {
          const sign = wrap_y;
          const edge = sign * 1;
          const t = (edge - red.y) / dy;
          const cross_x = red.x + t * dx;
          lineVertices.push(red.x, red.y, cross_x, edge);
          const opp_edge = -sign * 1;
          const wrapped_end_y = end_y - 2 * sign;
          const wrapped_end_x = end_x;
          lineVertices.push(cross_x, opp_edge, wrapped_end_x, wrapped_end_y);
        } else {
          // Both wrap (rare), draw clipped line
          lineVertices.push(red.x, red.y, end_x, end_y);
        }
      });
      if (lineVertices.length > 0) {
        const lineBuf = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, lineBuf);
        gl.bufferData(
          gl.ARRAY_BUFFER,
          new Float32Array(lineVertices),
          gl.DYNAMIC_DRAW
        );
        gl.uniformMatrix4fv(
          uModel,
          false,
          new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1])
        );
        gl.uniform4fv(uColor, new Float32Array([1.0, 1.0, 0.0, 1.0])); // Yellow lines
        gl.vertexAttribPointer(locPos, 2, gl.FLOAT, false, 0, 0);
        gl.drawArrays(gl.LINES, 0, lineVertices.length / 2);
        gl.deleteBuffer(lineBuf);
      }

      // Then render sectors to overlay
      boidsRef.current.forEach((b, i) => {
        if (i === 0) {
          renderSector(b, 0, 0);

          if (b.x > 1 - MARGIN) {
            renderSector(b, -2, 0);
          }
          if (b.x < -1 + MARGIN) {
            renderSector(b, 2, 0);
          }
          if (b.y > 1 - MARGIN) {
            renderSector(b, 0, -2);
          }
          if (b.y < -1 + MARGIN) {
            renderSector(b, 0, 2);
          }

          if (b.x > 1 - MARGIN && b.y > 1 - MARGIN) {
            renderSector(b, -2, -2);
          }
          if (b.x > 1 - MARGIN && b.y < -1 + MARGIN) {
            renderSector(b, -2, 2);
          }
          if (b.x < -1 + MARGIN && b.y > 1 - MARGIN) {
            renderSector(b, 2, -2);
          }
          if (b.x < -1 + MARGIN && b.y < -1 + MARGIN) {
            renderSector(b, 2, 2);
          }
        }
      });
      rafRef.current = requestAnimationFrame(loop);
    }
    loop();

    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener("resize", resize);
      gl.deleteProgram(prog);
      gl.deleteShader(vShader);
      gl.deleteShader(fShader);
      gl.deleteBuffer(buf);
      gl.deleteBuffer(sectorBuf);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        width: "100%",
        height: "100%",
        display: "block",
        background: "#000",
      }}
    />
  );
}

export function A7() {
  const canvasRef = useRef(null);
  const rafRef = useRef(0);
  const BOID_COUNT = 80;
  const BOID_SIZE = 0.06;
  const LINE_LENGTH = 0.1;
  const SPEED = 0.002;
  const MARGIN = 0.08;
  const DETECTION_RADIUS = 0.5;
  const SEPARATION_WEIGHT = 0.005;
  const MAX_TURN = Math.PI / 60; // Reduced to about 3 degrees per frame for smoother turning
  const CIRCLE_SEGMENTS = 32;
  const VIEW_ANGLE = (Math.PI * 2) / 3; // 120 degrees
  const boidsRef = useRef([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const gl = canvas.getContext("webgl", { antialias: true });
    if (!gl) return;

    function compile(type, src) {
      const s = gl.createShader(type);
      gl.shaderSource(s, src);
      gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
        console.error(gl.getShaderInfoLog(s));
        return null;
      }
      return s;
    }

    const prog = gl.createProgram();
    const vShader = compile(gl.VERTEX_SHADER, vs);
    const fShader = compile(gl.FRAGMENT_SHADER, fs2);
    if (!vShader || !fShader) return;

    gl.attachShader(prog, vShader);
    gl.attachShader(prog, fShader);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      console.error(gl.getProgramInfoLog(prog));
      return;
    }
    gl.useProgram(prog);

    // Enable blending for transparency
    gl.enable(gl.BLEND);
    gl.blendFuncSeparate(
      gl.SRC_ALPHA,
      gl.ONE_MINUS_SRC_ALPHA,
      gl.ONE,
      gl.ONE_MINUS_SRC_ALPHA
    );

    const locPos = gl.getAttribLocation(prog, "a_position");
    gl.enableVertexAttribArray(locPos);
    const uModel = gl.getUniformLocation(prog, "u_model");
    const uColor = gl.getUniformLocation(prog, "u_color");

    // Triangle pointing up for boids
    const vertices = new Float32Array([
      0.0,
      BOID_SIZE,
      -BOID_SIZE / 2,
      -BOID_SIZE / 1.5,
      BOID_SIZE / 2,
      -BOID_SIZE / 1.5,
    ]);
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

    // Sector vertices for detection boundary, including center
    const startAngle = Math.PI / 2 - VIEW_ANGLE / 2;
    const endAngle = Math.PI / 2 + VIEW_ANGLE / 2;
    const sectorVertices = new Float32Array((CIRCLE_SEGMENTS + 2) * 2);
    sectorVertices[0] = 0.0;
    sectorVertices[1] = 0.0; // center
    for (let i = 0; i <= CIRCLE_SEGMENTS; i++) {
      const t = i / CIRCLE_SEGMENTS;
      const angle = startAngle + (endAngle - startAngle) * t;
      sectorVertices[(i + 1) * 2] = DETECTION_RADIUS * Math.cos(angle);
      sectorVertices[(i + 1) * 2 + 1] = DETECTION_RADIUS * Math.sin(angle);
    }
    const sectorBuf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, sectorBuf);
    gl.bufferData(gl.ARRAY_BUFFER, sectorVertices, gl.STATIC_DRAW);

    // Direction line vertices (local space, extending from head along +y)
    const dirVertices = new Float32Array([
      0,
      BOID_SIZE,
      0,
      BOID_SIZE + LINE_LENGTH,
    ]);
    const dirBuf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, dirBuf);
    gl.bufferData(gl.ARRAY_BUFFER, dirVertices, gl.STATIC_DRAW);

    // Initialize boids
    function initBoids() {
      const arr = [];
      for (let i = 0; i < BOID_COUNT; i++) {
        const angle = Math.random() * Math.PI * 2;
        const color =
          i === 0
            ? new Float32Array([1.0, 0.0, 0.0, 1.0])
            : new Float32Array([0.2, 0.8, 0.4, 1.0]);
        arr.push({
          x: (Math.random() - 0.5) * 2,
          y: (Math.random() - 0.5) * 2,
          vx: Math.cos(angle) * SPEED,
          vy: Math.sin(angle) * SPEED,
          angle,
          color,
        });
      }
      return arr;
    }
    boidsRef.current = initBoids();

    function resize() {
      const s = canvas.parentElement.clientWidth;
      canvas.width = canvas.height = s;
      gl.viewport(0, 0, s, s);
    }
    resize();
    window.addEventListener("resize", resize);

    function updateBoids() {
      const boids = boidsRef.current;
      const new_velocities = [];

      for (let i = 0; i < boids.length; i++) {
        const self = boids[i];
        let sep_x = 0;
        let sep_y = 0;
        let count = 0;

        for (let j = 0; j < boids.length; j++) {
          if (i === j) continue;
          const other = boids[j];
          let dx = other.x - self.x;
          let dy = other.y - self.y;
          dx -= 2 * Math.round(dx / 2);
          dy -= 2 * Math.round(dy / 2);
          const dist_sq = dx * dx + dy * dy;
          if (dist_sq >= DETECTION_RADIUS * DETECTION_RADIUS || dist_sq === 0)
            continue;
          const dist = Math.sqrt(dist_sq);
          const rel_angle = Math.atan2(dy, dx);
          let diff = rel_angle - self.angle;
          diff = ((diff + Math.PI) % (2 * Math.PI)) - Math.PI;
          if (Math.abs(diff) > VIEW_ANGLE / 2) continue;
          // Add to separation: unit vector away
          sep_x += -dx / dist;
          sep_y += -dy / dist;
          count++;
        }

        if (count > 0) {
          sep_x /= count;
          sep_y /= count;
          sep_x *= SEPARATION_WEIGHT;
          sep_y *= SEPARATION_WEIGHT;
        }

        let desired_vx = self.vx + sep_x;
        let desired_vy = self.vy + sep_y;
        let desired_mag = Math.sqrt(
          desired_vx * desired_vx + desired_vy * desired_vy
        );

        let new_vx, new_vy;
        if (desired_mag === 0) {
          new_vx = self.vx;
          new_vy = self.vy;
        } else {
          let desired_dir_x = desired_vx / desired_mag;
          let desired_dir_y = desired_vy / desired_mag;

          let current_mag = Math.sqrt(self.vx * self.vx + self.vy * self.vy);
          if (current_mag === 0) {
            new_vx = desired_dir_x * SPEED;
            new_vy = desired_dir_y * SPEED;
          } else {
            let current_dir_x = self.vx / current_mag;
            let current_dir_y = self.vy / current_mag;

            let dot =
              current_dir_x * desired_dir_x + current_dir_y * desired_dir_y;
            dot = Math.max(-1, Math.min(1, dot));
            let angle_diff = Math.acos(dot);

            // Determine rotation direction
            let cross =
              current_dir_x * desired_dir_y - current_dir_y * desired_dir_x;
            let turn_dir = cross >= 0 ? 1 : -1;

            if (angle_diff > MAX_TURN) {
              angle_diff = MAX_TURN;
            }

            // Rotate current direction towards desired
            let cos_turn = Math.cos(turn_dir * angle_diff);
            let sin_turn = Math.sin(turn_dir * angle_diff);
            let new_dir_x = current_dir_x * cos_turn - current_dir_y * sin_turn;
            let new_dir_y = current_dir_x * sin_turn + current_dir_y * cos_turn;

            new_vx = new_dir_x * SPEED;
            new_vy = new_dir_y * SPEED;
          }
        }

        new_velocities.push({ vx: new_vx, vy: new_vy });
      }

      // Apply new velocities
      for (let i = 0; i < boids.length; i++) {
        boids[i].vx = new_velocities[i].vx;
        boids[i].vy = new_velocities[i].vy;
      }

      boids.forEach((b) => {
        // Move boid
        b.x += b.vx;
        b.y += b.vy;

        // Update angle for rendering
        b.angle = Math.atan2(b.vy, b.vx);

        // Wrap around screen (-1..1)
        if (b.x < -1) b.x += 2;
        if (b.x > 1) b.x -= 2;
        if (b.y < -1) b.y += 2;
        if (b.y > 1) b.y -= 2;
      });
    }

    function renderBoid(b, ox = 0, oy = 0) {
      const trans = new Float32Array([
        1,
        0,
        0,
        0,
        0,
        1,
        0,
        0,
        0,
        0,
        1,
        0,
        b.x + ox,
        b.y + oy,
        0,
        1,
      ]);
      const rot = rotationMatrix(b.angle - Math.PI / 2);

      const model = new Float32Array(16);
      for (let i = 0; i < 4; i++)
        for (let j = 0; j < 4; j++)
          model[j * 4 + i] =
            trans[0 * 4 + i] * rot[j * 4 + 0] +
            trans[1 * 4 + i] * rot[j * 4 + 1] +
            trans[2 * 4 + i] * rot[j * 4 + 2] +
            trans[3 * 4 + i] * rot[j * 4 + 3];

      gl.uniformMatrix4fv(uModel, false, model);
      gl.uniform4fv(uColor, b.color);
      gl.bindBuffer(gl.ARRAY_BUFFER, buf);
      gl.vertexAttribPointer(locPos, 2, gl.FLOAT, false, 0, 0);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    }

    function renderSector(b, ox = 0, oy = 0) {
      const trans = new Float32Array([
        1,
        0,
        0,
        0,
        0,
        1,
        0,
        0,
        0,
        0,
        1,
        0,
        b.x + ox,
        b.y + oy,
        0,
        1,
      ]);
      const rot = rotationMatrix(b.angle - Math.PI / 2);

      const model = new Float32Array(16);
      for (let i = 0; i < 4; i++)
        for (let j = 0; j < 4; j++)
          model[j * 4 + i] =
            trans[0 * 4 + i] * rot[j * 4 + 0] +
            trans[1 * 4 + i] * rot[j * 4 + 1] +
            trans[2 * 4 + i] * rot[j * 4 + 2] +
            trans[3 * 4 + i] * rot[j * 4 + 3];

      gl.uniformMatrix4fv(uModel, false, model);
      gl.uniform4fv(
        uColor,
        new Float32Array([b.color[0], b.color[1], b.color[2], 0.3])
      );
      gl.bindBuffer(gl.ARRAY_BUFFER, sectorBuf);
      gl.vertexAttribPointer(locPos, 2, gl.FLOAT, false, 0, 0);
      gl.drawArrays(gl.TRIANGLE_FAN, 0, CIRCLE_SEGMENTS + 2);
    }

    function renderDirLine(b, ox = 0, oy = 0) {
      const trans = new Float32Array([
        1,
        0,
        0,
        0,
        0,
        1,
        0,
        0,
        0,
        0,
        1,
        0,
        b.x + ox,
        b.y + oy,
        0,
        1,
      ]);
      const rot = rotationMatrix(b.angle - Math.PI / 2);

      const model = new Float32Array(16);
      for (let i = 0; i < 4; i++)
        for (let j = 0; j < 4; j++)
          model[j * 4 + i] =
            trans[0 * 4 + i] * rot[j * 4 + 0] +
            trans[1 * 4 + i] * rot[j * 4 + 1] +
            trans[2 * 4 + i] * rot[j * 4 + 2] +
            trans[3 * 4 + i] * rot[j * 4 + 3];

      gl.uniformMatrix4fv(uModel, false, model);
      gl.uniform4fv(uColor, b.color);
      gl.bindBuffer(gl.ARRAY_BUFFER, dirBuf);
      gl.vertexAttribPointer(locPos, 2, gl.FLOAT, false, 0, 0);
      gl.drawArrays(gl.LINES, 0, 2);
    }

    const renderWithWraps = (renderFunc, b) => {
      renderFunc(b, 0, 0);
      if (b.x > 1 - MARGIN) renderFunc(b, -2, 0);
      if (b.x < -1 + MARGIN) renderFunc(b, 2, 0);
      if (b.y > 1 - MARGIN) renderFunc(b, 0, -2);
      if (b.y < -1 + MARGIN) renderFunc(b, 0, 2);
      if (b.x > 1 - MARGIN && b.y > 1 - MARGIN) renderFunc(b, -2, -2);
      if (b.x > 1 - MARGIN && b.y < -1 + MARGIN) renderFunc(b, -2, 2);
      if (b.x < -1 + MARGIN && b.y > 1 - MARGIN) renderFunc(b, 2, -2);
      if (b.x < -1 + MARGIN && b.y < -1 + MARGIN) renderFunc(b, 2, 2);
    };

    function loop() {
      updateBoids();
      gl.clearColor(0, 0, 0, 1);
      gl.clear(gl.COLOR_BUFFER_BIT);

      // Render boids first
      boidsRef.current.forEach((b) => {
        renderBoid(b, 0, 0);

        if (b.x > 1 - MARGIN) {
          renderBoid(b, -2, 0);
        }
        if (b.x < -1 + MARGIN) {
          renderBoid(b, 2, 0);
        }
        if (b.y > 1 - MARGIN) {
          renderBoid(b, 0, -2);
        }
        if (b.y < -1 + MARGIN) {
          renderBoid(b, 0, 2);
        }

        if (b.x > 1 - MARGIN && b.y > 1 - MARGIN) {
          renderBoid(b, -2, -2);
        }
        if (b.x > 1 - MARGIN && b.y < -1 + MARGIN) {
          renderBoid(b, -2, 2);
        }
        if (b.x < -1 + MARGIN && b.y > 1 - MARGIN) {
          renderBoid(b, 2, -2);
        }
        if (b.x < -1 + MARGIN && b.y < -1 + MARGIN) {
          renderBoid(b, 2, 2);
        }
      });

      // Render lines to neighbors
      const red = boidsRef.current[0];
      let lineVertices = [];
      let neighbors = new Set();
      boidsRef.current.forEach((b, i) => {
        if (i === 0) return;
        let dx = b.x - red.x;
        let dy = b.y - red.y;
        dx = dx - 2 * Math.round(dx / 2);
        dy = dy - 2 * Math.round(dy / 2);
        const distSq = dx * dx + dy * dy;
        if (distSq > DETECTION_RADIUS * DETECTION_RADIUS || distSq === 0)
          return;
        const rel_angle = Math.atan2(dy, dx);
        let diff = rel_angle - red.angle;
        diff = ((diff + Math.PI) % (2 * Math.PI)) - Math.PI;
        if (Math.abs(diff) > VIEW_ANGLE / 2) return;
        // Neighbor found
        neighbors.add(i);
        let end_x = red.x + dx;
        let end_y = red.y + dy;
        let wrap_x = 0;
        let wrap_y = 0;
        if (end_x > 1) wrap_x = 1;
        else if (end_x < -1) wrap_x = -1;
        if (end_y > 1) wrap_y = 1;
        else if (end_y < -1) wrap_y = -1;
        if (wrap_x === 0 && wrap_y === 0) {
          lineVertices.push(red.x, red.y, end_x, end_y);
        } else if (wrap_x !== 0 && wrap_y === 0) {
          const sign = wrap_x;
          const edge = sign * 1;
          const t = (edge - red.x) / dx;
          const cross_y = red.y + t * dy;
          lineVertices.push(red.x, red.y, edge, cross_y);
          const opp_edge = -sign * 1;
          const wrapped_end_x = end_x - 2 * sign;
          const wrapped_end_y = end_y;
          lineVertices.push(opp_edge, cross_y, wrapped_end_x, wrapped_end_y);
        } else if (wrap_y !== 0 && wrap_x === 0) {
          const sign = wrap_y;
          const edge = sign * 1;
          const t = (edge - red.y) / dy;
          const cross_x = red.x + t * dx;
          lineVertices.push(red.x, red.y, cross_x, edge);
          const opp_edge = -sign * 1;
          const wrapped_end_y = end_y - 2 * sign;
          const wrapped_end_x = end_x;
          lineVertices.push(cross_x, opp_edge, wrapped_end_x, wrapped_end_y);
        } else {
          // Both wrap (rare), draw clipped line
          lineVertices.push(red.x, red.y, end_x, end_y);
        }
      });
      if (lineVertices.length > 0) {
        const lineBuf = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, lineBuf);
        gl.bufferData(
          gl.ARRAY_BUFFER,
          new Float32Array(lineVertices),
          gl.DYNAMIC_DRAW
        );
        gl.uniformMatrix4fv(
          uModel,
          false,
          new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1])
        );
        gl.uniform4fv(uColor, new Float32Array([1.0, 1.0, 0.0, 1.0])); // Yellow lines
        gl.vertexAttribPointer(locPos, 2, gl.FLOAT, false, 0, 0);
        gl.drawArrays(gl.LINES, 0, lineVertices.length / 2);
        gl.deleteBuffer(lineBuf);
      }

      // Then render sectors to overlay
      boidsRef.current.forEach((b, i) => {
        if (i === 0) {
          renderSector(b, 0, 0);

          if (b.x > 1 - MARGIN) {
            renderSector(b, -2, 0);
          }
          if (b.x < -1 + MARGIN) {
            renderSector(b, 2, 0);
          }
          if (b.y > 1 - MARGIN) {
            renderSector(b, 0, -2);
          }
          if (b.y < -1 + MARGIN) {
            renderSector(b, 0, 2);
          }

          if (b.x > 1 - MARGIN && b.y > 1 - MARGIN) {
            renderSector(b, -2, -2);
          }
          if (b.x > 1 - MARGIN && b.y < -1 + MARGIN) {
            renderSector(b, -2, 2);
          }
          if (b.x < -1 + MARGIN && b.y > 1 - MARGIN) {
            renderSector(b, 2, -2);
          }
          if (b.x < -1 + MARGIN && b.y < -1 + MARGIN) {
            renderSector(b, 2, 2);
          }
        }
      });

      // Render direction lines for red and neighbors
      renderWithWraps(renderDirLine, red);
      neighbors.forEach((idx) => {
        const nb = boidsRef.current[idx];
        renderWithWraps(renderDirLine, nb);
      });

      rafRef.current = requestAnimationFrame(loop);
    }
    loop();

    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener("resize", resize);
      gl.deleteProgram(prog);
      gl.deleteShader(vShader);
      gl.deleteShader(fShader);
      gl.deleteBuffer(buf);
      gl.deleteBuffer(sectorBuf);
      gl.deleteBuffer(dirBuf);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        width: "100%",
        height: "100%",
        display: "block",
        background: "#000",
      }}
    />
  );
}

export function A8() {
  const canvasRef = useRef(null);
  const rafRef = useRef(0);
  const BOID_COUNT = 80;
  const BOID_SIZE = 0.06;
  const BOID_CENTER_RADIUS = 0.02;
  const LINE_LENGTH = 0.1;
  const SPEED = 0.002;
  const MARGIN = 0.08;
  const DETECTION_RADIUS = 0.5;
  const SEPARATION_WEIGHT = 0.005;
  const ALIGNMENT_WEIGHT = 0.005;
  const COHESION_WEIGHT = 0.005;
  const MAX_TURN = Math.PI / 60; // Reduced to about 3 degrees per frame for smoother turning
  const CIRCLE_SEGMENTS = 32;
  const VIEW_ANGLE = (Math.PI * 2) / 3; // 120 degrees
  const boidsRef = useRef([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const gl = canvas.getContext("webgl", { antialias: true });
    if (!gl) return;

    function compile(type, src) {
      const s = gl.createShader(type);
      gl.shaderSource(s, src);
      gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
        console.error(gl.getShaderInfoLog(s));
        return null;
      }
      return s;
    }

    const prog = gl.createProgram();
    const vShader = compile(gl.VERTEX_SHADER, vs);
    const fShader = compile(gl.FRAGMENT_SHADER, fs2);
    if (!vShader || !fShader) return;

    gl.attachShader(prog, vShader);
    gl.attachShader(prog, fShader);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      console.error(gl.getProgramInfoLog(prog));
      return;
    }
    gl.useProgram(prog);

    // Enable blending for transparency
    gl.enable(gl.BLEND);
    gl.blendFuncSeparate(
      gl.SRC_ALPHA,
      gl.ONE_MINUS_SRC_ALPHA,
      gl.ONE,
      gl.ONE_MINUS_SRC_ALPHA
    );

    const locPos = gl.getAttribLocation(prog, "a_position");
    gl.enableVertexAttribArray(locPos);
    const uModel = gl.getUniformLocation(prog, "u_model");
    const uColor = gl.getUniformLocation(prog, "u_color");

    // Triangle pointing up for boids
    const vertices = new Float32Array([
      0.0,
      BOID_SIZE,
      -BOID_SIZE / 2,
      -BOID_SIZE / 1.5,
      BOID_SIZE / 2,
      -BOID_SIZE / 1.5,
    ]);
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

    // Sector vertices for detection boundary, including center
    const startAngle = Math.PI / 2 - VIEW_ANGLE / 2;
    const endAngle = Math.PI / 2 + VIEW_ANGLE / 2;
    const sectorVertices = new Float32Array((CIRCLE_SEGMENTS + 2) * 2);
    sectorVertices[0] = 0.0;
    sectorVertices[1] = 0.0; // center
    for (let i = 0; i <= CIRCLE_SEGMENTS; i++) {
      const t = i / CIRCLE_SEGMENTS;
      const angle = startAngle + (endAngle - startAngle) * t;
      sectorVertices[(i + 1) * 2] = DETECTION_RADIUS * Math.cos(angle);
      sectorVertices[(i + 1) * 2 + 1] = DETECTION_RADIUS * Math.sin(angle);
    }
    const sectorBuf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, sectorBuf);
    gl.bufferData(gl.ARRAY_BUFFER, sectorVertices, gl.STATIC_DRAW);

    // Circle vertices for center indicator
    const circleStartAngle = 0;
    const circleEndAngle = 2 * Math.PI;
    const circleVertices = new Float32Array((CIRCLE_SEGMENTS + 2) * 2);
    circleVertices[0] = 0.0;
    circleVertices[1] = 0.0; // center
    for (let i = 0; i <= CIRCLE_SEGMENTS; i++) {
      const t = i / CIRCLE_SEGMENTS;
      const angle = circleStartAngle + (circleEndAngle - circleStartAngle) * t;
      circleVertices[(i + 1) * 2] = BOID_CENTER_RADIUS * Math.cos(angle);
      circleVertices[(i + 1) * 2 + 1] = BOID_CENTER_RADIUS * Math.sin(angle);
    }
    const circleBuf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, circleBuf);
    gl.bufferData(gl.ARRAY_BUFFER, circleVertices, gl.STATIC_DRAW);

    // Direction line vertices (local space, extending from head along +y)
    const dirVertices = new Float32Array([
      0,
      BOID_SIZE,
      0,
      BOID_SIZE + LINE_LENGTH,
    ]);
    const dirBuf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, dirBuf);
    gl.bufferData(gl.ARRAY_BUFFER, dirVertices, gl.STATIC_DRAW);

    // Initialize boids
    function initBoids() {
      const arr = [];
      for (let i = 0; i < BOID_COUNT; i++) {
        const angle = Math.random() * Math.PI * 2;
        const color =
          i === 0
            ? new Float32Array([1.0, 0.0, 0.0, 1.0])
            : new Float32Array([0.2, 0.8, 0.4, 1.0]);
        arr.push({
          x: (Math.random() - 0.5) * 2,
          y: (Math.random() - 0.5) * 2,
          vx: Math.cos(angle) * SPEED,
          vy: Math.sin(angle) * SPEED,
          angle,
          color,
        });
      }
      return arr;
    }
    boidsRef.current = initBoids();
    boidsRef.current[0].center = { x: 0, y: 0, visible: false };

    function resize() {
      const s = canvas.parentElement.clientWidth;
      canvas.width = canvas.height = s;
      gl.viewport(0, 0, s, s);
    }
    resize();
    window.addEventListener("resize", resize);

    function updateBoids() {
      const boids = boidsRef.current;
      const new_velocities = [];

      for (let i = 0; i < boids.length; i++) {
        const self = boids[i];
        let sep_x = 0;
        let sep_y = 0;
        let sum_vx = 0;
        let sum_vy = 0;
        let sum_dx = 0;
        let sum_dy = 0;
        let count = 0;

        for (let j = 0; j < boids.length; j++) {
          if (i === j) continue;
          const other = boids[j];
          let dx = other.x - self.x;
          let dy = other.y - self.y;
          dx -= 2 * Math.round(dx / 2);
          dy -= 2 * Math.round(dy / 2);
          const dist_sq = dx * dx + dy * dy;
          if (dist_sq >= DETECTION_RADIUS * DETECTION_RADIUS || dist_sq === 0)
            continue;
          const dist = Math.sqrt(dist_sq);
          const rel_angle = Math.atan2(dy, dx);
          let diff = rel_angle - self.angle;
          diff = ((diff + Math.PI) % (2 * Math.PI)) - Math.PI;
          if (Math.abs(diff) > VIEW_ANGLE / 2) continue;
          // Add to separation: unit vector away
          sep_x += -dx / dist;
          sep_y += -dy / dist;
          // Add to alignment
          sum_vx += other.vx;
          sum_vy += other.vy;
          // Add to cohesion
          sum_dx += dx;
          sum_dy += dy;
          count++;
        }

        let ali_x = 0;
        let ali_y = 0;
        let coh_x = 0;
        let coh_y = 0;
        if (count > 0) {
          sep_x /= count;
          sep_y /= count;
          sep_x *= SEPARATION_WEIGHT;
          sep_y *= SEPARATION_WEIGHT;

          const avg_vx = sum_vx / count;
          const avg_vy = sum_vy / count;
          ali_x = (avg_vx - self.vx) * ALIGNMENT_WEIGHT;
          ali_y = (avg_vy - self.vy) * ALIGNMENT_WEIGHT;

          const avg_dx = sum_dx / count;
          const avg_dy = sum_dy / count;
          coh_x = avg_dx * COHESION_WEIGHT;
          coh_y = avg_dy * COHESION_WEIGHT;

          if (i === 0) {
            self.center.x = self.x + avg_dx;
            self.center.y = self.y + avg_dy;
            self.center.visible = true;
          }
        } else {
          if (i === 0) {
            self.center.visible = false;
          }
        }

        let desired_vx = self.vx + sep_x + ali_x + coh_x;
        let desired_vy = self.vy + sep_y + ali_y + coh_y;
        let desired_mag = Math.sqrt(
          desired_vx * desired_vx + desired_vy * desired_vy
        );

        let new_vx, new_vy;
        if (desired_mag === 0) {
          new_vx = self.vx;
          new_vy = self.vy;
        } else {
          let desired_dir_x = desired_vx / desired_mag;
          let desired_dir_y = desired_vy / desired_mag;

          let current_mag = Math.sqrt(self.vx * self.vx + self.vy * self.vy);
          if (current_mag === 0) {
            new_vx = desired_dir_x * SPEED;
            new_vy = desired_dir_y * SPEED;
          } else {
            let current_dir_x = self.vx / current_mag;
            let current_dir_y = self.vy / current_mag;

            let dot =
              current_dir_x * desired_dir_x + current_dir_y * desired_dir_y;
            dot = Math.max(-1, Math.min(1, dot));
            let angle_diff = Math.acos(dot);

            // Determine rotation direction
            let cross =
              current_dir_x * desired_dir_y - current_dir_y * desired_dir_x;
            let turn_dir = cross >= 0 ? 1 : -1;

            if (angle_diff > MAX_TURN) {
              angle_diff = MAX_TURN;
            }

            // Rotate current direction towards desired
            let cos_turn = Math.cos(turn_dir * angle_diff);
            let sin_turn = Math.sin(turn_dir * angle_diff);
            let new_dir_x = current_dir_x * cos_turn - current_dir_y * sin_turn;
            let new_dir_y = current_dir_x * sin_turn + current_dir_y * cos_turn;

            new_vx = new_dir_x * SPEED;
            new_vy = new_dir_y * SPEED;
          }
        }

        new_velocities.push({ vx: new_vx, vy: new_vy });
      }

      // Apply new velocities
      for (let i = 0; i < boids.length; i++) {
        boids[i].vx = new_velocities[i].vx;
        boids[i].vy = new_velocities[i].vy;
      }

      boids.forEach((b) => {
        // Move boid
        b.x += b.vx;
        b.y += b.vy;

        // Update angle for rendering
        b.angle = Math.atan2(b.vy, b.vx);

        // Wrap around screen (-1..1)
        if (b.x < -1) b.x += 2;
        if (b.x > 1) b.x -= 2;
        if (b.y < -1) b.y += 2;
        if (b.y > 1) b.y -= 2;
      });
    }

    function renderBoid(b, ox = 0, oy = 0) {
      const trans = new Float32Array([
        1,
        0,
        0,
        0,
        0,
        1,
        0,
        0,
        0,
        0,
        1,
        0,
        b.x + ox,
        b.y + oy,
        0,
        1,
      ]);
      const rot = rotationMatrix(b.angle - Math.PI / 2);

      const model = new Float32Array(16);
      for (let i = 0; i < 4; i++)
        for (let j = 0; j < 4; j++)
          model[j * 4 + i] =
            trans[0 * 4 + i] * rot[j * 4 + 0] +
            trans[1 * 4 + i] * rot[j * 4 + 1] +
            trans[2 * 4 + i] * rot[j * 4 + 2] +
            trans[3 * 4 + i] * rot[j * 4 + 3];

      gl.uniformMatrix4fv(uModel, false, model);
      gl.uniform4fv(uColor, b.color);
      gl.bindBuffer(gl.ARRAY_BUFFER, buf);
      gl.vertexAttribPointer(locPos, 2, gl.FLOAT, false, 0, 0);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    }

    function renderSector(b, ox = 0, oy = 0) {
      const trans = new Float32Array([
        1,
        0,
        0,
        0,
        0,
        1,
        0,
        0,
        0,
        0,
        1,
        0,
        b.x + ox,
        b.y + oy,
        0,
        1,
      ]);
      const rot = rotationMatrix(b.angle - Math.PI / 2);

      const model = new Float32Array(16);
      for (let i = 0; i < 4; i++)
        for (let j = 0; j < 4; j++)
          model[j * 4 + i] =
            trans[0 * 4 + i] * rot[j * 4 + 0] +
            trans[1 * 4 + i] * rot[j * 4 + 1] +
            trans[2 * 4 + i] * rot[j * 4 + 2] +
            trans[3 * 4 + i] * rot[j * 4 + 3];

      gl.uniformMatrix4fv(uModel, false, model);
      gl.uniform4fv(
        uColor,
        new Float32Array([b.color[0], b.color[1], b.color[2], 0.3])
      );
      gl.bindBuffer(gl.ARRAY_BUFFER, sectorBuf);
      gl.vertexAttribPointer(locPos, 2, gl.FLOAT, false, 0, 0);
      gl.drawArrays(gl.TRIANGLE_FAN, 0, CIRCLE_SEGMENTS + 2);
    }

    function renderCenter(pos, ox = 0, oy = 0) {
      const trans = new Float32Array([
        1,
        0,
        0,
        0,
        0,
        1,
        0,
        0,
        0,
        0,
        1,
        0,
        pos.x + ox,
        pos.y + oy,
        0,
        1,
      ]);

      gl.uniformMatrix4fv(uModel, false, trans);
      gl.uniform4fv(uColor, new Float32Array([1.0, 1.0, 1.0, 1.0])); // white
      gl.bindBuffer(gl.ARRAY_BUFFER, circleBuf);
      gl.vertexAttribPointer(locPos, 2, gl.FLOAT, false, 0, 0);
      gl.drawArrays(gl.TRIANGLE_FAN, 0, CIRCLE_SEGMENTS + 2);
    }

    function renderDirLine(b, ox = 0, oy = 0) {
      const trans = new Float32Array([
        1,
        0,
        0,
        0,
        0,
        1,
        0,
        0,
        0,
        0,
        1,
        0,
        b.x + ox,
        b.y + oy,
        0,
        1,
      ]);
      const rot = rotationMatrix(b.angle - Math.PI / 2);

      const model = new Float32Array(16);
      for (let i = 0; i < 4; i++)
        for (let j = 0; j < 4; j++)
          model[j * 4 + i] =
            trans[0 * 4 + i] * rot[j * 4 + 0] +
            trans[1 * 4 + i] * rot[j * 4 + 1] +
            trans[2 * 4 + i] * rot[j * 4 + 2] +
            trans[3 * 4 + i] * rot[j * 4 + 3];

      gl.uniformMatrix4fv(uModel, false, model);
      gl.uniform4fv(uColor, b.color);
      gl.bindBuffer(gl.ARRAY_BUFFER, dirBuf);
      gl.vertexAttribPointer(locPos, 2, gl.FLOAT, false, 0, 0);
      gl.drawArrays(gl.LINES, 0, 2);
    }

    const renderWithWraps = (renderFunc, b) => {
      renderFunc(b, 0, 0);
      if (b.x > 1 - MARGIN) renderFunc(b, -2, 0);
      if (b.x < -1 + MARGIN) renderFunc(b, 2, 0);
      if (b.y > 1 - MARGIN) renderFunc(b, 0, -2);
      if (b.y < -1 + MARGIN) renderFunc(b, 0, 2);
      if (b.x > 1 - MARGIN && b.y > 1 - MARGIN) renderFunc(b, -2, -2);
      if (b.x > 1 - MARGIN && b.y < -1 + MARGIN) renderFunc(b, -2, 2);
      if (b.x < -1 + MARGIN && b.y > 1 - MARGIN) renderFunc(b, 2, -2);
      if (b.x < -1 + MARGIN && b.y < -1 + MARGIN) renderFunc(b, 2, 2);
    };

    function loop() {
      updateBoids();
      gl.clearColor(0, 0, 0, 1);
      gl.clear(gl.COLOR_BUFFER_BIT);

      // Render boids first
      boidsRef.current.forEach((b) => {
        renderBoid(b, 0, 0);

        if (b.x > 1 - MARGIN) {
          renderBoid(b, -2, 0);
        }
        if (b.x < -1 + MARGIN) {
          renderBoid(b, 2, 0);
        }
        if (b.y > 1 - MARGIN) {
          renderBoid(b, 0, -2);
        }
        if (b.y < -1 + MARGIN) {
          renderBoid(b, 0, 2);
        }

        if (b.x > 1 - MARGIN && b.y > 1 - MARGIN) {
          renderBoid(b, -2, -2);
        }
        if (b.x > 1 - MARGIN && b.y < -1 + MARGIN) {
          renderBoid(b, -2, 2);
        }
        if (b.x < -1 + MARGIN && b.y > 1 - MARGIN) {
          renderBoid(b, 2, -2);
        }
        if (b.x < -1 + MARGIN && b.y < -1 + MARGIN) {
          renderBoid(b, 2, 2);
        }
      });

      // Render lines to neighbors
      const red = boidsRef.current[0];
      let lineVertices = [];
      let neighbors = new Set();
      boidsRef.current.forEach((b, i) => {
        if (i === 0) return;
        let dx = b.x - red.x;
        let dy = b.y - red.y;
        dx = dx - 2 * Math.round(dx / 2);
        dy = dy - 2 * Math.round(dy / 2);
        const distSq = dx * dx + dy * dy;
        if (distSq > DETECTION_RADIUS * DETECTION_RADIUS || distSq === 0)
          return;
        const rel_angle = Math.atan2(dy, dx);
        let diff = rel_angle - red.angle;
        diff = ((diff + Math.PI) % (2 * Math.PI)) - Math.PI;
        if (Math.abs(diff) > VIEW_ANGLE / 2) return;
        // Neighbor found
        neighbors.add(i);
        let end_x = red.x + dx;
        let end_y = red.y + dy;
        let wrap_x = 0;
        let wrap_y = 0;
        if (end_x > 1) wrap_x = 1;
        else if (end_x < -1) wrap_x = -1;
        if (end_y > 1) wrap_y = 1;
        else if (end_y < -1) wrap_y = -1;
        if (wrap_x === 0 && wrap_y === 0) {
          lineVertices.push(red.x, red.y, end_x, end_y);
        } else if (wrap_x !== 0 && wrap_y === 0) {
          const sign = wrap_x;
          const edge = sign * 1;
          const t = (edge - red.x) / dx;
          const cross_y = red.y + t * dy;
          lineVertices.push(red.x, red.y, edge, cross_y);
          const opp_edge = -sign * 1;
          const wrapped_end_x = end_x - 2 * sign;
          const wrapped_end_y = end_y;
          lineVertices.push(opp_edge, cross_y, wrapped_end_x, wrapped_end_y);
        } else if (wrap_y !== 0 && wrap_x === 0) {
          const sign = wrap_y;
          const edge = sign * 1;
          const t = (edge - red.y) / dy;
          const cross_x = red.x + t * dx;
          lineVertices.push(red.x, red.y, cross_x, edge);
          const opp_edge = -sign * 1;
          const wrapped_end_y = end_y - 2 * sign;
          const wrapped_end_x = end_x;
          lineVertices.push(cross_x, opp_edge, wrapped_end_x, wrapped_end_y);
        } else {
          // Both wrap (rare), draw clipped line
          lineVertices.push(red.x, red.y, end_x, end_y);
        }
      });
      if (lineVertices.length > 0) {
        const lineBuf = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, lineBuf);
        gl.bufferData(
          gl.ARRAY_BUFFER,
          new Float32Array(lineVertices),
          gl.DYNAMIC_DRAW
        );
        gl.uniformMatrix4fv(
          uModel,
          false,
          new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1])
        );
        gl.uniform4fv(uColor, new Float32Array([1.0, 1.0, 0.0, 1.0])); // Yellow lines
        gl.vertexAttribPointer(locPos, 2, gl.FLOAT, false, 0, 0);
        gl.drawArrays(gl.LINES, 0, lineVertices.length / 2);
        gl.deleteBuffer(lineBuf);
      }

      // Then render sectors to overlay
      boidsRef.current.forEach((b, i) => {
        if (i === 0) {
          renderSector(b, 0, 0);

          if (b.x > 1 - MARGIN) {
            renderSector(b, -2, 0);
          }
          if (b.x < -1 + MARGIN) {
            renderSector(b, 2, 0);
          }
          if (b.y > 1 - MARGIN) {
            renderSector(b, 0, -2);
          }
          if (b.y < -1 + MARGIN) {
            renderSector(b, 0, 2);
          }

          if (b.x > 1 - MARGIN && b.y > 1 - MARGIN) {
            renderSector(b, -2, -2);
          }
          if (b.x > 1 - MARGIN && b.y < -1 + MARGIN) {
            renderSector(b, -2, 2);
          }
          if (b.x < -1 + MARGIN && b.y > 1 - MARGIN) {
            renderSector(b, 2, -2);
          }
          if (b.x < -1 + MARGIN && b.y < -1 + MARGIN) {
            renderSector(b, 2, 2);
          }
        }
      });

      // Render direction lines for red and neighbors
      renderWithWraps(renderDirLine, red);
      neighbors.forEach((idx) => {
        const nb = boidsRef.current[idx];
        renderWithWraps(renderDirLine, nb);
      });

      // Render center circle if visible
      if (red.center.visible) {
        renderWithWraps(renderCenter, red.center);
      }

      rafRef.current = requestAnimationFrame(loop);
    }
    loop();

    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener("resize", resize);
      gl.deleteProgram(prog);
      gl.deleteShader(vShader);
      gl.deleteShader(fShader);
      gl.deleteBuffer(buf);
      gl.deleteBuffer(sectorBuf);
      gl.deleteBuffer(circleBuf);
      gl.deleteBuffer(dirBuf);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        width: "100%",
        height: "100%",
        display: "block",
        background: "#000",
      }}
    />
  );
}

export function A9() {
  const canvasRef = useRef(null);
  const rafRef = useRef(0);
  const BOID_COUNT = 80;
  const BOID_SIZE = 0.06;
  const SPEED = 0.006;
  const MARGIN = 0.08;
  const DETECTION_RADIUS = 0.5;
  const SEPARATION_WEIGHT = 0.003;
  const ALIGNMENT_WEIGHT = 0.01;
  const COHESION_WEIGHT = 0.01;
  const MAX_TURN = Math.PI / 60;
  const VIEW_ANGLE = (Math.PI * 2) / 1.2; // 150 degrees
  const boidsRef = useRef([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const gl = canvas.getContext("webgl", { antialias: true });
    if (!gl) return;

    function compile(type, src) {
      const s = gl.createShader(type);
      gl.shaderSource(s, src);
      gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
        console.error(gl.getShaderInfoLog(s));
        return null;
      }
      return s;
    }

    const prog = gl.createProgram();
    const vShader = compile(gl.VERTEX_SHADER, vs);
    const fShader = compile(gl.FRAGMENT_SHADER, fs2);
    if (!vShader || !fShader) return;

    gl.attachShader(prog, vShader);
    gl.attachShader(prog, fShader);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      console.error(gl.getProgramInfoLog(prog));
      return;
    }
    gl.useProgram(prog);

    // Enable blending for transparency
    gl.enable(gl.BLEND);
    gl.blendFuncSeparate(
      gl.SRC_ALPHA,
      gl.ONE_MINUS_SRC_ALPHA,
      gl.ONE,
      gl.ONE_MINUS_SRC_ALPHA
    );

    const locPos = gl.getAttribLocation(prog, "a_position");
    gl.enableVertexAttribArray(locPos);
    const uModel = gl.getUniformLocation(prog, "u_model");
    const uColor = gl.getUniformLocation(prog, "u_color");

    // Triangle pointing up for boids
    const vertices = new Float32Array([
      0.0,
      BOID_SIZE,
      -BOID_SIZE / 2,
      -BOID_SIZE / 1.5,
      BOID_SIZE / 2,
      -BOID_SIZE / 1.5,
    ]);
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

    // Initialize boids
    function initBoids() {
      const arr = [];
      for (let i = 0; i < BOID_COUNT; i++) {
        const angle = Math.random() * Math.PI * 2;
        const color = new Float32Array([0.2, 0.8, 0.4, 1.0]);
        arr.push({
          x: (Math.random() - 0.5) * 2,
          y: (Math.random() - 0.5) * 2,
          vx: Math.cos(angle) * SPEED,
          vy: Math.sin(angle) * SPEED,
          angle,
          color,
        });
      }
      return arr;
    }
    boidsRef.current = initBoids();

    function resize() {
      const s = canvas.parentElement.clientWidth;
      canvas.width = canvas.height = s;
      gl.viewport(0, 0, s, s);
    }
    resize();
    window.addEventListener("resize", resize);

    function updateBoids() {
      const boids = boidsRef.current;
      const new_velocities = [];

      for (let i = 0; i < boids.length; i++) {
        const self = boids[i];
        let sep_x = 0;
        let sep_y = 0;
        let sum_vx = 0;
        let sum_vy = 0;
        let sum_dx = 0;
        let sum_dy = 0;
        let count = 0;

        for (let j = 0; j < boids.length; j++) {
          if (i === j) continue;
          const other = boids[j];
          let dx = other.x - self.x;
          let dy = other.y - self.y;
          dx -= 2 * Math.round(dx / 2);
          dy -= 2 * Math.round(dy / 2);
          const dist_sq = dx * dx + dy * dy;
          if (dist_sq >= DETECTION_RADIUS * DETECTION_RADIUS || dist_sq === 0)
            continue;
          const dist = Math.sqrt(dist_sq);
          const rel_angle = Math.atan2(dy, dx);
          let diff = rel_angle - self.angle;
          diff = ((diff + Math.PI) % (2 * Math.PI)) - Math.PI;
          if (Math.abs(diff) > VIEW_ANGLE / 2) continue;
          // Add to separation: unit vector away
          sep_x += -dx / dist;
          sep_y += -dy / dist;
          // Add to alignment
          sum_vx += other.vx;
          sum_vy += other.vy;
          // Add to cohesion
          sum_dx += dx;
          sum_dy += dy;
          count++;
        }

        let ali_x = 0;
        let ali_y = 0;
        let coh_x = 0;
        let coh_y = 0;
        if (count > 0) {
          sep_x /= count;
          sep_y /= count;
          sep_x *= SEPARATION_WEIGHT;
          sep_y *= SEPARATION_WEIGHT;

          const avg_vx = sum_vx / count;
          const avg_vy = sum_vy / count;
          ali_x = (avg_vx - self.vx) * ALIGNMENT_WEIGHT;
          ali_y = (avg_vy - self.vy) * ALIGNMENT_WEIGHT;

          const avg_dx = sum_dx / count;
          const avg_dy = sum_dy / count;
          coh_x = avg_dx * COHESION_WEIGHT;
          coh_y = avg_dy * COHESION_WEIGHT;
        }

        let desired_vx = self.vx + sep_x + ali_x + coh_x;
        let desired_vy = self.vy + sep_y + ali_y + coh_y;
        let desired_mag = Math.sqrt(
          desired_vx * desired_vx + desired_vy * desired_vy
        );

        let new_vx, new_vy;
        if (desired_mag === 0) {
          new_vx = self.vx;
          new_vy = self.vy;
        } else {
          let desired_dir_x = desired_vx / desired_mag;
          let desired_dir_y = desired_vy / desired_mag;

          let current_mag = Math.sqrt(self.vx * self.vx + self.vy * self.vy);
          if (current_mag === 0) {
            new_vx = desired_dir_x * SPEED;
            new_vy = desired_dir_y * SPEED;
          } else {
            let current_dir_x = self.vx / current_mag;
            let current_dir_y = self.vy / current_mag;

            let dot =
              current_dir_x * desired_dir_x + current_dir_y * desired_dir_y;
            dot = Math.max(-1, Math.min(1, dot));
            let angle_diff = Math.acos(dot);

            // Determine rotation direction
            let cross =
              current_dir_x * desired_dir_y - current_dir_y * desired_dir_x;
            let turn_dir = cross >= 0 ? 1 : -1;

            if (angle_diff > MAX_TURN) {
              angle_diff = MAX_TURN;
            }

            // Rotate current direction towards desired
            let cos_turn = Math.cos(turn_dir * angle_diff);
            let sin_turn = Math.sin(turn_dir * angle_diff);
            let new_dir_x = current_dir_x * cos_turn - current_dir_y * sin_turn;
            let new_dir_y = current_dir_x * sin_turn + current_dir_y * cos_turn;

            new_vx = new_dir_x * SPEED;
            new_vy = new_dir_y * SPEED;
          }
        }

        new_velocities.push({ vx: new_vx, vy: new_vy });
      }

      // Apply new velocities
      for (let i = 0; i < boids.length; i++) {
        boids[i].vx = new_velocities[i].vx;
        boids[i].vy = new_velocities[i].vy;
      }

      boids.forEach((b) => {
        // Move boid
        b.x += b.vx;
        b.y += b.vy;

        // Update angle for rendering
        b.angle = Math.atan2(b.vy, b.vx);

        // Wrap around screen (-1..1)
        if (b.x < -1) b.x += 2;
        if (b.x > 1) b.x -= 2;
        if (b.y < -1) b.y += 2;
        if (b.y > 1) b.y -= 2;
      });
    }

    function renderBoid(b, ox = 0, oy = 0) {
      const trans = new Float32Array([
        1,
        0,
        0,
        0,
        0,
        1,
        0,
        0,
        0,
        0,
        1,
        0,
        b.x + ox,
        b.y + oy,
        0,
        1,
      ]);
      const rot = rotationMatrix(b.angle - Math.PI / 2);

      const model = new Float32Array(16);
      for (let i = 0; i < 4; i++)
        for (let j = 0; j < 4; j++)
          model[j * 4 + i] =
            trans[0 * 4 + i] * rot[j * 4 + 0] +
            trans[1 * 4 + i] * rot[j * 4 + 1] +
            trans[2 * 4 + i] * rot[j * 4 + 2] +
            trans[3 * 4 + i] * rot[j * 4 + 3];

      gl.uniformMatrix4fv(uModel, false, model);
      gl.uniform4fv(uColor, b.color);
      gl.bindBuffer(gl.ARRAY_BUFFER, buf);
      gl.vertexAttribPointer(locPos, 2, gl.FLOAT, false, 0, 0);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    }

    function loop() {
      updateBoids();
      gl.clearColor(0, 0, 0, 1);
      gl.clear(gl.COLOR_BUFFER_BIT);

      // Render boids
      boidsRef.current.forEach((b) => {
        renderBoid(b, 0, 0);

        if (b.x > 1 - MARGIN) {
          renderBoid(b, -2, 0);
        }
        if (b.x < -1 + MARGIN) {
          renderBoid(b, 2, 0);
        }
        if (b.y > 1 - MARGIN) {
          renderBoid(b, 0, -2);
        }
        if (b.y < -1 + MARGIN) {
          renderBoid(b, 0, 2);
        }

        if (b.x > 1 - MARGIN && b.y > 1 - MARGIN) {
          renderBoid(b, -2, -2);
        }
        if (b.x > 1 - MARGIN && b.y < -1 + MARGIN) {
          renderBoid(b, -2, 2);
        }
        if (b.x < -1 + MARGIN && b.y > 1 - MARGIN) {
          renderBoid(b, 2, -2);
        }
        if (b.x < -1 + MARGIN && b.y < -1 + MARGIN) {
          renderBoid(b, 2, 2);
        }
      });

      rafRef.current = requestAnimationFrame(loop);
    }
    loop();

    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener("resize", resize);
      gl.deleteProgram(prog);
      gl.deleteShader(vShader);
      gl.deleteShader(fShader);
      gl.deleteBuffer(buf);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        width: "100%",
        height: "100%",
        display: "block",
        background: "#000",
      }}
    />
  );
}
