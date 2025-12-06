// main/src/components/Water.js

import { makeCanvas } from "../utils/Utility";

export const WaterTexture = makeCanvas(`
  precision mediump float;
  uniform vec2 u_resolution;
  uniform float u_time;
  uniform vec2 u_click_pos[5];
  uniform float u_click_time[5];

  // Improved hash function for better noise quality
  vec2 hash2(vec2 p) {
    return fract(sin(vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)))) * 43758.5453);
  }

  // Perlin noise implementation
  float perlinNoise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);

    vec2 a = hash2(i + vec2(0.0, 0.0));
    vec2 b = hash2(i + vec2(1.0, 0.0));
    vec2 c = hash2(i + vec2(0.0, 1.0));
    vec2 d = hash2(i + vec2(1.0, 1.0));

    float va = dot(a * 2.0 - 1.0, f - vec2(0.0, 0.0));
    float vb = dot(b * 2.0 - 1.0, f - vec2(1.0, 0.0));
    float vc = dot(c * 2.0 - 1.0, f - vec2(0.0, 1.0));
    float vd = dot(d * 2.0 - 1.0, f - vec2(1.0, 1.0));

    return mix(mix(va, vb, u.x), mix(vc, vd, u.x), u.y) * 0.5 + 0.5;
  }

  // FBM with unrolled loop for compatibility
  float fbm(vec2 p) {
    float value = 0.0;
    float amplitude = 0.5;
    float frequency = 1.0;
    float lacunarity = 2.0;
    float persistence = 0.5;

    value += amplitude * perlinNoise(p * frequency);
    frequency *= lacunarity;
    amplitude *= persistence;

    value += amplitude * perlinNoise(p * frequency);
    frequency *= lacunarity;
    amplitude *= persistence;

    value += amplitude * perlinNoise(p * frequency);
    frequency *= lacunarity;
    amplitude *= persistence;

    value += amplitude * perlinNoise(p * frequency);
    frequency *= lacunarity;
    amplitude *= persistence;

    value += amplitude * perlinNoise(p * frequency);
    frequency *= lacunarity;
    amplitude *= persistence;

    value += amplitude * perlinNoise(p * frequency);

    return value;
  }

  // Ripple height contribution
  float getRippleHeight(vec2 p, float aspect, float scale) {
    float ripple = 0.0;
    for (int i = 0; i < 5; i++) {
      if (u_click_time[i] < 0.0) continue;
      float time_delta = u_time - u_click_time[i];
      vec2 click_ndc = u_click_pos[i];
      vec2 click_uv = (click_ndc + 1.0) / 2.0;
      click_uv.x *= aspect;
      vec2 click = click_uv * scale;
      float dist = distance(p, click);
      if (dist > 2.0) continue;
      float fade_in = 1.0 - exp(-time_delta * 1.0);
      float fade_out = exp(-time_delta * 0.2);
      float fade = fade_in * fade_out;
      float wave = sin(dist * 20.0 - time_delta * 5.0) * exp(-dist * 3.0);
      ripple += wave * fade * 0.05;
    }
    return ripple;
  }

  // Bottom texture simulation
  vec3 bottomColor(vec2 p) {
    float n = fbm(p * 3.0);
    return mix(vec3(0.76, 0.70, 0.50), vec3(0.95, 0.87, 0.65), n); // Sandy bottom
  }

  // Height function
  float height(vec2 p, float aspect, float scale) {
    // Directional moving waves
    float waves = 0.1 * sin(p.x * 2.0 + u_time * 1.0) * 0.05;
    waves += 0.05 * sin(p.y * 3.0 + p.x * 1.5 + u_time * 0.8) * 0.03;
    // FBM for small details
    float noise = fbm(p * 2.0 + vec2(u_time * 0.1, u_time * 0.05)) * 0.1;
    // Ripple
    float ripple = getRippleHeight(p, aspect, scale);
    return waves + noise + ripple;
  }

  void main() {
    vec2 uv = gl_FragCoord.xy / u_resolution.xy;
    float aspect = u_resolution.x / u_resolution.y;
    uv.x *= aspect;
    float scale = 5.0;
    vec2 p = uv * scale;

    // Get height
    float h = height(p, aspect, scale);

    // Compute normals with smaller offset for better detail
    float offset = 0.002;
    float dx = height(p + vec2(offset, 0.0), aspect, scale) - height(p - vec2(offset, 0.0), aspect, scale);
    float dy = height(p + vec2(0.0, offset), aspect, scale) - height(p - vec2(0.0, offset), aspect, scale);
    vec3 normal = normalize(vec3(dx / offset * 0.5, dy / offset * 0.5, 1.0));

    // Refraction: offset bottom sampling
    vec2 refract_offset = normal.xy * (0.1 + h * 0.5);
    vec3 bottom = bottomColor(p + refract_offset);

    // Water color with absorption
    vec3 water_tint = vec3(0.0, 0.25, 0.6);
    float depth = 0.5 + abs(h) * 0.5; // Simulated depth
    vec3 absorbed = mix(bottom, water_tint, depth * 0.6);

    // Lighting
    vec3 light_dir = normalize(vec3(0.5, 0.5, 1.0));
    float diffuse = max(0.0, dot(normal, light_dir)) * 0.7 + 0.3;
    vec3 view_dir = vec3(0.0, 0.0, 1.0);
    vec3 halfway = normalize(light_dir + view_dir);
    float specular = pow(max(0.0, dot(normal, halfway)), 128.0) * 1.0;

    // Apply lighting to absorbed color
    vec3 color = absorbed * diffuse + vec3(1.0, 1.0, 0.9) * specular;

    // Foam on crests
    // Approximate curvature with second derivative
    float dxx = height(p + vec2(offset * 2.0, 0.0), aspect, scale) + height(p - vec2(offset * 2.0, 0.0), aspect, scale) - 2.0 * h;
    float dyy = height(p + vec2(0.0, offset * 2.0), aspect, scale) + height(p - vec2(0.0, offset * 2.0), aspect, scale) - 2.0 * h;
    float curvature = (dxx + dyy) * -10.0; // Inverted for crests
    float foam = smoothstep(0.2, 0.4, curvature) * smoothstep(0.05, 0.1, abs(h));
    color = mix(color, vec3(1.0), foam * 0.8);

    // Fresnel for sky reflection
    float fresnel = pow(1.0 - max(0.0, dot(normal, view_dir)), 4.0);
    vec3 sky_color = vec3(0.5, 0.7, 1.0); // Constant sky color without gradient
    color = mix(color, sky_color, fresnel * 0.4);

    gl_FragColor = vec4(color, 1.0);
  }
`);
