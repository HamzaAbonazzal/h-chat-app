import { useState, useEffect } from "react";
import { Modal, Spinner, Alert, Form, Badge } from "react-bootstrap";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { messageService } from "../../services/messageService";
import { useAuth } from "../../hooks/useAuth";
import Avatar from "../common/Avatar";
import EmptyState from "../common/EmptyState";
import { format, isToday, isYesterday } from "date-fns";
import { ar, enUS } from "date-fns/locale";

const StarredMessagesModal = ({ show, onHide }) => {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!show) {
      setMessages([]);
      setSearch("");
      setError("");
      return;
    }

    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const res = await messageService.getStarredMessages(1, 100);
        setMessages(res.data || []);
      } catch (err) {
        setError(err.response?.data?.message || t("common.error"));
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [show]);

  // ⭐ فلترة محلية
  const filtered = search.trim()
    ? messages.filter((m) =>
        (m.content || "").toLowerCase().includes(search.toLowerCase())
      )
    : messages;

  // ⭐ اسم المحادثة
  const getConversationInfo = (conv) => {
    if (!conv) return { name: "?", avatar: "" };
    if (conv.isGroup) {
      return { name: conv.name, avatar: conv.groupAvatar };
    }
    const other = conv.participants?.find((p) => p._id !== user?._id);
    return {
      name: other?.username || "Unknown",
      avatar: other?.avatar || "",
    };
  };

  // ⭐ التاريخ
  const formatDate = (date) => {
    if (!date) return "";
    const d = new Date(date);
    const locale = i18n.language === "ar" ? ar : enUS;

    if (isToday(d)) return i18n.language === "ar" ? "اليوم" : "Today";
    if (isYesterday(d)) return i18n.language === "ar" ? "أمس" : "Yesterday";
    return format(d, "dd MMM yyyy", { locale });
  };

  // ⭐ معاينة المحتوى
  const renderPreview = (msg) => {
    if (msg.type === "image") return "📷 " + t("chat.sendImage");
    if (msg.type === "video") return "🎥 " + t("chat.sendVideo");
    if (msg.type === "audio") return "🎤 " + t("chat.recordVoice");
    if (msg.type === "file") return "📎 " + t("chat.attachFile");
    return msg.content || "";
  };

  // ⭐ الانتقال للرسالة
  const handleGoToMessage = (msg) => {
    const convId = msg.conversation?._id || msg.conversation;
    onHide();
    navigate(`/chat/${convId}`, { state: { messageId: msg._id } });
  };

  return (
    <Modal show={show} onHide={onHide} centered size="lg">
      <Modal.Header closeButton>
        <Modal.Title className="fs-6 fw-bold">
          <i className="bi bi-star-fill text-warning me-2"></i>
          {t("chat.starredMessages")}
          {messages.length > 0 && (
            <Badge bg="secondary" className="ms-2" style={{ fontSize: "0.7rem" }}>
              {messages.length}
            </Badge>
          )}
        </Modal.Title>
      </Modal.Header>

      <Modal.Body style={{ maxHeight: "75vh", overflowY: "auto" }}>
        {loading ? (
          <div className="text-center py-5">
            <Spinner animation="border" variant="success" />
          </div>
        ) : error ? (
          <Alert variant="danger" className="small">
            {error}
          </Alert>
        ) : messages.length === 0 ? (
          <EmptyState
            icon="bi-star"
            title={t("chat.noStarredMessages")}
            description={t("chat.noStarredDesc")}
          />
        ) : (
          <>
            {/* ⭐ بحث */}
            <Form.Control
              type="text"
              placeholder={t("common.search")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="mb-3 bg-body-tertiary border-0"
            />

            {filtered.length === 0 ? (
              <div className="text-center text-muted py-4 small">
                {t("chat.noResults")}
              </div>
            ) : (
              <div className="d-flex flex-column gap-2">
                {filtered.map((msg) => {
                  const convInfo = getConversationInfo(msg.conversation);
                  const dateLabel = formatDate(msg.updatedAt);

                  return (
                    <div
                      key={msg._id}
                      className="p-3 rounded-3 border"
                      style={{
                        cursor: "pointer",
                        backgroundColor: "var(--bs-body-bg)",
                        transition: "background-color 0.15s",
                      }}
                      onClick={() => handleGoToMessage(msg)}
                      onMouseEnter={(e) =>
                        (e.currentTarget.style.backgroundColor =
                          "var(--bs-tertiary-bg)")
                      }
                      onMouseLeave={(e) =>
                        (e.currentTarget.style.backgroundColor =
                          "var(--bs-body-bg)")
                      }
                    >
                      <div className="d-flex align-items-center gap-2 mb-2">
                        <Avatar user={convInfo} size={32} />
                        <div className="flex-grow-1 min-w-0">
                          <div className="fw-semibold small text-truncate">
                            {convInfo.name}
                          </div>
                          <div
                            className="text-muted"
                            style={{ fontSize: "0.7rem" }}
                          >
                            <i className="bi bi-person me-1"></i>
                            {msg.sender?.username} · {dateLabel}
                          </div>
                        </div>
                        <i
                          className="bi bi-star-fill text-warning"
                          style={{ fontSize: "0.9rem" }}
                        ></i>
                      </div>

                      <div
                        className="small"
                        style={{ lineHeight: 1.5, wordBreak: "break-word" }}
                      >
                        {renderPreview(msg)}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </Modal.Body>
    </Modal>
  );
};

export default StarredMessagesModal;