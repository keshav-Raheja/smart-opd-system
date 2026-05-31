import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import MainLayout from "../layouts/MainLayout";
import api from "../services/api";
import ReportUpload from "../components/ReportUpload";
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
                href={`http://127.0.0.1:5000/api/pdf/prescription/${id}`}
                target="_blank"
                rel="noreferrer"
                className="btn btn-success"
              >
                📄 Generate Prescription PDF
              </a>

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
    </MainLayout>
  );
}

export default PatientProfile;