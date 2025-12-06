import { useRef, useEffect } from "react";
import { makeCanvas } from "../utils/Utility";

export const voronoiFragmentSource = `
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

export const Voronoi2D = () => {
  const canvasRef = useRef(null);
  const draggingRef = useRef({ pointIndex: -1, touchId: null });

  const points = Array.from({ length: 100 }, () => ({
    x: Math.random() * 2 - 1,
    y: Math.random() * 2 - 1,
  }));

  const pointsArray = new Float32Array(200);
  for (let i = 0; i < 100; i++) {
    pointsArray[i * 2] = points[i].x;
    pointsArray[i * 2 + 1] = points[i].y;
  }

  const VoronoiCanvas = makeCanvas(voronoiFragmentSource, {
    u_points: { type: "2fv", value: pointsArray },
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const isPointInRange = (x, y, point) => {
      const dx = x - point.x;
      const dy = y - point.y;
      return Math.sqrt(dx * dx + dy * dy) < 0.05;
    };

    const toSceneX = (x) => (x / canvas.width) * 2 - 1;
    const toSceneY = (y) => -((y / canvas.height) * 2 - 1);

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
      const index = draggingRef.current.pointIndex;
      if (index !== -1) {
        points[index].x = x;
        points[index].y = y;
        pointsArray[index * 2] = x;
        pointsArray[index * 2 + 1] = y;
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
          const index = draggingRef.current.pointIndex;
          if (index !== -1) {
            points[index].x = x;
            points[index].y = y;
            pointsArray[index * 2] = x;
            pointsArray[index * 2 + 1] = y;
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

    canvas.addEventListener("mousedown", handleMouseDown);
    canvas.addEventListener("mousemove", handleMouseMove);
    canvas.addEventListener("mouseup", handleMouseUp);
    canvas.addEventListener("touchstart", handleTouchStart);
    canvas.addEventListener("touchmove", handleTouchMove);
    canvas.addEventListener("touchend", handleTouchEnd);

    return () => {
      canvas.removeEventListener("mousedown", handleMouseDown);
      canvas.removeEventListener("mousemove", handleMouseMove);
      canvas.removeEventListener("mouseup", handleMouseUp);
      canvas.removeEventListener("touchstart", handleTouchStart);
      canvas.removeEventListener("touchmove", handleTouchMove);
      canvas.removeEventListener("touchend", handleTouchEnd);
    };
  }, []);

  return <VoronoiCanvas ref={canvasRef} />;
};
