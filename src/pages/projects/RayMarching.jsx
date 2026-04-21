import * as RayMarchingCanvas from "../../components/graphics/RayMarchingCanvas";
import ProjectPageLayout from "../../components/layout/ProjectPageLayout";

const groups = [
  {
    groupName: "2D Demonstration",
    description: (
      <>
        Interactive 2D ray marching with Signed Distance Functions. A ray
        originates from a green point at the center, stepping toward the target.
        At each step, a circle outlines the distance to the nearest of three
        circular obstacles — yellow dots mark the steps, red dot at the end.
      </>
    ),
    components: {
      A1: () => <RayMarchingCanvas.A1 />,
    },
  },
  {
    groupName: "3D Ray Marching",
    description: (
      <>
        3D ray marching renderer visualizing spheres, toruses, and cubes via
        Signed Distance Fields with smooth blending. SDF reference by{" "}
        <a
          href="https://iquilezles.org/articles/distfunctions/"
          target="_blank"
          rel="noopener noreferrer"
        >
          Inigo Quilez
        </a>
        .
      </>
    ),
    components: {
      B1: () => <RayMarchingCanvas.B1 />,
    },
  },
];

const defaultTabs = {
  "2D Demonstration": "A1",
  "3D Ray Marching": "B1",
};

function RayMarching() {
  return (
    <ProjectPageLayout
      title="Ray Marching"
      intro="A rendering technique that traces rays iteratively through a scene using Signed Distance Functions, enabling complex shapes, soft shadows, and smooth blending without traditional polygon geometry."
      groups={groups}
      defaultTabs={defaultTabs}
    />
  );
}

export default RayMarching;
