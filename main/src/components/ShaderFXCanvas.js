import React, { useRef, useEffect } from "react";

const vertexShaderSource = `
  attribute vec2 a_position;
  void main() {
    gl_Position = vec4(a_position, 0.0, 1.0);
  }
`;

const fragmentShaderSource = `
  precision mediump float;
  uniform vec2 u_resolution;
  uniform float u_time;
  uniform vec2 u_points[100]; // Increased to 100 points

  void main() {
    vec2 uv = gl_FragCoord.xy / u_resolution.xy * 2.0 - 1.0;
    
    float minDist = 1000.0;
    float secondMinDist = 1000.0;
    for (int i = 0; i < 100; i++) {
      vec2 point = u_points[i];
      point.x += sin(u_time + float(i)) * 0.05;
      point.y += cos(u_time + float(i)) * 0.05;
      float dist = distance(uv, point);
      if (dist < minDist) {
        secondMinDist = minDist;
        minDist = dist;
      } else if (dist < secondMinDist) {
        secondMinDist = dist;
      }
    }

    vec3 cellColor = vec3(0.2, 0.6, 0.6);
    float borderThreshold = 0.02;
    float border = smoothstep(borderThreshold, 0.0, secondMinDist - minDist);
    vec3 color = mix(cellColor, vec3(0.1, 0.3, 0.3), border);

    float vertexThreshold = 0.01;
    float vertexStrength = smoothstep(vertexThreshold, 0.0, secondMinDist - minDist) * 
                          smoothstep(0.1, 0.0, minDist);
    color = mix(color, vec3(1.0, 0.8, 0.0), vertexStrength);

    float edgeFade = smoothstep(0.0, 0.3, minDist);
    color = mix(color, vec3(0.05, 0.1, 0.1), edgeFade);

    gl_FragColor = vec4(color, 1.0);
  }
`;

const createShader = (gl, type, source) => {
  const shader = gl.createShader(type);
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  const success = gl.getShaderParameter(shader, gl.COMPILE_STATUS);
  if (!success) {
    console.error(gl.getShaderInfoLog(shader));
    gl.deleteShader(shader);
    return null;
  }
  return shader;
};

const createProgram = (gl, vertexShader, fragmentShader) => {
  const program = gl.createProgram();
  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);
  const success = gl.getProgramParameter(program, gl.LINK_STATUS);
  if (!success) {
    console.error(gl.getProgramInfoLog(program));
    gl.deleteProgram(program);
    return null;
  }
  return program;
};

export const A1 = () => {
  const canvasRef = useRef(null);
  const draggingRef = useRef({ pointIndex: -1, touchId: null });

  const points = useRef(
    Array.from({ length: 100 }, () => ({
      x: Math.random() * 2 - 1,
      y: Math.random() * 2 - 1,
    }))
  ).current;

  useEffect(() => {
    const canvas = canvasRef.current;
    const gl = canvas.getContext("webgl");
    if (!gl) {
      alert("Your browser does not support WebGL");
      return;
    }

    const vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
    const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource);
    const program = createProgram(gl, vertexShader, fragmentShader);
    if (!program) return;

    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    const positions = new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]);
    gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);

    const positionLocation = gl.getAttribLocation(program, "a_position");
    gl.enableVertexAttribArray(positionLocation);
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

    const resolutionLocation = gl.getUniformLocation(program, "u_resolution");
    const timeLocation = gl.getUniformLocation(program, "u_time");
    const pointsLocation = gl.getUniformLocation(program, "u_points");

    const toSceneX = (x) => (x / canvas.width) * 2 - 1;
    const toSceneY = (y) => -((y / canvas.height) * 2 - 1);

    const render = (time) => {
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.clearColor(0.05, 0.1, 0.1, 1);
      gl.clear(gl.COLOR_BUFFER_BIT);

      gl.useProgram(program);
      gl.uniform2f(resolutionLocation, canvas.width, canvas.height);
      gl.uniform1f(timeLocation, time * 0.001);
      gl.uniform2fv(pointsLocation, points.flatMap(p => [p.x, p.y]));

      gl.drawArrays(gl.TRIANGLES, 0, 6);
      requestAnimationFrame(render);
    };

    const isPointInRange = (x, y, point) => {
      const dx = x - point.x;
      const dy = y - point.y;
      return Math.sqrt(dx * dx + dy * dy) < 0.05; // Smaller click radius for more points
    };

    const handleMouseDown = (event) => {
      const rect = canvas.getBoundingClientRect();
      const x = toSceneX(event.clientX - rect.left);
      const y = toSceneY(event.clientY - rect.top);
      for (let i = 0; i < points.length; i++) {
        if (isPointInRange(x, y, points[i])) {
          draggingRef.current.pointIndex = i;
          break;
        }
      }
    };

    const handleMouseMove = (event) => {
      const rect = canvas.getBoundingClientRect();
      const x = toSceneX(event.clientX - rect.left);
      const y = toSceneY(event.clientY - rect.top);
      if (draggingRef.current.pointIndex !== -1) {
        points[draggingRef.current.pointIndex].x = x;
        points[draggingRef.current.pointIndex].y = y;
      }
    };

    const handleMouseUp = () => {
      draggingRef.current.pointIndex = -1;
    };

    const handleTouchStart = (event) => {
      event.preventDefault();
      const rect = canvas.getBoundingClientRect();
      const touch = event.touches[0];
      const x = toSceneX(touch.clientX - rect.left);
      const y = toSceneY(touch.clientY - rect.top);
      for (let i = 0; i < points.length; i++) {
        if (isPointInRange(x, y, points[i])) {
          draggingRef.current.pointIndex = i;
          draggingRef.current.touchId = touch.identifier;
          break;
        }
      }
    };

    const handleTouchMove = (event) => {
      event.preventDefault();
      const rect = canvas.getBoundingClientRect();
      const touches = event.touches;
      for (let i = 0; i < touches.length; i++) {
        if (touches[i].identifier === draggingRef.current.touchId) {
          const x = toSceneX(touches[i].clientX - rect.left);
          const y = toSceneY(touches[i].clientY - rect.top);
          if (draggingRef.current.pointIndex !== -1) {
            points[draggingRef.current.pointIndex].x = x;
            points[draggingRef.current.pointIndex].y = y;
          }
          break;
        }
      }
    };

    const handleTouchEnd = (event) => {
      event.preventDefault();
      const touches = event.changedTouches;
      for (let i = 0; i < touches.length; i++) {
        if (touches[i].identifier === draggingRef.current.touchId) {
          draggingRef.current.pointIndex = -1;
          draggingRef.current.touchId = null;
          break;
        }
      }
    };

    const handleResize = () => {
      const parent = canvas.parentElement;
      if (!parent) return;
      canvas.width = parent.clientWidth;
      canvas.height = parent.clientWidth;
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    canvas.addEventListener("mousedown", handleMouseDown);
    canvas.addEventListener("mousemove", handleMouseMove);
    canvas.addEventListener("mouseup", handleMouseUp);
    canvas.addEventListener("touchstart", handleTouchStart);
    canvas.addEventListener("touchmove", handleTouchMove);
    canvas.addEventListener("touchend", handleTouchEnd);

    requestAnimationFrame(render);

    return () => {
      window.removeEventListener("resize", handleResize);
      canvas.removeEventListener("mousedown", handleMouseDown);
      canvas.removeEventListener("mousemove", handleMouseMove);
      canvas.removeEventListener("mouseup", handleMouseUp);
      canvas.removeEventListener("touchstart", handleTouchStart);
      canvas.removeEventListener("touchmove", handleTouchMove);
      canvas.removeEventListener("touchend", handleTouchEnd);
    };
  }, []);

  return <canvas ref={canvasRef} style={{ width: "100%", height: "100%" }} />;
};

const rayMarchingVertexShaderSource = `
  attribute vec2 a_position;
  void main() {
    gl_Position = vec4(a_position, 0.0, 1.0);
  }
`;

const rayMarchingFragmentShaderSource = `
  precision highp float;

  uniform vec2 u_resolution;
  uniform float u_time;
  uniform vec2 u_mouse;
  uniform float u_smoothness; // New uniform for controlling smooth blending

  const int MAX_STEPS = 100;
  const float MAX_DIST = 100.0;
  const float SURF_DIST = 0.001;
  const vec3 LIGHT_POS = vec3(2.0, 5.0, 3.0);

  // Smooth minimum function for blending
  float smin(float a, float b, float k) {
    float h = clamp(0.5 + 0.5 * (b - a) / k, 0.0, 1.0);
    return mix(b, a, h) - k * h * (1.0 - h);
  }

  // SDF Functions
  float sdSphere(vec3 p, float r) {
    return length(p) - r;
  }

  float sdTorus(vec3 p, vec2 t) {
    vec2 q = vec2(length(p.xz) - t.x, p.y);
    return length(q) - t.y;
  }

  float sdBox(vec3 p, vec3 b) {
    vec3 q = abs(p) - b;
    return length(max(q, 0.0)) + min(max(q.x, max(q.y, q.z)), 0.0);
  }

  float sdCapsule(vec3 p, vec3 a, vec3 b, float r) {
    vec3 pa = p - a, ba = b - a;
    float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);
    return length(pa - ba * h) - r;
  }

  // Scene definition with smooth blending
  float sceneSDF(vec3 p) {
    float t = u_time * 0.5;
    float k = u_smoothness; // Smoothness factor
    
    // Combine multiple objects with smooth blending
    float d1 = sdSphere(p - vec3(-2.0, 0.0, 0.0), 1.0);
    float d2 = sdTorus(vec3(p.x, p.y - sin(t), p.z) - vec3(0.0, 0.0, 0.0), vec2(1.5, 0.3));
    float d3 = sdBox(p - vec3(2.0, 0.0, 0.0), vec3(0.8));
    float d4 = sdCapsule(p, vec3(-1.0, -1.0, 2.0), vec3(-1.0, 1.0, 2.0), 0.3);
    
    // Nested smooth minimum operations
    float d12 = smin(d1, d2, k);
    float d34 = smin(d3, d4, k);
    return smin(d12, d34, k);
  }

  // Normal calculation using finite differences
  vec3 calcNormal(vec3 p) {
    const float h = 0.0001;
    const vec2 k = vec2(1.0, -1.0);
    return normalize(
      k.xyy * sceneSDF(p + k.xyy * h) +
      k.yyx * sceneSDF(p + k.yyx * h) +
      k.yxy * sceneSDF(p + k.yxy * h) +
      k.xxx * sceneSDF(p + k.xxx * h)
    );
  }

  // Soft shadow calculation
  float softShadow(vec3 ro, vec3 rd, float mint, float maxt, float k) {
    float res = 1.0;
    float t = mint;
    for(int i = 0; i < 16; i++) {
      float h = sceneSDF(ro + rd * t);
      res = min(res, k * h / t);
      t += clamp(h, 0.02, 0.1);
      if(res < 0.001 || t > maxt) break;
    }
    return clamp(res, 0.0, 1.0);
  }

  // Ambient occlusion
  float calcAO(vec3 pos, vec3 nor) {
    float occ = 0.0;
    float sca = 1.0;
    for(int i = 0; i < 5; i++) {
      float h = 0.01 + 0.12 * float(i) / 4.0;
      float d = sceneSDF(pos + h * nor);
      occ += (h - d) * sca;
      sca *= 0.95;
    }
    return clamp(1.0 - 3.0 * occ, 0.0, 1.0);
  }

  // Ray marching
  float rayMarch(vec3 ro, vec3 rd) {
    float t = 0.0;
    for(int i = 0; i < MAX_STEPS; i++) {
      vec3 p = ro + rd * t;
      float d = sceneSDF(p);
      t += d;
      if(d < SURF_DIST || t > MAX_DIST) break;
    }
    return t;
  }

  void main() {
    vec2 uv = (gl_FragCoord.xy - 0.5 * u_resolution) / u_resolution.y;
    vec3 ro = vec3(0.0, 0.0, -5.0); // Ray origin
    vec3 rd = normalize(vec3(uv, 1.0)); // Ray direction

    // Camera rotation based on mouse
    float yaw = u_mouse.x * 2.0;
    float pitch = u_mouse.y * 2.0;
    mat3 rotY = mat3(
      cos(yaw), 0.0, sin(yaw),
      0.0, 1.0, 0.0,
      -sin(yaw), 0.0, cos(yaw)
    );
    mat3 rotX = mat3(
      1.0, 0.0, 0.0,
      0.0, cos(pitch), -sin(pitch),
      0.0, sin(pitch), cos(pitch)
    );
    rd = rotX * rotY * rd;
    ro = rotX * rotY * ro;

    float t = rayMarch(ro, rd);
    vec3 col = vec3(0.0);

    if(t < MAX_DIST) {
      vec3 p = ro + rd * t;
      vec3 n = calcNormal(p);
      vec3 lightDir = normalize(LIGHT_POS - p);
      
      // Lambertian lighting
      float diff = max(dot(n, lightDir), 0.0);
      
      // Soft shadows
      float shadow = softShadow(p, lightDir, 0.02, length(LIGHT_POS - p), 8.0);
      
      // Ambient occlusion
      float ao = calcAO(p, n);

      // Base material color
      vec3 baseColor = vec3(0.8, 0.7, 0.6);
      
      // Lighting calculation
      vec3 ambient = vec3(0.1) * ao;
      vec3 diffuse = baseColor * diff * shadow;
      col = ambient + diffuse;

      // Fog
      float fog = exp(-0.01 * t * t);
      col = mix(vec3(0.5, 0.6, 0.7), col, fog);
    } else {
      // Background
      col = vec3(0.5, 0.6, 0.7);
    }

    // Gamma correction
    col = pow(col, vec3(0.4545));
    gl_FragColor = vec4(col, 1.0);
  }
`;

export const B1 = () => {
  const canvasRef = useRef(null);
  const mousePosRef = useRef({ x: 0, y: 0 });
  useEffect(() => {
    let isMounted = true;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const gl = canvas.getContext("webgl");
    if (!gl) {
      alert("Your browser does not support WebGL");
      return;
    }

    const vertexShader = createShader(
      gl,
      gl.VERTEX_SHADER,
      rayMarchingVertexShaderSource
    );
    const fragmentShader = createShader(
      gl,
      gl.FRAGMENT_SHADER,
      rayMarchingFragmentShaderSource
    );
    if (!vertexShader || !fragmentShader) return;

    const program = createProgram(gl, vertexShader, fragmentShader);
    if (!program) return;

    const positionBuffer = gl.createBuffer();
    if (!positionBuffer) {
      console.error("Failed to create buffer");
      return;
    }

    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
      gl.STATIC_DRAW
    );

    const positionAttributeLocation = gl.getAttribLocation(
      program,
      "a_position"
    );
    const resolutionUniformLocation = gl.getUniformLocation(
      program,
      "u_resolution"
    );
    const timeUniformLocation = gl.getUniformLocation(program, "u_time");
    const mouseUniformLocation = gl.getUniformLocation(program, "u_mouse");
    const smoothnessUniformLocation = gl.getUniformLocation(
      program,
      "u_smoothness"
    );

    let startTime = performance.now();
    let animationFrameId;

    const draw = () => {
      if (!isMounted || !program || !positionBuffer) return;
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.clearColor(0, 0, 0, 1);
      gl.clear(gl.COLOR_BUFFER_BIT);

      gl.useProgram(program);
      gl.enableVertexAttribArray(positionAttributeLocation);
      gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
      gl.vertexAttribPointer(
        positionAttributeLocation,
        2,
        gl.FLOAT,
        false,
        0,
        0
      );

      gl.uniform2f(resolutionUniformLocation, canvas.width, canvas.height);
      gl.uniform1f(timeUniformLocation, (performance.now() - startTime) / 1000);
      gl.uniform2f(
        mouseUniformLocation,
        mousePosRef.current.x,
        mousePosRef.current.y
      );
      gl.uniform1f(smoothnessUniformLocation, 0.5); // Set smoothness value (adjustable: 0.1-1.0 recommended)

      gl.drawArrays(gl.TRIANGLES, 0, 6);
      animationFrameId = requestAnimationFrame(draw);
    };

    const handleResize = () => {
      const parent = canvas.parentElement;
      if (!parent) return;
      canvas.width = parent.clientWidth;
      canvas.height = parent.clientWidth;
    };

    const handleMouseMove = (event) => {
      const rect = canvas.getBoundingClientRect();
      const x = (event.clientX - rect.left) / canvas.width;
      const y = (event.clientY - rect.top) / canvas.height;
      mousePosRef.current = { x: x * 2 - 1, y: -(y * 2 - 1) };
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    canvas.addEventListener("mousemove", handleMouseMove);
    requestAnimationFrame(draw);

    return () => {
      isMounted = false;
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener("resize", handleResize);
      canvas.removeEventListener("mousemove", handleMouseMove);
      if (positionBuffer) gl.deleteBuffer(positionBuffer);
      if (program) gl.deleteProgram(program);
      if (vertexShader) gl.deleteShader(vertexShader);
      if (fragmentShader) gl.deleteShader(fragmentShader);
    };
  }, []);

  return <canvas ref={canvasRef} style={{ width: "100%", height: "100%" }} />;
};
