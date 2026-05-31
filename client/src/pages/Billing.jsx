/**
 * Billing.jsx — Full billing management page
 * View all bills, filter by status/patient, record payments.
 */

import { useEffect, useState } from "react";
import { useBilling }  from "../hooks/useBilling";
import { getRevenueStats } from "../services/billingService";
import BillCard from "../components/BillCard";

const STATUS_OPTS = ["All", "Pending", "Partial", "Paid", "Waived"];

const STATUS_STYLE = {
  Pending: { bg: "#fee2e2", color: "#991b1b" },
  Partial: { bg: "#fef3c7", color: "#92400e" },
  Paid:    { bg: "#d1fae5", color: "#065f46" },
  Waived:  { bg: "#f0f9ff", color: "#0369a1" },
};

export default function Billing() {
  const { bills, loading, fetchBills } = useBilling();
  const [stats,        setStats]        = useState(null);
  const [activeStatus, setActiveStatus] = useState("All");
  const [search,       setSearch]       = useState("");

  useEffect(() => {
    fetchBills({});
    getRevenueStats().then(setStats).catch(console.error);
  }, []);

  const filtered = bills.filter((b) => {
    const matchStatus = activeStatus === "All" || b.payment_status === activeStatus;
    const matchSearch = !search || b.patient_name?.toLowerCase().includes(search.toLowerCase()) || b.bill_number?.includes(search);
    return matchStatus && matchSearch;
  });

  const fmt = (n) => `₹${Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;

  return (
    <div className="animate-fade-in">
      {/* ── Page Header ──────────────────────────────── */}
      <div className="page-header flex-between">
        <div>
          <h1 className="page-title">💳 Billing &amp; Payments</h1>
          <p className="page-subtitle">{bills.length} total bills · Real-time revenue tracking</p>
        </div>
      </div>

      {/* ── Revenue Stats ─────────────────────────────── */}
      {stats && (
        <div className="grid-stats" style={{ marginBottom: 24 }}>
          {[
            { label: "Total Billed",  value: fmt(stats.total_billed),   icon: "🧾", color: "blue"   },
            { label: "Collected",     value: fmt(stats.total_collected), icon: "💰", color: "green"  },
            { label: "Outstanding",   value: fmt(stats.total_pending),   icon: "⏳", color: "orange" },
            { label: "Total Bills",   value: stats.total_bills,          icon: "📋", color: "purple" },
          ].map((s, i) => (
            <div key={s.label} className={`stat-card ${s.color} animate-fade-in stagger-${i + 1}`}>
              <div className={`stat-icon ${s.color}`}>{s.icon}</div>
              <div className="stat-label">{s.label}</div>
              <div className="stat-value">{s.value}</div>
            </div>
          ))}
        </div>
      )}

      {/* ── Status filter + search ─────────────────────── */}
      <div className="filter-row" style={{ marginBottom: 20 }}>
        {STATUS_OPTS.map((s) => {
          const st = STATUS_STYLE[s];
          const count = s === "All" ? bills.length : bills.filter((b) => b.payment_status === s).length;
          return (
            <button
              key={s}
              onClick={() => setActiveStatus(s)}
              style={{
                padding: "6px 14px", borderRadius: 99, fontSize: 12, fontWeight: 700,
                border: activeStatus === s ? "2px solid" : "1px solid",
                cursor: "pointer", transition: "all 0.15s",
                background: activeStatus === s ? (st?.bg || "#0f172a") : "white",
                color:      activeStatus === s ? (st?.color || "white") : "var(--color-text-secondary)",
                borderColor: activeStatus === s ? (st?.color || "#0f172a") : "var(--color-border)",
                whiteSpace: "nowrap",
              }}
            >
              {s} <span style={{ opacity: 0.7 }}>({count})</span>
            </button>
          );
        })}

        <div className="search-wrapper" style={{ marginLeft: "auto", minWidth: 0 }}>
          <span className="search-icon">🔍</span>
          <input
            type="text"
            className="form-input search-input"
            placeholder="Search patient or bill no…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ width: "100%", minWidth: 160, maxWidth: 240 }}
          />
        </div>
      </div>

      {/* ── Bills List ────────────────────────────────── */}
      {loading ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {[...Array(4)].map((_, i) => (
            <div key={i} className="skeleton" style={{ height: 72, borderRadius: 16 }} />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <span className="empty-state-icon">💳</span>
            <div className="empty-state-title">No bills found</div>
            <p style={{ fontSize: 14 }}>Bills are created during patient consultations</p>
          </div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {filtered.map((bill) => (
            <BillCard key={bill._id} bill={bill} />
          ))}
        </div>
      )}
    </div>
  );
}
