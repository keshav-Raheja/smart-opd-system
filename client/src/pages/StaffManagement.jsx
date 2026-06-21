import { useState, useEffect } from "react";
import api from "../services/api";
import { useToast } from "../context/ToastContext";

const OPD_TYPES = ["General", "Dental", "Cardiology", "Orthopedics", "Neurology", "Pediatrics", "Gynecology", "Dermatology", "Other"];

function StaffManagement() {
  const toast = useToast();
  const [clinic, setClinic] = useState(null);
  const [loading, setLoading] = useState(true);

  const user = JSON.parse(localStorage.getItem("user") || "{}");
  
  // Staff creation form (receptionist)
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [showPass, setShowPass] = useState(false);

  // Doctor creation form
  const [docForm, setDocForm] = useState({ name: "", email: "", password: "" });
  const [docSubmitting, setDocSubmitting] = useState(false);
  const [showDocPass, setShowDocPass] = useState(false);

  // Clinic setup form (for doctors with no clinic)
  const [setupForm, setSetupForm] = useState({ name: "", type: "General", address: "", contact: "" });
  const [settingUp, setSettingUp] = useState(false);

  // Clinic edit form
  const [showEditModal, setShowEditModal] = useState(false);
  const [editClinicForm, setEditClinicForm] = useState({ name: "", type: "General", address: "", contact: "" });
  const [updatingClinic, setUpdatingClinic] = useState(false);

  const [error, setError] = useState("");

  const loadClinicData = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await api.get("/opd/my-clinic");
      setClinic(res.data);
    } catch (e) {
      // Catch backend 400 when doctor has no clinic
      const msg = e.response?.data?.message || "Failed to load clinic details.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadClinicData();
  }, []);

  const handleSetupClinic = async (e) => {
    e.preventDefault();
    if (!setupForm.name.trim()) {
      toast.error("Validation Error", "Clinic Name is required");
      return;
    }
    setSettingUp(true);
    try {
      const res = await api.post("/opd/setup-clinic", setupForm);
      const { token, user } = res.data;
      
      // Update local storage with updated JWT token and user info
      localStorage.setItem("token", token);
      localStorage.setItem("user", JSON.stringify(user));
      localStorage.setItem("role", user.role);
      
      toast.success("Success", "Clinic set up successfully!");
      // Reload clinic data
      loadClinicData();
    } catch (e) {
      toast.error("Setup Failed", e.response?.data?.message || "Could not set up clinic");
    } finally {
      setSettingUp(false);
    }
  };

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

  const handleCreateDoctor = async (e) => {
    e.preventDefault();
    if (!docForm.name.trim() || !docForm.email.trim() || !docForm.password) {
      toast.error("Validation Error", "All fields are required");
      return;
    }
    setDocSubmitting(true);
    try {
      await api.post("/auth/create-doctor", docForm);
      toast.success("Success", "Doctor account created successfully!");
      setDocForm({ name: "", email: "", password: "" });
      loadClinicData();
    } catch (e) {
      toast.error("Creation Failed", e.response?.data?.message || "Could not create doctor account");
    } finally {
      setDocSubmitting(false);
    }
  };

  const handleDeleteDoctor = async (id, name) => {
    if (!window.confirm(`Are you sure you want to delete doctor "Dr. ${name}"? They will lose access immediately.`)) {
      return;
    }
    try {
      await api.delete(`/auth/doctor/${id}`);
      toast.success("Success", "Doctor deleted successfully");
      loadClinicData();
    } catch (e) {
      toast.error("Deletion Failed", e.response?.data?.message || "Could not delete doctor");
    }
  };

  const openEditModal = () => {
    if (clinic) {
      setEditClinicForm({
        name: clinic.name || "",
        type: clinic.type || "General",
        address: clinic.address || "",
        contact: clinic.contact || ""
      });
      setShowEditModal(true);
    }
  };

  const handleUpdateClinic = async (e) => {
    e.preventDefault();
    if (!editClinicForm.name.trim()) {
      toast.error("Validation Error", "Clinic Name is required");
      return;
    }
    setUpdatingClinic(true);
    try {
      const res = await api.put("/opd/my-clinic", editClinicForm);
      const { token, user: updatedUser } = res.data;
      
      // Update local storage
      localStorage.setItem("token", token);
      localStorage.setItem("user", JSON.stringify(updatedUser));
      
      // Dispatch sync events
      window.dispatchEvent(new Event("storage"));
      window.dispatchEvent(new Event("recent_patients_updated"));
      
      toast.success("Success", "Clinic details updated successfully!");
      setShowEditModal(false);
      loadClinicData();
    } catch (e) {
      toast.error("Update Failed", e.response?.data?.message || "Could not update clinic details");
    } finally {
      setUpdatingClinic(false);
    }
  };

  const hasNoClinic = error === "No clinic associated with your account";

  if (loading) {
    return (
      <div style={{ padding: "40px", textAlign: "center", color: "var(--text-secondary)" }}>
        Loading clinic and staff data...
      </div>
    );
  }

  // Clinic Setup Page UX
  if (hasNoClinic) {
    return (
      <div className="animate-fade-in" style={{ padding: "24px", maxWidth: "600px", margin: "0 auto" }}>
        <div className="page-header" style={{ marginBottom: "28px", textAlign: "center" }}>
          <h1 className="page-title" style={{ color: "var(--text-primary)" }}>🏥 Set Up Your Clinic</h1>
          <p className="page-subtitle" style={{ color: "var(--text-secondary)" }}>Register your clinic/OPD details to start managing staff and patients</p>
        </div>

        <div className="card" style={{ padding: 30, boxShadow: "0 10px 25px rgba(0,0,0,0.15)" }}>
          <form onSubmit={handleSetupClinic} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div>
              <label style={{ display: "block", fontSize: 13, fontWeight: 700, color: "var(--text-primary)", marginBottom: 6 }}>Clinic / OPD Name *</label>
              <input
                className="form-input"
                placeholder="e.g. Smile Dental Clinic"
                value={setupForm.name}
                onChange={e => setSetupForm({ ...setupForm, name: e.target.value })}
                required
                disabled={settingUp}
              />
            </div>

            <div>
              <label style={{ display: "block", fontSize: 13, fontWeight: 700, color: "var(--text-primary)", marginBottom: 6 }}>OPD Type *</label>
              <select
                className="form-input"
                value={setupForm.type}
                onChange={e => setSetupForm({ ...setupForm, type: e.target.value })}
                disabled={settingUp}
              >
                {OPD_TYPES.map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ display: "block", fontSize: 13, fontWeight: 700, color: "var(--text-primary)", marginBottom: 6 }}>Contact Number</label>
              <input
                className="form-input"
                placeholder="e.g. +91 98765 43210"
                value={setupForm.contact}
                onChange={e => setSetupForm({ ...setupForm, contact: e.target.value })}
                disabled={settingUp}
              />
            </div>

            <div>
              <label style={{ display: "block", fontSize: 13, fontWeight: 700, color: "var(--text-primary)", marginBottom: 6 }}>Clinic Address</label>
              <input
                className="form-input"
                placeholder="e.g. 123 Main St, New Delhi"
                value={setupForm.address}
                onChange={e => setSetupForm({ ...setupForm, address: e.target.value })}
                disabled={settingUp}
              />
            </div>

            <button
              type="submit"
              disabled={settingUp}
              style={{
                width: "100%",
                padding: "13px",
                borderRadius: "12px",
                border: "none",
                background: "linear-gradient(135deg, #3b82f6, #1d4ed8)",
                color: "#ffffff",
                fontSize: "15px",
                fontWeight: "700",
                cursor: settingUp ? "not-allowed" : "pointer",
                boxShadow: "0 4px 14px rgba(59,130,246,0.3)",
                transition: "all 0.2s ease",
                marginTop: "10px",
              }}
            >
              {settingUp ? "Setting up Clinic..." : "🚀 Initialize Clinic"}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in" style={{ padding: "24px", maxWidth: "1100px", margin: "0 auto" }}>
      <div className="page-header" style={{ marginBottom: "28px" }}>
        <h1 className="page-title" style={{ color: "var(--text-primary)" }}>👥 Staff Management</h1>
        <p className="page-subtitle" style={{ color: "var(--text-secondary)" }}>Manage doctors and receptionists for your clinic</p>
      </div>

      {error && !hasNoClinic && (
        <div style={{ background: "#fee2e2", color: "#dc2626", padding: "12px 16px", borderRadius: 8, marginBottom: 20, fontSize: 14 }}>
          {error}
        </div>
      )}

      {/* Clinic Details Card */}
      {clinic && (
        <div className="card" style={{ marginBottom: 24, padding: 20, background: "linear-gradient(135deg, rgba(37,99,235,0.06), rgba(31,41,55,0.02))", border: "1px solid rgba(37,99,235,0.15)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
            <div>
              <span style={{ fontSize: 11, background: "rgba(37,99,235,0.12)", color: "#2563eb", padding: "2px 8px", borderRadius: 20, fontWeight: 700, textTransform: "uppercase" }}>
                {clinic.type} OPD
              </span>
              <h2 style={{ fontSize: 22, fontWeight: 800, color: "var(--text-primary)", margin: "6px 0 2px" }}>{clinic.name}</h2>
              {clinic.address && <div style={{ fontSize: 13, color: "var(--text-secondary)" }}>📍 {clinic.address}</div>}
              {clinic.contact && <div style={{ fontSize: 13, color: "var(--text-secondary)", marginTop: 2 }}>📞 {clinic.contact}</div>}
            </div>

            {clinic && clinic.is_head && (
              <button
                onClick={openEditModal}
                className="btn btn-secondary"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "8px 16px",
                  borderRadius: 8,
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: "pointer",
                  background: "var(--color-surface)",
                  border: "1px solid var(--color-border)",
                  boxShadow: "var(--shadow-sm)",
                  transition: "all 0.2s"
                }}
              >
                ✏️ Edit Clinic Profile
              </button>
            )}
          </div>
        </div>
      )}

      {/* Information Banner if not Head Doctor */}
      {clinic && !clinic.is_head && (
        <div style={{ background: "rgba(37,99,235,0.06)", color: "var(--text-secondary)", padding: "12px 16px", borderRadius: 10, marginBottom: 20, fontSize: 13, display: "flex", alignItems: "center", gap: 8, border: "1px solid rgba(37,99,235,0.15)" }}>
          <span>ℹ️</span> Staff Management is read-only. Only the clinic head doctor (owner) can add or remove staff members.
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 24 }}>
        
        {/* Create Doctor Card (Only for Head Doctor) */}
        {clinic && clinic.is_head && (
          <div className="card" style={{ padding: 24 }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 20, color: "var(--text-primary)", display: "flex", alignItems: "center", gap: 8 }}>
              <span>🩺</span> Add Doctor
            </h2>
            <form onSubmit={handleCreateDoctor} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <label style={{ display: "block", fontSize: 13, fontWeight: 700, color: "var(--text-primary)", marginBottom: 6 }}>Full Name *</label>
                <input
                  className="form-input"
                  placeholder="e.g. Dr. Roy"
                  value={docForm.name}
                  onChange={e => setDocForm({ ...docForm, name: e.target.value })}
                  required
                  disabled={docSubmitting}
                />
              </div>
              <div>
                <label style={{ display: "block", fontSize: 13, fontWeight: 700, color: "var(--text-primary)", marginBottom: 6 }}>Email Address *</label>
                <input
                  type="email"
                  className="form-input"
                  placeholder="e.g. roy@clinic.com"
                  value={docForm.email}
                  onChange={e => setDocForm({ ...docForm, email: e.target.value })}
                  required
                  disabled={docSubmitting}
                />
              </div>
              <div>
                <label style={{ display: "block", fontSize: 13, fontWeight: 700, color: "var(--text-primary)", marginBottom: 6 }}>Password *</label>
                <div style={{ position: "relative" }}>
                  <input
                    type={showDocPass ? "text" : "password"}
                    className="form-input"
                    placeholder="Create secure password"
                    value={docForm.password}
                    onChange={e => setDocForm({ ...docForm, password: e.target.value })}
                    required
                    disabled={docSubmitting}
                    style={{ paddingRight: 40 }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowDocPass(!showDocPass)}
                    style={{
                      position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)",
                      background: "none", border: "none", color: "var(--text-secondary)", cursor: "pointer", fontSize: 14
                    }}
                  >
                    {showDocPass ? "🙈" : "👁️"}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={docSubmitting}
                style={{
                  width: "100%",
                  padding: "12px",
                  borderRadius: "10px",
                  border: "none",
                  background: "linear-gradient(135deg, #3b82f6, #1d4ed8)",
                  color: "#ffffff",
                  fontSize: "14px",
                  fontWeight: "700",
                  cursor: docSubmitting ? "not-allowed" : "pointer",
                  boxShadow: "0 4px 12px rgba(59,130,246,0.2)",
                  transition: "all 0.2s ease",
                  marginTop: "10px",
                }}
              >
                {docSubmitting ? "Adding Doctor..." : "Add Doctor Account"}
              </button>
            </form>
          </div>
        )}

        {/* Create Receptionist Card (Only for Head Doctor) */}
        {clinic && clinic.is_head && (
          <div className="card" style={{ padding: 24 }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 20, color: "var(--text-primary)", display: "flex", alignItems: "center", gap: 8 }}>
              <span>👥</span> Create Receptionist
            </h2>
            <form onSubmit={handleCreateReceptionist} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <label style={{ display: "block", fontSize: 13, fontWeight: 700, color: "var(--text-primary)", marginBottom: 6 }}>Full Name *</label>
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
                <label style={{ display: "block", fontSize: 13, fontWeight: 700, color: "var(--text-primary)", marginBottom: 6 }}>Email Address *</label>
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
                <label style={{ display: "block", fontSize: 13, fontWeight: 700, color: "var(--text-primary)", marginBottom: 6 }}>Password *</label>
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

              <button
                type="submit"
                disabled={submitting}
                style={{
                  width: "100%",
                  padding: "12px",
                  borderRadius: "10px",
                  border: "none",
                  background: "linear-gradient(135deg, #3b82f6, #1d4ed8)",
                  color: "#ffffff",
                  fontSize: "14px",
                  fontWeight: "700",
                  cursor: submitting ? "not-allowed" : "pointer",
                  boxShadow: "0 4px 12px rgba(59,130,246,0.2)",
                  transition: "all 0.2s ease",
                  marginTop: "10px",
                }}
              >
                {submitting ? "Creating Account..." : "Create Receptionist Account"}
              </button>
            </form>
          </div>
        )}

        {/* Doctors List Card */}
        <div className="card" style={{ padding: 24, display: "flex", flexDirection: "column" }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 20, color: "var(--text-primary)", display: "flex", alignItems: "center", gap: 8 }}>
            <span>🩺</span> Clinic Doctors
          </h2>

          {!clinic || !clinic.doctors_detail || clinic.doctors_detail.length === 0 ? (
            <div style={{ textAlign: "center", padding: "40px 20px", color: "var(--text-secondary)", flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
              No doctors registered in this clinic.
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10, overflowY: "auto", maxHeight: "350px", flex: 1 }}>
              {clinic.doctors_detail.map(doc => {
                const isSelf = doc._id === user.id || doc._id === user.user_id;
                return (
                  <div
                    key={doc._id}
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
                      <div style={{ fontWeight: 700, fontSize: 14, color: "var(--text-primary)" }}>
                        Dr. {doc.name} {isSelf && <span style={{ fontSize: 11, background: "rgba(37,99,235,0.15)", color: "#3b82f6", padding: "2px 6px", borderRadius: 4, marginLeft: 4 }}>You</span>}
                      </div>
                      <div style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 2 }}>{doc.email}</div>
                    </div>
                    {clinic.is_head && !isSelf && (
                      <button
                        onClick={() => handleDeleteDoctor(doc._id, doc.name)}
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
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Active Receptionists Card */}
        <div className="card" style={{ padding: 24, display: "flex", flexDirection: "column" }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 20, color: "var(--text-primary)", display: "flex", alignItems: "center", gap: 8 }}>
            <span>👥</span> Active Receptionists
          </h2>

          {!clinic || !clinic.receptionists_detail || clinic.receptionists_detail.length === 0 ? (
            <div style={{ textAlign: "center", padding: "40px 20px", color: "var(--text-secondary)", flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
              No receptionists created yet.
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
                    <div style={{ fontWeight: 700, fontSize: 14, color: "var(--text-primary)" }}>{rec.name}</div>
                    <div style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 2 }}>{rec.email}</div>
                  </div>
                  {clinic.is_head && (
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
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

      </div>

      {/* Edit Clinic Modal */}
      {showEditModal && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 1100,
          background: "rgba(15, 23, 42, 0.6)",
          backdropFilter: "blur(4px)",
          display: "flex", alignItems: "center", justifyContent: "center",
          padding: 20
        }}>
          <div className="card" style={{
            width: "100%", maxWidth: 540, maxHeight: "90vh",
            overflowY: "auto", padding: 28, boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.3)",
            background: "var(--color-surface)", border: "1px solid var(--color-border)"
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <h2 style={{ fontSize: 18, fontWeight: 800, margin: 0, fontFamily: "'Outfit', sans-serif", color: "var(--text-primary)" }}>
                ✏️ Edit Clinic Profile
              </h2>
              <button
                onClick={() => setShowEditModal(false)}
                style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer", color: "var(--text-secondary)" }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleUpdateClinic} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div>
                <label style={{ display: "block", fontSize: 13, fontWeight: 700, color: "var(--text-primary)", marginBottom: 6 }}>Clinic / OPD Name *</label>
                <input
                  className="form-input"
                  placeholder="e.g. Smile Dental Clinic"
                  value={editClinicForm.name}
                  onChange={e => setEditClinicForm({ ...editClinicForm, name: e.target.value })}
                  required
                  disabled={updatingClinic}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: 13, fontWeight: 700, color: "var(--text-primary)", marginBottom: 6 }}>OPD Type *</label>
                <select
                  className="form-input"
                  value={editClinicForm.type}
                  onChange={e => setEditClinicForm({ ...editClinicForm, type: e.target.value })}
                  disabled={updatingClinic}
                >
                  {OPD_TYPES.map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: "block", fontSize: 13, fontWeight: 700, color: "var(--text-primary)", marginBottom: 6 }}>Contact Number</label>
                <input
                  className="form-input"
                  placeholder="e.g. +91 98765 43210"
                  value={editClinicForm.contact}
                  onChange={e => setEditClinicForm({ ...editClinicForm, contact: e.target.value })}
                  disabled={updatingClinic}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: 13, fontWeight: 700, color: "var(--text-primary)", marginBottom: 6 }}>Clinic Address</label>
                <input
                  className="form-input"
                  placeholder="e.g. 123 Main St, New Delhi"
                  value={editClinicForm.address}
                  onChange={e => setEditClinicForm({ ...editClinicForm, address: e.target.value })}
                  disabled={updatingClinic}
                />
              </div>

              <div style={{ display: "flex", gap: 12, justifyContent: "flex-end", marginTop: 10 }}>
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="btn btn-secondary"
                  disabled={updatingClinic}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={updatingClinic}
                >
                  {updatingClinic ? "Saving Changes..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default StaffManagement;
