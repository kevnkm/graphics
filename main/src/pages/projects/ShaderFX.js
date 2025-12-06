// main/src/pages/projects/ShaderFX.js

import React from "react";
import { useState } from "react";
import { Voronoi2D } from "../../components/Voronoi2D";
import { Fire2D } from "../../components/Fire2D";
import { Smoke2D } from "../../components/Smoke2D";
import { Mandelbrot1, Mandelbrot2 } from "../../components/Fractals2D";
import { WaterTexture } from "../../components/Water";

const componentGroupList = [
  {
    groupName: "2D Voronoi Diagram",
    description: (
      <>
        This interactive scene visualizes a 2D Voronoi diagram using a simple
        algorithm based on Euclidean distance. The diagram is created by
        partitioning the space into regions around a set of seed points. Each
        region corresponds to the points closest to a particular seed, forming
        the characteristic polygonal shapes.
      </>
    ),
    components: {
      A1: () => <Voronoi2D />,
    },
  },
  {
    groupName: "Fire",
    description: (
      <>
        Purely procedural 2-D fire and a lightweight smoke advection demo. Both
        run in a single fragment shader - no textures required.
      </>
    ),
    components: {
      B1: () => <Fire2D />,
    },
  },
  {
    groupName: "Smoke",
    description: (
      <>
        Purely procedural 2-D fire and a lightweight smoke advection demo. Both
        run in a single fragment shader - no textures required.
      </>
    ),
    components: {
      C2: () => <Smoke2D />,
    },
  },
  {
    groupName: "Fractals",
    description: (
      <>
        Interactive Mandelbrot and Julia sets. Drag the mouse to zoom / pan
        (Mandelbrot) or to change the complex constant *c* (Julia).
      </>
    ),
    components: {
      D1: () => <Mandelbrot1 />,
      D2: () => <Mandelbrot2 />,
    },
  },
  {
    groupName: "Water",
    description: (
      <>
        A stylised water surface using a summed sine-wave height field, fake
        refraction and Fresnel term. Move the mouse to tilt the view.
      </>
    ),
    components: {
      E1: () => <WaterTexture />,
    },
  },
  // {
  //   groupName: "Stylized Shaders",
  //   description: (
  //     <>
  //       Cel-shading (toon) and a pencil-sketch post-process. Both use the same
  //       simple sphere scene for demonstration.
  //     </>
  //   ),
  //   components: {
  //     F1: () => <ShaderFXCanvas.F1 />,
  //     F2: () => <ShaderFXCanvas.F2 />,
  //   },
  // },
];

function ShaderFX() {
  const [activeTabs, setActiveTabs] = useState({
    "2D Voronoi Diagram": "A1",
    Fire: "B1",
    Smoke: "C2",
    Fractals: "D1",
    Water: "E1",
    "Stylized Shaders": "F1",
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
          It's amazing how math can be used to create beautiful visuals. This
          project is a collection of some math-based visualizations that I have
          created. The goal is to explore the intersection of math and design,
          and to create visually appealing graphics that are also mathematically
          interesting.
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

export default ShaderFX;
