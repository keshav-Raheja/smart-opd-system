import { Link } from "react-router-dom";
import { useState, useEffect } from "react";

export default function Landing() {
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const stats = [
    { value: "500+", label: "Clinics Enrolled" },
    { value: "10,000+", label: "Patients Managed" },
    { value: "99.99%", label: "Cloud Uptime" },
  ];

  const features = [
    {
      icon: "🤖",
      title: "Clinical AI Assistant",
      desc: "Upload lab tests and medical scans for secure, instant diagnostic summaries powered by intelligent AI models.",
    },
    {
      icon: "📋",
      title: "Smart Queue Management",
      desc: "Real-time tracking of patient flows and check-in statuses to optimize consultation speeds and reduce wait times.",
    },
    {
      icon: "💊",
      title: "℞ Digital Prescriptions",
      desc: "Interactive dental FDI charts, pre-filled practitioner records, and print-ready PDF prescription templates.",
    },
    {
      icon: "💳",
      title: "Automated Billing & Stats",
      desc: "Fast receipt generation, customizable catalogues, and granular revenue analytics to track clinic performance.",
    },
  ];

  const trustBadges = [
    { icon: "🛡️", title: "HIPAA Compliant", desc: "Patient data confidentiality is guaranteed with medical privacy safeguards." },
    { icon: "🔒", title: "AES-256 Encryption", desc: "All clinic data and reports are securely encrypted at rest and in transit." },
    { icon: "⚡", title: "Cloud Scale", desc: "Zero-latency database clusters ensure instant clinical access from any browser." },
  ];

  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(135deg, #070b19 0%, #0d1e3d 60%, #0f172a 100%)",
      color: "#f1f5f9",
      fontFamily: "'Inter', 'Outfit', sans-serif",
      overflowX: "hidden",
      position: "relative",
    }}>
      {/* Ambient backgrounds */}
      <div style={{
        position: "absolute", width: 600, height: 600, borderRadius: "50%",
        background: "rgba(59,130,246,0.12)", top: "-200px", right: "-100px",
        filter: "blur(100px)", pointerEvents: "none",
      }} />
      <div style={{
        position: "absolute", width: 500, height: 500, borderRadius: "50%",
        background: "rgba(139,92,246,0.08)", bottom: "-150px", left: "-150px",
        filter: "blur(80px)", pointerEvents: "none",
      }} />

      {/* ── Navigation Header ────────────────────────────────────────── */}
      <header style={{
        maxWidth: 1100, margin: "0 auto", padding: "20px 24px",
        display: "flex", justifyContent: "space-between", alignItems: "center",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
        position: "relative", zIndex: 10,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 28 }}>🏥</span>
          <span style={{ fontFamily: "'Outfit', sans-serif", fontSize: 20, fontWeight: 800, color: "white" }}>
            Smart OPD
          </span>
        </div>
        <div style={{ display: "flex", gap: 12 }}>
          <Link to="/login" className="btn-secondary" style={{
            padding: "8px 16px", borderRadius: 10, fontSize: 13.5, fontWeight: 600,
            textDecoration: "none", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)",
            color: "white", transition: "all 0.2s"
          }}
          onMouseEnter={e => e.target.style.background = "rgba(255,255,255,0.1)"}
          onMouseLeave={e => e.target.style.background = "rgba(255,255,255,0.06)"}
          >
            Access Portal
          </Link>
          <Link to="/register" className="btn-primary" style={{
            padding: "8px 16px", borderRadius: 10, fontSize: 13.5, fontWeight: 700,
            textDecoration: "none", background: "linear-gradient(135deg, #3b82f6, #1d4ed8)",
            color: "white", boxShadow: "0 4px 14px rgba(59,130,246,0.3)",
          }}>
            Get Started
          </Link>
        </div>
      </header>

      {/* ── Hero Section ─────────────────────────────────────────────── */}
      <section style={{
        maxWidth: 800, margin: "0 auto", textAlign: "center",
        padding: isMobile ? "60px 20px 40px" : "100px 24px 60px",
        position: "relative", zIndex: 5,
      }}>
        <div style={{
          display: "inline-block", background: "rgba(59,130,246,0.15)",
          color: "#60a5fa", border: "1px solid rgba(59,130,246,0.25)",
          borderRadius: 20, padding: "5px 14px", fontSize: 12, fontWeight: 700,
          textTransform: "uppercase", letterSpacing: "1px", marginBottom: 20
        }}>
          ✨ Next-Gen Clinical Workspace
        </div>
        <h1 style={{
          fontFamily: "'Outfit', sans-serif",
          fontSize: isMobile ? 32 : 52,
          fontWeight: 800,
          color: "white",
          lineHeight: 1.15,
          letterSpacing: "-1.5px",
          marginBottom: 20,
        }}>
          Intelligent Outpatient Clinic Management
        </h1>
        <p style={{
          fontSize: isMobile ? 14 : 17,
          color: "rgba(255,255,255,0.7)",
          lineHeight: 1.6,
          maxWidth: 620,
          margin: "0 auto 36px",
        }}>
          Streamline patient queues, build digital prescriptions, generate bills, and securely analyze medical reports with the power of clinical AI assistant.
        </p>
        <div style={{ display: "flex", gap: 16, justifyContent: "center", flexWrap: "wrap" }}>
          <Link to="/login" style={{
            padding: "14px 28px", borderRadius: 12, fontSize: 15, fontWeight: 700,
            textDecoration: "none", background: "linear-gradient(135deg, #3b82f6, #1d4ed8)",
            color: "white", boxShadow: "0 6px 20px rgba(59,130,246,0.4)",
            display: "inline-block"
          }}>
            Log In to Portal
          </Link>
          <Link to="/register" style={{
            padding: "14px 28px", borderRadius: 12, fontSize: 15, fontWeight: 700,
            textDecoration: "none", background: "transparent", border: "1px solid rgba(255,255,255,0.2)",
            color: "white", display: "inline-block"
          }}
          onMouseEnter={e => e.target.style.background = "rgba(255,255,255,0.05)"}
          onMouseLeave={e => e.target.style.background = "transparent"}
          >
            Create Doctor Account
          </Link>
        </div>
      </section>

      {/* ── Stats Section ─────────────────────────────────────────────── */}
      <section style={{ maxWidth: 900, margin: "0 auto 80px", padding: "0 24px" }}>
        <div style={{
          display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(3, 1fr)",
          gap: 16, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)",
          borderRadius: 20, padding: "28px 20px", textAlign: "center", backdropFilter: "blur(12px)",
        }}>
          {stats.map((s, i) => (
            <div key={i} style={{ borderRight: !isMobile && i < 2 ? "1px solid rgba(255,255,255,0.08)" : "none" }}>
              <div style={{ fontSize: 32, fontWeight: 800, color: "#60a5fa", marginBottom: 4 }}>
                {s.value}
              </div>
              <div style={{ fontSize: 12, color: "rgba(255,255,255,0.45)", textTransform: "uppercase", fontWeight: 700, letterSpacing: "1px" }}>
                {s.label}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Features Section ──────────────────────────────────────────── */}
      <section style={{ maxWidth: 1100, margin: "0 auto 80px", padding: "0 24px" }}>
        <div style={{ textAlign: "center", marginBottom: 44 }}>
          <h2 style={{ fontFamily: "'Outfit', sans-serif", fontSize: 28, fontWeight: 800, color: "white", marginBottom: 12 }}>
            Optimized Clinic Operations
          </h2>
          <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 14.5 }}>
            Unlock advanced tools to increase clinic efficiency and elevate practitioner workflows.
          </p>
        </div>
        <div style={{
          display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(2, 1fr)",
          gap: 20
        }}>
          {features.map((f, i) => (
            <div key={i} style={{
              background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)",
              borderRadius: 18, padding: 24, display: "flex", gap: 16, alignItems: "flex-start",
              backdropFilter: "blur(10px)",
            }}>
              <span style={{ fontSize: 32, background: "rgba(255,255,255,0.04)", borderRadius: 12, padding: 10 }}>
                {f.icon}
              </span>
              <div>
                <h3 style={{ fontSize: 16, fontWeight: 700, color: "white", marginBottom: 6 }}>{f.title}</h3>
                <p style={{ fontSize: 13, color: "rgba(255,255,255,0.55)", lineHeight: 1.55 }}>{f.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Trust & Security Section ─────────────────────────────────── */}
      <section style={{
        maxWidth: 1100, margin: "0 auto 100px", padding: "0 24px",
        borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: 80,
      }}>
        <div style={{ textAlign: "center", marginBottom: 48 }}>
          <h2 style={{ fontFamily: "'Outfit', sans-serif", fontSize: 28, fontWeight: 800, color: "white", marginBottom: 12 }}>
            🔒 HIPAA-Compliant Data Security
          </h2>
          <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 14.5, maxWidth: 500, margin: "0 auto" }}>
            Patient privacy is our top priority. We use industry-standard clinical safeguards to ensure absolute data security.
          </p>
        </div>
        <div style={{
          display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(3, 1fr)",
          gap: 16
        }}>
          {trustBadges.map((b, i) => (
            <div key={i} style={{
              background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)",
              borderRadius: 16, padding: 20, textAlign: "center", backdropFilter: "blur(10px)",
            }}>
              <div style={{ fontSize: 28, marginBottom: 10 }}>{b.icon}</div>
              <h4 style={{ fontSize: 14, fontWeight: 700, color: "white", marginBottom: 6 }}>{b.title}</h4>
              <p style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", lineHeight: 1.5 }}>{b.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────────────── */}
      <footer style={{
        background: "#050812", padding: "40px 24px", textAlign: "center",
        borderTop: "1px solid rgba(255,255,255,0.05)",
      }}>
        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 8, marginBottom: 12 }}>
          <span>🏥</span>
          <span style={{ fontSize: 14, fontWeight: 700, color: "white" }}>Smart OPD Clinic Suite</span>
        </div>
        <p style={{ fontSize: 12, color: "rgba(255,255,255,0.35)", margin: 0 }}>
          © {new Date().getFullYear()} Smart OPD. All rights reserved. Secure and HIPAA-compliant patient management.
        </p>
      </footer>
    </div>
  );
}
