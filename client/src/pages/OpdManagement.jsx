import { useState, useEffect } from "react";

const API = import.meta.env.VITE_API_URL || "";

const OPD_TYPES = ["General", "Dental", "Cardiology", "Orthopedics", "Neurology", "Pediatrics", "Gynecology", "Dermatology", "Other"];

function OpdManagement() {
  const token = localStorage.getItem("token");
  const headers = { "Content-Type": "application/json", Authorization: `Bearer ${token}` };

  const [opds, setOpds] = useState([]);
  const [unassigned, setUnassigned] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ name: "", type: "General", address: "", contact: "" });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const loadData = async () => {
    setLoading(true);
    try {
      const [opdsRes, unassignedRes] = await Promise.all([
        fetch(`${API}/api/opd/`, { headers }),
        fetch(`${API}/api/opd/unassigned`, { headers }),
      ]);
      setOpds(await opdsRes.json());
      setUnassigned(await unassignedRes.json());
    } catch (e) {
      setError("Failed to load OPD data");
    }
    setLoading(false);
  };

  useEffect(() => { loadData(); }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return setError("OPD name is required");
    setCreating(true);
    setError("");
    try {
      const res = await fetch(`${API}/api/opd/`, {
        method: "POST", headers, body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      setSuccess(`OPD "${form.name}" created!`);
      setForm({ name: "", type: "General", address: "", contact: "" });
      loadData();
    } catch (e) {
      setError(e.message);
    }
    setCreating(false);
  };

  const assignUser = async (opdId, userId, role, action) => {
    const field = action === "add"
      ? (role === "Doctor" ? "add_doctor" : "add_receptionist")
      : (role === "Doctor" ? "remove_doctor" : "remove_receptionist");
    try {
      await fetch(`${API}/api/opd/${opdId}`, {
        method: "PUT", headers, body: JSON.stringify({ [field]: userId }),
      });
      setSuccess(action === "add" ? "User assigned!" : "User removed!");
      loadData();
    } catch (e) {
      setError("Action failed");
    }
  };

  const deleteOpd = async (opdId, name) => {
    if (!window.confirm(`Delete OPD "${name}"? All staff will be unassigned.`)) return;
    try {
      await fetch(`${API}/api/opd/${opdId}`, { method: "DELETE", headers });
      setSuccess(`OPD "${name}" deleted.`);
      loadData();
    } catch (e) {
      setError("Delete failed");
    }
  };

  const unassignedDoctors = unassigned.filter(u => u.role === "Doctor");
  const unassignedReceptionists = unassigned.filter(u => u.role === "Receptionist");

  return (
    <div style={{ padding: "24px", maxWidth: "1100px", margin: "0 auto" }}>
      <div style={{ marginBottom: "28px" }}>
        <h1 style={{ fontSize: 26, fontWeight: 700, color: "var(--text-primary)", margin: 0 }}>
          🏥 OPD Management
        </h1>
        <p style={{ color: "var(--text-secondary)", marginTop: 6 }}>
          Create departments, assign doctors and receptionists. Staff can only see patients within their OPD.
        </p>
      </div>

      {error && (
        <div style={{ background: "#fee2e2", color: "#dc2626", padding: "12px 16px", borderRadius: 8, marginBottom: 16, fontSize: 14 }}>
          {error}
        </div>
      )}
      {success && (
        <div style={{ background: "#dcfce7", color: "#16a34a", padding: "12px 16px", borderRadius: 8, marginBottom: 16, fontSize: 14 }}>
          {success}
        </div>
      )}

      {/* Create OPD Form */}
      <div className="card" style={{ marginBottom: 28, padding: 24 }}>
        <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16, color: "var(--text-primary)" }}>Create New OPD</h2>
        <form onSubmit={handleCreate}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16, marginBottom: 16 }}>
            <div>
              <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6, color: "var(--text-secondary)" }}>OPD Name *</label>
              <input
                className="form-input"
                placeholder="e.g. Smile Dental Clinic"
                value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })}
                required
              />
            </div>
            <div>
              <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6, color: "var(--text-secondary)" }}>OPD Type</label>
              <select className="form-input" value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}>
                {OPD_TYPES.map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6, color: "var(--text-secondary)" }}>Contact Number</label>
              <input className="form-input" placeholder="+91 98765 43210" value={form.contact} onChange={e => setForm({ ...form, contact: e.target.value })} />
            </div>
            <div>
              <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6, color: "var(--text-secondary)" }}>Clinic Address</label>
              <input className="form-input" placeholder="123 Main St, City" value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} />
            </div>
          </div>
          <button type="submit" className="btn-primary" disabled={creating}>
            {creating ? "Creating..." : "+ Create OPD"}
          </button>
        </form>
      </div>

      {/* OPD Cards */}
      {loading ? (
        <div style={{ textAlign: "center", padding: 40, color: "var(--text-secondary)" }}>Loading OPDs...</div>
      ) : opds.length === 0 ? (
        <div className="card" style={{ textAlign: "center", padding: 40, color: "var(--text-secondary)" }}>
          No OPDs created yet. Create your first OPD above.
        </div>
      ) : (
        <div style={{ display: "grid", gap: 20 }}>
          {opds.map(opd => (
            <div key={opd._id} className="card" style={{ padding: 24 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16, flexWrap: "wrap", gap: 10 }}>
                <div>
                  <h3 style={{ fontSize: 18, fontWeight: 700, color: "var(--text-primary)", margin: 0 }}>{opd.name}</h3>
                  <span style={{ fontSize: 12, background: "#dbeafe", color: "#1d4ed8", padding: "2px 10px", borderRadius: 20, fontWeight: 600 }}>
                    {opd.type || "General"}
                  </span>
                  {opd.contact && <span style={{ fontSize: 12, color: "var(--text-secondary)", marginLeft: 8 }}>📞 {opd.contact}</span>}
                  {opd.address && <div style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 4 }}>📍 {opd.address}</div>}
                </div>
                <button
                  onClick={() => deleteOpd(opd._id, opd.name)}
                  style={{ background: "#fee2e2", color: "#dc2626", border: "none", borderRadius: 8, padding: "6px 14px", cursor: "pointer", fontSize: 13, fontWeight: 600 }}
                >
                  Delete OPD
                </button>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                {/* Doctors */}
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 8 }}>DOCTORS</div>
                  {(opd.doctors_detail || []).map(doc => (
                    <div key={doc._id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 12px", background: "var(--bg-secondary)", borderRadius: 8, marginBottom: 6 }}>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 14, color: "var(--text-primary)" }}>Dr. {doc.name}</div>
                        <div style={{ fontSize: 12, color: "var(--text-secondary)" }}>{doc.email}</div>
                      </div>
                      <button
                        onClick={() => assignUser(opd._id, doc._id, "Doctor", "remove")}
                        style={{ background: "none", border: "1px solid #fca5a5", color: "#dc2626", borderRadius: 6, padding: "3px 10px", cursor: "pointer", fontSize: 12 }}
                      >Remove</button>
                    </div>
                  ))}
                  {unassignedDoctors.length > 0 && (
                    <select
                      className="form-input"
                      style={{ marginTop: 8 }}
                      defaultValue=""
                      onChange={e => { if (e.target.value) assignUser(opd._id, e.target.value, "Doctor", "add"); }}
                    >
                      <option value="">+ Assign a doctor...</option>
                      {unassignedDoctors.map(u => (
                        <option key={u._id} value={u._id}>Dr. {u.name}</option>
                      ))}
                    </select>
                  )}
                </div>

                {/* Receptionists */}
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 8 }}>RECEPTIONISTS</div>
                  {(opd.receptionists_detail || []).map(rec => (
                    <div key={rec._id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 12px", background: "var(--bg-secondary)", borderRadius: 8, marginBottom: 6 }}>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 14, color: "var(--text-primary)" }}>{rec.name}</div>
                        <div style={{ fontSize: 12, color: "var(--text-secondary)" }}>{rec.email}</div>
                      </div>
                      <button
                        onClick={() => assignUser(opd._id, rec._id, "Receptionist", "remove")}
                        style={{ background: "none", border: "1px solid #fca5a5", color: "#dc2626", borderRadius: 6, padding: "3px 10px", cursor: "pointer", fontSize: 12 }}
                      >Remove</button>
                    </div>
                  ))}
                  {unassignedReceptionists.length > 0 && (
                    <select
                      className="form-input"
                      style={{ marginTop: 8 }}
                      defaultValue=""
                      onChange={e => { if (e.target.value) assignUser(opd._id, e.target.value, "Receptionist", "add"); }}
                    >
                      <option value="">+ Assign a receptionist...</option>
                      {unassignedReceptionists.map(u => (
                        <option key={u._id} value={u._id}>{u.name}</option>
                      ))}
                    </select>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default OpdManagement;
