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

  // Get local date and time timezone-safely
  const getLocalNow = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    return {
      date: `${year}-${month}-${day}`,
      time: `${hours}:${minutes}`
    };
  };

  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const defaultDoctorName = user.role === "Doctor" ? user.name : "";
  const { date: defaultDate, time: defaultTime } = getLocalNow();

  // Appointment scheduling details
  const [formData, setFormData] = useState({
    doctor_name: defaultDoctorName,
    appointment_date: defaultDate,
    appointment_time: defaultTime,
    reason: "",
    duration: 15,
  });
  const [customDuration, setCustomDuration] = useState("");
  const [viewMode, setViewMode] = useState("list"); // "list" | "scheduler"
  const [schedulerStartDate, setSchedulerStartDate] = useState(new Date());
  const [selectedApptDetails, setSelectedApptDetails] = useState(null);

  const START_HOUR = 8;
  const END_HOUR = 20;
  const HOUR_HEIGHT = 70;
  const HOURS = Array.from({ length: END_HOUR - START_HOUR + 1 }, (_, i) => START_HOUR + i);

  const get7Days = (startDate) => {
    const days = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(startDate);
      d.setDate(startDate.getDate() + i);
      days.push(d);
    }
    return days;
  };

  const formatDateKey = (date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  const handlePrev7Days = () => {
    const d = new Date(schedulerStartDate);
    d.setDate(d.getDate() - 7);
    setSchedulerStartDate(d);
  };

  const handleNext7Days = () => {
    const d = new Date(schedulerStartDate);
    d.setDate(d.getDate() + 7);
    setSchedulerStartDate(d);
  };

  const COLUMN_TINTS = [
    { bg: "rgba(59, 130, 246, 0.02)", header: "rgba(59, 130, 246, 0.08)", border: "rgba(59, 130, 246, 0.15)" }, // Blue
    { bg: "rgba(16, 185, 129, 0.02)", header: "rgba(16, 185, 129, 0.08)", border: "rgba(16, 185, 129, 0.15)" }, // Green
    { bg: "rgba(139, 92, 246, 0.02)", header: "rgba(139, 92, 246, 0.08)", border: "rgba(139, 92, 246, 0.15)" }, // Purple
    { bg: "rgba(245, 158, 11, 0.02)", header: "rgba(245, 158, 11, 0.08)", border: "rgba(245, 158, 11, 0.15)" }, // Amber
    { bg: "rgba(236, 72, 153, 0.02)", header: "rgba(236, 72, 153, 0.08)", border: "rgba(236, 72, 153, 0.15)" }, // Pink
    { bg: "rgba(20, 184, 166, 0.02)", header: "rgba(20, 184, 166, 0.08)", border: "rgba(20, 184, 166, 0.15)" }, // Teal
    { bg: "rgba(249, 115, 22, 0.02)", header: "rgba(249, 115, 22, 0.08)", border: "rgba(249, 115, 22, 0.15)" }, // Orange
  ];

  const DOC_THEMES = [
    { bg: "#eff6ff", color: "#1e40af", border: "#3b82f6" }, // Blue
    { bg: "#ecfdf5", color: "#065f46", border: "#10b981" }, // Emerald
    { bg: "#faf5ff", color: "#6b21a8", border: "#8b5cf6" }, // Purple
    { bg: "#fff7ed", color: "#c2410c", border: "#f97316" }, // Orange
    { bg: "#fdf2f8", color: "#9d174d", border: "#ec4899" }, // Pink
    { bg: "#f0fdfa", color: "#0f766e", border: "#14b8a6" }, // Teal
    { bg: "#fffbeb", color: "#b45309", border: "#f59e0b" }, // Amber
  ];

  const getDocTheme = (docName) => {
    if (!docName) return DOC_THEMES[0];
    let hash = 0;
    for (let i = 0; i < docName.length; i++) {
      hash = docName.charCodeAt(i) + ((hash << 5) - hash);
    }
    const idx = Math.abs(hash) % DOC_THEMES.length;
    return DOC_THEMES[idx];
  };

  const handleToday = () => {
    setSchedulerStartDate(new Date());
  };

  const getApptStyle = (appt, dayAppts) => {
    const [h, m] = appt.appointment_time.split(":").map(Number);
    const startM = (h - START_HOUR) * 60 + m;
    const duration = appt.duration || 15;
    const endM = startM + duration;

    const overlaps = dayAppts.filter(other => {
      const [oh, om] = other.appointment_time.split(":").map(Number);
      const oStartM = (oh - START_HOUR) * 60 + om;
      const oDuration = other.duration || 15;
      const oEndM = oStartM + oDuration;
      return oStartM < endM && startM < oEndM;
    });

    overlaps.sort((a, b) => {
      if (a.appointment_time !== b.appointment_time) {
        return a.appointment_time.localeCompare(b.appointment_time);
      }
      return a._id.localeCompare(b._id);
    });

    const idx = overlaps.findIndex(o => o._id === appt._id);
    const count = overlaps.length || 1;

    const top = startM * (HOUR_HEIGHT / 60);
    const height = duration * (HOUR_HEIGHT / 60);
    const width = 100 / count;
    const left = idx * width;

    return {
      top: `${top}px`,
      height: `${height}px`,
      width: `${width}%`,
      left: `${left}%`,
    };
  };

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
      const finalDuration = formData.duration === "custom" 
        ? (parseInt(customDuration) || 15) 
        : (parseInt(formData.duration) || 15);

      await api.post("/appointments/", {
        patient_id: targetPatientId,
        patient_name: targetPatientName,
        doctor_name: formData.doctor_name,
        appointment_date: formData.appointment_date,
        appointment_time: formData.appointment_time,
        reason: formData.reason,
        duration: finalDuration,
      });

      toast.success("Appointment Created", `Scheduled for ${targetPatientName}`);
      fetchAppointments();
      
      // Reset forms
      const { date: resetDate, time: resetTime } = getLocalNow();
      setFormData({
        doctor_name: defaultDoctorName,
        appointment_date: resetDate,
        appointment_time: resetTime,
        reason: "",
        duration: 15,
      });
      setCustomDuration("");
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
      <div className="page-header flex-between" style={{ alignItems: "center" }}>
        <div>
          <h1 className="page-title">📅 Appointments</h1>
          <p className="page-subtitle">{appointments.length} total · {counts["Scheduled"] || 0} scheduled</p>
        </div>
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          {/* View Toggle */}
          <div style={{
            display: "inline-flex",
            background: "var(--color-surface-3)",
            border: "1px solid var(--color-border)",
            borderRadius: 8,
            padding: 2
          }}>
            <button
              type="button"
              onClick={() => setViewMode("list")}
              className={`btn btn-sm ${viewMode === "list" ? "btn-primary" : ""}`}
              style={{
                borderRadius: 6,
                border: "none",
                background: viewMode === "list" ? "var(--color-accent)" : "transparent",
                color: viewMode === "list" ? "#ffffff" : "var(--color-text-secondary)",
                boxShadow: viewMode === "list" ? "var(--shadow-sm)" : "none",
                padding: "6px 14px",
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              📋 List
            </button>
            <button
              type="button"
              onClick={() => setViewMode("scheduler")}
              className={`btn btn-sm ${viewMode === "scheduler" ? "btn-primary" : ""}`}
              style={{
                borderRadius: 6,
                border: "none",
                background: viewMode === "scheduler" ? "var(--color-accent)" : "transparent",
                color: viewMode === "scheduler" ? "#ffffff" : "var(--color-text-secondary)",
                boxShadow: viewMode === "scheduler" ? "var(--shadow-sm)" : "none",
                padding: "6px 14px",
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              📅 Scheduler
            </button>
          </div>
          <button className="btn btn-primary" onClick={() => setShowForm(!showForm)}>
            {showForm ? "✕ Cancel" : "+ New Appointment"}
          </button>
        </div>
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
              
              <div className="grid-form-2" style={{ marginBottom: 14 }}>
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
              </div>

              <div className="grid-form-2" style={{ marginBottom: 14 }}>
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
                <div className="form-group">
                  <label className="form-label">Duration *</label>
                  <div style={{ display: "flex", gap: 10 }}>
                    <select
                      name="duration"
                      value={formData.duration}
                      onChange={handleChange}
                      className="form-input form-select"
                      style={{ flex: 1 }}
                    >
                      <option value={15}>15 Minutes (Default)</option>
                      <option value={30}>30 Minutes</option>
                      <option value={45}>45 Minutes</option>
                      <option value={60}>60 Minutes</option>
                      <option value="custom">Custom...</option>
                    </select>
                    {formData.duration === "custom" && (
                      <input
                        type="number"
                        placeholder="Mins"
                        min="1"
                        value={customDuration}
                        onChange={(e) => setCustomDuration(e.target.value)}
                        className="form-input"
                        style={{ width: "90px" }}
                        required
                      />
                    )}
                  </div>
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

      {/* Table / Scheduler View Mode */}
      {viewMode === "list" ? (
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
                    <th>Duration</th>
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
                        <td>{appt.duration || 15} mins</td>
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
      ) : (
        /* 7-Day Visual Timeline Scheduler */
        <div className="card" style={{ padding: "20px" }}>
          {/* Navigation Controls */}
          <div style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "20px",
            flexWrap: "wrap",
            gap: 12
          }}>
            <div style={{ display: "flex", gap: 8 }}>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={handlePrev7Days}
                style={{ padding: "6px 12px" }}
              >
                ◀ Prev 7 Days
              </button>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={handleToday}
                style={{ padding: "6px 12px" }}
              >
                Today
              </button>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={handleNext7Days}
                style={{ padding: "6px 12px" }}
              >
                Next 7 Days ▶
              </button>
            </div>
            <div style={{ fontWeight: 700, fontSize: "15px", color: "var(--color-text-primary)" }}>
              📅 {get7Days(schedulerStartDate)[0].toLocaleDateString("en-US", { month: "short", day: "numeric" })}
              {" — "}
              {get7Days(schedulerStartDate)[6].toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
            </div>
          </div>

          {/* Scheduler View Grid */}
          <div style={{
            display: "flex",
            border: "1px solid var(--color-border)",
            borderRadius: "10px",
            background: "var(--color-surface)",
            overflowX: "auto",
            position: "relative",
            maxHeight: "600px",
            overflowY: "auto",
            boxShadow: "inset 0 1px 3px rgba(0,0,0,0.05)"
          }}>
            {/* Time gutter on left */}
            <div style={{
              width: "70px",
              flexShrink: 0,
              marginTop: "50px",
              position: "sticky",
              left: 0,
              background: "var(--color-surface)",
              zIndex: 12,
              borderRight: "1px solid var(--color-border-subtle)"
            }}>
              {HOURS.map((hour) => {
                const displayHour = hour > 12 ? hour - 12 : hour;
                const ampm = hour >= 12 ? "PM" : "AM";
                return (
                  <div
                    key={hour}
                    style={{
                      height: `${HOUR_HEIGHT}px`,
                      fontSize: "11px",
                      color: "var(--color-text-muted)",
                      textAlign: "right",
                      paddingRight: "10px",
                      paddingTop: "4px",
                      fontWeight: 600,
                    }}
                  >
                    {`${displayHour}:00 ${ampm}`}
                  </div>
                );
              })}
            </div>

            {/* Days columns container */}
            <div style={{ display: "flex", flex: 1, minWidth: "1050px" }}>
              {get7Days(schedulerStartDate).map((day, idx) => {
                const dayKey = formatDateKey(day);
                const dayAppts = appointments.filter(a => a.appointment_date === dayKey);
                const isToday = formatDateKey(new Date()) === dayKey;
                const tint = COLUMN_TINTS[idx % 7];

                return (
                  <div key={dayKey} style={{ flex: 1, minWidth: "150px", borderRight: "1px solid var(--color-border-subtle)", position: "relative", background: tint.bg }}>
                    {/* Header */}
                    <div style={{
                      height: "50px",
                      borderBottom: `2px solid ${isToday ? "var(--color-accent)" : tint.border}`,
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      background: isToday ? "rgba(59, 130, 246, 0.12)" : tint.header,
                      position: "sticky",
                      top: 0,
                      zIndex: 10,
                    }}>
                      <span style={{ fontSize: "10px", color: "var(--color-text-muted)", textTransform: "uppercase", fontWeight: 700 }}>
                        {day.toLocaleDateString("en-US", { weekday: "short" })}
                      </span>
                      <span style={{ fontSize: "14px", fontWeight: 700, color: isToday ? "var(--color-accent)" : "var(--color-text-primary)" }}>
                        {day.toLocaleDateString("en-US", { day: "numeric", month: "short" })}
                      </span>
                    </div>

                    {/* Column body with lines and appts */}
                    <div style={{ position: "relative", height: `${HOURS.length * HOUR_HEIGHT}px` }}>
                      {/* Grid lines */}
                      {HOURS.map((hour) => (
                        <div
                          key={hour}
                          style={{
                            height: `${HOUR_HEIGHT}px`,
                            borderBottom: "1px solid var(--color-border-subtle)",
                          }}
                        />
                      ))}

                      {/* Appointments in this column */}
                      {dayAppts.map((appt) => {
                        const style = getApptStyle(appt, dayAppts);
                        if (parseFloat(style.top) < 0 || parseFloat(style.top) >= HOURS.length * HOUR_HEIGHT) return null;
                        const badgeStyle = STATUS_STYLE[appt.status] || STATUS_STYLE.Scheduled;
                        const docTheme = getDocTheme(appt.doctor_name);
                        const isShort = (appt.duration || 15) <= 15;

                        return (
                          <div
                            key={appt._id}
                            onClick={() => setSelectedApptDetails(appt)}
                            style={{
                              position: "absolute",
                              top: style.top,
                              height: style.height,
                              left: style.left,
                              width: style.width,
                              padding: "2px 4px",
                              zIndex: 2,
                              cursor: "pointer",
                            }}
                          >
                            <div style={{
                              background: docTheme.bg,
                              color: docTheme.color,
                              borderLeft: `5px solid ${badgeStyle.color}`,
                              borderRadius: "6px",
                              height: "100%",
                              padding: isShort ? "0 6px" : "4px 8px",
                              fontSize: "11px",
                              overflow: "hidden",
                              boxShadow: "0 2px 4px rgba(0, 0, 0, 0.06)",
                              display: "flex",
                              flexDirection: isShort ? "row" : "column",
                              alignItems: isShort ? "center" : "stretch",
                              justifyContent: isShort ? "flex-start" : "space-between",
                              transition: "all 0.15s ease-in-out",
                              border: `1px solid ${docTheme.border}33`,
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.transform = "scale(1.02)";
                              e.currentTarget.style.boxShadow = "var(--shadow-md)";
                              e.currentTarget.parentElement.style.zIndex = 5;
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.transform = "none";
                              e.currentTarget.style.boxShadow = "0 2px 4px rgba(0, 0, 0, 0.06)";
                              e.currentTarget.parentElement.style.zIndex = 2;
                            }}
                            >
                              {isShort ? (
                                <div style={{
                                  fontWeight: 700,
                                  fontSize: "9.5px",
                                  whiteSpace: "nowrap",
                                  overflow: "hidden",
                                  textOverflow: "ellipsis",
                                  width: "100%"
                                }}>
                                  👤 {appt.patient_name} ({appt.duration || 15}m) · {appt.appointment_time}
                                </div>
                              ) : (
                                <>
                                  <div>
                                    <div style={{ fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                      👤 {appt.patient_name} ({appt.duration || 15}m)
                                    </div>
                                    <div style={{ fontSize: "9px", opacity: 0.95, fontWeight: 600 }}>
                                      Dr. {appt.doctor_name}
                                    </div>
                                  </div>
                                  <div style={{ fontSize: "9px", opacity: 0.8, fontWeight: 500, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                    <span>🕒 {appt.appointment_time}</span>
                                    <span style={{
                                      background: badgeStyle.bg,
                                      color: badgeStyle.color,
                                      fontSize: "8px",
                                      padding: "1px 4px",
                                      borderRadius: "4px",
                                      fontWeight: 700,
                                      border: `1px solid ${badgeStyle.color}33`
                                    }}>
                                      {appt.status}
                                    </span>
                                  </div>
                                </>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Appointment Detail Modal Popover */}
      {selectedApptDetails && (
        <div style={{
          position: "fixed",
          inset: 0,
          background: "rgba(15, 23, 42, 0.6)",
          backdropFilter: "blur(4px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 1000,
        }}
        className="animate-fade-in"
        >
          <div className="card" style={{
            width: "100%",
            maxWidth: "480px",
            margin: "16px",
            boxShadow: "var(--shadow-xl)",
            background: "var(--color-surface)",
          }}
          className="card animate-slide-down"
          >
            <div className="card-header" style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              borderBottom: "1px solid var(--color-border)",
              paddingBottom: "14px",
            }}>
              <h3 className="card-title" style={{ fontSize: "16px", fontWeight: 700, display: "flex", alignItems: "center", gap: 6 }}>
                📅 Appointment Details
              </h3>
              <button
                type="button"
                onClick={() => setSelectedApptDetails(null)}
                style={{
                  background: "transparent",
                  border: "none",
                  fontSize: "20px",
                  color: "var(--color-text-muted)",
                  cursor: "pointer",
                }}
              >
                ✕
              </button>
            </div>
            <div className="card-body" style={{ padding: "20px" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                {/* Patient Info */}
                <div>
                  <label style={{ fontSize: "10px", fontWeight: 700, color: "var(--color-text-muted)", textTransform: "uppercase" }}>Patient</label>
                  <div style={{ fontSize: "16px", fontWeight: 700, color: "var(--color-text-primary)" }}>{selectedApptDetails.patient_name}</div>
                  <div style={{ fontSize: "12px", color: "var(--color-text-secondary)" }}>Patient ID: {selectedApptDetails.patient_id}</div>
                </div>

                {/* Doctor Info */}
                <div>
                  <label style={{ fontSize: "10px", fontWeight: 700, color: "var(--color-text-muted)", textTransform: "uppercase" }}>Doctor Assigned</label>
                  <div style={{ fontSize: "14px", fontWeight: 600, color: "var(--color-text-primary)" }}>Dr. {selectedApptDetails.doctor_name}</div>
                </div>

                {/* Time & Duration */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <div>
                    <label style={{ fontSize: "10px", fontWeight: 700, color: "var(--color-text-muted)", textTransform: "uppercase" }}>Date & Time</label>
                    <div style={{ fontSize: "13px", fontWeight: 600, color: "var(--color-text-primary)" }}>
                      {new Date(selectedApptDetails.appointment_date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                      <br />
                      🕒 {selectedApptDetails.appointment_time}
                    </div>
                  </div>
                  <div>
                    <label style={{ fontSize: "10px", fontWeight: 700, color: "var(--color-text-muted)", textTransform: "uppercase" }}>Duration</label>
                    <div style={{ fontSize: "13px", fontWeight: 600, color: "var(--color-text-primary)" }}>
                      ⏱️ {selectedApptDetails.duration || 15} Minutes
                    </div>
                  </div>
                </div>

                {/* Reason */}
                <div>
                  <label style={{ fontSize: "10px", fontWeight: 700, color: "var(--color-text-muted)", textTransform: "uppercase" }}>Reason for Visit</label>
                  <div style={{
                    fontSize: "12px",
                    color: "var(--color-text-secondary)",
                    background: "var(--color-surface-2)",
                    padding: "8px 12px",
                    borderRadius: "6px",
                    marginTop: "4px",
                    border: "1px solid var(--color-border-subtle)"
                  }}>
                    {selectedApptDetails.reason || "No reason specified"}
                  </div>
                </div>

                {/* Status Selector */}
                <div>
                  <label style={{ fontSize: "10px", fontWeight: 700, color: "var(--color-text-muted)", textTransform: "uppercase", display: "block", marginBottom: 6 }}>Update Status</label>
                  <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                    <select
                      value={selectedApptDetails.status}
                      onChange={(e) => {
                        updateStatus(selectedApptDetails._id, e.target.value);
                        setSelectedApptDetails({ ...selectedApptDetails, status: e.target.value });
                      }}
                      className="form-input form-select"
                      style={{ flex: 1 }}
                    >
                      {STATUS_FLOW.map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                    <span className={`status-badge ${(STATUS_STYLE[selectedApptDetails.status] || STATUS_STYLE.Scheduled).badge}`} style={{ padding: "8px 12px", height: "38px", display: "flex", alignItems: "center" }}>
                      {selectedApptDetails.status}
                    </span>
                  </div>
                </div>
              </div>

              {/* Actions Footer */}
              <div style={{
                display: "flex",
                justifyContent: "space-between",
                marginTop: "24px",
                borderTop: "1px solid var(--color-border)",
                paddingTop: "16px",
                gap: 12
              }}>
                <button
                  type="button"
                  onClick={async () => {
                    if (window.confirm("Delete this appointment?")) {
                      await deleteAppointment(selectedApptDetails._id);
                      setSelectedApptDetails(null);
                    }
                  }}
                  className="btn btn-danger"
                  style={{ display: "flex", alignItems: "center", gap: 4 }}
                >
                  🗑️ Delete
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedApptDetails(null)}
                  className="btn btn-secondary"
                  style={{ minWidth: "100px" }}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Appointments;