import React, { useRef, useEffect, useState } from "react";

const generalVertexShaderSource = `
attribute vec4 a_position;
void main() {
  gl_Position = a_position;
}
`;

const generalFragmentShaderSource = `
precision mediump float;
uniform vec4 u_color;
void main() {
  gl_FragColor = u_color;
}
`;

const circleVertexShaderSource = `
attribute vec2 a_position;
attribute vec2 a_center;
attribute float a_radius;
attribute vec4 a_color;
varying vec2 v_position;
varying vec4 v_color;
void main() {
  gl_Position = vec4(a_position * a_radius * 2.0 + a_center, 0.0, 1.0);
  v_position = a_position;
  v_color = a_color;
}
`;

const circleFragmentShaderSource = `
precision mediump float;
varying vec2 v_position;
varying vec4 v_color;
void main() {
  float dist = length(v_position);
  if (dist > 0.5) discard;
  gl_FragColor = v_color;
}
`;

const createShader = (gl, type, source) => {
  const shader = gl.createShader(type);
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  const success = gl.getShaderParameter(shader, gl.COMPILE_STATUS);
  if (success) return shader;
  console.error(gl.getShaderInfoLog(shader));
  gl.deleteShader(shader);
  return null;
};

const createProgram = (gl, vertexShader, fragmentShader) => {
  const program = gl.createProgram();
  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);
  const success = gl.getProgramParameter(program, gl.LINK_STATUS);
  if (success) return program;
  console.error(gl.getProgramInfoLog(program));
  gl.deleteProgram(program);
  return null;
};

export const A1 = () => {
  const canvasRef = useRef(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [isMouseOver, setIsMouseOver] = useState(false);

  const obstacles = [
    { x: -0.7, y: 0.3, width: 0.2, height: 0.4 },
    { x: 0.2, y: -0.5, width: 0.3, height: 0.2 },
    { x: -0.2, y: 0.0, width: 0.15, height: 0.6 },
  ];

  useEffect(() => {
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
      generalVertexShaderSource
    );
    const fragmentShader = createShader(
      gl,
      gl.FRAGMENT_SHADER,
      generalFragmentShaderSource
    );
    const program = createProgram(gl, vertexShader, fragmentShader);

    if (!program) return;

    const positionAttributeLocation = gl.getAttribLocation(
      program,
      "a_position"
    );
    const colorUniformLocation = gl.getUniformLocation(program, "u_color");
    const positionBuffer = gl.createBuffer();

    const draw = (gl) => {
      gl.clearColor(0, 0, 0, 1);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.useProgram(program);
      gl.enableVertexAttribArray(positionAttributeLocation);
      gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);

      gl.uniform4f(colorUniformLocation, 0.5, 0.5, 0.5, 1.0);
      obstacles.forEach((obstacle) => {
        const positions = [
          obstacle.x,
          obstacle.y,
          obstacle.x + obstacle.width,
          obstacle.y,
          obstacle.x,
          obstacle.y - obstacle.height,
          obstacle.x + obstacle.width,
          obstacle.y,
          obstacle.x + obstacle.width,
          obstacle.y - obstacle.height,
          obstacle.x,
          obstacle.y - obstacle.height,
        ];

        gl.bufferData(
          gl.ARRAY_BUFFER,
          new Float32Array(positions),
          gl.STATIC_DRAW
        );
        gl.vertexAttribPointer(
          positionAttributeLocation,
          2,
          gl.FLOAT,
          false,
          0,
          0
        );
        gl.drawArrays(gl.TRIANGLES, 0, 6);
      });

      const circlePoints = 64;
      const radius = 0.02;
      const positions = [];
      const drawMouseX = isMouseOver ? mousePos.x : 0;
      const drawMouseY = isMouseOver ? mousePos.y : 0;

      for (let i = 0; i < circlePoints; i++) {
        const angle = (i / circlePoints) * 2 * Math.PI;
        const x = drawMouseX + radius * Math.cos(angle);
        const y = drawMouseY + radius * Math.sin(angle);
        positions.push(x, y);
      }

      gl.uniform4f(colorUniformLocation, 1.0, 0.0, 0.0, 1.0);
      gl.bufferData(
        gl.ARRAY_BUFFER,
        new Float32Array(positions),
        gl.STATIC_DRAW
      );
      gl.vertexAttribPointer(
        positionAttributeLocation,
        2,
        gl.FLOAT,
        false,
        0,
        0
      );
      gl.drawArrays(gl.TRIANGLE_FAN, 0, circlePoints);
    };

    const handleResize = () => {
      const parent = canvas.parentElement;
      if (!parent) return;

      canvas.width = parent.clientWidth;
      canvas.height = parent.clientWidth;
      gl.viewport(0, 0, canvas.width, canvas.height);
      draw(gl);
    };

    const handleMouseMove = (event) => {
      const rect = canvas.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;

      setMousePos({
        x: (x / canvas.width) * 2 - 1,
        y: -(y / canvas.height) * 2 + 1,
      });

      draw(gl);
    };

    const handleMouseEnter = () => {
      setIsMouseOver(true);
    };

    const handleMouseLeave = () => {
      setIsMouseOver(false);
      draw(gl);
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    canvas.addEventListener("mousemove", handleMouseMove);
    canvas.addEventListener("mouseenter", handleMouseEnter);
    canvas.addEventListener("mouseleave", handleMouseLeave);

    draw(gl);

    return () => {
      window.removeEventListener("resize", handleResize);
      canvas.removeEventListener("mousemove", handleMouseMove);
      canvas.removeEventListener("mouseenter", handleMouseEnter);
      canvas.removeEventListener("mouseleave", handleMouseLeave);
      gl.deleteBuffer(positionBuffer);
      gl.deleteProgram(program);
      gl.deleteShader(vertexShader);
      gl.deleteShader(fragmentShader);
    };
  }, [mousePos]);

  return <canvas ref={canvasRef} style={{ width: "100%", height: "100%" }} />;
};

export const A2 = () => {
  const canvasRef = useRef(null);
  const mousePosRef = useRef({ x: 0, y: 0 });
  const initialDirRef = useRef({ x: 0, y: 0 });

  const obstacles = [
    { x: -0.7, y: 0.3, width: 0.2, height: 0.4 },
    { x: 0.2, y: -0.5, width: 0.3, height: 0.2 },
    { x: -0.2, y: 0.0, width: 0.15, height: 0.6 },
  ];

  const rayWidth = 0.01;

  // Set random initial direction once on mount
  useEffect(() => {
    const angle = Math.random() * 2 * Math.PI;
    initialDirRef.current = {
      x: Math.cos(angle),
      y: Math.sin(angle),
    };
  }, []);

  // Ray casting function
  const castRay = (startX, startY, dirX, dirY) => {
    let t = Infinity;
    let hitX = startX;
    let hitY = startY;

    obstacles.forEach((obstacle) => {
      const left = obstacle.x;
      const right = obstacle.x + obstacle.width;
      const top = obstacle.y;
      const bottom = obstacle.y - obstacle.height;

      const tMinX = (left - startX) / dirX;
      const tMaxX = (right - startX) / dirX;
      const tMinY = (top - startY) / dirY;
      const tMaxY = (bottom - startY) / dirY;

      const tX1 = Math.min(tMinX, tMaxX);
      const tX2 = Math.max(tMinX, tMaxX);
      const tY1 = Math.min(tMinY, tMaxY);
      const tY2 = Math.max(tMinY, tMaxY);

      const tNear = Math.max(tX1, tY1);
      const tFar = Math.min(tX2, tY2);

      if (tNear > 0 && tNear < tFar && tNear < t) {
        t = tNear;
        hitX = startX + t * dirX;
        hitY = startY + t * dirY;
      }
    });

    if (t === Infinity) {
      hitX = startX + dirX * 2;
      hitY = startY + dirY * 2;
    }

    return { x: hitX, y: hitY };
  };

  useEffect(() => {
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
      generalVertexShaderSource
    );
    const fragmentShader = createShader(
      gl,
      gl.FRAGMENT_SHADER,
      generalFragmentShaderSource
    );
    const program = createProgram(gl, vertexShader, fragmentShader);

    if (!program) return;

    const positionAttributeLocation = gl.getAttribLocation(
      program,
      "a_position"
    );
    const colorUniformLocation = gl.getUniformLocation(program, "u_color");
    const positionBuffer = gl.createBuffer();

    const draw = () => {
      gl.clearColor(0, 0, 0, 1);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.useProgram(program);
      gl.enableVertexAttribArray(positionAttributeLocation);
      gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);

      gl.uniform4f(colorUniformLocation, 0.5, 0.5, 0.5, 1.0);
      obstacles.forEach((obstacle) => {
        const positions = [
          obstacle.x,
          obstacle.y,
          obstacle.x + obstacle.width,
          obstacle.y,
          obstacle.x,
          obstacle.y - obstacle.height,
          obstacle.x + obstacle.width,
          obstacle.y,
          obstacle.x + obstacle.width,
          obstacle.y - obstacle.height,
          obstacle.x,
          obstacle.y - obstacle.height,
        ];
        gl.bufferData(
          gl.ARRAY_BUFFER,
          new Float32Array(positions),
          gl.STATIC_DRAW
        );
        gl.vertexAttribPointer(
          positionAttributeLocation,
          2,
          gl.FLOAT,
          false,
          0,
          0
        );
        gl.drawArrays(gl.TRIANGLES, 0, 6);
      });

      // Calculate ray direction
      const rayStartX = 0;
      const rayStartY = 0;
      let rayDirX, rayDirY;

      const mouseMoved =
        mousePosRef.current.x !== 0 || mousePosRef.current.y !== 0;
      if (mouseMoved) {
        rayDirX = mousePosRef.current.x - rayStartX;
        rayDirY = mousePosRef.current.y - rayStartY;
        const length = Math.sqrt(rayDirX * rayDirX + rayDirY * rayDirY);
        rayDirX /= length;
        rayDirY /= length;
      } else {
        rayDirX = initialDirRef.current.x;
        rayDirY = initialDirRef.current.y;
      }

      const hit = castRay(rayStartX, rayStartY, rayDirX, rayDirY);

      gl.uniform4f(colorUniformLocation, 1.0, 1.0, 0.0, 1.0);

      const perpX = -rayDirY;
      const perpY = rayDirX;
      const halfWidth = rayWidth / 2;

      const rayPositions = [
        // First triangle
        rayStartX - perpX * halfWidth,
        rayStartY - perpY * halfWidth, // Bottom left
        rayStartX + perpX * halfWidth,
        rayStartY + perpY * halfWidth, // Top left
        hit.x - perpX * halfWidth,
        hit.y - perpY * halfWidth, // Bottom right
        // Second triangle
        rayStartX + perpX * halfWidth,
        rayStartY + perpY * halfWidth, // Top left
        hit.x + perpX * halfWidth,
        hit.y + perpY * halfWidth, // Top right
        hit.x - perpX * halfWidth,
        hit.y - perpY * halfWidth, // Bottom right
      ];
      gl.bufferData(
        gl.ARRAY_BUFFER,
        new Float32Array(rayPositions),
        gl.STATIC_DRAW
      );
      gl.vertexAttribPointer(
        positionAttributeLocation,
        2,
        gl.FLOAT,
        false,
        0,
        0
      );
      gl.drawArrays(gl.TRIANGLES, 0, 6);

      const circlePoints = 64;
      const radius = 0.02;
      const positions = [];
      for (let i = 0; i < circlePoints; i++) {
        const angle = (i / circlePoints) * 2 * Math.PI;
        const x = hit.x + radius * Math.cos(angle);
        const y = hit.y + radius * Math.sin(angle);
        positions.push(x, y);
      }
      gl.uniform4f(colorUniformLocation, 1.0, 0.0, 0.0, 1.0);
      gl.bufferData(
        gl.ARRAY_BUFFER,
        new Float32Array(positions),
        gl.STATIC_DRAW
      );
      gl.vertexAttribPointer(
        positionAttributeLocation,
        2,
        gl.FLOAT,
        false,
        0,
        0
      );
      gl.drawArrays(gl.TRIANGLE_FAN, 0, circlePoints);
    };

    const handleResize = () => {
      const parent = canvas.parentElement;
      if (!parent) return;
      canvas.width = parent.clientWidth;
      canvas.height = parent.clientWidth;
      gl.viewport(0, 0, canvas.width, canvas.height);
      draw();
    };

    const handleMouseMove = (event) => {
      const rect = canvas.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;

      mousePosRef.current = {
        x: (x / canvas.width) * 2 - 1,
        y: -(y / canvas.height) * 2 + 1,
      };

      draw();
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    canvas.addEventListener("mousemove", handleMouseMove);
    draw();

    return () => {
      window.removeEventListener("resize", handleResize);
      canvas.removeEventListener("mousemove", handleMouseMove);
      gl.deleteBuffer(positionBuffer);
      gl.deleteProgram(program);
      gl.deleteShader(vertexShader);
      gl.deleteShader(fragmentShader);
    };
  }, []);

  return <canvas ref={canvasRef} style={{ width: "100%", height: "100%" }} />;
};

export const A3 = () => {
  const canvasRef = useRef(null);
  const mousePosRef = useRef({ x: 0, y: 0 });
  const initialDirRef = useRef({ x: 0, y: 0 });

  const obstacles = [
    { x: -0.7, y: 0.3, width: 0.2, height: 0.4 },
    { x: 0.2, y: -0.5, width: 0.3, height: 0.2 },
    { x: -0.2, y: 0.0, width: 0.15, height: 0.6 },
  ];

  // Ray parameters
  const rayWidth = 0.005; // Thinner rays for multiple casts
  const fov = Math.PI / 3; // 60-degree field of view
  const rayCount = 20; // Number of rays in the FOV

  // Set random initial direction once on mount
  useEffect(() => {
    const angle = Math.random() * 2 * Math.PI;
    initialDirRef.current = {
      x: Math.cos(angle),
      y: Math.sin(angle),
    };
  }, []);

  const castRay = (startX, startY, dirX, dirY) => {
    let t = Infinity;
    let hitX = startX;
    let hitY = startY;

    obstacles.forEach((obstacle) => {
      const left = obstacle.x;
      const right = obstacle.x + obstacle.width;
      const top = obstacle.y;
      const bottom = obstacle.y - obstacle.height;

      const tMinX = (left - startX) / dirX;
      const tMaxX = (right - startX) / dirX;
      const tMinY = (top - startY) / dirY;
      const tMaxY = (bottom - startY) / dirY;

      const tX1 = Math.min(tMinX, tMaxX);
      const tX2 = Math.max(tMinX, tMaxX);
      const tY1 = Math.min(tMinY, tMaxY);
      const tY2 = Math.max(tMinY, tMaxY);

      const tNear = Math.max(tX1, tY1);
      const tFar = Math.min(tX2, tY2);

      if (tNear > 0 && tNear < tFar && tNear < t) {
        t = tNear;
        hitX = startX + t * dirX;
        hitY = startY + t * dirY;
      }
    });

    if (t === Infinity) {
      hitX = startX + dirX * 2;
      hitY = startY + dirY * 2;
    }

    return { x: hitX, y: hitY };
  };

  useEffect(() => {
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
      generalVertexShaderSource
    );
    const fragmentShader = createShader(
      gl,
      gl.FRAGMENT_SHADER,
      generalFragmentShaderSource
    );
    const program = createProgram(gl, vertexShader, fragmentShader);

    if (!program) return;

    const positionAttributeLocation = gl.getAttribLocation(
      program,
      "a_position"
    );
    const colorUniformLocation = gl.getUniformLocation(program, "u_color");
    const positionBuffer = gl.createBuffer();

    const draw = () => {
      gl.clearColor(0, 0, 0, 1);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.useProgram(program);
      gl.enableVertexAttribArray(positionAttributeLocation);
      gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);

      gl.uniform4f(colorUniformLocation, 0.5, 0.5, 0.5, 1.0);
      obstacles.forEach((obstacle) => {
        const positions = [
          obstacle.x,
          obstacle.y,
          obstacle.x + obstacle.width,
          obstacle.y,
          obstacle.x,
          obstacle.y - obstacle.height,
          obstacle.x + obstacle.width,
          obstacle.y,
          obstacle.x + obstacle.width,
          obstacle.y - obstacle.height,
          obstacle.x,
          obstacle.y - obstacle.height,
        ];
        gl.bufferData(
          gl.ARRAY_BUFFER,
          new Float32Array(positions),
          gl.STATIC_DRAW
        );
        gl.vertexAttribPointer(
          positionAttributeLocation,
          2,
          gl.FLOAT,
          false,
          0,
          0
        );
        gl.drawArrays(gl.TRIANGLES, 0, 6);
      });

      const rayStartX = 0;
      const rayStartY = 0;
      let baseDirX, baseDirY;

      const mouseMoved =
        mousePosRef.current.x !== 0 || mousePosRef.current.y !== 0;
      if (mouseMoved) {
        baseDirX = mousePosRef.current.x - rayStartX;
        baseDirY = mousePosRef.current.y - rayStartY;
        const length = Math.sqrt(baseDirX * baseDirX + baseDirY * baseDirY);
        baseDirX /= length;
        baseDirY /= length;
      } else {
        baseDirX = initialDirRef.current.x;
        baseDirY = initialDirRef.current.y;
      }

      // Cast multiple rays for FOV
      const rays = [];
      const angleStep = fov / (rayCount - 1);
      const startAngle = Math.atan2(baseDirY, baseDirX) - fov / 2;

      for (let i = 0; i < rayCount; i++) {
        const angle = startAngle + i * angleStep;
        const dirX = Math.cos(angle);
        const dirY = Math.sin(angle);
        const hit = castRay(rayStartX, rayStartY, dirX, dirY);
        rays.push({ dirX, dirY, hit });
      }

      gl.uniform4f(colorUniformLocation, 1.0, 1.0, 0.0, 0.3);
      rays.forEach(({ dirX, dirY, hit }) => {
        const perpX = -dirY;
        const perpY = dirX;
        const halfWidth = rayWidth / 2;

        const rayPositions = [
          rayStartX - perpX * halfWidth,
          rayStartY - perpY * halfWidth,
          rayStartX + perpX * halfWidth,
          rayStartY + perpY * halfWidth,
          hit.x - perpX * halfWidth,
          hit.y - perpY * halfWidth,
          rayStartX + perpX * halfWidth,
          rayStartY + perpY * halfWidth,
          hit.x + perpX * halfWidth,
          hit.y + perpY * halfWidth,
          hit.x - perpX * halfWidth,
          hit.y - perpY * halfWidth,
        ];
        gl.bufferData(
          gl.ARRAY_BUFFER,
          new Float32Array(rayPositions),
          gl.STATIC_DRAW
        );
        gl.vertexAttribPointer(
          positionAttributeLocation,
          2,
          gl.FLOAT,
          false,
          0,
          0
        );
        gl.drawArrays(gl.TRIANGLES, 0, 6);
      });

      const circlePoints = 32;
      const radius = 0.015;
      rays.forEach(({ hit }) => {
        const positions = [];
        for (let i = 0; i < circlePoints; i++) {
          const angle = (i / circlePoints) * 2 * Math.PI;
          const x = hit.x + radius * Math.cos(angle);
          const y = hit.y + radius * Math.sin(angle);
          positions.push(x, y);
        }
        gl.uniform4f(colorUniformLocation, 1.0, 0.0, 0.0, 1.0);
        gl.bufferData(
          gl.ARRAY_BUFFER,
          new Float32Array(positions),
          gl.STATIC_DRAW
        );
        gl.vertexAttribPointer(
          positionAttributeLocation,
          2,
          gl.FLOAT,
          false,
          0,
          0
        );
        gl.drawArrays(gl.TRIANGLE_FAN, 0, circlePoints);
      });
    };

    const handleResize = () => {
      const parent = canvas.parentElement;
      if (!parent) return;
      canvas.width = parent.clientWidth;
      canvas.height = parent.clientWidth;
      gl.viewport(0, 0, canvas.width, canvas.height);
      draw();
    };

    const handleMouseMove = (event) => {
      const rect = canvas.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;

      mousePosRef.current = {
        x: (x / canvas.width) * 2 - 1,
        y: -(y / canvas.height) * 2 + 1,
      };

      draw();
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    canvas.addEventListener("mousemove", handleMouseMove);
    draw();

    return () => {
      window.removeEventListener("resize", handleResize);
      canvas.removeEventListener("mousemove", handleMouseMove);
      gl.deleteBuffer(positionBuffer);
      gl.deleteProgram(program);
      gl.deleteShader(vertexShader);
      gl.deleteShader(fragmentShader);
    };
  }, []);

  return <canvas ref={canvasRef} style={{ width: "100%", height: "100%" }} />;
};

export const A4 = () => {
  const canvasRef = useRef(null);
  const mousePosRef = useRef({ x: 0, y: 0 });
  const initialDirRef = useRef({ x: 0, y: 0 });

  const obstacles = [
    { x: -0.7, y: 0.3, width: 0.2, height: 0.4 },
    { x: 0.2, y: -0.5, width: 0.3, height: 0.2 },
    { x: -0.2, y: 0.0, width: 0.15, height: 0.6 },
  ];

  const rayWidth = 0.005;
  const reflectionRayWidth = 0.003;
  const fov = Math.PI / 3; // 60-degree FOV
  const rayCount = 20;

  useEffect(() => {
    const angle = Math.random() * 2 * Math.PI;
    initialDirRef.current = { x: Math.cos(angle), y: Math.sin(angle) };
  }, []);

  const castRay = (startX, startY, dirX, dirY, isReflection = false) => {
    let t = Infinity;
    let hitX = startX;
    let hitY = startY;
    let normalX = 0;
    let normalY = 0;
    let hitObstacle = null;

    obstacles.forEach((obstacle) => {
      const left = obstacle.x;
      const right = obstacle.x + obstacle.width;
      const top = obstacle.y;
      const bottom = obstacle.y - obstacle.height;

      const tMinX = dirX === 0 ? Infinity : (left - startX) / dirX;
      const tMaxX = dirX === 0 ? Infinity : (right - startX) / dirX;
      const tMinY = dirY === 0 ? Infinity : (top - startY) / dirY;
      const tMaxY = dirY === 0 ? Infinity : (bottom - startY) / dirY;

      const tX1 = Math.min(tMinX, tMaxX);
      const tX2 = Math.max(tMinX, tMaxX);
      const tY1 = Math.min(tMinY, tMaxY);
      const tY2 = Math.max(tMinY, tMaxY);

      const tNear = Math.max(tX1, tY1);
      const tFar = Math.min(tX2, tY2);

      if (tNear > 0 && tNear < tFar && tNear < t) {
        t = tNear;
        hitX = startX + t * dirX;
        hitY = startY + t * dirY;
        hitObstacle = obstacle;

        const epsilon = 0.001;
        if (Math.abs(hitX - left) < epsilon) normalX = -1;
        else if (Math.abs(hitX - right) < epsilon) normalX = 1;
        if (Math.abs(hitY - top) < epsilon) normalY = 1;
        else if (Math.abs(hitY - bottom) < epsilon) normalY = -1;

        if (normalX === 0 && normalY === 0) {
          if (Math.abs(dirX) > Math.abs(dirY)) {
            normalX = hitX < startX ? -1 : 1;
          } else {
            normalY = hitY < startY ? -1 : 1;
          }
        }
      }
    });

    if (t === Infinity) {
      hitX = startX + dirX * 2;
      hitY = startY + dirY * 2;
      return { x: hitX, y: hitY, reflects: false };
    }

    const normalLength = Math.sqrt(normalX * normalX + normalY * normalY);
    normalX /= normalLength;
    normalY /= normalLength;

    if (!isReflection) {
      const dot = dirX * normalX + dirY * normalY;
      let reflectDirX = dirX - 2 * dot * normalX;
      let reflectDirY = dirY - 2 * dot * normalY;
      const epsilon = 0.001;
      reflectDirX += epsilon * (Math.random() - 0.5);
      reflectDirY += epsilon * (Math.random() - 0.5);
      const reflectLength = Math.sqrt(
        reflectDirX * reflectDirX + reflectDirY * reflectDirY
      );
      reflectDirX /= reflectLength;
      reflectDirY /= reflectLength;

      const reflectHit = castRay(hitX, hitY, reflectDirX, reflectDirY, true);

      return {
        x: hitX,
        y: hitY,
        reflects: true,
        reflectDirX,
        reflectDirY,
        reflectHit,
      };
    }

    // For reflection rays, stop at the hit point without further reflection
    return {
      x: hitX,
      y: hitY,
      reflects: false,
    };
  };

  useEffect(() => {
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
      generalVertexShaderSource
    );
    const fragmentShader = createShader(
      gl,
      gl.FRAGMENT_SHADER,
      generalFragmentShaderSource
    );
    const program = createProgram(gl, vertexShader, fragmentShader);

    if (!program) return;

    const positionAttributeLocation = gl.getAttribLocation(
      program,
      "a_position"
    );
    const colorUniformLocation = gl.getUniformLocation(program, "u_color");
    const positionBuffer = gl.createBuffer();

    const draw = () => {
      gl.clearColor(0, 0, 0, 1);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.useProgram(program);
      gl.enableVertexAttribArray(positionAttributeLocation);
      gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);

      const obstaclePositions = [];
      obstacles.forEach((obstacle) => {
        obstaclePositions.push(
          obstacle.x,
          obstacle.y,
          obstacle.x + obstacle.width,
          obstacle.y,
          obstacle.x,
          obstacle.y - obstacle.height,
          obstacle.x + obstacle.width,
          obstacle.y,
          obstacle.x + obstacle.width,
          obstacle.y - obstacle.height,
          obstacle.x,
          obstacle.y - obstacle.height
        );
      });
      gl.uniform4f(colorUniformLocation, 0.5, 0.5, 0.5, 1.0);
      gl.bufferData(
        gl.ARRAY_BUFFER,
        new Float32Array(obstaclePositions),
        gl.STATIC_DRAW
      );
      gl.vertexAttribPointer(
        positionAttributeLocation,
        2,
        gl.FLOAT,
        false,
        0,
        0
      );
      gl.drawArrays(gl.TRIANGLES, 0, obstacles.length * 6);

      const rayStartX = 0;
      const rayStartY = 0;
      let baseDirX, baseDirY;
      const mouseMoved =
        mousePosRef.current.x !== 0 || mousePosRef.current.y !== 0;
      if (mouseMoved) {
        baseDirX = mousePosRef.current.x - rayStartX;
        baseDirY = mousePosRef.current.y - rayStartY;
        const length = Math.sqrt(baseDirX * baseDirX + baseDirY * baseDirY);
        baseDirX /= length;
        baseDirY /= length;
      } else {
        baseDirX = initialDirRef.current.x;
        baseDirY = initialDirRef.current.y;
      }

      const rays = [];
      const angleStep = fov / (rayCount - 1);
      const startAngle = Math.atan2(baseDirY, baseDirX) - fov / 2;
      for (let i = 0; i < rayCount; i++) {
        const angle = startAngle + i * angleStep;
        const dirX = Math.cos(angle);
        const dirY = Math.sin(angle);
        const hit = castRay(rayStartX, rayStartY, dirX, dirY);
        rays.push({ dirX, dirY, ...hit });
      }

      const initialRayPositions = [];
      rays.forEach(({ dirX, dirY, x, y }) => {
        const perpX = -dirY;
        const perpY = dirX;
        const halfWidth = rayWidth / 2;
        initialRayPositions.push(
          rayStartX - perpX * halfWidth,
          rayStartY - perpY * halfWidth,
          rayStartX + perpX * halfWidth,
          rayStartY + perpY * halfWidth,
          x - perpX * halfWidth,
          y - perpY * halfWidth,
          rayStartX + perpX * halfWidth,
          rayStartY + perpY * halfWidth,
          x + perpX * halfWidth,
          y + perpY * halfWidth,
          x - perpX * halfWidth,
          y - perpY * halfWidth
        );
      });
      gl.uniform4f(colorUniformLocation, 1.0, 1.0, 0.0, 0.3);
      gl.bufferData(
        gl.ARRAY_BUFFER,
        new Float32Array(initialRayPositions),
        gl.STATIC_DRAW
      );
      gl.vertexAttribPointer(
        positionAttributeLocation,
        2,
        gl.FLOAT,
        false,
        0,
        0
      );
      gl.drawArrays(gl.TRIANGLES, 0, rayCount * 6);

      const reflectRayPositions = [];
      rays.forEach(
        ({ x, y, reflects, reflectDirX, reflectDirY, reflectHit }) => {
          if (reflects) {
            const perpX = -reflectDirY;
            const perpY = reflectDirX;
            const halfWidth = reflectionRayWidth / 2;
            reflectRayPositions.push(
              x - perpX * halfWidth,
              y - perpY * halfWidth,
              x + perpX * halfWidth,
              y + perpY * halfWidth,
              reflectHit.x - perpX * halfWidth,
              reflectHit.y - perpY * halfWidth,
              x + perpX * halfWidth,
              y + perpY * halfWidth,
              reflectHit.x + perpX * halfWidth,
              reflectHit.y + perpY * halfWidth,
              reflectHit.x - perpX * halfWidth,
              reflectHit.y - perpY * halfWidth
            );
          }
        }
      );
      gl.uniform4f(colorUniformLocation, 0.0, 1.0, 0.0, 1.0);
      if (reflectRayPositions.length > 0) {
        gl.bufferData(
          gl.ARRAY_BUFFER,
          new Float32Array(reflectRayPositions),
          gl.STATIC_DRAW
        );
        gl.vertexAttribPointer(
          positionAttributeLocation,
          2,
          gl.FLOAT,
          false,
          0,
          0
        );
        const reflectTriangleCount = rays.filter((r) => r.reflects).length * 2;
        gl.drawArrays(gl.TRIANGLES, 0, reflectTriangleCount * 3);
      }

      const circlePoints = 32;
      const radius = 0.015;
      const hitPositions = [];
      rays.forEach(({ x, y }) => {
        hitPositions.push(x, y);
        for (let i = 0; i < circlePoints; i++) {
          const angle = (i / circlePoints) * 2 * Math.PI;
          const cx = x + radius * Math.cos(angle);
          const cy = y + radius * Math.sin(angle);
          hitPositions.push(cx, cy);
        }
      });
      gl.uniform4f(colorUniformLocation, 1.0, 0.0, 0.0, 1.0);
      gl.bufferData(
        gl.ARRAY_BUFFER,
        new Float32Array(hitPositions),
        gl.STATIC_DRAW
      );
      gl.vertexAttribPointer(
        positionAttributeLocation,
        2,
        gl.FLOAT,
        false,
        0,
        0
      );
      let offset = 0;
      for (let i = 0; i < rayCount; i++) {
        gl.drawArrays(gl.TRIANGLE_FAN, offset, circlePoints + 1);
        offset += circlePoints + 1;
      }
    };

    const handleResize = () => {
      const parent = canvas.parentElement;
      if (!parent) return;
      canvas.width = parent.clientWidth;
      canvas.height = parent.clientWidth;
      gl.viewport(0, 0, canvas.width, canvas.height);
      draw();
    };

    const handleMouseMove = (event) => {
      const rect = canvas.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      mousePosRef.current = {
        x: (x / canvas.width) * 2 - 1,
        y: -(y / canvas.height) * 2 + 1,
      };
      draw();
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    canvas.addEventListener("mousemove", handleMouseMove);
    draw();

    return () => {
      window.removeEventListener("resize", handleResize);
      canvas.removeEventListener("mousemove", handleMouseMove);
      gl.deleteBuffer(positionBuffer);
      gl.deleteProgram(program);
      gl.deleteShader(vertexShader);
      gl.deleteShader(fragmentShader);
    };
  }, []);

  return <canvas ref={canvasRef} style={{ width: "100%", height: "100%" }} />;
};

export const A5 = () => {
  const canvasRef = useRef(null);
  const mousePosRef = useRef({ x: 0, y: 0 });
  const initialDirRef = useRef({ x: 0, y: 0 });
  const lightPosRef = useRef({
    x: Math.random() * 2 - 1,
    y: Math.random() * 2 - 1,
  });
  const isDraggingRef = useRef(false);

  const obstacles = [
    { x: -0.7, y: 0.3, width: 0.2, height: 0.4 },
    { x: 0.2, y: -0.5, width: 0.3, height: 0.2 },
    { x: -0.2, y: 0.0, width: 0.15, height: 0.6 },
  ];

  const rayWidth = 0.005;
  const reflectionRayWidth = 0.003;
  const fov = Math.PI / 3;
  const rayCount = 20;
  const lightRadius = 0.03;
  const hitPointRadius = 0.015;

  useEffect(() => {
    const angle = Math.random() * 2 * Math.PI;
    initialDirRef.current = { x: Math.cos(angle), y: Math.sin(angle) };
  }, []);
  const castRay = (startX, startY, dirX, dirY, isReflection = false) => {
    let t = Infinity;
    let hitX = startX;
    let hitY = startY;
    let normalX = 0;
    let normalY = 0;
    let hitObstacleIdx = -1;

    obstacles.forEach((obstacle, idx) => {
      const left = obstacle.x;
      const right = obstacle.x + obstacle.width;
      const top = obstacle.y;
      const bottom = obstacle.y - obstacle.height;

      const tMinX = dirX === 0 ? Infinity : (left - startX) / dirX;
      const tMaxX = dirX === 0 ? Infinity : (right - startX) / dirX;
      const tMinY = dirY === 0 ? Infinity : (top - startY) / dirY;
      const tMaxY = dirY === 0 ? Infinity : (bottom - startY) / dirY;

      const tX1 = Math.min(tMinX, tMaxX);
      const tX2 = Math.max(tMinX, tMaxX);
      const tY1 = Math.min(tMinY, tMaxY);
      const tY2 = Math.max(tMinY, tMaxY);

      const tNear = Math.max(tX1, tY1);
      const tFar = Math.min(tX2, tY2);

      if (tNear > 0 && tNear < tFar && tNear < t) {
        t = tNear;
        hitX = startX + t * dirX;
        hitY = startY + t * dirY;
        hitObstacleIdx = idx;

        const epsilon = 0.001;
        if (Math.abs(hitX - left) < epsilon) normalX = -1;
        else if (Math.abs(hitX - right) < epsilon) normalX = 1;
        if (Math.abs(hitY - top) < epsilon) normalY = 1;
        else if (Math.abs(hitY - bottom) < epsilon) normalY = -1;

        if (normalX === 0 && normalY === 0) {
          if (Math.abs(dirX) > Math.abs(dirY)) {
            normalX = hitX < startX ? -1 : 1;
          } else {
            normalY = hitY < startY ? -1 : 1;
          }
        }
      }
    });

    if (t === Infinity) {
      hitX = startX + dirX * 2;
      hitY = startY + dirY * 2;
      return { x: hitX, y: hitY, reflects: false };
    }

    const normalLength = Math.sqrt(normalX * normalX + normalY * normalY);
    normalX /= normalLength;
    normalY /= normalLength;

    if (!isReflection) {
      const lightDirX = lightPosRef.current.x - hitX;
      const lightDirY = lightPosRef.current.y - hitY;
      const lightDist = Math.sqrt(
        lightDirX * lightDirX + lightDirY * lightDirY
      );
      const lightDirXNorm = lightDirX / lightDist;
      const lightDirYNorm = lightDirY / lightDist;

      // Apply a small offset to avoid self-intersection
      const bias = 0.001;
      const offsetX = hitX + normalX * bias;
      const offsetY = hitY + normalY * bias;

      let hasClearPath = true;
      obstacles.forEach((obstacle, idx) => {
        const left = obstacle.x;
        const right = obstacle.x + obstacle.width;
        const top = obstacle.y;
        const bottom = obstacle.y - obstacle.height;

        const tMinX =
          lightDirXNorm === 0 ? Infinity : (left - offsetX) / lightDirXNorm;
        const tMaxX =
          lightDirXNorm === 0 ? Infinity : (right - offsetX) / lightDirXNorm;
        const tMinY =
          lightDirYNorm === 0 ? Infinity : (top - offsetY) / lightDirYNorm;
        const tMaxY =
          lightDirYNorm === 0 ? Infinity : (bottom - offsetY) / lightDirYNorm;

        const tX1 = Math.min(tMinX, tMaxX);
        const tX2 = Math.max(tMinX, tMaxX);
        const tY1 = Math.min(tMinY, tMaxY);
        const tY2 = Math.max(tMinY, tMaxY);

        const tNear = Math.max(tX1, tY1);
        const tFar = Math.min(tX2, tY2);

        // Check if the ray intersects an obstacle before reaching the light
        if (tNear > 0 && tNear < tFar && tNear < lightDist) {
          hasClearPath = false;
        }
      });

      return {
        x: hitX,
        y: hitY,
        reflects: hasClearPath,
        lightDirX: lightDirXNorm,
        lightDirY: lightDirYNorm,
        lightHit: { x: lightPosRef.current.x, y: lightPosRef.current.y },
      };
    }

    return {
      x: hitX,
      y: hitY,
      reflects: false,
    };
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const gl = canvas.getContext("webgl");
    if (!gl) {
      alert("Your browser does not support WebGL");
      return;
    }

    const generalVertexShader = createShader(
      gl,
      gl.VERTEX_SHADER,
      generalVertexShaderSource
    );
    const generalFragmentShader = createShader(
      gl,
      gl.FRAGMENT_SHADER,
      generalFragmentShaderSource
    );
    const generalProgram = createProgram(
      gl,
      generalVertexShader,
      generalFragmentShader
    );

    const circleVertexShader = createShader(
      gl,
      gl.VERTEX_SHADER,
      circleVertexShaderSource
    );
    const circleFragmentShader = createShader(
      gl,
      gl.FRAGMENT_SHADER,
      circleFragmentShaderSource
    );
    const circleProgram = createProgram(
      gl,
      circleVertexShader,
      circleFragmentShader
    );

    if (!generalProgram || !circleProgram) return;

    const generalPositionLocation = gl.getAttribLocation(
      generalProgram,
      "a_position"
    );
    const generalColorLocation = gl.getUniformLocation(
      generalProgram,
      "u_color"
    );

    const circlePositionLocation = gl.getAttribLocation(
      circleProgram,
      "a_position"
    );
    const circleCenterLocation = gl.getAttribLocation(
      circleProgram,
      "a_center"
    );
    const circleRadiusLocation = gl.getAttribLocation(
      circleProgram,
      "a_radius"
    );
    const circleColorLocation = gl.getAttribLocation(circleProgram, "a_color");

    const positionBuffer = gl.createBuffer();
    const circleDataBuffer = gl.createBuffer();

    const quadVertices = new Float32Array([
      -0.5, -0.5, 0.5, -0.5, -0.5, 0.5, 0.5, 0.5,
    ]);

    const ext = gl.getExtension("ANGLE_instanced_arrays");
    const supportsInstancing = !!ext;

    const draw = () => {
      gl.clearColor(0, 0, 0, 1);
      gl.clear(gl.COLOR_BUFFER_BIT);

      gl.useProgram(generalProgram);
      gl.enableVertexAttribArray(generalPositionLocation);
      gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);

      const obstaclePositions = [];
      obstacles.forEach((obstacle) => {
        obstaclePositions.push(
          obstacle.x,
          obstacle.y,
          obstacle.x + obstacle.width,
          obstacle.y,
          obstacle.x,
          obstacle.y - obstacle.height,
          obstacle.x + obstacle.width,
          obstacle.y,
          obstacle.x + obstacle.width,
          obstacle.y - obstacle.height,
          obstacle.x,
          obstacle.y - obstacle.height
        );
      });
      gl.uniform4f(generalColorLocation, 0.5, 0.5, 0.5, 1.0);
      gl.bufferData(
        gl.ARRAY_BUFFER,
        new Float32Array(obstaclePositions),
        gl.STATIC_DRAW
      );
      gl.vertexAttribPointer(generalPositionLocation, 2, gl.FLOAT, false, 0, 0);
      gl.drawArrays(gl.TRIANGLES, 0, obstacles.length * 6);

      const rayStartX = 0;
      const rayStartY = 0;
      let baseDirX, baseDirY;
      const mouseMoved =
        mousePosRef.current.x !== 0 || mousePosRef.current.y !== 0;
      if (mouseMoved) {
        baseDirX = mousePosRef.current.x - rayStartX;
        baseDirY = mousePosRef.current.y - rayStartY;
        const length = Math.sqrt(baseDirX * baseDirX + baseDirY * baseDirY);
        baseDirX /= length;
        baseDirY /= length;
      } else {
        baseDirX = initialDirRef.current.x;
        baseDirY = initialDirRef.current.y;
      }

      const rays = [];
      const angleStep = fov / (rayCount - 1);
      const startAngle = Math.atan2(baseDirY, baseDirX) - fov / 2;
      for (let i = 0; i < rayCount; i++) {
        const angle = startAngle + i * angleStep;
        const dirX = Math.cos(angle);
        const dirY = Math.sin(angle);
        const hit = castRay(rayStartX, rayStartY, dirX, dirY);
        rays.push({ dirX, dirY, ...hit });
      }

      const initialRayPositions = [];
      rays.forEach(({ dirX, dirY, x, y }) => {
        const perpX = -dirY;
        const perpY = dirX;
        const halfWidth = rayWidth / 2;
        initialRayPositions.push(
          rayStartX - perpX * halfWidth,
          rayStartY - perpY * halfWidth,
          rayStartX + perpX * halfWidth,
          rayStartY + perpY * halfWidth,
          x - perpX * halfWidth,
          y - perpY * halfWidth,
          rayStartX + perpX * halfWidth,
          rayStartY + perpY * halfWidth,
          x + perpX * halfWidth,
          y + perpY * halfWidth,
          x - perpX * halfWidth,
          y - perpY * halfWidth
        );
      });
      gl.uniform4f(generalColorLocation, 1.0, 1.0, 0.0, 0.3);
      gl.bufferData(
        gl.ARRAY_BUFFER,
        new Float32Array(initialRayPositions),
        gl.STATIC_DRAW
      );
      gl.drawArrays(gl.TRIANGLES, 0, rayCount * 6);

      const reflectRayPositions = [];
      rays.forEach(({ x, y, reflects, lightDirX, lightDirY, lightHit }) => {
        if (reflects) {
          const perpX = -lightDirY;
          const perpY = lightDirX;
          const halfWidth = reflectionRayWidth / 2;
          reflectRayPositions.push(
            x - perpX * halfWidth,
            y - perpY * halfWidth,
            x + perpX * halfWidth,
            y + perpY * halfWidth,
            lightHit.x - perpX * halfWidth,
            lightHit.y - perpY * halfWidth,
            x + perpX * halfWidth,
            y + perpY * halfWidth,
            lightHit.x + perpX * halfWidth,
            lightHit.y + perpY * halfWidth,
            lightHit.x - perpX * halfWidth,
            lightHit.y - perpY * halfWidth
          );
        }
      });
      gl.uniform4f(generalColorLocation, 0.0, 1.0, 0.0, 1.0);
      if (reflectRayPositions.length > 0) {
        gl.bufferData(
          gl.ARRAY_BUFFER,
          new Float32Array(reflectRayPositions),
          gl.STATIC_DRAW
        );
        gl.drawArrays(
          gl.TRIANGLES,
          0,
          rays.filter((r) => r.reflects).length * 6
        );
      }

      gl.useProgram(circleProgram);
      gl.enableVertexAttribArray(circlePositionLocation);
      gl.enableVertexAttribArray(circleCenterLocation);
      gl.enableVertexAttribArray(circleRadiusLocation);
      gl.enableVertexAttribArray(circleColorLocation);

      gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
      gl.bufferData(gl.ARRAY_BUFFER, quadVertices, gl.STATIC_DRAW);
      gl.vertexAttribPointer(circlePositionLocation, 2, gl.FLOAT, false, 0, 0);

      const circleData = [];
      rays.forEach(({ x, y }) => {
        circleData.push(
          x,
          y, // center
          hitPointRadius, // radius
          1.0,
          0.0,
          0.0,
          1.0
        );
      });
      circleData.push(
        lightPosRef.current.x,
        lightPosRef.current.y, // center
        lightRadius, // radius
        1.0,
        1.0,
        1.0,
        1.0
      );

      const circleCount = rays.length + 1;
      const stride = 7 * 4;

      gl.bindBuffer(gl.ARRAY_BUFFER, circleDataBuffer);
      gl.bufferData(
        gl.ARRAY_BUFFER,
        new Float32Array(circleData),
        gl.DYNAMIC_DRAW
      );

      gl.vertexAttribPointer(
        circleCenterLocation,
        2,
        gl.FLOAT,
        false,
        stride,
        0
      );
      gl.vertexAttribPointer(
        circleRadiusLocation,
        1,
        gl.FLOAT,
        false,
        stride,
        8
      );
      gl.vertexAttribPointer(
        circleColorLocation,
        4,
        gl.FLOAT,
        false,
        stride,
        12
      );

      if (supportsInstancing) {
        ext.vertexAttribDivisorANGLE(circleCenterLocation, 1);
        ext.vertexAttribDivisorANGLE(circleRadiusLocation, 1);
        ext.vertexAttribDivisorANGLE(circleColorLocation, 1);
        ext.drawArraysInstancedANGLE(gl.TRIANGLE_STRIP, 0, 4, circleCount);
        ext.vertexAttribDivisorANGLE(circleCenterLocation, 0);
        ext.vertexAttribDivisorANGLE(circleRadiusLocation, 0);
        ext.vertexAttribDivisorANGLE(circleColorLocation, 0);
      } else {
        for (let i = 0; i < circleCount; i++) {
          gl.vertexAttrib2fv(
            circleCenterLocation,
            circleData.slice(i * 7, i * 7 + 2)
          );
          gl.vertexAttrib1f(circleRadiusLocation, circleData[i * 7 + 2]);
          gl.vertexAttrib4fv(
            circleColorLocation,
            circleData.slice(i * 7 + 3, i * 7 + 7)
          );
          gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
        }
      }
    };

    const handleMouseDown = (event) => {
      const rect = canvas.getBoundingClientRect();
      const x = ((event.clientX - rect.left) / canvas.width) * 2 - 1;
      const y = -(((event.clientY - rect.top) / canvas.height) * 2 - 1);
      const dx = x - lightPosRef.current.x;
      const dy = y - lightPosRef.current.y;
      if (Math.sqrt(dx * dx + dy * dy) <= lightRadius) {
        isDraggingRef.current = true;
      }
    };

    const handleMouseMove = (event) => {
      const rect = canvas.getBoundingClientRect();
      const x = ((event.clientX - rect.left) / canvas.width) * 2 - 1;
      const y = -(((event.clientY - rect.top) / canvas.height) * 2 - 1);
      mousePosRef.current = { x, y };
      if (isDraggingRef.current) {
        lightPosRef.current = { x, y };
      }
      draw();
    };

    const handleMouseUp = () => {
      isDraggingRef.current = false;
    };

    const handleTouchStart = (event) => {
      event.preventDefault();
      const touch = event.touches[0];
      const rect = canvas.getBoundingClientRect();
      const x = ((touch.clientX - rect.left) / canvas.width) * 2 - 1;
      const y = -(((touch.clientY - rect.top) / canvas.height) * 2 - 1);
      const dx = x - lightPosRef.current.x;
      const dy = y - lightPosRef.current.y;
      if (Math.sqrt(dx * dx + dy * dy) <= lightRadius) {
        isDraggingRef.current = true;
      }
    };

    const handleTouchMove = (event) => {
      event.preventDefault();
      const touch = event.touches[0];
      const rect = canvas.getBoundingClientRect();
      const x = ((touch.clientX - rect.left) / canvas.width) * 2 - 1;
      const y = -(((touch.clientY - rect.top) / canvas.height) * 2 - 1);
      mousePosRef.current = { x, y };
      if (isDraggingRef.current) {
        lightPosRef.current = { x, y };
      }
      draw();
    };

    const handleTouchEnd = () => {
      isDraggingRef.current = false;
    };

    const handleResize = () => {
      const parent = canvas.parentElement;
      if (!parent) return;
      canvas.width = parent.clientWidth;
      canvas.height = parent.clientWidth;
      gl.viewport(0, 0, canvas.width, canvas.height);
      draw();
    };

    handleResize();
    draw();

    window.addEventListener("resize", handleResize);
    canvas.addEventListener("mousedown", handleMouseDown);
    canvas.addEventListener("mousemove", handleMouseMove);
    canvas.addEventListener("mouseup", handleMouseUp);
    canvas.addEventListener("touchstart", handleTouchStart);
    canvas.addEventListener("touchmove", handleTouchMove);
    canvas.addEventListener("touchend", handleTouchEnd);

    return () => {
      window.removeEventListener("resize", handleResize);
      canvas.removeEventListener("mousedown", handleMouseDown);
      canvas.removeEventListener("mousemove", handleMouseMove);
      canvas.removeEventListener("mouseup", handleMouseUp);
      canvas.removeEventListener("touchstart", handleTouchStart);
      canvas.removeEventListener("touchmove", handleTouchMove);
      canvas.removeEventListener("touchend", handleTouchEnd);
      gl.deleteBuffer(positionBuffer);
      gl.deleteBuffer(circleDataBuffer);
      gl.deleteProgram(generalProgram);
      gl.deleteProgram(circleProgram);
      gl.deleteShader(generalVertexShader);
      gl.deleteShader(generalFragmentShader);
      gl.deleteShader(circleVertexShader);
      gl.deleteShader(circleFragmentShader);
    };
  }, []);

  return <canvas ref={canvasRef} style={{ width: "100%", height: "100%" }} />;
};

export const B1 = () => {
  const canvasRef = useRef(null);
  const mousePosRef = useRef({ x: 0, y: 0 });
  const isMouseOverRef = useRef(false);

  const obstacles = [
    { x: -0.7, y: 0.3, width: 0.2, height: 0.4 },
    { x: 0.2, y: -0.5, width: 0.3, height: 0.2 },
    { x: -0.2, y: 0.0, width: 0.15, height: 0.6 },
  ];

  const rayWidth = 0.01;
  const rayCount = 60;

  // Check if point is inside any obstacle
  const isPointInObstacle = (x, y) => {
    return obstacles.some((obstacle) => {
      const left = obstacle.x;
      const right = obstacle.x + obstacle.width;
      const top = obstacle.y;
      const bottom = obstacle.y - obstacle.height;
      return x >= left && x <= right && y <= top && y >= bottom;
    });
  };

  // Ray casting function with border detection
  const castRay = (startX, startY, dirX, dirY) => {
    let t = Infinity;
    let hitX = startX;
    let hitY = startY;

    obstacles.forEach((obstacle) => {
      const left = obstacle.x;
      const right = obstacle.x + obstacle.width;
      const top = obstacle.y;
      const bottom = obstacle.y - obstacle.height;

      const tMinX = (left - startX) / dirX;
      const tMaxX = (right - startX) / dirX;
      const tMinY = (top - startY) / dirY;
      const tMaxY = (bottom - startY) / dirY;

      const tX1 = Math.min(tMinX, tMaxX);
      const tX2 = Math.max(tMinX, tMaxX);
      const tY1 = Math.min(tMinY, tMaxY);
      const tY2 = Math.max(tMinY, tMaxY);

      const tNear = Math.max(tX1, tY1);
      const tFar = Math.min(tX2, tY2);

      if (tNear > 0 && tNear < tFar && tNear < t) {
        t = tNear;
        hitX = startX + t * dirX;
        hitY = startY + t * dirY;
      }
    });

    // Check canvas borders (-1 to 1)
    const borders = [
      { t: (-1 - startX) / dirX, edge: "left" }, // Left border
      { t: (1 - startX) / dirX, edge: "right" }, // Right border
      { t: (1 - startY) / dirY, edge: "top" }, // Top border
      { t: (-1 - startY) / dirY, edge: "bottom" }, // Bottom border
    ];

    borders.forEach((border) => {
      if (border.t > 0 && border.t < t) {
        const x = startX + border.t * dirX;
        const y = startY + border.t * dirY;
        // Check if intersection point is within canvas bounds
        if (x >= -1 && x <= 1 && y >= -1 && y <= 1) {
          t = border.t;
          hitX = x;
          hitY = y;
        }
      }
    });

    if (t === Infinity) {
      hitX = startX + dirX * 2;
      hitY = startY + dirY * 2;
    }

    return { x: hitX, y: hitY };
  };

  useEffect(() => {
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
      generalVertexShaderSource
    );
    const fragmentShader = createShader(
      gl,
      gl.FRAGMENT_SHADER,
      generalFragmentShaderSource
    );
    const program = createProgram(gl, vertexShader, fragmentShader);

    if (!program) return;

    const positionAttributeLocation = gl.getAttribLocation(
      program,
      "a_position"
    );
    const colorUniformLocation = gl.getUniformLocation(program, "u_color");
    const positionBuffer = gl.createBuffer();

    const draw = () => {
      gl.clearColor(0, 0, 0, 1);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.useProgram(program);
      gl.enableVertexAttribArray(positionAttributeLocation);
      gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);

      gl.uniform4f(colorUniformLocation, 0.5, 0.5, 0.5, 1.0);
      obstacles.forEach((obstacle) => {
        const positions = [
          obstacle.x,
          obstacle.y,
          obstacle.x + obstacle.width,
          obstacle.y,
          obstacle.x,
          obstacle.y - obstacle.height,
          obstacle.x + obstacle.width,
          obstacle.y,
          obstacle.x + obstacle.width,
          obstacle.y - obstacle.height,
          obstacle.x,
          obstacle.y - obstacle.height,
        ];
        gl.bufferData(
          gl.ARRAY_BUFFER,
          new Float32Array(positions),
          gl.STATIC_DRAW
        );
        gl.vertexAttribPointer(
          positionAttributeLocation,
          2,
          gl.FLOAT,
          false,
          0,
          0
        );
        gl.drawArrays(gl.TRIANGLES, 0, 6);
      });

      // Set ray origin to mouse position when over canvas, center otherwise
      const rayStartX = isMouseOverRef.current ? mousePosRef.current.x : 0;
      const rayStartY = isMouseOverRef.current ? mousePosRef.current.y : 0;
      const halfWidth = rayWidth / 2;

      // Only draw rays if not over an obstacle
      if (
        !(isMouseOverRef.current && isPointInObstacle(rayStartX, rayStartY))
      ) {
        // Draw 60 rays in a full circle
        for (let i = 0; i < rayCount; i++) {
          const angle = (i / rayCount) * 2 * Math.PI;
          const rayDirX = Math.cos(angle);
          const rayDirY = Math.sin(angle);

          const hit = castRay(rayStartX, rayStartY, rayDirX, rayDirY);

          // Draw ray as a thick rectangle (yellow)
          gl.uniform4f(colorUniformLocation, 1.0, 1.0, 0.0, 1.0);
          const perpX = -rayDirY;
          const perpY = rayDirX;

          const rayPositions = [
            rayStartX - perpX * halfWidth,
            rayStartY - perpY * halfWidth,
            rayStartX + perpX * halfWidth,
            rayStartY + perpY * halfWidth,
            hit.x - perpX * halfWidth,
            hit.y - perpY * halfWidth,
            rayStartX + perpX * halfWidth,
            rayStartY + perpY * halfWidth,
            hit.x + perpX * halfWidth,
            hit.y + perpY * halfWidth,
            hit.x - perpX * halfWidth,
            hit.y - perpY * halfWidth,
          ];
          gl.bufferData(
            gl.ARRAY_BUFFER,
            new Float32Array(rayPositions),
            gl.STATIC_DRAW
          );
          gl.vertexAttribPointer(
            positionAttributeLocation,
            2,
            gl.FLOAT,
            false,
            0,
            0
          );
          gl.drawArrays(gl.TRIANGLES, 0, 6);

          // Draw circle at hit point (red)
          const circlePoints = 64;
          const radius = 0.02;
          const positions = [];
          for (let j = 0; j < circlePoints; j++) {
            const circleAngle = (j / circlePoints) * 2 * Math.PI;
            const x = hit.x + radius * Math.cos(circleAngle);
            const y = hit.y + radius * Math.sin(circleAngle);
            positions.push(x, y);
          }
          gl.uniform4f(colorUniformLocation, 1.0, 0.0, 0.0, 1.0);
          gl.bufferData(
            gl.ARRAY_BUFFER,
            new Float32Array(positions),
            gl.STATIC_DRAW
          );
          gl.vertexAttribPointer(
            positionAttributeLocation,
            2,
            gl.FLOAT,
            false,
            0,
            0
          );
          gl.drawArrays(gl.TRIANGLE_FAN, 0, circlePoints);
        }
      }
    };

    const handleResize = () => {
      const parent = canvas.parentElement;
      if (!parent) return;
      canvas.width = parent.clientWidth;
      canvas.height = parent.clientWidth;
      gl.viewport(0, 0, canvas.width, canvas.height);
      draw();
    };

    const handleMouseMove = (event) => {
      const rect = canvas.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;

      mousePosRef.current = {
        x: (x / canvas.width) * 2 - 1,
        y: -(y / canvas.height) * 2 + 1,
      };

      draw();
    };

    const handleMouseEnter = () => {
      isMouseOverRef.current = true;
      draw();
    };

    const handleMouseLeave = () => {
      isMouseOverRef.current = false;
      mousePosRef.current = { x: 0, y: 0 };
      draw();
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    canvas.addEventListener("mousemove", handleMouseMove);
    canvas.addEventListener("mouseenter", handleMouseEnter);
    canvas.addEventListener("mouseleave", handleMouseLeave);
    draw();

    return () => {
      window.removeEventListener("resize", handleResize);
      canvas.removeEventListener("mousemove", handleMouseMove);
      canvas.removeEventListener("mouseenter", handleMouseEnter);
      canvas.removeEventListener("mouseleave", handleMouseLeave);
      gl.deleteBuffer(positionBuffer);
      gl.deleteProgram(program);
      gl.deleteShader(vertexShader);
      gl.deleteShader(fragmentShader);
    };
  }, []);

  return <canvas ref={canvasRef} style={{ width: "100%", height: "100%" }} />;
};

export const B2 = () => {
  const canvasRef = useRef(null);
  const mousePosRef = useRef({ x: 0, y: 0 });
  const isMouseOverRef = useRef(false);

  const obstacles = [
    { x: -0.7, y: 0.3, width: 0.2, height: 0.4 },
    { x: 0.2, y: -0.5, width: 0.3, height: 0.2 },
    { x: -0.2, y: 0.0, width: 0.15, height: 0.6 },
  ];

  const rayWidth = 0.01;
  const angleOffset = 0.00001; // Small angle offset for additional rays

  // Check if point is inside any obstacle
  const isPointInObstacle = (x, y) => {
    return obstacles.some((obstacle) => {
      const left = obstacle.x;
      const right = obstacle.x + obstacle.width;
      const top = obstacle.y;
      const bottom = obstacle.y - obstacle.height;
      return x >= left && x <= right && y <= top && y >= bottom;
    });
  };

  const castRay = (startX, startY, dirX, dirY) => {
    let t = Infinity;
    let hitX = startX;
    let hitY = startY;

    obstacles.forEach((obstacle) => {
      const left = obstacle.x;
      const right = obstacle.x + obstacle.width;
      const top = obstacle.y;
      const bottom = obstacle.y - obstacle.height;

      const tMinX = (left - startX) / dirX;
      const tMaxX = (right - startX) / dirX;
      const tMinY = (top - startY) / dirY;
      const tMaxY = (bottom - startY) / dirY;

      const tX1 = Math.min(tMinX, tMaxX);
      const tX2 = Math.max(tMinX, tMaxX);
      const tY1 = Math.min(tMinY, tMaxY);
      const tY2 = Math.max(tMinY, tMaxY);

      const tNear = Math.max(tX1, tY1);
      const tFar = Math.min(tX2, tY2);

      if (tNear > 0 && tNear < tFar && tNear < t) {
        t = tNear;
        hitX = startX + t * dirX;
        hitY = startY + t * dirY;
      }
    });

    const borders = [
      { t: (-1 - startX) / dirX, edge: "left" },
      { t: (1 - startX) / dirX, edge: "right" },
      { t: (1 - startY) / dirY, edge: "top" },
      { t: (-1 - startY) / dirY, edge: "bottom" },
    ];

    borders.forEach((border) => {
      if (border.t > 0 && border.t < t) {
        const x = startX + border.t * dirX;
        const y = startY + border.t * dirY;
        if (x >= -1 && x <= 1 && y >= -1 && y <= 1) {
          t = border.t;
          hitX = x;
          hitY = y;
        }
      }
    });

    if (t === Infinity) {
      hitX = startX + dirX * 2;
      hitY = startY + dirY * 2;
    }

    return { x: hitX, y: hitY };
  };

  useEffect(() => {
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
      generalVertexShaderSource
    );
    const fragmentShader = createShader(
      gl,
      gl.FRAGMENT_SHADER,
      generalFragmentShaderSource
    );
    const program = createProgram(gl, vertexShader, fragmentShader);

    if (!program) return;

    const positionAttributeLocation = gl.getAttribLocation(
      program,
      "a_position"
    );
    const colorUniformLocation = gl.getUniformLocation(program, "u_color");
    const positionBuffer = gl.createBuffer();

    const draw = () => {
      gl.clearColor(0, 0, 0, 1);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.useProgram(program);
      gl.enableVertexAttribArray(positionAttributeLocation);
      gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);

      gl.uniform4f(colorUniformLocation, 0.5, 0.5, 0.5, 1.0);
      obstacles.forEach((obstacle) => {
        const positions = [
          obstacle.x,
          obstacle.y,
          obstacle.x + obstacle.width,
          obstacle.y,
          obstacle.x,
          obstacle.y - obstacle.height,
          obstacle.x + obstacle.width,
          obstacle.y,
          obstacle.x + obstacle.width,
          obstacle.y - obstacle.height,
          obstacle.x,
          obstacle.y - obstacle.height,
        ];
        gl.bufferData(
          gl.ARRAY_BUFFER,
          new Float32Array(positions),
          gl.STATIC_DRAW
        );
        gl.vertexAttribPointer(
          positionAttributeLocation,
          2,
          gl.FLOAT,
          false,
          0,
          0
        );
        gl.drawArrays(gl.TRIANGLES, 0, 6);
      });

      const rayStartX = isMouseOverRef.current ? mousePosRef.current.x : 0;
      const rayStartY = isMouseOverRef.current ? mousePosRef.current.y : 0;
      const halfWidth = rayWidth / 2;

      if (
        !(isMouseOverRef.current && isPointInObstacle(rayStartX, rayStartY))
      ) {
        // Collect unique endpoints from obstacles and canvas borders
        const endpoints = new Set();
        obstacles.forEach((obstacle) => {
          endpoints.add(JSON.stringify({ x: obstacle.x, y: obstacle.y }));
          endpoints.add(
            JSON.stringify({ x: obstacle.x + obstacle.width, y: obstacle.y })
          );
          endpoints.add(
            JSON.stringify({ x: obstacle.x, y: obstacle.y - obstacle.height })
          );
          endpoints.add(
            JSON.stringify({
              x: obstacle.x + obstacle.width,
              y: obstacle.y - obstacle.height,
            })
          );
        });
        const canvasCorners = [
          { x: -1, y: 1 },
          { x: 1, y: 1 },
          { x: -1, y: -1 },
          { x: 1, y: -1 },
        ];
        canvasCorners.forEach((corner) =>
          endpoints.add(JSON.stringify(corner))
        );

        // Cast rays to endpoints with offsets
        const hitPoints = [];
        Array.from(endpoints)
          .map(JSON.parse)
          .forEach((endpoint) => {
            const dx = endpoint.x - rayStartX;
            const dy = endpoint.y - rayStartY;
            const angle = Math.atan2(dy, dx);
            const angles = [angle, angle + angleOffset, angle - angleOffset];

            angles.forEach((a) => {
              const rayDirX = Math.cos(a);
              const rayDirY = Math.sin(a);
              const hit = castRay(rayStartX, rayStartY, rayDirX, rayDirY);
              hitPoints.push({ x: hit.x, y: hit.y });
            });
          });

        gl.uniform4f(colorUniformLocation, 1.0, 1.0, 0.0, 1.0);
        hitPoints.forEach((hit) => {
          const dx = hit.x - rayStartX;
          const dy = hit.y - rayStartY;
          const angle = Math.atan2(dy, dx);
          const rayDirX = Math.cos(angle);
          const rayDirY = Math.sin(angle);
          const perpX = -rayDirY;
          const perpY = rayDirX;

          const rayPositions = [
            rayStartX - perpX * halfWidth,
            rayStartY - perpY * halfWidth,
            rayStartX + perpX * halfWidth,
            rayStartY + perpY * halfWidth,
            hit.x - perpX * halfWidth,
            hit.y - perpY * halfWidth,
            rayStartX + perpX * halfWidth,
            rayStartY + perpY * halfWidth,
            hit.x + perpX * halfWidth,
            hit.y + perpY * halfWidth,
            hit.x - perpX * halfWidth,
            hit.y - perpY * halfWidth,
          ];
          gl.bufferData(
            gl.ARRAY_BUFFER,
            new Float32Array(rayPositions),
            gl.STATIC_DRAW
          );
          gl.vertexAttribPointer(
            positionAttributeLocation,
            2,
            gl.FLOAT,
            false,
            0,
            0
          );
          gl.drawArrays(gl.TRIANGLES, 0, 6);
        });

        // Draw red circles at hit points
        hitPoints.forEach((hit) => {
          const circlePoints = 64;
          const radius = 0.02;
          const positions = [];
          for (let j = 0; j < circlePoints; j++) {
            const circleAngle = (j / circlePoints) * 2 * Math.PI;
            const x = hit.x + radius * Math.cos(circleAngle);
            const y = hit.y + radius * Math.sin(circleAngle);
            positions.push(x, y);
          }
          gl.uniform4f(colorUniformLocation, 1.0, 0.0, 0.0, 1.0);
          gl.bufferData(
            gl.ARRAY_BUFFER,
            new Float32Array(positions),
            gl.STATIC_DRAW
          );
          gl.vertexAttribPointer(
            positionAttributeLocation,
            2,
            gl.FLOAT,
            false,
            0,
            0
          );
          gl.drawArrays(gl.TRIANGLE_FAN, 0, circlePoints);
        });
      }
    };

    const handleResize = () => {
      const parent = canvas.parentElement;
      if (!parent) return;
      canvas.width = parent.clientWidth;
      canvas.height = parent.clientWidth;
      gl.viewport(0, 0, canvas.width, canvas.height);
      draw();
    };

    const handleMouseMove = (event) => {
      const rect = canvas.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;

      mousePosRef.current = {
        x: (x / canvas.width) * 2 - 1,
        y: -(y / canvas.height) * 2 + 1,
      };

      draw();
    };

    const handleMouseEnter = () => {
      isMouseOverRef.current = true;
      draw();
    };

    const handleMouseLeave = () => {
      isMouseOverRef.current = false;
      mousePosRef.current = { x: 0, y: 0 };
      draw();
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    canvas.addEventListener("mousemove", handleMouseMove);
    canvas.addEventListener("mouseenter", handleMouseEnter);
    canvas.addEventListener("mouseleave", handleMouseLeave);
    draw();

    return () => {
      window.removeEventListener("resize", handleResize);
      canvas.removeEventListener("mousemove", handleMouseMove);
      canvas.removeEventListener("mouseenter", handleMouseEnter);
      canvas.removeEventListener("mouseleave", handleMouseLeave);
      gl.deleteBuffer(positionBuffer);
      gl.deleteProgram(program);
      gl.deleteShader(vertexShader);
      gl.deleteShader(fragmentShader);
    };
  }, []);

  return <canvas ref={canvasRef} style={{ width: "100%", height: "100%" }} />;
};

export const B3 = () => {
  const canvasRef = useRef(null);
  const mousePosRef = useRef({ x: 0, y: 0 });
  const isMouseOverRef = useRef(false);

  const obstacles = [
    { x: -0.7, y: 0.3, width: 0.2, height: 0.4 },
    { x: 0.2, y: -0.5, width: 0.3, height: 0.2 },
    { x: -0.2, y: 0.0, width: 0.15, height: 0.6 },
  ];

  const rayWidth = 0.01;
  const angleOffset = 0.00001; // Small angle offset for additional rays

  // Check if point is inside any obstacle
  const isPointInObstacle = (x, y) => {
    return obstacles.some((obstacle) => {
      const left = obstacle.x;
      const right = obstacle.x + obstacle.width;
      const top = obstacle.y;
      const bottom = obstacle.y - obstacle.height;
      return x >= left && x <= right && y <= top && y >= bottom;
    });
  };

  // Ray casting function
  const castRay = (startX, startY, dirX, dirY) => {
    let t = Infinity;
    let hitX = startX;
    let hitY = startY;

    obstacles.forEach((obstacle) => {
      const left = obstacle.x;
      const right = obstacle.x + obstacle.width;
      const top = obstacle.y;
      const bottom = obstacle.y - obstacle.height;

      const tMinX = (left - startX) / dirX;
      const tMaxX = (right - startX) / dirX;
      const tMinY = (top - startY) / dirY;
      const tMaxY = (bottom - startY) / dirY;

      const tX1 = Math.min(tMinX, tMaxX);
      const tX2 = Math.max(tMinX, tMaxX);
      const tY1 = Math.min(tMinY, tMaxY);
      const tY2 = Math.max(tMinY, tMaxY);

      const tNear = Math.max(tX1, tY1);
      const tFar = Math.min(tX2, tY2);

      if (tNear > 0 && tNear < tFar && tNear < t) {
        t = tNear;
        hitX = startX + t * dirX;
        hitY = startY + t * dirY;
      }
    });

    const borders = [
      { t: (-1 - startX) / dirX, edge: "left" },
      { t: (1 - startX) / dirX, edge: "right" },
      { t: (1 - startY) / dirY, edge: "top" },
      { t: (-1 - startY) / dirY, edge: "bottom" },
    ];

    borders.forEach((border) => {
      if (border.t > 0 && border.t < t) {
        const x = startX + border.t * dirX;
        const y = startY + border.t * dirY;
        if (x >= -1 && x <= 1 && y >= -1 && y <= 1) {
          t = border.t;
          hitX = x;
          hitY = y;
        }
      }
    });

    if (t === Infinity) {
      hitX = startX + dirX * 2;
      hitY = startY + dirY * 2;
    }

    return { x: hitX, y: hitY };
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const gl = canvas.getContext("webgl");
    if (!gl) {
      alert("Your browser does not support WebGL");
      return;
    }

    const vertexShaderSource = `
      attribute vec4 a_position;
      void main() {
        gl_Position = a_position;
      }
    `;

    const fragmentShaderSource = `
      precision mediump float;
      uniform vec4 u_color;
      void main() {
        gl_FragColor = u_color;
      }
    `;

    const vertexShader = createShader(
      gl,
      gl.VERTEX_SHADER,
      generalVertexShaderSource
    );
    const fragmentShader = createShader(
      gl,
      gl.FRAGMENT_SHADER,
      generalFragmentShaderSource
    );
    const program = createProgram(gl, vertexShader, fragmentShader);

    if (!program) return;

    const positionAttributeLocation = gl.getAttribLocation(
      program,
      "a_position"
    );
    const colorUniformLocation = gl.getUniformLocation(program, "u_color");
    const positionBuffer = gl.createBuffer();
    const draw = () => {
      gl.clearColor(0, 0, 0, 1);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.useProgram(program);
      gl.enableVertexAttribArray(positionAttributeLocation);
      gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);

      gl.uniform4f(colorUniformLocation, 0.5, 0.5, 0.5, 1.0);
      obstacles.forEach((obstacle) => {
        const positions = [
          obstacle.x,
          obstacle.y,
          obstacle.x + obstacle.width,
          obstacle.y,
          obstacle.x,
          obstacle.y - obstacle.height,
          obstacle.x + obstacle.width,
          obstacle.y,
          obstacle.x + obstacle.width,
          obstacle.y - obstacle.height,
          obstacle.x,
          obstacle.y - obstacle.height,
        ];
        gl.bufferData(
          gl.ARRAY_BUFFER,
          new Float32Array(positions),
          gl.STATIC_DRAW
        );
        gl.vertexAttribPointer(
          positionAttributeLocation,
          2,
          gl.FLOAT,
          false,
          0,
          0
        );
        gl.drawArrays(gl.TRIANGLES, 0, 6);
      });

      const rayStartX = isMouseOverRef.current ? mousePosRef.current.x : 0;
      const rayStartY = isMouseOverRef.current ? mousePosRef.current.y : 0;
      const halfWidth = rayWidth / 2;

      if (
        !(isMouseOverRef.current && isPointInObstacle(rayStartX, rayStartY))
      ) {
        // Collect unique endpoints from obstacles and canvas borders
        const endpoints = new Set();
        obstacles.forEach((obstacle) => {
          endpoints.add(JSON.stringify({ x: obstacle.x, y: obstacle.y }));
          endpoints.add(
            JSON.stringify({ x: obstacle.x + obstacle.width, y: obstacle.y })
          );
          endpoints.add(
            JSON.stringify({ x: obstacle.x, y: obstacle.y - obstacle.height })
          );
          endpoints.add(
            JSON.stringify({
              x: obstacle.x + obstacle.width,
              y: obstacle.y - obstacle.height,
            })
          );
        });
        const canvasCorners = [
          { x: -1, y: 1 },
          { x: 1, y: 1 },
          { x: -1, y: -1 },
          { x: 1, y: -1 },
        ];
        canvasCorners.forEach((corner) =>
          endpoints.add(JSON.stringify(corner))
        );

        // Cast rays to endpoints with offsets and store hit points with angles
        const hitPointsWithAngles = [];
        Array.from(endpoints)
          .map(JSON.parse)
          .forEach((endpoint) => {
            const dx = endpoint.x - rayStartX;
            const dy = endpoint.y - rayStartY;
            const angle = Math.atan2(dy, dx);
            const angles = [angle, angle + angleOffset, angle - angleOffset];

            angles.forEach((a) => {
              const rayDirX = Math.cos(a);
              const rayDirY = Math.sin(a);
              const hit = castRay(rayStartX, rayStartY, rayDirX, rayDirY);
              hitPointsWithAngles.push({ x: hit.x, y: hit.y, angle: a });
            });
          });

        // Sort hit points by angle (clockwise sorting)
        hitPointsWithAngles.sort((a, b) => a.angle - b.angle);

        // Draw filled triangles (green) connecting the sorted points
        gl.uniform4f(colorUniformLocation, 0.0, 1.0, 0.0, 0.5);
        const trianglePositions = [];
        for (let i = 0; i < hitPointsWithAngles.length; i++) {
          const nextIndex = (i + 1) % hitPointsWithAngles.length; // Wrap around to close the polygon
          trianglePositions.push(
            rayStartX,
            rayStartY, // Center point (ray start)
            hitPointsWithAngles[i].x,
            hitPointsWithAngles[i].y, // Current point
            hitPointsWithAngles[nextIndex].x,
            hitPointsWithAngles[nextIndex].y // Next point
          );
        }
        gl.bufferData(
          gl.ARRAY_BUFFER,
          new Float32Array(trianglePositions),
          gl.STATIC_DRAW
        );
        gl.vertexAttribPointer(
          positionAttributeLocation,
          2,
          gl.FLOAT,
          false,
          0,
          0
        );
        gl.drawArrays(gl.TRIANGLES, 0, hitPointsWithAngles.length * 3);

        gl.uniform4f(colorUniformLocation, 1.0, 1.0, 0.0, 1.0);
        hitPointsWithAngles.forEach((hit) => {
          const dx = hit.x - rayStartX;
          const dy = hit.y - rayStartY;
          const angle = Math.atan2(dy, dx);
          const rayDirX = Math.cos(angle);
          const rayDirY = Math.sin(angle);
          const perpX = -rayDirY;
          const perpY = rayDirX;

          const rayPositions = [
            rayStartX - perpX * halfWidth,
            rayStartY - perpY * halfWidth,
            rayStartX + perpX * halfWidth,
            rayStartY + perpY * halfWidth,
            hit.x - perpX * halfWidth,
            hit.y - perpY * halfWidth,
            rayStartX + perpX * halfWidth,
            rayStartY + perpY * halfWidth,
            hit.x + perpX * halfWidth,
            hit.y + perpY * halfWidth,
            hit.x - perpX * halfWidth,
            hit.y - perpY * halfWidth,
          ];
          gl.bufferData(
            gl.ARRAY_BUFFER,
            new Float32Array(rayPositions),
            gl.STATIC_DRAW
          );
          gl.vertexAttribPointer(
            positionAttributeLocation,
            2,
            gl.FLOAT,
            false,
            0,
            0
          );
          gl.drawArrays(gl.TRIANGLES, 0, 6);
        });

        hitPointsWithAngles.forEach((hit) => {
          const circlePoints = 64;
          const radius = 0.02;
          const positions = [];
          for (let j = 0; j < circlePoints; j++) {
            const circleAngle = (j / circlePoints) * 2 * Math.PI;
            const x = hit.x + radius * Math.cos(circleAngle);
            const y = hit.y + radius * Math.sin(circleAngle);
            positions.push(x, y);
          }
          gl.uniform4f(colorUniformLocation, 1.0, 0.0, 0.0, 1.0);
          gl.bufferData(
            gl.ARRAY_BUFFER,
            new Float32Array(positions),
            gl.STATIC_DRAW
          );
          gl.vertexAttribPointer(
            positionAttributeLocation,
            2,
            gl.FLOAT,
            false,
            0,
            0
          );
          gl.drawArrays(gl.TRIANGLE_FAN, 0, circlePoints);
        });
      }
    };

    const handleResize = () => {
      const parent = canvas.parentElement;
      if (!parent) return;
      canvas.width = parent.clientWidth;
      canvas.height = parent.clientWidth;
      gl.viewport(0, 0, canvas.width, canvas.height);
      draw();
    };

    const handleMouseMove = (event) => {
      const rect = canvas.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;

      mousePosRef.current = {
        x: (x / canvas.width) * 2 - 1,
        y: -(y / canvas.height) * 2 + 1,
      };

      draw();
    };

    const handleMouseEnter = () => {
      isMouseOverRef.current = true;
      draw();
    };

    const handleMouseLeave = () => {
      isMouseOverRef.current = false;
      mousePosRef.current = { x: 0, y: 0 };
      draw();
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    canvas.addEventListener("mousemove", handleMouseMove);
    canvas.addEventListener("mouseenter", handleMouseEnter);
    canvas.addEventListener("mouseleave", handleMouseLeave);
    draw();

    return () => {
      window.removeEventListener("resize", handleResize);
      canvas.removeEventListener("mousemove", handleMouseMove);
      canvas.removeEventListener("mouseenter", handleMouseEnter);
      canvas.removeEventListener("mouseleave", handleMouseLeave);
      gl.deleteBuffer(positionBuffer);
      gl.deleteProgram(program);
      gl.deleteShader(vertexShader);
      gl.deleteShader(fragmentShader);
    };
  }, []);

  return <canvas ref={canvasRef} style={{ width: "100%", height: "100%" }} />;
};

const rayTracingVertexShaderSource = `
attribute vec4 a_position;
void main() {
  gl_Position = a_position;
}
`;

const rayTracingFragmentShaderSource = `
precision highp float;

uniform vec3 u_cameraPos;
uniform vec3 u_sphereCenters[6];
uniform float u_sphereRadii[6];
uniform vec3 u_sphereColors[6];
uniform float u_sphereReflectivities[6];
uniform vec3 u_groundCenter;
uniform float u_groundRadius;
uniform vec3 u_groundColor;
uniform vec3 u_lightPos;
uniform vec2 u_resolution;

vec3 lightColor = vec3(1.0, 1.0, 1.0);

struct HitInfo {
  float t;
  int sphereIndex;
  vec3 point;
  vec3 normal;
};

float intersectSphere(vec3 rayOrigin, vec3 rayDir, vec3 center, float radius) {
  vec3 oc = rayOrigin - center;
  float a = dot(rayDir, rayDir);
  float b = 2.0 * dot(oc, rayDir);
  float c = dot(oc, oc) - radius * radius;
  float discriminant = b * b - 4.0 * a * c;
  if (discriminant < 0.0) return -1.0;
  float t = (-b - sqrt(discriminant)) / (2.0 * a);
  if (t < 0.0) return -1.0;
  return t;
}

vec3 computeLighting(vec3 point, vec3 normal, vec3 lightPos, vec3 viewDir, vec3 color, float reflectivity) {
  vec3 lightDir = normalize(lightPos - point);
  vec3 ambient = color * 0.1;
  float diff = max(dot(normal, lightDir), 0.0);
  vec3 diffuse = color * diff * lightColor;
  vec3 reflectDir = reflect(-lightDir, normal);
  float spec = pow(max(dot(viewDir, reflectDir), 0.0), 32.0);
  vec3 specular = lightColor * spec * reflectivity;
  return ambient + diffuse + specular;
}

HitInfo findClosestHit(vec3 rayOrigin, vec3 rayDir) {
  HitInfo hit;
  hit.t = -1.0;
  hit.sphereIndex = -1;

  float tGround = intersectSphere(rayOrigin, rayDir, u_groundCenter, u_groundRadius);
  if (tGround > 0.0 && (hit.t < 0.0 || tGround < hit.t)) {
    hit.t = tGround;
    hit.sphereIndex = -1;
    hit.point = rayOrigin + rayDir * tGround;
    hit.normal = normalize(hit.point - u_groundCenter);
  }

  for (int i = 0; i < 6; i++) {
    float t = intersectSphere(rayOrigin, rayDir, u_sphereCenters[i], u_sphereRadii[i]);
    if (t > 0.0 && (hit.t < 0.0 || t < hit.t)) {
      hit.t = t;
      hit.sphereIndex = i;
      hit.point = rayOrigin + rayDir * t;
      hit.normal = normalize(hit.point - u_sphereCenters[i]);
    }
  }

  return hit;
}

void main() {
  vec2 uv = gl_FragCoord.xy / u_resolution * 2.0 - 1.0;
  vec3 rayOrigin = u_cameraPos;
  vec3 rayDir = normalize(vec3(uv, -1.0));

  HitInfo hit = findClosestHit(rayOrigin, rayDir);
  
  if (hit.t > 0.0) {
    vec3 viewDir = normalize(rayOrigin - hit.point);
    vec3 color;
    float reflectivity;
    
    // Use if-else instead of switch for GLSL ES 1.00 compatibility
    if (hit.sphereIndex == -1) {
      color = u_groundColor;
      reflectivity = 0.1;
    } else if (hit.sphereIndex == 0) {
      color = u_sphereColors[0];
      reflectivity = u_sphereReflectivities[0];
    } else if (hit.sphereIndex == 1) {
      color = u_sphereColors[1];
      reflectivity = u_sphereReflectivities[1];
    } else if (hit.sphereIndex == 2) {
      color = u_sphereColors[2];
      reflectivity = u_sphereReflectivities[2];
    } else if (hit.sphereIndex == 3) {
      color = u_sphereColors[3];
      reflectivity = u_sphereReflectivities[3];
    } else if (hit.sphereIndex == 4) {
      color = u_sphereColors[4];
      reflectivity = u_sphereReflectivities[4];
    } else if (hit.sphereIndex == 5) {
      color = u_sphereColors[5];
      reflectivity = u_sphereReflectivities[5];
    } else {
      color = vec3(1.0, 0.0, 0.0); // Red as error case
      reflectivity = 0.1;
    }
    
    vec3 finalColor = computeLighting(hit.point, hit.normal, u_lightPos, viewDir, color, reflectivity);
    gl_FragColor = vec4(finalColor, 1.0);
  } else {
    gl_FragColor = vec4(0.1, 0.1, 0.2, 1.0);
  }
}
`;

export const C1 = () => {
  const canvasRef = useRef(null);

  const createShader = (gl, type, source) => {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    const success = gl.getShaderParameter(shader, gl.COMPILE_STATUS);
    if (success) return shader;
    console.error(`Shader compilation failed: ${gl.getShaderInfoLog(shader)}`);
    gl.deleteShader(shader);
    return null;
  };

  const createProgram = (gl, vertexShader, fragmentShader) => {
    if (!vertexShader || !fragmentShader) {
      console.error("One or both shaders are null:", {
        vertexShader,
        fragmentShader,
      });
      return null;
    }
    const program = gl.createProgram();
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);
    const success = gl.getProgramParameter(program, gl.LINK_STATUS);
    if (success) return program;
    console.error(`Program linking failed: ${gl.getProgramInfoLog(program)}`);
    gl.deleteProgram(program);
    return null;
  };

  const createRandomSpheres = (count, groundY) => {
    const spheres = { centers: [], radii: [], colors: [], reflectivities: [] };

    const materialTypes = [
      { color: [0.8, 0.1, 0.1], reflectivity: 0.9 }, // Shiny red
      { color: [0.1, 0.8, 0.1], reflectivity: 0.6 }, // Glossy green
      { color: [0.1, 0.1, 0.8], reflectivity: 0.3 }, // Matte blue
      { color: [0.9, 0.9, 0.1], reflectivity: 0.8 }, // Shiny yellow
      { color: [0.5, 0.5, 0.5], reflectivity: 1.0 }, // Mirror-like silver
      { color: [0.8, 0.5, 0.2], reflectivity: 0.4 }, // Semi-glossy orange
    ];

    for (let i = 0; i < count; i++) {
      const radius = 0.3 + Math.random() * 0.7;
      const x = (Math.random() - 0.5) * 10.0;
      const y = radius + Math.random() * 4.5;
      const z = (Math.random() - 0.5) * 10.0;

      const material = materialTypes[i % materialTypes.length];

      spheres.centers.push(x, y, z);
      spheres.radii.push(radius);
      spheres.colors.push(...material.color);
      spheres.reflectivities.push(material.reflectivity);
    }
    return spheres;
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const gl = canvas.getContext("webgl");
    if (!gl) {
      alert("WebGL not supported");
      return;
    }

    const vertexShader = createShader(
      gl,
      gl.VERTEX_SHADER,
      rayTracingVertexShaderSource
    );
    const fragmentShader = createShader(
      gl,
      gl.FRAGMENT_SHADER,
      rayTracingFragmentShaderSource
    );

    if (!vertexShader || !fragmentShader) {
      console.error("Shader creation failed");
      return;
    }

    const program = createProgram(gl, vertexShader, fragmentShader);
    if (!program) return;

    const positionAttributeLocation = gl.getAttribLocation(
      program,
      "a_position"
    );
    const cameraPosUniformLocation = gl.getUniformLocation(
      program,
      "u_cameraPos"
    );
    const sphereCentersUniformLocation = gl.getUniformLocation(
      program,
      "u_sphereCenters[0]"
    );
    const sphereRadiiUniformLocation = gl.getUniformLocation(
      program,
      "u_sphereRadii[0]"
    );
    const sphereColorsUniformLocation = gl.getUniformLocation(
      program,
      "u_sphereColors[0]"
    );
    const sphereReflectivitiesUniformLocation = gl.getUniformLocation(
      program,
      "u_sphereReflectivities[0]"
    );
    const groundCenterUniformLocation = gl.getUniformLocation(
      program,
      "u_groundCenter"
    );
    const groundRadiusUniformLocation = gl.getUniformLocation(
      program,
      "u_groundRadius"
    );
    const groundColorUniformLocation = gl.getUniformLocation(
      program,
      "u_groundColor"
    );
    const lightPosUniformLocation = gl.getUniformLocation(
      program,
      "u_lightPos"
    );
    const resolutionUniformLocation = gl.getUniformLocation(
      program,
      "u_resolution"
    );

    const positionBuffer = gl.createBuffer();
    const positions = [-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1];
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);

    const groundRadius = 1000.0;
    const groundY = -groundRadius;
    const spheres = createRandomSpheres(6, groundY);

    const draw = (gl) => {
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

      gl.uniform3f(cameraPosUniformLocation, 0.0, 5.0, 10.0);
      gl.uniform3fv(
        sphereCentersUniformLocation,
        new Float32Array(spheres.centers)
      );
      gl.uniform1fv(
        sphereRadiiUniformLocation,
        new Float32Array(spheres.radii)
      );
      gl.uniform3fv(
        sphereColorsUniformLocation,
        new Float32Array(spheres.colors)
      );
      gl.uniform1fv(
        sphereReflectivitiesUniformLocation,
        new Float32Array(spheres.reflectivities)
      );
      gl.uniform3f(groundCenterUniformLocation, 0.0, -groundRadius, 0.0);
      gl.uniform1f(groundRadiusUniformLocation, groundRadius);
      gl.uniform3f(groundColorUniformLocation, 0.5, 0.4, 0.3);
      gl.uniform3f(lightPosUniformLocation, 2.0, 5.0, 5.0);
      gl.uniform2f(resolutionUniformLocation, canvas.width, canvas.height);

      gl.drawArrays(gl.TRIANGLES, 0, 6);
    };

    const handleResize = () => {
      const parent = canvas.parentElement;
      if (!parent) return;
      canvas.width = parent.clientWidth;
      canvas.height = parent.clientWidth;
      gl.viewport(0, 0, canvas.width, canvas.height);
      draw(gl);
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    draw(gl);

    return () => {
      window.removeEventListener("resize", handleResize);
      gl.deleteBuffer(positionBuffer);
      gl.deleteProgram(program);
      gl.deleteShader(vertexShader);
      gl.deleteShader(fragmentShader);
    };
  }, []);

  return <canvas ref={canvasRef} style={{ width: "100%", height: "100%" }} />;
};
