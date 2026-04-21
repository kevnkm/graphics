import * as BarrelDistortionCanvas from "../../components/graphics/BarrelDistortionCanvas";
import ProjectPageLayout from "../../components/layout/ProjectPageLayout";

const groups = [
  {
    groupName: "Shader-Based Distortion",
    description: (
      <>
        Real-time barrel distortion in GLSL following the radial polynomial
        model:{" "}
        <code
          style={{
            fontFamily: "var(--font-mono)",
            background: "var(--bg-elevated)",
            color: "var(--accent-green)",
            padding: "1px 6px",
            borderRadius: "4px",
            fontSize: "0.85em",
          }}
        >
          r' = r × (1 + k₁·r² + k₂·r⁴)
        </code>
        . Used in VR headsets, camera post-processing, and creative lens effects.
      </>
    ),
    components: {
      A1: () => <BarrelDistortionCanvas.A1 />,
      A2: () => <BarrelDistortionCanvas.A2 />,
    },
  },
];

const defaultTabs = {
  "Shader-Based Distortion": "A1",
};

function BarrelDistortion() {
  return (
    <ProjectPageLayout
      title="Barrel Distortion"
      intro="A common lens imperfection where straight lines bow outward — particularly visible in wide-angle and fisheye lenses. Explore real-time distortion and correction effects built with WebGL and GLSL shaders."
      groups={groups}
      defaultTabs={defaultTabs}
    />
  );
}

export default BarrelDistortion;
