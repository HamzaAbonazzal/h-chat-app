import { useState, useEffect } from "react";
import { Form, Button, Alert, InputGroup } from "react-bootstrap";
import { useNavigate, Navigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "../hooks/useAuth";
import { validators } from "../utils/validators";
import AuthLayout from "../components/common/AuthLayout";

const LoginPage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { login, isAuthenticated, loading: authLoading } = useAuth();

  const [formData, setFormData] = useState({ email: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState("");
  const [loading, setLoading] = useState(false);

  // إذا سجل دخوله مسبقاً، انتقل للصفحة الرئيسية
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
        {/* البريد الإلكتروني */}
        <Form.Group className="mb-3">
          <Form.Label className="small fw-semibold">
            {t("auth.email")}
          </Form.Label>
          <InputGroup>
            <InputGroup.Text className="bg-transparent">
              <i className="bi bi-envelope"></i>
            </InputGroup.Text>
            <Form.Control
              type="email"
              name="email"
              placeholder="you@example.com"
              value={formData.email}
              onChange={handleChange}
              isInvalid={!!errors.email}
              autoComplete="email"
              autoFocus
              disabled={loading}
            />
          </InputGroup>
          {errors.email && (
            <div className="text-danger small mt-1">{errors.email}</div>
          )}
        </Form.Group>

        {/* كلمة المرور */}
        <Form.Group className="mb-3">
          <Form.Label className="small fw-semibold">
            {t("auth.password")}
          </Form.Label>
          <InputGroup>
            <InputGroup.Text className="bg-transparent">
              <i className="bi bi-lock"></i>
            </InputGroup.Text>
            <Form.Control
              type={showPassword ? "text" : "password"}
              name="password"
              placeholder="••••••••"
              value={formData.password}
              onChange={handleChange}
              isInvalid={!!errors.password}
              autoComplete="current-password"
              disabled={loading}
            />
            <Button
              variant="outline-secondary"
              type="button"
              onClick={() => setShowPassword((p) => !p)}
              disabled={loading}
            >
              <i
                className={`bi bi-eye${showPassword ? "-slash" : ""}`}
              ></i>
            </Button>
          </InputGroup>
          {errors.password && (
            <div className="text-danger small mt-1">{errors.password}</div>
          )}
        </Form.Group>

        {/* زر الدخول */}
        <Button
          type="submit"
          className="w-100 fw-semibold py-2"
          style={{ backgroundColor: "#008069", borderColor: "#008069" }}
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