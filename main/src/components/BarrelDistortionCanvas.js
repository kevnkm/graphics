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
const ControlPanel = ({ label, value, min, max, step, onChange }) => (
  <div
    className="absolute bottom-8 left-1/2 -translate-x-1/2 pointer-events-auto
                  flex items-center gap-5 px-8 py-4 bg-white rounded-full shadow-2xl
                  select-none z-10"
  >
    <span className="text-gray-800 font-medium text-sm min-w-[100px] text-right">
      {label} {value.toFixed(2)}
    </span>
    <input
      type="range"
      min={min}
      max={max}
      step={step}
      value={value}
      onChange={(e) => onChange(parseFloat(e.target.value))}
      className="w-64 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer
                 [&::-webkit-slider-thumb]:appearance-none
                 [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:w-5
                 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-blue-600
                 [&::-webkit-slider-thumb]:shadow-md"
      style={{
        background: `linear-gradient(to right, #3b3e5fc ${
          ((value - min) / (max - min)) * 100
        }%, #e0e0e0 ${((value - min) / (max - min)) * 100}%)`,
      }}
    />
  </div>
);

/* -------------------------------------------------------------------------- */
/*                                   A1 – 2D CANVAS                           */
/* -------------------------------------------------------------------------- */
export const A1 = () => {
  const canvasRef = useRef(null);
  const [k, setK] = useState(0.3); // distortion coefficient

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resize = () => {
      const parent = canvas.parentElement;
      if (!parent) return;
      canvas.width = parent.clientWidth;
      canvas.height = parent.clientWidth;
    };
    resize();
    window.addEventListener("resize", resize);

    const draw = () => {
      const w = canvas.width;
      const h = canvas.height;
      ctx.fillStyle = "#111";
      ctx.fillRect(0, 0, w, h);

      // ---- draw a regular grid ----
      const step = 30;
      ctx.strokeStyle = "#555";
      ctx.lineWidth = 1;
      for (let x = 0; x < w; x += step) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
        ctx.stroke();
      }
      for (let y = 0; y < h; y += step) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
      }

      // ---- barrel distortion (pixel-by-pixel) ----
      const imgData = ctx.createImageData(w, h);
      const data = imgData.data;

      const cx = w * 0.5;
      const cy = h * 0.5;
      const maxR = Math.min(cx, cy);

      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          const idx = (y * w + x) * 4;

          const nx = (x - cx) / maxR;
          const ny = (y - cy) / maxR;
          const r = Math.sqrt(nx * nx + ny * ny);
          if (r === 0) {
            data[idx] = data[idx + 1] = data[idx + 2] = 255;
            data[idx + 3] = 255;
            continue;
          }

          const theta = Math.atan2(ny, nx);
          const rDist = r * (1.0 + k * r * r); // simple radial model

          const srcX = rDist * Math.cos(theta) * maxR + cx;
          const srcY = rDist * Math.sin(theta) * maxR + cy;

          const ix = Math.round(srcX);
          const iy = Math.round(srcY);

          if (ix >= 0 && ix < w && iy >= 0 && iy < h) {
            const srcIdx = (iy * w + ix) * 4;
            data[idx] = data[srcIdx];
            data[idx + 1] = data[srcIdx + 1];
            data[idx + 2] = data[srcIdx + 2];
            data[idx + 3] = 255;
          } else {
            data[idx] = data[idx + 1] = data[idx + 2] = 0;
            data[idx + 3] = 255;
          }
        }
      }
      ctx.putImageData(imgData, 0, 0);
    };

    draw();
    const id = setInterval(draw, 60); // smooth animation when k changes

    return () => {
      window.removeEventListener("resize", resize);
      clearInterval(id);
    };
  }, [k]);

  return (
    <div className="relative w-full h-full bg-gray-950 flex items-center justify-center overflow-hidden">
      <canvas ref={canvasRef} />
      <ControlPanel
        label="k ="
        value={k}
        min={-1}
        max={1}
        step={0.01}
        onChange={setK}
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
/*                              B1 – Animated Grid                           */
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

export const B1 = () => {
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
/*                           B2 – Rotating Sphere Scene                      */
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

export const B2 = () => {
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

/* -------------------------------------------------------------------------- */
/*                     C1 – Undistort a pre-warped image                      */
/* -------------------------------------------------------------------------- */
export const C1 = () => {
  const canvasRef = useRef(null);
  const imgRef = useRef(null);
  const [k, setK] = useState(0.45); // known distortion of the source image

  // Create a synthetically barrel-distorted checkerboard (the "captured" image)
  useEffect(() => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    const canvas = document.createElement("canvas");
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext("2d");

    // draw checkerboard
    const size = 32;
    for (let y = 0; y < canvas.height; y += size) {
      for (let x = 0; x < canvas.width; x += size) {
        ctx.fillStyle = (x / size + y / size) % 2 === 0 ? "#fff" : "#222";
        ctx.fillRect(x, y, size, size);
      }
    }

    // apply barrel distortion to produce the source texture
    const src = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const dst = ctx.createImageData(canvas.width, canvas.height);
    const dataSrc = src.data;
    const dataDst = dst.data;
    const cx = canvas.width * 0.5;
    const cy = canvas.height * 0.5;
    const maxR = Math.min(cx, cy);

    for (let y = 0; y < canvas.height; y++) {
      for (let x = 0; x < canvas.width; x++) {
        const idx = (y * canvas.width + x) * 4;
        const nx = (x - cx) / maxR;
        const ny = (y - cy) / maxR;
        const r = Math.hypot(nx, ny);
        const theta = Math.atan2(ny, nx);
        const rDist = r * (1.0 + k * r * r);

        const srcX = rDist * Math.cos(theta) * maxR + cx;
        const srcY = rDist * Math.sin(theta) * maxR + cy;
        const ix = Math.round(srcX);
        const iy = Math.round(srcY);

        if (ix >= 0 && ix < canvas.width && iy >= 0 && iy < canvas.height) {
          const sIdx = (iy * canvas.width + ix) * 4;
          dataDst[idx] = dataSrc[sIdx];
          dataDst[idx + 1] = dataSrc[sIdx + 1];
          dataDst[idx + 2] = dataSrc[sIdx + 2];
          dataDst[idx + 3] = 255;
        }
      }
    }
    ctx.putImageData(dst, 0, 0);
    img.src = canvas.toDataURL();
    imgRef.current = img;
  }, [k]);

  // Undistort on the visible canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !imgRef.current) return;
    const gl = canvas.getContext("webgl");
    if (!gl) return;

    const vs = createShader(gl, gl.VERTEX_SHADER, fullscreenVS);
    const fs = createShader(
      gl,
      gl.FRAGMENT_SHADER,
      `
precision highp float;
uniform sampler2D u_tex;
uniform vec2 u_res;
uniform float u_k;

void main() {
  vec2 uv = gl_FragCoord.xy / u_res;
  vec2 tc = uv * 2.0 - 1.0;               // [-1,1]
  float r = length(tc);
  float theta = atan(tc.y, tc.x);

  // inverse mapping: r' = r / (1 + k r²)
  float rUndist = r / (1.0 + u_k * r * r);
  vec2 undist = rUndist * vec2(cos(theta), sin(theta));

  vec2 texCoord = undist * 0.5 + 0.5;     // [0,1]
  vec4 col = texture2D(u_tex, texCoord);
  if (rUndist > 1.0) col = vec4(0.0);
  gl_FragColor = col;
}
`
    );
    const prog = createProgram(gl, vs, fs);
    if (!prog) return;

    // texture
    const tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.RGBA,
      gl.RGBA,
      gl.UNSIGNED_BYTE,
      imgRef.current
    );

    const posBuf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, posBuf);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
      gl.STATIC_DRAW
    );

    const aPos = gl.getAttribLocation(prog, "a_position");
    const uTex = gl.getUniformLocation(prog, "u_tex");
    const uRes = gl.getUniformLocation(prog, "u_res");
    const uK = gl.getUniformLocation(prog, "u_k");

    const resize = () => {
      const parent = canvas.parentElement;
      if (!parent) return;
      canvas.width = parent.clientWidth;
      canvas.height = parent.clientWidth;
    };
    resize();
    window.addEventListener("resize", resize);

    const render = () => {
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.clearColor(0, 0, 0, 1);
      gl.clear(gl.COLOR_BUFFER_BIT);

      gl.useProgram(prog);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.uniform1i(uTex, 0);

      gl.enableVertexAttribArray(aPos);
      gl.bindBuffer(gl.ARRAY_BUFFER, posBuf);
      gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

      gl.uniform2f(uRes, canvas.width, canvas.height);
      gl.uniform1f(uK, k);

      gl.drawArrays(gl.TRIANGLES, 0, 6);
      requestAnimationFrame(render);
    };
    render();

    return () => {
      window.removeEventListener("resize", resize);
      gl.deleteProgram(prog);
      gl.deleteShader(vs);
      gl.deleteShader(fs);
      gl.deleteTexture(tex);
      gl.deleteBuffer(posBuf);
    };
  }, [k]);

  return (
    <div className="relative w-full h-full bg-gray-950 flex items-center justify-center overflow-hidden">
      <canvas ref={canvasRef} />
      <ControlPanel
        label="known k ="
        value={k}
        min={0}
        max={1}
        step={0.01}
        onChange={setK}
      />
    </div>
  );
};
