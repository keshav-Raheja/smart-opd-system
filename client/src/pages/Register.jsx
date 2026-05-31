import { useState } from "react";
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

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    role: "Receptionist",
  });

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const sendOtp = async () => {
    if (!formData.email) {
      toast.warning("Email Required", "Please enter your email first");
      return;
    }

    setOtpLoading(true);
    try {
      await api.post("/otp/send", { email: formData.email });
      toast.success("OTP Sent", "A verification code has been dispatched to your email");
      setOtpSent(true);
    } catch (error) {
      console.error(error);
      toast.error("Delivery Failed", error.response?.data?.message || "Could not dispatch verification OTP");
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
      await api.post("/otp/verify", {
        email: formData.email,
        otp: otp.trim(),
      });
      toast.success("Identity Verified", "Your email has been successfully verified");
      setOtpVerified(true);
    } catch (error) {
      console.error(error);
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
      console.error(error);
      toast.error("Registration Failed", error.response?.data?.message || "Could not complete registration");
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
      
      {/* ── Left Branding Panel ──────────────────────────────────────────────── */}
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
        {/* Decorative ambient blobs */}
        <div style={{
          position: "absolute", width: 400, height: 400,
          borderRadius: "50%", background: "rgba(59,130,246,0.12)",
          top: "-150px", left: "-150px", filter: "blur(60px)"
        }} />
        <div style={{
          position: "absolute", width: 300, height: 300,
          borderRadius: "50%", background: "rgba(139,92,246,0.08)",
          bottom: "-80px", right: "-80px", filter: "blur(40px)"
        }} />

        <div style={{ textAlign: "center", position: "relative", zIndex: 1, maxWidth: 360 }}>
          <div style={{ fontSize: 72, marginBottom: 20 }}>🏥</div>
          <h1 style={{
            fontFamily: "'Outfit', sans-serif",
            fontSize: 36,
            fontWeight: 800,
            color: "#ffffff",
            letterSpacing: "-1px",
            marginBottom: 10,
          }}>
            Join Smart OPD
          </h1>
          <p style={{
            fontSize: 15,
            color: "rgba(255,255,255,0.7)",
            lineHeight: 1.6,
            marginBottom: 44,
          }}>
            Set up your clinical account and access real-time medical report analytics & billing systems.
          </p>

          {/* Verification Journey Steps */}
          <div style={{ display: "flex", flexDirection: "column", gap: 16, textAlign: "left" }}>
            {[
              { step: "1", title: "Verify Email via OTP", desc: "Guarantees secure and authentic clinician registrations." },
              { step: "2", title: "Select Staff Role", desc: "Configure access parameters for Doctors, Receptionists, and Lab staff." },
              { step: "3", title: "Access Clinic Hub", desc: "Engage with digital prescriptions, smart queues, and automated billing." },
            ].map((s, i) => (
              <div key={i} style={{
                display: "flex", gap: 14, padding: "14px 18px",
                borderRadius: 14, background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.08)"
              }}>
                <div style={{
                  width: 28, height: 28, borderRadius: "50%",
                  background: "rgba(255,255,255,0.15)", color: "white",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontWeight: 700, fontSize: 13, flexShrink: 0
                }}>
                  {s.step}
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 13, color: "white", marginBottom: 2 }}>{s.title}</div>
                  <div style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", lineHeight: 1.4 }}>{s.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Right Form Panel ─────────────────────────────────────────────────── */}
      <div style={{
        flex: 1,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "40px",
      }}>
        <div className="card animate-fade-in" style={{
          width: "100%",
          maxWidth: 440,
          padding: "36px 40px",
          boxShadow: "0 20px 50px rgba(0,0,0,0.04)",
          background: "white",
          borderRadius: 24,
          border: "1px solid var(--color-border)",
        }}>
          <div style={{ textAlign: "center", marginBottom: 28 }}>
            <h2 style={{
              fontFamily: "'Outfit', sans-serif",
              fontSize: 26,
              fontWeight: 800,
              color: "var(--color-text-primary)",
              letterSpacing: "-0.5px"
            }}>
              Create Account
            </h2>
            <p style={{ fontSize: 13, color: "var(--color-text-muted)", marginTop: 4 }}>
              Fill in your details to get started
            </p>
          </div>

          <form onSubmit={handleRegister} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            
            {/* Full Name */}
            <div className="form-group">
              <label className="form-label">Full Name *</label>
              <div style={{ position: "relative" }}>
                <span style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", fontSize: 14 }}>👤</span>
                <input
                  type="text"
                  name="name"
                  placeholder="Enter full name"
                  value={formData.name}
                  onChange={handleChange}
                  className="form-input"
                  style={{ paddingLeft: 38 }}
                  required
                  disabled={loading}
                />
              </div>
            </div>

            {/* Email + Send OTP Button */}
            <div className="form-group">
              <label className="form-label">Email Address *</label>
              <div style={{ display: "flex", gap: 8 }}>
                <div style={{ position: "relative", flex: 1 }}>
                  <span style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", fontSize: 14 }}>✉️</span>
                  <input
                    type="email"
                    name="email"
                    placeholder="name@clinic.com"
                    value={formData.email}
                    onChange={handleChange}
                    className="form-input"
                    style={{ paddingLeft: 38 }}
                    required
                    disabled={otpVerified || loading}
                  />
                </div>
                {!otpVerified && (
                  <button
                    type="button"
                    onClick={sendOtp}
                    disabled={otpLoading || !formData.email}
                    className={`btn ${otpSent ? "btn-secondary" : "btn-primary"}`}
                    style={{ flexShrink: 0, padding: "0 16px", borderRadius: 12, fontSize: 12 }}
                  >
                    {otpLoading ? (
                      <span className="spinner" style={{ width: 14, height: 14 }} />
                    ) : otpSent ? (
                      "Resend"
                    ) : (
                      "Send OTP"
                    )}
                  </button>
                )}
              </div>
            </div>

            {/* OTP Verification Input (Slides down when sent) */}
            {otpSent && !otpVerified && (
              <div className="form-group animate-slide-down" style={{
                background: "var(--color-surface-2)", padding: 14,
                borderRadius: 14, border: "1px dashed var(--color-border)"
              }}>
                <label className="form-label">Enter Verification Code *</label>
                <div style={{ display: "flex", gap: 8 }}>
                  <input
                    type="text"
                    placeholder="Enter 6-digit OTP"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    className="form-input"
                    style={{ textAlign: "center", letterSpacing: 2, fontWeight: 700 }}
                  />
                  <button
                    type="button"
                    onClick={verifyOtp}
                    disabled={verifyLoading}
                    className="btn btn-success"
                    style={{ padding: "0 16px", borderRadius: 12, fontSize: 12 }}
                  >
                    {verifyLoading ? (
                      <span className="spinner" style={{ width: 14, height: 14 }} />
                    ) : (
                      "Verify"
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* Verified Success Alert */}
            {otpVerified && (
              <div className="animate-fade-in" style={{
                background: "#d1fae5", color: "#065f46",
                padding: "10px 14px", borderRadius: 12,
                fontSize: 12, fontWeight: 700, display: "flex",
                alignItems: "center", gap: 8
              }}>
                <span>✅</span> Email verified successfully
              </div>
            )}

            {/* Role selection */}
            <div className="form-group">
              <label className="form-label">Specialty Role *</label>
              <div style={{ position: "relative" }}>
                <span style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", fontSize: 14 }}>🩺</span>
                <select
                  name="role"
                  value={formData.role}
                  onChange={handleChange}
                  className="form-input form-select"
                  style={{ paddingLeft: 38 }}
                  disabled={loading}
                >
                  <option value="Receptionist">Receptionist</option>
                  <option value="Doctor">Doctor</option>
                  <option value="Lab Staff">Lab Staff</option>
                </select>
              </div>
            </div>

            {/* Password */}
            <div className="form-group">
              <label className="form-label">Password *</label>
              <div style={{ position: "relative" }}>
                <span style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", fontSize: 14 }}>🔒</span>
                <input
                  type={showPass ? "text" : "password"}
                  name="password"
                  placeholder="Create secure password"
                  value={formData.password}
                  onChange={handleChange}
                  className="form-input"
                  style={{ paddingLeft: 38, paddingRight: 38 }}
                  required
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  style={{
                    position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)",
                    background: "none", border: "none", cursor: "pointer", fontSize: 14, opacity: 0.65
                  }}
                >
                  {showPass ? "👁️" : "🙈"}
                </button>
              </div>
            </div>

            {/* Submit Register Button */}
            <button
              type="submit"
              disabled={!otpVerified || loading}
              className="btn btn-primary btn-lg"
              style={{
                width: "100%",
                background: otpVerified ? "linear-gradient(135deg, #1e3a5f, #1d4ed8)" : "var(--color-border)",
                border: "none",
                fontWeight: 700,
                marginTop: 8
              }}
            >
              {loading ? (
                <><span className="spinner" style={{ width: 16, height: 16 }} /> Processing...</>
              ) : (
                "🚀 Complete Registration"
              )}
            </button>

            {/* Link back to Login */}
            <div style={{ textAlign: "center", marginTop: 14, fontSize: 13 }}>
              <span style={{ color: "var(--color-text-muted)" }}>Already have an account? </span>
              <Link to="/login" style={{
                color: "var(--color-accent)", fontWeight: 700, textDecoration: "none"
              }}>
                Log In
              </Link>
            </div>

          </form>
        </div>
      </div>
    </div>
  );
}

export default Register;