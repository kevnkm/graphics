import React from "react";
import { useState } from "react";
import * as RayTracingCanvas from "../../components/graphics/RayTracingCanvas";

const componentGroupList = [
  {
    groupName: "2D Demonstration",
    description:
      "In the 2D ray tracing example, we trace rays from the camera to each pixel on the screen and check for intersections with objects in the scene. If an intersection is found, we calculate the distance to the intersection point and color the pixel based on the distance. This creates a simple 2D rendering of the scene with shadows and reflections.",
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
        This scene implements a basic ray tracing renderer, leveraging the GPU
        for accelerated rendering. It follows the principles outlined in{" "}
        <a
          href="https://raytracing.github.io/"
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 hover:underline ml-1"
        >
          'Ray Tracing In One Weekend'
        </a>{" "}
        book by Peter Shirley, using GLSL and Three.js for GPU-based output.
      </>
    ),
    components: {
      C1: () => <RayTracingCanvas.C1 />,
    },
  },
];

function RayTracing() {
  const [activeTabs, setActiveTabs] = useState({
    "2D Demonstration": "A5",
    "3D Ray Tracing": "C1",
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
          Ray tracing is a sophisticated rendering technique in computer
          graphics that simulates the physical behavior of light by casting rays
          from the camera into the scene, determining what they hit, and then
          tracing secondary rays (like reflections or shadow rays) to light
          sources.
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

export default RayTracing;
