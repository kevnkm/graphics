import React from "react";
import { useState } from "react";
import * as BarrelDistortionCanvas from "../../components/BarrelDistortionCanvas";

const componentGroupList = [
  {
    groupName: "2D Image Distortion",
    description:
      "Apply real-time barrel or pincushion distortion to a 2D image. Positive distortion values create a fisheye-like barrel effect; negative values produce pincushion distortion. Control the strength with an interactive slider.",
    components: {
      A1: () => <BarrelDistortionCanvas.A1 />,
    },
  },
  {
    groupName: "Shader-Based Distortion",
    description: (
      <>
        Real-time barrel distortion implemented in GLSL fragment shaders. The
        distortion follows the radial polynomial model:
        <br />
        <code className="block bg-gray-800 text-green-400 text-xs p-2 rounded mt-2 font-mono">
          r' = r × (1 + k₁·r² + k₂·r⁴)
        </code>
        Commonly used in VR headsets, camera post-processing, and creative
        effects.
      </>
    ),
    components: {
      B1: () => <BarrelDistortionCanvas.B1 />,
      B2: () => <BarrelDistortionCanvas.B2 />,
    },
  },
  {
    groupName: "Correcting Lens Distortion",
    description:
      "Demonstrates how to correct barrel-distorted images (e.g., from wide-angle lenses) back to rectilinear projection using inverse mapping. Essential technique in computer vision and photography.",
    components: {
      C1: () => <BarrelDistortionCanvas.C1 />,
    },
  },
];

function BarrelDistortion() {
  const [activeTabs, setActiveTabs] = useState({
    "2D Image Distortion": "A1",
    "Shader-Based Distortion": "B1",
    "Correcting Lens Distortion": "C1",
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
          Barrel distortion is a common lens imperfection where straight lines
          appear to bow outward, especially in wide-angle and fisheye lenses.
          Explore real-time distortion effects and correction techniques using
          WebGL and GLSL shaders.
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

export default BarrelDistortion;
