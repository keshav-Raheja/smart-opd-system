import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import api from "../services/api";
import AddPatientForm from "../components/AddPatientForm";
import { useToast } from "../context/ToastContext";

const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "O+", "O-", "AB+", "AB-"];

const bloodGroupColor = (bg) => {
  const map = {
    "A+": "#dbeafe", "A-": "#eff6ff",
    "B+": "#d1fae5", "B-": "#ecfdf5",
    "O+": "#fef3c7", "O-": "#fffbeb",
    "AB+": "#ede9fe", "AB-": "#f5f3ff",
  };
  return map[bg] || "#f1f5f9";
};

const bloodGroupTextColor = (bg) => {
  const map = {
    "A+": "#1e40af", "A-": "#1e3a8a",
    "B+": "#065f46", "B-": "#064e3b",
    "O+": "#92400e", "O-": "#78350f",
    "AB+": "#5b21b6", "AB-": "#4c1d95",
  };
  return map[bg] || "#475569";
};

function Patients() {
  const [patients, setPatients] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  const fetchPatients = async () => {
    try {
      const response = await api.get("/patients/");
      setPatients(response.data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPatients();
  }, []);

  const filtered = patients.filter((p) =>
    p.name?.toLowerCase().includes(search.toLowerCase()) ||
    p.phone?.includes(search) ||
    p.blood_group?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="page-header flex-between">
        <div>
          <h1 className="page-title">👥 Patients</h1>
          <p className="page-subtitle">{patients.length} total patients registered</p>
        </div>
        <button
          className="btn btn-primary"
          onClick={() => setShowForm(!showForm)}
        >
          {showForm ? "✕ Cancel" : "+ Add Patient"}
        </button>
      </div>

      {/* Add Patient Form */}
      {showForm && (
        <div className="animate-slide-down" style={{ marginBottom: 24 }}>
          <AddPatientForm fetchPatients={fetchPatients} onSuccess={() => setShowForm(false)} />
        </div>
      )}

      {/* Search Bar */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-body" style={{ padding: "16px 20px" }}>
          <div className="search-wrapper">
            <span className="search-icon">🔍</span>
            <input
              id="patient-search"
              type="text"
              className="form-input search-input"
              placeholder="Search by name, phone or blood group..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Patients Grid */}
      {loading ? (
        <div className="grid-patient-cards">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="card" style={{ padding: 20 }}>
              <div className="skeleton" style={{ width: "60%", height: 20, marginBottom: 12 }} />
              <div className="skeleton" style={{ width: "40%", height: 14, marginBottom: 8 }} />
              <div className="skeleton" style={{ width: "80%", height: 14 }} />
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <span className="empty-state-icon">👤</span>
            <div className="empty-state-title">
              {search ? "No patients found" : "No patients yet"}
            </div>
            <p style={{ fontSize: 14 }}>
              {search ? "Try a different search term" : "Add your first patient to get started"}
            </p>
          </div>
        </div>
      ) : (
        <div className="grid-patient-cards">
          {filtered.map((patient, i) => (
            <Link
              key={patient._id}
              to={`/patients/${patient._id}`}
              state={{ from: "/patients" }}
              className={`animate-fade-in stagger-${Math.min(i + 1, 4)}`}
              style={{ textDecoration: "none" }}
            >
              <div
                className="card"
                style={{
                  padding: 20,
                  cursor: "pointer",
                  transition: "all 0.2s",
                  border: "1px solid var(--color-border)",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = "var(--color-accent)";
                  e.currentTarget.style.boxShadow = "0 4px 20px rgba(59,130,246,0.12)";
                  e.currentTarget.style.transform = "translateY(-2px)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = "var(--color-border)";
                  e.currentTarget.style.boxShadow = "";
                  e.currentTarget.style.transform = "";
                }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    {/* Avatar */}
                    <div style={{
                      width: 44,
                      height: 44,
                      borderRadius: "50%",
                      background: `linear-gradient(135deg, ${patient.gender === "Female" ? "#ec4899, #8b5cf6" : "#3b82f6, #1d4ed8"})`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 18,
                      fontWeight: 700,
                      color: "white",
                      flexShrink: 0,
                    }}>
                      {patient.name?.[0]?.toUpperCase() || "?"}
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 15, color: "var(--color-text-primary)" }}>
                        {patient.name}
                      </div>
                      <div style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>
                        {patient.gender} · {patient.age} yrs
                      </div>
                    </div>
                  </div>

                  {/* Blood Group Badge */}
                  {patient.blood_group && (
                    <span style={{
                      padding: "4px 10px",
                      borderRadius: "9999px",
                      fontSize: 12,
                      fontWeight: 700,
                      background: bloodGroupColor(patient.blood_group),
                      color: bloodGroupTextColor(patient.blood_group),
                    }}>
                      {patient.blood_group}
                    </span>
                  )}
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  {patient.phone && (
                    <div style={{ fontSize: 13, color: "var(--color-text-secondary)", display: "flex", alignItems: "center", gap: 6 }}>
                      📞 {patient.phone}
                    </div>
                  )}
                  {patient.address && (
                    <div style={{
                      fontSize: 12,
                      color: "var(--color-text-muted)",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                      display: "flex", gap: 6,
                    }}>
                      📍 {patient.address}
                    </div>
                  )}
                </div>

                <div style={{
                  marginTop: 12,
                  paddingTop: 12,
                  borderTop: "1px solid var(--color-border-subtle)",
                  fontSize: 12,
                  color: "var(--color-accent)",
                  fontWeight: 600,
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                }}>
                  View Profile →
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

export default Patients;