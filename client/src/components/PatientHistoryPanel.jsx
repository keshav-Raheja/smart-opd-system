/**
 * PatientHistoryPanel.jsx
 * ───────────────────────
 * Displays for a selected patient:
 *   • Lifetime summary cards: total visits, total paid, outstanding, last visit
 *   • All past diagnoses & prescribed medicines (tags)
 *   • Full visit timeline — expandable per visit with vitals, prescription, notes
 */

import { useEffect, useState, useCallback } from "react";
import api from "../services/api";

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmt = (n) =>
  `₹${Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;

const fmtDate = (iso) => {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric", month: "short", year: "numeric",
  });
};

const fmtDateTime = (iso) => {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-IN", {
    day: "numeric", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
};

// Days since a date
const daysSince = (iso) => {
  if (!iso) return null;
  const diff = Date.now() - new Date(iso).getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
};

// ─── Sub-components ───────────────────────────────────────────────────────────
function StatChip({ icon, label, value, sub, color = "blue" }) {
  const COLORS = {
    blue:   { bg: "linear-gradient(135deg,#3b82f6,#1d4ed8)", text: "white" },
    green:  { bg: "linear-gradient(135deg,#10b981,#059669)", text: "white" },
    orange: { bg: "linear-gradient(135deg,#f59e0b,#d97706)", text: "white" },
    purple: { bg: "linear-gradient(135deg,#8b5cf6,#6d28d9)", text: "white" },
    red:    { bg: "linear-gradient(135deg,#ef4444,#dc2626)", text: "white" },
  };
  const c = COLORS[color] || COLORS.blue;
  return (
    <div style={{
      background: c.bg, color: c.text,
      borderRadius: "var(--radius-lg)",
      padding: "14px 16px",
      display: "flex", flexDirection: "column", gap: 2,
      minWidth: 0,
    }}>
      <div style={{ fontSize: 20 }}>{icon}</div>
      <div style={{ fontSize: 22, fontWeight: 800, fontFamily: "'Outfit',sans-serif", lineHeight: 1.1 }}>
        {value}
      </div>
      <div style={{ fontSize: 11, fontWeight: 600, opacity: 0.85 }}>{label}</div>
      {sub && <div style={{ fontSize: 10, opacity: 0.7 }}>{sub}</div>}
    </div>
  );
}

function Tag({ text, color = "#ede9fe", textColor = "#5b21b6" }) {
  return (
    <span style={{
      display: "inline-block",
      padding: "3px 10px",
      borderRadius: 99,
      fontSize: 11, fontWeight: 600,
      background: color, color: textColor,
      whiteSpace: "nowrap",
    }}>
      {text}
    </span>
  );
}

function VitalBadge({ label, value }) {
  if (!value) return null;
  return (
    <div style={{
      padding: "6px 10px",
      background: "var(--color-surface-3)",
      borderRadius: 8,
      fontSize: 12,
      border: "1px solid var(--color-border)",
    }}>
      <div style={{ fontSize: 10, color: "var(--color-text-muted)", fontWeight: 600, marginBottom: 2 }}>
        {label}
      </div>
      <div style={{ fontWeight: 700, color: "var(--color-text-primary)" }}>{value}</div>
    </div>
  );
}

function VisitCard({ visit, index, total }) {
  const [expanded, setExpanded] = useState(index === 0); // first visit open by default
  const isLatest = index === 0;

  return (
    <div style={{
      border: `1.5px solid ${isLatest ? "var(--color-accent)" : "var(--color-border)"}`,
      borderRadius: "var(--radius-lg)",
      background: "var(--color-surface)",
      overflow: "hidden",
      transition: "box-shadow 0.2s",
    }}>
      {/* Header — always visible */}
      <button
        onClick={() => setExpanded((p) => !p)}
        style={{
          width: "100%", background: "none", border: "none",
          padding: "12px 16px", cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "space-between",
          gap: 12,
          background: isLatest ? "var(--color-accent-glow)" : "var(--color-surface-2)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
          <div style={{
            width: 30, height: 30, borderRadius: "50%",
            background: isLatest
              ? "linear-gradient(135deg,#3b82f6,#8b5cf6)"
              : "var(--color-surface-3)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 12, fontWeight: 800,
            color: isLatest ? "white" : "var(--color-text-secondary)",
            flexShrink: 0,
          }}>
            {total - index}
          </div>
          <div style={{ textAlign: "left", minWidth: 0 }}>
            <div style={{ fontWeight: 700, fontSize: 13, color: "var(--color-text-primary)" }}>
              {isLatest && <span style={{ color: "var(--color-accent)", marginRight: 6 }}>● LATEST</span>}
              {fmtDate(visit.created_at)}
            </div>
            {visit.diagnosis && (
              <div style={{
                fontSize: 12, color: "var(--color-text-secondary)",
                overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                maxWidth: 260,
              }}>
                {visit.diagnosis}
              </div>
            )}
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
          {visit.doctor_name && (
            <span style={{ fontSize: 11, color: "var(--color-text-muted)" }}>
              Dr. {visit.doctor_name}
            </span>
          )}
          <span style={{ color: "var(--color-text-muted)", fontSize: 16, transition: "transform 0.2s", transform: expanded ? "rotate(180deg)" : "none" }}>
            ▾
          </span>
        </div>
      </button>

      {/* Body — expandable */}
      {expanded && (
        <div className="animate-slide-down" style={{ padding: "12px 16px", borderTop: "1px solid var(--color-border-subtle)" }}>

          {/* Vitals */}
          {visit.vitals && Object.values(visit.vitals).some(Boolean) && (
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "var(--color-text-muted)", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 6 }}>
                Vitals
              </div>
              <div className="grid-vitals">
                <VitalBadge label="Blood Pressure" value={visit.vitals?.blood_pressure} />
                <VitalBadge label="Temperature"    value={visit.vitals?.temperature && `${visit.vitals.temperature}°F`} />
                <VitalBadge label="Pulse"          value={visit.vitals?.pulse && `${visit.vitals.pulse} bpm`} />
                <VitalBadge label="Weight"         value={visit.vitals?.weight && `${visit.vitals.weight} kg`} />
              </div>
            </div>
          )}

          {/* Clinical */}
          {visit.symptoms && (
            <div style={{ marginBottom: 8 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: "var(--color-text-muted)", textTransform: "uppercase" }}>Symptoms: </span>
              <span style={{ fontSize: 13 }}>{visit.symptoms}</span>
            </div>
          )}
          {visit.diagnosis && (
            <div style={{ marginBottom: 8 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: "var(--color-text-muted)", textTransform: "uppercase" }}>Diagnosis: </span>
              <span style={{ fontSize: 13, fontWeight: 600 }}>{visit.diagnosis}</span>
            </div>
          )}
          {visit.notes && (
            <div style={{ marginBottom: 8 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: "var(--color-text-muted)", textTransform: "uppercase" }}>Notes: </span>
              <span style={{ fontSize: 13 }}>{visit.notes}</span>
            </div>
          )}

          {/* Prescription */}
          {visit.prescription?.length > 0 && (
            <div style={{ marginBottom: 8 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "var(--color-text-muted)", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 6 }}>
                💊 Prescription ({visit.prescription.length})
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                {visit.prescription.map((m, i) => (
                  <div key={i} style={{
                    display: "flex", alignItems: "flex-start", gap: 8,
                    padding: "6px 10px",
                    background: "var(--color-surface-2)",
                    borderRadius: 8,
                    fontSize: 12,
                  }}>
                    <span style={{ color: "var(--color-accent)", fontWeight: 700, flexShrink: 0 }}>💊</span>
                    <div>
                      <span style={{ fontWeight: 700 }}>{m.name}</span>
                      {m.dosage && <span style={{ color: "var(--color-text-secondary)", marginLeft: 6 }}>{m.dosage}</span>}
                      {m.frequency && <span style={{ color: "var(--color-text-muted)", marginLeft: 6 }}>· {m.frequency}</span>}
                      {m.duration && <span style={{ color: "var(--color-text-muted)", marginLeft: 6 }}>· {m.duration}</span>}
                      {m.instructions && (
                        <div style={{ color: "var(--color-text-muted)", fontStyle: "italic", marginTop: 2 }}>{m.instructions}</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Follow-up */}
          {visit.follow_up_date && (
            <div style={{
              display: "inline-flex", alignItems: "center", gap: 6,
              padding: "4px 12px", borderRadius: 99,
              background: "#fef3c7", color: "#92400e",
              fontSize: 11, fontWeight: 700, marginTop: 4,
            }}>
              📅 Follow-up: {fmtDate(visit.follow_up_date)}
            </div>
          )}

          <div style={{ fontSize: 10, color: "var(--color-text-muted)", marginTop: 10, textAlign: "right" }}>
            {fmtDateTime(visit.created_at)}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function PatientHistoryPanel({ patient }) {
  const [summary,  setSummary]  = useState(null);
  const [visits,   setVisits]   = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState(null);
  const [activeSection, setActiveSection] = useState("timeline"); // "timeline" | "diagnoses" | "medicines"

  const patientId = patient?.patient_id || patient?._id;

  const loadData = useCallback(async () => {
    if (!patientId) return;
    setLoading(true);
    setError(null);
    try {
      const [summaryRes, visitsRes] = await Promise.all([
        api.get(`/visits/summary/${patientId}`),
        api.get(`/visits/patient/${patientId}`),
      ]);
      setSummary(summaryRes.data);
      setVisits(visitsRes.data);
    } catch (e) {
      setError("Could not load patient history.");
    } finally {
      setLoading(false);
    }
  }, [patientId]);

  useEffect(() => { loadData(); }, [loadData]);

  if (!patient) {
    return (
      <div className="card" style={{ padding: 32, textAlign: "center" }}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>👈</div>
        <div style={{ fontWeight: 700, color: "var(--color-text-secondary)" }}>
          Select a patient from the queue to view their history
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="card" style={{ padding: 24 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div className="skeleton" style={{ height: 90, borderRadius: 12 }} />
          <div className="skeleton" style={{ height: 60, borderRadius: 12 }} />
          <div className="skeleton" style={{ height: 100, borderRadius: 12 }} />
          <div className="skeleton" style={{ height: 100, borderRadius: 12 }} />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card" style={{ padding: 24 }}>
        <div className="empty-state">
          <span className="empty-state-icon">⚠️</span>
          <div className="empty-state-title">{error}</div>
          <button className="btn btn-secondary" onClick={loadData}>Retry</button>
        </div>
      </div>
    );
  }

  const bill = summary?.billing || {};
  const since = daysSince(summary?.last_visit);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

      {/* ── Patient Banner ───────────────────────────────────────────────────── */}
      <div style={{
        background: "linear-gradient(135deg, #1e3a5f, #1d4ed8)",
        borderRadius: "var(--radius-lg)",
        padding: "18px 20px",
        color: "white",
        display: "flex", alignItems: "center", gap: 14,
      }}>
        <div style={{
          width: 52, height: 52, borderRadius: "50%",
          background: "rgba(255,255,255,0.15)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 22, fontWeight: 800, flexShrink: 0,
        }}>
          {patient.patient_name?.[0]?.toUpperCase() || "?"}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 800, fontSize: 17, marginBottom: 2 }}>
            {patient.patient_name}
          </div>
          <div style={{ fontSize: 12, opacity: 0.8 }}>
            {patient.patient_id && `ID: ${patient.patient_id} · `}
            {summary?.total_visits
              ? `${summary.total_visits} total visit${summary.total_visits !== 1 ? "s" : ""}`
              : "First visit"}
          </div>
          {since !== null && (
            <div style={{ fontSize: 11, opacity: 0.7, marginTop: 2 }}>
              Last seen: {since === 0 ? "Today" : since === 1 ? "Yesterday" : `${since} days ago`} ({fmtDate(summary?.last_visit)})
            </div>
          )}
        </div>
        <button
          onClick={loadData}
          title="Refresh history"
          style={{
            background: "rgba(255,255,255,0.15)", border: "none",
            color: "white", borderRadius: 8, padding: "6px 10px",
            cursor: "pointer", fontSize: 16, flexShrink: 0,
          }}
        >
          🔄
        </button>
      </div>

      {/* ── Lifetime Stat Cards ──────────────────────────────────────────────── */}
      <div className="grid-stats">
        <StatChip icon="🏥" label="Total Visits"  value={summary?.total_visits ?? 0}      color="blue" />
        <StatChip icon="💰" label="Total Paid"    value={fmt(bill.total_paid)}             color="green"
          sub={`of ${fmt(bill.total_billed)} billed`} />
        <StatChip icon="⏳" label="Outstanding"   value={fmt(bill.total_due)}              color="orange" />
        <StatChip icon="📋" label="Total Bills"   value={bill.total_bills ?? 0}            color="purple" />
      </div>

      {/* ── Section Tabs ─────────────────────────────────────────────────────── */}
      <div className="tab-list">
        {[
          { id: "timeline",  label: `📜 Visit History (${visits.length})` },
          { id: "diagnoses", label: `🔬 Diagnoses (${summary?.diagnoses?.length ?? 0})` },
          { id: "medicines", label: `💊 Medicines (${summary?.medicines?.length ?? 0})` },
        ].map((t) => (
          <button
            key={t.id}
            className={`tab-item${activeSection === t.id ? " active" : ""}`}
            onClick={() => setActiveSection(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Timeline Tab ─────────────────────────────────────────────────────── */}
      {activeSection === "timeline" && (
        visits.length === 0 ? (
          <div className="card">
            <div className="empty-state">
              <span className="empty-state-icon">📋</span>
              <div className="empty-state-title">No previous visits</div>
              <p style={{ fontSize: 13 }}>This is the patient's first consultation.</p>
            </div>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {visits.map((visit, i) => (
              <VisitCard key={visit._id} visit={visit} index={i} total={visits.length} />
            ))}
          </div>
        )
      )}

      {/* ── Diagnoses Tab ────────────────────────────────────────────────────── */}
      {activeSection === "diagnoses" && (
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">🔬 All Diagnoses</h2>
          </div>
          <div className="card-body">
            {summary?.diagnoses?.length === 0 ? (
              <div style={{ color: "var(--color-text-muted)", fontSize: 13 }}>No diagnoses recorded yet.</div>
            ) : (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {summary.diagnoses.map((d) => (
                  <Tag key={d} text={d} color="#dbeafe" textColor="#1e40af" />
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Medicines Tab ─────────────────────────────────────────────────────── */}
      {activeSection === "medicines" && (
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">💊 All Medicines Ever Prescribed</h2>
          </div>
          <div className="card-body">
            {summary?.medicines?.length === 0 ? (
              <div style={{ color: "var(--color-text-muted)", fontSize: 13 }}>No medicines recorded yet.</div>
            ) : (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {summary.medicines.map((m) => (
                  <Tag key={m} text={m} color="#d1fae5" textColor="#065f46" />
                ))}
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
