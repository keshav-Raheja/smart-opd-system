import { useState } from "react";
import api from "../services/api";
import { useToast } from "../context/ToastContext";

function AddPatientForm({ fetchPatients, onSuccess }) {
  const toast = useToast();
  const [formData, setFormData] = useState({
    name: "", age: "", gender: "", phone: "", address: "", blood_group: ""
  });
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post("/patients/", formData);
      toast.success("Patient Added", `${formData.name} has been registered`);
      setFormData({ name: "", age: "", gender: "", phone: "", address: "", blood_group: "" });
      fetchPatients();
      onSuccess?.();
    } catch (error) {
      toast.error("Error", error.response?.data?.message || "Could not add patient");
    } finally {
      setLoading(false);
    }
  };

  const FIELDS = [
    { name: "name",        label: "Full Name",    type: "text",   placeholder: "Patient full name",   required: true },
    { name: "age",         label: "Age",          type: "number", placeholder: "Age",                 required: true },
    { name: "gender",      label: "Gender",       type: "select", options: ["", "Male", "Female", "Other"], required: true },
    { name: "phone",       label: "Phone",        type: "tel",    placeholder: "+91 XXXXX XXXXX",     required: true },
    { name: "blood_group", label: "Blood Group",  type: "select", options: ["", "A+", "A-", "B+", "B-", "O+", "O-", "AB+", "AB-"], required: false },
    { name: "address",     label: "Address",      type: "text",   placeholder: "Full address",        required: false },
  ];

  return (
    <div className="card">
      <div className="card-header">
        <h2 className="card-title">👤 Register New Patient</h2>
      </div>
      <div className="card-body">
        <form onSubmit={handleSubmit}>
          <div className="grid-form-2" style={{ marginBottom: 16 }}>
          {FIELDS.map(({ name, label, type, placeholder, options, required }) => (
            <div key={name} className="form-group">
              <label className="form-label">{label}{required && " *"}</label>
              {type === "select" ? (
                <select
                  id={`patient-${name}`}
                  name={name}
                  value={formData[name]}
                  onChange={handleChange}
                  className="form-input form-select"
                  required={required}
                >
                  {options.map((opt) => (
                    <option key={opt} value={opt}>{opt || `Select ${label}`}</option>
                  ))}
                </select>
              ) : (
                <input
                  id={`patient-${name}`}
                  type={type}
                  name={name}
                  value={formData[name]}
                  onChange={handleChange}
                  className="form-input"
                  placeholder={placeholder}
                  required={required}
                  min={name === "age" ? 0 : undefined}
                  max={name === "age" ? 150 : undefined}
                />
              )}
            </div>
          ))}

          </div>

          <button
            id="add-patient-submit"
            type="submit"
            disabled={loading}
            className="btn btn-primary"
            style={{ width: "100%" }}
          >
            {loading ? (
              <><span className="spinner" style={{ width: 16, height: 16 }} /> Adding...</>
            ) : (
              "✅ Register Patient"
            )}
          </button>
        </form>
      </div>
    </div>
  );
}

export default AddPatientForm;