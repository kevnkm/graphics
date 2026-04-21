import { Link, useLocation, useNavigate } from "react-router-dom";
import logo from "../../assets/images/memoji_laptop.png";

function NavBar() {
  const location = useLocation();
  const navigate = useNavigate();
  const isHome = location.pathname === "/" || location.pathname === "";

  return (
    <nav
      className="nav-blur fixed top-0 left-0 right-0 z-50"
      style={{ height: "var(--nav-height)" }}
    >
      <div
        className="container mx-auto flex items-center justify-between h-full"
        style={{ padding: "0 1.5rem" }}
      >
        {/* Left — logo / back button */}
        <div className="flex items-center gap-3">
          {!isHome && (
            <button
              onClick={() => navigate(-1)}
              className="flex items-center gap-1.5 transition-all duration-200 group"
              style={{
                color: "var(--text-secondary)",
                fontSize: "0.875rem",
                fontFamily: "var(--font-mono)",
                background: "none",
                border: "none",
                cursor: "pointer",
                padding: "6px 10px",
                borderRadius: "var(--radius-sm)",
              }}
              onMouseEnter={e => {
                e.currentTarget.style.color = "var(--text-primary)";
                e.currentTarget.style.background = "var(--bg-elevated)";
              }}
              onMouseLeave={e => {
                e.currentTarget.style.color = "var(--text-secondary)";
                e.currentTarget.style.background = "none";
              }}
              aria-label="Go back"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M10 12L6 8l4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              back
            </button>
          )}
          <Link
            to="/"
            className="flex items-center gap-2"
            style={{ textDecoration: "none" }}
          >
            <img
              src={logo}
              alt="Kevin Kim memoji"
              style={{ height: "28px", width: "auto" }}
              draggable="false"
            />
            <span
              style={{
                fontFamily: "var(--font-mono)",
                fontWeight: 600,
                fontSize: "0.9rem",
                color: "var(--text-primary)",
                letterSpacing: "0.02em",
              }}
            >
              graphics<span style={{ color: "var(--accent-primary)" }}>.</span>hub
            </span>
          </Link>
        </div>

        {/* Right — author link */}
        <a
          href="https://kevinkmkim.github.io"
          target="_blank"
          rel="noopener noreferrer"
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: "0.8rem",
            color: "var(--text-muted)",
            transition: "color 0.2s ease",
          }}
          onMouseEnter={e => e.currentTarget.style.color = "var(--text-secondary)"}
          onMouseLeave={e => e.currentTarget.style.color = "var(--text-muted)"}
        >
          Kevin Kim ↗
        </a>
      </div>
    </nav>
  );
}

export default NavBar;
