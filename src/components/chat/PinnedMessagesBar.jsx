import { useState, useEffect } from "react";
import { Button } from "react-bootstrap";
import { useTranslation } from "react-i18next";

const PinnedMessagesBar = ({
  pinnedMessages,
  onJumpTo,
  onShowAll,
  currentIndex,
  onNavigate,
}) => {
  const { t } = useTranslation();

  if (!pinnedMessages || pinnedMessages.length === 0) return null;

  const currentMessage = pinnedMessages[currentIndex] || pinnedMessages[0];

  const renderPreview = () => {
    if (!currentMessage) return "";
    if (currentMessage.type === "image") return "📷 " + t("chat.sendImage");
    if (currentMessage.type === "video") return "🎥 " + t("chat.sendVideo");
    if (currentMessage.type === "audio") return "🎤";
    if (currentMessage.type === "file") return "📎";
    return currentMessage.content || "";
  };

  const total = pinnedMessages.length;
  const displayIndex = currentIndex + 1;

  return (
    <div
      className="d-flex align-items-center gap-2 px-3 py-2 border-bottom"
      style={{
        backgroundColor: "var(--bs-body-bg)",
        borderLeft: "4px solid #008069",
        flexShrink: 0,
        minHeight: "48px",
      }}
    >
      {/* ⭐ أيقونة + محتوى */}
      <div
        className="flex-grow-1 min-w-0 cursor-pointer"
        onClick={() => onJumpTo?.(currentMessage._id)}
      >
        <div
          className="d-flex align-items-center gap-1 fw-semibold"
          style={{ color: "#008069", fontSize: "0.75rem" }}
        >
          <i className="bi bi-pin-angle-fill"></i>
          {total > 1 ? (
            <span>
              {t("chat.pinnedMessagesCount", { count: total })} · {displayIndex}/{total}
            </span>
          ) : (
            <span>{t("chat.pinnedMessage")}</span>
          )}
        </div>
        <div
          className="text-muted text-truncate small"
          style={{ fontSize: "0.8rem" }}
        >
          {renderPreview()}
        </div>
      </div>

      {/* ⭐ التنقل بين المثبتات */}
      {total > 1 && (
        <div className="d-flex flex-column gap-0 flex-shrink-0">
          <Button
            variant="link"
            size="sm"
            className="p-0 text-secondary"
            style={{ lineHeight: 0.7, fontSize: "0.8rem" }}
            onClick={() => onNavigate?.(-1)}
            title={t("chat.previous")}
          >
            <i className="bi bi-chevron-up"></i>
          </Button>
          <Button
            variant="link"
            size="sm"
            className="p-0 text-secondary"
            style={{ lineHeight: 0.7, fontSize: "0.8rem" }}
            onClick={() => onNavigate?.(1)}
            title={t("chat.next")}
          >
            <i className="bi bi-chevron-down"></i>
          </Button>
        </div>
      )}

      {/* ⭐ عرض الكل */}
      <Button
        variant="link"
        size="sm"
        className="p-0 text-secondary flex-shrink-0"
        onClick={onShowAll}
        title={t("chat.showAllPinned")}
      >
        <i className="bi bi-list-ul"></i>
      </Button>
    </div>
  );
};

export default PinnedMessagesBar;