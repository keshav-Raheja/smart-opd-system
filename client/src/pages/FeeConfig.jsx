/**
 * FeeConfig.jsx — Admin fee catalogue management
 * Create, edit, toggle, delete fee items per category.
 */

import { useState } from "react";
import { useFeeConfig } from "../hooks/useFeeConfig";
import {
  createFeeConfig,
  updateFeeConfig,
  deleteFeeConfig,
} from "../services/billingService";
import { useToast } from "../context/ToastContext";

const CATEGORY_META = {
  consultation_type:  { label: "Consultation Types",  icon: "🩺", color: "blue" },
  diagnosis_category: { label: "Diagnosis Categories", icon: "🔬", color: "purple" },
  lab_test:           { label: "Lab & Imaging Tests",  icon: "🧪", color: "green" },
  other:              { label: "Other Charges",        icon: "📋", color: "orange" },
};

const CATEGORY_OPTS = Object.entries(CATEGORY_META);

function FeeRow({ item, onUpdated, onDeleted }) {
  const toast = useToast();
  const [editing,  setEditing]  = useState(false);
  const [name,     setName]     = useState(item.name);
  const [fee,      setFee]      = useState(item.default_fee);
  const [saving,   setSaving]   = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      const updated = await updateFeeConfig(item._id, { name, default_fee: parseFloat(fee) });
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
        toast.info("Deactivated", item.name);
        onDeleted(item._id);
      } else {
        const updated = await updateFeeConfig(item._id, { is_active: true });
        onUpdated(updated);
      }
    } catch (e) {
      toast.error("Failed", e.message);
    }
  };

  return (
    <div style={{ overflowX: "auto" }}>
      <div style={{
        display: "grid", gridTemplateColumns: "1fr 120px 90px auto",
        gap: 10, padding: "10px 16px", alignItems: "center",
        borderBottom: "1px solid var(--color-border-subtle)",
        opacity: item.is_active ? 1 : 0.5,
        transition: "opacity 0.2s",
        minWidth: 480,
      }}>
        {editing ? (
          <input className="form-input" value={name} onChange={(e) => setName(e.target.value)} style={{ fontSize: 13 }} />
        ) : (
          <div>
            <span style={{ fontWeight: 600, fontSize: 14 }}>{item.name}</span>
            {item.code && <span style={{ marginLeft: 8, fontSize: 10, color: "var(--color-text-muted)", fontFamily: "monospace" }}>{item.code}</span>}
          </div>
        )}

        {editing ? (
          <div style={{ position: "relative" }}>
            <span style={{ position: "absolute", left: 8, top: "50%", transform: "translateY(-50%)", fontSize: 11 }}>₹</span>
            <input className="form-input" type="number" min="0" value={fee} onChange={(e) => setFee(e.target.value)} style={{ fontSize: 13, paddingLeft: 18 }} />
          </div>
        ) : (
          <span style={{ fontWeight: 700, fontSize: 15, color: "var(--color-accent)" }}>₹{item.default_fee}</span>
        )}

        {/* Active toggle */}
        <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer", fontSize: 12, color: "var(--color-text-secondary)" }}>
          <div
            onClick={handleToggle}
            style={{
              width: 36, height: 20, borderRadius: 99, cursor: "pointer",
              background: item.is_active ? "#3b82f6" : "#d1d5db",
              position: "relative", transition: "background 0.2s", flexShrink: 0,
            }}
          >
            <div style={{
              width: 16, height: 16, borderRadius: "50%", background: "white",
              position: "absolute", top: 2,
              left: item.is_active ? 18 : 2,
              transition: "left 0.2s",
              boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
            }} />
          </div>
          {item.is_active ? "Active" : "Off"}
        </label>

        {/* Actions */}
        <div style={{ display: "flex", gap: 6 }}>
          {editing ? (
            <>
              <button onClick={() => setEditing(false)} className="btn btn-secondary btn-sm">Cancel</button>
              <button onClick={handleSave} disabled={saving} className="btn btn-primary btn-sm">
                {saving ? <span className="spinner" style={{ width: 12, height: 12 }} /> : "Save"}
              </button>
            </>
          ) : (
            <button onClick={() => setEditing(true)} className="btn btn-secondary btn-sm">✏️ Edit</button>
          )}
        </div>
      </div>
    </div>
  );
}

export default function FeeConfig() {
  const toast = useToast();
  const { allFees, grouped, loading, refetch } = useFeeConfig({ activeOnly: false });
  const [activeTab, setActiveTab] = useState("consultation_type");
  const [showAdd, setShowAdd]   = useState(false);
  const [newName, setNewName]   = useState("");
  const [newFee,  setNewFee]    = useState("");
  const [newCode, setNewCode]   = useState("");
  const [newDesc, setNewDesc]   = useState("");
  const [adding,  setAdding]    = useState(false);
  const [localFees, setLocalFees] = useState(null);

  const fees = localFees ?? allFees;
  const byTab = (fees).filter((f) => f.category === activeTab);

  const handleAdd = async () => {
    if (!newName.trim() || !newFee) {
      toast.warning("Missing", "Name and fee are required");
      return;
    }
    setAdding(true);
    try {
      await createFeeConfig({
        category: activeTab,
        name: newName.trim(),
        default_fee: parseFloat(newFee),
        code: newCode.trim() || undefined,
        description: newDesc.trim(),
      });
      toast.success("Added", `${newName} → ₹${newFee}`);
      setNewName(""); setNewFee(""); setNewCode(""); setNewDesc("");
      setShowAdd(false);
      refetch();
      setLocalFees(null);
    } catch (e) {
      toast.error("Failed", e.response?.data?.message || e.message);
    } finally {
      setAdding(false);
    }
  };

  const handleUpdated = (updated) => {
    setLocalFees((prev) => (prev ?? allFees).map((f) => f._id === updated._id ? updated : f));
  };

  const handleDeleted = (id) => {
    setLocalFees((prev) => (prev ?? allFees).map((f) => f._id === id ? { ...f, is_active: false } : f));
  };

  return (
    <div className="animate-fade-in">
      <div className="page-header flex-between">
        <div>
          <h1 className="page-title">⚙️ Fee Configuration</h1>
          <p className="page-subtitle">Manage your clinic's fee catalogue — {fees.length} items configured</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowAdd(!showAdd)}>
          {showAdd ? "✕ Cancel" : "+ Add Fee Item"}
        </button>
      </div>

      {/* ── Category Tabs ─────────────────────────────── */}
      <div className="tab-list" style={{ marginBottom: 20 }}>
        {CATEGORY_OPTS.map(([cat, meta]) => {
          const count = (fees).filter((f) => f.category === cat).length;
          return (
            <button
              key={cat}
              className={`tab-item${activeTab === cat ? " active" : ""}`}
              onClick={() => setActiveTab(cat)}
            >
              {meta.icon} {meta.label} ({count})
            </button>
          );
        })}
      </div>

      {/* ── Add Form ──────────────────────────────────── */}
      {showAdd && (
        <div className="card animate-slide-down" style={{ marginBottom: 20 }}>
          <div className="card-header">
            <h2 className="card-title">+ New Fee Item in {CATEGORY_META[activeTab]?.label}</h2>
          </div>
          <div className="card-body">
            {/* Row 1: Name (wide) + Fee */}
            <div className="grid-form-2" style={{ marginBottom: 12 }}>
              <div className="form-group">
                <label className="form-label">Name *</label>
                <input className="form-input" value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="e.g. Typhoid Panel" />
              </div>
              <div className="form-group">
                <label className="form-label">Default Fee (₹) *</label>
                <input className="form-input" type="number" min="0" value={newFee} onChange={(e) => setNewFee(e.target.value)} placeholder="250" />
              </div>
            </div>
            {/* Row 2: Code + Description */}
            <div className="grid-form-2" style={{ marginBottom: 14 }}>
              <div className="form-group">
                <label className="form-label">Code (optional)</label>
                <input className="form-input" value={newCode} onChange={(e) => setNewCode(e.target.value)} placeholder="LAB_TYPHOID" style={{ textTransform: "uppercase" }} />
              </div>
              <div className="form-group">
                <label className="form-label">Description (optional)</label>
                <input className="form-input" value={newDesc} onChange={(e) => setNewDesc(e.target.value)} placeholder="Short description" />
              </div>
            </div>
            <button onClick={handleAdd} disabled={adding} className="btn btn-success" style={{ minWidth: 160 }}>
              {adding ? <><span className="spinner" style={{ width: 14, height: 14 }} /> Adding…</> : "✅ Add Item"}
            </button>
          </div>
        </div>
      )}

      {/* ── Fee Table ─────────────────────────────────── */}
      <div className="card">
        <div className="card-header">
          <h2 className="card-title">{CATEGORY_META[activeTab]?.icon} {CATEGORY_META[activeTab]?.label}</h2>
          <span style={{ fontSize: 13, color: "var(--color-text-secondary)" }}>{byTab.length} items</span>
        </div>

        {loading ? (
          <div className="card-body">
            {[...Array(5)].map((_, i) => <div key={i} className="skeleton" style={{ height: 40, marginBottom: 8, borderRadius: 8 }} />)}
          </div>
        ) : byTab.length === 0 ? (
          <div className="empty-state">
            <span className="empty-state-icon">📋</span>
            <div className="empty-state-title">No items in this category</div>
          </div>
        ) : (
          <div>
            {/* Scrollable header for the fee table */}
            <div className="table-wrapper" style={{ background: "var(--color-surface-3)" }}>
              <div style={{
                display: "grid", gridTemplateColumns: "1fr 120px 90px auto",
                gap: 10, padding: "8px 16px", minWidth: 480,
                fontSize: 11, fontWeight: 700, color: "var(--color-text-muted)",
                textTransform: "uppercase", letterSpacing: "0.5px",
                borderBottom: "2px solid var(--color-border)",
              }}>
                <span>Name</span><span>Default Fee</span><span>Status</span><span>Actions</span>
              </div>
            </div>
            {byTab.map((item) => (
              <FeeRow key={item._id} item={item} onUpdated={handleUpdated} onDeleted={handleDeleted} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
