/**
 * PrescriptionMedicineCard.jsx
 * ─────────────────────────────
 * Improvements:
 *   ✅ Debounced search (300ms) — no API call on every keystroke
 *   ✅ Shows up to 20 medicines (was 3)
 *   ✅ Displays category + strength in suggestion dropdown
 *   ✅ Keyboard navigation (↑ ↓ Enter Escape)
 *   ✅ Loading indicator while fetching
 *   ✅ Full dosage, duration, frequency, instructions fields
 *   ✅ Consistent design system (no Tailwind classes)
 */

import { useState, useEffect, useRef, useCallback } from "react";
import api from "../services/api";

const FREQUENCY_OPTS = [
  "Once daily",
  "Twice daily",
  "Three times daily",
  "Four times daily",
  "Every 6 hours",
  "Every 8 hours",
  "Every 12 hours",
  "As needed (SOS)",
  "At bedtime",
  "Before meals",
  "After meals",
];

const DURATION_OPTS = [
  "1 day", "2 days", "3 days", "5 days",
  "1 week", "2 weeks", "3 weeks",
  "1 month", "2 months", "3 months",
  "Ongoing / Long-term",
];

const CATEGORY_COLORS = {
  Antibiotic:     { bg: "#fee2e2", text: "#991b1b" },
  Analgesic:      { bg: "#fef3c7", text: "#92400e" },
  Antacid:        { bg: "#d1fae5", text: "#065f46" },
  Antifungal:     { bg: "#ede9fe", text: "#5b21b6" },
  Antihistamine:  { bg: "#dbeafe", text: "#1e40af" },
  Vitamin:        { bg: "#dcfce7", text: "#15803d" },
  Antidiabetic:   { bg: "#ffedd5", text: "#9a3412" },
  Antihypertensive: { bg: "#f0f9ff", text: "#0369a1" },
};

function CategoryTag({ category }) {
  if (!category) return null;
  const colors = CATEGORY_COLORS[category] || { bg: "#f1f5f9", text: "#475569" };
  return (
    <span style={{
      padding: "1px 7px", borderRadius: 99,
      fontSize: 10, fontWeight: 700,
      background: colors.bg, color: colors.text,
      whiteSpace: "nowrap",
    }}>
      {category}
    </span>
  );
}

function PrescriptionMedicineCard({ medicine, index, handleMedicineChange, removeMedicine }) {
  const [suggestions,  setSuggestions]  = useState([]);
  const [loading,      setLoading]      = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [activeIdx,    setActiveIdx]    = useState(-1);

  const debounceRef = useRef(null);
  const inputRef    = useRef(null);
  const listRef     = useRef(null);

  // ── Debounced search ─────────────────────────────────────────────────────────
  const performSearch = useCallback(async (value) => {
    if (value.trim().length < 1) {
      setSuggestions([]);
      setDropdownOpen(false);
      return;
    }
    setLoading(true);
    try {
      const res = await api.get(`/medicines/search?query=${encodeURIComponent(value)}&limit=20`);
      setSuggestions(res.data || []);
      setDropdownOpen((res.data || []).length > 0);
      setActiveIdx(-1);
    } catch {
      setSuggestions([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleNameChange = (value) => {
    handleMedicineChange(index, "name", value);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => performSearch(value), 300);
  };

  // ── Select from dropdown ─────────────────────────────────────────────────────
  const selectMedicine = (item) => {
    handleMedicineChange(index, "name", item.name);
    // Auto-fill strength if available
    if (item.strength) handleMedicineChange(index, "dosage", item.strength);
    setSuggestions([]);
    setDropdownOpen(false);
    inputRef.current?.focus();
  };

  // ── Keyboard navigation ──────────────────────────────────────────────────────
  const handleKeyDown = (e) => {
    if (!dropdownOpen || suggestions.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIdx((p) => Math.min(p + 1, suggestions.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIdx((p) => Math.max(p - 1, 0));
    } else if (e.key === "Enter" && activeIdx >= 0) {
      e.preventDefault();
      selectMedicine(suggestions[activeIdx]);
    } else if (e.key === "Escape") {
      setDropdownOpen(false);
    }
  };

  // Scroll active item into view
  useEffect(() => {
    if (activeIdx >= 0 && listRef.current) {
      const item = listRef.current.children[activeIdx];
      item?.scrollIntoView({ block: "nearest" });
    }
  }, [activeIdx]);

  // Close on outside click
  useEffect(() => {
    const handler = (e) => {
      if (!e.target.closest(`#med-card-${index}`)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [index]);

  const change = (field, val) => handleMedicineChange(index, field, val);

  return (
    <div
      id={`med-card-${index}`}
      className="animate-fade-in"
      style={{
        background: "var(--color-surface-2)",
        border: "1.5px solid var(--color-border)",
        borderRadius: "var(--radius-lg)",
        padding: "16px",
        position: "relative",
      }}
    >
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{
            width: 26, height: 26, borderRadius: "50%",
            background: "linear-gradient(135deg, #3b82f6, #8b5cf6)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 12, fontWeight: 800, color: "white", flexShrink: 0,
          }}>
            {index + 1}
          </div>
          <span style={{ fontWeight: 700, fontSize: 13, color: "var(--color-text-secondary)" }}>
            💊 Medicine #{index + 1}
          </span>
        </div>
        <button
          onClick={() => removeMedicine(index)}
          style={{
            background: "var(--color-danger-light)", color: "var(--color-danger)",
            border: "none", borderRadius: "var(--radius-sm)",
            padding: "4px 10px", fontSize: 12, fontWeight: 600,
            cursor: "pointer", transition: "all 0.15s",
          }}
          onMouseEnter={(e) => e.currentTarget.style.background = "#fecaca"}
          onMouseLeave={(e) => e.currentTarget.style.background = "var(--color-danger-light)"}
        >
          ✕ Remove
        </button>
      </div>

      {/* ── Medicine Name Search ─────────────────────────────────────────────── */}
      <div style={{ position: "relative", marginBottom: 10 }}>
        <label className="form-label">Medicine Name *</label>
        <div style={{ position: "relative" }}>
          <input
            ref={inputRef}
            type="text"
            className="form-input"
            placeholder="Start typing to search medicines…"
            value={medicine.name || ""}
            onChange={(e) => handleNameChange(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => {
              if (suggestions.length > 0) setDropdownOpen(true);
            }}
            autoComplete="off"
          />
          {loading && (
            <div style={{
              position: "absolute", right: 12, top: "50%",
              transform: "translateY(-50%)",
            }}>
              <span className="spinner dark" style={{ width: 14, height: 14 }} />
            </div>
          )}
        </div>

        {/* Suggestion Dropdown */}
        {dropdownOpen && suggestions.length > 0 && (
          <div
            ref={listRef}
            className="animate-slide-down"
            style={{
              position: "absolute", zIndex: 1000, left: 0, right: 0, top: "100%",
              background: "white",
              border: "1.5px solid var(--color-border)",
              borderRadius: "var(--radius-md)",
              boxShadow: "var(--shadow-lg)",
              maxHeight: 260,
              overflowY: "auto",
              marginTop: 4,
            }}
          >
            <div style={{
              padding: "6px 12px",
              fontSize: 10, fontWeight: 700,
              color: "var(--color-text-muted)",
              textTransform: "uppercase", letterSpacing: "0.5px",
              borderBottom: "1px solid var(--color-border-subtle)",
              background: "var(--color-surface-3)",
            }}>
              {suggestions.length} results — ↑↓ navigate · Enter to select
            </div>

            {suggestions.map((item, i) => (
              <div
                key={item.id || i}
                onMouseDown={() => selectMedicine(item)}
                onMouseEnter={() => setActiveIdx(i)}
                style={{
                  padding: "10px 14px",
                  cursor: "pointer",
                  borderBottom: "1px solid var(--color-border-subtle)",
                  background: activeIdx === i ? "var(--color-accent-glow)" : "white",
                  transition: "background 0.1s",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 8,
                }}
              >
                <div>
                  <div style={{ fontWeight: 600, fontSize: 14, color: "var(--color-text-primary)" }}>
                    {item.name}
                  </div>
                  {item.strength && (
                    <div style={{ fontSize: 11, color: "var(--color-text-muted)", marginTop: 1 }}>
                      {item.strength}
                    </div>
                  )}
                </div>
                <div style={{ display: "flex", gap: 6, alignItems: "center", flexShrink: 0 }}>
                  <CategoryTag category={item.category} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Dosage + Frequency (2 col grid) ─────────────────────────────────── */}
      <div className="grid-form-2" style={{ marginBottom: 10 }}>
        <div className="form-group">
          <label className="form-label">Dosage / Strength</label>
          <input
            type="text"
            className="form-input"
            placeholder="e.g. 500mg, 10ml"
            value={medicine.dosage || ""}
            onChange={(e) => change("dosage", e.target.value)}
          />
        </div>
        <div className="form-group">
          <label className="form-label">Frequency</label>
          <select
            className="form-input form-select"
            value={medicine.frequency || ""}
            onChange={(e) => change("frequency", e.target.value)}
          >
            <option value="">Select frequency…</option>
            {FREQUENCY_OPTS.map((f) => <option key={f}>{f}</option>)}
          </select>
        </div>
      </div>

      {/* ── Duration + Instructions ──────────────────────────────────────────── */}
      <div className="grid-form-2">
        <div className="form-group">
          <label className="form-label">Duration</label>
          <select
            className="form-input form-select"
            value={medicine.duration || ""}
            onChange={(e) => change("duration", e.target.value)}
          >
            <option value="">Select duration…</option>
            {DURATION_OPTS.map((d) => <option key={d}>{d}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">Special Instructions</label>
          <input
            type="text"
            className="form-input"
            placeholder="e.g. Take after meals"
            value={medicine.instructions || ""}
            onChange={(e) => change("instructions", e.target.value)}
          />
        </div>
      </div>
    </div>
  );
}

export default PrescriptionMedicineCard;