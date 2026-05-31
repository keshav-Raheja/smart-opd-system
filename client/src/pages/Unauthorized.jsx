import React from "react";
import { useNavigate } from "react-router-dom";

const Unauthorized = () => {
  const navigate = useNavigate();

  const token = localStorage.getItem("token");
  const user = JSON.parse(localStorage.getItem("user") || "null");

  const handleGoBack = () => {
    // If logged in → go to dashboard; if not logged in → go to login
    if (token && user) {
      navigate("/dashboard", { replace: true });
    } else {
      navigate("/login", { replace: true });
    }
  };

  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: "linear-gradient(135deg, #0a0f1e 0%, #0d1b3e 50%, #0a1628 100%)",
      fontFamily: "'Inter', 'Outfit', sans-serif",
    }}>
      <div style={{
        background: "rgba(255,255,255,0.04)",
        border: "1px solid rgba(255,255,255,0.1)",
        borderRadius: "24px",
        padding: "56px 48px",
        textAlign: "center",
        backdropFilter: "blur(20px)",
        boxShadow: "0 24px 64px rgba(0,0,0,0.4)",
        maxWidth: "440px",
        width: "90%",
      }}>
        {/* Icon */}
        <div style={{
          width: "80px",
          height: "80px",
          borderRadius: "50%",
          background: "rgba(239,68,68,0.15)",
          border: "2px solid rgba(239,68,68,0.3)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          margin: "0 auto 24px",
          fontSize: "36px",
        }}>
          🔒
        </div>

        {/* 403 */}
        <h1 style={{
          fontSize: "72px",
          fontWeight: "800",
          color: "#ef4444",
          margin: "0 0 8px",
          lineHeight: 1,
          letterSpacing: "-2px",
        }}>
          403
        </h1>

        <h2 style={{
          fontSize: "20px",
          fontWeight: "600",
          color: "#f1f5f9",
          margin: "0 0 12px",
        }}>
          Unauthorized Access
        </h2>

        <p style={{
          fontSize: "14px",
          color: "rgba(255,255,255,0.5)",
          margin: "0 0 32px",
          lineHeight: 1.6,
        }}>
          You don't have permission to view this page.
          {token && user
            ? ` This section requires a different role than "${user.role}".`
            : " Please sign in to continue."}
        </p>

        <div style={{ display: "flex", gap: "12px", justifyContent: "center", flexWrap: "wrap" }}>
          <button
            onClick={handleGoBack}
            style={{
              padding: "12px 28px",
              borderRadius: "10px",
              border: "none",
              background: "linear-gradient(135deg, #3b82f6, #1d4ed8)",
              color: "#fff",
              fontSize: "15px",
              fontWeight: "600",
              cursor: "pointer",
              transition: "all 0.2s ease",
              boxShadow: "0 4px 16px rgba(59,130,246,0.4)",
            }}
            onMouseEnter={e => e.target.style.transform = "translateY(-1px)"}
            onMouseLeave={e => e.target.style.transform = "translateY(0)"}
          >
            {token && user ? "🏠 Go to Dashboard" : "🔑 Sign In"}
          </button>

          {token && user && (
            <button
              onClick={() => navigate(-1)}
              style={{
                padding: "12px 28px",
                borderRadius: "10px",
                border: "1px solid rgba(255,255,255,0.15)",
                background: "rgba(255,255,255,0.06)",
                color: "rgba(255,255,255,0.7)",
                fontSize: "15px",
                fontWeight: "500",
                cursor: "pointer",
                transition: "all 0.2s ease",
              }}
              onMouseEnter={e => e.target.style.background = "rgba(255,255,255,0.12)"}
              onMouseLeave={e => e.target.style.background = "rgba(255,255,255,0.06)"}
            >
              ← Go Back
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default Unauthorized;