// main/src/components/ShaderFXCanvas.js

import { makeCanvas } from "../utils/Utility";

export const F1 = makeCanvas(`
  precision mediump float;
  uniform vec2 u_resolution;
  uniform float u_time;

  // Simple sphere SDF
  float sdSphere(vec3 p){ return length(p)-1.0; }

  // Normal via gradient
  vec3 normal(vec3 p){
    const float h = 0.001;
    return normalize(vec3(
      sdSphere(p+vec3(h,0,0)) - sdSphere(p-vec3(h,0,0)),
      sdSphere(p+vec3(0,h,0)) - sdSphere(p-vec3(0,h,0)),
      sdSphere(p+vec3(0,0,h)) - sdSphere(p-vec3(0,0,h))
    ));
  }

  void main(){
    vec2 uv = (gl_FragCoord.xy - 0.5*u_resolution)/u_resolution.y;
    vec3 ro = vec3(0,0,-3.5);
    vec3 rd = normalize(vec3(uv,1.0));

    // rotate camera
    float a = u_time*0.3;
    mat3 rot = mat3(cos(a),0,-sin(a), 0,1,0, sin(a),0,cos(a));
    rd = rot * rd; ro = rot * ro;

    // raymarch
    float t = 0.0;
    for(int i=0;i<80;i++){
      vec3 p = ro + rd*t;
      float d = sdSphere(p);
      t += d*0.7;
      if(d<0.001 || t>10.0) break;
    }

    vec3 col = vec3(0.05,0.1,0.15);
    if(t<10.0){
      vec3 p = ro + rd*t;
      vec3 n = normal(p);
      vec3 l = normalize(vec3(1,2,1));

      // Lambert – quantised
      float diff = dot(n,l);
      diff = floor(diff*4.0)/4.0;           // 4 bands

      // simple edge detection
      float edge = smoothstep(0.0,0.05,abs(diff));
      col = mix(vec3(0.0), vec3(0.9,0.7,0.4), diff);
      col = mix(col, vec3(0.0), edge);     // black outline
    }

    gl_FragColor = vec4(col,1.0);
  }
`);

export const F2 = makeCanvas(`
  precision mediump float;
  uniform vec2 u_resolution;
  uniform float u_time;

  // same sphere as F1
  float sdSphere(vec3 p){ return length(p)-1.0; }

  void main(){
    vec2 uv = (gl_FragCoord.xy - 0.5*u_resolution)/u_resolution.y;
    vec3 ro = vec3(0,0,-3.5);
    vec3 rd = normalize(vec3(uv,1.0));

    float t = 0.0;
    for(int i=0;i<80;i++){
      vec3 p = ro + rd*t;
      float d = sdSphere(p);
      t += d*0.7;
      if(d<0.001 || t>10.0) break;
    }

    float depth = t<10.0 ? t : 100.0;
    float shade = 1.0 - smoothstep(0.0,8.0,depth);

    // Sobel edge detection (grayscale)
    float gx = dFdx(shade), gy = dFdy(shade);
    float edge = length(vec2(gx,gy));
    edge = smoothstep(0.02,0.08,edge);

    // paper texture
    vec2 paper = gl_FragCoord.xy / u_resolution;
    float grain = fract(sin(dot(paper,vec2(12.9898,78.233)))*43758.5453);
    shade = mix(shade, grain, 0.07);

    vec3 col = vec3(shade);
    col = mix(col, vec3(0.0), edge); // dark strokes

    gl_FragColor = vec4(col,1.0);
  }
`);
