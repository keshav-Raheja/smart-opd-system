import { NavLink, useNavigate, useLocation } from "react-router-dom";
import { useContext } from "react";
import { ROLE_ACCESS } from "../config/roles";
import { AuthContext } from "../context/AuthContext";

const NAV_ITEMS = [
  {
    section: "Main",
    items: [
      {
        key: "dashboard",
        to: "/",
        label: "Dashboard",
        icon: (
          <svg className="nav-link-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" />
            <rect x="14" y="14" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" />
          </svg>
        ),
      },
      {
        key: "doctorPanel",
        to: "/doctor-panel",
        label: "Doctor Panel",
        icon: (
          <svg className="nav-link-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
        ),
      },
      {
        key: "treatmentDashboard",
        to: "/treatments",
        label: "Treatment Tracker",
        icon: (
          <svg className="nav-link-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
        ),
      },
      {
        key: "dentistWorkspace",
        to: "/dentist-workspace",
        label: "Dentist Workspace",
        icon: (
          <svg className="nav-link-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
          </svg>
        ),
      },
    ],
  },
  {
    section: "Patients",
    items: [
      {
        key: "patients",
        to: "/patients",
        label: "Patients",
        icon: (
          <svg className="nav-link-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        ),
      },
      {
        key: "appointments",
        to: "/appointments",
        label: "Appointments",
        icon: (
          <svg className="nav-link-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        ),
      },
    ],
  },
  {
    section: "AI & Reports",
    items: [
      {
        key: "aiSupport",
        to: "/ai-support",
        label: "AI Report Analysis",
        icon: (
          <svg className="nav-link-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17H3a2 2 0 01-2-2V5a2 2 0 012-2h14a2 2 0 012 2v2M9 11l2 2 4-4" />
          </svg>
        ),
        badge: "AI",
        badgeClass: "ai-badge",
      },
    ],
  },
  {
    section: "Administration",
    items: [
      {
        key: "opdManagement",
        to: "/opd-management",
        label: "OPD Management",
        badge: "Admin",
        icon: (
          <svg className="nav-link-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
          </svg>
        ),
      },
      {
        key: "staffManagement",
        to: "/staff-management",
        label: "Staff Management",
        badge: "Doctor",
        icon: (
          <svg className="nav-link-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        ),
      },
    ],
  },
  {
    section: "Finance",
    items: [
      {
        key: "billing",
        to: "/billing",
        label: "Billing & Payments",
        icon: (
          <svg className="nav-link-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
          </svg>
        ),
      },
      {
        key: "myFeeConfig",
        to: "/my-fees",
        label: "My Fee Catalogue",
        icon: (
          <svg className="nav-link-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
        ),
      },
      {
        key: "feeConfig",
        to: "/fee-config",
        label: "Fee Configuration",
        icon: (
          <svg className="nav-link-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        ),
        badge: "Admin",
      },
    ],
  },
];

function Sidebar({ isOpen = false, onClose }) {
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const { logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const location = useLocation();

  const canAccess = (section) => {
    if (user?.role === "Doctor") {
      // If clinic is not set up yet, allow access to setup page
      if (!user.opd_id) return ROLE_ACCESS[section]?.includes(user?.role);
      
      // If it is set up but they are not the head doctor, limit access
      if (user.is_head === false) {
        return ["dashboard", "doctorPanel", "treatmentDashboard", "dentistWorkspace"].includes(section);
      }
    }
    return ROLE_ACCESS[section]?.includes(user?.role);
  };

  const handleLogout = () => {
    logout();
    localStorage.removeItem("user");
    localStorage.removeItem("role");
    navigate("/login");
  };

  const handleNavClick = () => {
    // Close sidebar on mobile when a link is clicked
    if (onClose) onClose();
  };

  const initials = user?.name
    ? user.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()
    : "?";

  const roleClass = {
    Admin: "admin",
    Doctor: "doctor",
    Receptionist: "receptionist",
    "Lab Staff": "lab",
  }[user?.role] || "doctor";

  return (
    <div className={`sidebar${isOpen ? " sidebar-open" : ""}`}>
      {/* Logo + Mobile close button */}
      <div className="sidebar-logo" style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <div className="sidebar-logo-title">
            <span style={{ fontSize: 24 }}>🏥</span>
            Smart OPD
          </div>
          <div className="sidebar-logo-subtitle">Clinic Management System</div>
        </div>
        {/* Close button — mobile only */}
        <button
          onClick={onClose}
          aria-label="Close navigation"
          style={{
            display: "flex", alignItems: "center", justifyContent: "center",
            width: 32, height: 32, borderRadius: 8, border: "none",
            background: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.7)",
            cursor: "pointer", flexShrink: 0, fontSize: 18,
          }}
        >
          ✕
        </button>
      </div>

      {/* Navigation */}
      <nav className="sidebar-nav">
        {NAV_ITEMS.map((section) => {
          const visibleItems = section.items.filter((item) =>
            canAccess(item.key)
          );
          if (visibleItems.length === 0) return null;

          return (
            <div key={section.section}>
              <div className="sidebar-section-label">{section.section}</div>
              {visibleItems.map((item) => (
                <NavLink
                  key={item.key}
                  to={item.to}
                  end={item.to === "/"}
                  onClick={handleNavClick}
                  className={({ isActive }) =>
                    `nav-link${isActive ? " active" : ""}`
                  }
                >
                  {item.icon}
                  {item.label}
                  {item.badge && (
                    <span className={`nav-badge ${item.badgeClass || ""}`}>
                      {item.badge}
                    </span>
                  )}
                </NavLink>
              ))}
            </div>
          );
        })}
      </nav>

      {/* User Footer */}
      <div className="sidebar-footer">
        <div className="sidebar-user">
          <div className="sidebar-user-avatar">{initials}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="sidebar-user-name">{user?.name || "User"}</div>
            <div className="sidebar-user-role">{user?.role || "Staff"}</div>
          </div>
          <button
            onClick={handleLogout}
            title="Logout"
            style={{
              background: "none", border: "none", cursor: "pointer",
              color: "rgba(255,255,255,0.4)", fontSize: 18, padding: "4px",
              borderRadius: "6px", transition: "all 0.2s", flexShrink: 0,
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "#ef4444")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(255,255,255,0.4)")}
          >
            ⏻
          </button>
        </div>
      </div>
    </div>
  );
}

export default Sidebar;