import { useState } from "react";

const PROCEDURES = ["Extraction", "Root Canal", "Filling", "Crown", "Scaling", "Implant", "Bridge", "Other"];

// FDI tooth layout
const UPPER_RIGHT = ["18","17","16","15","14","13","12","11"];
const UPPER_LEFT  = ["21","22","23","24","25","26","27","28"];
const LOWER_RIGHT = ["48","47","46","45","44","43","42","41"];
const LOWER_LEFT  = ["31","32","33","34","35","36","37","38"];

const UPPER_ROW = [...UPPER_RIGHT, ...UPPER_LEFT];
const LOWER_ROW = [...LOWER_RIGHT, ...LOWER_LEFT];

export default function DentalChart({ chart = {}, onChange, readOnly = false, toothHistory = {} }) {
  const [active, setActive] = useState(null); // currently selected tooth

  const getStatus = (tooth) => {
    if (chart[tooth]?.done) return "done";
    if (chart[tooth]?.procedure) return "planned";
    const hist = toothHistory[tooth];
    if (hist && hist.some(h => h.done)) return "history";
    return "healthy";
  };

  const STATUS_STYLE = {
    healthy:  { bg: "#f8fafc",  border: "#cbd5e1", text: "#94a3b8", label: "" },
    planned:  { bg: "#fef9c3",  border: "#eab308", text: "#854d0e", label: "Planned" },
    done:     { bg: "#dc2626",  border: "#991b1b", text: "#fff",    label: "Done" },
    history:  { bg: "#f0abfc",  border: "#c026d3", text: "#701a75", label: "Past" },
  };

  const handleToothClick = (tooth) => {
    if (readOnly) return;
    setActive(active === tooth ? null : tooth);
  };

  const handleChange = (tooth, field, value) => {
    const updated = {
      ...chart,
      [tooth]: { ...(chart[tooth] || {}), [field]: value },
    };
    onChange && onChange(updated);
  };

  const handleClear = (tooth) => {
    const updated = { ...chart };
    delete updated[tooth];
    onChange && onChange(updated);
    setActive(null);
  };

  const ToothCell = ({ tooth }) => {
    const status = getStatus(tooth);
    const s      = STATUS_STYLE[status];
    const isActive = active === tooth;
    const proc   = chart[tooth]?.procedure || "";

    return (
      <div
        onClick={() => handleToothClick(tooth)}
        title={`Tooth #${tooth}${proc ? ` — ${proc}` : ""}`}
        style={{
          width: 36, height: 44,
          border: `2px solid ${isActive ? "#2563eb" : s.border}`,
          borderRadius: 6,
          background: isActive ? "#dbeafe" : s.bg,
          cursor: readOnly ? "default" : "pointer",
          display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center",
          transition: "all 0.15s",
          boxShadow: isActive ? "0 0 0 3px #93c5fd" : "none",
          position: "relative",
          flexShrink: 0,
        }}
      >
        <span style={{ fontSize: 9, fontWeight: 700, color: isActive ? "#1d4ed8" : s.text }}>{tooth}</span>
        {proc && <span style={{ fontSize: 6, color: isActive ? "#1d4ed8" : s.text, textAlign: "center", lineHeight: 1.2 }}>{proc.slice(0,6)}</span>}
        {status !== "healthy" && !proc && (
          <span style={{ fontSize: 6, color: s.text }}>{s.label}</span>
        )}
      </div>
    );
  };

  const activeChartEntry = chart[active] || {};

  return (
    <div style={{ marginTop: 12 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10, flexWrap: "wrap" }}>
        <span style={{ fontWeight: 600, fontSize: 14, color: "var(--text-primary)" }}>🦷 Dental Chart (FDI)</span>
        {["healthy","planned","done","history"].map(s => (
          <div key={s} style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <div style={{ width: 12, height: 12, borderRadius: 3, background: STATUS_STYLE[s].bg, border: `2px solid ${STATUS_STYLE[s].border}` }} />
            <span style={{ fontSize: 11, color: "var(--text-secondary)", textTransform: "capitalize" }}>{s === "healthy" ? "Healthy" : s === "planned" ? "Planned" : s === "done" ? "Treated (this visit)" : "Previously treated"}</span>
          </div>
        ))}
      </div>

      {/* Upper jaw */}
      <div style={{ marginBottom: 4 }}>
        <div style={{ fontSize: 10, color: "var(--text-secondary)", marginBottom: 4, fontWeight: 600 }}>UPPER JAW ← Right | Left →</div>
        <div style={{ display: "flex", gap: 3, alignItems: "center", flexWrap: "nowrap", overflowX: "auto", paddingBottom: 4 }}>
          {UPPER_ROW.map(t => <ToothCell key={t} tooth={t} />)}
        </div>
      </div>

      {/* Divider */}
      <div style={{ borderTop: "2px dashed #e2e8f0", margin: "6px 0" }} />

      {/* Lower jaw */}
      <div>
        <div style={{ fontSize: 10, color: "var(--text-secondary)", marginBottom: 4, fontWeight: 600 }}>LOWER JAW ← Right | Left →</div>
        <div style={{ display: "flex", gap: 3, alignItems: "center", flexWrap: "nowrap", overflowX: "auto", paddingBottom: 4 }}>
          {LOWER_ROW.map(t => <ToothCell key={t} tooth={t} />)}
        </div>
      </div>

      {/* Active tooth editor */}
      {active && !readOnly && (
        <div style={{ marginTop: 14, padding: 16, background: "#eff6ff", borderRadius: 10, border: "1px solid #bfdbfe" }}>
          <div style={{ fontWeight: 700, fontSize: 14, color: "#1e40af", marginBottom: 10 }}>Tooth #{active}</div>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "flex-end" }}>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, display: "block", marginBottom: 4, color: "#1e40af" }}>Procedure</label>
              <select
                className="form-input"
                value={activeChartEntry.procedure || ""}
                onChange={e => handleChange(active, "procedure", e.target.value)}
                style={{ minWidth: 140 }}
              >
                <option value="">Select procedure...</option>
                {PROCEDURES.map(p => <option key={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, display: "block", marginBottom: 4, color: "#1e40af" }}>Notes</label>
              <input
                className="form-input"
                placeholder="Optional notes..."
                value={activeChartEntry.notes || ""}
                onChange={e => handleChange(active, "notes", e.target.value)}
                style={{ minWidth: 180 }}
              />
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, paddingBottom: 2 }}>
              <input
                type="checkbox"
                id={`done-${active}`}
                checked={!!activeChartEntry.done}
                onChange={e => handleChange(active, "done", e.target.checked)}
                style={{ width: 16, height: 16, cursor: "pointer" }}
              />
              <label htmlFor={`done-${active}`} style={{ fontSize: 13, fontWeight: 600, color: "#dc2626", cursor: "pointer" }}>Mark as Done</label>
            </div>
            <button
              onClick={() => handleClear(active)}
              style={{ background: "#fee2e2", color: "#dc2626", border: "none", borderRadius: 8, padding: "8px 14px", cursor: "pointer", fontSize: 12, fontWeight: 600 }}
            >Clear Tooth</button>
            <button
              onClick={() => setActive(null)}
              style={{ background: "#e0f2fe", color: "#0369a1", border: "none", borderRadius: 8, padding: "8px 14px", cursor: "pointer", fontSize: 12, fontWeight: 600 }}
            >Done</button>
          </div>

          {/* History for this tooth */}
          {toothHistory[active] && toothHistory[active].length > 0 && (
            <div style={{ marginTop: 12, paddingTop: 10, borderTop: "1px solid #bfdbfe" }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: "#6b21a8", marginBottom: 6 }}>Previous procedures on Tooth #{active}:</div>
              {toothHistory[active].map((h, i) => (
                <div key={i} style={{ fontSize: 12, color: "#374151", marginBottom: 3 }}>
                  • {h.date ? new Date(h.date).toLocaleDateString() : ""} — <b>{h.procedure}</b>{h.notes ? ` (${h.notes})` : ""}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Read-only history view */}
      {readOnly && Object.keys(toothHistory).length > 0 && (
        <div style={{ marginTop: 10 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 8 }}>Treatment History:</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {Object.entries(toothHistory).map(([tooth, entries]) =>
              entries.map((e, i) => (
                <div key={`${tooth}-${i}`} style={{ background: "#f3e8ff", border: "1px solid #d8b4fe", borderRadius: 8, padding: "6px 12px", fontSize: 12 }}>
                  <b>#{tooth}</b> — {e.procedure}{e.notes ? ` (${e.notes})` : ""}
                  {e.date && <span style={{ color: "#9ca3af", marginLeft: 6 }}>{new Date(e.date).toLocaleDateString()}</span>}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
