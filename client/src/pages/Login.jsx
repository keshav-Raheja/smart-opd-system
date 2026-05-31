import { Link, useNavigate } from "react-router-dom";
import { useState, useContext } from "react";
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
      navigate("/");
    } catch (error) {
      const msg = error.response?.data?.message || "Invalid credentials";
      toast.error("Login Failed", msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      background: "var(--color-surface-2)",
    }}>
      {/* Left — Branding Panel */}
      <div style={{
        flex: "0 0 45%",
        background: "linear-gradient(135deg, #0f172a 0%, #1e3a5f 50%, #1d4ed8 100%)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "60px 48px",
        position: "relative",
        overflow: "hidden",
      }}>
        {/* Background circles */}
        <div style={{
          position: "absolute", width: 300, height: 300,
          borderRadius: "50%", background: "rgba(59,130,246,0.12)",
          top: "-80px", right: "-80px",
        }} />
        <div style={{
          position: "absolute", width: 200, height: 200,
          borderRadius: "50%", background: "rgba(139,92,246,0.1)",
          bottom: "60px", left: "-60px",
        }} />

        <div style={{ textAlign: "center", position: "relative", zIndex: 1 }}>
          <div style={{ fontSize: 72, marginBottom: 24 }}>🏥</div>
          <h1 style={{
            fontFamily: "'Outfit', sans-serif",
            fontSize: 36,
            fontWeight: 800,
            color: "#ffffff",
            letterSpacing: "-1px",
            marginBottom: 12,
          }}>
            Smart OPD System
          </h1>
          <p style={{
            fontSize: 16,
            color: "rgba(255,255,255,0.65)",
            lineHeight: 1.7,
            maxWidth: 320,
            margin: "0 auto",
          }}>
            AI-powered clinic management with intelligent medical report analysis
          </p>

          {/* Feature list */}
          <div style={{ marginTop: 40, display: "flex", flexDirection: "column", gap: 16, textAlign: "left" }}>
            {[
              { icon: "🤖", text: "AI-powered report analysis" },
              { icon: "📋", text: "Smart appointment management" },
              { icon: "💊", text: "Digital prescription generation" },
              { icon: "📊", text: "Real-time dashboard analytics" },
            ].map((f, i) => (
              <div
                key={i}
                className="animate-fade-in-left"
                style={{
                  animationDelay: `${i * 80}ms`,
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "12px 16px",
                  background: "rgba(255,255,255,0.07)",
                  borderRadius: 12,
                  border: "1px solid rgba(255,255,255,0.08)",
                }}
              >
                <span style={{ fontSize: 20 }}>{f.icon}</span>
                <span style={{ color: "rgba(255,255,255,0.85)", fontSize: 14, fontWeight: 500 }}>{f.text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right — Login Form */}
      <div style={{
        flex: 1,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "48px 40px",
      }}>
        <div className="animate-fade-in-scale" style={{ width: "100%", maxWidth: 420 }}>
          <div style={{ marginBottom: 36 }}>
            <h2 style={{
              fontFamily: "'Outfit', sans-serif",
              fontSize: 28,
              fontWeight: 800,
              color: "var(--color-text-primary)",
              letterSpacing: "-0.5px",
              marginBottom: 8,
            }}>
              Welcome back 👋
            </h2>
            <p style={{ fontSize: 15, color: "var(--color-text-secondary)" }}>
              Sign in to your Smart OPD account
            </p>
          </div>

          <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            {/* Email */}
            <div className="form-group">
              <label className="form-label">Email Address</label>
              <div style={{ position: "relative" }}>
                <span style={{
                  position: "absolute", left: 13, top: "50%", transform: "translateY(-50%)",
                  fontSize: 16, color: "var(--color-text-muted)",
                }}>✉️</span>
                <input
                  id="login-email"
                  type="email"
                  placeholder="doctor@hospital.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="form-input"
                  style={{ paddingLeft: 40 }}
                  required
                  autoComplete="email"
                />
              </div>
            </div>

            {/* Password */}
            <div className="form-group">
              <label className="form-label">Password</label>
              <div style={{ position: "relative" }}>
                <span style={{
                  position: "absolute", left: 13, top: "50%", transform: "translateY(-50%)",
                  fontSize: 16, color: "var(--color-text-muted)",
                }}>🔒</span>
                <input
                  id="login-password"
                  type={showPass ? "text" : "password"}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="form-input"
                  style={{ paddingLeft: 40, paddingRight: 44 }}
                  required
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  style={{
                    position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)",
                    background: "none", border: "none", cursor: "pointer",
                    fontSize: 16, color: "var(--color-text-muted)",
                  }}
                  tabIndex={-1}
                >
                  {showPass ? "🙈" : "👁️"}
                </button>
              </div>
            </div>

            <button
              id="login-submit"
              type="submit"
              disabled={loading}
              className="btn btn-primary btn-lg"
              style={{ width: "100%", marginTop: 4 }}
            >
              {loading ? (
                <>
                  <span className="spinner" style={{ borderColor: "rgba(255,255,255,0.3)", borderTopColor: "white" }} />
                  Signing in...
                </>
              ) : (
                "Sign In →"
              )}
            </button>

            <div style={{ textAlign: "center", color: "var(--color-text-muted)", fontSize: 14 }}>
              Don't have an account?{" "}
              <Link
                to="/register"
                style={{ color: "var(--color-accent)", fontWeight: 600, textDecoration: "none" }}
              >
                Create Account
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default Login;