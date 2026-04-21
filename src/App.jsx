import "./styles/App.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import NavBar from "./components/layout/NavBar";
import Home from "./pages/Home";
import BarrelDistortion from "./pages/projects/BarrelDistortion";
import BoidsSimulation from "./pages/projects/BoidsSimulation";
import RayMarching from "./pages/projects/RayMarching";
import RayTracing from "./pages/projects/RayTracing";
import VolumetricCloud from "./pages/projects/VolumetricCloud";
import ShaderFX from "./pages/projects/ShaderFX";

function App() {
  return (
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <div className="min-h-screen bg-white flex flex-col">
        <NavBar />

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
