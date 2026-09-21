import { useState } from "react";
import {
  Modal,
  Button,
  Form,
  Alert,
  Spinner,
} from "react-bootstrap";
import { useTranslation } from "react-i18next";

const DeleteAccountModal = ({ show, onHide, onConfirm }) => {
  const { t } = useTranslation();
  const [password, setPassword] = useState("");
  const [confirmText, setConfirmText] = useState("");
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const CONFIRM_WORD = "DELETE";

  const handleClose = () => {
    if (loading) return;
    setPassword("");
    setConfirmText("");
    setReason("");
    setError("");
    onHide();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!password) {
      setError(t("settings.deleteAccount.passwordRequired"));
      return;
    }

    if (confirmText !== CONFIRM_WORD) {
      setError(t("settings.deleteAccount.typeToConfirm", { word: CONFIRM_WORD }));
      return;
    }

    setLoading(true);
    try {
      await onConfirm(password, reason);
    } catch (err) {
      const msg =
        err.response?.data?.message ||
        err.message ||
        t("common.error");
      setError(msg);
      setLoading(false);
    }
  };

  return (
    <Modal show={show} onHide={handleClose} centered backdrop="static">
      <Modal.Header closeButton={!loading} className="border-0 pb-0">
        <Modal.Title className="fs-6 fw-bold text-danger">
          <i className="bi bi-exclamation-triangle-fill me-2"></i>
          {t("settings.deleteAccount.title")}
        </Modal.Title>
      </Modal.Header>

      <Modal.Body>
        {/* ⭐ تحذير */}
        <Alert variant="danger" className="small">
          <strong>{t("settings.deleteAccount.warning")}</strong>
          <ul className="mb-0 mt-2 ps-3 small">
            <li>{t("settings.deleteAccount.warning1")}</li>
            <li>{t("settings.deleteAccount.warning2")}</li>
            <li>{t("settings.deleteAccount.warning3")}</li>
            <li>{t("settings.deleteAccount.warning4")}</li>
          </ul>
        </Alert>

        {error && (
          <Alert variant="warning" className="small py-2">
            <i className="bi bi-exclamation-circle me-2"></i>
            {error}
          </Alert>
        )}

        <Form onSubmit={handleSubmit}>
          {/* ⭐ كلمة المرور */}
          <Form.Group className="mb-3">
            <Form.Label className="small fw-semibold">
              {t("settings.deleteAccount.passwordLabel")}
            </Form.Label>
            <Form.Control
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={t("auth.passwordPlaceholder")}              disabled={loading}
              autoComplete="current-password"
            />
          </Form.Group>

          {/* ⭐ التأكيد بالكتابة */}
          <Form.Group className="mb-3">
            <Form.Label className="small fw-semibold">
              {t("settings.deleteAccount.typeLabel")}{" "}
              <code className="text-danger">{CONFIRM_WORD}</code>
            </Form.Label>
            <Form.Control
              type="text"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value.toUpperCase())}
              placeholder={CONFIRM_WORD}
              disabled={loading}
              style={{ fontFamily: "monospace" }}
            />
          </Form.Group>

          {/* ⭐ الأزرار */}
          <div className="d-flex gap-2 justify-content-end">
            <Button
              variant="secondary"
              onClick={handleClose}
              disabled={loading}
            >
              {t("common.cancel")}
            </Button>
            <Button
              variant="danger"
              type="submit"
              disabled={loading || confirmText !== CONFIRM_WORD || !password}
            >
              {loading ? (
                <>
                  <Spinner animation="border" size="sm" className="me-2" />
                  {t("settings.deleteAccount.deleting")}
                </>
              ) : (
                <>
                  <i className="bi bi-trash me-2"></i>
                  {t("settings.deleteAccount.confirm")}
                </>
              )}
            </Button>
          </div>
        </Form>
      </Modal.Body>
    </Modal>
  );
};

export default DeleteAccountModal;