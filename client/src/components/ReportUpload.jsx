import { useState, useEffect, useRef } from "react";
import api from "../services/api";
import { useToast } from "../context/ToastContext";

const REPORT_TYPES = ["General", "Blood Test", "X-Ray", "MRI", "CT Scan", "Urine Test", "ECG", "Other"];

function ReportUpload({ patientId }) {
  const [file, setFile] = useState(null);
  const [reports, setReports] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [reportType, setReportType] = useState("General");
  const [loadingReports, setLoadingReports] = useState(true);
  const fileInputRef = useRef(null);
  const toast = useToast();

  const fetchReports = async () => {
    try {
      const response = await api.get(`/uploads/patient/${patientId}`);
      setReports(response.data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoadingReports(false);
    }
  };

  useEffect(() => { fetchReports(); }, []);

  const handleFile = (selectedFile) => {
    const ALLOWED = ["application/pdf", "image/jpeg", "image/jpg", "image/png", "image/tiff", "image/bmp"];
    if (!ALLOWED.includes(selectedFile.type)) {
      toast.error("Invalid file type", "Please upload a PDF, JPG, PNG, or TIFF file");
      return;
    }
    if (selectedFile.size > 20 * 1024 * 1024) {
      toast.error("File too large", "Maximum file size is 20MB");
      return;
    }
    setFile(selectedFile);
  };

  const uploadFile = async () => {
    if (!file) return;

    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);
    formData.append("patient_id", patientId);
    formData.append("report_type", reportType);

    try {
      await api.post("/uploads/", formData);
      toast.success("Report Uploaded", `${file.name} uploaded successfully`);
      setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      fetchReports();
    } catch (error) {
      toast.error("Upload Failed", error.response?.data?.message || "Could not upload file");
    } finally {
      setUploading(false);
    }
  };

  const getFileIcon = (filename) => {
    const ext = filename?.split(".").pop()?.toLowerCase();
    if (ext === "pdf") return "📄";
    if (["jpg", "jpeg", "png", "tiff", "bmp"].includes(ext)) return "🖼️";
    return "📎";
  };

  const formatDate = (iso) => {
    if (!iso) return "";
    return new Date(iso).toLocaleDateString("en-IN", {
      day: "numeric", month: "short", year: "numeric",
    });
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Upload Section */}
      <div className="card">
        <div className="card-header">
          <h2 className="card-title">📎 Upload Medical Report</h2>
        </div>
        <div className="card-body">
          {/* Drag & Drop Zone */}
          <div
            className={`drop-zone${dragOver ? " drag-over" : ""}`}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(false);
              const dropped = e.dataTransfer.files[0];
              if (dropped) handleFile(dropped);
            }}
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.jpg,.jpeg,.png,.tiff,.bmp"
              style={{ display: "none" }}
              onChange={(e) => e.target.files[0] && handleFile(e.target.files[0])}
            />
            {file ? (
              <div>
                <span className="drop-zone-icon">✅</span>
                <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 4 }}>{file.name}</div>
                <div style={{ fontSize: 13, color: "var(--color-text-muted)" }}>
                  {(file.size / 1024 / 1024).toFixed(2)} MB · Click to change
                </div>
              </div>
            ) : (
              <div>
                <span className="drop-zone-icon">☁️</span>
                <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 4 }}>
                  Drag & drop your report here
                </div>
                <div style={{ fontSize: 13, color: "var(--color-text-muted)" }}>
                  or click to browse — PDF, JPG, PNG, TIFF (max 20MB)
                </div>
              </div>
            )}
          </div>

          {/* Report Type & Upload Button */}
          <div style={{ display: "flex", gap: 12, marginTop: 16, alignItems: "flex-end" }}>
            <div className="form-group" style={{ flex: 1 }}>
              <label className="form-label">Report Type</label>
              <select
                className="form-input form-select"
                value={reportType}
                onChange={(e) => setReportType(e.target.value)}
              >
                {REPORT_TYPES.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>

            <button
              onClick={uploadFile}
              disabled={!file || uploading}
              className="btn btn-primary"
              style={{ height: 44, minWidth: 140 }}
            >
              {uploading ? (
                <><span className="spinner" style={{ width: 16, height: 16 }} /> Uploading...</>
              ) : (
                "⬆️ Upload Report"
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Reports List */}
      <div className="card">
        <div className="card-header">
          <h2 className="card-title">📁 Uploaded Reports</h2>
          <span style={{ fontSize: 13, color: "var(--color-text-secondary)" }}>
            {reports.length} report{reports.length !== 1 ? "s" : ""}
          </span>
        </div>

        {loadingReports ? (
          <div className="card-body">
            {[...Array(3)].map((_, i) => (
              <div key={i} style={{ display: "flex", gap: 12, marginBottom: 12 }}>
                <div className="skeleton" style={{ width: 40, height: 40, borderRadius: 8 }} />
                <div style={{ flex: 1 }}>
                  <div className="skeleton" style={{ width: "60%", height: 16, marginBottom: 6 }} />
                  <div className="skeleton" style={{ width: "30%", height: 12 }} />
                </div>
              </div>
            ))}
          </div>
        ) : reports.length === 0 ? (
          <div className="empty-state">
            <span className="empty-state-icon">📂</span>
            <div className="empty-state-title">No reports yet</div>
            <p style={{ fontSize: 14 }}>Upload the first medical report above</p>
          </div>
        ) : (
          <div className="card-body" style={{ padding: "8px 0" }}>
            {reports.map((report, i) => (
              <div
                key={report._id}
                className={`animate-fade-in stagger-${Math.min(i+1,4)}`}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 14,
                  padding: "12px 24px",
                  borderBottom: i < reports.length - 1 ? "1px solid var(--color-border-subtle)" : "none",
                  transition: "background 0.15s",
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = "var(--color-surface-2)"}
                onMouseLeave={(e) => e.currentTarget.style.background = ""}
              >
                <div style={{
                  width: 44, height: 44,
                  background: "var(--color-surface-3)",
                  borderRadius: 10,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 22, flexShrink: 0,
                }}>
                  {getFileIcon(report.filename)}
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontWeight: 600, fontSize: 14,
                    overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                  }}>
                    {report.original_filename || report.filename}
                  </div>
                  <div style={{ fontSize: 12, color: "var(--color-text-muted)", marginTop: 2 }}>
                    {report.report_type && (
                      <span style={{
                        padding: "2px 8px",
                        background: "#dbeafe",
                        color: "#1e40af",
                        borderRadius: 99,
                        fontSize: 11,
                        fontWeight: 600,
                        marginRight: 8,
                      }}>
                        {report.report_type}
                      </span>
                    )}
                    {formatDate(report.uploaded_at)}
                  </div>
                </div>

                {/* Analyze with AI */}
                <a
                  href={`/ai-support?report_id=${report._id}&filepath=${encodeURIComponent(report.filepath || "")}`}
                  className="btn btn-ai btn-sm"
                  title="Analyze with AI"
                >
                  🤖 Analyze
                </a>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default ReportUpload;