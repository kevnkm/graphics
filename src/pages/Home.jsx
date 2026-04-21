import { Link } from "react-router-dom";

const projects = [
  {
    name: "Ray Tracing",
    path: "/ray-tracing",
    tag: "WebGL · GLSL",
    description:
      "GPU-accelerated ray tracer featuring reflections, shadows, and materials. Built with Three.js following 'Ray Tracing In One Weekend'.",
    accent: "#7c6bff",
    icon: "◈",
  },
  {
    name: "Ray Marching",
    path: "/ray-marching",
    tag: "SDF · GLSL",
    description:
      "3D signed distance field renderer with smooth blending, soft shadows, and ambient occlusion. Interactive 2D step-by-step demo included.",
    accent: "#00e5a0",
    icon: "◎",
  },
  {
    name: "Shader FX",
    path: "/shader-fx",
    tag: "Shaders · Math",
    description:
      "Math-based visual playground — Voronoi diagrams, Mandelbrot & Julia sets, procedural fire & smoke, and stylized water.",
    accent: "#00d4e5",
    icon: "◬",
  },
  {
    name: "Volumetric Cloud",
    path: "/volumetric-cloud",
    tag: "Ray Marching · Noise",
    description:
      "Real-time volumetric cloud renderer using 3D Worley + Perlin noise, Mie scattering, and self-shadowing inside a bounding sphere.",
    accent: "#ff8a4c",
    icon: "◯",
  },
  {
    name: "Boids Simulation",
    path: "/boids-simulation",
    tag: "Simulation · AI",
    description:
      "Craig Reynolds' 1986 emergent flocking algorithm — cohesion, alignment, and separation rules producing lifelike group behavior.",
    accent: "#f0a0ff",
    icon: "◇",
  },
  {
    name: "Barrel Distortion",
    path: "/barrel-distortion",
    tag: "Lens · Post-FX",
    description:
      "Real-time barrel and pincushion distortion via GLSL radial polynomial model — classic VR optics and camera correction techniques.",
    accent: "#ffdf6c",
    icon: "◉",
  },
];

function Home() {
  return (
    <div
      className="grain"
      style={{
        minHeight: "100vh",
        paddingTop: "calc(var(--nav-height) + 0px)",
        background: "var(--bg-base)",
      }}
    >
      {/* ── Hero ──────────────────────────────────────────────────── */}
      <section
        style={{
          textAlign: "center",
          padding: "5rem 1.5rem 3.5rem",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Background glow blobs */}
        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            top: "20%",
            left: "50%",
            transform: "translateX(-50%)",
            width: "600px",
            height: "300px",
            background:
              "radial-gradient(ellipse at center, rgba(124,107,255,0.12) 0%, transparent 70%)",
            pointerEvents: "none",
            zIndex: 0,
          }}
        />

        <div
          className="animate-fade-up"
          style={{ position: "relative", zIndex: 1 }}
        >
          <div
            style={{
              display: "inline-block",
              fontFamily: "var(--font-mono)",
              fontSize: "0.75rem",
              color: "var(--accent-primary)",
              background: "var(--accent-dim)",
              border: "1px solid rgba(124,107,255,0.25)",
              borderRadius: "var(--radius-sm)",
              padding: "4px 12px",
              marginBottom: "1.5rem",
              letterSpacing: "0.1em",
              textTransform: "uppercase",
            }}
          >
            graphics programming
          </div>

          <h1
            style={{
              fontSize: "clamp(2.5rem, 7vw, 4.5rem)",
              fontWeight: 700,
              letterSpacing: "-0.04em",
              lineHeight: 1.05,
              marginBottom: "1.25rem",
            }}
          >
            <span className="text-gradient">Graphics</span> Hub
          </h1>

          <p
            style={{
              color: "var(--text-secondary)",
              fontSize: "clamp(1rem, 2vw, 1.15rem)",
              lineHeight: 1.7,
              maxWidth: "520px",
              margin: "0 auto 2rem",
            }}
          >
            A collection of interactive graphics programming experiments —
            ray tracing, shaders, simulations, and more.
          </p>

          <p
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "0.8rem",
              color: "var(--text-muted)",
            }}
          >
            by{" "}
            <a
              href="https://kevnkm.github.io"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: "var(--text-secondary)" }}
            >
              Kevin Kim
            </a>
          </p>
        </div>
      </section>

      {/* ── Project Grid ──────────────────────────────────────────── */}
      <section
        style={{
          maxWidth: "1000px",
          margin: "0 auto",
          padding: "0 1.5rem 5rem",
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(290px, 1fr))",
          gap: "1rem",
        }}
      >
        {projects.map((project, i) => (
          <ProjectCard key={project.path} project={project} index={i} />
        ))}
      </section>
    </div>
  );
}

function ProjectCard({ project, index }) {
  return (
    <Link
      to={project.path}
      style={{ textDecoration: "none", display: "block" }}
    >
      <article
        className="animate-fade-up"
        style={{
          animationDelay: `${index * 0.07}s`,
          opacity: 0,
          animationFillMode: "forwards",
          background: "var(--bg-surface)",
          border: "1px solid var(--bg-border)",
          borderRadius: "var(--radius-lg)",
          padding: "1.5rem",
          height: "100%",
          transition: "transform 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease",
          cursor: "pointer",
          position: "relative",
          overflow: "hidden",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = "translateY(-3px)";
          e.currentTarget.style.borderColor = `${project.accent}55`;
          e.currentTarget.style.boxShadow = `0 8px 32px ${project.accent}18`;
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = "translateY(0)";
          e.currentTarget.style.borderColor = "var(--bg-border)";
          e.currentTarget.style.boxShadow = "none";
        }}
      >
        {/* Subtle top accent line */}
        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            top: 0,
            left: "1.5rem",
            right: "1.5rem",
            height: "1px",
            background: `linear-gradient(90deg, transparent, ${project.accent}66, transparent)`,
          }}
        />

        {/* Icon */}
        <div
          style={{
            fontSize: "1.6rem",
            color: project.accent,
            marginBottom: "1rem",
            lineHeight: 1,
          }}
        >
          {project.icon}
        </div>

        {/* Tag */}
        <div
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: "0.7rem",
            color: "var(--text-muted)",
            letterSpacing: "0.06em",
            textTransform: "uppercase",
            marginBottom: "0.5rem",
          }}
        >
          {project.tag}
        </div>

        {/* Title */}
        <h2
          style={{
            fontSize: "1.2rem",
            fontWeight: 600,
            letterSpacing: "-0.02em",
            color: "var(--text-primary)",
            marginBottom: "0.65rem",
          }}
        >
          {project.name}
        </h2>

        {/* Description */}
        <p
          style={{
            fontSize: "0.875rem",
            color: "var(--text-secondary)",
            lineHeight: 1.65,
          }}
        >
          {project.description}
        </p>

        {/* Arrow */}
        <div
          style={{
            marginTop: "1.25rem",
            display: "flex",
            alignItems: "center",
            gap: "0.375rem",
            fontFamily: "var(--font-mono)",
            fontSize: "0.78rem",
            color: project.accent,
            opacity: 0.7,
          }}
        >
          view project
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path
              d="M3 7h8M8 4l3 3-3 3"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
      </article>
    </Link>
  );
}

export default Home;
