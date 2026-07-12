import { useState, useEffect, useRef } from "react";

const PROCEDURES = ["Extraction", "Root Canal", "Filling", "Crown", "Scaling", "Implant", "Bridge", "Other"];

// FDI tooth layout
const UPPER_RIGHT = ["18","17","16","15","14","13","12","11"];
const UPPER_LEFT  = ["21","22","23","24","25","26","27","28"];
const LOWER_RIGHT = ["48","47","46","45","44","43","42","41"];
const LOWER_LEFT  = ["31","32","33","34","35","36","37","38"];

const UPPER_ROW = [...UPPER_RIGHT, ...UPPER_LEFT];
const LOWER_ROW = [...LOWER_RIGHT, ...LOWER_LEFT];

function CustomDropdown({ value, options, onChange, placeholder = "Select..." }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (ref.current && !ref.current.contains(event.target)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={ref} style={{ position: "relative", width: "100%" }}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="form-input"
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          cursor: "pointer",
          padding: "10px 14px",
          background: "var(--color-surface)",
          textAlign: "left",
          border: `1.5px solid ${open ? "var(--color-accent)" : "var(--color-border)"}`,
          boxShadow: open ? "0 0 0 3px rgba(59, 130, 246, 0.1)" : "none",
        }}
      >
        <span style={{ color: value ? "var(--color-text-primary)" : "var(--color-text-muted)", fontWeight: value ? 600 : 400, fontSize: "14px" }}>
          {value || placeholder}
        </span>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="var(--color-text-secondary)"
          strokeWidth="2"
          style={{ transform: open ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s", marginLeft: 8 }}
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>

      {open && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 6px)",
            left: 0,
            right: 0,
            background: "var(--color-surface)",
            border: "1px solid var(--color-border)",
            borderRadius: "12px",
            boxShadow: "var(--shadow-lg)",
            zIndex: 999,
            maxHeight: "220px",
            overflowY: "auto",
            animation: "slideDown 0.15s ease-out",
          }}
        >
          {options.map((opt) => (
            <div
              key={opt}
              onClick={() => {
                onChange(opt);
                setOpen(false);
              }}
              style={{
                padding: "10px 14px",
                cursor: "pointer",
                fontSize: "14px",
                fontWeight: value === opt ? 600 : 500,
                color: value === opt ? "var(--color-navy-600)" : "var(--color-text-primary)",
                background: value === opt ? "rgba(59, 130, 246, 0.05)" : "transparent",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                transition: "background 0.1s",
              }}
              onMouseEnter={(e) => {
                if (value !== opt) e.currentTarget.style.background = "var(--color-surface-2)";
              }}
              onMouseLeave={(e) => {
                if (value !== opt) e.currentTarget.style.background = "transparent";
              }}
            >
              <span>{opt}</span>
              {value === opt && (
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--color-navy-600)" strokeWidth="2.5">
                  <path d="M20 6 9 17l-5-5" />
                </svg>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}


export default function DentalChart({ chart = {}, onChange, readOnly = false, toothHistory = {} }) {
  const [active, setActive] = useState(null); // currently selected tooth

  const getStatus = (tooth) => {
    if (chart[tooth]?.status) return chart[tooth].status;
    if (chart[tooth]?.done) return "completed";
    if (chart[tooth]?.procedure) return "planned";
    const hist = toothHistory[tooth];
    if (hist && hist.length > 0) return "history";
    return "healthy";
  };

  const STATUS_STYLE = {
    healthy:     { bg: "#f8fafc",  border: "#cbd5e1", text: "#94a3b8", label: "" },
    planned:     { bg: "#fef9c3",  border: "#eab308", text: "#854d0e", label: "Planned" },
    in_progress: { bg: "#ffedd5",  border: "#f97316", text: "#c2410c", label: "In Progress" },
    completed:   { bg: "#fee2e2",  border: "#dc2626", text: "#991b1b", label: "Completed" },
    history:     { bg: "#f0abfc",  border: "#c026d3", text: "#701a75", label: "Past" },
  };

  const handleToothClick = (tooth) => {
    if (readOnly) return;
    setActive(active === tooth ? null : tooth);
  };

  const handleChange = (tooth, field, value) => {
    let extraFields = {};
    if (field === "procedure" && value) {
      const hist = toothHistory[tooth] || [];
      const matchingHist = hist.filter(h => h.procedure === value);
      const nextVisitNum = matchingHist.length + 1;
      
      // Auto-populate Visit / Stage as "Visit N"
      extraFields.session = `Visit ${nextVisitNum}`;
      
      // Try to find the most recent planned_visits count for this procedure on this tooth
      const lastWithPlanned = [...matchingHist].reverse().find(h => h.planned_visits);
      if (lastWithPlanned) {
        extraFields.planned_visits = lastWithPlanned.planned_visits;
      }
      
      if (!chart[tooth]?.status) {
        extraFields.status = "in_progress";
      }
    }

    const updated = {
      ...chart,
      [tooth]: {
        ...(chart[tooth] || {}),
        [field]: value,
        ...extraFields,
        ...((field === "procedure" && value && !extraFields.status && !(chart[tooth]?.status)) ? { status: "in_progress" } : {}),
        ...((field === "status") ? { done: value === "completed" || value === "in_progress" } : {}),
      },
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
        title={`Tooth #${tooth}${proc ? ` — ${proc}` : ""}${chart[tooth]?.planned_visits ? ` (${chart[tooth].planned_visits} visits)` : ""}`}
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
  const isStandard = PROCEDURES.includes(activeChartEntry.procedure);
  const dropdownValue = isStandard ? activeChartEntry.procedure : (activeChartEntry.procedure ? "Other" : "");

  return (
    <div style={{ marginTop: 12 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10, flexWrap: "wrap" }}>
        <span style={{ fontWeight: 600, fontSize: 14, color: "var(--text-primary)" }}>🦷 Dental Chart (FDI)</span>
        {["healthy", "planned", "in_progress", "completed", "history"].map(s => (
          <div key={s} style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <div style={{ width: 12, height: 12, borderRadius: 3, background: STATUS_STYLE[s].bg, border: `2px solid ${STATUS_STYLE[s].border}` }} />
            <span style={{ fontSize: 11, color: "var(--text-secondary)", textTransform: "capitalize" }}>
              {s === "healthy" ? "Healthy" : s === "planned" ? "Planned" : s === "in_progress" ? "In Progress" : s === "completed" ? "Treated (this visit)" : "Previously treated"}
            </span>
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
        <div style={{ marginTop: 14, padding: 20, background: "var(--color-surface)", borderRadius: 16, border: "1px solid var(--color-border)", boxShadow: "var(--shadow-md)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, borderBottom: "1px solid var(--color-border)", paddingBottom: 12 }}>
            <span style={{ fontWeight: 800, fontSize: 16, color: "var(--color-navy-900)", display: "flex", alignItems: "center", gap: 8 }}>
              🦷 Tooth Configuration: <span style={{ background: "var(--color-surface-3)", padding: "2px 8px", borderRadius: 6, fontSize: 14 }}>Tooth #{active}</span>
            </span>
            <button
              type="button"
              onClick={() => setActive(null)}
              style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer", color: "var(--color-text-muted)", transition: "color 0.2s" }}
              onMouseEnter={e => e.currentTarget.style.color = "var(--color-text-primary)"}
              onMouseLeave={e => e.currentTarget.style.color = "var(--color-text-muted)"}
            >✕</button>
          </div>
          
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16 }}>
              {/* Procedure Select */}
              <div className="form-group">
                <label className="form-label" style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", color: "var(--color-text-secondary)" }}>Procedure</label>
                <CustomDropdown
                  value={dropdownValue}
                  options={PROCEDURES}
                  onChange={val => handleChange(active, "procedure", val)}
                  placeholder="Select procedure..."
                />
              </div>

              {/* Specify Custom Procedure */}
              {dropdownValue === "Other" && (
                <div className="form-group">
                  <label className="form-label" style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", color: "var(--color-text-secondary)" }}>Specify Procedure</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Enter custom procedure name..."
                    value={activeChartEntry.procedure === "Other" ? "" : activeChartEntry.procedure}
                    onChange={e => handleChange(active, "procedure", e.target.value || "Other")}
                  />
                </div>
              )}

              {/* Session / Stage Input */}
              {activeChartEntry.procedure && (
                <div className="form-group">
                  <label className="form-label" style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", color: "var(--color-text-secondary)" }}>Visit / Stage</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. Visit 1, Crown prep..."
                    value={activeChartEntry.session || ""}
                    onChange={e => handleChange(active, "session", e.target.value)}
                  />
                </div>
              )}

              {/* Planned Visits Input */}
              {activeChartEntry.procedure && (
                <div className="form-group">
                  <label className="form-label" style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", color: "var(--color-text-secondary)" }}>Planned Visits</label>
                  <input
                    type="number"
                    min="1"
                    className="form-input"
                    placeholder="e.g. 3"
                    value={activeChartEntry.planned_visits || ""}
                    onChange={e => handleChange(active, "planned_visits", parseInt(e.target.value) || "")}
                  />
                </div>
              )}
            </div>

            {/* Status Segmented Control */}
            {activeChartEntry.procedure && (
              <div className="form-group">
                <label className="form-label" style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", color: "var(--color-text-secondary)" }}>Treatment Status</label>
                <div style={{ display: "flex", background: "var(--color-surface-2)", border: "1px solid var(--color-border)", borderRadius: "10px", padding: "4px", width: "100%", maxWidth: "420px" }}>
                  {[
                    { id: "planned", label: "Planned", activeColor: "#d97706", activeBg: "#fef9c3", borderColor: "#fef08a" },
                    { id: "in_progress", label: "In Progress", activeColor: "#ea580c", activeBg: "#ffedd5", borderColor: "#fed7aa" },
                    { id: "completed", label: "Completed", activeColor: "#dc2626", activeBg: "#fee2e2", borderColor: "#fca5a5" },
                  ].map((s) => {
                    const isSelected = (activeChartEntry.status || "in_progress") === s.id;
                    return (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => handleChange(active, "status", s.id)}
                        style={{
                          flex: 1,
                          padding: "8px 12px",
                          borderRadius: "8px",
                          fontSize: "13px",
                          fontWeight: 700,
                          cursor: "pointer",
                          border: isSelected ? `1px solid ${s.borderColor}` : "1px solid transparent",
                          background: isSelected ? s.activeBg : "transparent",
                          color: isSelected ? s.activeColor : "var(--color-text-secondary)",
                          transition: "all 0.15s ease",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: "6px",
                          boxShadow: isSelected ? "0 2px 4px rgba(0,0,0,0.04)" : "none",
                        }}
                      >
                        <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: isSelected ? s.activeColor : "var(--color-text-muted)" }} />
                        {s.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Notes Input */}
            <div className="form-group">
              <label className="form-label" style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", color: "var(--color-text-secondary)" }}>Notes</label>
              <textarea
                className="form-input form-textarea"
                placeholder="Specific instructions or observations..."
                value={activeChartEntry.notes || ""}
                onChange={e => handleChange(active, "notes", e.target.value)}
                style={{ minHeight: "70px", padding: "10px 12px" }}
              />
            </div>
            
            {/* Actions */}
            <div style={{ display: "flex", justifySelf: "flex-end", justifyContent: "flex-end", gap: 10, borderTop: "1px solid var(--color-border)", paddingTop: 14, marginTop: 4 }}>
              <button
                type="button"
                onClick={() => handleClear(active)}
                className="btn"
                style={{
                  background: "rgba(239, 68, 68, 0.08)",
                  border: "1px solid rgba(239, 68, 68, 0.2)",
                  color: "#dc2626",
                  padding: "8px 16px",
                  borderRadius: "8px",
                  fontWeight: 600,
                  fontSize: "13px",
                  cursor: "pointer",
                  transition: "all 0.15s",
                }}
                onMouseEnter={e => e.currentTarget.style.background = "rgba(239, 68, 68, 0.15)"}
                onMouseLeave={e => e.currentTarget.style.background = "rgba(239, 68, 68, 0.08)"}
              >
                Clear Tooth
              </button>
              <button
                type="button"
                onClick={() => setActive(null)}
                className="btn btn-primary"
                style={{
                  padding: "8px 20px",
                  borderRadius: "8px",
                  fontWeight: 600,
                  fontSize: "13px",
                  cursor: "pointer",
                }}
              >
                Done
              </button>
            </div>
          </div>

          {/* History for this tooth */}
          {toothHistory[active] && toothHistory[active].length > 0 && (
            <div style={{ marginTop: 12, paddingTop: 10, borderTop: "1px solid var(--color-border)" }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "var(--color-text-secondary)", marginBottom: 8 }}>
                📜 Treatment History for Tooth #{active}:
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 150, overflowY: "auto" }}>
                {toothHistory[active].map((h, i) => {
                  const style = STATUS_STYLE[h.status] || STATUS_STYLE.completed;
                  return (
                    <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, fontSize: 12, padding: "6px 10px", background: "var(--color-surface-2)", borderRadius: 8, border: "1px solid var(--color-border)" }}>
                      <div>
                        <span style={{ color: "var(--color-text-muted)", marginRight: 8, fontSize: 11 }}>
                          {h.date ? new Date(h.date).toLocaleDateString("en-IN") : "Past"}
                        </span>
                        <span style={{ fontWeight: 600, color: "var(--color-text-primary)" }}>{h.procedure}</span>
                        {h.session && (
                          <span style={{ color: "#d97706", fontWeight: 700, marginLeft: 6 }}>({h.session})</span>
                        )}
                        {h.planned_visits && (
                          <span style={{ color: "var(--color-navy-600)", fontWeight: 700, marginLeft: 6 }}>({h.planned_visits} visits)</span>
                        )}
                        {h.notes && (
                          <span style={{ color: "var(--color-text-secondary)", fontSize: 11, display: "block", marginTop: 2 }}>
                            Note: {h.notes}
                          </span>
                        )}
                      </div>
                      <span style={{
                        padding: "2px 8px", borderRadius: 99, fontSize: 10, fontWeight: 700,
                        background: style.bg, color: style.text, border: `1px solid ${style.border}`,
                        whiteSpace: "nowrap"
                      }}>
                        {style.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Read-only history view */}
      {readOnly && Object.keys(toothHistory).length > 0 && (
        <div style={{ marginTop: 14 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-secondary)", marginBottom: 8 }}>🦷 Tooth Treatment History:</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6, maxWidth: 600 }}>
            {Object.entries(toothHistory).map(([tooth, entries]) =>
              entries.map((e, i) => {
                const style = STATUS_STYLE[e.status] || STATUS_STYLE.completed;
                return (
                  <div key={`${tooth}-${i}`} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "6px 12px", background: "var(--color-surface-2)", borderRadius: 8, border: "1px solid var(--color-border)", fontSize: 12 }}>
                    <div>
                      <span style={{ fontWeight: 700, marginRight: 8, color: "var(--color-text-primary)" }}>Tooth #{tooth}</span>
                      <span style={{ fontWeight: 600, color: "var(--color-text-secondary)" }}>{e.procedure}</span>
                      {e.session && (
                        <span style={{ color: "#d97706", fontWeight: 700, marginLeft: 6 }}>({e.session})</span>
                      )}
                      {e.planned_visits && (
                        <span style={{ color: "var(--color-navy-600)", fontWeight: 700, marginLeft: 6 }}>({e.planned_visits} visits)</span>
                      )}
                      {e.notes && <span style={{ color: "var(--color-text-muted)", marginLeft: 8 }}>— {e.notes}</span>}
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ color: "var(--color-text-muted)", fontSize: 11 }}>{e.date ? new Date(e.date).toLocaleDateString("en-IN") : ""}</span>
                      <span style={{
                        padding: "1px 8px", borderRadius: 99, fontSize: 9, fontWeight: 700,
                        background: style.bg, color: style.text, border: `1px solid ${style.border}`
                      }}>{style.label}</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
