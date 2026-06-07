import { Link, useNavigate } from "react-router-dom";
import { useState, useContext, useEffect } from "react";
import api from "../services/api";
import { AuthContext } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";

function Login() {
  const navigate = useNavigate();
  const { login } = useContext(AuthContext);
  const toast = useToast();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [clinicName, setClinicName] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await api.post("/auth/login", { email, password, clinic_name: clinicName });
      const { token, user } = response.data;
      localStorage.setItem("token", token);
      localStorage.setItem("user", JSON.stringify(user));
      localStorage.setItem("role", user.role);
      login(token);
      toast.success("Welcome back!", `Logged in as ${user.name}`);
      const roleRedirects = {
        "Admin":        "/",
        "Doctor":       "/",
        "Receptionist": "/patients",
        "Lab Staff":    "/ai-support",
      };
      navigate(roleRedirects[user.role] || "/patients");
    } catch (error) {
      const msg = error.response?.data?.message || "Login failed. Please check your credentials.";
      toast.error("Login Failed", msg);
    } finally {
      setLoading(false);
    }
  };

  const trustHighlights = [
    { icon: "🛡️", title: "HIPAA-Compliant Safeguards", desc: "Your clinical data is protected with healthcare-grade security protocols." },
    { icon: "🔒", title: "AES-256 Data Encryption", desc: "All records, prescriptions, and medical files are fully encrypted at rest and in transit." },
    { icon: "⚡", title: "99.99% Cloud Uptime", desc: "Powered by zero-latency servers ensuring instant records access on any device." },
    { icon: "👥", title: "Trusted Clinic Network", desc: "Adopted by over 500+ healthcare practitioners and outpatient departments." }
  ];

  const stats = [
    { value: "500+", label: "Clinics Enrolled" },
    { value: "99.99%", label: "System SLA" },
    { value: "100%", label: "Data Security" }
  ];

  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      flexDirection: isMobile ? "column" : "row",
      background: "linear-gradient(135deg, #0a0f1e 0%, #0d1b3e 100%)",
      fontFamily: "'Inter', 'Outfit', sans-serif",
    }}>

      {/* ── Branding Panel ─────────────────────────────────────────── */}
      <div style={{
        flex: isMobile ? "none" : "0 0 45%",
        background: "linear-gradient(150deg, #070b19 0%, #0d1e3d 50%, #1e40af 100%)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: isMobile ? "40px 20px" : "60px 48px",
        position: "relative",
        overflow: "hidden",
        minHeight: isMobile ? "auto" : "100vh",
      }}>
        {/* Ambient blobs */}
        <div style={{
          position: "absolute", width: 450, height: 450, borderRadius: "50%",
          background: "rgba(59,130,246,0.18)", top: "-180px", right: "-120px",
          filter: "blur(80px)", pointerEvents: "none",
        }} />
        <div style={{
          position: "absolute", width: 350, height: 350, borderRadius: "50%",
          background: "rgba(139,92,246,0.12)", bottom: "-100px", left: "-80px",
          filter: "blur(60px)", pointerEvents: "none",
        }} />

        <div style={{ position: "relative", zIndex: 1, maxWidth: 460, width: "100%" }}>
          {/* Logo & Headline */}
          <div style={{ textAlign: "center", marginBottom: isMobile ? 24 : 36 }}>
            <div style={{ fontSize: isMobile ? 54 : 64, marginBottom: 16, display: "inline-block" }}>🏥</div>
            <h1 style={{
              fontFamily: "'Outfit', sans-serif",
              fontSize: isMobile ? 26 : 34,
              fontWeight: 800,
              color: "#ffffff",
              letterSpacing: "-1px",
              marginBottom: 10,
            }}>
              Smart OPD System
            </h1>
            <p style={{
              fontSize: isMobile ? 13 : 14.5,
              color: "rgba(255,255,255,0.7)",
              lineHeight: 1.6,
              maxWidth: 380,
              margin: "0 auto",
            }}>
              Intelligent clinic management with secure digital prescriptions, AI report analysis, and automated billing workflows.
            </p>
          </div>

          {/* Trust Highlights Grid - Desktop */}
          {!isMobile && (
            <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 32 }}>
              {trustHighlights.map((h, i) => (
                <div key={i} style={{
                  display: "flex", gap: 14,
                  padding: "14px 18px",
                  background: "rgba(255,255,255,0.03)",
                  borderRadius: 14,
                  border: "1px solid rgba(255,255,255,0.06)",
                  backdropFilter: "blur(10px)",
                }}>
                  <span style={{ fontSize: 22, marginTop: 2 }}>{h.icon}</span>
                  <div>
                    <div style={{ color: "#ffffff", fontSize: 13.5, fontWeight: 700, marginBottom: 3 }}>
                      {h.title}
                    </div>
                    <div style={{ color: "rgba(255,255,255,0.5)", fontSize: 11.5, lineHeight: 1.45 }}>
                      {h.desc}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Stats Bar */}
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: 12,
            background: "rgba(255,255,255,0.02)",
            border: "1px solid rgba(255,255,255,0.05)",
            borderRadius: 16,
            padding: "14px 10px",
            textAlign: "center",
            backdropFilter: "blur(10px)",
          }}>
            {stats.map((s, i) => (
              <div key={i}>
                <div style={{ fontSize: isMobile ? 18 : 22, fontWeight: 800, color: "#60a5fa", marginBottom: 2 }}>
                  {s.value}
                </div>
                <div style={{ fontSize: 10, color: "rgba(255,255,255,0.45)", textTransform: "uppercase", fontWeight: 700, letterSpacing: "0.5px" }}>
                  {s.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Login Form Panel ────────────────────────────────────────── */}
      <div style={{
        flex: 1,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: isMobile ? "32px 20px 40px" : "48px 40px",
        minHeight: isMobile ? "auto" : "100vh",
      }}>
        <div style={{
          width: "100%",
          maxWidth: 420,
          background: "rgba(255,255,255,0.04)",
          border: "1px solid rgba(255,255,255,0.1)",
          borderRadius: isMobile ? 20 : 24,
          padding: isMobile ? "28px 20px" : "40px 36px",
          backdropFilter: "blur(20px)",
          boxShadow: "0 24px 64px rgba(0,0,0,0.4)",
        }}>
          <div style={{ marginBottom: 28 }}>
            <h2 style={{
              fontFamily: "'Outfit', sans-serif",
              fontSize: isMobile ? 22 : 28,
              fontWeight: 800,
              color: "#f1f5f9",
              letterSpacing: "-0.5px",
              marginBottom: 6,
            }}>
              Welcome back 👋
            </h2>
            <p style={{ fontSize: 14, color: "rgba(255,255,255,0.5)" }}>
              Sign in to your Smart OPD account
            </p>
          </div>

          <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            {/* Email */}
            <div>
              <label style={{ fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,0.7)", display: "block", marginBottom: 6 }}>
                Email Address
              </label>
              <div style={{ position: "relative" }}>
                <span style={{
                  position: "absolute", left: 13, top: "50%", transform: "translateY(-50%)",
                  fontSize: 15, color: "rgba(255,255,255,0.4)",
                }}>✉️</span>
                <input
                  id="login-email"
                  type="email"
                  placeholder="doctor@hospital.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  style={{
                    width: "100%", boxSizing: "border-box",
                    paddingLeft: 40, paddingRight: 14, paddingTop: 12, paddingBottom: 12,
                    background: "rgba(255,255,255,0.06)",
                    border: "1px solid rgba(255,255,255,0.12)",
                    borderRadius: 12, color: "#f1f5f9", fontSize: 14,
                    outline: "none", transition: "border-color 0.2s",
                  }}
                  onFocus={e => e.target.style.borderColor = "rgba(59,130,246,0.6)"}
                  onBlur={e => e.target.style.borderColor = "rgba(255,255,255,0.12)"}
                />
              </div>
            </div>

            {/* Clinic Name */}
            <div>
              <label style={{ fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,0.7)", display: "block", marginBottom: 6 }}>
                Clinic Name <span style={{ color: "rgba(255,255,255,0.4)", fontWeight: 400 }}>(Required for Receptionists)</span>
              </label>
              <div style={{ position: "relative" }}>
                <span style={{
                  position: "absolute", left: 13, top: "50%", transform: "translateY(-50%)",
                  fontSize: 15, color: "rgba(255,255,255,0.4)",
                }}>🏢</span>
                <input
                  id="login-clinic-name"
                  type="text"
                  placeholder="e.g. Smile Dental Clinic"
                  value={clinicName}
                  onChange={(e) => setClinicName(e.target.value)}
                  style={{
                    width: "100%", boxSizing: "border-box",
                    paddingLeft: 40, paddingRight: 14, paddingTop: 12, paddingBottom: 12,
                    background: "rgba(255,255,255,0.06)",
                    border: "1px solid rgba(255,255,255,0.12)",
                    borderRadius: 12, color: "#f1f5f9", fontSize: 14,
                    outline: "none", transition: "border-color 0.2s",
                  }}
                  onFocus={e => e.target.style.borderColor = "rgba(59,130,246,0.6)"}
                  onBlur={e => e.target.style.borderColor = "rgba(255,255,255,0.12)"}
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label style={{ fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,0.7)", display: "block", marginBottom: 6 }}>
                Password
              </label>
              <div style={{ position: "relative" }}>
                <span style={{
                  position: "absolute", left: 13, top: "50%", transform: "translateY(-50%)",
                  fontSize: 15, color: "rgba(255,255,255,0.4)",
                }}>🔒</span>
                <input
                  id="login-password"
                  type={showPass ? "text" : "password"}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  style={{
                    width: "100%", boxSizing: "border-box",
                    paddingLeft: 40, paddingRight: 44, paddingTop: 12, paddingBottom: 12,
                    background: "rgba(255,255,255,0.06)",
                    border: "1px solid rgba(255,255,255,0.12)",
                    borderRadius: 12, color: "#f1f5f9", fontSize: 14,
                    outline: "none", transition: "border-color 0.2s",
                  }}
                  onFocus={e => e.target.style.borderColor = "rgba(59,130,246,0.6)"}
                  onBlur={e => e.target.style.borderColor = "rgba(255,255,255,0.12)"}
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  style={{
                    position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)",
                    background: "none", border: "none", cursor: "pointer",
                    fontSize: 15, color: "rgba(255,255,255,0.4)",
                  }}
                  tabIndex={-1}
                >
                  {showPass ? "🙈" : "👁️"}
                </button>
              </div>
            </div>

            {/* Submit */}
            <button
              id="login-submit"
              type="submit"
              disabled={loading}
              style={{
                width: "100%", padding: "13px",
                borderRadius: 12, border: "none",
                background: loading
                  ? "rgba(59,130,246,0.4)"
                  : "linear-gradient(135deg, #3b82f6, #1d4ed8)",
                color: "#fff", fontSize: 15, fontWeight: 700,
                cursor: loading ? "not-allowed" : "pointer",
                boxShadow: "0 4px 20px rgba(59,130,246,0.35)",
                transition: "all 0.2s",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              }}
            >
              {loading ? (
                <>
                  <span style={{
                    width: 16, height: 16, border: "2px solid rgba(255,255,255,0.3)",
                    borderTopColor: "white", borderRadius: "50%",
                    animation: "spin 0.8s linear infinite", display: "inline-block",
                  }} />
                  Signing in...
                </>
              ) : "Sign In →"}
            </button>

            <div style={{ textAlign: "center", color: "rgba(255,255,255,0.45)", fontSize: 13 }}>
              Don't have an account?{" "}
              <Link to="/register" style={{ color: "#60a5fa", fontWeight: 600, textDecoration: "none" }}>
                Create Account
              </Link>
            </div>
          </form>
        </div>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        input::placeholder { color: rgba(255,255,255,0.25); }
      `}</style>
    </div>
  );
}

export default Login;