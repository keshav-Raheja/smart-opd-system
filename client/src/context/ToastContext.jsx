import { createContext, useContext, useState, useCallback, useRef } from "react";

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const counterRef = useRef(0);

  const addToast = useCallback((type, title, message, duration = 4000) => {
    const id = ++counterRef.current;
    setToasts((prev) => [...prev, { id, type, title, message }]);

    setTimeout(() => {
      setToasts((prev) =>
        prev.map((t) => (t.id === id ? { ...t, removing: true } : t))
      );
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 280);
    }, duration);
  }, []);

  const toast = {
    success: (title, message) => addToast("success", title, message),
    error:   (title, message) => addToast("error",   title, message, 6000),
    warning: (title, message) => addToast("warning", title, message, 5000),
    info:    (title, message) => addToast("info",    title, message),
  };

  const dismiss = useCallback((id) => {
    setToasts((prev) =>
      prev.map((t) => (t.id === id ? { ...t, removing: true } : t))
    );
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 280);
  }, []);

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <ToastContainer toasts={toasts} dismiss={dismiss} />
    </ToastContext.Provider>
  );
}

function ToastContainer({ toasts, dismiss }) {
  if (toasts.length === 0) return null;

  const icons = {
    success: "✅",
    error:   "❌",
    warning: "⚠️",
    info:    "ℹ️",
  };

  return (
    <div className="toast-container">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`toast toast-${t.type}${t.removing ? " removing" : ""}`}
          onClick={() => dismiss(t.id)}
          role="alert"
        >
          <span className="toast-icon">{icons[t.type]}</span>
          <div className="toast-body">
            <div className="toast-title">{t.title}</div>
            {t.message && <div className="toast-message">{t.message}</div>}
          </div>
          <button
            style={{ background: "none", border: "none", cursor: "pointer", opacity: 0.5, fontSize: 16, lineHeight: 1 }}
            onClick={(e) => { e.stopPropagation(); dismiss(t.id); }}
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}

export default ToastContext;
