import { useState } from "react";

/**
 * Shared layout for all project pages.
 *
 * Props:
 *   title       – page title (string)
 *   intro       – introductory text / JSX
 *   groups      – array of { groupName, description, components: { key: ComponentFn } }
 *   defaultTabs – object mapping groupName → default key
 */
function ProjectPageLayout({ title, intro, groups, defaultTabs }) {
  const [activeTabs, setActiveTabs] = useState(defaultTabs);

  const handleTabChange = (groupName, tab) => {
    setActiveTabs((prev) => ({ ...prev, [groupName]: tab }));
  };

  return (
    <div
      className="grain"
      style={{
        minHeight: "100vh",
        paddingTop: "calc(var(--nav-height) + 2rem)",
        paddingBottom: "4rem",
        background: "var(--bg-base)",
      }}
    >
      <div
        style={{
          maxWidth: "760px",
          margin: "0 auto",
          padding: "0 1.5rem",
        }}
      >
        {/* ── Page header ─────────────────────────────────────────── */}
        <header
          className="animate-fade-up"
          style={{ marginBottom: "2.5rem", textAlign: "center" }}
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
              padding: "3px 10px",
              marginBottom: "1rem",
              letterSpacing: "0.08em",
              textTransform: "uppercase",
            }}
          >
            project
          </div>
          <h1
            style={{
              fontSize: "clamp(1.8rem, 4vw, 2.5rem)",
              fontWeight: 700,
              letterSpacing: "-0.03em",
              marginBottom: "1rem",
              lineHeight: 1.15,
            }}
          >
            {title}
          </h1>
          {intro && (
            <p
              style={{
                color: "var(--text-secondary)",
                fontSize: "1rem",
                lineHeight: 1.7,
                maxWidth: "620px",
                margin: "0 auto",
              }}
            >
              {intro}
            </p>
          )}
        </header>

        {/* ── Groups ──────────────────────────────────────────────── */}
        {groups.map((group, index) => {
          const ActiveComponent =
            group.components[activeTabs[group.groupName]] ||
            Object.values(group.components)[0];
          const tabKeys = Object.keys(group.components);
          const hasMultipleTabs = tabKeys.length > 1;

          return (
            <section
              key={group.groupName}
              className="animate-fade-up"
              style={{
                marginBottom: index < groups.length - 1 ? "3rem" : 0,
                animationDelay: `${index * 0.08}s`,
                opacity: 0,
                animationFillMode: "forwards",
              }}
            >
              {/* Group header */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.75rem",
                  marginBottom: "0.75rem",
                }}
              >
                <div
                  style={{
                    width: "3px",
                    height: "20px",
                    background:
                      "linear-gradient(180deg, var(--accent-primary), var(--accent-cyan))",
                    borderRadius: "2px",
                    flexShrink: 0,
                  }}
                />
                <h2
                  style={{
                    fontSize: "1.1rem",
                    fontWeight: 600,
                    color: "var(--text-primary)",
                    letterSpacing: "-0.01em",
                  }}
                >
                  {group.groupName}
                </h2>
              </div>

              {/* Group description */}
              {group.description && (
                <p
                  style={{
                    color: "var(--text-secondary)",
                    fontSize: "0.9rem",
                    lineHeight: 1.7,
                    marginBottom: "1.25rem",
                    paddingLeft: "1rem",
                    borderLeft: "1px solid var(--bg-border)",
                  }}
                >
                  {group.description}
                </p>
              )}

              {/* Canvas / demo area */}
              <div
                style={{
                  background: "var(--bg-surface)",
                  border: "1px solid var(--bg-border)",
                  borderRadius:
                    hasMultipleTabs
                      ? "var(--radius-lg) var(--radius-lg) 0 0"
                      : "var(--radius-lg)",
                  overflow: "hidden",
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                  padding: "1.25rem",
                }}
              >
                <ActiveComponent />
              </div>

              {/* Tabs */}
              {hasMultipleTabs && (
                <div
                  style={{
                    background: "var(--bg-elevated)",
                    border: "1px solid var(--bg-border)",
                    borderTop: "none",
                    borderRadius: "0 0 var(--radius-lg) var(--radius-lg)",
                    padding: "10px 12px",
                    display: "flex",
                    gap: "6px",
                    overflowX: "auto",
                    flexWrap: "nowrap",
                  }}
                >
                  {tabKeys.map((key) => {
                    const isActive = activeTabs[group.groupName] === key;
                    return (
                      <button
                        key={key}
                        onClick={() => handleTabChange(group.groupName, key)}
                        style={{
                          padding: "5px 14px",
                          borderRadius: "var(--radius-sm)",
                          fontFamily: "var(--font-mono)",
                          fontSize: "0.8rem",
                          fontWeight: isActive ? 600 : 400,
                          whiteSpace: "nowrap",
                          flexShrink: 0,
                          cursor: "pointer",
                          transition: "all 0.15s ease",
                          border: isActive
                            ? "1px solid rgba(124,107,255,0.4)"
                            : "1px solid transparent",
                          background: isActive
                            ? "var(--accent-dim)"
                            : "transparent",
                          color: isActive
                            ? "var(--accent-primary)"
                            : "var(--text-muted)",
                        }}
                        onMouseEnter={(e) => {
                          if (!isActive) {
                            e.currentTarget.style.color = "var(--text-secondary)";
                            e.currentTarget.style.background = "var(--bg-surface)";
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (!isActive) {
                            e.currentTarget.style.color = "var(--text-muted)";
                            e.currentTarget.style.background = "transparent";
                          }
                        }}
                      >
                        {key}
                      </button>
                    );
                  })}
                </div>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
}

export default ProjectPageLayout;
