import React from "react";
import { useState } from "react";
import * as BarrelDistortionCanvas from "../../components/BarrelDistortionCanvas.js";

const componentGroupList = [
  {
    groupName: "2D Image Distortion",
    description: (
      <>
        This demo applies real-time barrel distortion to a 2D image. Barrel
        distortion makes straight lines curve outward, simulating the effect of
        a wide-angle or fisheye lens. Use the slider to control the distortion
        strength (k). Positive values create barrel distortion; negative values
        create pincushion distortion.
      </>
    ),
    components: {
      A1: () => <BarrelDistortionCanvas.A1 />,
    },
  },
  {
    groupName: "Shader-Based Distortion",
    description: (
      <>
        This example uses a GLSL fragment shader to apply barrel distortion in
        real time on a dynamic scene with moving elements. The distortion is
        computed per-pixel using the formula:
        <br />
        <code className="block bg-gray-100 p-2 rounded mt-2 text-sm">
          r' = r × (1 + k₁×r² + k₂×r⁴)
        </code>
        where <code>r</code> is the normalized distance from the center, and{" "}
        <code>k₁</code>, <code>k₂</code> are distortion coefficients. This is
        widely used in VR, camera calibration, and post-processing effects.
      </>
    ),
    components: {
      B1: () => <BarrelDistortionCanvas.B1 />,
      B2: () => <BarrelDistortionCanvas.B2 />,
    },
  },
  {
    groupName: "Correcting Lens Distortion",
    description: (
      <>
        Real cameras often suffer from barrel distortion. This demo shows how to{" "}
        <strong>correct</strong> a pre-distorted image back to rectilinear
        projection using inverse mapping. The algorithm samples from the
        distorted texture using undistortion equations.
      </>
    ),
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
    <div className="relative w-full min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 flex justify-center">
      <div className="container mx-auto p-4 w-full max-w-md sm:max-w-2xl lg:max-w-4xl pb-20">
        <header className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-3">
            Barrel Distortion Explorer
          </h1>
          <p className="text-gray-600 max-w-3xl mx-auto leading-relaxed">
            Barrel distortion is a lens aberration where magnification decreases
            with distance from the optical axis, causing straight lines to bow
            outward. It's common in wide-angle and fisheye lenses. This
            interactive demo lets you explore distortion and correction
            techniques in real time.
          </p>
        </header>

        {componentGroupList.map((group, index) => (
          <section
            key={group.groupName}
            className="bg-white rounded-xl shadow-md overflow-hidden mb-8"
          >
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-800 mb-2">
                {group.groupName}
              </h2>
              <p className="text-gray-600 text-sm leading-relaxed">
                {group.description}
              </p>
            </div>

            {/* Canvas / Visual Output */}
            <div className="p-6 bg-gray-50 flex justify-center items-center min-h-96">
              <div className="w-full max-w-xl">
                {group.components[activeTabs[group.groupName]]()}
              </div>
            </div>

            {/* Tab Controls */}
            {Object.keys(group.components).length > 1 && (
              <div className="p-3 bg-gray-100 border-t border-gray-200">
                <div className="flex overflow-x-auto gap-2 pb-1 scrollbar-thin scrollbar-thumb-gray-400 scrollbar-track-gray-100">
                  {Object.keys(group.components).map((key) => (
                    <button
                      key={key}
                      onClick={() => handleTabChange(group.groupName, key)}
                      className={`px-4 py-2 rounded-lg whitespace-nowrap text-sm font-medium transition-all ${
                        activeTabs[group.groupName] === key
                          ? "bg-blue-600 text-white shadow-sm"
                          : "bg-white text-gray-700 hover:bg-gray-50"
                      }`}
                    >
                      {key.replace(/[0-9]/g, "").trim() || key}{" "}
                      {/* Optional: clean label */}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </section>
        ))}

        <footer className="text-center text-sm text-gray-500 mt-12">
          <p>
            Learn more about lens distortion at{" "}
            <a
              href="https://en.wikipedia.org/wiki/Distortion_(optics)"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline"
            >
              Wikipedia
            </a>{" "}
            or explore shader examples on{" "}
            <a
              href="https://www.shadertoy.com/results?query=barrel"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline"
            >
              Shadertoy
            </a>
            .
          </p>
        </footer>
      </div>
    </div>
  );
}

export default BarrelDistortion;
