/**
 * VolumetricCloudCanvas.jsx — Real-time volumetric cloud via ray marching.
 * Uses the shared useWebGL hook; zero boilerplate.
 */
import { useWebGL } from "../../utils/webgl";

const CLOUD_FS = `
precision highp float;
uniform vec2 u_resolution;
uniform float u_time;
uniform vec2 u_mouse;

// High quality Hash
float hash(vec3 p) {
    p = fract(p * vec3(17.1, 31.7, 47.1));
    p += dot(p, p.yzx + 19.19);
    return fract((p.x + p.y) * p.z);
}

// 3D Noise
float noise(vec3 x) {
    vec3 i = floor(x);
    vec3 f = fract(x);
    f = f * f * (3.0 - 2.0 * f);
    return mix(mix(mix(hash(i + vec3(0,0,0)), hash(i + vec3(1,0,0)), f.x),
                   mix(hash(i + vec3(0,1,0)), hash(i + vec3(1,1,0)), f.x), f.y),
               mix(mix(hash(i + vec3(0,0,1)), hash(i + vec3(1,0,1)), f.x),
                   mix(hash(i + vec3(0,1,1)), hash(i + vec3(1,1,1)), f.x), f.y), f.z);
}

const mat3 m3 = mat3( 0.00,  0.80,  0.60,
                    -0.80,  0.36, -0.48,
                    -0.60, -0.48,  0.64 );

// FBM
float fbm(vec3 q) {
    float f = 0.0;
    float a = 0.5;
    for(int i=0; i<4; i++) {
        f += a * noise(q);
        q = m3 * q * 2.01;
        a *= 0.5;
    }
    return f;
}

// Density function
float map(vec3 p) {
    vec3 q = p - vec3(0.0, 0.1 * u_time, u_time * 0.8);
    float f = fbm(q * 0.4);
    
    // Cloud layer bounds: y between 0.0 and 6.0
    float h = p.y / 6.0;
    // Fluffy bottom, fading top
    float sh = smoothstep(0.0, 0.2, h) * smoothstep(1.0, 0.5, h);
    
    // Erode the base noise to make it distinctly puffy
    float d = f - 0.55 + h * 0.2; 
    return max(d * sh * 6.0, 0.0);
}

// Henyey-Greenstein phase
float phase(float cosA) {
    float g = 0.6;
    float g2 = g*g;
    return (1.0 - g2) / pow(1.0 + g2 - 2.0 * g * cosA, 1.5) / 12.566;
}

void main() {
    vec2 p = (gl_FragCoord.xy * 2.0 - u_resolution.xy) / min(u_resolution.x, u_resolution.y);
    
    // Mouse setup for camera
    vec2 mo = u_mouse * 3.14159;

    // Camera
    vec3 ro = vec3(0.0, 2.0, 0.0); 
    vec3 ta = vec3(0.0, 2.0, 1.0);
    
    mat3 rotY = mat3(cos(mo.x), 0.0, -sin(mo.x), 0.0, 1.0, 0.0, sin(mo.x), 0.0, cos(mo.x));
    mat3 rotX = mat3(1.0, 0.0, 0.0, 0.0, cos(-mo.y*0.5), sin(-mo.y*0.5), 0.0, -sin(-mo.y*0.5), cos(-mo.y*0.5));
    
    vec3 ww = normalize(ta - ro);
    vec3 uu = normalize(cross(ww, vec3(0.0, 1.0, 0.0)));
    vec3 vv = normalize(cross(uu, ww));
    vec3 rd = normalize(p.x * uu + p.y * vv + 1.2 * ww);
    
    rd = rotY * rotX * rd;

    // Lighting config
    vec3 sunDir = normalize(vec3(0.8, 0.4, 0.6));
    vec3 sunCol = vec3(1.0, 0.8, 0.5) * 6.0;
    vec3 skyBot = vec3(0.5, 0.6, 0.8);
    vec3 skyTop = vec3(0.1, 0.3, 0.6);

    // Sky background
    float sunDot = clamp(dot(rd, sunDir), 0.0, 1.0);
    vec3 bg = mix(skyBot, skyTop, clamp(rd.y + 0.2, 0.0, 1.0));
    bg += vec3(1.0, 0.6, 0.2) * pow(sunDot, 16.0) * 0.4;
    bg += sunCol * pow(sunDot, 256.0) * 0.8;
    vec3 col = bg;
    
    // Bounds intersection (y=0 to y=6)
    float tmin = 0.0;
    float tmax = 40.0;
    if (rd.y > 0.0) {
        tmin = max(tmin, (0.0 - ro.y) / rd.y);
        tmax = min(tmax, (6.0 - ro.y) / rd.y);
    } else if (rd.y < 0.0) {
        tmax = min(tmax, (0.0 - ro.y) / rd.y);
        tmin = max(tmin, (6.0 - ro.y) / rd.y);
    }
    
    tmin = max(tmin, 0.0);
    
    if (tmin < tmax) {
        float t = tmin + 0.1 * hash(vec3(gl_FragCoord.xy, u_time));
        vec4 sum = vec4(0.0);
        float ph = phase(sunDot);
        
        float dt = max(0.15, 0.05 * t);
        for(int i=0; i<64; i++) {
            if(sum.a > 0.99 || t > tmax) break;
            
            vec3 pos = ro + rd * t;
            float den = map(pos);
            
            if (den > 0.01) {
                float dif = clamp((den - map(pos + sunDir * 0.3)) / 0.3, 0.0, 1.0);
                float lit = log(1.0 + dif * 2.0); // optimized shadow curve
                
                vec3 lin = sunCol * lit * (0.2 + 1.2 * ph);
                vec3 amb = mix(vec3(0.3,0.4,0.5), skyTop, pos.y / 6.0) * 0.6;
                lin += amb;
                
                float alpha = 1.0 - exp(-den * dt * 2.0);
                vec4 rgb = vec4(lin, alpha);
                rgb.rgb *= rgb.a;
                sum += rgb * (1.0 - sum.a);
            }
            t += dt;
            dt = max(0.15, 0.05 * t);
        }
        
        // Blend cloud with background
        col = mix(bg, sum.rgb / max(sum.a, 0.001), sum.a);
        
        // Fog to blend layer into distance
        col = mix(col, bg, 1.0 - exp(-0.003 * tmin * tmin));
    }
    
    // Post process
    col = col * (col + 0.0245786) / (col * (0.983729 * col + 0.432951) + 0.238081);
    
    gl_FragColor = vec4(pow(max(col, 0.0), vec3(0.4545)), 1.0);
}
`;

export function A1() {
    const canvasRef = useWebGL(CLOUD_FS);
    return (
        <div style={{ width: "100%", position: "relative" }}>
            <canvas ref={canvasRef} style={{ width: "100%", display: "block" }} />
            <div style={{
                position: "absolute", bottom: 8, right: 10,
                fontFamily: "var(--font-mono)", fontSize: "0.68rem",
                color: "rgba(255,255,255,0.4)", pointerEvents: "none",
                textShadow: "0 1px 3px rgba(0,0,0,0.8)"
            }}>
                move mouse to tilt view
            </div>
        </div>
    );
}

