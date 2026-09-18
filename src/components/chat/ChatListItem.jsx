import { useTranslation } from "react-i18next";
import { Badge } from "react-bootstrap";
import Avatar from "../common/Avatar";
import { formatChatTime, truncate } from "../../utils/formatters";

const ChatListItem = ({
  conversation,
  currentUserId,
  isActive,
  onClick,
  isOnline,
}) => {
  const { t, i18n } = useTranslation();

  const otherUser = conversation.isGroup
    ? null
    : conversation.participants.find((p) => p._id !== currentUserId);

  const displayName = conversation.isGroup
    ? conversation.name
    : otherUser?.username || "Unknown";

  const displayUser = conversation.isGroup
    ? { username: conversation.name, avatar: conversation.groupAvatar }
    : otherUser;

  const lastMessage = conversation.lastMessage;

  // ⭐ نص رسالة النظام
  const getSystemMessageText = (msg) => {
    if (!msg?.systemMessage) return "";
    const { action, actor, target } = msg.systemMessage;
    const actorName = actor?.username || "?";
    const targetName = target?.username || "?";

    switch (action) {
      case "group_created":
        return `${actorName} ${t("systemMessages.groupCreated")}`;
      case "user_added":
        return `${actorName} ${t("systemMessages.userAdded")} ${targetName}`;
      case "user_left":
        return `${actorName} ${t("systemMessages.userLeft")}`;
      case "user_removed":
        return `${actorName} ${t("systemMessages.userRemoved")} ${targetName}`;
      case "admin_promoted":
        return `${targetName} ${t("systemMessages.adminPromoted")}`;
      case "admin_demoted":
        return `${targetName} ${t("systemMessages.adminDemoted")}`;
      case "group_name_changed":
        return `${actorName} ${t("systemMessages.groupNameChanged")}`;
      case "group_photo_changed":
        return `${actorName} ${t("systemMessages.groupPhotoChanged")}`;
      case "message_pinned":
        return `${actorName} ${t("systemMessages.messagePinned")}`;
      case "message_unpinned":
        return `${actorName} ${t("systemMessages.messageUnpinned")}`;
      default:
        return "";
    }
  };

  // ⭐ أيقونة + نص حسب نوع الرسالة
  const getMessagePreview = (msg) => {
    if (!msg) return { text: "", icon: null };

    // نظام
    if (msg.type === "system") {
      return { text: getSystemMessageText(msg), icon: "bi-info-circle" };
    }

    // محذوفة
    if (msg.isDeleted) {
      return { text: t("message.deleted"), icon: "bi-slash-circle" };
    }

    // ⭐ حسب النوع
    switch (msg.type) {
      case "image":
        return {
          text: msg.content || t("chat.previewImage", "📷 صورة"),
          icon: "bi-image",
        };
      case "video":
        return {
          text: msg.content || t("chat.previewVideo", "🎥 فيديو"),
          icon: "bi-camera-video-fill",
        };
      case "audio":
        return {
          text: t("chat.previewAudio", "🎤 رسالة صوتية"),
          icon: "bi-mic-fill",
        };
      case "file":
        return {
          text: msg.content || t("chat.previewFile", "📎 ملف"),
          icon: "bi-paperclip",
        };
      default:
        return { text: msg.content || "", icon: null };
    }
  };

  const preview = getMessagePreview(lastMessage);
  const isMine = lastMessage?.sender?._id === currentUserId;

  const time = lastMessage?.createdAt
    ? formatChatTime(lastMessage.createdAt, i18n.language)
    : "";

  const hasUnread = conversation.unreadCount > 0;

  return (
    <div
      className={`chat-list-item list-group-item list-group-item-action d-flex align-items-center gap-3 ${
        isActive ? "active" : ""
      }`}
      onClick={onClick}
      style={{
        cursor: "pointer",
        padding: "12px 16px",
        position: "relative",
        border: "none",
        transition: "background-color 0.15s ease",
      }}
    >
      <Avatar user={displayUser} size={52} showOnline isOnline={isOnline} />

      <div className="flex-grow-1 min-w-0">
        <div className="d-flex justify-content-between align-items-center mb-1">
          <div
            className="fw-semibold text-truncate d-flex align-items-center gap-1"
            style={{ fontSize: "0.95rem", minWidth: 0 }}
          >
            {conversation.isPinned && (
              <i
                className="bi bi-pin-angle-fill flex-shrink-0"
                style={{
                  fontSize: "0.7rem",
                  color: isActive ? "#fff" : "#8696a0",
                }}
              ></i>
            )}
            {conversation.isMuted && (
              <i
                className="bi bi-bell-slash-fill flex-shrink-0"
                style={{
                  fontSize: "0.7rem",
                  color: isActive ? "#fff" : "#8696a0",
                }}
              ></i>
            )}
            <span className="text-truncate">{displayName}</span>
          </div>
          <div
            className={`small ms-2 flex-shrink-0 ${
              isActive ? "text-white-50" : hasUnread ? "text-success fw-semibold" : "text-muted"
            }`}
            style={{ fontSize: "0.72rem" }}
          >
            {time}
          </div>
        </div>

        <div className="d-flex justify-content-between align-items-center">
          <div
            className={`text-truncate small d-flex align-items-center gap-1 ${
              isActive ? "text-white-50" : "text-muted"
            }`}
            style={{ minWidth: 0, fontSize: "0.85rem" }}
          >
            {/* ⭐ أيقونة الرسالة */}
            {preview.icon && (
              <i
                className={`bi ${preview.icon} flex-shrink-0`}
                style={{ fontSize: "0.8rem", opacity: 0.85 }}
              ></i>
            )}

            {/* ⭐ علامة ✓✓ للرسائل المُرسَلة */}
            {isMine && lastMessage?.type !== "system" && !lastMessage?.isDeleted && (
              <i
                className={`bi flex-shrink-0 ${
                  lastMessage?.status === "read"
                    ? "bi-check2-all text-info"
                    : lastMessage?.status === "delivered"
                    ? "bi-check2-all"
                    : "bi-check2"
                }`}
                style={{ fontSize: "0.85rem" }}
              ></i>
            )}

            <span className="text-truncate">
              {truncate(preview.text, 40) || t("chat.startConversation")}
            </span>
          </div>

          {hasUnread && (
            <Badge
              bg={conversation.isMuted ? "secondary" : "success"}
              pill
              className="ms-2 flex-shrink-0"
              style={{
                fontSize: "0.7rem",
                minWidth: "22px",
                height: "22px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: "0 6px",
              }}
            >
              {conversation.unreadCount > 99 ? "99+" : conversation.unreadCount}
            </Badge>
          )}
        </div>
      </div>
    </div>
  );
};

export default ChatListItem;