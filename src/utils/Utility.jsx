// main/src/utils/Utility.js

import React from "react";

const vertexShaderSource = `
  attribute vec2 a_position;
  void main() {
    gl_Position = vec4(a_position, 0.0, 1.0);
  }
`;

const createShader = (gl, type, source) => {
  const shader = gl.createShader(type);
  gl.shaderSource(shader, source);
  gl.compileShader(shader);

  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    console.error("Shader compile failed:", gl.getShaderInfoLog(shader));
    gl.deleteShader(shader);
    return null;
  }
  return shader;
};

const createProgram = (gl, vertexShader, fragmentShader) => {
  if (!vertexShader || !fragmentShader) {
    console.error("Cannot create program: missing shader(s)");
    return null;
  }

  const program = gl.createProgram();
  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);

  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.error("Program link failed:", gl.getProgramInfoLog(program));
    gl.deleteProgram(program);
    return null;
  }
  return program;
};

export const makeCanvas = (fragmentSource, uniforms = {}) => {
  return React.forwardRef((props, forwardedRef) => {
    const internalRef = React.useRef(null);
    const canvasRef = forwardedRef || internalRef;

    // Interaction state
    const stateRef = React.useRef({
      center: [uniforms.u_center?.value?.() || -0.7, 0.0],
      zoom: uniforms.u_zoom?.value?.() || 3.0,
      isDragging: false,
      lastMouse: [0, 0],
      clicks: [],
    });

    const MAX_RIPPLES = 5;
    const frameRef = React.useRef();

    React.useEffect(() => {
      const canvas = canvasRef.current;
      const gl = canvas.getContext("webgl", { antialias: true });
      if (!gl) return;

      // ---- shaders ------------------------------------------------
      const vs = createShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
      const fs = createShader(gl, gl.FRAGMENT_SHADER, fragmentSource);
      const prog = createProgram(gl, vs, fs);
      if (!prog) return;

      // ---- geometry (full-screen quad) ----------------------------
      const posBuf = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, posBuf);
      gl.bufferData(
        gl.ARRAY_BUFFER,
        new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
        gl.STATIC_DRAW
      );

      const aPos = gl.getAttribLocation(prog, "a_position");
      gl.enableVertexAttribArray(aPos);
      gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

      // ---- uniform locations ---------------------------------------
      const uRes = gl.getUniformLocation(prog, "u_resolution");
      const uTime = gl.getUniformLocation(prog, "u_time");
      const uMouse = gl.getUniformLocation(prog, "u_mouse");
      const uCenter = gl.getUniformLocation(prog, "u_center");
      const uZoom = gl.getUniformLocation(prog, "u_zoom");
      const uClickPos = gl.getUniformLocation(prog, "u_click_pos[0]");
      const uClickTime = gl.getUniformLocation(prog, "u_click_time[0]");
      const extra = {};

      for (const name in uniforms) {
        if (name !== "u_center" && name !== "u_zoom") {
          extra[name] = gl.getUniformLocation(prog, name);
        }
      }

      // ---- resize --------------------------------------------------
      const resize = () => {
        const p = canvas.parentElement;
        if (!p) return;
        const size = Math.min(p.clientWidth, p.clientHeight);
        canvas.width = size;
        canvas.height = size;
      };
      resize();
      window.addEventListener("resize", resize);

      // ---- mouse interaction ---------------------------------------
      const getMousePos = (e) => {
        const r = canvas.getBoundingClientRect();
        const x = ((e.clientX - r.left) / canvas.width) * 2 - 1;
        const y = -(((e.clientY - r.top) / canvas.height) * 2 - 1);
        return [x, y];
      };

      const state = stateRef.current;

      // Mouse down
      const onMouseDown = (e) => {
        if (e.button !== 0) return; // left click only
        state.isDragging = true;
        state.lastMouse = getMousePos(e);
      };

      // Mouse move
      const onMouseMove = (e) => {
        const mouse = getMousePos(e);
        gl.uniform2f(uMouse, mouse[0], mouse[1]);

        if (!state.isDragging) return;

        const [lx, ly] = state.lastMouse;
        const [cx, cy] = mouse;
        const dx = (lx - cx) * state.zoom;
        const dy = (ly - cy) * state.zoom;

        state.center[0] += dx;
        state.center[1] += dy;
        state.lastMouse = mouse;
      };

      // Mouse up
      const onMouseUp = () => {
        state.isDragging = false;
      };

      // Wheel zoom
      const onWheel = (e) => {
        e.preventDefault();
        const mouse = getMousePos(e);
        const delta = e.deltaY < 0 ? 0.9 : 1.1; // zoom in/out

        // Zoom towards mouse
        const [mx, my] = mouse;
        const [cx, cy] = state.center;
        const [wx, wy] = [mx * state.zoom + cx, my * state.zoom + cy];

        state.zoom *= delta;

        // Clamp zoom
        state.zoom = Math.max(1e-10, Math.min(state.zoom, 1e10));

        state.center[0] = wx - mx * state.zoom;
        state.center[1] = wy - my * state.zoom;
      };

      // Double click reset
      let clickTimeout;
      const onClick = (e) => {
        clearTimeout(clickTimeout);
        clickTimeout = setTimeout(() => {
          // Single click ripple
          const mouse = getMousePos(e);
          const currentTime = (performance.now() - start) * 0.001;
          state.clicks.push({ x: mouse[0], y: mouse[1], time: currentTime });
          if (state.clicks.length > MAX_RIPPLES) state.clicks.shift();
        }, 250);
      };

      const onDoubleClick = (e) => {
        clearTimeout(clickTimeout);
        // Reset view
        state.center = uniforms.u_center?.value?.() || [-0.7, 0.0];
        state.zoom = uniforms.u_zoom?.value?.() || 3.0;
      };

      canvas.addEventListener("mousedown", onMouseDown);
      canvas.addEventListener("mousemove", onMouseMove);
      canvas.addEventListener("mouseup", onMouseUp);
      canvas.addEventListener("mouseleave", onMouseUp);
      canvas.addEventListener("wheel", onWheel, { passive: false });
      canvas.addEventListener("click", onClick);
      canvas.addEventListener("dblclick", onDoubleClick);

      // ---- render loop ---------------------------------------------
      const start = performance.now();
      const render = () => {
        gl.viewport(0, 0, canvas.width, canvas.height);
        gl.clearColor(0, 0, 0, 1);
        gl.clear(gl.COLOR_BUFFER_BIT);

        gl.useProgram(prog);
        gl.uniform2f(uRes, canvas.width, canvas.height);
        gl.uniform1f(uTime, (performance.now() - start) * 0.001);
        gl.uniform2f(uCenter, state.center[0], state.center[1]);
        gl.uniform1f(uZoom, state.zoom);

        // Mouse uniform
        const currentMouse = state.isDragging ? state.lastMouse : [0, 0];
        gl.uniform2f(uMouse, currentMouse[0], currentMouse[1]);

        // Ripples
        const posArray = new Float32Array(MAX_RIPPLES * 2);
        const timeArray = new Float32Array(MAX_RIPPLES);
        for (let i = 0; i < MAX_RIPPLES; i++) {
          if (i < state.clicks.length) {
            posArray[i * 2] = state.clicks[i].x;
            posArray[i * 2 + 1] = state.clicks[i].y;
            timeArray[i] = state.clicks[i].time;
          } else {
            timeArray[i] = -1.0;
          }
        }
        if (uClickPos) gl.uniform2fv(uClickPos, posArray);
        if (uClickTime) gl.uniform1fv(uClickTime, timeArray);

        // Extra uniforms
        for (const name in uniforms) {
          if (name === "u_center" || name === "u_zoom") continue;
          const uniformDef = uniforms[name];
          let value =
            typeof uniformDef.value === "function"
              ? uniformDef.value()
              : uniformDef.value;
          const loc = extra[name];
          if (!loc) continue;
          if (uniformDef.type === "1f") gl.uniform1f(loc, value);
          else if (uniformDef.type === "1fv") gl.uniform1fv(loc, value);
          else if (uniformDef.type === "2fv") gl.uniform2fv(loc, value);
        }

        gl.drawArrays(gl.TRIANGLES, 0, 6);
        frameRef.current = requestAnimationFrame(render);
      };
      render();

      return () => {
        cancelAnimationFrame(frameRef.current);
        window.removeEventListener("resize", resize);
        canvas.removeEventListener("mousedown", onMouseDown);
        canvas.removeEventListener("mousemove", onMouseMove);
        canvas.removeEventListener("mouseup", onMouseUp);
        canvas.removeEventListener("mouseleave", onMouseUp);
        canvas.removeEventListener("wheel", onWheel);
        canvas.removeEventListener("click", onClick);
        canvas.removeEventListener("dblclick", onDoubleClick);
        gl.deleteProgram(prog);
        gl.deleteShader(vs);
        gl.deleteShader(fs);
        gl.deleteBuffer(posBuf);
      };
    }, []);

    return (
      <canvas
        ref={canvasRef}
        className="w-full h-full cursor-grab active:cursor-grabbing"
      />
    );
  });
};
