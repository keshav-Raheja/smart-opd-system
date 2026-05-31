import { useContext, useState, useCallback } from "react";
import { useNavigate }  from "react-router-dom";
import Sidebar          from "../components/Sidebar";
import { AuthContext }  from "../context/AuthContext";

/**
 * MainLayout
 * ──────────
 * Responsive shell:
 *   • Mobile  (<1024px) — sidebar slides in as overlay; hamburger in topbar
 *   • Desktop (≥1024px) — sidebar is always visible; no hamburger
 */
function MainLayout({ children }) {
  const user           = JSON.parse(localStorage.getItem("user") || "{}");
  const { logout }     = useContext(AuthContext);
  const navigate       = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const openSidebar  = useCallback(() => setSidebarOpen(true),  []);
  const closeSidebar = useCallback(() => setSidebarOpen(false), []);

  const handleLogout = () => {
    logout();
    localStorage.removeItem("user");
    localStorage.removeItem("role");
    navigate("/login");
  };

  const roleClass = {
    Admin:          "admin",
    Doctor:         "doctor",
    Receptionist:   "receptionist",
    "Lab Staff":    "lab",
  }[user?.role] || "doctor";

  const initials = user?.name
    ? user.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()
    : "?";

  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>

      {/* ── Mobile overlay backdrop ─────────────────── */}
      <div
        className={`sidebar-overlay${sidebarOpen ? " visible" : ""}`}
        onClick={closeSidebar}
        aria-hidden="true"
      />

      {/* ── Sidebar ─────────────────────────────────── */}
      <Sidebar isOpen={sidebarOpen} onClose={closeSidebar} />

      {/* ── Main area ───────────────────────────────── */}
      <div className="main-layout">

        {/* Top Bar */}
        <header className="topbar">

          {/* Hamburger — mobile only */}
          <button
            id="sidebar-toggle"
            className="hamburger-btn"
            onClick={openSidebar}
            aria-label="Open navigation"
          >
            <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>

          {/* Brand */}
          <div className="topbar-title">🏥 Smart OPD</div>

          {/* Right side */}
          <div className="topbar-right">

            {/* Role badge — hidden on xs */}
            <span className={`role-badge ${roleClass}`}>
              {user?.role || "Staff"}
            </span>

            {/* User chip */}
            <div className="user-chip">
              <div style={{
                width: 28, height: 28, borderRadius: "50%",
                background: "linear-gradient(135deg, #3b82f6, #8b5cf6)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 11, fontWeight: 700, color: "white", flexShrink: 0,
              }}>
                {initials}
              </div>
              <span className="user-chip-name">{user?.name || "User"}</span>
            </div>

            {/* Logout */}
            <button className="logout-btn" onClick={handleLogout} id="logout-btn">
              <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              <span className="logout-btn-text">Logout</span>
            </button>

          </div>
        </header>

        {/* Page Content */}
        <main className="page-content animate-fade-in">
          {children}
        </main>

      </div>
    </div>
  );
}

export default MainLayout;