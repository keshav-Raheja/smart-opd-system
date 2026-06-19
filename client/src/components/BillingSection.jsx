/**
 * BillingSection.jsx
 * ──────────────────
 * Reusable billing form embedded in the ConsultationWorkspace.
 * Doctors build the bill here after finishing a consultation.
 *
 * Props:
 *   patient   { patient_id, patient_name, doctor_name }
 *   visitId   string | null
 *   onBillCreated  (bill) => void   callback after successful creation
 */

import { useState, useCallback } from "react";
import { useFeeConfig } from "../hooks/useFeeConfig";
import { useBilling }   from "../hooks/useBilling";
import { useToast }     from "../context/ToastContext";

// ── Constants ─────────────────────────────────────────────────────────────────

const CATEGORY_LABELS = {
  consultation_type:  { label: "Consultation",  icon: "🩺", color: "#dbeafe", text: "#1e40af" },
  diagnosis_category: { label: "Diagnosis",     icon: "🔬", color: "#ede9fe", text: "#5b21b6" },
  lab_test:           { label: "Lab / Imaging", icon: "🧪", color: "#d1fae5", text: "#065f46" },
  other:              { label: "Other Charges", icon: "📋", color: "#fef3c7", text: "#92400e" },
};

const PAYMENT_METHODS = ["Cash", "Card", "UPI", "Insurance"];

const DISCOUNT_TYPES = [
  { value: "flat",    label: "₹ Flat" },
  { value: "percent", label: "% Percent" },
];

// ── Line-item row ─────────────────────────────────────────────────────────────

function LineItemRow({ item, index, onUpdate, onRemove }) {
  return (
    <div style={{
      display: "grid",
      gridTemplateColumns: "1fr 80px 100px 90px 36px",
      gap: 8,
      padding: "10px 12px",
      background: "var(--color-surface-2)",
      borderRadius: 10,
      border: "1px solid var(--color-border)",
      alignItems: "center",
    }}>
      <div style={{ fontSize: 13, fontWeight: 600, color: "var(--color-text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
        {item.description}
        <span style={{
          marginLeft: 6, fontSize: 10, fontWeight: 700, padding: "1px 6px", borderRadius: 99,
          background: CATEGORY_LABELS[item.type]?.color || "#f1f5f9",
          color:      CATEGORY_LABELS[item.type]?.text  || "#475569",
        }}>
          {CATEGORY_LABELS[item.type]?.label || item.type}
        </span>
      </div>

      {/* Quantity */}
      <input
        type="number"
        min="1"
        value={item.quantity}
        onChange={(e) => onUpdate(index, "quantity", parseFloat(e.target.value) || 1)}
        className="form-input"
        style={{ padding: "5px 8px", fontSize: 13, textAlign: "center" }}
      />

      {/* Unit Price */}
      <div style={{ position: "relative" }}>
        <span style={{ position: "absolute", left: 8, top: "50%", transform: "translateY(-50%)", fontSize: 11, color: "var(--color-text-muted)" }}>₹</span>
        <input
          type="number"
          min="0"
          value={item.unit_price}
          onChange={(e) => onUpdate(index, "unit_price", parseFloat(e.target.value) || 0)}
          className="form-input"
          style={{ padding: "5px 8px 5px 18px", fontSize: 13 }}
        />
      </div>

      {/* Amount */}
      <div style={{ fontWeight: 700, fontSize: 14, textAlign: "right", color: "var(--color-text-primary)" }}>
        ₹{(item.quantity * item.unit_price).toFixed(0)}
      </div>

      {/* Remove */}
      <button
        onClick={() => onRemove(index)}
        style={{ background: "#fee2e2", border: "none", borderRadius: 8, width: 36, height: 36, cursor: "pointer", fontSize: 14, color: "#dc2626" }}
      >
        ✕
      </button>
    </div>
  );
}

// ── Fee picker sheet ──────────────────────────────────────────────────────────

function FeePicker({ grouped, onSelect, onClose }) {
  const [activeTab, setActiveTab] = useState("consultation_type");

  return (
    <div style={{
      position: "absolute", top: "100%", right: 0, width: 330, zIndex: 200,
      background: "white", borderRadius: 14, boxShadow: "0 20px 60px rgba(0,0,0,0.18)",
      border: "1px solid var(--color-border)", overflow: "hidden", marginTop: 8,
    }}>
      {/* Tabs - horizontally scrollable if needed with premium style */}
      <div style={{
        display: "flex",
        overflowX: "auto",
        scrollbarWidth: "none",
        borderBottom: "1px solid var(--color-border)",
        background: "var(--color-surface-3)",
        msOverflowStyle: "none",
      }}>
        {Object.entries(CATEGORY_LABELS).map(([cat, meta]) => (
          <button
            key={cat}
            onClick={() => setActiveTab(cat)}
            style={{
              flex: "1 0 auto",
              padding: "12px 14px",
              border: "none",
              cursor: "pointer",
              background: activeTab === cat ? "white" : "transparent",
              fontWeight: activeTab === cat ? 700 : 600,
              fontSize: 11,
              color: activeTab === cat ? meta.text : "var(--color-text-secondary)",
              borderBottom: activeTab === cat ? `2px solid ${meta.text}` : "2px solid transparent",
              transition: "all 0.15s",
              whiteSpace: "nowrap",
            }}
          >
            {meta.icon} {meta.label}
          </button>
        ))}
      </div>

      {/* Items */}
      <div style={{ maxHeight: 240, overflowY: "auto", padding: 12, display: "flex", flexDirection: "column", gap: 4 }}>
        {(grouped[activeTab] || []).map((fee) => (
          <button
            key={fee._id}
            onClick={() => { onSelect(fee, activeTab); onClose(); }}
            style={{
              display: "flex", justifyContent: "space-between", alignItems: "center",
              padding: "9px 12px", border: "1px solid var(--color-border)", borderRadius: 8,
              cursor: "pointer", background: "white", textAlign: "left", transition: "all 0.15s",
              fontSize: 13,
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = "var(--color-surface-2)"}
            onMouseLeave={(e) => e.currentTarget.style.background = "white"}
          >
            <span style={{ fontWeight: 600, color: "var(--color-text-primary)" }}>{fee.name}</span>
            <span style={{
              fontWeight: 700, fontSize: 13,
              color: CATEGORY_LABELS[activeTab].text,
              background: CATEGORY_LABELS[activeTab].color,
              padding: "2px 8px", borderRadius: 99,
            }}>
              ₹{fee.default_fee}
            </span>
          </button>
        ))}
        {(grouped[activeTab] || []).length === 0 && (
          <p style={{ textAlign: "center", color: "var(--color-text-muted)", fontSize: 13, padding: "20px 0" }}>
            No items in this category
          </p>
        )}
      </div>
    </div>
  );
}

// ── Main BillingSection ───────────────────────────────────────────────────────

export default function BillingSection({ patient, visitId, onBillCreated }) {
  const toast                     = useToast();
  const { grouped, loading: feeLoading } = useFeeConfig();
  const { createBill, loading: saving }  = useBilling();

  const [lineItems,      setLineItems]      = useState([]);
  const [pickerOpen,     setPickerOpen]     = useState(false);
  const [discountType,   setDiscountType]   = useState("flat");
  const [discountValue,  setDiscountValue]  = useState(0);
  const [paymentMethod,  setPaymentMethod]  = useState("Cash");
  const [amountPaid,     setAmountPaid]     = useState(0);
  const [notes,          setNotes]          = useState("");
  const [customDesc,     setCustomDesc]     = useState("");
  const [customPrice,    setCustomPrice]    = useState("");

  // ── Add from fee picker ────────────────────────────────
  const handleFeeSelect = useCallback((fee, category) => {
    setLineItems((prev) => [
      ...prev,
      {
        type:        category,
        description: fee.name,
        quantity:    1,
        unit_price:  fee.default_fee,
      },
    ]);
  }, []);

  // ── Add custom charge ──────────────────────────────────
  const addCustom = () => {
    if (!customDesc.trim() || !customPrice) return;
    setLineItems((prev) => [
      ...prev,
      { type: "other", description: customDesc.trim(), quantity: 1, unit_price: parseFloat(customPrice) },
    ]);
    setCustomDesc("");
    setCustomPrice("");
  };

  // ── Update existing line item ──────────────────────────
  const updateItem = (idx, field, value) =>
    setLineItems((prev) => prev.map((it, i) => i === idx ? { ...it, [field]: value } : it));

  const removeItem = (idx) =>
    setLineItems((prev) => prev.filter((_, i) => i !== idx));

  // ── Totals ─────────────────────────────────────────────
  const subtotal = lineItems.reduce((s, it) => s + it.quantity * it.unit_price, 0);
  const discountAmount = discountType === "percent"
    ? (subtotal * discountValue) / 100
    : Math.min(discountValue, subtotal);
  const total       = Math.max(subtotal - discountAmount, 0);
  const amountDue   = Math.max(total - amountPaid, 0);

  const payStatus =
    amountPaid >= total && total > 0 ? "Paid"
    : amountPaid > 0 ? "Partial"
    : "Pending";

  // ── Submit ─────────────────────────────────────────────
  const handleSubmit = async () => {
    if (lineItems.length === 0) {
      toast.warning("Empty Bill", "Add at least one charge item");
      return;
    }

    const payload = {
      patient_id:     patient.patient_id,
      patient_name:   patient.patient_name,
      doctor_name:    patient.doctor_name || "",
      visit_id:       visitId || null,
      appointment_id: patient._id || null,
      line_items:     lineItems.map((it) => ({
        type:        it.type,
        description: it.description,
        quantity:    it.quantity,
        unit_price:  it.unit_price,
        amount:      it.quantity * it.unit_price,
      })),
      discount_type:  discountType,
      discount_value: discountValue,
      tax_percent:    0,
      payment_method: paymentMethod,
      amount_paid:    amountPaid,
      notes,
    };

    const { ok, data, error } = await createBill(payload);
    if (ok) {
      toast.success("Bill Created", `${data.bill_number} — ₹${data.total_amount} · ${data.payment_status}`);
      setLineItems([]);
      setAmountPaid(0);
      setDiscountValue(0);
      setNotes("");
      onBillCreated?.(data);
    } else {
      toast.error("Failed", error);
    }
  };

  // ─────────────────────────────────────────────────────────
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

      {/* ── Charge items ──────────────────────────────── */}
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <div style={{ fontWeight: 700, fontSize: 14, color: "var(--color-text-secondary)" }}>
            💰 CHARGE ITEMS ({lineItems.length})
          </div>

          {/* Fee picker button */}
          <div style={{ position: "relative" }}>
            <button
              disabled={feeLoading}
              onClick={() => setPickerOpen((p) => !p)}
              className="btn btn-primary btn-sm"
            >
              {feeLoading ? "Loading fees…" : "+ Add from Catalogue"}
            </button>
            {pickerOpen && (
              <>
                <div
                  style={{ position: "fixed", inset: 0, zIndex: 199 }}
                  onClick={() => setPickerOpen(false)}
                />
                <FeePicker
                  grouped={grouped}
                  onSelect={handleFeeSelect}
                  onClose={() => setPickerOpen(false)}
                />
              </>
            )}
          </div>
        </div>

        {/* Line items list */}
        {lineItems.length === 0 ? (
          <div style={{
            padding: "24px", textAlign: "center",
            background: "var(--color-surface-3)", borderRadius: 12,
            border: "1px dashed var(--color-border)",
            color: "var(--color-text-muted)", fontSize: 13,
          }}>
            <div style={{ fontSize: 28, marginBottom: 8 }}>💳</div>
            Click "+ Add from Catalogue" to select fees, or add a custom charge below
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {/* Column headers */}
            <div style={{
              display: "grid", gridTemplateColumns: "1fr 80px 100px 90px 36px",
              gap: 8, padding: "4px 12px",
              fontSize: 11, fontWeight: 700, color: "var(--color-text-muted)",
              textTransform: "uppercase", letterSpacing: "0.5px",
            }}>
              <span>Description</span>
              <span style={{ textAlign: "center" }}>Qty</span>
              <span>Unit Price</span>
              <span style={{ textAlign: "right" }}>Amount</span>
              <span />
            </div>
            {lineItems.map((item, i) => (
              <LineItemRow
                key={i}
                item={item}
                index={i}
                onUpdate={updateItem}
                onRemove={removeItem}
              />
            ))}
          </div>
        )}
      </div>

      {/* ── Custom charge row ─────────────────────────── */}
      <div style={{
        display: "grid", gridTemplateColumns: "1fr 110px auto",
        gap: 8, padding: "10px 12px",
        background: "#f8faff", borderRadius: 10, border: "1px dashed #93c5fd",
      }}>
        <input
          type="text"
          className="form-input"
          placeholder="Custom charge description…"
          value={customDesc}
          onChange={(e) => setCustomDesc(e.target.value)}
          style={{ fontSize: 13 }}
          onKeyDown={(e) => e.key === "Enter" && addCustom()}
        />
        <div style={{ position: "relative" }}>
          <span style={{ position: "absolute", left: 8, top: "50%", transform: "translateY(-50%)", fontSize: 12, color: "var(--color-text-muted)" }}>₹</span>
          <input
            type="number" min="0"
            className="form-input"
            placeholder="Amount"
            value={customPrice}
            onChange={(e) => setCustomPrice(e.target.value)}
            style={{ paddingLeft: 20, fontSize: 13 }}
            onKeyDown={(e) => e.key === "Enter" && addCustom()}
          />
        </div>
        <button
          onClick={addCustom}
          disabled={!customDesc.trim() || !customPrice}
          className="btn btn-secondary btn-sm"
        >
          Add
        </button>
      </div>

      {/* ── Discount row ──────────────────────────────── */}
      <div style={{ display: "grid", gridTemplateColumns: "120px 1fr", gap: 8 }}>
        <div className="form-group">
          <label className="form-label">Discount</label>
          <select
            className="form-input form-select"
            value={discountType}
            onChange={(e) => setDiscountType(e.target.value)}
          >
            {DISCOUNT_TYPES.map((d) => (
              <option key={d.value} value={d.value}>{d.label}</option>
            ))}
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">Value</label>
          <input
            type="number" min="0"
            className="form-input"
            value={discountValue}
            onChange={(e) => setDiscountValue(parseFloat(e.target.value) || 0)}
          />
        </div>
      </div>

      {/* ── Bill Summary ──────────────────────────────── */}
      <div style={{
        background: "linear-gradient(135deg, #0f172a, #1e3a5f)",
        borderRadius: 14, padding: "16px 20px", color: "white",
      }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {[
            { label: "Subtotal",  value: subtotal },
            { label: `Discount (${discountType === "percent" ? `${discountValue}%` : "flat"})`, value: -discountAmount, hide: discountAmount === 0 },
          ].filter((r) => !r.hide).map((row) => (
            <div key={row.label} style={{ display: "flex", justifyContent: "space-between", fontSize: 13, opacity: 0.85 }}>
              <span>{row.label}</span>
              <span style={{ fontWeight: 600, color: row.value < 0 ? "#6ee7b7" : "white" }}>
                {row.value < 0 ? "- " : ""}₹{Math.abs(row.value).toFixed(2)}
              </span>
            </div>
          ))}
          <div style={{ borderTop: "1px solid rgba(255,255,255,0.15)", paddingTop: 8, marginTop: 4, display: "flex", justifyContent: "space-between" }}>
            <span style={{ fontWeight: 800, fontSize: 16, fontFamily: "'Outfit', sans-serif" }}>Total</span>
            <span style={{ fontWeight: 800, fontSize: 20, fontFamily: "'Outfit', sans-serif", color: "#60a5fa" }}>₹{total.toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* ── Payment ──────────────────────────────────── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <div className="form-group">
          <label className="form-label">Payment Method</label>
          <select
            className="form-input form-select"
            value={paymentMethod}
            onChange={(e) => setPaymentMethod(e.target.value)}
          >
            {PAYMENT_METHODS.map((m) => <option key={m}>{m}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">Amount Paid (₹)</label>
          <input
            type="number" min="0"
            className="form-input"
            value={amountPaid}
            onChange={(e) => setAmountPaid(parseFloat(e.target.value) || 0)}
          />
        </div>
      </div>

      {/* Due indicator */}
      {total > 0 && (
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "10px 16px", borderRadius: 10,
          background: payStatus === "Paid" ? "#d1fae5" : payStatus === "Partial" ? "#fef3c7" : "#fee2e2",
          color:      payStatus === "Paid" ? "#065f46" : payStatus === "Partial" ? "#92400e" : "#991b1b",
        }}>
          <span style={{ fontWeight: 700, fontSize: 13 }}>
            {payStatus === "Paid" ? "✅ Fully Paid" : payStatus === "Partial" ? "⏳ Partial — Due" : "⚠️ Pending"}
          </span>
          {amountDue > 0 && (
            <span style={{ fontWeight: 800, fontSize: 16 }}>₹{amountDue.toFixed(2)}</span>
          )}
        </div>
      )}

      {/* Notes */}
      <div className="form-group">
        <label className="form-label">Notes (optional)</label>
        <textarea
          className="form-input form-textarea"
          style={{ minHeight: 56 }}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Insurance policy number, special remarks…"
        />
      </div>

      {/* Submit */}
      <button
        onClick={handleSubmit}
        disabled={saving || lineItems.length === 0}
        className="btn btn-success btn-lg"
        style={{ width: "100%" }}
      >
        {saving ? (
          <><span className="spinner" style={{ width: 18, height: 18 }} /> Generating Bill…</>
        ) : (
          `🧾 Generate Bill${total > 0 ? ` — ₹${total.toFixed(2)}` : ""}`
        )}
      </button>
    </div>
  );
}
