import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { Dropdown, Button, Spinner } from "react-bootstrap";
import { useTranslation } from "react-i18next";
import { formatMessageTime, formatDuration } from "../../utils/formatters";
import { useToast } from "../../context/ToastContext";
import Avatar from "../common/Avatar";
import MessageReactions from "./MessageReactions";
import HighlightText from "./HighlightText";
import LinkPreviewCard from "./LinkPreviewCard";

const EDIT_TIME_LIMIT = 15 * 60 * 1000;
const QUICK_EMOJIS = ["❤️", "👍", "😂", "😮", "😢", "🙏"];
const PICKER_WIDTH = 240;
const PICKER_HEIGHT = 52;
const URL_REGEX = /(https?:\/\/[^\s<>"']+)/gi;
const DOUBLE_TAP_DELAY = 300;

const renderTextWithLinks = (text, highlightQuery = "") => {
  if (!text) return null;
  const parts = text.split(URL_REGEX);

  return parts.map((part, index) => {
    if (/^https?:\/\//i.test(part)) {
      return (
        <a
          key={`link-${index}`}
          href={part}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          style={{
            color: "#0d6efd",
            textDecoration: "underline",
            wordBreak: "break-all",
          }}
        >
          {part}
        </a>
      );
    }
    if (highlightQuery) {
      return (
        <HighlightText key={`text-${index}`} text={part} query={highlightQuery} />
      );
    }
    return <span key={`text-${index}`}>{part}</span>;
  });
};

const MessageBubble = ({
  message,
  isMine,
  showAvatar,
  currentUserId,
  isPinned = false,
  onDelete,
  onEdit,
  onReply,
  onForward,
  onImageClick,
  onReplyQuoteClick,
  onToggleReaction,
  onToggleStar,
  onTogglePin,
  onShowInfo,
  highlightQuery = "",
}) => {
  const { t, i18n } = useTranslation();
  const toast = useToast();

  const [imageLoaded, setImageLoaded] = useState(false);
  const [videoThumbLoaded, setVideoThumbLoaded] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editContent, setEditContent] = useState(message?.content || "");
  const [savingEdit, setSavingEdit] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [pickerCoords, setPickerCoords] = useState({ top: 0, left: 0 });

  // ⭐ Double-tap detection
  const lastTapRef = useRef(0);
  const doubleTapTimerRef = useRef(null);
  const [showHeart, setShowHeart] = useState(false);

  const editInputRef = useRef(null);
  const pickerRef = useRef(null);
  const bubbleBodyRef = useRef(null);

  useEffect(() => {
    if (editing && editInputRef.current) {
      editInputRef.current.focus();
      editInputRef.current.select();
    }
  }, [editing]);

  useEffect(() => {
    if (!showEmojiPicker) return;

    const close = () => setShowEmojiPicker(false);

    const handleClickOutside = (e) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target)) {
        if (e.target.closest(".react-trigger")) return;
        close();
      }
    };

    const handleScroll = (e) => {
      if (pickerRef.current && pickerRef.current.contains(e.target)) return;
      close();
    };

    const handleResize = () => close();

    document.addEventListener("mousedown", handleClickOutside);
    window.addEventListener("scroll", handleScroll, true);
    window.addEventListener("resize", handleResize);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      window.removeEventListener("scroll", handleScroll, true);
      window.removeEventListener("resize", handleResize);
    };
  }, [showEmojiPicker]);

  // ⭐ Cleanup double-tap timer
  useEffect(() => {
    return () => {
      clearTimeout(doubleTapTimerRef.current);
    };
  }, []);

  if (!message || !message._id || !message.sender) {
    return null;
  }

  const isPending = !!message._isPending;
  const uploadProgress = message._uploadProgress || 0;
  const displayUrl = message._localPreviewUrl || message.mediaUrl;

  const time = formatMessageTime(message.createdAt, i18n.language);
  const sender = message.sender;

  const canEdit =
    !isPending &&
    isMine &&
    message.type === "text" &&
    !message.isDeleted &&
    Date.now() - new Date(message.createdAt).getTime() < EDIT_TIME_LIMIT;

  // ⭐ Double-tap to React ❤️
  const handleDoubleTap = () => {
    if (!onToggleReaction) return;

    // ⭐ إظهار القلب
    setShowHeart(true);
    clearTimeout(doubleTapTimerRef.current);
    doubleTapTimerRef.current = setTimeout(() => setShowHeart(false), 800);

    // ⭐ إرسال التفاعل
    onToggleReaction(message._id, "❤️").catch((err) => {
      console.error("Double-tap reaction failed:", err);
    });
  };

  const handleContentClick = (e) => {
    // تجاهل النقرات على العناصر التفاعلية
    if (
      e.target.closest("button") ||
      e.target.closest("a") ||
      e.target.closest(".reply-quote") ||
      e.target.closest(".dropdown") ||
      e.target.closest(".reaction-pill")
    ) {
      return;
    }

    // لا double-tap للوسائط أو النظام
    if (isMediaMessage || message.type === "system" || message.isDeleted) {
      return;
    }

    const now = Date.now();
    const timeSinceLastTap = now - lastTapRef.current;

    if (timeSinceLastTap < DOUBLE_TAP_DELAY && timeSinceLastTap > 0) {
      // ⭐ نقرة مزدوجة
      handleDoubleTap();
      lastTapRef.current = 0;
    } else {
      // ⭐ نقرة أولى
      lastTapRef.current = now;
    }
  };

  const handleOpenPicker = () => {
    if (bubbleBodyRef.current) {
      const rect = bubbleBodyRef.current.getBoundingClientRect();

      let left;
      if (isMine) {
        left = rect.right - PICKER_WIDTH;
        if (left < 8) left = 8;
      } else {
        left = rect.left;
        if (left + PICKER_WIDTH > window.innerWidth - 8) {
          left = window.innerWidth - PICKER_WIDTH - 8;
        }
      }

      let top = rect.top - PICKER_HEIGHT - 8;
      if (top < 8) {
        top = rect.bottom + 8;
      }

      setPickerCoords({ top, left });
    }

    setShowEmojiPicker(true);
  };

  const handleStartEdit = () => {
    setEditContent(message.content || "");
    setEditing(true);
  };

  const handleCancelEdit = () => {
    setEditing(false);
    setEditContent(message.content || "");
  };

  const handleSaveEdit = async () => {
    const trimmed = editContent.trim();
    if (!trimmed || trimmed === message.content) {
      handleCancelEdit();
      return;
    }

    setSavingEdit(true);
    try {
      await onEdit?.(message._id, trimmed);
      setEditing(false);
      toast.success(t("chat.messageEdited", "تم تعديل الرسالة"));
    } catch (err) {
      const errorCode = err?.response?.data?.code;
      let messageText = err?.response?.data?.message || t("common.error");

      if (errorCode === "EDIT_TIME_EXPIRED") {
        messageText = t("errorCodes.EDIT_TIME_EXPIRED");
      }

      toast.error(messageText);
    } finally {
      setSavingEdit(false);
    }
  };

  const handleEditKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSaveEdit();
    }
    if (e.key === "Escape") {
      handleCancelEdit();
    }
  };

  const handleEmojiSelect = async (emoji) => {
    setShowEmojiPicker(false);
    try {
      await onToggleReaction?.(message._id, emoji);
    } catch (err) {
      toast.error(err?.response?.data?.message || t("common.error"));
    }
  };

  const handleDeleteClick = async (forEveryone) => {
    try {
      await onDelete?.(message._id, forEveryone);
      toast.success(t("chat.messageDeleted", "تم حذف الرسالة"));
    } catch (err) {
      toast.error(err?.response?.data?.message || t("common.error"));
    }
  };

  const handleStarClick = async () => {
    try {
      const result = await onToggleStar?.(message._id);
      if (result?.isStarred) {
        toast.success(t("chat.messageStarred", "تم حفظ الرسالة"));
      } else {
        toast.info(t("chat.messageUnstarred", "تم إلغاء الحفظ"));
      }
    } catch (err) {
      toast.error(err?.response?.data?.message || t("common.error"));
    }
  };

  const handlePinClick = async () => {
    try {
      const result = await onTogglePin?.(message._id);
      if (result?.isPinned) {
        toast.success(t("chat.messagePinned", "تم تثبيت الرسالة"));
      } else {
        toast.info(t("chat.messageUnpinned", "تم إلغاء تثبيت الرسالة"));
      }
    } catch (err) {
      const code = err?.response?.data?.code;
      const msg =
        code === "PIN_MESSAGE_LIMIT_REACHED"
          ? t("errorCodes.PIN_MESSAGE_LIMIT_REACHED")
          : err?.response?.data?.message || t("common.error");

      toast.error(msg);
    }
  };

  const handleCopyContent = () => {
    if (message.content) {
      navigator.clipboard
        .writeText(message.content)
        .then(() => toast.success(t("chat.copied", "تم النسخ")))
        .catch(() => toast.error(t("common.error")));
    }
  };

    const renderStatusIcon = () => {
    if (!isMine || message.isDeleted || isPending) return null;

    const status = message.status || "sent";

    // ⭐ Read (✓✓ زرقاء)
    if (status === "read") {
      return (
        <i
          className="bi bi-check2-all receipt-icon receipt-read"
          style={{ color: "#53bdeb" }}
        ></i>
      );
    }

    // ⭐ Delivered (✓✓ رمادية)
    if (status === "delivered") {
      return (
        <i className="bi bi-check2-all receipt-icon receipt-delivered"></i>
      );
    }

    // ⭐ Sent (✓ رمادية)
    return <i className="bi bi-check2 receipt-icon receipt-sent"></i>;
  };

  const renderReplyQuote = () => {
    if (!message.replyTo || !message.replyTo._id) return null;

    const reply = message.replyTo;
    const replySenderName =
      reply.sender?._id === sender?._id
        ? t("common.you")
        : reply.sender?.username || "Unknown";

    let previewContent = reply.content || "";
    if (reply.isDeleted) previewContent = t("message.deleted");
    else if (reply.type === "image")
      previewContent = "📷 " + t("chat.sendImage");
    else if (reply.type === "video")
      previewContent = "🎥 " + t("chat.sendVideo");
    else if (reply.type === "audio") previewContent = "🎤";
    else if (reply.type === "file") previewContent = "📎";

    return (
      <div
        className="reply-quote mb-1 px-2 py-1 rounded-2"
        onClick={(e) => {
          e.stopPropagation();
          onReplyQuoteClick?.(reply._id);
        }}
        title={t("chat.goToMessage")}
        style={{
          backgroundColor: isMine
            ? "rgba(0, 0, 0, 0.08)"
            : "rgba(0, 0, 0, 0.05)",
          borderLeft: `3px solid ${isMine ? "#008069" : "#53bdeb"}`,
          fontSize: "0.78rem",
          cursor: "pointer",
          transition: "background-color 0.15s",
        }}
      >
        <div
          className="fw-semibold"
          style={{ color: isMine ? "#008069" : "#53bdeb" }}
        >
          {replySenderName}
        </div>
        <div className="text-muted text-truncate-2">{previewContent}</div>
      </div>
    );
  };

  // ⭐ محتوى الصورة
  const renderImageContent = () => {
    return (
      <div
        className="media-bubble-wrapper position-relative"
        style={{
          borderRadius: "10px",
          overflow: "hidden",
          backgroundColor: "rgba(0, 0, 0, 0.05)",
          minWidth: "220px",
          minHeight: "160px",
          maxWidth: "320px",
        }}
        onClick={(e) => {
          if (isPending) return;
          e.stopPropagation();
          onImageClick?.(message);
        }}
      >
        {!imageLoaded && !isPending && (
          <div
            className="skeleton"
            style={{
              position: "absolute",
              inset: 0,
              zIndex: 2,
              borderRadius: "10px",
            }}
          />
        )}

        <img
          src={displayUrl}
          alt=""
          onLoad={() => setImageLoaded(true)}
          onError={() => setImageLoaded(true)}
          draggable={false}
          style={{
            display: "block",
            width: "100%",
            height: "auto",
            maxHeight: "380px",
            objectFit: "cover",
            cursor: isPending ? "default" : "pointer",
            opacity: imageLoaded && !isPending ? 1 : 0,
            transition: "opacity 0.3s ease",
          }}
        />

        {imageLoaded && !isPending && (
          <div
            className="media-overlay-icon"
            style={{
              position: "absolute",
              top: "8px",
              right: "8px",
              width: "30px",
              height: "30px",
              borderRadius: "50%",
              backgroundColor: "rgba(0, 0, 0, 0.5)",
              backdropFilter: "blur(6px)",
              color: "#fff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              opacity: 0,
              transition: "opacity 0.2s",
              pointerEvents: "none",
              fontSize: "0.75rem",
            }}
          >
            <i className="bi bi-arrows-fullscreen"></i>
          </div>
        )}

        {isPending && <ProgressOverlay progress={uploadProgress} />}
      </div>
    );
  };

  // ⭐ محتوى الفيديو
  const renderVideoContent = () => {
    return (
      <div
        className="media-bubble-wrapper video-bubble-wrapper position-relative"
        style={{
          borderRadius: "10px",
          overflow: "hidden",
          backgroundColor: "#000",
          minWidth: "240px",
          minHeight: "160px",
          maxWidth: "320px",
          cursor: isPending ? "default" : "pointer",
        }}
        onClick={(e) => {
          if (isPending) return;
          e.stopPropagation();
          onImageClick?.(message);
        }}
      >
        <video
          src={displayUrl}
          preload="metadata"
          muted
          playsInline
          onLoadedData={() => setVideoThumbLoaded(true)}
          onError={() => setVideoThumbLoaded(true)}
          style={{
            display: "block",
            width: "100%",
            height: "auto",
            maxHeight: "380px",
            objectFit: "cover",
            opacity: isPending ? 0.7 : videoThumbLoaded ? 1 : 0,
            transition: "opacity 0.3s ease, filter 0.3s ease",
            filter: isPending ? "blur(1px)" : "none",
          }}
        />

        {!videoThumbLoaded && !isPending && (
          <div
            className="skeleton"
            style={{
              position: "absolute",
              inset: 0,
              zIndex: 2,
              borderRadius: "10px",
            }}
          />
        )}

        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "linear-gradient(to bottom, transparent 50%, rgba(0,0,0,0.4))",
            pointerEvents: "none",
          }}
        />

        {!isPending && (
          <div
            className="video-play-button"
            style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              width: "68px",
              height: "68px",
              borderRadius: "50%",
              backgroundColor: "rgba(0, 0, 0, 0.55)",
              backdropFilter: "blur(8px)",
              border: "2px solid rgba(255, 255, 255, 0.4)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#fff",
              fontSize: "1.8rem",
              pointerEvents: "none",
              transition: "all 0.25s ease",
            }}
          >
            <i className="bi bi-play-fill" style={{ marginLeft: "5px" }}></i>
          </div>
        )}

        {!isPending && message.duration > 0 && (
          <div
            style={{
              position: "absolute",
              bottom: "10px",
              left: "10px",
              padding: "3px 9px",
              borderRadius: "12px",
              backgroundColor: "rgba(0, 0, 0, 0.75)",
              backdropFilter: "blur(4px)",
              color: "#fff",
              fontSize: "0.72rem",
              fontWeight: 600,
              display: "flex",
              alignItems: "center",
              gap: "4px",
              pointerEvents: "none",
            }}
          >
            <i
              className="bi bi-camera-video-fill"
              style={{ fontSize: "0.65rem" }}
            ></i>
            {formatDuration(message.duration)}
          </div>
        )}

        {!isPending && videoThumbLoaded && (
          <div
            className="media-overlay-icon"
            style={{
              position: "absolute",
              top: "8px",
              right: "8px",
              width: "30px",
              height: "30px",
              borderRadius: "50%",
              backgroundColor: "rgba(0, 0, 0, 0.5)",
              backdropFilter: "blur(6px)",
              color: "#fff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              opacity: 0,
              transition: "opacity 0.2s",
              pointerEvents: "none",
              fontSize: "0.75rem",
            }}
          >
            <i className="bi bi-arrows-fullscreen"></i>
          </div>
        )}

        {isPending && <ProgressOverlay progress={uploadProgress} />}
      </div>
    );
  };

  const renderContent = () => {
    if (message.isDeleted) {
      return (
        <em className="text-muted small">
          <i className="bi bi-slash-circle me-1"></i>
          {t("message.deleted")}
        </em>
      );
    }

    if (editing) {
      return (
        <div style={{ minWidth: "220px" }}>
          <textarea
            ref={editInputRef}
            className="form-control form-control-sm mb-2"
            rows={2}
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
            onKeyDown={handleEditKeyDown}
            disabled={savingEdit}
            style={{ resize: "none", fontSize: "0.9rem" }}
          />
          <div className="d-flex justify-content-end gap-2">
            <Button
              size="sm"
              variant="outline-secondary"
              onClick={handleCancelEdit}
              disabled={savingEdit}
              className="py-0 px-2"
            >
              <i className="bi bi-x-lg"></i>
            </Button>
            <Button
              size="sm"
              variant="success"
              onClick={handleSaveEdit}
              disabled={savingEdit}
              className="py-0 px-2"
            >
              {savingEdit ? (
                <Spinner animation="border" size="sm" />
              ) : (
                <i className="bi bi-check-lg"></i>
              )}
            </Button>
          </div>
        </div>
      );
    }

    switch (message.type) {
      case "image":
        return renderImageContent();
      case "video":
        return renderVideoContent();
      case "audio":
        return (
          <div className="position-relative" style={{ minWidth: "220px" }}>
            <div className="d-flex align-items-center gap-2">
              <i
                className="bi bi-mic-fill text-success"
                style={{ fontSize: "1.2rem" }}
              ></i>
              <audio
                controls
                src={displayUrl}
                style={{
                  height: "36px",
                  flex: 1,
                  maxWidth: "240px",
                  opacity: isPending ? 0.7 : 1,
                }}
              >
                Your browser does not support audio.
              </audio>
            </div>
            {isPending && <ProgressOverlay progress={uploadProgress} small />}
          </div>
        );
      default:
        return (
          <div>
            <div style={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
              {renderTextWithLinks(message.content, highlightQuery)}
            </div>
            {message.linkPreview?.url && !message.isDeleted && (
              <div className="mt-2">
                <LinkPreviewCard preview={message.linkPreview} />
              </div>
            )}
          </div>
        );
    }
  };

  const isMediaMessage = message.type === "image" || message.type === "video";

  // ⭐ موضع زر الفتح (Chevron) — دائماً خارج الفقاعة
  const dropdownPositionStyle = {
    top: "4px",
    [isMine ? "right" : "left"]: "-30px",
  };

  return (
    <>
      <div
        className={`d-flex flex-column mb-2 ${
          isMine ? "align-items-end" : "align-items-start"
        }`}
        data-message-id={message._id}
        style={{
          scrollMarginTop: "20px",
          scrollMarginBottom: "20px",
          opacity: isPending ? 0.95 : 1,
        }}
      >
        <div
          className={`d-flex ${isMine ? "justify-content-end" : "justify-content-start"} w-100`}
          style={{
            paddingLeft: isMine ? "40px" : 0,
            paddingRight: isMine ? 0 : "40px",
          }}
        >
          {!isMine && showAvatar && (
            <div className="me-2 align-self-end">
              <Avatar user={sender} size={30} />
            </div>
          )}

          {!isMine && !showAvatar && (
            <div style={{ width: "30px", marginRight: "8px" }} />
          )}

          <div className="position-relative" style={{ maxWidth: "70%" }}>
            <div
              ref={bubbleBodyRef}
              className={`shadow-sm position-relative message-bubble-body ${
                isMediaMessage ? "p-1" : "px-3 py-2"
              }`}
              onClick={handleContentClick}
              style={{
                backgroundColor: isMine
                  ? "var(--message-out)"
                  : "var(--message-in)",
                color: "var(--bs-body-color)",
                borderRadius: isMediaMessage ? "12px" : "8px",
                borderTopLeftRadius: !isMine && showAvatar
                  ? "2px"
                  : isMediaMessage
                  ? "12px"
                  : "8px",
                borderTopRightRadius: isMine
                  ? "2px"
                  : isMediaMessage
                  ? "12px"
                  : "8px",
                transition: "box-shadow 0.3s ease",
                overflow: "hidden",
              }}
            >
              {message.isForwarded && !message.isDeleted && !isPending && (
                <div
                  className={`d-flex align-items-center gap-1 text-muted ${
                    isMediaMessage ? "px-2 pt-1" : "mb-1"
                  }`}
                  style={{ fontSize: "0.72rem", fontStyle: "italic" }}
                >
                  <i className="bi bi-arrow-return-right"></i>
                  {t("chat.forwarded")}
                </div>
              )}

              {!message.isDeleted &&
                !editing &&
                !isPending &&
                !isMediaMessage &&
                renderReplyQuote()}

              {renderContent()}

              {!editing && !isPending && (
                <div
                  className={`d-flex align-items-center justify-content-end gap-1 ${
                    isMediaMessage
                      ? "position-absolute px-2 py-1 rounded-pill"
                      : "mt-1"
                  }`}
                  style={{
                    fontSize: "0.7rem",
                    color: isMediaMessage
                      ? "#fff"
                      : isMine
                      ? "rgba(0, 0, 0, 0.5)"
                      : "var(--bs-secondary-color)",
                    opacity: isMine && !isMediaMessage ? 0.8 : 1,
                    ...(isMediaMessage && {
                      bottom: "10px",
                      right: "10px",
                      backgroundColor: "rgba(0, 0, 0, 0.55)",
                      backdropFilter: "blur(4px)",
                    }),
                  }}
                >
                  {isPinned && (
                    <i
                      className="bi bi-pin-angle-fill"
                      style={{
                        fontSize: "0.65rem",
                        color: isMediaMessage ? "#fff" : "#008069",
                      }}
                    ></i>
                  )}
                  {message.isStarred && (
                    <i
                      className="bi bi-star-fill"
                      style={{ fontSize: "0.65rem", color: "#ffc107" }}
                    ></i>
                  )}
                  {message.expiresAt && (
                    <i
                      className="bi bi-clock-history"
                      style={{ fontSize: "0.65rem" }}
                    ></i>
                  )}
                  {message.editedAt && (
                    <span style={{ fontStyle: "italic", marginRight: "4px" }}>
                      {t("message.edited")}
                    </span>
                  )}
                  <span>{time}</span>
                  {renderStatusIcon()}
                </div>
              )}

              {isPending && isMediaMessage && (
                <div
                  className="d-flex align-items-center gap-1 px-2 py-1 position-absolute"
                  style={{
                    top: "8px",
                    left: "8px",
                    backgroundColor: "rgba(0, 0, 0, 0.6)",
                    backdropFilter: "blur(4px)",
                    borderRadius: "12px",
                    color: "#fff",
                    fontSize: "0.7rem",
                  }}
                >
                  <i className="bi bi-cloud-arrow-up-fill"></i>
                  <span>{t("upload.uploading") || "جارٍ الرفع..."}</span>
                </div>
              )}

              {/* ⭐ Heart Animation on Double-tap */}
              {showHeart && (
                <div
                  className="double-tap-heart"
                  style={{
                    position: "absolute",
                    top: "50%",
                    left: "50%",
                    transform: "translate(-50%, -50%)",
                    fontSize: "5rem",
                    pointerEvents: "none",
                    zIndex: 10,
                    filter: "drop-shadow(0 4px 12px rgba(220, 20, 60, 0.5))",
                  }}
                >
                  ❤️
                </div>
              )}
            </div>

            {/* ⭐ زر الفتح (Chevron) — مرئي للوسائط والنصوص */}
            {!message.isDeleted && !editing && !isPending && (
              <Dropdown
                align={isMine ? "start" : "end"}
                className="position-absolute"
                style={dropdownPositionStyle}
              >
                <Dropdown.Toggle
                  as="button"
                  className="msg-menu-toggle"
                  style={{
                    border: "none",
                    padding: 0,
                    width: "24px",
                    height: "24px",
                    borderRadius: "50%",
                    backgroundColor: "transparent",
                    color: "var(--bs-secondary-color)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: "pointer",
                    transition: "all 0.2s ease",
                  }}
                  title={t("chat.options", "خيارات")}
                >
                  <i className="bi bi-chevron-down"></i>
                </Dropdown.Toggle>

                <Dropdown.Menu size="sm">
                  <Dropdown.Item
                    className="react-trigger"
                    onClick={handleOpenPicker}
                  >
                    <i className="bi bi-emoji-smile me-2"></i>
                    {t("chat.react")}
                  </Dropdown.Item>

                  <Dropdown.Divider />

                  <Dropdown.Item onClick={() => onReply?.(message)}>
                    <i className="bi bi-reply me-2"></i>
                    {t("chat.reply")}
                  </Dropdown.Item>

                  <Dropdown.Item onClick={() => onForward?.(message)}>
                    <i className="bi bi-arrow-return-right me-2"></i>
                    {t("chat.forward")}
                  </Dropdown.Item>

                  {message.type === "text" && message.content && (
                    <Dropdown.Item onClick={handleCopyContent}>
                      <i className="bi bi-clipboard me-2"></i>
                      {t("chat.copy")}
                    </Dropdown.Item>
                  )}

                  <Dropdown.Item onClick={handleStarClick}>
                    <i
                      className={`bi ${
                        message.isStarred
                          ? "bi-star-fill text-warning"
                          : "bi-star"
                      } me-2`}
                    ></i>
                    {message.isStarred ? t("chat.unstar") : t("chat.star")}
                  </Dropdown.Item>

                  <Dropdown.Item onClick={handlePinClick}>
                    <i
                      className={`bi ${
                        isPinned
                          ? "bi-pin-angle-fill text-success"
                          : "bi-pin-angle"
                      } me-2`}
                    ></i>
                    {isPinned
                      ? t("chat.unpinMessage")
                      : t("chat.pinMessage")}
                  </Dropdown.Item>

                  {canEdit && (
                    <Dropdown.Item onClick={handleStartEdit}>
                      <i className="bi bi-pencil me-2"></i>
                      {t("chat.editMessage")}
                    </Dropdown.Item>
                  )}

                  {isMine && (
                    <Dropdown.Item onClick={() => onShowInfo?.(message)}>
                      <i className="bi bi-info-circle me-2"></i>
                      {t("chat.messageInfo")}
                    </Dropdown.Item>
                  )}

                  <Dropdown.Divider />

                  {isMine && (
                    <Dropdown.Item
                      className="text-danger"
                      onClick={() => handleDeleteClick(true)}
                    >
                      <i className="bi bi-trash me-2"></i>
                      {t("chat.deleteForEveryone")}
                    </Dropdown.Item>
                  )}

                  <Dropdown.Item
                    className="text-danger"
                    onClick={() => handleDeleteClick(false)}
                  >
                    <i className="bi bi-eye-slash me-2"></i>
                    {t("chat.deleteForMe")}
                  </Dropdown.Item>
                </Dropdown.Menu>
              </Dropdown>
            )}
          </div>
        </div>

        {!message.isDeleted && !isPending && message.reactions?.length > 0 && (
          <div
            style={{
              paddingLeft: isMine ? 0 : "38px",
              paddingRight: isMine ? "40px" : 0,
              maxWidth: "70%",
              marginTop: "-4px",
              zIndex: 2,
            }}
          >
            <MessageReactions
              reactions={message.reactions}
              currentUserId={currentUserId}
              isMine={isMine}
              onToggleReaction={(emoji) =>
                onToggleReaction?.(message._id, emoji)
              }
            />
          </div>
        )}

        {showEmojiPicker &&
          createPortal(
            <div
              ref={pickerRef}
              className="emoji-picker-popover"
              style={{
                position: "fixed",
                top: pickerCoords.top,
                left: pickerCoords.left,
                zIndex: 9999,
                background: "var(--bs-body-bg)",
                border: "1px solid var(--bs-border-color)",
                borderRadius: "24px",
                padding: "4px 6px",
                boxShadow: "0 6px 20px rgba(0,0,0,0.25)",
                display: "flex",
                gap: "2px",
                width: `${PICKER_WIDTH}px`,
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              {QUICK_EMOJIS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => handleEmojiSelect(emoji)}
                  className="emoji-picker-btn"
                  style={{
                    background: "transparent",
                    border: "none",
                    fontSize: "1.3rem",
                    padding: "4px 4px",
                    borderRadius: "50%",
                    cursor: "pointer",
                    lineHeight: 1,
                  }}
                >
                  {emoji}
                </button>
              ))}
            </div>,
            document.body
          )}
      </div>
    </>
  );
};

/**
 * ⭐ ProgressOverlay دائري أنيق
 */
const ProgressOverlay = ({ progress = 0, small = false }) => {
  const size = small ? 40 : 64;
  const radius = small ? 15 : 24;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "rgba(0, 0, 0, 0.45)",
        borderRadius: "10px",
        pointerEvents: "none",
        zIndex: 5,
      }}
    >
      <div
        style={{
          position: "relative",
          width: `${size}px`,
          height: `${size}px`,
        }}
      >
        <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="rgba(255, 255, 255, 0.25)"
            strokeWidth={small ? 2.5 : 3}
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="#fff"
            strokeWidth={small ? 2.5 : 3}
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            style={{ transition: "stroke-dashoffset 0.3s ease" }}
          />
        </svg>

        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#fff",
            fontSize: small ? "0.7rem" : "0.85rem",
            fontWeight: 600,
          }}
        >
          {Math.round(progress)}%
        </div>
      </div>
    </div>
  );
};

export default MessageBubble;