import { useState } from "react";
import { Form, Button, Alert } from "react-bootstrap";
import { useNavigate, Navigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "../hooks/useAuth";
import { validators } from "../utils/validators";
import AuthLayout from "../components/common/AuthLayout";
import InputField from "../components/common/InputField";

const RegisterPage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { register, isAuthenticated, loading: authLoading } = useAuth();

  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
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

    if (!validators.username(formData.username)) {
      newErrors.username = t("errors.validationError");
    }
    if (!validators.email(formData.email)) {
      newErrors.email = t("errors.validationError");
    }
    if (!validators.password(formData.password)) {
      newErrors.password = t("errors.validationError");
    }
    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = t("errors.validationError");
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
      await register(formData.username, formData.email, formData.password);
      navigate("/", { replace: true });
    } catch (err) {
      setServerError(err.message || t("common.error"));
    } finally {
      setLoading(false);
    }
  };

  const passwordAdornment = (
    <Button
      variant="link"
      type="button"
      onClick={() => setShowPassword((p) => !p)}
      disabled={loading}
      title={showPassword ? t("common.hide") : t("common.show")}
    >
      <i className={`bi bi-eye${showPassword ? "-slash" : ""}`}></i>
    </Button>
  );

  return (
    <AuthLayout
      title={t("auth.registerTitle")}
      subtitle={t("auth.registerSubtitle")}
      footerLink={{
        text: t("auth.haveAccount"),
        linkText: t("auth.login"),
        to: "/login",
      }}
    >
      {serverError && (
        <Alert variant="danger" className="small py-2">
          <i className="bi bi-exclamation-triangle me-2"></i>
          {serverError}
        </Alert>
      )}

      <Form onSubmit={handleSubmit} noValidate>
        {/* ⭐ اسم المستخدم */}
        <InputField
          type="text"
          name="username"
          label={t("auth.username")}
          value={formData.username}
          onChange={handleChange}
          placeholder={t("auth.usernamePlaceholder")}
          icon="bi-person"
          error={errors.username}
          autoComplete="username"
          autoFocus
          disabled={loading}
        />

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
          autoComplete="new-password"
          disabled={loading}
          endAdornment={passwordAdornment}
        />

        {/* ⭐ تأكيد كلمة المرور */}
        <InputField
          type={showPassword ? "text" : "password"}
          name="confirmPassword"
          label={t("auth.confirmPassword")}
          value={formData.confirmPassword}
          onChange={handleChange}
          placeholder={t("auth.confirmPasswordPlaceholder")}
          icon="bi-lock-fill"
          error={errors.confirmPassword}
          autoComplete="new-password"
          disabled={loading}
        />

        {/* ⭐ زر التسجيل */}
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
            t("auth.register")
          )}
        </Button>
      </Form>
    </AuthLayout>
  );
};

export default RegisterPage;