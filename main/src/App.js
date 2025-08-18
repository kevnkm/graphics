import "./App.css";
import { BrowserRouter, Routes, Route, Link } from "react-router-dom";
import Home from "./pages/Home";
import BarrelDistortion from "./pages/projects/BarrelDistortion";
import BoidsSimulation from "./pages/projects/BoidsSimulation";
import RayMarching from "./pages/projects/RayMarching";
import RayTracing from "./pages/projects/RayTracing";
import VolumetricCloud from "./pages/projects/VolumetricCloud";
import ShaderFX from "./pages/projects/ShaderFX";
import logo from "./images/memoji_laptop.png";

function App() {
  return (
    <BrowserRouter basename={process.env.PUBLIC_URL}>
      <div className="min-h-screen bg-white flex flex-col">
        {/* Persistent Navigation Bar */}
        <nav className="bg-white p-4 h-16">
          <div className="container mx-auto flex justify-between items-center h-full px-4">
            <Link to="/" className="flex items-center">
              <img
                src={logo}
                alt="Logo"
                className="h-6 w-auto"
                draggable="false"
              />
              <span className="text-xl font-bold font-dot-gothic-16 sm:inline ml-2">
                Kevin Kim &mdash; Graphics Hub
              </span>
            </Link>
          </div>
        </nav>

        {/* Page Content */}
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/barrel-distortion" element={<BarrelDistortion />} />
          <Route path="/boids-simulation" element={<BoidsSimulation />} />
          <Route path="/ray-marching" element={<RayMarching />} />
          <Route path="/ray-tracing" element={<RayTracing />} />
          <Route path="/volumetric-cloud" element={<VolumetricCloud />} />
          <Route path="/shader-fx" element={<ShaderFX />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;
