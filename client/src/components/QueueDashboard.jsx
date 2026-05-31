import { useEffect, useState } from "react";
import axios from "axios";

const STATUS_STYLE = {
  "Scheduled":        { badge: "bg-yellow-100 text-yellow-700", dot: "#f59e0b" },
  "Checked-In":       { badge: "bg-blue-100 text-blue-700",     dot: "#3b82f6" },
  "In Consultation":  { badge: "bg-purple-100 text-purple-700", dot: "#8b5cf6" },
  "Completed":        { badge: "bg-green-100 text-green-700",   dot: "#10b981" },
  "Cancelled":        { badge: "bg-red-100 text-red-700",       dot: "#ef4444" },
};

const QueueDashboard = () => {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchTodayAppointments = async () => {
    try {
      const response = await axios.get("http://127.0.0.1:5000/api/appointments/today");
      setAppointments(response.data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTodayAppointments();
    const interval = setInterval(fetchTodayAppointments, 30000);
    return () => clearInterval(interval);
  }, []);

  const getCount = (status) => appointments.filter((a) => a.status === status).length;

  const SUMMARY = [
    { label: "Total Today",     value: appointments.length,          color: "#0f172a" },
    { label: "Waiting",         value: getCount("Scheduled"),        color: "#f59e0b" },
    { label: "In Consultation", value: getCount("In Consultation"),  color: "#8b5cf6" },
    { label: "Completed",       value: getCount("Completed"),        color: "#10b981" },
  ];

  if (loading) {
    return (
      <div style={{ padding: "20px" }}>
        <div className="grid-stats" style={{ marginBottom: 16 }}>
          {[...Array(4)].map((_, i) => (
            <div key={i} className="skeleton" style={{ height: 72, borderRadius: 12 }} />
          ))}
        </div>
        <div className="skeleton" style={{ height: 180, borderRadius: 12 }} />
      </div>
    );
  }

  return (
    <div style={{ padding: "20px 24px" }}>
      {/* Mini Stats — responsive: 2 cols mobile, 4 cols desktop */}
      <div className="grid-stats" style={{ marginBottom: 16 }}>
        {SUMMARY.map(({ label, value, color }) => (
          <div key={label} style={{
            padding: "12px 14px",
            background: "var(--color-surface-2)",
            borderRadius: 12,
            border: "1px solid var(--color-border)",
          }}>
            <div style={{
              fontFamily: "'Outfit', sans-serif",
              fontSize: 24,
              fontWeight: 800,
              color,
              lineHeight: 1,
              marginBottom: 4,
            }}>
              {value}
            </div>
            <div style={{ fontSize: 11, color: "var(--color-text-muted)", fontWeight: 600 }}>{label}</div>
          </div>
        ))}
      </div>

      {/* Queue Table */}
      {appointments.length === 0 ? (
        <div className="empty-state" style={{ padding: "32px" }}>
          <span className="empty-state-icon" style={{ fontSize: 36 }}>📅</span>
          <div className="empty-state-title" style={{ fontSize: 15 }}>No appointments today</div>
        </div>
      ) : (
        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Patient</th>
                <th>Doctor</th>
                <th>Time</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {appointments.map((appt, i) => {
                const style = STATUS_STYLE[appt.status] || STATUS_STYLE["Scheduled"];
                return (
                  <tr key={appt._id}>
                    <td style={{ fontWeight: 700, color: "var(--color-text-muted)" }}>{i + 1}</td>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div style={{
                          width: 30, height: 30,
                          borderRadius: "50%",
                          background: "linear-gradient(135deg, #3b82f6, #8b5cf6)",
                          display: "flex", alignItems: "center", justifyContent: "center",
                          fontSize: 12, fontWeight: 700, color: "white", flexShrink: 0,
                        }}>
                          {appt.patient_name?.[0]?.toUpperCase() || "?"}
                        </div>
                        <span style={{ fontWeight: 600 }}>{appt.patient_name}</span>
                      </div>
                    </td>
                    <td>Dr. {appt.doctor_name}</td>
                    <td style={{ fontWeight: 600 }}>{appt.appointment_time}</td>
                    <td>
                      <span style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 5,
                        padding: "3px 10px",
                        borderRadius: 99,
                        fontSize: 11,
                        fontWeight: 700,
                        whiteSpace: "nowrap",
                      }} className={style.badge}>
                        <span style={{ width: 6, height: 6, borderRadius: "50%", background: style.dot, display: "inline-block" }} />
                        {appt.status}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default QueueDashboard;