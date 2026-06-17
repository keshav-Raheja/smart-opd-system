import { useState } from "react";
import api from "../services/api";
import { useToast } from "../context/ToastContext";
import DentalChart from "./DentalChart";

function AddPatientForm({ fetchPatients, onSuccess }) {
  const toast = useToast();
  const [formData, setFormData] = useState({
    name: "", age: "", gender: "", phone: "", address: "", blood_group: ""
  });
  const [loading, setLoading] = useState(false);
  const [isHistorical, setIsHistorical] = useState(false);
  const [historicalDentalChart, setHistoricalDentalChart] = useState({});
  const [historicalForm, setHistoricalForm] = useState({
    historical_visits: "",
    historical_paid_amount: "",
    historical_diagnosis: "",
    historical_medicines: "",
  });

  const [diagSuggestions, setDiagSuggestions] = useState([]);
  const [showDiagSuggestions, setShowDiagSuggestions] = useState(false);
  const [medSuggestions, setMedSuggestions] = useState([]);
  const [showMedSuggestions, setShowMedSuggestions] = useState(false);

  const handleDiagChange = async (val) => {
    setHistoricalForm(prev => ({ ...prev, historical_diagnosis: val }));
    
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
    setHistoricalForm(prev => ({ ...prev, historical_medicines: val }));
    
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
    const tokens = historicalForm.historical_medicines.split(",");
    tokens[tokens.length - 1] = " " + medName;
    const updated = tokens.join(",").trim() + ", ";
    setHistoricalForm(prev => ({ ...prev, historical_medicines: updated }));
    setMedSuggestions([]);
    setShowMedSuggestions(false);
  };

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    const payload = {
      ...formData,
      is_historical: isHistorical,
      ...(isHistorical ? {
        historical_visits: parseInt(historicalForm.historical_visits) || 0,
        historical_paid_amount: parseFloat(historicalForm.historical_paid_amount) || 0,
        historical_diagnosis: historicalForm.historical_diagnosis,
        historical_medicines: historicalForm.historical_medicines,
        historical_dental_chart: historicalDentalChart,
      } : {})
    };

    try {
      await api.post("/patients/", payload);
      toast.success("Patient Added", `${formData.name} has been registered`);
      setFormData({ name: "", age: "", gender: "", phone: "", address: "", blood_group: "" });
      setHistoricalForm({ historical_visits: "", historical_paid_amount: "", historical_diagnosis: "", historical_medicines: "" });
      setHistoricalDentalChart({});
      setIsHistorical(false);
      fetchPatients();
      onSuccess?.();
    } catch (error) {
      toast.error("Error", error.response?.data?.message || "Could not add patient");
    } finally {
      setLoading(false);
    }
  };

  const FIELDS = [
    { name: "name",        label: "Full Name",    type: "text",   placeholder: "Patient full name",   required: true },
    { name: "age",         label: "Age",          type: "number", placeholder: "Age",                 required: true },
    { name: "gender",      label: "Gender",       type: "select", options: ["", "Male", "Female", "Other"], required: true },
    { name: "phone",       label: "Phone",        type: "tel",    placeholder: "+91 XXXXX XXXXX",     required: true },
    { name: "blood_group", label: "Blood Group",  type: "select", options: ["", "A+", "A-", "B+", "B-", "O+", "O-", "AB+", "AB-"], required: false },
    { name: "address",     label: "Address",      type: "text",   placeholder: "Full address",        required: false },
  ];

  return (
    <div className="card">
      <div className="card-header">
        <h2 className="card-title">👤 Register New Patient</h2>
      </div>
      <div className="card-body">
        <form onSubmit={handleSubmit}>
          <div className="grid-form-2" style={{ marginBottom: 16 }}>
          {FIELDS.map(({ name, label, type, placeholder, options, required }) => (
            <div key={name} className="form-group">
              <label className="form-label">{label}{required && " *"}</label>
              {type === "select" ? (
                <select
                  id={`patient-${name}`}
                  name={name}
                  value={formData[name]}
                  onChange={handleChange}
                  className="form-input form-select"
                  required={required}
                >
                  {options.map((opt) => (
                    <option key={opt} value={opt}>{opt || `Select ${label}`}</option>
                  ))}
                </select>
              ) : (
                <input
                  id={`patient-${name}`}
                  type={type}
                  name={name}
                  value={formData[name]}
                  onChange={handleChange}
                  className="form-input"
                  placeholder={placeholder}
                  required={required}
                  min={name === "age" ? 0 : undefined}
                  max={name === "age" ? 150 : undefined}
                />
              )}
            </div>
          ))}

          </div>

          {/* Historical Import Toggle */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, margin: "14px 0", padding: "10px", background: "var(--color-surface-2)", borderRadius: 8 }}>
            <input
              type="checkbox"
              id="is-historical-checkbox"
              checked={isHistorical}
              onChange={(e) => setIsHistorical(e.target.checked)}
              style={{ width: 18, height: 18, cursor: "pointer" }}
            />
            <label htmlFor="is-historical-checkbox" style={{ fontWeight: 600, fontSize: 13, color: "var(--color-text-secondary)", cursor: "pointer" }}>
              Import Existing Patient History (Prior Visits, Bills, & Treatments)
            </label>
          </div>

          {isHistorical && (
            <div className="animate-slide-down" style={{
              background: "var(--color-surface-3)",
              border: "1px dashed var(--color-border)",
              borderRadius: 12,
              padding: 16,
              marginBottom: 16,
            }}>
              <h3 style={{ fontSize: 14, fontWeight: 700, color: "var(--color-accent)", marginBottom: 12 }}>
                📜 Historical Patient Records
              </h3>
              
              <div className="grid-form-2" style={{ gap: 12, marginBottom: 12 }}>
                <div className="form-group">
                  <label className="form-label">Total Prior Visits *</label>
                  <input
                    type="number"
                    placeholder="e.g. 5"
                    min="1"
                    value={historicalForm.historical_visits}
                    onChange={(e) => setHistoricalForm({ ...historicalForm, historical_visits: e.target.value })}
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
                    value={historicalForm.historical_paid_amount}
                    onChange={(e) => setHistoricalForm({ ...historicalForm, historical_paid_amount: e.target.value })}
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
                  value={historicalForm.historical_diagnosis || ""}
                  onChange={(e) => handleDiagChange(e.target.value)}
                  onFocus={() => { if (diagSuggestions.length > 0) setShowDiagSuggestions(true); }}
                  className="form-input"
                  autoComplete="off"
                />
                {showDiagSuggestions && diagSuggestions.length > 0 && (
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
                      {diagSuggestions.map((diag) => (
                        <div
                          key={diag}
                          onClick={() => {
                            setHistoricalForm(prev => ({ ...prev, historical_diagnosis: diag }));
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
                  value={historicalForm.historical_medicines || ""}
                  onChange={(e) => handleMedChange(e.target.value)}
                  onFocus={() => { if (medSuggestions.length > 0) setShowMedSuggestions(true); }}
                  className="form-input"
                  autoComplete="off"
                />
                {showMedSuggestions && medSuggestions.length > 0 && (
                  <>
                    <div
                      style={{ position: "fixed", inset: 0, zIndex: 999 }}
                      onClick={() => setShowMedSuggestions(false)}
                    />
                    <div style={{
                      position: "absolute", top: "100%", left: 0, right: 0, zIndex: 1000,
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

              {JSON.parse(localStorage.getItem("user") || "{}")?.opd_type === "Dental" && (
                <div style={{ marginTop: 10, borderTop: "1px solid var(--color-border)", paddingTop: 10 }}>
                  <DentalChart
                    chart={historicalDentalChart}
                    onChange={setHistoricalDentalChart}
                    readOnly={false}
                    toothHistory={{}}
                  />
                </div>
              )}
            </div>
          )}

          <button
            id="add-patient-submit"
            type="submit"
            disabled={loading}
            className="btn btn-primary"
            style={{ width: "100%" }}
          >
            {loading ? (
              <><span className="spinner" style={{ width: 16, height: 16 }} /> Adding...</>
            ) : (
              "✅ Register Patient"
            )}
          </button>
        </form>
      </div>
    </div>
  );
}

export default AddPatientForm;