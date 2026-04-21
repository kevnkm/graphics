import React from "react";
import { Link } from "react-router-dom";

const projects = [
  { name: "Ray Tracing", path: "/ray-tracing" },
  { name: "Ray Marching", path: "/ray-marching" },
  { name: "Barrel Distortion", path: "/barrel-distortion" },
  { name: "Boids Simulation", path: "/boids-simulation" },
  { name: "Volumetric Cloud", path: "/volumetric-cloud" },
  { name: "Shader FX", path: "/shader-fx" },
];

function Home() {
  return (
    <div className="flex flex-col items-center p-4 bg-gray-100 min-h-screen">
      <main className="text-center flex flex-col justify-center items-center flex-grow">
        <section className="flex flex-col items-center gap-4">
          {projects.map((project) => (
            <Link key={project.name} to={project.path}>
              <button className="px-4 py-2 bg-blue-500 text-white font-semibold rounded-lg shadow-md hover:bg-blue-600 transition">
                {project.name}
              </button>
            </Link>
          ))}
        </section>
      </main>
      <footer className="mt-8 text-gray-500 text-sm">
        <p className="text-lg mb-4 text-gray-800">
          A compilation of graphics programming projects by
          <a
            href="https://kevinkmkim.github.io"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:underline ml-1"
          >
            Kevin Kim
          </a>
        </p>
      </footer>
    </div>
  );
}

export default Home;
