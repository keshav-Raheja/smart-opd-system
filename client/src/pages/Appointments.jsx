import { useEffect, useState } from "react";
import { useToast } from "../context/ToastContext";
import api from "../services/api";

const STATUS_FLOW = ["Scheduled", "Checked-In", "In Consultation", "Completed", "Cancelled"];

const STATUS_STYLE = {
  Scheduled:        { badge: "status-scheduled",  bg: "#fef3c7", color: "#92400e" },
  "Checked-In":     { badge: "status-checked-in",  bg: "#dbeafe", color: "#1e40af" },
  "In Consultation":{ badge: "status-consulting",   bg: "#ede9fe", color: "#5b21b6" },
  Completed:        { badge: "status-completed",   bg: "#d1fae5", color: "#065f46" },
  Cancelled:        { badge: "status-cancelled",   bg: "#fee2e2", color: "#991b1b" },
};

const Appointments = () => {
  const toast = useToast();
  const [appointments, setAppointments] = useState([]);
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [filterStatus, setFilterStatus] = useState("All");

  // Booking states
  const [bookingType, setBookingType] = useState("existing"); // "existing" | "new"
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [showDropdown, setShowDropdown] = useState(false);

  // New Patient inline registration data
  const [newPatientData, setNewPatientData] = useState({
    name: "", age: "", gender: "Male", phone: "", address: "", blood_group: "O+",
  });

  // Appointment scheduling details
  const [formData, setFormData] = useState({
    doctor_name: "", appointment_date: "", appointment_time: "", reason: "",
  });

  const fetchAppointments = async () => {
    try {
      const response = await api.get("/appointments/");
      setAppointments(response.data);
      
      const patRes = await api.get("/patients/");
      setPatients(patRes.data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAppointments(); }, []);

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });
  
  const handleNewPatientChange = (e) => setNewPatientData({ ...newPatientData, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();

    let targetPatientId = "";
    let targetPatientName = "";

    if (bookingType === "existing") {
      if (!selectedPatient) {
        toast.warning("Patient Required", "Please search and select a registered patient");
        return;
      }
      targetPatientId = selectedPatient._id;
      targetPatientName = selectedPatient.name;
    } else {
      // Validate registration
      if (!newPatientData.name.trim() || !newPatientData.age || !newPatientData.phone.trim()) {
        toast.warning("Missing Fields", "Please complete all required patient registration fields");
        return;
      }
      
      // 1. Inline Register Patient first
      try {
        const patRes = await api.post("/patients/", {
          name: newPatientData.name.trim(),
          age: parseInt(newPatientData.age),
          gender: newPatientData.gender,
          phone: newPatientData.phone.trim(),
          address: newPatientData.address.trim(),
          blood_group: newPatientData.blood_group,
        });
        targetPatientId = patRes.data.patient_id;
        targetPatientName = newPatientData.name.trim();
        toast.success("Patient Registered", `${targetPatientName} has been added to database`);
      } catch (error) {
        toast.error("Registration Failed", error.response?.data?.message || "Could not register new patient");
        return;
      }
    }

    // 2. Book the actual Appointment
    try {
      await api.post("/appointments/", {
        patient_id: targetPatientId,
        patient_name: targetPatientName,
        doctor_name: formData.doctor_name,
        appointment_date: formData.appointment_date,
        appointment_time: formData.appointment_time,
        reason: formData.reason,
      });

      toast.success("Appointment Created", `Scheduled for ${targetPatientName}`);
      fetchAppointments();
      
      // Reset forms
      setFormData({ doctor_name: "", appointment_date: "", appointment_time: "", reason: "" });
      setNewPatientData({ name: "", age: "", gender: "Male", phone: "", address: "", blood_group: "O+" });
      setSelectedPatient(null);
      setSearchQuery("");
      setShowForm(false);
    } catch (error) {
      toast.error("Failed", "Could not create appointment");
    }
  };

  const updateStatus = async (id, status) => {
    try {
      await api.put(`/appointments/${id}/status`, { status });
      toast.success("Status Updated", `Appointment marked as ${status}`);
      fetchAppointments();
    } catch (error) {
      toast.error("Error", "Could not update status");
    }
  };

  const deleteAppointment = async (id) => {
    if (!window.confirm("Delete this appointment?")) return;
    try {
      await api.delete(`/appointments/${id}`);
      toast.success("Deleted", "Appointment removed");
      fetchAppointments();
    } catch (error) {
      toast.error("Error", "Could not delete appointment");
    }
  };

  const filtered = filterStatus === "All"
    ? appointments
    : appointments.filter((a) => a.status === filterStatus);

  const counts = STATUS_FLOW.reduce((acc, s) => {
    acc[s] = appointments.filter((a) => a.status === s).length;
    return acc;
  }, {});

  // Live filter registered patients for search select
  const matchedPatients = searchQuery.trim() === ""
    ? []
    : patients.filter((p) =>
        p.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.phone?.includes(searchQuery)
      );

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="page-header flex-between">
        <div>
          <h1 className="page-title">📅 Appointments</h1>
          <p className="page-subtitle">{appointments.length} total · {counts["Scheduled"] || 0} scheduled</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowForm(!showForm)}>
          {showForm ? "✕ Cancel" : "+ New Appointment"}
        </button>
      </div>

      {/* Status Summary Cards */}
      <div className="grid-stats" style={{ marginBottom: 20, gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))" }}>
        {STATUS_FLOW.map((s) => {
          const style = STATUS_STYLE[s];
          return (
            <div
              key={s}
              className="card"
              style={{
                padding: "14px 16px",
                cursor: "pointer",
                border: filterStatus === s ? `2px solid ${style.color}` : "1px solid var(--color-border)",
                transition: "all 0.2s",
              }}
              onClick={() => setFilterStatus(filterStatus === s ? "All" : s)}
            >
              <div style={{ fontSize: 22, fontWeight: 800, color: style.color, marginBottom: 2 }}>
                {counts[s] || 0}
              </div>
              <div style={{ fontSize: 11, color: "var(--color-text-muted)", fontWeight: 600 }}>{s}</div>
            </div>
          );
        })}
      </div>

      {/* Create Form */}
      {showForm && (
        <div className="card animate-slide-down" style={{ marginBottom: 24 }}>
          <div className="card-header">
            <h2 className="card-title">📅 Schedule Appointment</h2>
          </div>
          <div className="card-body">
            
            {/* Booking Type Select Tabs */}
            <div style={{
              display: "flex", gap: 10, marginBottom: 20,
              borderBottom: "1px solid var(--color-border)", paddingBottom: 12
            }}>
              <button
                type="button"
                onClick={() => { setBookingType("existing"); setSelectedPatient(null); setSearchQuery(""); }}
                className={`btn btn-sm ${bookingType === "existing" ? "btn-primary" : "btn-secondary"}`}
                style={{ borderRadius: 8 }}
              >
                👤 Returning / Existing Patient
              </button>
              <button
                type="button"
                onClick={() => { setBookingType("new"); setSelectedPatient(null); }}
                className={`btn btn-sm ${bookingType === "new" ? "btn-primary" : "btn-secondary"}`}
                style={{ borderRadius: 8 }}
              >
                ➕ Register New Patient
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              {/* Row 1: Patient Selection / Creation */}
              <div style={{ marginBottom: 18 }}>
                {bookingType === "existing" ? (
                  <div style={{ position: "relative" }}>
                    <label className="form-label">🔍 Search Registered Patient *</label>
                    {selectedPatient ? (
                      <div style={{
                        display: "flex", justifyContent: "space-between", alignItems: "center",
                        padding: "12px 16px", borderRadius: 10, border: "1px solid #93c5fd",
                        background: "#eff6ff", marginTop: 6,
                      }}>
                        <div>
                          <span style={{ fontWeight: 700, fontSize: 14, color: "#1e40af" }}>
                            {selectedPatient.name}
                          </span>
                          <span style={{ marginLeft: 8, fontSize: 12, color: "#60a5fa", fontWeight: 600 }}>
                            ({selectedPatient.gender} · {selectedPatient.age} yrs · 📞 {selectedPatient.phone})
                          </span>
                          <div style={{ fontSize: 10, color: "#93c5fd", fontFamily: "monospace", marginTop: 2 }}>
                            Patient DB ID: {selectedPatient._id}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setSelectedPatient(null)}
                          className="btn btn-secondary btn-sm"
                          style={{ color: "#ef4444" }}
                        >
                          Change Patient
                        </button>
                      </div>
                    ) : (
                      <>
                        <input
                          type="text"
                          className="form-input"
                          placeholder="Type patient name or phone number..."
                          value={searchQuery}
                          onChange={(e) => { setSearchQuery(e.target.value); setShowDropdown(true); }}
                          onFocus={() => setShowDropdown(true)}
                        />
                        {showDropdown && searchQuery.trim() !== "" && (
                          <>
                            <div
                              style={{ position: "fixed", inset: 0, zIndex: 100 }}
                              onClick={() => setShowDropdown(false)}
                            />
                            <div style={{
                              position: "absolute", top: "100%", left: 0, right: 0, zIndex: 101,
                              background: "white", borderRadius: 10, boxShadow: "0 10px 25px rgba(0,0,0,0.1)",
                              border: "1px solid var(--color-border)", maxHeight: 180, overflowY: "auto",
                              marginTop: 4, padding: "6px"
                            }}>
                              {matchedPatients.map((p) => (
                                <div
                                  key={p._id}
                                  onClick={() => { setSelectedPatient(p); setShowDropdown(false); }}
                                  style={{
                                    padding: "8px 12px", borderRadius: 6, cursor: "pointer",
                                    fontSize: 13, display: "flex", justifyContent: "space-between",
                                    transition: "background 0.2s"
                                  }}
                                  onMouseEnter={(e) => e.currentTarget.style.background = "#f3f4f6"}
                                  onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
                                >
                                  <span style={{ fontWeight: 600 }}>{p.name} ({p.age}y)</span>
                                  <span style={{ color: "var(--color-text-muted)" }}>📞 {p.phone}</span>
                                </div>
                              ))}
                              {matchedPatients.length === 0 && (
                                <div style={{ padding: "12px", textAlign: "center", color: "var(--color-text-muted)", fontSize: 12 }}>
                                  No patient found with that query. Try registering them!
                                </div>
                              )}
                            </div>
                          </>
                        )}
                      </>
                    )}
                  </div>
                ) : (
                  <div>
                    <label className="form-label" style={{ fontWeight: 700, color: "var(--color-text-secondary)", marginBottom: 8 }}>
                      📋 New Patient Registration Details
                    </label>
                    <div className="grid-form-3" style={{ gap: 12 }}>
                      <div className="form-group">
                        <label className="form-label">Full Name *</label>
                        <input
                          type="text"
                          name="name"
                          value={newPatientData.name}
                          onChange={handleNewPatientChange}
                          className="form-input"
                          placeholder="e.g. Alice Cooper"
                        />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Age *</label>
                        <input
                          type="number"
                          name="age"
                          min="0" max="120"
                          value={newPatientData.age}
                          onChange={handleNewPatientChange}
                          className="form-input"
                          placeholder="e.g. 29"
                        />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Gender *</label>
                        <select
                          name="gender"
                          value={newPatientData.gender}
                          onChange={handleNewPatientChange}
                          className="form-input form-select"
                        >
                          <option>Male</option>
                          <option>Female</option>
                          <option>Other</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid-form-3" style={{ gap: 12, marginTop: 10 }}>
                      <div className="form-group">
                        <label className="form-label">Phone *</label>
                        <input
                          type="tel"
                          name="phone"
                          value={newPatientData.phone}
                          onChange={handleNewPatientChange}
                          className="form-input"
                          placeholder="e.g. 98765 43210"
                        />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Blood Group</label>
                        <select
                          name="blood_group"
                          value={newPatientData.blood_group}
                          onChange={handleNewPatientChange}
                          className="form-input form-select"
                        >
                          {["A+", "A-", "B+", "B-", "O+", "O-", "AB+", "AB-"].map((g) => (
                            <option key={g}>{g}</option>
                          ))}
                        </select>
                      </div>
                      <div className="form-group">
                        <label className="form-label">Address</label>
                        <input
                          type="text"
                          name="address"
                          value={newPatientData.address}
                          onChange={handleNewPatientChange}
                          className="form-input"
                          placeholder="e.g. Sector 5, Kolkata"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Row 2: Appointment Details */}
              <div className="divider" style={{ margin: "20px 0" }} />
              <label className="form-label" style={{ fontWeight: 700, color: "var(--color-text-secondary)", marginBottom: 8 }}>
                🩺 Appointment Schedule & Doctor Assignee
              </label>
              
              <div className="grid-form-3" style={{ marginBottom: 14 }}>
                <div className="form-group">
                  <label className="form-label">Doctor Name *</label>
                  <input
                    type="text"
                    name="doctor_name"
                    value={formData.doctor_name}
                    onChange={handleChange}
                    className="form-input"
                    placeholder="e.g. Mukherjee"
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Appointment Date *</label>
                  <input
                    type="date"
                    name="appointment_date"
                    value={formData.appointment_date}
                    onChange={handleChange}
                    className="form-input"
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Appointment Time *</label>
                  <input
                    type="time"
                    name="appointment_time"
                    value={formData.appointment_time}
                    onChange={handleChange}
                    className="form-input"
                    required
                  />
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: 20 }}>
                <label className="form-label">Reason / Symptoms for Appointment</label>
                <input
                  type="text"
                  name="reason"
                  value={formData.reason}
                  onChange={handleChange}
                  className="form-input"
                  placeholder="e.g. Mild headache, follow-up, toothache..."
                />
              </div>

              <button type="submit" className="btn btn-primary btn-lg" style={{ width: "100%" }}>
                🗓️ Schedule & Confirm Appointment
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="card">
        <div className="card-header">
          <h2 className="card-title">
            {filterStatus === "All" ? "All Appointments" : `${filterStatus} (${filtered.length})`}
          </h2>
          {filterStatus !== "All" && (
            <button className="btn btn-secondary btn-sm" onClick={() => setFilterStatus("All")}>
              Clear Filter
            </button>
          )}
        </div>

        {loading ? (
          <div className="card-body">
            {[...Array(5)].map((_, i) => (
              <div key={i} style={{ display: "flex", gap: 16, marginBottom: 14, padding: "10px 0", borderBottom: "1px solid var(--color-border-subtle)" }}>
                <div className="skeleton" style={{ flex: 2, height: 16, borderRadius: 6 }} />
                <div className="skeleton" style={{ flex: 2, height: 16, borderRadius: 6 }} />
                <div className="skeleton" style={{ flex: 1, height: 16, borderRadius: 6 }} />
                <div className="skeleton" style={{ flex: 1, height: 16, borderRadius: 6 }} />
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="empty-state">
            <span className="empty-state-icon">📅</span>
            <div className="empty-state-title">No appointments found</div>
          </div>
        ) : (
          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Patient</th>
                  <th>Doctor</th>
                  <th>Date</th>
                  <th>Time</th>
                  <th>Reason</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((appt, i) => {
                  const style = STATUS_STYLE[appt.status] || STATUS_STYLE.Scheduled;
                  return (
                    <tr key={appt._id} className={`animate-fade-in stagger-${Math.min(i+1, 4)}`}>
                      <td>
                        <div style={{ fontWeight: 600 }}>{appt.patient_name}</div>
                        <div style={{ fontSize: 12, color: "var(--color-text-muted)" }}>ID: {appt.patient_id}</div>
                      </td>
                      <td>Dr. {appt.doctor_name}</td>
                      <td>
                        {appt.appointment_date
                          ? new Date(appt.appointment_date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
                          : appt.appointment_date}
                      </td>
                      <td>{appt.appointment_time}</td>
                      <td style={{ maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {appt.reason || "—"}
                      </td>
                      <td>
                        <span className={`status-badge ${style.badge}`}>{appt.status}</span>
                      </td>
                      <td>
                        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                          <select
                            value={appt.status}
                            onChange={(e) => updateStatus(appt._id, e.target.value)}
                            className="form-input form-select"
                            style={{ padding: "5px 28px 5px 10px", fontSize: 12, height: 34, width: "auto", minWidth: 140 }}
                          >
                            {STATUS_FLOW.map((s) => (
                              <option key={s} value={s}>{s}</option>
                            ))}
                          </select>
                          <button
                            onClick={() => deleteAppointment(appt._id)}
                            className="btn btn-danger btn-sm btn-icon"
                            title="Delete"
                          >
                            🗑️
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default Appointments;