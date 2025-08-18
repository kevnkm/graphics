import React from "react";
import { useState } from "react";
import * as VolumetricCloudCanvas from "../../components/VolumetricCloudCanvas";

// References:
// https://iquilezles.org/articles/dynclouds/
// https://blog.maximeheckel.com/posts/real-time-cloudscapes-with-volumetric-raymarching/
// https://www.thefrontdev.co.uk/real-time-volumetric-clouds-glsl-and-three
// https://www.shadertoy.com/view/3sffzj
// https://www.shadertoy.com/view/XdBSWd

const componentGroupList = [
  {
    groupName: "Blob",
    description: (
      <>
        This scene features a shader that combines 3D Worley and Perlin noise
        for clumpy cloud formations, a directional light source with
        self-shadowing for depth, and Mie scattering for soft edge glow. The
        cloud is confined within a bounding sphere, with tweakable parameters
        like density, softness, and shadow intensity exposed as uniforms for
        customization. Optimized with adjustable step counts and early exit
        conditions, the renderer achieves a balance of performance and visual
        quality, showcasing dynamic, evolving clouds in real-time.
      </>
    ),
    components: {
      A1: () => <VolumetricCloudCanvas.A1 />,
    },
  },
];

function VolumetricCloud() {
  const [activeTabs, setActiveTabs] = useState({
    Blob: "A1",
  });

  const handleTabChange = (groupName, tab) => {
    setActiveTabs((prev) => ({
      ...prev,
      [groupName]: tab,
    }));
  };

  return (
    <div className="relative w-full min-h-[calc(100vh)] bg-white flex justify-center">
      <div className="container mx-auto p-4 w-full max-w-md sm:max-w-2xl lg:max-w-3xl pb-16">
        <h1 className="text-xl font-bold text-center text-gray-800 mb-3">
          Introduction
        </h1>
        <p className="text-center">
          Volumetric clouds are a common feature in video games and simulations,
          adding depth and realism to virtual environments. This project
          showcases a demonstration of a volumetric cloud renderer that
          visualizes a realistic, puffy cloud mass using ray marching.
        </p>

        {componentGroupList.map((group, index) => (
          <React.Fragment key={group.groupName}>
            <br />
            <h1 className="text-xl font-bold text-center text-gray-800 mb-3">
              {group.groupName}
            </h1>
            <p className="text-center">{group.description}</p>

            <div className="flex flex-wrap justify-center items-center gap-5 w-full mt-5">
              {group.components[activeTabs[group.groupName]]()}
            </div>

            <div className="p-3 bg-gray-200 rounded-bl-lg rounded-br-lg">
              <div className="flex overflow-x-auto gap-3 pb-2 scrollbar-thin scrollbar-thumb-gray-400 scrollbar-track-gray-200">
                {Object.keys(group.components).map((key) => (
                  <button
                    key={key}
                    onClick={() => handleTabChange(group.groupName, key)}
                    className={`px-4 py-2 rounded-lg whitespace-nowrap ${
                      activeTabs[group.groupName] === key
                        ? "bg-blue-500 text-white"
                        : "bg-white text-black"
                    }`}
                  >
                    {key}
                  </button>
                ))}
              </div>
            </div>
            {index < componentGroupList.length - 1 && <br />}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}

export default VolumetricCloud;
