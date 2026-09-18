import { useState, useEffect } from "react";
import { Container, Card, Button, Spinner, Alert } from "react-bootstrap";
import { useParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { userService } from "../services/userService";
import { conversationService } from "../services/conversationService";
import { blockService } from "../services/blockService";
import { useAuth } from "../hooks/useAuth";
import { formatLastSeen } from "../utils/formatters";
import Avatar from "../components/common/Avatar";
import ConfirmModal from "../components/chat/ConfirmModal";

const ProfilePage = () => {
  const { t, i18n } = useTranslation();
  const { userId } = useParams();
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();

  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [startingChat, setStartingChat] = useState(false);
  const [blockStatus, setBlockStatus] = useState({ iBlockedThem: false });
  const [showBlockModal, setShowBlockModal] = useState(false);
  const [showUnblockModal, setShowUnblockModal] = useState(false);
  const [blockLoading, setBlockLoading] = useState(false);

  const isSelf = currentUser?._id === userId;

  useEffect(() => {
    const load = async () => {
      if (!userId) {
        setError("User not specified");
        setLoading(false);
        return;
      }

      try {
        const data = await userService.getUserById(userId);
        setUser(data);

        if (!isSelf) {
          const status = await blockService.checkBlockStatus(userId);
          setBlockStatus(status);
        }
      } catch (err) {
        setError(err.response?.data?.message || t("common.error"));
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [userId, isSelf]);

  const handleStartChat = async () => {
    setStartingChat(true);
    try {
      const conversation = await conversationService.createOrGetConversation(
        userId
      );
      navigate(`/chat/${conversation._id}`);
    } catch (err) {
      setError(err.response?.data?.message || t("common.error"));
    } finally {
      setStartingChat(false);
    }
  };

  const handleBlock = async () => {
    setBlockLoading(true);
    try {
      await blockService.blockUser(userId);
      setBlockStatus((prev) => ({ ...prev, iBlockedThem: true }));
      setShowBlockModal(false);
    } catch (err) {
      console.error("Block failed:", err);
    } finally {
      setBlockLoading(false);
    }
  };

  const handleUnblock = async () => {
    setBlockLoading(true);
    try {
      await blockService.unblockUser(userId);
      setBlockStatus((prev) => ({ ...prev, iBlockedThem: false }));
      setShowUnblockModal(false);
    } catch (err) {
      console.error("Unblock failed:", err);
    } finally {
      setBlockLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center vh-100">
        <Spinner animation="border" variant="success" />
      </div>
    );
  }

  if (error || !user) {
    return (
      <Container className="py-5">
        <Alert variant="danger">{error || t("errors.notFound")}</Alert>
        <Button variant="secondary" onClick={() => navigate(-1)}>
          {t("common.back")}
        </Button>
      </Container>
    );
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: "var(--bs-tertiary-bg)",
        paddingBottom: "2rem",
      }}
    >
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
            <h5 className="mb-0 fw-bold">
              {isSelf ? t("settings.myProfile") : user.username}
            </h5>
          </div>
        </Container>
      </div>

      <Container className="py-5" style={{ maxWidth: "600px" }}>
        <Card className="border-0 shadow-sm text-center">
          <Card.Body className="p-5">
            <Avatar user={user} size={140} />

            <h4 className="fw-bold mt-4 mb-1">{user.username}</h4>

            <p className="text-muted small">
              {user.presenceHidden ? (
                <span>
                  <i className="bi bi-eye-slash me-1"></i>
                  {t("common.offline")}
                </span>
              ) : user.isOnline ? (
                <span className="text-success">
                  <i
                    className="bi bi-circle-fill me-1"
                    style={{ fontSize: "0.6rem" }}
                  ></i>
                  {t("common.online")}
                </span>
              ) : (
                <span>
                  <i className="bi bi-clock me-1"></i>
                  {formatLastSeen(user.lastSeen, i18n.language)}
                </span>
              )}
            </p>

            {user.bio && !user.bioHidden && (
              <div className="my-4 p-3 rounded-3 bg-body-tertiary">
                <div className="small text-muted mb-1">{t("settings.bio")}</div>
                <div>{user.bio}</div>
              </div>
            )}

            {!isSelf && (
              <div className="d-flex flex-column gap-2 mt-3">
                {/* ⭐ حالة الحظر */}
                {blockStatus.iBlockedThem && (
                  <Alert variant="warning" className="small py-2 mb-0">
                    <i className="bi bi-slash-circle me-2"></i>
                    لقد حظرت هذا المستخدم
                  </Alert>
                )}

                {!blockStatus.iBlockedThem && (
                  <Button
                    variant="success"
                    className="px-4 fw-semibold"
                    onClick={handleStartChat}
                    disabled={startingChat || blockStatus.theyBlockedMe}
                  >
                    {startingChat ? (
                      <Spinner animation="border" size="sm" />
                    ) : (
                      <>
                        <i className="bi bi-chat-dots me-2"></i>
                        {t("chat.newChat")}
                      </>
                    )}
                  </Button>
                )}

                {/* ⭐ زر حظر / إلغاء حظر */}
                {blockStatus.iBlockedThem ? (
                  <Button
                    variant="outline-success"
                    className="px-4"
                    onClick={() => setShowUnblockModal(true)}
                  >
                    <i className="bi bi-check-circle me-2"></i>
                    إلغاء الحظر
                  </Button>
                ) : (
                  <Button
                    variant="outline-danger"
                    className="px-4"
                    onClick={() => setShowBlockModal(true)}
                  >
                    <i className="bi bi-slash-circle me-2"></i>
                    حظر المستخدم
                  </Button>
                )}
              </div>
            )}
          </Card.Body>
        </Card>
      </Container>

      <ConfirmModal
        show={showBlockModal}
        onHide={() => setShowBlockModal(false)}
        onConfirm={handleBlock}
        title={`حظر ${user.username}؟`}
        message="لن يتمكن من إرسال رسائل إليك، ولن ترى حالته."
        confirmText="حظر"
        confirmVariant="danger"
        loading={blockLoading}
        icon="bi-slash-circle"
      />

      <ConfirmModal
        show={showUnblockModal}
        onHide={() => setShowUnblockModal(false)}
        onConfirm={handleUnblock}
        title={`إلغاء حظر ${user.username}؟`}
        message="سيتمكن من إرسال رسائل إليك مجدداً."
        confirmText="إلغاء الحظر"
        confirmVariant="success"
        loading={blockLoading}
        icon="bi-check-circle"
      />
    </div>
  );
};

export default ProfilePage;