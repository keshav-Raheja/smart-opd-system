/**
 * ConsultationWorkspace.jsx
 * ─────────────────────────
 * Three-tab consultation interface:
 *   📋 Consultation — vitals, clinical notes, prescription, save
 *   📜 History      — patient history panel (visits, billing, diagnoses, medicines)
 *   💳 Billing      — bill creation after visit is saved
 */

import { useEffect, useState } from "react";
import api from "../services/api";
import { useToast } from "../context/ToastContext";
import PrescriptionMedicineCard from "./PrescriptionMedicineCard";
import BillingSection from "./BillingSection";
import PatientHistoryPanel from "./PatientHistoryPanel";
import DentalChart from "./DentalChart";

const VITAL_FIELDS = [
  { name: "blood_pressure", label: "Blood Pressure", placeholder: "e.g. 120/80", icon: "🩸", unit: "mmHg" },
  { name: "temperature",    label: "Temperature",    placeholder: "e.g. 98.6",   icon: "🌡️", unit: "°F"   },
  { name: "pulse",          label: "Pulse",          placeholder: "e.g. 72",     icon: "💓", unit: "bpm"  },
  { name: "weight",         label: "Weight",         placeholder: "e.g. 65",     icon: "⚖️", unit: "kg"   },
];

const EMPTY_FORM = {
  symptoms: "", diagnosis: "", notes: "",
  blood_pressure: "", temperature: "", pulse: "", weight: "",
  follow_up_date: "", follow_up_time: "", follow_up_duration: 15,
};

function ConsultationWorkspace({ patient, onWorkflowComplete }) {
  const toast = useToast();

  const [formData,     setFormData]     = useState(EMPTY_FORM);
  const [medicines,    setMedicines]    = useState([]);
  const [diagnosisSuggestions, setDiagnosisSuggestions] = useState([]);
  const [showDiagSuggestions, setShowDiagSuggestions] = useState(false);

  const handleDiagnosisChange = async (e) => {
    const value = e.target.value;
    setFormData((prev) => ({ ...prev, diagnosis: value }));
    
    if (value.trim().length < 2) {
      setDiagnosisSuggestions([]);
      return;
    }
    
    try {
      const response = await api.get(`/visits/diagnoses/search?query=${value}`);
      setDiagnosisSuggestions(response.data);
      setShowDiagSuggestions(true);
    } catch (err) {
      console.error("Error fetching diagnosis autocompletes", err);
    }
  };
  const [saving,       setSaving]       = useState(false);
  const [activeTab,    setActiveTab]    = useState("Consultation");
  const [savedVisitId, setSavedVisitId] = useState(null);
  const [visitCount,   setVisitCount]   = useState(0);  // for header badge
  const [dentalChart,  setDentalChart]  = useState({});

  // Refresh visit count whenever patient changes
  useEffect(() => {
    if (!patient?.patient_id) return;
    setActiveTab("Consultation");
    setFormData(EMPTY_FORM);
    setMedicines([]);
    setSavedVisitId(null);
    setDentalChart({});

    // Auto-update appointment status to "In Consultation" if it was "Checked-In"
    if (patient._id && patient.status === "Checked-In") {
      api.put(`/appointments/${patient._id}/status`, { status: "In Consultation" })
        .catch((err) => console.error("Error setting status to In Consultation", err));
    }

    api.get(`/visits/patient/${patient.patient_id}`)
      .then((r) => setVisitCount(r.data.length))
      .catch(() => setVisitCount(0));
  }, [patient]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === "follow_up_duration" ? (parseInt(value) || 15) : value
    }));
  };

  const addMedicine    = () => setMedicines((p) => [...p, { name: "", dosage: "", frequency: "", duration: "", instructions: "" }]);
  const removeMedicine = (i) => setMedicines((p) => p.filter((_, idx) => idx !== i));
  const handleMedicineChange = (index, field, value) => {
    setMedicines((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const saveConsultation = async () => {
    if (!formData.symptoms.trim()) {
      toast.warning("Missing Info", "Please enter at least the patient symptoms");
      return;
    }
    setSaving(true);
    try {
      const user = JSON.parse(localStorage.getItem("user") || "{}");
      const res = await api.post("/visits/", {
        patient_id:     patient.patient_id,
        patient_name:   patient.patient_name,
        appointment_id: patient._id, // Pass appointment ID to link & auto-complete
        doctor_name:    user?.name || "Doctor",
        ...formData,
        prescription:   medicines.filter((m) => m.name.trim()),
        dental_chart:   dentalChart,
      });

      setSavedVisitId(res.data.visit_id || null);
      setVisitCount((c) => c + 1);
      toast.success("Consultation Saved", "Visit recorded — create the bill in the Billing tab");
      setFormData(EMPTY_FORM);
      setMedicines([]);
      // Auto-switch to Billing
      setActiveTab("Billing");
    } catch (error) {
      toast.error("Failed", error.response?.data?.message || "Could not save consultation");
    } finally {
      setSaving(false);
    }
  };

  // ── Empty state ────────────────────────────────────────────────────────────
  if (!patient) {
    return (
      <div className="card" style={{ minHeight: "60vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ textAlign: "center", padding: 32 }}>
          <div style={{ fontSize: 64, marginBottom: 16 }}>🩺</div>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: "var(--color-text-secondary)", marginBottom: 8 }}>
            Consultation Workspace
          </h2>
          <p style={{ color: "var(--color-text-muted)", fontSize: 14 }}>
            Select a patient from the queue to begin
          </p>
        </div>
      </div>
    );
  }

  // ── Tabs config ────────────────────────────────────────────────────────────
  const tabs = [
    { id: "Consultation", icon: "📋", label: "Consultation" },
    {
      id: "History",
      icon: "📜",
      label: "History",
      badge: visitCount > 0 ? visitCount : null,
      badgeClass: "nav-badge",
    },
    {
      id: "Billing",
      icon: "💳",
      label: "Billing",
      badge: savedVisitId ? "Ready" : null,
      badgeClass: "nav-badge ai-badge",
    },
  ];

  return (
    <div className="card animate-fade-in" style={{ minHeight: "70vh", display: "flex", flexDirection: "column" }}>

      {/* ── Patient Header ─────────────────────────────────────────────────── */}
      <div style={{
        background: "linear-gradient(135deg, #eff6ff, #f5f3ff)",
        padding: "16px 20px",
        borderRadius: "var(--radius-lg) var(--radius-lg) 0 0",
        borderBottom: "1px solid var(--color-border)",
        display: "flex", alignItems: "center", gap: 14,
      }}>
        <div style={{
          width: 48, height: 48, borderRadius: "50%",
          background: "linear-gradient(135deg, #3b82f6, #8b5cf6)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 20, fontWeight: 700, color: "white", flexShrink: 0,
        }}>
          {patient.patient_name?.[0]?.toUpperCase() || "?"}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h2 style={{ fontFamily: "'Outfit', sans-serif", fontSize: 18, fontWeight: 800, margin: 0 }}>
            {patient.patient_name}
          </h2>
          <div style={{ fontSize: 12, color: "var(--color-text-secondary)", marginTop: 2 }}>
            {patient.patient_id && <span>ID: {patient.patient_id} · </span>}
            <span>{visitCount} previous visit{visitCount !== 1 ? "s" : ""}</span>
          </div>
        </div>
        {visitCount > 0 && (
          <div style={{
            padding: "4px 12px", borderRadius: 99,
            background: "#fef3c7", color: "#92400e",
            fontSize: 11, fontWeight: 700, flexShrink: 0,
          }}>
            🔁 Returning Patient
          </div>
        )}
      </div>

      {/* ── Tab Bar ───────────────────────────────────────────────────────── */}
      <div style={{ padding: "0 20px", background: "var(--color-surface-3)", borderBottom: "1px solid var(--color-border)" }}>
        <div className="tab-list" style={{ margin: 0 }}>
          {tabs.map((tab) => (
            <button
              key={tab.id}
              className={`tab-item${activeTab === tab.id ? " active" : ""}`}
              onClick={() => setActiveTab(tab.id)}
              style={{ display: "flex", alignItems: "center", gap: 6 }}
            >
              {tab.icon} {tab.label}
              {tab.badge && (
                <span className={tab.badgeClass} style={{ marginLeft: 2 }}>{tab.badge}</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* ── Tab Bodies ────────────────────────────────────────────────────── */}
      <div style={{ flex: 1, overflowY: "auto" }}>

        {/* ── History Tab ─────────────────────────────────────────────────── */}
        {activeTab === "History" && (
          <div className="card-body">
            <PatientHistoryPanel patient={patient} />
          </div>
        )}

        {/* ── Billing Tab ──────────────────────────────────────────────────── */}
        {activeTab === "Billing" && (
          <div className="card-body">
            <BillingSection
              patient={{
                patient_id:   patient.patient_id,
                patient_name: patient.patient_name,
                doctor_name:  JSON.parse(localStorage.getItem("user") || "{}")?.name || "",
                _id:          patient._id,
              }}
              visitId={savedVisitId}
              onBillCreated={() => {
                setSavedVisitId(null);
                onWorkflowComplete?.();
              }}
            />
          </div>
        )}

        {/* ── Consultation Tab ─────────────────────────────────────────────── */}
        {activeTab === "Consultation" && (
          <div className="card-body" style={{ display: "flex", flexDirection: "column", gap: 20 }}>

            {/* Vitals */}
            <div>
              <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 10, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                📊 Vital Signs
              </div>
              <div className="grid-vitals">
                {VITAL_FIELDS.map(({ name, label, placeholder, icon, unit }) => (
                  <div key={name} className="form-group">
                    <label className="form-label">{icon} {label} ({unit})</label>
                    <input
                      type="text"
                      name={name}
                      placeholder={placeholder}
                      value={formData[name]}
                      onChange={handleChange}
                      className="form-input"
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Dental Chart — only shown for Dental OPDs */}
            {JSON.parse(localStorage.getItem("user") || "{}")?.opd_type === "Dental" && (
              <div className="card" style={{ padding: 20, marginTop: 16 }}>
                <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 8, color: "var(--text-primary)" }}>Dental Chart</h3>
                <DentalChart
                  chart={dentalChart}
                  onChange={setDentalChart}
                  toothHistory={patient?.tooth_history || {}}
                />
              </div>
            )}

            <div className="divider" />

            {/* Clinical Notes */}
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div style={{ fontWeight: 700, fontSize: 13, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                📋 Clinical Notes
              </div>

              <div className="form-group">
                <label className="form-label">Symptoms *</label>
                <textarea
                  name="symptoms"
                  placeholder="Patient's presenting complaints and symptoms…"
                  value={formData.symptoms}
                  onChange={handleChange}
                  className="form-input"
                  rows={3}
                  style={{ resize: "vertical", lineHeight: 1.6 }}
                />
              </div>

              <div className="form-group" style={{ position: "relative" }}>
                <label className="form-label">Diagnosis</label>
                <input
                  type="text"
                  name="diagnosis"
                  placeholder="Primary diagnosis…"
                  value={formData.diagnosis || ""}
                  onChange={handleDiagnosisChange}
                  onFocus={() => { if (diagnosisSuggestions.length > 0) setShowDiagSuggestions(true); }}
                  className="form-input"
                  autoComplete="off"
                />
                {showDiagSuggestions && diagnosisSuggestions.length > 0 && (
                  <>
                    <div
                      style={{ position: "fixed", inset: 0, zIndex: 999 }}
                      onClick={() => setShowDiagSuggestions(false)}
                    />
                    <div style={{
                      position: "absolute", top: "100%", left: 0, right: 0, zIndex: 1000,
                      background: "white", border: "1px solid var(--color-border)",
                      borderRadius: 8, boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                      maxHeight: 180, overflowY: "auto", marginTop: 4, padding: 4
                    }}>
                      {diagnosisSuggestions.map((diag) => (
                        <div
                          key={diag}
                          onClick={() => {
                            setFormData((prev) => ({ ...prev, diagnosis: diag }));
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

              <div className="form-group">
                <label className="form-label">Doctor's Notes</label>
                <textarea
                  name="notes"
                  placeholder="Additional clinical observations, instructions…"
                  value={formData.notes}
                  onChange={handleChange}
                  className="form-input"
                  rows={2}
                  style={{ resize: "vertical" }}
                />
              </div>
            </div>

            <div className="divider" />

            {/* Prescription */}
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                <div style={{ fontWeight: 700, fontSize: 13, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                  💊 Prescription ({medicines.length} medicine{medicines.length !== 1 ? "s" : ""})
                </div>
                <button onClick={addMedicine} className="btn btn-secondary btn-sm">
                  + Add Medicine
                </button>
              </div>

              {medicines.length === 0 ? (
                <div style={{
                  padding: 16, borderRadius: 10, textAlign: "center",
                  border: "1px dashed var(--color-border)",
                  color: "var(--color-text-muted)", fontSize: 13,
                }}>
                  No medicines added · Click "Add Medicine" to prescribe
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {medicines.map((medicine, index) => (
                    <PrescriptionMedicineCard
                      key={index}
                      medicine={medicine}
                      index={index}
                      handleMedicineChange={handleMedicineChange}
                      removeMedicine={removeMedicine}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Follow-up Date, Time, and Duration */}
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "flex-end", width: "100%" }}>
              <div className="form-group" style={{ flex: 1, minWidth: 160, maxWidth: 220 }}>
                <label className="form-label">📅 Follow-up Date</label>
                <input
                  type="date"
                  name="follow_up_date"
                  value={formData.follow_up_date || ""}
                  onChange={handleChange}
                  className="form-input"
                />
              </div>
              {formData.follow_up_date && (
                <>
                  <div className="form-group" style={{ flex: 1, minWidth: 140, maxWidth: 180 }}>
                    <label className="form-label">🕒 Follow-up Time</label>
                    <input
                      type="time"
                      name="follow_up_time"
                      value={formData.follow_up_time || ""}
                      onChange={handleChange}
                      className="form-input"
                    />
                  </div>
                  <div className="form-group" style={{ flex: 1, minWidth: 140, maxWidth: 180 }}>
                    <label className="form-label">⏱️ Duration</label>
                    <select
                      name="follow_up_duration"
                      value={formData.follow_up_duration || 15}
                      onChange={handleChange}
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

            {/* Save Button */}
            <button
              onClick={saveConsultation}
              disabled={saving}
              className="btn btn-primary btn-lg"
              style={{ width: "100%" }}
              id="save-consultation-btn"
            >
              {saving ? (
                <><span className="spinner" style={{ width: 18, height: 18 }} /> Saving…</>
              ) : (
                "💾 Save Consultation"
              )}
            </button>

          </div>
        )}
      </div>
    </div>
  );
}

export default ConsultationWorkspace;