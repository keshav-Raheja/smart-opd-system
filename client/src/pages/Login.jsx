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
      const response = await api.post("/auth/login", { email, password });
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

  const features = [
    { icon: "🤖", text: "AI-powered report analysis" },
    { icon: "📋", text: "Smart appointment management" },
    { icon: "💊", text: "Digital prescription generation" },
    { icon: "📊", text: "Real-time dashboard analytics" },
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
        background: "linear-gradient(150deg, #0f172a 0%, #1e3a5f 60%, #1d4ed8 100%)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: isMobile ? "40px 24px 32px" : "60px 48px",
        position: "relative",
        overflow: "hidden",
        minHeight: isMobile ? "auto" : "100vh",
      }}>
        {/* Ambient blobs */}
        <div style={{
          position: "absolute", width: 350, height: 350, borderRadius: "50%",
          background: "rgba(59,130,246,0.15)", top: "-120px", right: "-100px",
          filter: "blur(60px)", pointerEvents: "none",
        }} />
        <div style={{
          position: "absolute", width: 250, height: 250, borderRadius: "50%",
          background: "rgba(139,92,246,0.1)", bottom: "-60px", left: "-60px",
          filter: "blur(40px)", pointerEvents: "none",
        }} />

        <div style={{ textAlign: "center", position: "relative", zIndex: 1, maxWidth: 380 }}>
          <div style={{ fontSize: isMobile ? 52 : 72, marginBottom: isMobile ? 12 : 24 }}>🏥</div>
          <h1 style={{
            fontFamily: "'Outfit', sans-serif",
            fontSize: isMobile ? 26 : 36,
            fontWeight: 800,
            color: "#ffffff",
            letterSpacing: "-1px",
            marginBottom: 10,
          }}>
            Smart OPD System
          </h1>
          <p style={{
            fontSize: isMobile ? 13 : 15,
            color: "rgba(255,255,255,0.65)",
            lineHeight: 1.7,
            maxWidth: 300,
            margin: "0 auto",
            marginBottom: isMobile ? 0 : 40,
          }}>
            AI-powered clinic management with intelligent medical report analysis
          </p>

          {/* Feature list — hide on mobile to save space */}
          {!isMobile && (
            <div style={{ display: "flex", flexDirection: "column", gap: 14, textAlign: "left", marginTop: 40 }}>
              {features.map((f, i) => (
                <div key={i} style={{
                  display: "flex", alignItems: "center", gap: 12,
                  padding: "12px 16px",
                  background: "rgba(255,255,255,0.07)",
                  borderRadius: 12,
                  border: "1px solid rgba(255,255,255,0.08)",
                }}>
                  <span style={{ fontSize: 20 }}>{f.icon}</span>
                  <span style={{ color: "rgba(255,255,255,0.85)", fontSize: 14, fontWeight: 500 }}>{f.text}</span>
                </div>
              ))}
            </div>
          )}

          {/* Mobile: show compact feature pills */}
          {isMobile && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "center", marginTop: 16 }}>
              {features.map((f, i) => (
                <span key={i} style={{
                  fontSize: 12, padding: "6px 12px",
                  background: "rgba(255,255,255,0.1)",
                  borderRadius: 20, color: "rgba(255,255,255,0.8)",
                  border: "1px solid rgba(255,255,255,0.08)",
                }}>
                  {f.icon} {f.text}
                </span>
              ))}
            </div>
          )}
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