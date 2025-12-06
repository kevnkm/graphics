
import { makeCanvas } from "../utils/Utility";

export const Fire2D = makeCanvas(`
  precision mediump float;
  uniform vec2 u_resolution;
  uniform float u_time;
  uniform vec2 u_mouse;

  // 2-D noise (classic)
  float hash(vec2 p){ return fract(sin(dot(p,vec2(12.9898,78.233))) * 43758.5453); }
  float noise(vec2 p){
    vec2 i = floor(p), f = fract(p), u = f*f*(3.0-2.0*f);
    return mix(mix(hash(i+vec2(0,0)), hash(i+vec2(1,0)), u.x),
               mix(hash(i+vec2(0,1)), hash(i+vec2(1,1)), u.x), u.y);
  }

  void main(){
    vec2 uv = gl_FragCoord.xy/u_resolution.xy;
    uv.y = 1.0 - uv.y;               // fire rises from bottom
    uv *= 5.0;                       // scale
    uv.y += u_time * 1.5;            // scroll upward

    float n = noise(uv * 2.0);
    n = pow(n, 2.0);
    float flame = smoothstep(0.0, 0.7, n);

    vec3 col = mix(vec3(0.0,0.0,0.0), vec3(1.0,0.7,0.0), flame);   // orange
    col = mix(col, vec3(1.0,0.1,0.0), smoothstep(0.6,1.0,flame)); // red core
    col = mix(col, vec3(1.0,1.0,0.2), smoothstep(0.9,1.0,flame)); // yellow tip

    // simple mouse interaction – push fire left/right
    float push = smoothstep(0.3,0.0,abs(uv.x - (u_mouse.x*5.0+2.5)));
    uv.x += push * sin(u_time*3.0)*0.2;

    gl_FragColor = vec4(col,1.0);
  }
`);
