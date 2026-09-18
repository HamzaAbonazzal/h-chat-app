import { Container, Card } from "react-bootstrap";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";

const AuthLayout = ({ title, subtitle, children, footerLink }) => {
  const { t } = useTranslation();

  return (
    <div
      className="d-flex justify-content-center align-items-center vh-100"
      style={{ backgroundColor: "var(--bs-body-bg)" }}
    >
      <Container style={{ maxWidth: "440px" }}>
        <Card className="shadow-lg border-0 rounded-4">
          <Card.Body className="p-4 p-md-5">
            {/* الشعار والعنوان */}
            <div className="text-center mb-4">
              <div
                className="d-inline-flex align-items-center justify-content-center rounded-circle mb-3"
                style={{
                  width: "70px",
                  height: "70px",
                  backgroundColor: "#008069",
                  color: "#fff",
                  fontSize: "2rem",
                }}
              >
                <i className="bi bi-chat-dots-fill"></i>
              </div>
              <h3 className="fw-bold mb-1">{title}</h3>
              {subtitle && <p className="text-muted small mb-0">{subtitle}</p>}
            </div>

            {/* النموذج */}
            {children}

            {/* الرابط في الأسفل */}
            {footerLink && (
              <div className="text-center mt-4 pt-3 border-top">
                <span className="text-muted small">
                  {footerLink.text}{" "}
                  <Link
                    to={footerLink.to}
                    className="text-decoration-none fw-semibold"
                    style={{ color: "#008069" }}
                  >
                    {footerLink.linkText}
                  </Link>
                </span>
              </div>
            )}
          </Card.Body>
        </Card>

        {/* حقوق النشر */}
        <p className="text-center text-muted small mt-3 mb-0">
          © {new Date().getFullYear()} {t("common.appName")}
        </p>
      </Container>
    </div>
  );
};

export default AuthLayout;