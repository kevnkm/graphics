import * as RayTracingCanvas from "../../components/graphics/RayTracingCanvas";
import ProjectPageLayout from "../../components/layout/ProjectPageLayout";

const groups = [
  {
    groupName: "2D Demonstration",
    description:
      "Rays cast from the camera to each pixel, testing intersections with scene objects. Distance to the intersection point determines pixel color, producing simple 2D rendering with shadows and reflections.",
    components: {
      A1: () => <RayTracingCanvas.A1 />,
      A2: () => <RayTracingCanvas.A2 />,
      A3: () => <RayTracingCanvas.A3 />,
      A4: () => <RayTracingCanvas.A4 />,
      A5: () => <RayTracingCanvas.A5 />,
      B1: () => <RayTracingCanvas.B1 />,
      B2: () => <RayTracingCanvas.B2 />,
      B3: () => <RayTracingCanvas.B3 />,
    },
  },
  {
    groupName: "3D Ray Tracing",
    description: (
      <>
        GPU-accelerated 3D ray tracer following the principles of{" "}
        <a
          href="https://raytracing.github.io/"
          target="_blank"
          rel="noopener noreferrer"
        >
          Ray Tracing In One Weekend
        </a>{" "}
        by Peter Shirley — implemented in GLSL and rendered with Three.js.
      </>
    ),
    components: {
      C1: () => <RayTracingCanvas.C1 />,
    },
  },
];

const defaultTabs = {
  "2D Demonstration": "A5",
  "3D Ray Tracing": "C1",
};

function RayTracing() {
  return (
    <ProjectPageLayout
      title="Ray Tracing"
      intro="A sophisticated rendering technique that simulates physical light by casting rays from the camera into the scene, tracing secondary rays for reflections, refractions, and shadows."
      groups={groups}
      defaultTabs={defaultTabs}
    />
  );
}

export default RayTracing;
