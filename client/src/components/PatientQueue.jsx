import { useEffect, useState } from "react";
import api from "../services/api";

function PatientQueue({ setSelectedPatient, selectedPatient, onQueueChange, refreshTrigger }) {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchQueue();
    const interval = setInterval(fetchQueue, 30000);
    return () => clearInterval(interval);
  }, [refreshTrigger]);

  const fetchQueue = async () => {
    try {
      const response = await api.get("/appointments/today");
      const filtered = response.data.filter(
        (item) => item.status === "Checked-In" || item.status === "In Consultation"
      );
      setAppointments(filtered);
      onQueueChange?.(filtered);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card" style={{ height: "80vh", display: "flex", flexDirection: "column", overflow: "hidden" }}>
      {/* Header */}
      <div style={{
        padding: "18px 20px",
        borderBottom: "1px solid var(--color-border)",
        background: "linear-gradient(135deg, #eff6ff, #f5f3ff)",
        flexShrink: 0,
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <h2 style={{ fontFamily: "'Outfit', sans-serif", fontSize: 18, fontWeight: 800 }}>Active Queue</h2>
            <p style={{ fontSize: 12, color: "var(--color-text-secondary)", marginTop: 2 }}>
              Today's checked-in patients
            </p>
          </div>
          <div style={{
            padding: "4px 12px",
            background: appointments.length > 0 ? "#dbeafe" : "#f1f5f9",
            color: appointments.length > 0 ? "#1e40af" : "#94a3b8",
            borderRadius: 99,
            fontSize: 12,
            fontWeight: 700,
          }}>
            {appointments.length} Active
          </div>
        </div>
      </div>

      {/* Queue List */}
      <div style={{ flex: 1, overflowY: "auto", padding: "12px" }}>
        {loading ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {[...Array(3)].map((_, i) => (
              <div key={i} style={{ padding: 14, borderRadius: 12, border: "1px solid var(--color-border)" }}>
                <div className="skeleton" style={{ width: "60%", height: 16, marginBottom: 8 }} />
                <div className="skeleton" style={{ width: "40%", height: 12 }} />
              </div>
            ))}
          </div>
        ) : appointments.length === 0 ? (
          <div style={{ textAlign: "center", marginTop: 60, color: "var(--color-text-muted)" }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>🪑</div>
            <p style={{ fontSize: 14 }}>No active patients in queue</p>
            <p style={{ fontSize: 12, marginTop: 4 }}>Check-in patients from Appointments</p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {appointments.map((appt, i) => {
              const isSelected = selectedPatient?._id === appt._id;
              return (
                <div
                  key={appt._id}
                  onClick={() => setSelectedPatient(appt)}
                  className={`animate-fade-in stagger-${Math.min(i+1,4)}`}
                  style={{
                    padding: "14px 16px",
                    borderRadius: 14,
                    cursor: "pointer",
                    border: isSelected ? "2px solid #3b82f6" : "1px solid var(--color-border)",
                    background: isSelected ? "linear-gradient(135deg, #eff6ff, #f5f3ff)" : "var(--color-surface)",
                    transition: "all 0.2s",
                    boxShadow: isSelected ? "0 4px 16px rgba(59,130,246,0.15)" : "",
                  }}
                  onMouseEnter={(e) => {
                    if (!isSelected) e.currentTarget.style.borderColor = "#93c5fd";
                  }}
                  onMouseLeave={(e) => {
                    if (!isSelected) e.currentTarget.style.borderColor = "var(--color-border)";
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <div style={{
                        width: 40, height: 40,
                        borderRadius: "50%",
                        background: isSelected
                          ? "linear-gradient(135deg, #3b82f6, #8b5cf6)"
                          : "linear-gradient(135deg, #94a3b8, #64748b)",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: 16, fontWeight: 700, color: "white",
                      }}>
                        {appt.patient_name?.[0]?.toUpperCase() || "?"}
                      </div>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 14, color: isSelected ? "#1e40af" : "var(--color-text-primary)" }}>
                          {appt.patient_name}
                        </div>
                        <div style={{ fontSize: 12, color: "var(--color-text-muted)" }}>
                          {appt.appointment_time} · {appt.reason || "General"}
                        </div>
                      </div>
                    </div>

                    <span style={{
                      padding: "3px 10px",
                      borderRadius: 99,
                      fontSize: 11,
                      fontWeight: 700,
                      background: appt.status === "Checked-In" ? "#fef3c7" : "#ede9fe",
                      color: appt.status === "Checked-In" ? "#92400e" : "#5b21b6",
                    }}>
                      {appt.status}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Refresh hint */}
      <div style={{
        padding: "10px 16px",
        borderTop: "1px solid var(--color-border)",
        fontSize: 11,
        color: "var(--color-text-muted)",
        textAlign: "center",
      }}>
        Auto-refreshes every 30 seconds
      </div>
    </div>
  );
}

export default PatientQueue;