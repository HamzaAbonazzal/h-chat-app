import { useState, useEffect } from "react";
import { Button, Dropdown } from "react-bootstrap";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useSocket } from "../../hooks/useSocket";
import { useCall } from "../../context/CallContext";
import { useGroupCallContext } from "../../context/GroupCallContext";
import { blockService } from "../../services/blockService";
import { conversationService } from "../../services/conversationService";
import Avatar from "../common/Avatar";
import ConfirmModal from "./ConfirmModal";
import { formatLastSeen } from "../../utils/formatters";

const ChatHeader = ({
  conversation,
  currentUserId,
  onBack,
  onConversationDeleted,
  onOpenSearch,
  onOpenGroupInfo,
  onTogglePin,
  onToggleMute,
  onToggleArchive,
  onOpenDisappearing,
  onClearChat,
}) => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { onlineUsers } = useSocket();
  const { startCall } = useCall();
  const { startGroupCall } = useGroupCallContext();

  const [blockStatus, setBlockStatus] = useState({
    iBlockedThem: false,
    theyBlockedMe: false,
  });
  const [showBlockModal, setShowBlockModal] = useState(false);
  const [showUnblockModal, setShowUnblockModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showClearModal, setShowClearModal] = useState(false);
  const [loading, setLoading] = useState(false);

  const otherUser = conversation?.isGroup
    ? null
    : conversation?.participants.find((p) => p._id !== currentUserId);

  useEffect(() => {
    if (!otherUser) return;

    const check = async () => {
      try {
        const status = await blockService.checkBlockStatus(otherUser._id);
        setBlockStatus(status);
      } catch (err) {
        console.error("Failed to check block status:", err);
      }
    };

    check();
  }, [otherUser?._id]);

  if (!conversation) return null;

  const displayName = conversation.isGroup
    ? conversation.name
    : otherUser?.username || "Unknown";

  const displayUser = conversation.isGroup
    ? { username: conversation.name, avatar: conversation.groupAvatar }
    : otherUser;

  const isOnline = otherUser ? onlineUsers.has(otherUser._id) : false;

  const statusText = conversation.isGroup
    ? `${conversation.participants.length} ${t("chat.members")}`
    : isOnline
    ? t("common.online")
    : otherUser?.lastSeen
    ? formatLastSeen(otherUser.lastSeen, i18n.language)
    : t("common.offline");

  const handleClickHeader = () => {
    if (conversation.isGroup) {
      onOpenGroupInfo?.();
    } else if (otherUser) {
      navigate(`/profile/${otherUser._id}`);
    }
  };

  // ⭐ بدء مكالمة صوتية فردية
  const handleVoiceCall = () => {
    if (otherUser) {
      startCall(otherUser._id, otherUser, "voice");
    }
  };

  // ⭐ بدء مكالمة مرئية فردية
  const handleVideoCall = () => {
    if (otherUser) {
      startCall(otherUser._id, otherUser, "video");
    }
  };

  // ⭐ بدء مكالمة جماعية صوتية
  const handleGroupVoiceCall = () => {
    if (conversation.isGroup) {
      startGroupCall(conversation, "voice");
    }
  };

  // ⭐ بدء مكالمة جماعية مرئية
  const handleGroupVideoCall = () => {
    if (conversation.isGroup) {
      startGroupCall(conversation, "video");
    }
  };

  const handleBlock = async () => {
    if (!otherUser) return;
    setLoading(true);
    try {
      await blockService.blockUser(otherUser._id);
      setBlockStatus((prev) => ({ ...prev, iBlockedThem: true }));
      setShowBlockModal(false);
    } catch (err) {
      console.error("Block failed:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleUnblock = async () => {
    if (!otherUser) return;
    setLoading(true);
    try {
      await blockService.unblockUser(otherUser._id);
      setBlockStatus((prev) => ({ ...prev, iBlockedThem: false }));
      setShowUnblockModal(false);
    } catch (err) {
      console.error("Unblock failed:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    setLoading(true);
    try {
      await conversationService.deleteConversation(conversation._id);
      setShowDeleteModal(false);
      onConversationDeleted?.(conversation._id);
      navigate("/");
    } catch (err) {
      console.error("Delete failed:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleClear = async () => {
    setLoading(true);
    try {
      await onClearChat?.();
      setShowClearModal(false);
    } catch (err) {
      console.error("Clear failed:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div
        className="d-flex align-items-center gap-3 border-bottom px-3"
        style={{
          height: "60px",
          backgroundColor: "var(--bs-body-bg)",
          flexShrink: 0,
        }}
      >
        {/* ⭐ زر الرجوع (للشاشات الصغيرة) */}
        <Button
          variant="link"
          className="d-md-none p-0 text-decoration-none text-secondary"
          onClick={onBack}
        >
          <i className="bi bi-arrow-left fs-4"></i>
        </Button>

        {/* ⭐ الصورة + الاسم */}
        <div
          className="d-flex align-items-center gap-2 flex-grow-1 min-w-0 cursor-pointer"
          onClick={handleClickHeader}
        >
          <Avatar user={displayUser} size={42} showOnline isOnline={isOnline} />
          <div className="min-w-0">
            <div
              className="fw-semibold text-truncate d-flex align-items-center gap-1"
              style={{ fontSize: "0.95rem" }}
            >
              {/* أيقونة الرسائل المؤقتة */}
              {conversation.disappearingDuration > 0 && (
                <i
                  className="bi bi-clock-history flex-shrink-0"
                  style={{ fontSize: "0.75rem", color: "#25d366" }}
                  title={t("chat.disappearingMessages")}
                ></i>
              )}
              {/* أيقونة التثبيت */}
              {conversation.isPinned && (
                <i
                  className="bi bi-pin-angle-fill flex-shrink-0"
                  style={{ fontSize: "0.75rem", color: "#8696a0" }}
                ></i>
              )}
              {/* أيقونة الكتم */}
              {conversation.isMuted && (
                <i
                  className="bi bi-bell-slash-fill flex-shrink-0"
                  style={{ fontSize: "0.75rem", color: "#8696a0" }}
                ></i>
              )}
              <span className="text-truncate">{displayName}</span>
            </div>
            <div
              className="text-truncate"
              style={{
                fontSize: "0.75rem",
                color: isOnline ? "#25d366" : "var(--bs-secondary-color)",
              }}
            >
              {statusText}
            </div>
          </div>
        </div>

        {/* ⭐ الأزرار */}
        <div className="d-flex align-items-center gap-1">
          {/* زر البحث */}
          <Button
            variant="link"
            className="text-secondary p-2 text-decoration-none"
            onClick={onOpenSearch}
            title={t("chat.searchInChat")}
          >
            <i className="bi bi-search fs-5"></i>
          </Button>

          {/* ⭐ أزرار المكالمة الفردية */}
          {!conversation.isGroup && otherUser && (
            <>
              <Button
                variant="link"
                className="text-secondary p-2 text-decoration-none d-none d-sm-inline"
                title={t("call.videoCall")}
                onClick={handleVideoCall}
                disabled={blockStatus.iBlockedThem}
              >
                <i className="bi bi-camera-video fs-5"></i>
              </Button>
              <Button
                variant="link"
                className="text-secondary p-2 text-decoration-none d-none d-sm-inline"
                title={t("call.voiceCall")}
                onClick={handleVoiceCall}
                disabled={blockStatus.iBlockedThem}
              >
                <i className="bi bi-telephone fs-5"></i>
              </Button>
            </>
          )}

          {/* ⭐ أزرار المكالمة الجماعية */}
          {conversation.isGroup && (
            <>
              <Button
                variant="link"
                className="text-secondary p-2 text-decoration-none d-none d-sm-inline"
                title={t("call.groupVideoCall", "مكالمة جماعية مرئية")}
                onClick={handleGroupVideoCall}
              >
                <i className="bi bi-camera-video fs-5"></i>
              </Button>
              <Button
                variant="link"
                className="text-secondary p-2 text-decoration-none d-none d-sm-inline"
                title={t("call.groupCall", "مكالمة جماعية")}
                onClick={handleGroupVoiceCall}
              >
                <i className="bi bi-telephone-plus fs-5"></i>
              </Button>
            </>
          )}

          {/* ⭐ قائمة الخيارات */}
          <Dropdown align="end">
            <Dropdown.Toggle
              as="button"
              bsPrefix="btn btn-link p-2 text-secondary text-decoration-none"
              style={{ border: "none" }}
            >
              <i className="bi bi-three-dots-vertical fs-5"></i>
            </Dropdown.Toggle>
            <Dropdown.Menu>
              {/* معلومات المجموعة */}
              {conversation.isGroup && (
                <Dropdown.Item onClick={onOpenGroupInfo}>
                  <i className="bi bi-people me-2"></i>
                  {t("chat.groupInfo")}
                </Dropdown.Item>
              )}

              {/* الملف الشخصي */}
              {!conversation.isGroup && otherUser && (
                <Dropdown.Item
                  onClick={() => navigate(`/profile/${otherUser._id}`)}
                >
                  <i className="bi bi-person me-2"></i>
                  {t("settings.myProfile")}
                </Dropdown.Item>
              )}

              <Dropdown.Divider />

              {/* تثبيت */}
              <Dropdown.Item onClick={onTogglePin}>
                <i
                  className={`bi ${
                    conversation.isPinned ? "bi-pin-angle" : "bi-pin-angle-fill"
                  } me-2`}
                ></i>
                {conversation.isPinned ? t("chat.unpin") : t("chat.pin")}
              </Dropdown.Item>

              {/* كتم */}
              {conversation.isMuted ? (
                <Dropdown.Item onClick={() => onToggleMute(null)}>
                  <i className="bi bi-bell me-2"></i>
                  {t("chat.unmute")}
                </Dropdown.Item>
              ) : (
                <Dropdown drop="end">
                  <Dropdown.Toggle
                    as="div"
                    bsPrefix="dropdown-item"
                    style={{ cursor: "pointer" }}
                  >
                    <i className="bi bi-bell-slash me-2"></i>
                    {t("chat.mute")}
                  </Dropdown.Toggle>
                  <Dropdown.Menu>
                    <Dropdown.Item onClick={() => onToggleMute("8h")}>
                      {t("chat.muteFor8h")}
                    </Dropdown.Item>
                    <Dropdown.Item onClick={() => onToggleMute("1w")}>
                      {t("chat.muteFor1w")}
                    </Dropdown.Item>
                    <Dropdown.Item onClick={() => onToggleMute("always")}>
                      {t("chat.muteAlways")}
                    </Dropdown.Item>
                  </Dropdown.Menu>
                </Dropdown>
              )}

              {/* أرشفة */}
              <Dropdown.Item onClick={onToggleArchive}>
                <i
                  className={`bi ${
                    conversation.isArchived ? "bi-box-arrow-up" : "bi-archive"
                  } me-2`}
                ></i>
                {conversation.isArchived
                  ? t("chat.unarchive")
                  : t("chat.archive")}
              </Dropdown.Item>

              {/* الرسائل المؤقتة */}
              <Dropdown.Item onClick={onOpenDisappearing}>
                <i className="bi bi-clock-history me-2"></i>
                {t("chat.disappearingMessages")}
              </Dropdown.Item>

              {/* مسح المحادثة */}
              <Dropdown.Item onClick={() => setShowClearModal(true)}>
                <i className="bi bi-eraser me-2"></i>
                {t("chat.clearChat")}
              </Dropdown.Item>

              {/* حظر / إلغاء حظر */}
              {!conversation.isGroup && otherUser && (
                <>
                  <Dropdown.Divider />
                  {blockStatus.iBlockedThem ? (
                    <Dropdown.Item
                      onClick={() => setShowUnblockModal(true)}
                      className="text-success"
                    >
                      <i className="bi bi-check-circle me-2"></i>
                      {t("chat.unblockUser")}
                    </Dropdown.Item>
                  ) : (
                    <Dropdown.Item
                      onClick={() => setShowBlockModal(true)}
                      className="text-danger"
                    >
                      <i className="bi bi-slash-circle me-2"></i>
                      {t("chat.blockUser")}
                    </Dropdown.Item>
                  )}
                </>
              )}

              {/* حذف المحادثة (فردية فقط) */}
              {!conversation.isGroup && (
                <>
                  <Dropdown.Divider />
                  <Dropdown.Item
                    className="text-danger"
                    onClick={() => setShowDeleteModal(true)}
                  >
                    <i className="bi bi-trash me-2"></i>
                    {t("chat.deleteConversation")}
                  </Dropdown.Item>
                </>
              )}
            </Dropdown.Menu>
          </Dropdown>
        </div>
      </div>

      {/* ⭐ Modal الحظر */}
      {otherUser && (
        <>
          <ConfirmModal
            show={showBlockModal}
            onHide={() => setShowBlockModal(false)}
            onConfirm={handleBlock}
            title={`${t("chat.blockUser")} ${otherUser?.username}؟`}
            message={t("chat.blockUserConfirm")}
            confirmText={t("chat.blockUser")}
            confirmVariant="danger"
            loading={loading}
            icon="bi-slash-circle"
          />

          <ConfirmModal
            show={showUnblockModal}
            onHide={() => setShowUnblockModal(false)}
            onConfirm={handleUnblock}
            title={`${t("chat.unblockUser")} ${otherUser?.username}؟`}
            message={t("chat.unblockUserConfirm")}
            confirmText={t("chat.unblockUser")}
            confirmVariant="success"
            loading={loading}
            icon="bi-check-circle"
          />

          <ConfirmModal
            show={showDeleteModal}
            onHide={() => setShowDeleteModal(false)}
            onConfirm={handleDelete}
            title={t("chat.deleteConversation")}
            message={t("chat.deleteConversationConfirm")}
            confirmText={t("common.delete")}
            confirmVariant="danger"
            loading={loading}
            icon="bi-trash"
          />
        </>
      )}

      {/* ⭐ Modal مسح المحادثة */}
      <ConfirmModal
        show={showClearModal}
        onHide={() => setShowClearModal(false)}
        onConfirm={handleClear}
        title={t("chat.clearChat")}
        message={t("chat.clearChatConfirm")}
        confirmText={t("chat.clearChat")}
        confirmVariant="danger"
        loading={loading}
        icon="bi-eraser"
      />
    </>
  );
};

export default ChatHeader;