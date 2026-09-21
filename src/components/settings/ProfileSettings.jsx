import { useState, useRef } from "react";
import { Form, Button, Alert, Spinner } from "react-bootstrap";
import { useTranslation } from "react-i18next";
import { useAuth } from "../../hooks/useAuth";
import { userService } from "../../services/userService";
import { uploadService } from "../../services/uploadService";
import Avatar from "../common/Avatar";

const ProfileSettings = () => {
  const { t } = useTranslation();
  const { user, updateUser } = useAuth();
  const fileInputRef = useRef(null);

  const [formData, setFormData] = useState({
    username: user?.username || "",
    bio: user?.bio || "",
    avatar: user?.avatar || "",
  });
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (success) setSuccess("");
    if (error) setError("");
  };

  // رفع الصورة
  const handleAvatarUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // التحقق من النوع والحجم
    if (!file.type.startsWith("image/")) {
      setError("Only images are allowed");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError("Image too large (max 5MB)");
      return;
    }

    setUploading(true);
    setError("");

    try {
      const result = await uploadService.uploadFile(file);
      setFormData((prev) => ({ ...prev, avatar: result.url }));
    } catch (err) {
      setError(err.response?.data?.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setSuccess("");
    setError("");

    try {
      const updated = await userService.updateProfile(formData);
      updateUser(updated);
      setSuccess(t("settings.saved"));
    } catch (err) {
      setError(err.response?.data?.message || t("common.error"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Form onSubmit={handleSubmit}>
      {/* الصورة الرمزية */}
      <div className="text-center mb-4">
        <div className="position-relative d-inline-block">
          <Avatar user={{ ...user, avatar: formData.avatar }} size={100} />
          <Button
            variant="success"
            size="sm"
            className="position-absolute rounded-circle p-0 d-flex align-items-center justify-content-center"
            style={{
              width: "32px",
              height: "32px",
              bottom: 0,
              right: 0,
            }}
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
          >
            {uploading ? (
              <Spinner animation="border" size="sm" />
            ) : (
              <i className="bi bi-camera-fill"></i>
            )}
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            hidden
            onChange={handleAvatarUpload}
          />
        </div>
        <p className="text-muted small mt-2 mb-0">
          {t("settings.chooseAvatar")}
        </p>
      </div>

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

      {/* اسم المستخدم */}
      <Form.Group className="mb-3">
        <Form.Label className="small fw-semibold">
          {t("auth.username")}
        </Form.Label>
        <Form.Control
          type="text"
          name="username"
          value={formData.username}
          onChange={handleChange}
          placeholder={t("auth.usernamePlaceholder")}
          disabled={saving}
        />
      </Form.Group>

      {/* البريد (قراءة فقط) */}
      <Form.Group className="mb-3">
        <Form.Label className="small fw-semibold">{t("auth.email")}</Form.Label>
        <Form.Control type="email" value={user?.email || ""} disabled />
        <Form.Text className="text-muted small">
          Email cannot be changed
        </Form.Text>
      </Form.Group>

      {/* النبذة */}
      <Form.Group className="mb-3">
        <Form.Label className="small fw-semibold">
          {t("settings.bio")}
        </Form.Label>
        <Form.Control
          as="textarea"
          rows={3}
          name="bio"
          value={formData.bio}
          onChange={handleChange}
          maxLength={150}
          disabled={saving}
          placeholder={t("settings.bioPlaceholder")}
        />
        <Form.Text className="text-muted small">
          {formData.bio.length}/150
        </Form.Text>
      </Form.Group>

      <Button
        type="submit"
        variant="success"
        className="w-100 fw-semibold"
        disabled={saving}
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
    </Form>
  );
};

export default ProfileSettings;
