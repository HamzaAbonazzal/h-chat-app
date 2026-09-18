import { useState, useRef, useEffect } from "react";
import { Button, Spinner } from "react-bootstrap";
import { useTranslation } from "react-i18next";
import { MESSAGE_TYPES } from "../../utils/constants";
import { translateError } from "../../utils/errorTranslator";
import { linkService, extractFirstUrl } from "../../services/linkService";
import LinkPreviewCard from "./LinkPreviewCard";
import AlertModal from "../common/AlertModal";

const MessageInput = ({
  onSendText,
  onSendMedia,
  onTyping,
  onStopTyping,
  disabled = false,
  replyingTo = null,
  onCancelReply,
  conversationId,
}) => {
  const { t } = useTranslation();
  const [text, setText] = useState("");
  const [sendingText, setSendingText] = useState(false);
  const [recording, setRecording] = useState(false);
  const [recordDuration, setRecordDuration] = useState(0);

  const [linkPreview, setLinkPreview] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewDismissed, setPreviewDismissed] = useState(false);

  const [alertState, setAlertState] = useState({
    show: false,
    title: "",
    message: "",
    variant: "danger",
    icon: "bi-exclamation-triangle",
  });

  const inputRef = useRef(null);
  const fileInputRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const recordTimerRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const previewTimeoutRef = useRef(null);
  const lastPreviewUrlRef = useRef(null);

  useEffect(() => {
    setText("");
    setLinkPreview(null);
    setPreviewDismissed(false);
    lastPreviewUrlRef.current = null;
  }, [conversationId]);

  useEffect(() => {
    if (replyingTo && inputRef.current) {
      inputRef.current.focus();
    }
  }, [replyingTo]);

  // ⭐ كشف الرابط
  useEffect(() => {
    const url = extractFirstUrl(text);

    if (!url) {
      setLinkPreview(null);
      lastPreviewUrlRef.current = null;
      return;
    }

    if (url === lastPreviewUrlRef.current) return;
    if (previewDismissed) return;

    if (previewTimeoutRef.current) clearTimeout(previewTimeoutRef.current);

    previewTimeoutRef.current = setTimeout(async () => {
      setPreviewLoading(true);
      try {
        const data = await linkService.getPreview(url);
        lastPreviewUrlRef.current = url;
        setLinkPreview(data || null);
      } catch (err) {
        console.error("Preview fetch failed:", err);
        setLinkPreview(null);
      } finally {
        setPreviewLoading(false);
      }
    }, 800);

    return () => {
      if (previewTimeoutRef.current) clearTimeout(previewTimeoutRef.current);
    };
  }, [text, previewDismissed]);

  const showAlert = (title, message, variant = "danger", icon) => {
    setAlertState({
      show: true,
      title,
      message,
      variant,
      icon:
        icon ||
        (variant === "success"
          ? "bi-check-circle"
          : "bi-exclamation-triangle"),
    });
  };

  const closeAlert = () =>
    setAlertState((prev) => ({ ...prev, show: false }));

  // ⭐ إرسال نص
  const handleSubmit = async (e) => {
    e?.preventDefault();
    if (!text.trim() || sendingText || disabled) return;

    setSendingText(true);
    const content = text.trim();
    const previewToSend = linkPreview;

    setText("");
    setLinkPreview(null);
    setPreviewDismissed(false);
    lastPreviewUrlRef.current = null;

    try {
      await onSendText(content, {
        replyToId: replyingTo?._id || null,
        linkPreview: previewToSend,
      });
      onStopTyping?.();
      onCancelReply?.();
    } catch (err) {
      setText(content);
      setLinkPreview(previewToSend);
      const errorMessage = translateError(err, t);
      showAlert(
        t("errors.sendFailed"),
        errorMessage,
        "danger",
        "bi-slash-circle"
      );
    } finally {
      setSendingText(false);
      inputRef.current?.focus();
    }
  };

  const handleTextChange = (e) => {
    setText(e.target.value);
    onTyping?.();

    clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      onStopTyping?.();
    }, 2000);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
    if (e.key === "Escape" && replyingTo) {
      onCancelReply?.();
    }
  };

  // ⭐ إرسال ملف
  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    let type = MESSAGE_TYPES.FILE;
    if (file.type.startsWith("image/")) type = MESSAGE_TYPES.IMAGE;
    else if (file.type.startsWith("video/")) type = MESSAGE_TYPES.VIDEO;

    try {
      await onSendMedia(file, type, 0, {
        replyToId: replyingTo?._id || null,
      });
      onCancelReply?.();
    } catch (err) {
      const errorMessage = translateError(err, t);
      showAlert(
        t("errors.uploadFailed"),
        errorMessage,
        "danger",
        "bi-cloud-slash"
      );
    } finally {
      e.target.value = "";
      inputRef.current?.focus();
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      audioChunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        const blob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        const file = new File([blob], `voice-${Date.now()}.webm`, {
          type: "audio/webm",
        });

        try {
          await onSendMedia(file, MESSAGE_TYPES.AUDIO, recordDuration, {
            replyToId: replyingTo?._id || null,
          });
          onCancelReply?.();
        } catch (err) {
          const errorMessage = translateError(err, t);
          showAlert(
            t("errors.recordFailed"),
            errorMessage,
            "danger",
            "bi-mic-mute"
          );
        } finally {
          stream.getTracks().forEach((t) => t.stop());
        }
      };

      recorder.start();
      mediaRecorderRef.current = recorder;
      setRecording(true);
      setRecordDuration(0);

      recordTimerRef.current = setInterval(() => {
        setRecordDuration((d) => d + 1);
      }, 1000);
    } catch (err) {
      showAlert(
        t("errors.micDenied"),
        t("errors.micDeniedDesc"),
        "warning",
        "bi-mic-mute"
      );
    }
  };

  const stopRecording = (cancel = false) => {
    if (mediaRecorderRef.current && recording) {
      if (cancel) {
        mediaRecorderRef.current.onstop = null;
        mediaRecorderRef.current.stream?.getTracks().forEach((t) => t.stop());
      }
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current = null;
    }
    clearInterval(recordTimerRef.current);
    setRecording(false);
    setRecordDuration(0);
  };

  useEffect(() => {
    return () => {
      clearTimeout(typingTimeoutRef.current);
      clearInterval(recordTimerRef.current);
      clearTimeout(previewTimeoutRef.current);
    };
  }, []);

  const formatTime = (secs) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  // ⭐ شريط الرد
  const renderReplyPreview = () => {
    if (!replyingTo) return null;

    let previewContent = replyingTo.content;
    if (replyingTo.isDeleted) previewContent = t("message.deleted");
    else if (replyingTo.type === "image")
      previewContent = "📷 " + t("chat.sendImage");
    else if (replyingTo.type === "video")
      previewContent = "🎥 " + t("chat.sendVideo");
    else if (replyingTo.type === "audio") previewContent = "🎤";
    else if (replyingTo.type === "file") previewContent = "📎";

    return (
      <div className="reply-preview-bar">
        <div className="reply-preview-inner">
          <div className="reply-preview-accent" />

          <div className="reply-preview-content">
            <div className="reply-preview-header">
              <i className="bi bi-reply-fill" />
              <span className="reply-preview-username">
                {replyingTo.sender?.username}
              </span>
            </div>
            <div className="reply-preview-text">{previewContent}</div>
          </div>

          <Button
            variant="link"
            className="reply-preview-close"
            onClick={onCancelReply}
            title={t("common.cancel")}
          >
            <i className="bi bi-x-lg"></i>
          </Button>
        </div>
      </div>
    );
  };

  const renderLinkPreview = () => {
    if (!linkPreview && !previewLoading) return null;

    return (
      <div className="px-2 pt-2" style={{ backgroundColor: "var(--bs-body-bg)" }}>
        {previewLoading ? (
          <div
            className="d-flex align-items-center gap-2 px-3 py-2 border rounded"
            style={{ backgroundColor: "var(--bs-tertiary-bg)" }}
          >
            <Spinner animation="border" size="sm" variant="success" />
            <span className="small text-muted">{t("chat.loadingPreview")}</span>
          </div>
        ) : linkPreview ? (
          <LinkPreviewCard
            preview={linkPreview}
            onRemove={() => {
              setLinkPreview(null);
              setPreviewDismissed(true);
              lastPreviewUrlRef.current = extractFirstUrl(text);
            }}
            isCompact={true}
            clickable={false}
          />
        ) : null}
      </div>
    );
  };

  if (recording) {
    return (
      <>
        <div
          className="border-top p-3 d-flex align-items-center gap-3"
          style={{ backgroundColor: "var(--bs-body-bg)" }}
        >
          <Button
            variant="outline-danger"
            size="sm"
            onClick={() => stopRecording(true)}
            title="إلغاء"
          >
            <i className="bi bi-trash"></i>
          </Button>

          <div className="flex-grow-1 d-flex align-items-center gap-2">
            <span
              className="text-danger"
              style={{ animation: "pulse 1s infinite" }}
            >
              <i className="bi bi-record-circle-fill"></i>
            </span>
            <span className="fw-semibold">{formatTime(recordDuration)}</span>
            <div
              className="flex-grow-1"
              style={{
                height: "4px",
                background: "var(--bs-tertiary-bg)",
                borderRadius: "2px",
              }}
            >
              <div
                className="bg-danger h-100"
                style={{
                  width: `${Math.min((recordDuration / 60) * 100, 100)}%`,
                  borderRadius: "2px",
                  transition: "width 0.3s",
                }}
              ></div>
            </div>
            <span className="text-muted small">{t("chat.recording")}</span>
          </div>

          <Button
            variant="success"
            onClick={() => stopRecording(false)}
            disabled={recordDuration < 1}
          >
            <i className="bi bi-send-fill"></i>
          </Button>
        </div>

        <AlertModal {...alertState} onHide={closeAlert} />
      </>
    );
  }

  return (
    <>
      {renderReplyPreview()}
      {renderLinkPreview()}

      <div
        className={`p-2 ${!linkPreview && !previewLoading ? "border-top" : ""}`}
        style={{ backgroundColor: "var(--bs-body-bg)" }}
      >
        <form onSubmit={handleSubmit} className="d-flex align-items-end gap-2">
          <Button
            variant="link"
            className="text-secondary p-2 text-decoration-none"
            onClick={() => fileInputRef.current?.click()}
            disabled={disabled}
            title={t("chat.attachFile")}
          >
            <i className="bi bi-paperclip fs-5"></i>
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,video/*,audio/*,.pdf,.doc,.docx"
            hidden
            onChange={handleFileSelect}
          />

          <textarea
            ref={inputRef}
            className="form-control border-0 bg-body-tertiary"
            placeholder={t("chat.typeMessage")}
            value={text}
            onChange={handleTextChange}
            onKeyDown={handleKeyDown}
            rows={1}
            disabled={disabled}
            style={{
              resize: "none",
              maxHeight: "120px",
              minHeight: "40px",
              padding: "10px 12px",
              borderRadius: "20px",
            }}
          />

          {text.trim() ? (
            <Button
              type="submit"
              variant="success"
              className="rounded-circle p-0 d-flex align-items-center justify-content-center flex-shrink-0"
              style={{ width: "42px", height: "42px" }}
              disabled={sendingText || disabled}
            >
              {sendingText ? (
                <Spinner animation="border" size="sm" />
              ) : (
                <i className="bi bi-send-fill"></i>
              )}
            </Button>
          ) : (
            <Button
              variant="success"
              className="rounded-circle p-0 d-flex align-items-center justify-content-center flex-shrink-0"
              style={{ width: "42px", height: "42px" }}
              onClick={startRecording}
              disabled={disabled}
              title={t("chat.recordVoice")}
            >
              <i className="bi bi-mic-fill"></i>
            </Button>
          )}
        </form>
      </div>

      <AlertModal {...alertState} onHide={closeAlert} />
    </>
  );
};

export default MessageInput;