import { useState } from "react";
import {
  Container,
  Row,
  Col,
  Card,
  Nav,
  Button,
  Modal,
  Spinner,
} from "react-bootstrap";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "../hooks/useAuth";
import ThemeToggle from "../components/settings/ThemeToggle";
import LanguageSwitcher from "../components/settings/LanguageSwitcher";
import ProfileSettings from "../components/settings/ProfileSettings";
import PrivacySettings from "../components/settings/PrivacySettings";
import BlockedUsersList from "../components/settings/BlockedUsersList";
import Avatar from "../components/common/Avatar";
import DeleteAccountModal from "../components/settings/DeleteAccountModal";

const SettingsPage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, logout, deleteAccount } = useAuth();

  const [activeTab, setActiveTab] = useState("general");
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await logout();
      navigate("/login", { replace: true });
    } finally {
      setLoggingOut(false);
      setShowLogoutModal(false);
    }
  };

  const tabs = [
    { key: "general", icon: "bi-gear", label: t("settings.general") },
    { key: "account", icon: "bi-person", label: t("settings.account") },
    { key: "privacy", icon: "bi-shield-lock", label: t("settings.privacy") },
    {
      key: "blocked",
      icon: "bi-slash-circle",
      label: t("settings.blockedUsers"),
    },
  ];

  return (
    // ⭐ الحاوية الرئيسية — قابلة للتمرير بشكل طبيعي
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: "var(--bs-tertiary-bg)",
        paddingBottom: "2rem",
      }}
    >
      {/* ⭐ Header ثابت */}
      <div
        className="py-3 border-bottom sticky-top"
        style={{
          backgroundColor: "var(--bs-body-bg)",
          zIndex: 100,
        }}
      >
        <Container>
          <div className="d-flex align-items-center gap-3">
            <Button
              variant="link"
              className="p-0 text-decoration-none"
              onClick={() => navigate(-1)}
            >
              <i className="bi bi-arrow-left fs-4"></i>
            </Button>
            <h5 className="mb-0 fw-bold">{t("settings.title")}</h5>
          </div>
        </Container>
      </div>

      <Container className="py-4">
        <Row className="g-4">
          <Col md={4} lg={3}>
            <Card className="border-0 shadow-sm">
              <Card.Body className="text-center border-bottom">
                <Avatar user={user} size={80} />
                <h6 className="fw-bold mt-3 mb-1">{user?.username}</h6>
                <p className="text-muted small mb-0 text-truncate">
                  {user?.email}
                </p>
              </Card.Body>

              <Nav
                variant="pills"
                className="flex-column p-2"
                activeKey={activeTab}
                onSelect={(k) => setActiveTab(k)}
              >
                {tabs.map((tab) => (
                  <Nav.Item key={tab.key}>
                    <Nav.Link
                      eventKey={tab.key}
                      className="d-flex align-items-center gap-3 rounded-3 py-2 px-3 mb-1"
                    >
                      <i className={`bi ${tab.icon} fs-5`}></i>
                      <span className="small">{tab.label}</span>
                    </Nav.Link>
                  </Nav.Item>
                ))}

                <hr className="my-2" />

                <Nav.Item>
                  <Nav.Link
                    className="d-flex align-items-center gap-3 rounded-3 py-2 px-3 text-danger"
                    onClick={() => setShowLogoutModal(true)}
                  >
                    <i className="bi bi-box-arrow-right fs-5"></i>
                    <span className="small">{t("settings.logout")}</span>
                  </Nav.Link>
                </Nav.Item>
              </Nav>
            </Card>
          </Col>

          <Col md={8} lg={9}>
            <Card className="border-0 shadow-sm">
              <Card.Body className="p-4">
                {activeTab === "general" && (
                  <>
                    <h5 className="fw-bold mb-4">{t("settings.general")}</h5>

                    <div className="mb-4">
                      <label className="form-label small fw-semibold d-flex align-items-center gap-2">
                        <i className="bi bi-palette"></i>
                        {t("settings.theme")}
                      </label>
                      <ThemeToggle />
                    </div>

                    <div className="mb-4">
                      <label className="form-label small fw-semibold d-flex align-items-center gap-2">
                        <i className="bi bi-translate"></i>
                        {t("settings.language")}
                      </label>
                      <LanguageSwitcher />
                    </div>
                  </>
                )}

                {activeTab === "account" && (
                  <>
                    <h5 className="fw-bold mb-4">{t("settings.account")}</h5>
                    <ProfileSettings />
                    {/* ⭐ Danger Zone */}
                    <div className="mt-5 pt-4 border-top border-danger">
                      <h6 className="fw-bold text-danger mb-3">
                        <i className="bi bi-exclamation-triangle me-2"></i>
                        {t("settings.deleteAccount.dangerZone")}
                      </h6>

                      <div className="d-flex justify-content-between align-items-start p-3 border border-danger rounded-3">
                        <div className="me-3">
                          <div className="fw-semibold small">
                            {t("settings.deleteAccount.title")}
                          </div>
                          <div className="text-muted small mt-1">
                            {t("settings.deleteAccount.description")}
                          </div>
                        </div>
                        <Button
                          variant="outline-danger"
                          onClick={() => setShowDeleteModal(true)}
                          className="flex-shrink-0"
                        >
                          <i className="bi bi-trash me-2"></i>
                          {t("settings.deleteAccount.button")}
                        </Button>
                      </div>
                    </div>

                    {/* ⭐ Modal */}
                    <DeleteAccountModal
                      show={showDeleteModal}
                      onHide={() => setShowDeleteModal(false)}
                      onConfirm={deleteAccount}
                    />
                  </>
                )}

                {activeTab === "privacy" && (
                  <>
                    <h5 className="fw-bold mb-4">{t("settings.privacy")}</h5>
                    <PrivacySettings />
                  </>
                )}

                {activeTab === "blocked" && (
                  <>
                    <h5 className="fw-bold mb-4">
                      {t("settings.blockedUsers")}
                    </h5>
                    <BlockedUsersList />
                  </>
                )}
              </Card.Body>
            </Card>
          </Col>
        </Row>
      </Container>

      <Modal
        show={showLogoutModal}
        onHide={() => setShowLogoutModal(false)}
        centered
      >
        <Modal.Header closeButton>
          <Modal.Title className="fs-6 fw-bold">
            {t("settings.logout")}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>Are you sure you want to logout?</Modal.Body>
        <Modal.Footer>
          <Button
            variant="secondary"
            onClick={() => setShowLogoutModal(false)}
            disabled={loggingOut}
          >
            {t("common.cancel")}
          </Button>
          <Button variant="danger" onClick={handleLogout} disabled={loggingOut}>
            {loggingOut ? (
              <Spinner animation="border" size="sm" />
            ) : (
              t("settings.logout")
            )}
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default SettingsPage;
