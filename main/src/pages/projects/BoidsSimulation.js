// main/src/pages/projects/BoidsSimulation.js

import React, { useState } from "react";
import { A1, A2, A3, A4, A5, A6, A7, A8, A9 } from "../../components/Boids2D";

const componentGroupList = [
  {
    groupName: "2D Demonstration",
    description: <>This is a 2D demonstration of the Boids algorithm.</>,
    components: { A1, A2, A3, A4, A5, A6, A7, A8, A9 },
  },
];

function BoidsSimulation() {
  const [activeTabs, setActiveTabs] = useState({
    "2D Demonstration": "A1",
  });

  const handleTabChange = (groupName, tab) => {
    setActiveTabs((prev) => ({ ...prev, [groupName]: tab }));
  };

  return (
    <div className="relative w-full min-h-screen bg-white flex justify-center">
      <div className="container mx-auto p-4 w-full max-w-md sm:max-w-2xl lg:max-w-3xl pb-16">
        <h1 className="text-xl font-bold text-center text-gray-800 mb-3">
          Boids - Flocking Simulation
        </h1>
        <p className="text-center">
          Boids (short for bird-oid objects) is a behavioral animation system
          that makes a group of simple agents look like a coherent flock of
          birds, school of fish, or herd of animals. It was invented in 1986 by
          Craig Reynolds and presented at SIGGRAPH 1987 in the paper{" "}
          <a href="https://dl.acm.org/doi/10.1145/37402.37406">
            "Flocks, Herds, and Schools: A Distributed Behavioral Model".
          </a>
        </p>
        <p className="text-center">
          The sequence of this demonstration is inspired by
          <a href="https://www.youtube.com/watch?v=bqtqltqcQhw">
            Sabastian Lague's video on Boids
          </a>
        </p>

        {componentGroupList.map((group, idx) => {
          const ActiveComponent = group.components[activeTabs[group.groupName]];

          return (
            <React.Fragment key={group.groupName}>
              <br />
              <h1 className="text-xl font-bold text-center text-gray-800 mb-3">
                {group.groupName}
              </h1>
              <p className="text-center">{group.description}</p>

              <div className="flex flex-wrap justify-center items-center gap-5 w-full mt-5">
                <ActiveComponent />
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
              {idx < componentGroupList.length - 1 && <br />}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}

export default BoidsSimulation;
