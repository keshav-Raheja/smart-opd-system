import { useEffect, useState } from "react";
import api from "../services/api";
import QueueDashboard from "../components/QueueDashboard";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, AreaChart, Area, CartesianGrid,
} from "recharts";

const STAT_CARDS = [
  { key: "total_patients",  label: "Total Patients",  icon: "👥", color: "blue",   prefix: ""  },
  { key: "total_visits",    label: "Total Visits",    icon: "🩺", color: "green",  prefix: ""  },
  { key: "total_revenue",   label: "Collected",       icon: "💰", color: "orange", prefix: "₹" },
  { key: "total_pending",   label: "Outstanding",     icon: "⏳", color: "purple", prefix: "₹" },
];

const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#8b5cf6"];

function Dashboard() {
  const [stats, setStats] = useState({
    total_patients: 0,
    total_visits: 0,
    total_reports: 0,
    total_revenue: 0,
    total_billed: 0,
    total_pending: 0,
    total_bills: 0,
  });
  const [loading, setLoading] = useState(true);

  const fetchDashboardStats = async () => {
    try {
      const response = await api.get("/dashboard/stats");
      setStats(response.data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardStats();
    const interval = setInterval(fetchDashboardStats, 60000); // Refresh every minute
    return () => clearInterval(interval);
  }, []);

  const barData = [
    { name: "Patients", value: stats.total_patients, fill: "#3b82f6" },
    { name: "Visits",   value: stats.total_visits,   fill: "#10b981" },
    { name: "Reports",  value: stats.total_reports,  fill: "#8b5cf6" },
  ];

  const pieData = [
    { name: "Patients", value: stats.total_patients || 1 },
    { name: "Visits",   value: stats.total_visits   || 1 },
    { name: "Reports",  value: stats.total_reports  || 1 },
  ];

  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const now = new Date();
  const hour = now.getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  return (
    <div className="animate-fade-in">
      {/* Page Header */}
      <div className="page-header flex-between">
        <div>
          <h1 className="page-title">{greeting}, {user?.name?.split(" ")[0] || "there"} 👋</h1>
          <p className="page-subtitle">
            {now.toLocaleDateString("en-IN", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
          </p>
        </div>
        <button
          onClick={fetchDashboardStats}
          className="btn btn-secondary btn-sm"
          disabled={loading}
        >
          {loading ? <span className="spinner dark" style={{ width: 14, height: 14 }} /> : "🔄"} Refresh
        </button>
      </div>

      {/* Stat Cards — responsive: 1 col mobile, 2 tablet, 4 desktop */}
      <div className="grid-stats" style={{ marginBottom: 24 }}>
        {STAT_CARDS.map((card, i) => (
          <div
            key={card.key}
            className={`stat-card ${card.color} animate-fade-in stagger-${i + 1}`}
          >
            <div className={`stat-icon ${card.color}`}>{card.icon}</div>
            <div className="stat-label">{card.label}</div>
            <div className="stat-value">
              {loading ? (
                <div className="skeleton" style={{ width: 80, height: 36, borderRadius: 8 }} />
              ) : (
                `${card.prefix}${(stats[card.key] || 0).toLocaleString("en-IN")}`
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Charts Row — responsive: stacked on mobile, side-by-side on desktop */}
      <div className="grid-charts" style={{ marginBottom: 24 }}>
        {/* Bar Chart */}
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">📊 Overview Analytics</h2>
          </div>
          <div className="card-body">
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={barData} barSize={40} barGap={12}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="name" tick={{ fontSize: 13, fill: "#64748b" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    borderRadius: 12, border: "none",
                    boxShadow: "0 10px 40px rgba(0,0,0,0.12)",
                    fontSize: 13,
                  }}
                />
                {barData.map((entry) => (
                  <Bar key={entry.name} dataKey="value" fill={entry.fill} radius={[6, 6, 0, 0]} />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Pie Chart */}
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">🥧 Distribution</h2>
          </div>
          <div className="card-body">
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="45%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ borderRadius: 12, border: "none", boxShadow: "0 10px 40px rgba(0,0,0,0.12)" }}
                />
                <Legend
                  formatter={(value) => <span style={{ fontSize: 12, color: "#475569" }}>{value}</span>}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Today's Queue */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-header">
          <h2 className="card-title">📅 Today's Patient Queue</h2>
          <span style={{ fontSize: 13, color: "var(--color-text-secondary)" }}>
            Live OPD status
          </span>
        </div>
        <div className="card-body" style={{ padding: 0 }}>
          <QueueDashboard />
        </div>
      </div>
    </div>
  );
}

export default Dashboard;