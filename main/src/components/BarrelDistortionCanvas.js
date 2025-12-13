// src/components/BarrelDistortionCanvas.js
import React, { useRef, useEffect, useState } from "react";

/* -------------------------------------------------------------------------- */
/*                                 COMMON HELPERS                               */
/* -------------------------------------------------------------------------- */
const createShader = (gl, type, source) => {
  const shader = gl.createShader(type);
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (gl.getShaderParameter(shader, gl.COMPILE_STATUS)) return shader;
  console.error(gl.getShaderInfoLog(shader));
  gl.deleteShader(shader);
  return null;
};

const createProgram = (gl, vs, fs) => {
  const program = gl.createProgram();
  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.linkProgram(program);
  if (gl.getProgramParameter(program, gl.LINK_STATUS)) return program;
  console.error(gl.getProgramInfoLog(program));
  gl.deleteProgram(program);
  return null;
};

/* -------------------------------------------------------------------------- */
/*                            IN-CANVAS CONTROL PANEL                          */
/* -------------------------------------------------------------------------- */
const ControlPanel = ({ label, value, min, max, step, onChange }) => {
  const percentage = ((value - min) / (max - min)) * 100;

  return (
    <div
      className="absolute bottom-8 left-1/2 -translate-x-1/2 
                  pointer-events-auto z-10
                  flex items-center gap-4 
                  px-6 py-3.5                /* thinner padding */
                  bg-white 
                  rounded-full 
                  shadow-xl 
                  select-none"
    >
      {/* Label + Value */}
      <div className="flex items-baseline gap-2 whitespace-nowrap pr-2">
        <span className="text-gray-800 font-medium text-sm">{label}</span>
        <span className="text-blue-600 font-semibold text-base min-w-[56px] text-right">
          {value.toFixed(2)}
        </span>
      </div>

      {/* Slider */}
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="flex-1 h-2 bg-gray-200 rounded-full appearance-none cursor-pointer
                   focus:outline-none
                   [&::-webkit-slider-thumb]:appearance-none
                   [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:w-5
                   [&::-webkit-slider-thumb]:rounded-full
                   [&::-webkit-slider-thumb]:bg-blue-600
                   [&::-webkit-slider-thumb]:shadow-md
                   [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white"
        style={{
          background: `linear-gradient(to right, 
            #3b82f6 0%, #3b82f6 ${percentage}%, 
            #e5e7eb ${percentage}%, #e5e7eb 100%)`,
        }}
      />
    </div>
  );
};

/* -------------------------------------------------------------------------- */
/*                         WebGL – COMMON VERTEX SHADER                        */
/* -------------------------------------------------------------------------- */
const fullscreenVS = `
attribute vec2 a_position;
void main() {
  gl_Position = vec4(a_position, 0.0, 1.0);
}
`;

/* -------------------------------------------------------------------------- */
/*                              A1 – Animated Grid                           */
/* -------------------------------------------------------------------------- */
const gridFS = `
precision highp float;
uniform vec2 u_resolution;
uniform float u_time;
uniform float u_distortion;   // k

void main() {
  vec2 uv = (gl_FragCoord.xy - 0.5 * u_resolution) / min(u_resolution.x, u_resolution.y);
  float k = u_distortion;

  // ---- barrel distortion ----
  float r = length(uv);
  float theta = atan(uv.y, uv.x);
  float rDist = r * (1.0 + k * r * r);
  vec2 distorted = rDist * vec2(cos(theta), sin(theta));

  // ---- animated grid in undistorted space ----
  vec2 grid = fract(distorted * 12.0 + u_time * 0.5);
  float line = smoothstep(0.48, 0.52, max(grid.x, grid.y));
  vec3 col = mix(vec3(0.1, 0.1, 0.2), vec3(0.9, 0.8, 0.6), line);

  // black border where distortion pushes outside
  if (rDist > 1.0) col = vec3(0.0);

  gl_FragColor = vec4(col, 1.0);
}
`;

export const A1 = () => {
  const canvasRef = useRef(null);
  const [k, setK] = useState(0.35);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const gl = canvas.getContext("webgl");
    if (!gl) return;

    const vs = createShader(gl, gl.VERTEX_SHADER, fullscreenVS);
    const fs = createShader(gl, gl.FRAGMENT_SHADER, gridFS);
    const prog = createProgram(gl, vs, fs);
    if (!prog) return;

    const posBuf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, posBuf);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
      gl.STATIC_DRAW
    );

    const aPos = gl.getAttribLocation(prog, "a_position");
    const uRes = gl.getUniformLocation(prog, "u_resolution");
    const uTime = gl.getUniformLocation(prog, "u_time");
    const uDist = gl.getUniformLocation(prog, "u_distortion");

    const resize = () => {
      const parent = canvas.parentElement;
      if (!parent) return;
      canvas.width = parent.clientWidth;
      canvas.height = parent.clientWidth;
    };
    resize();
    window.addEventListener("resize", resize);

    let start = performance.now();
    let raf;
    const render = () => {
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.clearColor(0, 0, 0, 1);
      gl.clear(gl.COLOR_BUFFER_BIT);

      gl.useProgram(prog);
      gl.enableVertexAttribArray(aPos);
      gl.bindBuffer(gl.ARRAY_BUFFER, posBuf);
      gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

      gl.uniform2f(uRes, canvas.width, canvas.height);
      gl.uniform1f(uTime, (performance.now() - start) / 1000);
      gl.uniform1f(uDist, k);

      gl.drawArrays(gl.TRIANGLES, 0, 6);
      raf = requestAnimationFrame(render);
    };
    render();

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      gl.deleteProgram(prog);
      gl.deleteShader(vs);
      gl.deleteShader(fs);
      gl.deleteBuffer(posBuf);
    };
  }, [k]);

  return (
    <div className="relative w-full h-full bg-gray-950 flex items-center justify-center overflow-hidden">
      <canvas ref={canvasRef} />
      <ControlPanel
        label="k ="
        value={k}
        min={-0.8}
        max={0.8}
        step={0.01}
        onChange={setK}
      />
    </div>
  );
};

/* -------------------------------------------------------------------------- */
/*                           A2 – Rotating Sphere Scene                      */
/* -------------------------------------------------------------------------- */
const sphereFS = `
precision highp float;
uniform vec2 u_resolution;
uniform float u_time;
uniform float u_distortion;

vec3 rotateY(vec3 p, float a) {
  float c = cos(a), s = sin(a);
  return vec3(c*p.x + s*p.z, p.y, -s*p.x + c*p.z);
}

float sdSphere(vec3 p, float r) { return length(p) - r; }

float map(vec3 p) {
  vec3 q = rotateY(p, u_time);
  return sdSphere(q, 0.7);
}

vec3 calcNormal(vec3 p) {
  const float h = 0.001;
  const vec2 k = vec2(1,-1);
  return normalize( k.xyy*map(p + k.xyy*h) +
                    k.yyx*map(p + k.yyx*h) +
                    k.yxy*map(p + k.yxy*h) +
                    k.xxx*map(p + k.xxx*h) );
}

void main() {
  vec2 uv = (gl_FragCoord.xy - 0.5 * u_resolution) / min(u_resolution.x, u_resolution.y);
  float k = u_distortion;

  // ---- barrel distortion ----
  float r = length(uv);
  float theta = atan(uv.y, uv.x);
  float rDist = r * (1.0 + k * r * r);
  vec2 distorted = rDist * vec2(cos(theta), sin(theta));

  // ray-march in undistorted space
  vec3 ro = vec3(0.0, 0.0, -3.0);
  vec3 rd = normalize(vec3(distorted, 1.0));

  float t = 0.0;
  for(int i=0; i<80; i++) {
    vec3 p = ro + rd * t;
    float d = map(p);
    t += d;
    if (d < 0.001 || t > 10.0) break;
  }

  vec3 col = vec3(0.05, 0.07, 0.12);
  if (t < 10.0) {
    vec3 p = ro + rd * t;
    vec3 n = calcNormal(p);
    vec3 light = normalize(vec3(1.0, 1.5, -2.0));
    float diff = max(dot(n, light), 0.0);
    col = mix(vec3(0.2, 0.5, 0.9), vec3(1.0, 0.9, 0.7), diff);
  }

  if (rDist > 1.0) col = vec3(0.0);
  gl_FragColor = vec4(col, 1.0);
}
`;

export const A2 = () => {
  const canvasRef = useRef(null);
  const [k, setK] = useState(0.4);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const gl = canvas.getContext("webgl");
    if (!gl) return;

    const vs = createShader(gl, gl.VERTEX_SHADER, fullscreenVS);
    const fs = createShader(gl, gl.FRAGMENT_SHADER, sphereFS);
    const prog = createProgram(gl, vs, fs);
    if (!prog) return;

    const posBuf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, posBuf);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
      gl.STATIC_DRAW
    );

    const aPos = gl.getAttribLocation(prog, "a_position");
    const uRes = gl.getUniformLocation(prog, "u_resolution");
    const uTime = gl.getUniformLocation(prog, "u_time");
    const uDist = gl.getUniformLocation(prog, "u_distortion");

    const resize = () => {
      const parent = canvas.parentElement;
      if (!parent) return;
      canvas.width = parent.clientWidth;
      canvas.height = parent.clientWidth;
    };
    resize();
    window.addEventListener("resize", resize);

    let start = performance.now();
    let raf;
    const render = () => {
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.clearColor(0, 0, 0, 1);
      gl.clear(gl.COLOR_BUFFER_BIT);

      gl.useProgram(prog);
      gl.enableVertexAttribArray(aPos);
      gl.bindBuffer(gl.ARRAY_BUFFER, posBuf);
      gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

      gl.uniform2f(uRes, canvas.width, canvas.height);
      gl.uniform1f(uTime, (performance.now() - start) / 1000);
      gl.uniform1f(uDist, k);

      gl.drawArrays(gl.TRIANGLES, 0, 6);
      raf = requestAnimationFrame(render);
    };
    render();

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      gl.deleteProgram(prog);
      gl.deleteShader(vs);
      gl.deleteShader(fs);
      gl.deleteBuffer(posBuf);
    };
  }, [k]);

  return (
    <div className="relative w-full h-full bg-gray-950 flex items-center justify-center overflow-hidden">
      <canvas ref={canvasRef} />
      <ControlPanel
        label="k ="
        value={k}
        min={-0.8}
        max={0.8}
        step={0.01}
        onChange={setK}
      />
    </div>
  );
};
