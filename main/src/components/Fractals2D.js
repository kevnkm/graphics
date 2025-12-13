// main/src/components/Fractals2D.js

import { makeCanvas } from "../utils/Utility";

export const Mandelbrot = makeCanvas(
  `
  precision highp float;
  uniform vec2 u_resolution;
  uniform float u_time;

  void main(){
    vec2 uv = (gl_FragCoord.xy - 0.5*u_resolution) / u_resolution.y;

    float zoom = pow(0.5, u_time * 0.2);
    vec2 center = vec2(-0.75, 0.1);
    vec2 c = center + uv * zoom;

    vec2 z = vec2(0.0);
    float iter = 0.0;
    const float MAX_ITER = 500.0;
    for(float i = 0.0; i < MAX_ITER; i++){
      z = vec2(z.x*z.x - z.y*z.y, 2.0*z.x*z.y) + c;
      if(dot(z,z) > 4.0) break;
      iter++;
    }
    float smooth = iter - log2(log2(dot(z,z))) + 4.0;
    vec3 col = vec3(0.0);
    if(iter < MAX_ITER){
      float t = smooth / MAX_ITER;
      col = 0.5 + 0.5 * cos(6.283 * (t * vec3(0.0, 0.33, 0.66) + vec3(0.0, 0.2, 0.4)));
    } else {
      col = vec3(0.0);
    }
    gl_FragColor = vec4(col, 1.0);
  }
`,
  {}
);

export const Julia = makeCanvas(
  `
  precision highp float;
  uniform vec2 u_resolution;
  uniform float u_time;

  void main(){
    vec2 uv = (gl_FragCoord.xy - 0.5*u_resolution) / u_resolution.y;

    vec2 c = vec2(-0.7269, 0.1889);

    float zoom = pow(0.5, u_time * 0.15);
    vec2 center = vec2(0.0, 0.0);
    vec2 z = center + uv * zoom;

    float iter = 0.0;
    const float MAX_ITER = 500.0;
    for(float i = 0.0; i < MAX_ITER; i++){
      z = vec2(z.x*z.x - z.y*z.y, 2.0*z.x*z.y) + c;
      if(dot(z,z) > 4.0) break;
      iter++;
    }
    float t = iter / MAX_ITER;
    vec3 col = mix(vec3(0.0, 0.0, 0.2), vec3(1.0, 0.7, 0.9), sqrt(t));
    gl_FragColor = vec4(col, 1.0);
  }
`,
  {}
);
