import { makeCanvas } from "../utils/Utility";

export const Smoke2D = makeCanvas(`
  precision mediump float;
  uniform vec2 u_resolution;
  uniform float u_time;

  // 3-D value noise (simplex-like)
  float hash(vec3 p){ return fract(sin(dot(p,vec3(7,157,113)))*43758.5453); }
  float noise(vec3 p){
    vec3 i = floor(p), f = fract(p), u = f*f*(3.0-2.0*f);
    return mix(mix(mix(hash(i+vec3(0,0,0)),hash(i+vec3(1,0,0)),u.x),
                   mix(hash(i+vec3(0,1,0)),hash(i+vec3(1,1,0)),u.x),u.y),
               mix(mix(hash(i+vec3(0,0,1)),hash(i+vec3(1,0,1)),u.x),
                   mix(hash(i+vec3(0,1,1)),hash(i+vec3(1,1,1)),u.x),u.y),u.z);
  }

  void main(){
    vec2 uv = gl_FragCoord.xy/u_resolution.xy;
    vec3 pos = vec3(uv*8.0, u_time*0.8);
    float n = noise(pos);
    n = smoothstep(0.3,0.7,n);

    vec3 col = mix(vec3(0.05), vec3(0.8,0.85,0.9), n);
    col *= 0.7 + 0.3*sin(u_time + uv.x*10.0); // subtle flicker

    gl_FragColor = vec4(col,1.0);
  }
`);
