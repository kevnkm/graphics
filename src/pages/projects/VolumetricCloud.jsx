import * as VolumetricCloudCanvas from "../../components/graphics/VolumetricCloudCanvas";
import ProjectPageLayout from "../../components/layout/ProjectPageLayout";

// References:
// https://iquilezles.org/articles/dynclouds/
// https://blog.maximeheckel.com/posts/real-time-cloudscapes-with-volumetric-raymarching/
// https://www.thefrontdev.co.uk/real-time-volumetric-clouds-glsl-and-three
// https://www.shadertoy.com/view/3sffzj
// https://www.shadertoy.com/view/XdBSWd

const groups = [
  {
    groupName: "Blob",
    description:
      "Combines 3D Worley and Perlin noise for clumpy cloud formations, a directional light with self-shadowing, and Mie scattering for soft edge glow. Confined to a bounding sphere with tweakable density, softness, and shadow uniforms.",
    components: {
      A1: () => <VolumetricCloudCanvas.A1 />,
    },
  },
];

const defaultTabs = { Blob: "A1" };

function VolumetricCloud() {
  return (
    <ProjectPageLayout
      title="Volumetric Cloud"
      intro="Real-time volumetric cloud renderer using ray marching through a bounding sphere. Combines procedural 3D noise, Mie scattering, and self-shadowing to produce dynamic, evolving cloud masses."
      groups={groups}
      defaultTabs={defaultTabs}
    />
  );
}

export default VolumetricCloud;
