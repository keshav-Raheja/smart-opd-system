import { useState, useRef, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import api from "../services/api";
import { useToast } from "../context/ToastContext";

const SAMPLE_QUESTIONS = [
  "What does this report indicate?",
  "Are my values within normal range?",
  "What precautions should I take?",
  "Do I need to see a doctor urgently?",
  "What lifestyle changes are recommended?",
];

const URGENCY_STYLE = {
  Emergency: { bg: "#fee2e2", color: "#991b1b", border: "#ef4444", icon: "🚨" },
  Urgent:    { bg: "#fff7ed", color: "#9a3412", border: "#f97316", icon: "⚠️" },
  Soon:      { bg: "#fef3c7", color: "#92400e", border: "#f59e0b", icon: "⏰" },
  Routine:   { bg: "#d1fae5", color: "#065f46", border: "#10b981", icon: "✅" },
};

function AIReportSupport() {
  const [searchParams] = useSearchParams();
  const toast = useToast();
  const fileInputRef = useRef(null);

  const [file, setFile] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const [question, setQuestion] = useState("What does this report indicate? What conditions does it show, and what precautions should I take?");
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState(null);
  const [error, setError] = useState("");
  const [followUp, setFollowUp] = useState("");
  const [followUpLoading, setFollowUpLoading] = useState(false);
  const [chatHistory, setChatHistory] = useState([]);
  const [reportFilepath, setReportFilepath] = useState(searchParams.get("filepath") || "");
  const [reportId, setReportId] = useState(searchParams.get("report_id") || "");
  const [useExisting, setUseExisting] = useState(!!(searchParams.get("report_id") || searchParams.get("filepath")));

  const handleFile = (selectedFile) => {
    const ALLOWED = ["application/pdf", "image/jpeg", "image/jpg", "image/png", "image/tiff", "image/bmp"];
    if (!ALLOWED.includes(selectedFile.type)) {
      toast.error("Invalid file type", "Upload PDF, JPG, PNG, or TIFF");
      return;
    }
    if (selectedFile.size > 20 * 1024 * 1024) {
      toast.error("File too large", "Maximum 20MB allowed");
      return;
    }
    setFile(selectedFile);
    setUseExisting(false);
    setAnalysis(null);
    setError("");
    setChatHistory([]);
  };

  const analyzeReport = async () => {
    if (!file && !useExisting) {
      toast.warning("No report selected", "Please upload a report first");
      return;
    }

    setLoading(true);
    setAnalysis(null);
    setError("");
    setChatHistory([]);

    try {
      let response;

      if (file) {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("question", question);
        response = await api.post("/rag/analyze-upload", formData);
      } else {
        response = await api.post("/rag/analyze", {
          report_id: reportId || undefined,
          filepath: reportFilepath || undefined,
          question,
        });
      }

      if (response.data.success) {
        setAnalysis(response.data.analysis);
        setChatHistory([{
          role: "user",
          text: question,
        }, {
          role: "ai",
          text: response.data.analysis?.summary || "Analysis complete",
        }]);
        toast.success("Analysis Complete", "AI report analysis ready");
      } else {
        setError(response.data.error || "Analysis failed");
        toast.error("Analysis Failed", response.data.error);
      }
    } catch (err) {
      const msg = err.response?.data?.error || err.message || "Analysis failed";
      setError(msg);
      toast.error("Error", msg);
    } finally {
      setLoading(false);
    }
  };

  const askFollowUp = async () => {
    if (!followUp.trim() || !analysis) return;

    setFollowUpLoading(true);
    const q = followUp;
    setFollowUp("");

    try {
      let response;

      if (file) {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("question", q);
        response = await api.post("/rag/analyze-upload", formData);
      } else {
        response = await api.post("/rag/analyze", {
          report_id: reportId || undefined,
          filepath: reportFilepath || undefined,
          question: q,
        });
      }

      if (response.data.success) {
        setChatHistory((prev) => [
          ...prev,
          { role: "user", text: q },
          { role: "ai", text: response.data.analysis?.summary || "See updated analysis below" },
        ]);
        setAnalysis(response.data.analysis);
      } else {
        toast.error("Failed", response.data.error);
      }
    } catch (err) {
      toast.error("Error", err.message);
    } finally {
      setFollowUpLoading(false);
    }
  };

  const urgencyStyle = URGENCY_STYLE[analysis?.urgency_level] || URGENCY_STYLE.Routine;

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="page-header">
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{
            width: 56, height: 56,
            background: "linear-gradient(135deg, #6d28d9, #3b82f6)",
            borderRadius: 16,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 26,
            boxShadow: "0 4px 16px rgba(109,40,217,0.3)",
          }}>
            🤖
          </div>
          <div>
            <h1 className="page-title">AI Medical Report Analysis</h1>
            <p className="page-subtitle">
              Powered by Google Gemini Flash — Free, fast, and accurate
            </p>
          </div>
        </div>
      </div>

      {/* Disclaimer Banner */}
      <div className="ai-disclaimer" style={{ marginBottom: 24 }}>
        <span style={{ fontSize: 20, flexShrink: 0 }}>⚠️</span>
        <div>
          <strong>Medical Disclaimer:</strong> This AI analysis is for <strong>informational purposes only</strong> and does NOT constitute medical advice or diagnosis.
          Always consult a qualified healthcare professional before making any medical decisions. In case of emergency, contact emergency services immediately.
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
        {/* LEFT — Upload & Configure */}
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div className="card">
            <div className="card-header">
              <h2 className="card-title">📂 Upload Report</h2>
            </div>
            <div className="card-body">
              {/* Drop Zone */}
              <div
                className={`drop-zone${dragOver ? " drag-over" : ""}`}
                style={{ marginBottom: 16 }}
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
                    <div style={{ fontWeight: 700, fontSize: 15 }}>{file.name}</div>
                    <div style={{ fontSize: 12, color: "var(--color-text-muted)", marginTop: 4 }}>
                      {(file.size / 1024 / 1024).toFixed(2)} MB · Click to change
                    </div>
                  </div>
                ) : useExisting ? (
                  <div>
                    <span className="drop-zone-icon">📎</span>
                    <div style={{ fontWeight: 700, fontSize: 15 }}>Using existing report</div>
                    <div style={{ fontSize: 12, color: "var(--color-text-muted)", marginTop: 4 }}>
                      Click to upload a different file
                    </div>
                  </div>
                ) : (
                  <div>
                    <span className="drop-zone-icon">☁️</span>
                    <div style={{ fontWeight: 700, fontSize: 15 }}>Drag & drop your medical report</div>
                    <div style={{ fontSize: 12, color: "var(--color-text-muted)", marginTop: 4 }}>
                      PDF, JPG, PNG, TIFF — Max 20MB
                    </div>
                  </div>
                )}
              </div>

              {/* Question Input */}
              <div className="form-group" style={{ marginBottom: 12 }}>
                <label className="form-label">Your Question</label>
                <textarea
                  className="form-input form-textarea"
                  style={{ minHeight: 90 }}
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  placeholder="What does this report indicate?"
                />
              </div>

              {/* Quick Questions */}
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: "var(--color-text-muted)", marginBottom: 8 }}>
                  QUICK QUESTIONS
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {SAMPLE_QUESTIONS.map((q) => (
                    <button
                      key={q}
                      onClick={() => setQuestion(q)}
                      style={{
                        padding: "5px 12px",
                        background: question === q ? "#dbeafe" : "var(--color-surface-3)",
                        color: question === q ? "#1e40af" : "var(--color-text-secondary)",
                        border: question === q ? "1px solid #93c5fd" : "1px solid var(--color-border)",
                        borderRadius: 99,
                        fontSize: 12,
                        cursor: "pointer",
                        transition: "all 0.15s",
                        fontWeight: 500,
                      }}
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={analyzeReport}
                disabled={loading || (!file && !useExisting)}
                className="btn btn-ai btn-lg"
                style={{ width: "100%" }}
              >
                {loading ? (
                  <>
                    <span className="spinner" style={{ width: 18, height: 18 }} />
                    Analyzing with AI...
                  </>
                ) : (
                  "🤖 Analyze Report"
                )}
              </button>

              {error && (
                <div style={{
                  marginTop: 12,
                  padding: "12px 16px",
                  background: "#fee2e2",
                  color: "#991b1b",
                  borderRadius: 10,
                  fontSize: 13,
                  border: "1px solid #fca5a5",
                }}>
                  ❌ {error}
                  {error.includes("API key") && (
                    <div style={{ marginTop: 8 }}>
                      Get your free key at:{" "}
                      <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer"
                        style={{ color: "#1e40af", fontWeight: 600 }}>
                        aistudio.google.com
                      </a>
                      {" "}and add it to <code style={{ background: "#fef2f2", padding: "1px 6px", borderRadius: 4 }}>server/.env</code>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Chat History */}
          {chatHistory.length > 0 && (
            <div className="card">
              <div className="card-header">
                <h2 className="card-title">💬 Conversation</h2>
              </div>
              <div className="card-body" style={{ display: "flex", flexDirection: "column", gap: 10, maxHeight: 300, overflowY: "auto" }}>
                {chatHistory.map((msg, i) => (
                  <div
                    key={i}
                    style={{
                      padding: "10px 14px",
                      borderRadius: 12,
                      fontSize: 13,
                      maxWidth: "90%",
                      ...(msg.role === "user"
                        ? { background: "#dbeafe", color: "#1e40af", alignSelf: "flex-end", borderBottomRightRadius: 4 }
                        : { background: "var(--color-surface-3)", color: "var(--color-text-primary)", alignSelf: "flex-start", borderBottomLeftRadius: 4 }
                      ),
                    }}
                  >
                    <div style={{ fontWeight: 600, fontSize: 11, marginBottom: 3, opacity: 0.7 }}>
                      {msg.role === "user" ? "👤 You" : "🤖 AI"}
                    </div>
                    {msg.text}
                  </div>
                ))}
              </div>
              <div style={{ padding: "12px 20px", borderTop: "1px solid var(--color-border)" }}>
                <div style={{ display: "flex", gap: 10 }}>
                  <input
                    type="text"
                    className="form-input"
                    style={{ flex: 1 }}
                    placeholder="Ask a follow-up question..."
                    value={followUp}
                    onChange={(e) => setFollowUp(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && askFollowUp()}
                  />
                  <button
                    onClick={askFollowUp}
                    disabled={!followUp.trim() || followUpLoading}
                    className="btn btn-primary"
                    style={{ minWidth: 80 }}
                  >
                    {followUpLoading ? <span className="spinner" style={{ width: 16, height: 16 }} /> : "Send"}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* RIGHT — Analysis Results */}
        <div>
          {loading && (
            <div className="card" style={{ padding: 40, textAlign: "center" }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>🔬</div>
              <h3 style={{ fontWeight: 700, fontSize: 18, marginBottom: 8 }}>Analyzing your report...</h3>
              <p style={{ color: "var(--color-text-secondary)", fontSize: 14, marginBottom: 24 }}>
                AI is extracting information and generating insights
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {["Extracting report text", "Processing medical data", "Generating analysis", "Preparing recommendations"].map((step, i) => (
                  <div key={step} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13, color: "var(--color-text-secondary)" }}>
                    <span className="spinner dark" style={{ width: 14, height: 14 }} />
                    {step}
                  </div>
                ))}
              </div>
            </div>
          )}

          {!loading && !analysis && (
            <div className="card">
              <div className="empty-state">
                <span className="empty-state-icon">🧬</span>
                <div className="empty-state-title">AI Analysis</div>
                <p style={{ fontSize: 14, maxWidth: 280, margin: "0 auto" }}>
                  Upload a medical report and click "Analyze" to get detailed AI insights
                </p>
              </div>
            </div>
          )}

          {!loading && analysis && (
            <div className="ai-result-card animate-fade-in-scale">
              {/* Header */}
              <div className="ai-result-header">
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
                  <span style={{ fontSize: 28 }}>🤖</span>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: 18, fontFamily: "'Outfit', sans-serif" }}>
                      AI Analysis Results
                    </div>
                    <div style={{ fontSize: 12, opacity: 0.7 }}>Generated by Google Gemini Flash</div>
                  </div>
                </div>
                <p style={{ fontSize: 14, opacity: 0.85, lineHeight: 1.6 }}>
                  {analysis.summary}
                </p>
              </div>

              <div className="ai-result-body" style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                {/* Urgency Level */}
                <div style={{
                  padding: "14px 18px",
                  borderRadius: 12,
                  background: urgencyStyle.bg,
                  border: `1px solid ${urgencyStyle.border}`,
                  color: urgencyStyle.color,
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                }}>
                  <span style={{ fontSize: 24 }}>{urgencyStyle.icon}</span>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: 16 }}>
                      Urgency: {analysis.urgency_level}
                    </div>
                    <div style={{ fontSize: 13, marginTop: 2, opacity: 0.85 }}>
                      {analysis.urgency_reason}
                    </div>
                  </div>
                </div>

                {/* Key Findings */}
                {analysis.key_findings?.length > 0 && (
                  <Section title="🔬 Key Findings" color="#eff6ff" borderColor="#bfdbfe">
                    {analysis.key_findings.map((f, i) => (
                      <BulletItem key={i} text={f} icon="•" />
                    ))}
                  </Section>
                )}

                {/* Possible Conditions */}
                {analysis.possible_conditions?.length > 0 && (
                  <Section title="🩺 Possible Conditions" color="#f5f3ff" borderColor="#ddd6fe">
                    {analysis.possible_conditions.map((c, i) => (
                      <div key={i} style={{
                        padding: "10px 14px",
                        background: "white",
                        borderRadius: 10,
                        border: "1px solid var(--color-border)",
                        marginBottom: 8,
                      }}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
                          <span style={{ fontWeight: 700, fontSize: 14 }}>{c.condition}</span>
                          <span style={{
                            padding: "2px 8px",
                            borderRadius: 99,
                            fontSize: 11,
                            fontWeight: 700,
                            background: c.confidence === "High" ? "#d1fae5" : c.confidence === "Medium" ? "#fef3c7" : "#f3f4f6",
                            color: c.confidence === "High" ? "#065f46" : c.confidence === "Medium" ? "#92400e" : "#374151",
                          }}>
                            {c.confidence} Confidence
                          </span>
                        </div>
                        <div style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>{c.evidence}</div>
                      </div>
                    ))}
                  </Section>
                )}

                {/* Precautions */}
                {analysis.precautions?.length > 0 && (
                  <Section title="💊 Precautions & Recommendations" color="#ecfdf5" borderColor="#a7f3d0">
                    {analysis.precautions.map((p, i) => (
                      <BulletItem key={i} text={p} icon="✓" color="#059669" />
                    ))}
                  </Section>
                )}

                {/* When to seek help */}
                {analysis.when_to_seek_immediate_help?.length > 0 && (
                  <Section title="🚨 Seek Immediate Help If" color="#fff7ed" borderColor="#fed7aa">
                    {analysis.when_to_seek_immediate_help.map((w, i) => (
                      <BulletItem key={i} text={w} icon="⚠️" color="#9a3412" />
                    ))}
                  </Section>
                )}

                {/* Questions for doctor */}
                {analysis.questions_for_doctor?.length > 0 && (
                  <Section title="🗣️ Questions to Ask Your Doctor" color="#f0f9ff" borderColor="#bae6fd">
                    {analysis.questions_for_doctor.map((q, i) => (
                      <BulletItem key={i} text={q} icon="?" color="#0369a1" />
                    ))}
                  </Section>
                )}

                {/* Disclaimer */}
                <div className="ai-disclaimer">
                  <span style={{ fontSize: 20, flexShrink: 0 }}>⚠️</span>
                  <div style={{ fontSize: 12 }}>
                    {analysis.disclaimer || "This is AI-generated analysis for informational purposes only. Always consult a qualified doctor."}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Section({ title, color, borderColor, children }) {
  return (
    <div style={{
      padding: "14px 16px",
      background: color,
      borderRadius: 12,
      border: `1px solid ${borderColor}`,
    }}>
      <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 10 }}>{title}</div>
      {children}
    </div>
  );
}

function BulletItem({ text, icon, color }) {
  return (
    <div style={{
      display: "flex",
      alignItems: "flex-start",
      gap: 8,
      marginBottom: 6,
      fontSize: 13,
      lineHeight: 1.5,
    }}>
      <span style={{ color: color || "var(--color-text-muted)", flexShrink: 0, fontWeight: 700, fontSize: 12, marginTop: 2 }}>
        {icon}
      </span>
      <span style={{ color: "var(--color-text-primary)" }}>{text}</span>
    </div>
  );
}

export default AIReportSupport;
