import { useState } from "react";
import { Form, Button, Alert } from "react-bootstrap";
import { useNavigate, Navigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "../hooks/useAuth";
import { validators } from "../utils/validators";
import AuthLayout from "../components/common/AuthLayout";
import InputField from "../components/common/InputField";

const LoginPage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { login, isAuthenticated, loading: authLoading } = useAuth();

  const [formData, setFormData] = useState({ email: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState("");
  const [loading, setLoading] = useState(false);

  if (!authLoading && isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: "" }));
    if (serverError) setServerError("");
  };

  const validate = () => {
    const newErrors = {};
    if (!validators.email(formData.email)) {
      newErrors.email = t("errors.validationError");
    }
    if (!formData.password) {
      newErrors.password = t("errors.validationError");
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    setServerError("");

    try {
      await login(formData.email, formData.password);
      navigate("/", { replace: true });
    } catch (err) {
      setServerError(err.message || t("common.error"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      title={t("auth.loginTitle")}
      subtitle={t("auth.loginSubtitle")}
      footerLink={{
        text: t("auth.noAccount"),
        linkText: t("auth.register"),
        to: "/register",
      }}
    >
      {serverError && (
        <Alert variant="danger" className="small py-2">
          <i className="bi bi-exclamation-triangle me-2"></i>
          {serverError}
        </Alert>
      )}

      <Form onSubmit={handleSubmit} noValidate>
        {/* ⭐ البريد */}
        <InputField
          type="email"
          name="email"
          label={t("auth.email")}
          value={formData.email}
          onChange={handleChange}
          placeholder={t("auth.emailPlaceholder")}
          icon="bi-envelope"
          error={errors.email}
          autoComplete="email"
          autoFocus
          disabled={loading}
        />

        {/* ⭐ كلمة المرور */}
        <InputField
          type={showPassword ? "text" : "password"}
          name="password"
          label={t("auth.password")}
          value={formData.password}
          onChange={handleChange}
          placeholder={t("auth.passwordPlaceholder")}
          icon="bi-lock"
          error={errors.password}
          autoComplete="current-password"
          disabled={loading}
          endAdornment={
            <Button
              variant="link"
              type="button"
              onClick={() => setShowPassword((p) => !p)}
              disabled={loading}
              title={showPassword ? t("common.hide") : t("common.show")}
            >
              <i
                className={`bi bi-eye${showPassword ? "-slash" : ""}`}
              ></i>
            </Button>
          }
        />

        {/* ⭐ زر الدخول */}
        <Button
          type="submit"
          className="w-100 fw-semibold py-2 mt-2"
          style={{
            backgroundColor: "#008069",
            borderColor: "#008069",
            borderRadius: "10px",
          }}
          disabled={loading}
        >
          {loading ? (
            <>
              <span
                className="spinner-border spinner-border-sm me-2"
                role="status"
              ></span>
              {t("common.loading")}
            </>
          ) : (
            t("auth.login")
          )}
        </Button>
      </Form>
    </AuthLayout>
  );
};

export default LoginPage;