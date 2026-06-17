/**
 * BillCard.jsx
 * ─────────────
 * Reusable card to display a single bill summary.
 * Used in Billing page list + PatientProfile bills tab.
 *
 * Props:
 *   bill           – bill object from API
 *   onPayClick     – (bill) => void  (optional – show pay modal)
 *   compact        – bool (smaller variant for profile tabs)
 */

import { useState } from "react";
import { updatePayment } from "../services/billingService";
import { useToast } from "../context/ToastContext";

const STATUS_STYLE = {
  Paid:    { bg: "#d1fae5", color: "#065f46", dot: "#10b981", icon: "✅" },
  Partial: { bg: "#fef3c7", color: "#92400e", dot: "#f59e0b", icon: "⏳" },
  Pending: { bg: "#fee2e2", color: "#991b1b", dot: "#ef4444", icon: "⚠️" },
  Waived:  { bg: "#f0f9ff", color: "#0369a1", dot: "#38bdf8", icon: "🏳️" },
};

const CATEGORY_COLOR = {
  consultation: { bg: "#dbeafe", text: "#1e40af" },
  diagnosis:    { bg: "#ede9fe", text: "#5b21b6" },
  lab:          { bg: "#d1fae5", text: "#065f46" },
  medicine:     { bg: "#fef3c7", text: "#92400e" },
  other:        { bg: "#f3f4f6", text: "#374151" },
};

function PayModal({ bill, onClose, onPaid }) {
  const toast = useToast();
  const [method, setMethod]   = useState(bill.payment_method || "Cash");
  const [amount, setAmount]   = useState(bill.total_amount - (bill.amount_paid || 0));
  const [waive,  setWaive]    = useState(false);
  const [saving, setSaving]   = useState(false);

  const handle = async () => {
    setSaving(true);
    try {
      const payload = waive
        ? { payment_status: "Waived" }
        : { payment_method: method, amount_paid: parseFloat(amount) + (bill.amount_paid || 0) };
      const updated = await updatePayment(bill._id, payload);
      toast.success("Payment Updated", `${updated.bill_number} — ${updated.payment_status}`);
      onPaid(updated);
      onClose();
    } catch (e) {
      toast.error("Failed", e.response?.data?.message || e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 9000,
      background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)",
      display: "flex", alignItems: "center", justifyContent: "center",
    }}
    onClick={onClose}
    >
      <div
        className="animate-fade-in-scale card"
        style={{ width: 400, padding: 28, background: "white" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ marginBottom: 20 }}>
          <h3 style={{ fontFamily: "'Outfit',sans-serif", fontSize: 20, fontWeight: 800, marginBottom: 4 }}>
            Record Payment
          </h3>
          <p style={{ fontSize: 13, color: "var(--color-text-secondary)" }}>
            {bill.bill_number} · Total ₹{bill.total_amount}
          </p>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {/* Waive toggle */}
          <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
            <input type="checkbox" checked={waive} onChange={(e) => setWaive(e.target.checked)} />
            <span style={{ fontSize: 14, fontWeight: 600, color: "#0369a1" }}>Waive outstanding amount</span>
          </label>

          {!waive && (
            <>
              <div className="form-group">
                <label className="form-label">Payment Method</label>
                <select className="form-input form-select" value={method} onChange={(e) => setMethod(e.target.value)}>
                  {["Cash", "Card", "UPI", "Insurance"].map((m) => <option key={m}>{m}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Amount Received (₹)</label>
                <input
                  type="number" min="0"
                  className="form-input"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
              </div>
            </>
          )}

          <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
            <button onClick={onClose} className="btn btn-secondary" style={{ flex: 1 }}>Cancel</button>
            <button onClick={handle} disabled={saving} className="btn btn-success" style={{ flex: 1 }}>
              {saving ? <span className="spinner" style={{ width: 16, height: 16 }} /> : "Confirm"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function BillCard({ bill: initialBill, onPayClick, compact = false }) {
  const [bill, setBill]           = useState(initialBill);
  const [expanded, setExpanded]   = useState(false);
  const [payModal, setPayModal]   = useState(false);

  const s = STATUS_STYLE[bill.payment_status] || STATUS_STYLE.Pending;

  const fmt = (n) => `₹${Number(n || 0).toLocaleString("en-IN", { minimumFractionDigits: 0 })}`;

  return (
    <>
      <div
        className="card animate-fade-in"
        style={{ overflow: "hidden", border: "1px solid var(--color-border)", transition: "box-shadow 0.2s" }}
        onMouseEnter={(e) => e.currentTarget.style.boxShadow = "0 4px 20px rgba(0,0,0,0.08)"}
        onMouseLeave={(e) => e.currentTarget.style.boxShadow = ""}
      >
        {/* ── Header ───────────────────────────────────── */}
        <div style={{
          padding: compact ? "12px 16px" : "16px 20px",
          display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10,
          borderBottom: expanded ? "1px solid var(--color-border)" : "none",
        }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontFamily: "'Outfit',sans-serif", fontWeight: 800, fontSize: compact ? 14 : 16, color: "var(--color-text-primary)" }}>
                {bill.bill_number}
              </span>
              <span style={{
                padding: "2px 10px", borderRadius: 99, fontSize: 11, fontWeight: 700,
                background: s.bg, color: s.color,
                display: "inline-flex", alignItems: "center", gap: 4,
              }}>
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: s.dot, display: "inline-block" }} />
                {bill.payment_status}
              </span>
            </div>
            <div style={{ fontSize: 12, color: "var(--color-text-muted)" }}>
              {bill.patient_name}
              {bill.doctor_name ? ` · Dr. ${bill.doctor_name}` : ""}
              {bill.created_at ? ` · ${new Date(bill.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}` : ""}
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontFamily: "'Outfit',sans-serif", fontWeight: 800, fontSize: compact ? 18 : 22, color: "var(--color-text-primary)" }}>
                {fmt(bill.total_amount)}
              </div>
              {bill.amount_due > 0 && (
                <div style={{ fontSize: 11, color: "#dc2626", fontWeight: 600 }}>Due: {fmt(bill.amount_due)}</div>
              )}
            </div>

            <div style={{ display: "flex", gap: 8 }}>
              {bill.payment_status !== "Paid" && bill.payment_status !== "Waived" && (
                <button
                  onClick={() => setPayModal(true)}
                  className="btn btn-success btn-sm"
                >
                  💳 Pay
                </button>
              )}
              <button
                onClick={() => setExpanded((p) => !p)}
                style={{
                  background: "var(--color-surface-3)", border: "1px solid var(--color-border)",
                  borderRadius: 8, padding: "6px 10px", cursor: "pointer", fontSize: 12, fontWeight: 600,
                  color: "var(--color-text-secondary)", transition: "all 0.15s",
                }}
              >
                {expanded ? "▲" : "▼"} Details
              </button>
            </div>
          </div>
        </div>

        {/* ── Expanded line items ───────────────────────── */}
        {expanded && (
          <div className="animate-slide-down" style={{ padding: "14px 20px" }}>
            {/* Line items */}
            <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 14 }}>
              {(bill.line_items || []).map((item, i) => {
                const cc = CATEGORY_COLOR[item.type] || CATEGORY_COLOR.other;
                return (
                  <div key={i} style={{
                    display: "flex", justifyContent: "space-between", alignItems: "center",
                    padding: "8px 12px", background: "var(--color-surface-2)",
                    borderRadius: 8, fontSize: 13,
                  }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ padding: "1px 8px", borderRadius: 99, fontSize: 10, fontWeight: 700, background: cc.bg, color: cc.text }}>
                        {item.type}
                      </span>
                      <span style={{ fontWeight: 600 }}>{item.description}</span>
                      {item.quantity > 1 && <span style={{ color: "var(--color-text-muted)" }}>×{item.quantity}</span>}
                    </div>
                    <span style={{ fontWeight: 700, color: "var(--color-text-primary)" }}>{fmt(item.amount)}</span>
                  </div>
                );
              })}
            </div>

            {/* Totals breakdown */}
            <div style={{ background: "var(--color-surface-3)", borderRadius: 10, padding: "12px 14px" }}>
              {[
                { label: "Subtotal",    value: bill.subtotal },
                bill.discount_amount > 0 && { label: "Discount",    value: -bill.discount_amount },
                bill.tax_amount > 0      && { label: "Tax",         value: bill.tax_amount },
              ].filter(Boolean).map((r) => (
                <div key={r.label} style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: "var(--color-text-secondary)", marginBottom: 4 }}>
                  <span>{r.label}</span>
                  <span style={{ fontWeight: 600, color: r.value < 0 ? "#059669" : "inherit" }}>
                    {r.value < 0 ? `- ${fmt(Math.abs(r.value))}` : fmt(r.value)}
                  </span>
                </div>
              ))}
              <div style={{ borderTop: "1px solid var(--color-border)", paddingTop: 8, display: "flex", justifyContent: "space-between" }}>
                <span style={{ fontWeight: 800 }}>Total</span>
                <span style={{ fontWeight: 800, fontSize: 16, color: "var(--color-accent)" }}>{fmt(bill.total_amount)}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginTop: 4, color: "var(--color-text-muted)" }}>
                <span>Paid · {bill.payment_method || "—"}</span>
                <span style={{ color: "#059669", fontWeight: 600 }}>{fmt(bill.amount_paid)}</span>
              </div>
              {bill.amount_due > 0 && (
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginTop: 2 }}>
                  <span style={{ color: "#dc2626", fontWeight: 600 }}>Outstanding Due</span>
                  <span style={{ color: "#dc2626", fontWeight: 700 }}>{fmt(bill.amount_due)}</span>
                </div>
              )}
            </div>

            {bill.notes && (
              <div style={{ marginTop: 10, fontSize: 12, color: "var(--color-text-secondary)", padding: "8px 12px", background: "#fffbeb", borderRadius: 8, border: "1px solid #fde68a" }}>
                📝 {bill.notes}
              </div>
            )}
          </div>
        )}
      </div>

      {payModal && (
        <PayModal
          bill={bill}
          onClose={() => setPayModal(false)}
          onPaid={(updated) => setBill(updated)}
        />
      )}
    </>
  );
}
