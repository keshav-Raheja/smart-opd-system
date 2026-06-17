import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import MainLayout from "../layouts/MainLayout";
import api from "../services/api";
import ReportUpload from "../components/ReportUpload";
import DentalChart from "../components/DentalChart";
import { useToast } from "../context/ToastContext";

const TABS = ["Overview", "Visits", "Reports", "AI Analysis"];

const VITALS_META = [
  { key: "blood_pressure", label: "Blood Pressure", icon: "🩸", unit: "mmHg" },
  { key: "temperature",    label: "Temperature",    icon: "🌡️", unit: "°F" },
  { key: "pulse",          label: "Pulse Rate",     icon: "💓", unit: "bpm" },
  { key: "weight",         label: "Weight",         icon: "⚖️", unit: "kg" },
];

function PatientProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const userRole = user?.role;

  const [patient,  setPatient]  = useState(null);
  const [visits,   setVisits]   = useState([]);
  const [summary,  setSummary]  = useState(null);
  const [loading,  setLoading]  = useState(true);
  const [activeTab, setActiveTab] = useState("Overview");

  // Edit form states
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    name: "", age: "", gender: "", phone: "", address: "", blood_group: "",
    is_historical: false,
    historical_visits: "",
    historical_paid_amount: "",
    historical_diagnosis: "",
    historical_medicines: "",
    historical_follow_up_date: "",
    historical_follow_up_time: "",
    historical_follow_up_duration: 15,
  });
  const [editDentalChart, setEditDentalChart] = useState({});
  const [diagSuggestions, setDiagSuggestions] = useState([]);
  const [showDiagSuggestions, setShowDiagSuggestions] = useState(false);
  const [medSuggestions, setMedSuggestions] = useState([]);
  const [showMedSuggestions, setShowMedSuggestions] = useState(false);

  const startEditing = () => {
    const hasHistory = !!(patient.historical_visits || patient.historical_diagnosis || patient.historical_medicines || patient.historical_paid_amount || patient.historical_follow_up_date || Object.keys(patient.historical_dental_chart || {}).length > 0);
    setEditForm({
      name: patient.name || "",
      age: patient.age || "",
      gender: patient.gender || "",
      phone: patient.phone || "",
      address: patient.address || "",
      blood_group: patient.blood_group || "",
      is_historical: hasHistory,
      historical_visits: patient.historical_visits || "",
      historical_paid_amount: patient.historical_paid_amount || "",
      historical_diagnosis: patient.historical_diagnosis || "",
      historical_medicines: patient.historical_medicines || "",
      historical_follow_up_date: patient.historical_follow_up_date || "",
      historical_follow_up_time: patient.historical_follow_up_time || "",
      historical_follow_up_duration: patient.historical_follow_up_duration || 15,
    });
    setEditDentalChart(patient.historical_dental_chart || {});
    setIsEditing(true);
  };

  const handleDiagChange = async (val) => {
    setEditForm(prev => ({ ...prev, historical_diagnosis: val }));
    if (val.trim().length < 2) {
      setDiagSuggestions([]);
      return;
    }
    try {
      const response = await api.get(`/visits/diagnoses/search?query=${val}`);
      setDiagSuggestions(response.data);
      setShowDiagSuggestions(true);
    } catch (err) {
      console.error(err);
    }
  };

  const handleMedChange = async (val) => {
    setEditForm(prev => ({ ...prev, historical_medicines: val }));
    const tokens = val.split(",");
    const currentToken = tokens[tokens.length - 1].trim();
    if (currentToken.length < 2) {
      setMedSuggestions([]);
      return;
    }
    try {
      const response = await api.get(`/medicines/search?query=${currentToken}`);
      setMedSuggestions(response.data);
      setShowMedSuggestions(true);
    } catch (err) {
      console.error(err);
    }
  };

  const handleMedSelect = (medName) => {
    const tokens = editForm.historical_medicines.split(",");
    tokens[tokens.length - 1] = " " + medName;
    const updated = tokens.join(",").trim() + ", ";
    setEditForm(prev => ({ ...prev, historical_medicines: updated }));
    setMedSuggestions([]);
    setShowMedSuggestions(false);
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        name: editForm.name,
        age: parseInt(editForm.age) || 0,
        gender: editForm.gender,
        phone: editForm.phone,
        address: editForm.address,
        blood_group: editForm.blood_group,
        is_historical: editForm.is_historical,
        ...(editForm.is_historical ? {
          historical_visits: parseInt(editForm.historical_visits) || 0,
          historical_paid_amount: parseFloat(editForm.historical_paid_amount) || 0,
          historical_diagnosis: editForm.historical_diagnosis,
          historical_medicines: editForm.historical_medicines,
          historical_dental_chart: editDentalChart,
          historical_follow_up_date: editForm.historical_follow_up_date,
          historical_follow_up_time: editForm.historical_follow_up_time,
          historical_follow_up_duration: parseInt(editForm.historical_follow_up_duration) || 15,
        } : {})
      };

      await api.put(`/patients/${id}`, payload);
      toast.success("Patient Updated", "Profile and history changes have been saved.");
      setIsEditing(false);
      fetchPatient();
      fetchVisits();
      fetchSummary();
    } catch (err) {
      toast.error("Error", err.response?.data?.message || "Failed to update patient profile.");
    }
  };

  const fetchPatient = async () => {
    try {
      const response = await api.get(`/patients/${id}`);
      setPatient(response.data);
    } catch (error) {
      toast.error("Error", "Could not load patient details");
    }
  };

  const fetchVisits = async () => {
    try {
      const response = await api.get(`/visits/patient/${id}`);
      setVisits(response.data);
    } catch (error) {
      console.error(error);
    }
  };

  const fetchSummary = async () => {
    try {
      const response = await api.get(`/visits/summary/${id}`);
      setSummary(response.data);
    } catch (error) {
      console.error(error);
    }
  };

  const handleDeletePatient = async () => {
    const doubleConfirm = window.confirm(
      `⚠️ WARNING: PERMANENT DELETION\n\n` +
      `Are you sure you want to permanently delete patient "${patient?.name}"?\n\n` +
      `This action will permanently erase their entire record from the clinic database, including:\n` +
      `• Scheduled Appointments\n` +
      `• Clinical Visit Encounters\n` +
      `• Digital Prescriptions\n` +
      `• Billing Invoices & Financial Records\n\n` +
      `THIS ACTION IS IRREVERSIBLE. Do you wish to proceed?`
    );

    if (!doubleConfirm) return;

    try {
      await api.delete(`/patients/${id}`);
      toast.success(
        "Patient Deleted", 
        `Patient ${patient?.name} and all associated records deleted permanently.`
      );
      navigate("/patients");
    } catch (error) {
      toast.error("Failed to Delete", error.response?.data?.message || "Could not delete patient");
    }
  };

  useEffect(() => {
    Promise.all([fetchPatient(), fetchVisits(), fetchSummary()]).finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <MainLayout>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {[...Array(3)].map((_, i) => (
            <div key={i} className="card" style={{ padding: 24 }}>
              <div className="skeleton" style={{ width: "40%", height: 24, marginBottom: 16 }} />
              <div className="skeleton" style={{ width: "70%", height: 14, marginBottom: 8 }} />
              <div className="skeleton" style={{ width: "50%", height: 14 }} />
            </div>
          ))}
        </div>
      </MainLayout>
    );
  }

  if (!patient) {
    return (
      <MainLayout>
        <div className="card">
          <div className="empty-state">
            <span className="empty-state-icon">❌</span>
            <div className="empty-state-title">Patient not found</div>
          </div>
        </div>
      </MainLayout>
    );
  }

  const bloodGroupColors = {
    "A+": "#dbeafe", "A-": "#eff6ff", "B+": "#d1fae5", "B-": "#ecfdf5",
    "O+": "#fef3c7", "O-": "#fffbeb", "AB+": "#ede9fe", "AB-": "#f5f3ff",
  };
  const bloodGroupTextColors = {
    "A+": "#1e40af", "A-": "#1e3a8a", "B+": "#065f46", "B-": "#064e3b",
    "O+": "#92400e", "O-": "#78350f", "AB+": "#5b21b6", "AB-": "#4c1d95",
  };

  return (
    <MainLayout>
      <div className="animate-fade-in">
        {/* Patient Hero Card */}
        <div className="card" style={{ marginBottom: 20, padding: 28 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
              {/* Avatar */}
              <div style={{
                width: 72,
                height: 72,
                borderRadius: "50%",
                background: `linear-gradient(135deg, ${patient.gender === "Female" ? "#ec4899, #8b5cf6" : "#3b82f6, #1d4ed8"})`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 28,
                fontWeight: 800,
                color: "white",
                boxShadow: "0 4px 16px rgba(59,130,246,0.3)",
                flexShrink: 0,
              }}>
                {patient.name?.[0]?.toUpperCase() || "?"}
              </div>

              <div>
                <h1 style={{
                  fontFamily: "'Outfit', sans-serif",
                  fontSize: 26,
                  fontWeight: 800,
                  color: "var(--color-text-primary)",
                  letterSpacing: "-0.5px",
                  marginBottom: 4,
                }}>
                  {patient.name}
                </h1>
                <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                  <span style={{ fontSize: 14, color: "var(--color-text-secondary)" }}>
                    {patient.gender} · {patient.age} years
                  </span>
                  {patient.blood_group && (
                    <span style={{
                      padding: "3px 10px",
                      borderRadius: "9999px",
                      fontSize: 12,
                      fontWeight: 700,
                      background: bloodGroupColors[patient.blood_group] || "#f1f5f9",
                      color: bloodGroupTextColors[patient.blood_group] || "#475569",
                    }}>
                      {patient.blood_group}
                    </span>
                  )}
                  {patient.phone && (
                    <span style={{ fontSize: 13, color: "var(--color-text-secondary)" }}>
                      📞 {patient.phone}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
              {/* PDF Button */}
              <a
                href={`${api.defaults.baseURL}/pdf/prescription/${id}`}
                target="_blank"
                rel="noreferrer"
                className="btn btn-success"
              >
                📄 Generate Prescription PDF
              </a>

              {/* Edit Button */}
              {(userRole === "Doctor" || userRole === "Admin") && (
                <button
                  onClick={startEditing}
                  className="btn"
                  style={{
                    background: "rgba(59, 130, 246, 0.1)",
                    border: "1px solid #3b82f6",
                    color: "#3b82f6",
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "10px 16px",
                    borderRadius: "8px",
                    fontWeight: 600,
                    cursor: "pointer",
                    transition: "all 0.2s",
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = "#3b82f6"; e.currentTarget.style.color = "white"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(59, 130, 246, 0.1)"; e.currentTarget.style.color = "#3b82f6"; }}
                >
                  ✏️ Edit Profile & History
                </button>
              )}

              {/* Delete Button */}
              {(userRole === "Doctor" || userRole === "Admin") && (
                <button
                  onClick={handleDeletePatient}
                  className="btn"
                  style={{
                    background: "rgba(239, 68, 68, 0.1)",
                    border: "1px solid #ef4444",
                    color: "#ef4444",
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "10px 16px",
                    borderRadius: "8px",
                    fontWeight: 600,
                    cursor: "pointer",
                    transition: "all 0.2s",
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = "#ef4444"; e.currentTarget.style.color = "white"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(239, 68, 68, 0.1)"; e.currentTarget.style.color = "#ef4444"; }}
                >
                  🗑️ Delete Patient
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ marginBottom: 20 }}>
          <div className="tab-list">
            {TABS.map((tab) => (
              <button
                key={tab}
                className={`tab-item${activeTab === tab ? " active" : ""}`}
                onClick={() => setActiveTab(tab)}
              >
                {tab === "AI Analysis" ? "🤖 " : ""}{tab}
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        <div className="animate-fade-in" key={activeTab}>
          {/* OVERVIEW TAB */}
          {activeTab === "Overview" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

              {/* Lifetime Billing Stats */}
              {summary && (
                <div className="grid-stats">
                  {[
                    { label: "Total Visits",   value: summary.total_visits ?? 0,                                              icon: "🏥", bg: "linear-gradient(135deg,#3b82f6,#1d4ed8)" },
                    { label: "Total Billed",   value: `₹${Number(summary.billing?.total_billed  || 0).toLocaleString("en-IN")}`, icon: "🧾", bg: "linear-gradient(135deg,#8b5cf6,#6d28d9)" },
                    { label: "Total Paid",     value: `₹${Number(summary.billing?.total_paid    || 0).toLocaleString("en-IN")}`, icon: "💰", bg: "linear-gradient(135deg,#10b981,#059669)" },
                    { label: "Outstanding",    value: `₹${Number(summary.billing?.total_due     || 0).toLocaleString("en-IN")}`, icon: "⏳", bg: "linear-gradient(135deg,#f59e0b,#d97706)" },
                  ].map((s) => (
                    <div key={s.label} style={{
                      background: s.bg, color: "white",
                      borderRadius: "var(--radius-lg)", padding: "14px 16px",
                    }}>
                      <div style={{ fontSize: 20 }}>{s.icon}</div>
                      <div style={{ fontSize: 22, fontWeight: 800, fontFamily: "'Outfit',sans-serif", lineHeight: 1.1 }}>{s.value}</div>
                      <div style={{ fontSize: 11, fontWeight: 600, opacity: 0.85 }}>{s.label}</div>
                    </div>
                  ))}
                </div>
              )}

              <div className="grid-form-2">
                <div className="card">
                  <div className="card-header">
                    <h2 className="card-title">👤 Patient Information</h2>
                  </div>
                <div className="card-body">
                  <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                    {[
                      { label: "Full Name", value: patient.name },
                      { label: "Age", value: `${patient.age} years` },
                      { label: "Gender", value: patient.gender },
                      { label: "Phone", value: patient.phone || "—" },
                      { label: "Blood Group", value: patient.blood_group || "—" },
                      { label: "Address", value: patient.address || "—" },
                    ].map(({ label, value }) => (
                      <div key={label} style={{ display: "flex", gap: 12 }}>
                        <span style={{ fontWeight: 600, fontSize: 13, color: "var(--color-text-secondary)", width: 100, flexShrink: 0 }}>
                          {label}
                        </span>
                        <span style={{ fontSize: 14, color: "var(--color-text-primary)" }}>{value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="card">
                <div className="card-header">
                  <h2 className="card-title">📊 Visit Summary</h2>
                </div>
                <div className="card-body">
                  <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                    <div style={{ textAlign: "center", padding: "20px 0" }}>
                      <div style={{ fontSize: 48, fontWeight: 800, color: "var(--color-accent)" }}>
                        {visits.length}
                      </div>
                      <div style={{ fontSize: 14, color: "var(--color-text-secondary)", marginTop: 4 }}>
                        Total Visits
                      </div>
                    </div>
                    {visits.length > 0 && (
                      <div style={{ background: "var(--color-surface-3)", borderRadius: 12, padding: "14px 16px" }}>
                        <div style={{ fontSize: 12, color: "var(--color-text-muted)", marginBottom: 4 }}>Last Visit Diagnosis</div>
                        <div style={{ fontSize: 14, fontWeight: 600, color: "var(--color-text-primary)" }}>
                          {visits[0]?.diagnosis || "N/A"}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              </div>
            </div>
          )}



          {/* VISITS TAB */}
          {activeTab === "Visits" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {visits.length === 0 ? (
                <div className="card">
                  <div className="empty-state">
                    <span className="empty-state-icon">🩺</span>
                    <div className="empty-state-title">No visits recorded</div>
                    <p style={{ fontSize: 14 }}>Visit history will appear here</p>
                  </div>
                </div>
              ) : (
                visits.map((visit, i) => (
                  <div key={visit._id} className={`card animate-fade-in stagger-${Math.min(i+1,4)}`}>
                    <div className="card-header">
                      <div>
                        <h3 style={{ fontWeight: 700, fontSize: 15 }}>Visit #{visits.length - i}</h3>
                        <div style={{ fontSize: 12, color: "var(--color-text-muted)" }}>
                          Dr. {visit.doctor_name} · {visit.created_at ? new Date(visit.created_at).toLocaleDateString("en-IN") : ""}
                        </div>
                      </div>
                      {visit.follow_up_date && (
                        <span style={{
                          padding: "4px 12px",
                          background: "#dbeafe",
                          color: "#1e40af",
                          borderRadius: 9999,
                          fontSize: 12,
                          fontWeight: 600,
                        }}>
                          Follow-up: {visit.follow_up_date}
                        </span>
                      )}
                    </div>
                    <div className="card-body">
                      {/* Vitals */}
                      {visit.vitals && Object.values(visit.vitals).some(Boolean) && (
                        <div style={{
                          display: "grid",
                          gridTemplateColumns: "repeat(4, 1fr)",
                          gap: 12,
                          marginBottom: 16,
                          padding: "14px",
                          background: "var(--color-surface-3)",
                          borderRadius: 12,
                        }}>
                          {VITALS_META.map(({ key, label, icon, unit }) => (
                            visit.vitals[key] ? (
                              <div key={key} style={{ textAlign: "center" }}>
                                <div style={{ fontSize: 18, marginBottom: 4 }}>{icon}</div>
                                <div style={{ fontSize: 15, fontWeight: 700, color: "var(--color-text-primary)" }}>
                                  {visit.vitals[key]}
                                </div>
                                <div style={{ fontSize: 11, color: "var(--color-text-muted)" }}>{label}</div>
                              </div>
                            ) : null
                          ))}
                        </div>
                      )}

                      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                        {visit.symptoms && (
                          <div>
                            <span style={{ fontWeight: 600, fontSize: 13, color: "var(--color-text-secondary)" }}>Symptoms: </span>
                            <span style={{ fontSize: 14 }}>{visit.symptoms}</span>
                          </div>
                        )}
                        {visit.diagnosis && (
                          <div>
                            <span style={{ fontWeight: 600, fontSize: 13, color: "var(--color-text-secondary)" }}>Diagnosis: </span>
                            <span style={{ fontSize: 14 }}>{visit.diagnosis}</span>
                          </div>
                        )}
                        {visit.notes && (
                          <div>
                            <span style={{ fontWeight: 600, fontSize: 13, color: "var(--color-text-secondary)" }}>Notes: </span>
                            <span style={{ fontSize: 14 }}>{visit.notes}</span>
                          </div>
                        )}
                      </div>

                      {/* Medicines */}
                      {visit.prescription?.length > 0 && (
                        <div style={{ marginTop: 16 }}>
                          <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 10 }}>💊 Prescribed Medicines</div>
                          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                            {visit.prescription.map((med, j) => (
                              <div key={j} style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 12,
                                padding: "10px 14px",
                                background: "var(--color-surface-2)",
                                borderRadius: 10,
                                border: "1px solid var(--color-border)",
                              }}>
                                <span style={{
                                  width: 32, height: 32,
                                  background: "#dbeafe",
                                  color: "#1e40af",
                                  borderRadius: 8,
                                  display: "flex", alignItems: "center", justifyContent: "center",
                                  fontSize: 14, fontWeight: 700, flexShrink: 0,
                                }}>
                                  {j + 1}
                                </span>
                                <div style={{ flex: 1 }}>
                                  <div style={{ fontWeight: 700, fontSize: 14 }}>{med.name}</div>
                                  <div style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>
                                    {med.dosage} · {med.frequency} · {med.duration}
                                    {med.instructions && ` · ${med.instructions}`}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* REPORTS TAB */}
          {activeTab === "Reports" && (
            <ReportUpload patientId={id} />
          )}

          {/* AI ANALYSIS TAB */}
          {activeTab === "AI Analysis" && (
            <div className="card">
              <div className="card-header">
                <h2 className="card-title">🤖 AI Medical Report Analysis</h2>
              </div>
              <div className="card-body" style={{ textAlign: "center", padding: "40px" }}>
                <div style={{ fontSize: 56, marginBottom: 16 }}>🧬</div>
                <h3 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>Advanced AI Analysis</h3>
                <p style={{ color: "var(--color-text-secondary)", fontSize: 14, marginBottom: 24, maxWidth: 400, margin: "0 auto 24px" }}>
                  Upload a medical report in the Reports tab, then use the full AI Report Analysis feature for detailed insights.
                </p>
                <a href="/ai-support" className="btn btn-ai btn-lg">
                  🤖 Open AI Report Analysis →
                </a>
              </div>
            </div>
          )}
        </div>
      </div>

      {isEditing && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 1100,
          background: "rgba(15, 23, 42, 0.6)",
          backdropFilter: "blur(4px)",
          display: "flex", alignItems: "center", justifyContent: "center",
          padding: 20
        }}>
          <div className="card" style={{
            width: "100%", maxWidth: 680, maxHeight: "90vh",
            overflowY: "auto", padding: 24, boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.3)"
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <h2 style={{ fontSize: 18, fontWeight: 800, margin: 0, fontFamily: "'Outfit', sans-serif" }}>
                ✏️ Edit Patient Profile & History
              </h2>
              <button
                onClick={() => setIsEditing(false)}
                style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer", color: "var(--color-text-secondary)" }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleEditSubmit}>
              <div className="grid-form-2" style={{ gap: 12, marginBottom: 16 }}>
                <div className="form-group">
                  <label className="form-label">Full Name *</label>
                  <input
                    type="text"
                    value={editForm.name}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                    className="form-input"
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Age *</label>
                  <input
                    type="number"
                    value={editForm.age}
                    onChange={(e) => setEditForm({ ...editForm, age: e.target.value })}
                    className="form-input"
                    required
                    min="0"
                    max="150"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Gender *</label>
                  <select
                    value={editForm.gender}
                    onChange={(e) => setEditForm({ ...editForm, gender: e.target.value })}
                    className="form-input form-select"
                    required
                  >
                    <option value="">Select Gender</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Phone *</label>
                  <input
                    type="tel"
                    value={editForm.phone}
                    onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                    className="form-input"
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Blood Group</label>
                  <select
                    value={editForm.blood_group}
                    onChange={(e) => setEditForm({ ...editForm, blood_group: e.target.value })}
                    className="form-input form-select"
                  >
                    <option value="">Select Blood Group</option>
                    {["A+", "A-", "B+", "B-", "O+", "O-", "AB+", "AB-"].map((bg) => (
                      <option key={bg} value={bg}>{bg}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Address</label>
                  <input
                    type="text"
                    value={editForm.address}
                    onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                    className="form-input"
                  />
                </div>
              </div>

              {/* Historical Toggle */}
              <div style={{
                display: "flex", alignItems: "center", gap: 8,
                margin: "14px 0", padding: "10px",
                background: "var(--color-surface-2)", borderRadius: 8
              }}>
                <input
                  type="checkbox"
                  id="edit-is-historical-checkbox"
                  checked={editForm.is_historical}
                  onChange={(e) => setEditForm({ ...editForm, is_historical: e.target.checked })}
                  style={{ width: 18, height: 18, cursor: "pointer" }}
                />
                <label htmlFor="edit-is-historical-checkbox" style={{ fontWeight: 600, fontSize: 13, color: "var(--color-text-secondary)", cursor: "pointer" }}>
                  Include Historical Patient Records (Prior Visits, Bills, & Treatments)
                </label>
              </div>

              {editForm.is_historical && (
                <div style={{
                  background: "var(--color-surface-3)",
                  border: "1px dashed var(--color-border)",
                  borderRadius: 12,
                  padding: 16,
                  marginBottom: 16,
                }}>
                  <h3 style={{ fontSize: 13, fontWeight: 700, color: "var(--color-accent)", marginBottom: 12 }}>
                    📜 Historical Patient Records
                  </h3>
                  
                  <div className="grid-form-2" style={{ gap: 12, marginBottom: 12 }}>
                    <div className="form-group">
                      <label className="form-label">Total Prior Visits *</label>
                      <input
                        type="number"
                        placeholder="e.g. 5"
                        min="1"
                        value={editForm.historical_visits}
                        onChange={(e) => setEditForm({ ...editForm, historical_visits: e.target.value })}
                        className="form-input"
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Total Amount Paid previously (₹) *</label>
                      <input
                        type="number"
                        placeholder="e.g. 2500"
                        min="0"
                        value={editForm.historical_paid_amount}
                        onChange={(e) => setEditForm({ ...editForm, historical_paid_amount: e.target.value })}
                        className="form-input"
                        required
                      />
                    </div>
                  </div>

                  <div className="form-group" style={{ marginBottom: 12, position: "relative" }}>
                    <label className="form-label">Prior Diagnoses Summary</label>
                    <input
                      type="text"
                      placeholder="e.g. Chronic Periodontitis, Deep caries"
                      value={editForm.historical_diagnosis || ""}
                      onChange={(e) => handleDiagChange(e.target.value)}
                      onFocus={() => { if (diagSuggestions.length > 0) setShowDiagSuggestions(true); }}
                      className="form-input"
                      autoComplete="off"
                    />
                    {showDiagSuggestions && diagSuggestions.length > 0 && (
                      <>
                        <div
                          style={{ position: "fixed", inset: 0, zIndex: 1199 }}
                          onClick={() => setShowDiagSuggestions(false)}
                        />
                        <div style={{
                          position: "absolute", top: "100%", left: 0, right: 0, zIndex: 1200,
                          background: "white", border: "1px solid var(--color-border)",
                          borderRadius: 8, boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                          maxHeight: 180, overflowY: "auto", marginTop: 4, padding: 4
                        }}>
                          {diagSuggestions.map((diag) => (
                            <div
                              key={diag}
                              onClick={() => {
                                setEditForm(prev => ({ ...prev, historical_diagnosis: diag }));
                                setShowDiagSuggestions(false);
                              }}
                              style={{
                                padding: "8px 12px", cursor: "pointer", borderRadius: 6,
                                fontSize: 13, color: "var(--color-text-primary)"
                              }}
                              onMouseEnter={(e) => e.currentTarget.style.background = "#f3f4f6"}
                              onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
                            >
                              {diag}
                            </div>
                          ))}
                        </div>
                      </>
                    )}
                  </div>

                  <div className="form-group" style={{ marginBottom: 16, position: "relative" }}>
                    <label className="form-label">Prior Prescribed Medicines (Comma separated)</label>
                    <input
                      type="text"
                      placeholder="e.g. Amoxicillin 500mg, Paracetamol 650mg"
                      value={editForm.historical_medicines || ""}
                      onChange={(e) => handleMedChange(e.target.value)}
                      onFocus={() => { if (medSuggestions.length > 0) setShowMedSuggestions(true); }}
                      className="form-input"
                      autoComplete="off"
                    />
                    {showMedSuggestions && medSuggestions.length > 0 && (
                      <>
                        <div
                          style={{ position: "fixed", inset: 0, zIndex: 1199 }}
                          onClick={() => setShowMedSuggestions(false)}
                        />
                        <div style={{
                          position: "absolute", top: "100%", left: 0, right: 0, zIndex: 1200,
                          background: "white", border: "1px solid var(--color-border)",
                          borderRadius: 8, boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                          maxHeight: 180, overflowY: "auto", marginTop: 4, padding: 4
                        }}>
                          {medSuggestions.map((med) => (
                            <div
                              key={med.id || med.name}
                              onClick={() => handleMedSelect(med.name)}
                              style={{
                                padding: "8px 12px", cursor: "pointer", borderRadius: 6,
                                fontSize: 13, color: "var(--color-text-primary)"
                              }}
                              onMouseEnter={(e) => e.currentTarget.style.background = "#f3f4f6"}
                              onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
                            >
                              <span style={{ fontWeight: 600 }}>{med.name}</span>
                              {med.therapeutic_class && (
                                <span style={{ fontSize: 11, color: "var(--color-text-muted)", marginLeft: 6 }}>
                                  ({med.therapeutic_class})
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      </>
                    )}
                  </div>

                  {/* Historical Follow-up Appointment Configuration */}
                  <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "flex-end", width: "100%", marginBottom: 12 }}>
                    <div className="form-group" style={{ flex: 1, minWidth: 160, maxWidth: 220 }}>
                      <label className="form-label">📅 Future Follow-up Date</label>
                      <input
                        type="date"
                        value={editForm.historical_follow_up_date || ""}
                        onChange={(e) => setEditForm({ ...editForm, historical_follow_up_date: e.target.value })}
                        className="form-input"
                      />
                    </div>
                    {editForm.historical_follow_up_date && (
                      <>
                        <div className="form-group" style={{ flex: 1, minWidth: 140, maxWidth: 180 }}>
                          <label className="form-label">🕒 Follow-up Time</label>
                          <input
                            type="time"
                            value={editForm.historical_follow_up_time || ""}
                            onChange={(e) => setEditForm({ ...editForm, historical_follow_up_time: e.target.value })}
                            className="form-input"
                          />
                        </div>
                        <div className="form-group" style={{ flex: 1, minWidth: 140, maxWidth: 180 }}>
                          <label className="form-label">⏱️ Duration</label>
                          <select
                            value={editForm.historical_follow_up_duration || 15}
                            onChange={(e) => setEditForm({ ...editForm, historical_follow_up_duration: parseInt(e.target.value) || 15 })}
                            className="form-input form-select"
                          >
                            <option value={15}>15 Mins (Default)</option>
                            <option value={30}>30 Mins</option>
                            <option value={45}>45 Mins</option>
                            <option value={60}>60 Mins</option>
                          </select>
                        </div>
                      </>
                    )}
                  </div>

                  {user?.opd_type === "Dental" && (
                    <div style={{ marginTop: 10, borderTop: "1px solid var(--color-border)", paddingTop: 10 }}>
                      <DentalChart
                        chart={editDentalChart}
                        onChange={setEditDentalChart}
                        readOnly={false}
                        toothHistory={{}}
                      />
                    </div>
                  )}
                </div>
              )}

              <div style={{ display: "flex", gap: 12, justifyContent: "flex-end", marginTop: 20 }}>
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="btn"
                  style={{ background: "var(--color-surface-3)", border: "1px solid var(--color-border)" }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </MainLayout>
  );
}

export default PatientProfile;