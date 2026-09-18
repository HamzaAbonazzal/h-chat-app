import { Modal, Button } from "react-bootstrap";
import { useTranslation } from "react-i18next";

const AlertModal = ({
  show,
  onHide,
  title,
  message,
  variant = "danger", // danger | success | warning | info
  icon = "bi-exclamation-triangle",
  buttonText,
}) => {
  const { t } = useTranslation();

  const iconMap = {
    danger: "bi-exclamation-triangle",
    success: "bi-check-circle",
    warning: "bi-exclamation-circle",
    info: "bi-info-circle",
  };

  const finalIcon = icon || iconMap[variant] || "bi-info-circle";

  return (
    <Modal show={show} onHide={onHide} centered size="sm">
      <Modal.Body className="text-center p-4">
        {/* ⭐ الأيقونة */}
        <div
          className={`d-inline-flex align-items-center justify-content-center rounded-circle mb-3 text-${variant}`}
          style={{
            width: "70px",
            height: "70px",
            backgroundColor: `rgba(var(--bs-${variant}-rgb), 0.12)`,
            fontSize: "2rem",
          }}
        >
          <i className={`bi ${finalIcon}`}></i>
        </div>

        {/* ⭐ العنوان */}
        {title && <h5 className="fw-bold mb-2">{title}</h5>}

        {/* ⭐ الرسالة */}
        {message && <p className="text-muted small mb-4">{message}</p>}

        {/* ⭐ الزر */}
        <Button
          variant={variant}
          onClick={onHide}
          className="px-4"
          style={{ minWidth: "110px" }}
        >
          {buttonText || t("common.ok")}
        </Button>
      </Modal.Body>
    </Modal>
  );
};

export default AlertModal;