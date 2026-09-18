import { Modal, Button, Spinner } from "react-bootstrap";
import { useTranslation } from "react-i18next";

const ConfirmModal = ({
  show,
  onHide,
  onConfirm,
  title,
  message,
  confirmText,
  confirmVariant = "danger",
  loading = false,
  icon = "bi-exclamation-triangle",
}) => {
  const { t } = useTranslation();

  return (
    <Modal show={show} onHide={onHide} centered backdrop="static">
      <Modal.Body className="text-center p-4">
        <div
          className={`d-inline-flex align-items-center justify-content-center rounded-circle mb-3 text-${confirmVariant}`}
          style={{
            width: "70px",
            height: "70px",
            backgroundColor: `var(--bs-${confirmVariant}-bg-subtle, rgba(220, 53, 69, 0.1))`,
            fontSize: "2rem",
          }}
        >
          <i className={`bi ${icon}`}></i>
        </div>

        <h5 className="fw-bold mb-2">{title}</h5>
        {message && (
          <p className="text-muted small mb-4">{message}</p>
        )}

        <div className="d-flex gap-2 justify-content-center">
          <Button
            variant="secondary"
            onClick={onHide}
            disabled={loading}
            className="px-4"
          >
            {t("common.cancel")}
          </Button>
          <Button
            variant={confirmVariant}
            onClick={onConfirm}
            disabled={loading}
            className="px-4"
          >
            {loading ? (
              <Spinner animation="border" size="sm" />
            ) : (
              confirmText || t("common.confirm")
            )}
          </Button>
        </div>
      </Modal.Body>
    </Modal>
  );
};

export default ConfirmModal;