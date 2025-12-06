// main/src/pages/projects/RayMarching.js

import React from "react";
import { useState } from "react";
import * as RayMarchingCanvas from "../../components/RayMarchingCanvas";

const componentGroupList = [
  {
    groupName: "2D Demonstration",
    description: (
      <>
        This interactive scene visualizes 2D ray marching with Signed Distance
        Functions (SDF). A ray originates from a green point at the center,
        stepping toward the target position. At each step, a circle outlines the
        distance to the nearest of three circular obstacles, with small yellow
        dots marking the steps and a red dot at the end.
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
        This scene showcases a 3D ray marching renderer that visualizes complex
        shapes like spheres, toruses, and cubes using Signed Distance Fields
        (SDF). A reference for various SDFs including the ones used in this
        project can be found at{" "}
        <a
          href="https://iquilezles.org/articles/distfunctions/"
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 hover:underline ml-1"
        >
          this page by Inigo Quilez
        </a>
        . Instead of traditional rendering methods, the algorithm marches rays
        step by step through space, dynamically adjusting their movement based
        on the closest object's distance. A key feature of this approach is
        smooth blending, allowing nearby shapes to merge seamlessly.
      </>
    ),
    components: {
      B1: () => <RayMarchingCanvas.B1 />,
    },
  },
];

function RayMarching() {
  const [activeTabs, setActiveTabs] = useState({
    "2D Demonstration": "A1",
    "3D Ray Marching": "B1",
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
          Ray marching is a rendering technique used in 3D computer graphics
          that offers an alternative to traditional polygon-based rendering.
          Instead of rasterizing geometry, ray marching traces rays through a
          scene and iteratively advances them until they hit an object or reach
          a maximum distance. This allows for the rendering of complex shapes
          and effects such as fractals, volumetric clouds, and soft shadows. Ray
          marching is commonly used in combination with signed distance
          functions (SDFs) to represent objects in the scene.
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

export default RayMarching;
