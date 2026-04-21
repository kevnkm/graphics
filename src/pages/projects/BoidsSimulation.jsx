import { A1, A2, A3, A4, A5, A6, A7, A8, A9 } from "../../components/graphics/Boids2D";
import ProjectPageLayout from "../../components/layout/ProjectPageLayout";

const groups = [
  {
    groupName: "2D Demonstration",
    description: (
      <>
        Sequence inspired by{" "}
        <a
          href="https://www.youtube.com/watch?v=bqtqltqcQhw"
          target="_blank"
          rel="noopener noreferrer"
        >
          Sebastian Lague's Boids video
        </a>
        . Each step incrementally introduces cohesion, alignment, and separation
        forces to build the full emergent flocking behavior.
      </>
    ),
    components: { A1, A2, A3, A4, A5, A6, A7, A8, A9 },
  },
];

const defaultTabs = {
  "2D Demonstration": "A1",
};

function BoidsSimulation() {
  return (
    <ProjectPageLayout
      title="Boids Simulation"
      intro="Craig Reynolds' 1986 emergent flocking algorithm — bird-oid objects governed by just three local rules (cohesion, alignment, separation) producing lifelike group behavior. Presented at SIGGRAPH 1987."
      groups={groups}
      defaultTabs={defaultTabs}
    />
  );
}

export default BoidsSimulation;
