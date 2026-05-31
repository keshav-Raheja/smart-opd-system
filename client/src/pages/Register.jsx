import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import api from "../services/api";
import { useToast } from "../context/ToastContext";

function Register() {
  const navigate = useNavigate();
  const toast = useToast();

  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [otpVerified, setOtpVerified] = useState(false);
  const [loading, setLoading] = useState(false);
  const [otpLoading, setOtpLoading] = useState(false);
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    role: "Receptionist",
  });

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const sendOtp = async () => {
    if (!formData.email) {
      toast.warning("Email Required", "Please enter your email first");
      return;
    }
    setOtpLoading(true);
    try {
      await api.post("/otp/send", { email: formData.email });
      toast.success("OTP Sent", "A verification code has been sent to your email");
      setOtpSent(true);
    } catch (error) {
      toast.error("Delivery Failed", error.response?.data?.message || "Could not send OTP");
    } finally {
      setOtpLoading(false);
    }
  };

  const verifyOtp = async () => {
    if (!otp) {
      toast.warning("OTP Required", "Please enter the verification code");
      return;
    }
    setVerifyLoading(true);
    try {
      await api.post("/otp/verify", { email: formData.email, otp: otp.trim() });
      toast.success("Identity Verified", "Your email has been successfully verified");
      setOtpVerified(true);
    } catch (error) {
      toast.error("Verification Failed", error.response?.data?.message || "Invalid or expired OTP");
    } finally {
      setVerifyLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    if (!otpVerified) {
      toast.warning("Verification Pending", "Please verify your email via OTP first");
      return;
    }
    setLoading(true);
    try {
      await api.post("/auth/register", formData);
      toast.success("Account Created", "Your staff profile has been set up successfully!");
      navigate("/login");
    } catch (error) {
      toast.error("Registration Failed", error.response?.data?.message || "Could not complete registration");
    } finally {
      setLoading(false);
    }
  };

  // ── Shared input style ─────────────────────────────────────────────────────
  const inputStyle = {
    width: "100%", boxSizing: "border-box",
    paddingLeft: 40, paddingRight: 14, paddingTop: 12, paddingBottom: 12,
    background: "rgba(255,255,255,0.06)",
    border: "1px solid rgba(255,255,255,0.12)",
    borderRadius: 12, color: "#f1f5f9", fontSize: 14,
    outline: "none", transition: "border-color 0.2s",
  };

  const labelStyle = {
    fontSize: 13, fontWeight: 600,
    color: "rgba(255,255,255,0.7)",
    display: "block", marginBottom: 6,
  };

  const iconStyle = {
    position: "absolute", left: 13, top: "50%",
    transform: "translateY(-50%)", fontSize: 15,
    color: "rgba(255,255,255,0.4)", pointerEvents: "none",
  };

  const steps = [
    { step: "1", title: "Verify Email via OTP", desc: "Secure and authentic clinician registration." },
    { step: "2", title: "Select Staff Role", desc: "Doctor, Receptionist, or Lab Staff access." },
    { step: "3", title: "Access Clinic Hub", desc: "Prescriptions, queues, and smart billing." },
  ];

  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      flexDirection: isMobile ? "column" : "row",
      background: "linear-gradient(135deg, #0a0f1e 0%, #0d1b3e 100%)",
      fontFamily: "'Inter', 'Outfit', sans-serif",
    }}>

      {/* ── Left Branding Panel ──────────────────────────────────── */}
      <div style={{
        flex: isMobile ? "none" : "0 0 42%",
        background: "linear-gradient(150deg, #0f172a 0%, #1e3a5f 60%, #1d4ed8 100%)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: isMobile ? "36px 24px 28px" : "60px 48px",
        position: "relative",
        overflow: "hidden",
        minHeight: isMobile ? "auto" : "100vh",
      }}>
        {/* Ambient blobs */}
        <div style={{
          position: "absolute", width: 400, height: 400, borderRadius: "50%",
          background: "rgba(59,130,246,0.15)", top: "-150px", left: "-150px",
          filter: "blur(60px)", pointerEvents: "none",
        }} />
        <div style={{
          position: "absolute", width: 280, height: 280, borderRadius: "50%",
          background: "rgba(139,92,246,0.1)", bottom: "-80px", right: "-80px",
          filter: "blur(40px)", pointerEvents: "none",
        }} />

        <div style={{ textAlign: "center", position: "relative", zIndex: 1, maxWidth: 360 }}>
          <div style={{ fontSize: isMobile ? 48 : 68, marginBottom: isMobile ? 12 : 20 }}>🏥</div>
          <h1 style={{
            fontFamily: "'Outfit', sans-serif",
            fontSize: isMobile ? 24 : 34,
            fontWeight: 800,
            color: "#ffffff",
            letterSpacing: "-1px",
            marginBottom: 8,
          }}>
            Join Smart OPD
          </h1>
          <p style={{
            fontSize: isMobile ? 13 : 14,
            color: "rgba(255,255,255,0.65)",
            lineHeight: 1.65,
            marginBottom: isMobile ? 0 : 36,
          }}>
            Set up your clinical account and access real-time medical analytics & billing.
          </p>

          {/* Steps — full on desktop, compact pills on mobile */}
          {!isMobile ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 14, textAlign: "left", marginTop: 28 }}>
              {steps.map((s, i) => (
                <div key={i} style={{
                  display: "flex", gap: 14, padding: "14px 18px",
                  borderRadius: 14, background: "rgba(255,255,255,0.05)",
                  border: "1px solid rgba(255,255,255,0.08)",
                }}>
                  <div style={{
                    width: 28, height: 28, borderRadius: "50%",
                    background: "rgba(255,255,255,0.15)", color: "white",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontWeight: 700, fontSize: 13, flexShrink: 0,
                  }}>{s.step}</div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 13, color: "white", marginBottom: 2 }}>{s.title}</div>
                    <div style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", lineHeight: 1.4 }}>{s.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "center", marginTop: 16 }}>
              {steps.map((s, i) => (
                <span key={i} style={{
                  fontSize: 12, padding: "6px 12px",
                  background: "rgba(255,255,255,0.1)",
                  borderRadius: 20, color: "rgba(255,255,255,0.8)",
                  border: "1px solid rgba(255,255,255,0.08)",
                }}>
                  {s.step}. {s.title}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Right Form Panel ─────────────────────────────────────── */}
      <div style={{
        flex: 1,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: isMobile ? "28px 16px 48px" : "40px 40px",
        minHeight: isMobile ? "auto" : "100vh",
      }}>
        <div style={{
          width: "100%",
          maxWidth: 460,
          background: "rgba(255,255,255,0.04)",
          border: "1px solid rgba(255,255,255,0.1)",
          borderRadius: isMobile ? 20 : 24,
          padding: isMobile ? "24px 18px 28px" : "36px 36px",
          backdropFilter: "blur(20px)",
          boxShadow: "0 24px 64px rgba(0,0,0,0.4)",
        }}>
          {/* Header */}
          <div style={{ textAlign: "center", marginBottom: 24 }}>
            <h2 style={{
              fontFamily: "'Outfit', sans-serif",
              fontSize: isMobile ? 22 : 26,
              fontWeight: 800,
              color: "#f1f5f9",
              letterSpacing: "-0.5px",
              marginBottom: 4,
            }}>
              Create Account ✨
            </h2>
            <p style={{ fontSize: 13, color: "rgba(255,255,255,0.45)" }}>
              Fill in your details to get started
            </p>
          </div>

          <form onSubmit={handleRegister} style={{ display: "flex", flexDirection: "column", gap: 14 }}>

            {/* Full Name */}
            <div>
              <label style={labelStyle}>Full Name *</label>
              <div style={{ position: "relative" }}>
                <span style={iconStyle}>👤</span>
                <input
                  type="text" name="name"
                  placeholder="Enter full name"
                  value={formData.name}
                  onChange={handleChange}
                  style={inputStyle}
                  required disabled={loading}
                  onFocus={e => e.target.style.borderColor = "rgba(59,130,246,0.6)"}
                  onBlur={e => e.target.style.borderColor = "rgba(255,255,255,0.12)"}
                />
              </div>
            </div>

            {/* Email + Send OTP */}
            <div>
              <label style={labelStyle}>Email Address *</label>
              <div style={{ display: "flex", gap: 8 }}>
                <div style={{ position: "relative", flex: 1 }}>
                  <span style={iconStyle}>✉️</span>
                  <input
                    type="email" name="email"
                    placeholder="name@clinic.com"
                    value={formData.email}
                    onChange={handleChange}
                    style={inputStyle}
                    required disabled={otpVerified || loading}
                    onFocus={e => e.target.style.borderColor = "rgba(59,130,246,0.6)"}
                    onBlur={e => e.target.style.borderColor = "rgba(255,255,255,0.12)"}
                  />
                </div>
                {!otpVerified && (
                  <button
                    type="button"
                    onClick={sendOtp}
                    disabled={otpLoading || !formData.email}
                    style={{
                      flexShrink: 0,
                      padding: "0 14px",
                      borderRadius: 12,
                      border: "1px solid rgba(59,130,246,0.4)",
                      background: otpSent ? "rgba(255,255,255,0.06)" : "linear-gradient(135deg,#3b82f6,#1d4ed8)",
                      color: "#fff",
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: otpLoading || !formData.email ? "not-allowed" : "pointer",
                      whiteSpace: "nowrap",
                      opacity: !formData.email ? 0.5 : 1,
                      display: "flex", alignItems: "center", gap: 6,
                    }}
                  >
                    {otpLoading ? (
                      <span style={{
                        width: 12, height: 12, border: "2px solid rgba(255,255,255,0.3)",
                        borderTopColor: "white", borderRadius: "50%",
                        animation: "spin 0.8s linear infinite", display: "inline-block",
                      }} />
                    ) : otpSent ? "Resend" : "Send OTP"}
                  </button>
                )}
              </div>
            </div>

            {/* OTP Input */}
            {otpSent && !otpVerified && (
              <div style={{
                background: "rgba(59,130,246,0.06)",
                border: "1px dashed rgba(59,130,246,0.3)",
                borderRadius: 14, padding: 14,
              }}>
                <label style={labelStyle}>Verification Code *</label>
                <div style={{ display: "flex", gap: 8 }}>
                  <input
                    type="text"
                    placeholder="Enter 6-digit OTP"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    style={{
                      ...inputStyle, paddingLeft: 14,
                      textAlign: "center", letterSpacing: 4, fontWeight: 700, fontSize: 16,
                    }}
                    onFocus={e => e.target.style.borderColor = "rgba(59,130,246,0.6)"}
                    onBlur={e => e.target.style.borderColor = "rgba(255,255,255,0.12)"}
                  />
                  <button
                    type="button"
                    onClick={verifyOtp}
                    disabled={verifyLoading}
                    style={{
                      flexShrink: 0, padding: "0 16px", borderRadius: 12, border: "none",
                      background: "linear-gradient(135deg,#10b981,#059669)",
                      color: "#fff", fontSize: 12, fontWeight: 700,
                      cursor: verifyLoading ? "not-allowed" : "pointer",
                      display: "flex", alignItems: "center", gap: 6,
                    }}
                  >
                    {verifyLoading ? (
                      <span style={{
                        width: 12, height: 12, border: "2px solid rgba(255,255,255,0.3)",
                        borderTopColor: "white", borderRadius: "50%",
                        animation: "spin 0.8s linear infinite", display: "inline-block",
                      }} />
                    ) : "Verify ✓"}
                  </button>
                </div>
              </div>
            )}

            {/* Verified badge */}
            {otpVerified && (
              <div style={{
                background: "rgba(16,185,129,0.12)", color: "#34d399",
                padding: "10px 14px", borderRadius: 12, fontSize: 13, fontWeight: 700,
                display: "flex", alignItems: "center", gap: 8,
                border: "1px solid rgba(16,185,129,0.2)",
              }}>
                ✅ Email verified successfully
              </div>
            )}

            {/* Role */}
            <div>
              <label style={labelStyle}>Specialty Role *</label>
              <div style={{ position: "relative" }}>
                <span style={iconStyle}>🩺</span>
                <select
                  name="role"
                  value={formData.role}
                  onChange={handleChange}
                  disabled={loading}
                  style={{
                    ...inputStyle, paddingLeft: 40,
                    appearance: "none", cursor: "pointer",
                  }}
                  onFocus={e => e.target.style.borderColor = "rgba(59,130,246,0.6)"}
                  onBlur={e => e.target.style.borderColor = "rgba(255,255,255,0.12)"}
                >
                  <option value="Receptionist">Receptionist</option>
                  <option value="Doctor">Doctor</option>
                  <option value="Lab Staff">Lab Staff</option>
                </select>
                <span style={{
                  position: "absolute", right: 14, top: "50%",
                  transform: "translateY(-50%)", pointerEvents: "none",
                  color: "rgba(255,255,255,0.4)", fontSize: 11,
                }}>▼</span>
              </div>
            </div>

            {/* Password */}
            <div>
              <label style={labelStyle}>Password *</label>
              <div style={{ position: "relative" }}>
                <span style={iconStyle}>🔒</span>
                <input
                  type={showPass ? "text" : "password"}
                  name="password"
                  placeholder="Create secure password"
                  value={formData.password}
                  onChange={handleChange}
                  style={{ ...inputStyle, paddingRight: 42 }}
                  required disabled={loading}
                  onFocus={e => e.target.style.borderColor = "rgba(59,130,246,0.6)"}
                  onBlur={e => e.target.style.borderColor = "rgba(255,255,255,0.12)"}
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  style={{
                    position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)",
                    background: "none", border: "none", cursor: "pointer",
                    fontSize: 14, color: "rgba(255,255,255,0.4)",
                  }}
                  tabIndex={-1}
                >
                  {showPass ? "🙈" : "👁️"}
                </button>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={!otpVerified || loading}
              style={{
                width: "100%", padding: "13px",
                borderRadius: 12, border: "none", marginTop: 4,
                background: !otpVerified
                  ? "rgba(255,255,255,0.08)"
                  : "linear-gradient(135deg, #1e3a5f, #1d4ed8)",
                color: !otpVerified ? "rgba(255,255,255,0.3)" : "#fff",
                fontSize: 15, fontWeight: 700,
                cursor: !otpVerified || loading ? "not-allowed" : "pointer",
                boxShadow: otpVerified ? "0 4px 20px rgba(29,78,216,0.35)" : "none",
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
                  Processing...
                </>
              ) : "🚀 Complete Registration"}
            </button>

            <div style={{ textAlign: "center", fontSize: 13, color: "rgba(255,255,255,0.45)" }}>
              Already have an account?{" "}
              <Link to="/login" style={{ color: "#60a5fa", fontWeight: 600, textDecoration: "none" }}>
                Sign In
              </Link>
            </div>
          </form>
        </div>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        input::placeholder, select option { color: rgba(255,255,255,0.25); }
        select option { background: #0d1b3e; color: #f1f5f9; }
      `}</style>
    </div>
  );
}

export default Register;