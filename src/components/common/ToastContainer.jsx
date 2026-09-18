import { useTranslation } from "react-i18next";
import { useToast } from "../../context/ToastContext";

const ICON_MAP = {
  success: "bi-check-circle-fill",
  error: "bi-exclamation-circle-fill",
  warning: "bi-exclamation-triangle-fill",
  info: "bi-info-circle-fill",
};

const COLOR_MAP = {
  success: "#25d366",
  error: "#dc3545",
  warning: "#ffc107",
  info: "#0d6efd",
};

const ToastContainer = () => {
  const { t } = useTranslation();
  const { toasts, removeToast } = useToast();

  if (toasts.length === 0) return null;

  return (
    <div
      className="toast-container position-fixed"
      style={{
        top: "20px",
        right: "20px",
        zIndex: 100000,
        display: "flex",
        flexDirection: "column",
        gap: "10px",
        maxWidth: "400px",
        pointerEvents: "none",
      }}
    >
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className="toast-item"
          style={{
            pointerEvents: "auto",
            minWidth: "280px",
            maxWidth: "400px",
            padding: "14px 16px",
            borderRadius: "12px",
            backgroundColor: "var(--bs-body-bg)",
            boxShadow: "0 8px 24px rgba(0, 0, 0, 0.18)",
            border: "1px solid var(--bs-border-color)",
            display: "flex",
            alignItems: "center",
            gap: "12px",
            animation: "toastSlideIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)",
          }}
        >
          {/* ⭐ الأيقونة */}
          <div
            style={{
              flexShrink: 0,
              width: "24px",
              height: "24px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: COLOR_MAP[toast.type] || COLOR_MAP.info,
              fontSize: "1.3rem",
            }}
          >
            <i
              className={`bi ${toast.icon || ICON_MAP[toast.type] || ICON_MAP.info}`}
            ></i>
          </div>

          {/* ⭐ الرسالة */}
          <div
            style={{
              flex: 1,
              fontSize: "0.9rem",
              color: "var(--bs-body-color)",
              lineHeight: 1.4,
              wordBreak: "break-word",
            }}
          >
            {toast.message}
          </div>

          {/* ⭐ زر الإغلاق */}
          <button
            type="button"
            onClick={() => removeToast(toast.id)}
            style={{
              flexShrink: 0,
              background: "transparent",
              border: "none",
              color: "var(--bs-secondary-color)",
              cursor: "pointer",
              padding: "4px",
              borderRadius: "6px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              opacity: 0.7,
              transition: "opacity 0.15s",
              fontSize: "0.85rem",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.opacity = "1")}
            onMouseLeave={(e) => (e.currentTarget.style.opacity = "0.7")}
            title={t("common.close")}
          >
            <i className="bi bi-x-lg"></i>
          </button>
        </div>
      ))}
    </div>
  );
};

export default ToastContainer;