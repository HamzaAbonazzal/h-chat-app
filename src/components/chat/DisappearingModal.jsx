import { useState } from "react";
import { Modal, ListGroup, Spinner } from "react-bootstrap";
import { useTranslation } from "react-i18next";
import { conversationService } from "../../services/conversationService";

const OPTIONS = [
  { value: 0, labelKey: "chat.disappearingOff" },
  { value: 86400, labelKey: "chat.disappearing24h" },
  { value: 604800, labelKey: "chat.disappearing7d" },
  { value: 7776000, labelKey: "chat.disappearing90d" },
];

const DisappearingModal = ({ show, onHide, conversation, onUpdated }) => {
  const { t } = useTranslation();
  const [saving, setSaving] = useState(false);

  const current = conversation?.disappearingDuration || 0;

  const handleSelect = async (duration) => {
    if (duration === current) {
      onHide();
      return;
    }
    setSaving(true);
    try {
      await conversationService.updateDisappearing(conversation._id, duration);
      onUpdated?.(duration);
      onHide();
    } catch (err) {
      console.error("Failed to update disappearing:", err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal show={show} onHide={onHide} centered>
      <Modal.Header closeButton>
        <Modal.Title className="fs-6 fw-bold">
          <i className="bi bi-clock-history me-2"></i>
          {t("chat.disappearingTitle")}
        </Modal.Title>
      </Modal.Header>

      <Modal.Body className="p-0">
        <div
          className="px-3 py-2 small text-muted border-bottom"
          style={{ backgroundColor: "var(--bs-tertiary-bg)" }}
        >
          <i className="bi bi-info-circle me-1"></i>
          {t("chat.disappearingInfo")}
        </div>

        {saving ? (
          <div className="text-center py-5">
            <Spinner animation="border" variant="success" />
          </div>
        ) : (
          <ListGroup variant="flush">
            {OPTIONS.map((opt) => (
              <ListGroup.Item
                key={opt.value}
                action
                active={opt.value === current}
                onClick={() => handleSelect(opt.value)}
                style={{ cursor: "pointer", padding: "14px 20px" }}
              >
                <div className="d-flex align-items-center justify-content-between">
                  <span className="small">{t(opt.labelKey)}</span>
                  {opt.value === current && (
                    <i className="bi bi-check-circle-fill"></i>
                  )}
                </div>
              </ListGroup.Item>
            ))}
          </ListGroup>
        )}
      </Modal.Body>
    </Modal>
  );
};

export default DisappearingModal;