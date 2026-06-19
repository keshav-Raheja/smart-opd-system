import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import api from "../services/api";
import { useToast } from "../context/ToastContext";

function TreatmentDashboard() {
  const toast = useToast();
  const [treatments, setTreatments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTreatment, setSelectedTreatment] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const response = await api.get("/visits/treatments/dashboard");
      setTreatments(response.data);
      if (response.data.length > 0) {
        // If a treatment was previously selected, find it in the refreshed list
        if (selectedTreatment) {
          const updated = response.data.find(t => t.procedure === selectedTreatment.procedure);
          if (updated) setSelectedTreatment(updated);
        }
      }
    } catch (err) {
      console.error(err);
      toast.error("Error", "Could not load treatments tracker data");
    } finally {
      setLoading(false);
    }
  };

  const filterPatients = (list) => {
    if (!searchQuery.trim()) return list;
    const q = searchQuery.toLowerCase();
    return list.filter(
      (p) =>
        p.patient_name.toLowerCase().includes(q) ||
        p.patient_id.toLowerCase().includes(q) ||
        p.tooth.includes(q) ||
        (p.notes && p.notes.toLowerCase().includes(q))
    );
  };

  return (
    <div className="animate-fade-in" style={{ maxWidth: "1300px", margin: "0 auto", padding: "8px 12px" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24, flexWrap: "wrap", gap: 16 }}>
        <div>
          <h1 className="page-title">📁 Patient Treatment Tracker</h1>
          <p className="page-subtitle">Track patients undergoing multi-visit and planned dental procedures by stage</p>
        </div>
        <button
          onClick={fetchDashboardData}
          className="btn btn-secondary"
          style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 16px", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer" }}
        >
          🔄 Refresh
        </button>
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: "80px 0" }}>
          <span className="spinner" style={{ width: 40, height: 40 }} />
          <p style={{ marginTop: 16, color: "var(--color-text-secondary)" }}>Loading treatments data...</p>
        </div>
      ) : treatments.length === 0 ? (
        <div className="card" style={{ padding: 48, textAlign: "center" }}>
          <span style={{ fontSize: 48 }}>🦷</span>
          <h3 style={{ fontSize: 18, fontWeight: 700, marginTop: 16, color: "var(--color-text-primary)" }}>No Treatment Records</h3>
          <p style={{ color: "var(--color-text-muted)", marginTop: 6, fontSize: 14 }}>
            Procedures appear here once they are added to patient dental charts in the consultation workspace.
          </p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
          
          {/* Overview List of Cards */}
          <div>
            <h3 style={{ fontSize: 12, fontWeight: 700, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 14 }}>
              🦷 Procedure Groups
            </h3>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16 }}>
              {treatments.map((t) => {
                const totalActive = t.in_progress.length + t.planned.length + t.completed.length;
                const isSelected = selectedTreatment?.procedure === t.procedure;
                const totalRemaining = t.in_progress.length + t.planned.length;
                return (
                  <div
                    key={t.procedure}
                    onClick={() => setSelectedTreatment(isSelected ? null : t)}
                    className="card"
                    style={{
                      padding: 20,
                      cursor: "pointer",
                      border: isSelected ? "2.5px solid var(--color-accent)" : "1.5px solid var(--color-border)",
                      boxShadow: isSelected ? "var(--shadow-md)" : "var(--shadow-sm)",
                      background: isSelected ? "linear-gradient(180deg, var(--color-surface) 0%, rgba(59, 130, 246, 0.02) 100%)" : "var(--color-surface)",
                      transition: "all 0.2s ease-in-out",
                      transform: isSelected ? "translateY(-2px)" : "none",
                      position: "relative",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
                      <h4 style={{ fontSize: 16, fontWeight: 800, color: "var(--color-navy-950)", margin: 0 }}>
                        {t.procedure}
                      </h4>
                      <span style={{ fontSize: 11, background: "var(--color-surface-3)", padding: "3px 8px", borderRadius: 12, fontWeight: 700, color: "var(--color-text-secondary)", whiteSpace: "nowrap" }}>
                        {totalActive} cases
                      </span>
                    </div>

                    <div style={{ display: "flex", gap: 12, marginTop: 4 }}>
                      {/* Remaining Panel */}
                      <div style={{ flex: 1, background: "var(--color-surface-2)", padding: "10px 12px", borderRadius: 10, border: "1px solid #fed7aa" }}>
                        <div style={{ fontSize: 10, fontWeight: 700, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.2px" }}>Remaining</div>
                        <div style={{ display: "flex", alignItems: "baseline", gap: 4, marginTop: 4 }}>
                          <span style={{ fontSize: 20, fontWeight: 850, color: "#ea580c" }}>
                            {totalRemaining}
                          </span>
                          <span style={{ fontSize: 11, color: "var(--color-text-muted)", fontWeight: 600 }}>cases</span>
                        </div>
                        <div style={{ fontSize: 9, color: "var(--color-text-muted)", marginTop: 4, display: "flex", gap: 4, flexWrap: "wrap", lineHeight: 1.2 }}>
                          <span style={{ display: "flex", alignItems: "center", gap: 2 }}>
                            <span style={{ width: 5, height: 5, borderRadius: "50%", background: "#ea580c" }} />
                            IP: {t.in_progress.length}
                          </span>
                          <span style={{ display: "flex", alignItems: "center", gap: 2 }}>
                            <span style={{ width: 5, height: 5, borderRadius: "50%", background: "#d97706" }} />
                            PL: {t.planned.length}
                          </span>
                        </div>
                      </div>

                      {/* Completed Panel */}
                      <div style={{ flex: 1, background: "var(--color-surface-2)", padding: "10px 12px", borderRadius: 10, border: "1px solid #a7f3d0" }}>
                        <div style={{ fontSize: 10, fontWeight: 700, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.2px" }}>Completed</div>
                        <div style={{ display: "flex", alignItems: "baseline", gap: 4, marginTop: 4 }}>
                          <span style={{ fontSize: 20, fontWeight: 850, color: "var(--color-success)" }}>
                            {t.completed.length}
                          </span>
                          <span style={{ fontSize: 11, color: "var(--color-text-muted)", fontWeight: 600 }}>cases</span>
                        </div>
                        <div style={{ fontSize: 9, color: "var(--color-success)", marginTop: 4, fontWeight: 700 }}>
                          ✓ Treated
                        </div>
                      </div>
                    </div>

                    {/* Progress Bar Visualizer */}
                    {totalActive > 0 && (
                      <div style={{ display: "flex", height: 6, borderRadius: 3, overflow: "hidden", marginTop: 14, background: "var(--color-surface-3)" }}>
                        <div style={{ width: `${(t.in_progress.length / totalActive) * 100}%`, background: "#ea580c" }} />
                        <div style={{ width: `${(t.planned.length / totalActive) * 100}%`, background: "#d97706" }} />
                        <div style={{ width: `${(t.completed.length / totalActive) * 100}%`, background: "var(--color-success)" }} />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Drilldown Detailed Kanban View */}
          {selectedTreatment && (
            <div className="animate-fade-in" style={{ borderTop: "1px solid var(--color-border)", paddingTop: 24, marginTop: 12 }}>
              {/* Kanban Header */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, flexWrap: "wrap", gap: 16 }}>
                <div>
                  <h2 style={{ fontFamily: "'Outfit', sans-serif", fontSize: 20, fontWeight: 800, color: "var(--color-navy-950)", margin: 0 }}>
                    📋 {selectedTreatment.procedure} Patient Workflow
                  </h2>
                  <p style={{ fontSize: 13, color: "var(--color-text-secondary)", marginTop: 2 }}>
                    Stage-by-stage patient lists. Click any card to navigate to the patient profile.
                  </p>
                </div>
                {/* Search */}
                <input
                  type="text"
                  placeholder="🔍 Search patients, teeth, notes..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="form-input"
                  style={{ maxWidth: 300, fontSize: 13 }}
                />
              </div>

              {/* Three Stacked Panels */}
              <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
                
                {/* 1. In Progress Patients (At the Top) */}
                <div className="card" style={{ background: "var(--color-surface-2)", borderRadius: 16, border: "1.5px solid #fed7aa", padding: 20 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                    <h3 style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 15, fontWeight: 800, color: "#ea580c", margin: 0 }}>
                      <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#ea580c" }} />
                      In Progress Patients ({filterPatients(selectedTreatment.in_progress).length})
                    </h3>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 16 }}>
                    {filterPatients(selectedTreatment.in_progress).map((p) => (
                      <PatientKanbanCard key={`${p.patient_id}-${p.tooth}`} patient={p} themeColor="#ea580c" badgeBg="#ffedd5" />
                    ))}
                    {filterPatients(selectedTreatment.in_progress).length === 0 && (
                      <div style={{ gridColumn: "1 / -1" }}>
                        <EmptyColumnState message="No patients in progress" />
                      </div>
                    )}
                  </div>
                </div>

                {/* 2. Planned Patients (Planned just above Completed / Middle) */}
                <div className="card" style={{ background: "var(--color-surface-2)", borderRadius: 16, border: "1.5px solid #fef08a", padding: 20 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                    <h3 style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 15, fontWeight: 800, color: "#d97706", margin: 0 }}>
                      <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#d97706" }} />
                      Planned Patients ({filterPatients(selectedTreatment.planned).length})
                    </h3>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 16 }}>
                    {filterPatients(selectedTreatment.planned).map((p) => (
                      <PatientKanbanCard key={`${p.patient_id}-${p.tooth}`} patient={p} themeColor="#d97706" badgeBg="#fef9c3" />
                    ))}
                    {filterPatients(selectedTreatment.planned).length === 0 && (
                      <div style={{ gridColumn: "1 / -1" }}>
                        <EmptyColumnState message="No planned patients" />
                      </div>
                    )}
                  </div>
                </div>

                {/* 3. Completed Patients (Completed at the bottom) */}
                <div className="card" style={{ background: "var(--color-surface-2)", borderRadius: 16, border: "1.5px solid #a7f3d0", padding: 20 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                    <h3 style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 15, fontWeight: 800, color: "var(--color-success)", margin: 0 }}>
                      <span style={{ width: 10, height: 10, borderRadius: "50%", background: "var(--color-success)" }} />
                      Completed Patients ({filterPatients(selectedTreatment.completed).length})
                    </h3>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 16 }}>
                    {filterPatients(selectedTreatment.completed).map((p) => (
                      <PatientKanbanCard key={`${p.patient_id}-${p.tooth}`} patient={p} themeColor="var(--color-success)" badgeBg="#d1fae5" />
                    ))}
                    {filterPatients(selectedTreatment.completed).length === 0 && (
                      <div style={{ gridColumn: "1 / -1" }}>
                        <EmptyColumnState message="No completed patients" />
                      </div>
                    )}
                  </div>
                </div>

              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Reusable Kanban card for patient item
function PatientKanbanCard({ patient, themeColor, badgeBg }) {
  return (
    <Link
      to={`/patients/${patient.patient_id}`}
      style={{
        textDecoration: "none",
        color: "inherit",
        display: "block",
        background: "var(--color-surface)",
        border: "1.5px solid var(--color-border)",
        borderRadius: 12,
        padding: 14,
        boxShadow: "var(--shadow-sm)",
        transition: "all 0.2s",
      }}
      onMouseEnter={e => {
        e.currentTarget.style.borderColor = themeColor;
        e.currentTarget.style.transform = "translateY(-1px)";
        e.currentTarget.style.boxShadow = "var(--shadow-md)";
      }}
      onMouseLeave={e => {
        e.currentTarget.style.borderColor = "var(--color-border)";
        e.currentTarget.style.transform = "none";
        e.currentTarget.style.boxShadow = "var(--shadow-sm)";
      }}
    >
      {/* Patient Name and Upcoming Closing Date at the Top */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10, flexWrap: "wrap", gap: 6 }}>
        <span style={{ fontWeight: 750, fontSize: 14, color: "var(--color-navy-950)" }}>
          👤 {patient.patient_name}
        </span>
        {patient.upcoming_date ? (
          <span style={{
            fontWeight: 750,
            fontSize: 10,
            color: "#dc2626",
            background: "#fee2e2",
            padding: "3px 8px",
            borderRadius: 6,
            display: "flex",
            alignItems: "center",
            gap: 4,
            whiteSpace: "nowrap"
          }}>
            📅 {patient.upcoming_date.includes(" at ") ? new Date(patient.upcoming_date.split(" at ")[0]).toLocaleDateString("en-IN") : new Date(patient.upcoming_date).toLocaleDateString("en-IN")}
          </span>
        ) : (
          <span style={{ fontSize: 10, color: "var(--color-text-muted)", background: "var(--color-surface-2)", padding: "3px 8px", borderRadius: 6, whiteSpace: "nowrap" }}>
            No follow-up
          </span>
        )}
      </div>

      {/* Details Row: Tooth, Stage, Last Visit */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8, flexWrap: "wrap", gap: 6 }}>
        <span style={{
          fontSize: 10,
          fontWeight: 800,
          background: badgeBg,
          color: themeColor,
          padding: "2px 8px",
          borderRadius: 6,
          whiteSpace: "nowrap",
        }}>
          Tooth #{patient.tooth}
        </span>
        <span style={{ color: "var(--color-text-muted)", fontSize: 11 }}>
          Last Visit: {patient.last_visit ? new Date(patient.last_visit).toLocaleDateString("en-IN") : "N/A"}
        </span>
      </div>

      {/* Session/Stage */}
      {patient.session && (
        <div style={{ fontSize: 12, fontWeight: 650, color: "var(--color-text-secondary)", marginBottom: 6 }}>
          📍 {patient.session}
        </div>
      )}

      {/* Notes */}
      {patient.notes && (
        <div style={{
          fontSize: 11,
          color: "var(--color-text-muted)",
          background: "var(--color-surface-2)",
          padding: "6px 10px",
          borderRadius: 6,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
          borderLeft: `3px solid ${themeColor}`
        }}>
          {patient.notes}
        </div>
      )}
    </Link>
  );
}

function EmptyColumnState({ message }) {
  return (
    <div style={{
      textAlign: "center",
      padding: "24px 12px",
      borderRadius: 12,
      border: "1px dashed var(--color-border)",
      color: "var(--color-text-muted)",
      fontSize: 13,
      background: "var(--color-surface)",
    }}>
      {message}
    </div>
  );
}

export default TreatmentDashboard;
