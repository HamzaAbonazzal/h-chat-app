import { Modal, Button, Badge } from "react-bootstrap";
import { useTranslation } from "react-i18next";
import { formatMessageTime } from "../../utils/formatters";
import Avatar from "../common/Avatar";
import EmptyState from "../common/EmptyState";

const PinnedMessagesModal = ({
  show,
  onHide,
  pinnedMessages,
  onJumpTo,
  onUnpin,
  currentUserId,
}) => {
  const { t, i18n } = useTranslation();

  const renderPreview = (msg) => {
    if (msg.type === "image") return "📷 " + t("chat.sendImage");
    if (msg.type === "video") return "🎥 " + t("chat.sendVideo");
    if (msg.type === "audio") return "🎤 " + t("chat.recordVoice");
    if (msg.type === "file") return "📎 " + t("chat.attachFile");
    return msg.content || "";
  };

  return (
    <Modal show={show} onHide={onHide} centered size="lg">
      <Modal.Header closeButton>
        <Modal.Title className="fs-6 fw-bold">
          <i className="bi bi-pin-angle-fill text-success me-2"></i>
          {t("chat.pinnedMessages")}
          {pinnedMessages.length > 0 && (
            <Badge
              bg="secondary"
              className="ms-2"
              style={{ fontSize: "0.7rem" }}
            >
              {pinnedMessages.length}
            </Badge>
          )}
        </Modal.Title>
      </Modal.Header>

      <Modal.Body style={{ maxHeight: "70vh", overflowY: "auto" }}>
        {pinnedMessages.length === 0 ? (
          <EmptyState
            icon="bi-pin-angle"
            title={t("chat.noPinnedMessages")}
            description={t("chat.noPinnedDesc")}
          />
        ) : (
          <div className="d-flex flex-column gap-2">
            {pinnedMessages.map((msg) => (
              <div
                key={msg._id}
                className="p-3 rounded-3 border d-flex align-items-start gap-3"
                style={{
                  cursor: "pointer",
                  backgroundColor: "var(--bs-body-bg)",
                  transition: "background-color 0.15s",
                }}
                onClick={() => {
                  onHide();
                  onJumpTo?.(msg._id);
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.backgroundColor =
                    "var(--bs-tertiary-bg)")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.backgroundColor = "var(--bs-body-bg)")
                }
              >
                <div className="flex-shrink-0">
                  <Avatar user={msg.sender} size={36} />
                </div>
                <div className="flex-grow-1 min-w-0">
                  <div className="d-flex align-items-center gap-2 mb-1">
                    <span className="fw-semibold small">
                      {msg.sender?.username}
                    </span>
                    <span
                      className="text-muted"
                      style={{ fontSize: "0.7rem" }}
                    >
                      ·{" "}
                      {formatMessageTime(msg.createdAt, i18n.language)}
                    </span>
                  </div>
                  <div
                    className="small"
                    style={{ lineHeight: 1.5, wordBreak: "break-word" }}
                  >
                    {renderPreview(msg)}
                  </div>
                </div>
                <Button
                  variant="outline-danger"
                  size="sm"
                  className="flex-shrink-0"
                  onClick={(e) => {
                    e.stopPropagation();
                    onUnpin?.(msg._id);
                  }}
                  title={t("chat.unpinMessage")}
                >
                  <i className="bi bi-pin-angle"></i>
                </Button>
              </div>
            ))}
          </div>
        )}
      </Modal.Body>
    </Modal>
  );
};

export default PinnedMessagesModal;