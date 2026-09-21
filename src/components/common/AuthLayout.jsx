import { Container, Card } from "react-bootstrap";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import AuthToolbar from "./AuthToolbar";

const AuthLayout = ({ title, subtitle, children, footerLink }) => {
  const { t } = useTranslation();

  return (
    <>
      {/* ⭐ شريط الأدوات — الوضع + اللغة */}
      <AuthToolbar />

      <div
        className="d-flex justify-content-center align-items-center"
        style={{
          minHeight: "100dvh",
          paddingTop: "max(4rem, env(safe-area-inset-top))", // ⭐ 4rem لترك مساحة للـ toolbar
          paddingBottom: "max(1rem, env(safe-area-inset-bottom))",
          paddingLeft: "1rem",
          paddingRight: "1rem",
          backgroundColor: "var(--bs-body-bg)",
          overflowY: "auto",
        }}
      >
        <Container
          style={{
            maxWidth: "440px",
            width: "100%",
            paddingLeft: 0,
            paddingRight: 0,
          }}
        >
          <Card className="shadow-lg border-0 rounded-4">
            <Card.Body className="p-3 p-sm-4 p-md-5">
              {/* ⭐ الشعار والعنوان */}
              <div className="text-center mb-3 mb-sm-4">
                <div
                  className="d-inline-flex align-items-center justify-content-center rounded-circle mb-2 mb-sm-3"
                  style={{
                    width: "clamp(56px, 15vw, 70px)",
                    height: "clamp(56px, 15vw, 70px)",
                    backgroundColor: "#008069",
                    color: "#fff",
                    fontSize: "clamp(1.5rem, 5vw, 2rem)",
                  }}
                >
                  <i className="bi bi-chat-dots-fill"></i>
                </div>
                <h3
                  className="fw-bold mb-1"
                  style={{ fontSize: "clamp(1.15rem, 4.5vw, 1.5rem)" }}
                >
                  {title}
                </h3>
                {subtitle && (
                  <p
                    className="text-muted mb-0"
                    style={{ fontSize: "clamp(0.8rem, 3vw, 0.875rem)" }}
                  >
                    {subtitle}
                  </p>
                )}
              </div>

              {/* ⭐ النموذج */}
              {children}

              {/* ⭐ الرابط في الأسفل */}
              {footerLink && (
                <div className="text-center mt-3 mt-sm-4 pt-3 border-top">
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

          {/* ⭐ حقوق النشر */}
          <p
            className="text-center text-muted mb-0 mt-3"
            style={{ fontSize: "0.75rem", direction: "ltr" }}
          >
            © {new Date().getFullYear()} H Chat App
          </p>
        </Container>
      </div>
    </>
  );
};

export default AuthLayout;