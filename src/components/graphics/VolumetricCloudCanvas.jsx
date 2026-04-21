import React, { useRef, useEffect } from "react";

const cloudVertexShaderSource = `
  attribute vec4 a_position;
  varying vec2 v_uv;
  void main() {
    gl_Position = a_position;
    v_uv = (a_position.xy + 1.0) * 0.5;
  }
`;

const cloudFragmentShaderSource = `
  precision highp float;
  varying vec2 v_uv;
  
  uniform float u_time;
  uniform vec3 u_sunDirection;
  uniform float u_noiseScale;
  uniform float u_cloudDensity;
  uniform float u_softEdges;
  uniform float u_shadowIntensity;
  uniform float u_stepCount;
  uniform float u_fadeDistance;

  float hash(vec3 p) {
    return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453);
  }

  float noise(vec3 p) {
    vec3 i = floor(p);
    vec3 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(mix(hash(i + vec3(0,0,0)), hash(i + vec3(1,0,0)), f.x),
          mix(hash(i + vec3(0,1,0)), hash(i + vec3(1,1,0)), f.x), f.y),
      mix(mix(hash(i + vec3(0,0,1)), hash(i + vec3(1,0,1)), f.x),
          mix(hash(i + vec3(0,1,1)), hash(i + vec3(1,1,1)), f.x), f.y), f.z);
  }

  float fbm(vec3 p) {
    float v = 0.0;
    float a = 0.5;
    vec3 shift = vec3(100.0);
    for (int i = 0; i < 4; ++i) {
      v += a * noise(p);
      p = p * 2.0 + shift;
      a *= 0.5;
    }
    return v;
  }

  float getCloudDensity(vec3 p) {
    float baseNoise = fbm(p * u_noiseScale + u_time * 0.1);
    float density = baseNoise * u_cloudDensity;
    float dist = length(p - vec3(0.0));
    float falloff = smoothstep(1.0, 1.0 - u_softEdges, dist);
    density *= falloff;
    return max(0.0, density - 0.1);
  }

  float calculateLight(vec3 pos) {
    vec3 lightDir = normalize(u_sunDirection);
    float stepSize = 0.1;
    float density = 0.0;
    float t = 0.0;
    
    for (int i = 0; i < 6; i++) {
      vec3 samplePos = pos + lightDir * t;
      density += getCloudDensity(samplePos) * stepSize;
      t += stepSize;
      if (density > 1.0) break;
    }
    
    return exp(-density * u_shadowIntensity);
  }

  void main() {
    vec3 rayOrigin = vec3(0.0, 0.0, -2.0);
    vec3 rayDir = normalize(vec3(v_uv * 2.0 - 1.0, 1.0));
    
    float sphereRadius = 1.0;
    vec3 sphereCenter = vec3(0.0);
    
    vec3 oc = rayOrigin - sphereCenter;
    float a = dot(rayDir, rayDir);
    float b = 2.0 * dot(oc, rayDir);
    float c = dot(oc, oc) - sphereRadius * sphereRadius;
    float discriminant = b * b - 4.0 * a * c;
    
    if (discriminant < 0.0) {
      gl_FragColor = vec4(0.2, 0.5, 0.8, 1.0);
      return;
    }

    float t0 = (-b - sqrt(discriminant)) / (2.0 * a);
    float t1 = (-b + sqrt(discriminant)) / (2.0 * a);
    
    float stepSize = (t1 - t0) / u_stepCount;
    float t = t0;
    vec4 color = vec4(0.0);
    float transmittance = 1.0;
    
    // Use a fixed maximum iteration count
    const float maxSteps = 64.0;
    float stepsToTake = min(u_stepCount, maxSteps);
    
    for (int i = 0; i < int(maxSteps); i++) {
      if (float(i) >= stepsToTake) break;
      if (t >= t1 || transmittance < 0.01) break;
      
      vec3 pos = rayOrigin + rayDir * t;
      float density = getCloudDensity(pos);
      
      if (density > 0.0) {
        float light = calculateLight(pos);
        vec3 cloudColor = vec3(1.0) * light + vec3(0.8, 0.9, 1.0) * 0.2;
        float alpha = 1.0 - exp(-density * stepSize);
        
        color.rgb += cloudColor * alpha * transmittance;
        color.a += alpha * transmittance;
        transmittance *= 1.0 - alpha;
      }
      
      t += stepSize;
    }
    
    vec3 skyColor = vec3(0.2, 0.5, 0.8);
    gl_FragColor = vec4(mix(skyColor, color.rgb, color.a), 1.0);
  }
`;

const createShader = (gl, type, source) => {
  const shader = gl.createShader(type);
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  const success = gl.getShaderParameter(shader, gl.COMPILE_STATUS);
  if (!success) {
    console.error(`Shader compilation failed: ${gl.getShaderInfoLog(shader)}`);
    gl.deleteShader(shader);
    return null;
  }
  return shader;
};

const createProgram = (gl, vertexShader, fragmentShader) => {
  if (!vertexShader || !fragmentShader) {
    console.error("One or both shaders are invalid");
    return null;
  }
  const program = gl.createProgram();
  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);
  const success = gl.getProgramParameter(program, gl.LINK_STATUS);
  if (!success) {
    console.error(`Program linking failed: ${gl.getProgramInfoLog(program)}`);
    gl.deleteProgram(program);
    return null;
  }
  return program;
};

export const A1 = () => {
  const canvasRef = useRef(null);

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
      cloudVertexShaderSource
    );
    const fragmentShader = createShader(
      gl,
      gl.FRAGMENT_SHADER,
      cloudFragmentShaderSource
    );
    const program = createProgram(gl, vertexShader, fragmentShader);

    if (!program) {
      console.error("Failed to create program");
      return;
    }

    const positionBuffer = gl.createBuffer();
    const positions = new Float32Array([
      -1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1,
    ]);
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);

    const positionLocation = gl.getAttribLocation(program, "a_position");

    const uniforms = {
      time: gl.getUniformLocation(program, "u_time"),
      sunDirection: gl.getUniformLocation(program, "u_sunDirection"),
      noiseScale: gl.getUniformLocation(program, "u_noiseScale"),
      cloudDensity: gl.getUniformLocation(program, "u_cloudDensity"),
      softEdges: gl.getUniformLocation(program, "u_softEdges"),
      shadowIntensity: gl.getUniformLocation(program, "u_shadowIntensity"),
      stepCount: gl.getUniformLocation(program, "u_stepCount"),
      fadeDistance: gl.getUniformLocation(program, "u_fadeDistance"),
    };

    const resize = () => {
      canvas.width = canvas.parentElement.clientWidth;
      canvas.height = canvas.parentElement.clientWidth;
      gl.viewport(0, 0, canvas.width, canvas.height);
    };

    let time = 0;
    let isMounted = true;
    let animationFrameId;

    const animate = () => {
      if (!isMounted) return;
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.useProgram(program);

      if (uniforms.time) gl.uniform1f(uniforms.time, time);
      if (uniforms.sunDirection)
        gl.uniform3f(uniforms.sunDirection, 1.0, 1.0, 0.5);
      if (uniforms.noiseScale) gl.uniform1f(uniforms.noiseScale, 1.0);
      if (uniforms.cloudDensity) gl.uniform1f(uniforms.cloudDensity, 2.0);
      if (uniforms.softEdges) gl.uniform1f(uniforms.softEdges, 0.3);
      if (uniforms.shadowIntensity) gl.uniform1f(uniforms.shadowIntensity, 2.0);
      if (uniforms.stepCount) gl.uniform1f(uniforms.stepCount, 32.0);
      if (uniforms.fadeDistance) gl.uniform1f(uniforms.fadeDistance, 5.0);

      gl.enableVertexAttribArray(positionLocation);
      gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
      gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);
      gl.drawArrays(gl.TRIANGLES, 0, 6);

      time += 0.01;
      animationFrameId = requestAnimationFrame(animate);
    };

    resize();
    window.addEventListener("resize", resize);
    animate();

    return () => {
      isMounted = false;
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener("resize", resize);
      gl.deleteBuffer(positionBuffer);
      gl.deleteProgram(program);
      gl.deleteShader(vertexShader);
      gl.deleteShader(fragmentShader);
    };
  }, []);

  return <canvas ref={canvasRef} style={{ width: "100%", height: "100%" }} />;
};
