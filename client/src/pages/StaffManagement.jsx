import { useState, useEffect } from "react";
import api from "../services/api";
import { useToast } from "../context/ToastContext";

function StaffManagement() {
  const toast = useToast();
  const [clinic, setClinic] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [showPass, setShowPass] = useState(false);

  const loadClinicData = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await api.get("/opd/my-clinic");
      setClinic(res.data);
    } catch (e) {
      setError(e.response?.data?.message || "Failed to load clinic details.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadClinicData();
  }, []);

  const handleCreateReceptionist = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim() || !form.password) {
      toast.error("Validation Error", "All fields are required");
      return;
    }
    setSubmitting(true);
    try {
      await api.post("/auth/create-receptionist", form);
      toast.success("Success", "Receptionist account created successfully!");
      setForm({ name: "", email: "", password: "" });
      loadClinicData();
    } catch (e) {
      toast.error("Creation Failed", e.response?.data?.message || "Could not create receptionist account");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteReceptionist = async (id, name) => {
    if (!window.confirm(`Are you sure you want to delete receptionist "${name}"? They will lose access immediately.`)) {
      return;
    }
    try {
      await api.delete(`/auth/receptionist/${id}`);
      toast.success("Success", "Receptionist deleted successfully");
      loadClinicData();
    } catch (e) {
      toast.error("Deletion Failed", e.response?.data?.message || "Could not delete receptionist");
    }
  };

  if (loading) {
    return (
      <div style={{ padding: "40px", textAlign: "center", color: "var(--text-secondary)" }}>
        Loading clinic and staff data...
      </div>
    );
  }

  return (
    <div className="animate-fade-in" style={{ padding: "24px", maxWidth: "1100px", margin: "0 auto" }}>
      <div className="page-header" style={{ marginBottom: "28px" }}>
        <h1 className="page-title">👥 Staff Management</h1>
        <p className="page-subtitle">Manage receptionist accounts for your clinic</p>
      </div>

      {error && (
        <div style={{ background: "#fee2e2", color: "#dc2626", padding: "12px 16px", borderRadius: 8, marginBottom: 20, fontSize: 14 }}>
          {error}
        </div>
      )}

      {/* Clinic Details Row */}
      {clinic && (
        <div className="card" style={{ marginBottom: 24, padding: 20, background: "linear-gradient(135deg, rgba(30,58,138,0.1), rgba(17,24,39,0.5))", border: "1px solid rgba(59,130,246,0.15)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
            <div>
              <span style={{ fontSize: 11, background: "rgba(59,130,246,0.15)", color: "#93c5fd", padding: "2px 8px", borderRadius: 20, fontWeight: 700, textTransform: "uppercase" }}>
                {clinic.type} OPD
              </span>
              <h2 style={{ fontSize: 22, fontWeight: 800, color: "#f8fafc", margin: "6px 0 2px" }}>{clinic.name}</h2>
              {clinic.address && <div style={{ fontSize: 13, color: "var(--text-secondary)" }}>📍 {clinic.address}</div>}
              {clinic.contact && <div style={{ fontSize: 13, color: "var(--text-secondary)", marginTop: 2 }}>📞 {clinic.contact}</div>}
            </div>
          </div>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 24 }}>
        
        {/* Create Receptionist Card */}
        <div className="card" style={{ padding: 24 }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16, color: "#f8fafc", display: "flex", alignItems: "center", gap: 8 }}>
            <span>➕</span> Create Receptionist
          </h2>
          <form onSubmit={handleCreateReceptionist} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div>
              <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 6 }}>Full Name *</label>
              <input
                className="form-input"
                placeholder="e.g. Priya Sharma"
                value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })}
                required
                disabled={submitting}
              />
            </div>
            <div>
              <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 6 }}>Email Address *</label>
              <input
                type="email"
                className="form-input"
                placeholder="e.g. priya@clinic.com"
                value={form.email}
                onChange={e => setForm({ ...form, email: e.target.value })}
                required
                disabled={submitting}
              />
            </div>
            <div>
              <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 6 }}>Password *</label>
              <div style={{ position: "relative" }}>
                <input
                  type={showPass ? "text" : "password"}
                  className="form-input"
                  placeholder="Create secure password"
                  value={form.password}
                  onChange={e => setForm({ ...form, password: e.target.value })}
                  required
                  disabled={submitting}
                  style={{ paddingRight: 40 }}
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  style={{
                    position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)",
                    background: "none", border: "none", color: "var(--text-secondary)", cursor: "pointer", fontSize: 14
                  }}
                >
                  {showPass ? "🙈" : "👁️"}
                </button>
              </div>
            </div>
            <button type="submit" className="btn-primary" style={{ marginTop: 6 }} disabled={submitting}>
              {submitting ? "Creating..." : "Create Account"}
            </button>
          </form>
        </div>

        {/* Staff List Card */}
        <div className="card" style={{ padding: 24, display: "flex", flexDirection: "column" }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16, color: "#f8fafc", display: "flex", alignItems: "center", gap: 8 }}>
            <span>📋</span> Active Receptionists
          </h2>

          {!clinic || !clinic.receptionists_detail || clinic.receptionists_detail.length === 0 ? (
            <div style={{ textAlign: "center", padding: "40px 20px", color: "var(--text-secondary)", flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
              No receptionists created yet. Create one on the left.
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10, overflowY: "auto", maxHeight: "350px", flex: 1 }}>
              {clinic.receptionists_detail.map(rec => (
                <div
                  key={rec._id}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "12px 16px",
                    background: "var(--bg-secondary)",
                    border: "1px solid rgba(255,255,255,0.04)",
                    borderRadius: 12,
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 14, color: "#f1f5f9" }}>{rec.name}</div>
                    <div style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 2 }}>{rec.email}</div>
                  </div>
                  <button
                    onClick={() => handleDeleteReceptionist(rec._id, rec.name)}
                    style={{
                      background: "rgba(220,38,38,0.1)",
                      color: "#ef4444",
                      border: "none",
                      borderRadius: 8,
                      padding: "6px 12px",
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: "pointer",
                      transition: "all 0.15s",
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = "rgba(220,38,38,0.2)"}
                    onMouseLeave={e => e.currentTarget.style.background = "rgba(220,38,38,0.1)"}
                  >
                    Delete
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}

export default StaffManagement;
