/**
 * MyFeeConfig.jsx — Doctor's Personal Fee Catalogue
 * ────────────────────────────────────────────────────
 * Doctors manage ONLY their own custom fee items here.
 * Global (clinic-wide) fees are visible in billing but
 * cannot be edited from this page.
 *
 * Features:
 *  • See all your personal fee items grouped by category
 *  • Add new items (name, fee, category, code, description)
 *  • Edit name / fee inline
 *  • Toggle active/inactive (soft-delete)
 *  • Info panel showing how global defaults work alongside personal ones
 */

import { useState, useEffect, useCallback } from "react";
import {
  getMyFees,
  createFeeConfig,
  updateFeeConfig,
  deleteFeeConfig,
} from "../services/billingService";
import { useToast } from "../context/ToastContext";

// ─── Constants ────────────────────────────────────────────────────────────────
const CATEGORY_META = {
  consultation_type:  { label: "My Consultation Fees", icon: "🩺", color: "blue",   bg: "#dbeafe", text: "#1e40af" },
  diagnosis_category: { label: "My Diagnosis Fees",    icon: "🔬", color: "purple", bg: "#ede9fe", text: "#5b21b6" },
  lab_test:           { label: "My Lab / Imaging Fees",icon: "🧪", color: "green",  bg: "#d1fae5", text: "#065f46" },
  other:              { label: "My Other Charges",     icon: "📋", color: "orange", bg: "#fef3c7", text: "#92400e" },
};

const CATEGORY_OPTS = Object.entries(CATEGORY_META);
const EMPTY_FORM = { name: "", default_fee: "", category: "consultation_type", code: "", description: "" };

// ─── Inline-editable fee row ──────────────────────────────────────────────────
function FeeRow({ item, onUpdated, onToggled }) {
  const toast = useToast();
  const [editing, setEditing] = useState(false);
  const [name,    setName]    = useState(item.name);
  const [fee,     setFee]     = useState(item.default_fee);
  const [saving,  setSaving]  = useState(false);

  const catMeta = CATEGORY_META[item.category] || CATEGORY_META.other;

  const handleSave = async () => {
    if (!name.trim()) { toast.warning("Missing", "Name cannot be empty"); return; }
    setSaving(true);
    try {
      const updated = await updateFeeConfig(item._id, {
        name: name.trim(),
        default_fee: parseFloat(fee) || 0,
      });
      toast.success("Updated", `${updated.name} → ₹${updated.default_fee}`);
      onUpdated(updated);
      setEditing(false);
    } catch (e) {
      toast.error("Failed", e.response?.data?.message || e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async () => {
    try {
      if (item.is_active) {
        await deleteFeeConfig(item._id);
        toast.info("Hidden", `${item.name} hidden from your catalogue`);
        onToggled({ ...item, is_active: false });
      } else {
        const updated = await updateFeeConfig(item._id, { is_active: true });
        onToggled(updated);
        toast.success("Restored", item.name);
      }
    } catch (e) {
      toast.error("Failed", e.message);
    }
  };

  return (
    <div style={{
      display: "grid",
      gridTemplateColumns: "1fr 110px 80px auto",
      gap: 10, padding: "12px 16px",
      alignItems: "center",
      borderBottom: "1px solid var(--color-border-subtle)",
      opacity: item.is_active ? 1 : 0.45,
      transition: "opacity 0.2s",
      background: item.is_active ? "transparent" : "var(--color-surface-3)",
    }}>
      {/* Name */}
      {editing ? (
        <input
          className="form-input"
          value={name}
          onChange={(e) => setName(e.target.value)}
          style={{ fontSize: 13 }}
          autoFocus
        />
      ) : (
        <div>
          <span style={{ fontWeight: 600, fontSize: 14 }}>{item.name}</span>
          {item.code && (
            <span style={{
              marginLeft: 8, fontSize: 10, fontFamily: "monospace",
              color: "var(--color-text-muted)",
              background: "var(--color-surface-3)",
              padding: "1px 6px", borderRadius: 4,
            }}>
              {item.code}
            </span>
          )}
          {!item.is_active && (
            <span style={{ marginLeft: 8, fontSize: 10, color: "#ef4444", fontWeight: 700 }}>HIDDEN</span>
          )}
        </div>
      )}

      {/* Fee */}
      {editing ? (
        <div style={{ position: "relative" }}>
          <span style={{ position: "absolute", left: 8, top: "50%", transform: "translateY(-50%)", fontSize: 11 }}>₹</span>
          <input
            className="form-input"
            type="number" min="0"
            value={fee}
            onChange={(e) => setFee(e.target.value)}
            style={{ fontSize: 13, paddingLeft: 18 }}
          />
        </div>
      ) : (
        <span style={{
          fontWeight: 700, fontSize: 16,
          color: catMeta.text,
        }}>
          ₹{item.default_fee}
        </span>
      )}

      {/* Toggle */}
      <div
        onClick={handleToggle}
        title={item.is_active ? "Click to hide from catalogue" : "Click to restore"}
        style={{
          width: 38, height: 22, borderRadius: 99, cursor: "pointer",
          background: item.is_active ? "#3b82f6" : "#d1d5db",
          position: "relative", transition: "background 0.2s",
          flexShrink: 0,
        }}
      >
        <div style={{
          width: 18, height: 18, borderRadius: "50%", background: "white",
          position: "absolute", top: 2,
          left: item.is_active ? 18 : 2,
          transition: "left 0.2s",
          boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
        }} />
      </div>

      {/* Actions */}
      <div style={{ display: "flex", gap: 6 }}>
        {editing ? (
          <>
            <button
              onClick={() => { setEditing(false); setName(item.name); setFee(item.default_fee); }}
              className="btn btn-secondary btn-sm"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="btn btn-primary btn-sm"
            >
              {saving ? <span className="spinner" style={{ width: 12, height: 12 }} /> : "Save"}
            </button>
          </>
        ) : (
          <button onClick={() => setEditing(true)} className="btn btn-secondary btn-sm">
            ✏️ Edit
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function MyFeeConfig() {
  const toast = useToast();
  const user  = JSON.parse(localStorage.getItem("user") || "{}");
  const isAdmin = user?.role === "Admin";

  const [fees,      setFees]      = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [activeTab, setActiveTab] = useState("consultation_type");
  const [showAdd,   setShowAdd]   = useState(false);
  const [form,      setForm]      = useState(EMPTY_FORM);
  const [adding,    setAdding]    = useState(false);

  // ── Fetch personal fees ────────────────────────────────────────────────────
  const loadFees = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getMyFees();
      setFees(data);
    } catch (e) {
      toast.error("Load Error", "Could not load your fee catalogue");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadFees(); }, [loadFees]);

  const byTab = fees.filter((f) => f.category === activeTab);

  // ── Add fee ────────────────────────────────────────────────────────────────
  const handleAdd = async () => {
    if (!form.name.trim() || !form.default_fee) {
      toast.warning("Missing", "Name and fee amount are required");
      return;
    }
    setAdding(true);
    try {
      const created = await createFeeConfig({
        category:    form.category,
        name:        form.name.trim(),
        default_fee: parseFloat(form.default_fee),
        code:        form.code.trim() || undefined,
        description: form.description.trim(),
      });
      setFees((prev) => [...prev, created]);
      setForm(EMPTY_FORM);
      setShowAdd(false);
      setActiveTab(form.category);
      toast.success("Added", `${created.name} → ₹${created.default_fee} added to your catalogue`);
    } catch (e) {
      toast.error("Failed", e.response?.data?.message || e.message);
    } finally {
      setAdding(false);
    }
  };

  const onUpdated = (updated) =>
    setFees((prev) => prev.map((f) => f._id === updated._id ? updated : f));

  const onToggled = (toggled) =>
    setFees((prev) => prev.map((f) => f._id === toggled._id ? toggled : f));

  return (
    <div className="animate-fade-in" style={{ display: "flex", flexDirection: "column", gap: 20 }}>

      {/* ── Page Header ─────────────────────────────────────────────────────── */}
      <div className="page-header flex-between">
        <div>
          <h1 className="page-title">💊 My Fee Catalogue</h1>
          <p className="page-subtitle">
            Dr. {user?.name} · {fees.length} personal fee{fees.length !== 1 ? "s" : ""} defined
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowAdd((p) => !p)}>
          {showAdd ? "✕ Cancel" : "+ Add Fee Item"}
        </button>
      </div>

      {/* ── Info Banner ──────────────────────────────────────────────────────── */}
      <div style={{
        background: "linear-gradient(135deg, #1e3a5f, #1d4ed8)",
        borderRadius: "var(--radius-lg)", padding: "16px 20px",
        color: "white", display: "flex", gap: 14, alignItems: "flex-start",
      }}>
        <div style={{ fontSize: 24, flexShrink: 0 }}>ℹ️</div>
        <div>
          <div style={{ fontWeight: 700, marginBottom: 4, fontSize: 14 }}>How your personal catalogue works</div>
          <div style={{ fontSize: 12, opacity: 0.85, lineHeight: 1.6 }}>
            • <strong>Global fees</strong> (set by your clinic admin) are always available in billing — you don't need to add them here.<br />
            • Items you add here are <strong>only visible to you</strong> — no other doctor sees them.<br />
            • You can override any fee amount at billing time regardless of the catalogue price.<br />
            • Hiding a fee removes it from your billing picker but doesn't delete it permanently.
          </div>
        </div>
      </div>

      {/* ── Add Form ─────────────────────────────────────────────────────────── */}
      {showAdd && (
        <div className="card animate-slide-down">
          <div className="card-header">
            <h2 className="card-title">➕ Add to My Catalogue</h2>
          </div>
          <div className="card-body">
            {/* Row 1: Category + Name */}
            <div className="grid-form-2" style={{ marginBottom: 12 }}>
              <div className="form-group">
                <label className="form-label">Category *</label>
                <select
                  className="form-input form-select"
                  value={form.category}
                  onChange={(e) => setForm((p) => ({ ...p, category: e.target.value }))}
                >
                  {CATEGORY_OPTS.map(([cat, meta]) => (
                    <option key={cat} value={cat}>{meta.icon} {meta.label}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Fee Name *</label>
                <input
                  className="form-input"
                  placeholder="e.g. Root Canal Treatment"
                  value={form.name}
                  onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                />
              </div>
            </div>

            {/* Row 2: Amount + Code */}
            <div className="grid-form-2" style={{ marginBottom: 12 }}>
              <div className="form-group">
                <label className="form-label">Default Amount (₹) *</label>
                <input
                  className="form-input"
                  type="number" min="0"
                  placeholder="e.g. 2500"
                  value={form.default_fee}
                  onChange={(e) => setForm((p) => ({ ...p, default_fee: e.target.value }))}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Short Code <span style={{ opacity: 0.5 }}>(optional)</span></label>
                <input
                  className="form-input"
                  placeholder="e.g. DENT_RC"
                  value={form.code}
                  onChange={(e) => setForm((p) => ({ ...p, code: e.target.value.toUpperCase() }))}
                  style={{ textTransform: "uppercase" }}
                />
              </div>
            </div>

            {/* Description */}
            <div className="form-group" style={{ marginBottom: 16 }}>
              <label className="form-label">Description <span style={{ opacity: 0.5 }}>(optional)</span></label>
              <input
                className="form-input"
                placeholder="Brief description shown on bills…"
                value={form.description}
                onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
              />
            </div>

            {/* Preview */}
            {form.name && form.default_fee && (
              <div style={{
                padding: "10px 14px", borderRadius: 10,
                background: CATEGORY_META[form.category]?.bg,
                color: CATEGORY_META[form.category]?.text,
                fontSize: 13, fontWeight: 600, marginBottom: 16,
                display: "flex", justifyContent: "space-between",
              }}>
                <span>{CATEGORY_META[form.category]?.icon} {form.name}</span>
                <span>₹{parseFloat(form.default_fee || 0).toLocaleString("en-IN")}</span>
              </div>
            )}

            <button
              onClick={handleAdd}
              disabled={adding}
              className="btn btn-success"
              style={{ width: "100%" }}
            >
              {adding
                ? <><span className="spinner" style={{ width: 14, height: 14 }} /> Adding…</>
                : "✅ Add to My Catalogue"
              }
            </button>
          </div>
        </div>
      )}

      {/* ── Category Tabs ─────────────────────────────────────────────────────── */}
      <div className="tab-list">
        {CATEGORY_OPTS.map(([cat, meta]) => {
          const count = fees.filter((f) => f.category === cat).length;
          return (
            <button
              key={cat}
              className={`tab-item${activeTab === cat ? " active" : ""}`}
              onClick={() => setActiveTab(cat)}
            >
              {meta.icon} {meta.label.replace("My ", "")}
              {count > 0 && (
                <span className="nav-badge" style={{ marginLeft: 4 }}>{count}</span>
              )}
            </button>
          );
        })}
      </div>

      {/* ── Fee List ──────────────────────────────────────────────────────────── */}
      <div className="card">
        <div className="card-header flex-between">
          <h2 className="card-title">
            {CATEGORY_META[activeTab]?.icon} {CATEGORY_META[activeTab]?.label}
          </h2>
          <span style={{ fontSize: 12, color: "var(--color-text-muted)" }}>
            {byTab.length} item{byTab.length !== 1 ? "s" : ""}
          </span>
        </div>

        {loading ? (
          <div className="card-body">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="skeleton" style={{ height: 40, marginBottom: 8, borderRadius: 8 }} />
            ))}
          </div>
        ) : byTab.length === 0 ? (
          <div className="empty-state" style={{ padding: "32px 20px" }}>
            <span className="empty-state-icon">📋</span>
            <div className="empty-state-title">No personal fees in this category</div>
            <p style={{ fontSize: 13, color: "var(--color-text-muted)", marginBottom: 16 }}>
              Global clinic fees are still available in your billing picker.<br />
              Add personal items here for your specialty-specific charges.
            </p>
            <button
              className="btn btn-primary btn-sm"
              onClick={() => { setForm((p) => ({ ...p, category: activeTab })); setShowAdd(true); }}
            >
              + Add {CATEGORY_META[activeTab]?.label.replace("My ", "")}
            </button>
          </div>
        ) : (
          <div>
            {/* Column headers */}
            <div style={{
              display: "grid", gridTemplateColumns: "1fr 110px 80px auto",
              gap: 10, padding: "8px 16px",
              fontSize: 10, fontWeight: 700, color: "var(--color-text-muted)",
              textTransform: "uppercase", letterSpacing: "0.5px",
              background: "var(--color-surface-3)",
              borderBottom: "2px solid var(--color-border)",
            }}>
              <span>Fee Name</span>
              <span>Your Price</span>
              <span>Visible</span>
              <span>Actions</span>
            </div>

            {byTab.map((item) => (
              <FeeRow key={item._id} item={item} onUpdated={onUpdated} onToggled={onToggled} />
            ))}
          </div>
        )}
      </div>

    </div>
  );
}
