import { useState } from "react";
import { Form, Button, Alert, Spinner, Row, Col } from "react-bootstrap";
import { useTranslation } from "react-i18next";
import { useAuth } from "../../hooks/useAuth";
import { userService } from "../../services/userService";
import { PRIVACY_OPTIONS } from "../../utils/constants";

const PrivacySettings = () => {
  const { t } = useTranslation();
  const { user, updateUser } = useAuth();

  const [privacy, setPrivacy] = useState({
    lastSeen: user?.privacy?.lastSeen || "everyone",
    profilePhoto: user?.privacy?.profilePhoto || "everyone",
    about: user?.privacy?.about || "everyone",
    readReceipts: user?.privacy?.readReceipts !== false,
  });
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  const handleChange = (field, value) => {
    setPrivacy((prev) => ({ ...prev, [field]: value }));
    if (success) setSuccess("");
    if (error) setError("");
  };

  const handleSave = async () => {
    setSaving(true);
    setSuccess("");
    setError("");

    try {
      const updated = await userService.updatePrivacy(privacy);
      updateUser({ privacy: updated });
      setSuccess(t("settings.saved"));
    } catch (err) {
      setError(err.response?.data?.message || t("common.error"));
    } finally {
      setSaving(false);
    }
  };

  const renderSelect = (field, labelKey, icon) => (
    <Form.Group className="mb-3">
      <Form.Label className="small fw-semibold d-flex align-items-center gap-2">
        <i className={`bi ${icon}`}></i>
        {t(labelKey)}
      </Form.Label>
      <Form.Select
        value={privacy[field]}
        onChange={(e) => handleChange(field, e.target.value)}
        disabled={saving}
      >
        {PRIVACY_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {t(opt.labelKey)}
          </option>
        ))}
      </Form.Select>
    </Form.Group>
  );

  return (
    <div>
      {success && (
        <Alert variant="success" className="small py-2">
          <i className="bi bi-check-circle me-2"></i>
          {success}
        </Alert>
      )}
      {error && (
        <Alert variant="danger" className="small py-2">
          <i className="bi bi-exclamation-triangle me-2"></i>
          {error}
        </Alert>
      )}

      <Row>
        <Col md={6}>{renderSelect("lastSeen", "settings.lastSeenPrivacy", "bi-clock-history")}</Col>
        <Col md={6}>{renderSelect("profilePhoto", "settings.profilePhotoPrivacy", "bi-person-badge")}</Col>
        <Col md={6}>{renderSelect("about", "settings.aboutPrivacy", "bi-info-circle")}</Col>
      </Row>

      {/* إيصالات القراءة */}
      <Form.Group className="mb-4 mt-2">
        <div className="d-flex align-items-center justify-content-between p-3 border rounded">
          <div>
            <div className="fw-semibold small d-flex align-items-center gap-2">
              <i className="bi bi-check2-all"></i>
              {t("settings.readReceipts")}
            </div>
            <div className="text-muted small mt-1">
              {t("settings.readReceiptsDesc")}
            </div>
          </div>
          <Form.Check
            type="switch"
            id="read-receipts-switch"
            checked={privacy.readReceipts}
            onChange={(e) =>
              handleChange("readReceipts", e.target.checked)
            }
            disabled={saving}
          />
        </div>
      </Form.Group>

      <Button
        variant="success"
        onClick={handleSave}
        disabled={saving}
        className="w-100 fw-semibold"
      >
        {saving ? (
          <>
            <Spinner animation="border" size="sm" className="me-2" />
            {t("common.loading")}
          </>
        ) : (
          <>
            <i className="bi bi-check-lg me-2"></i>
            {t("common.save")}
          </>
        )}
      </Button>
    </div>
  );
};

export default PrivacySettings;