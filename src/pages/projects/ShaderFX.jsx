import { Voronoi2D } from "../../components/graphics/Voronoi2D";
import { Mandelbrot, Julia } from "../../components/graphics/Fractals2D";
import { WaterTexture } from "../../components/graphics/Water";
import { Fire2D } from "../../components/graphics/Fire2D";
import { Smoke2D } from "../../components/graphics/Smoke2D";
import ProjectPageLayout from "../../components/layout/ProjectPageLayout";

const groups = [
  {
    groupName: "Voronoi Diagram",
    description:
      "Interactive 2D Voronoi diagram using Euclidean distance. The space partitions into regions around seed points — each region contains every point closest to its seed, forming characteristic polygonal shapes.",
    components: {
      A1: () => <Voronoi2D />,
    },
  },
  {
    groupName: "Fractals",
    description:
      "Interactive Mandelbrot and Julia sets rendered in real time. Zoom, pan, and explore the infinite complexity of these iconic complex-number iteration maps.",
    components: {
      D1: () => <Mandelbrot />,
      D2: () => <Julia />,
    },
  },
  {
    groupName: "Water",
    description:
      "Stylized water surface using a summed sine-wave height field with fake refraction and a Fresnel term. Move the mouse to tilt the view.",
    components: {
      E1: () => <WaterTexture />,
    },
  },
  {
    groupName: "Fire",
    description:
      "Purely procedural 2D fire simulation. Runs in a single fragment shader with no textures required.",
    components: {
      B1: () => <Fire2D />,
    },
  },
  {
    groupName: "Smoke",
    description:
      "Lightweight 2D smoke advection demo. Purely procedural fragment shader — no textures needed.",
    components: {
      C2: () => <Smoke2D />,
    },
  },
];

const defaultTabs = {
  "Voronoi Diagram": "A1",
  Fire: "B1",
  Smoke: "C2",
  Fractals: "D1",
  Water: "E1",
};

function ShaderFX() {
  return (
    <ProjectPageLayout
      title="Shader FX"
      intro="It's amazing how math can create beautiful visuals. A collection of math-based visualizations exploring the intersection of algorithms and design — each running entirely in GLSL fragment shaders."
      groups={groups}
      defaultTabs={defaultTabs}
    />
  );
}

export default ShaderFX;
