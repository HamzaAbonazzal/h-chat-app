import { useState, useEffect } from "react";
import {
  Modal,
  Form,
  Spinner,
  Alert,
  Badge,
} from "react-bootstrap";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { format, isToday, isYesterday } from "date-fns";
import { ar, enUS } from "date-fns/locale";
import { messageService } from "../../services/messageService";
import { useAuth } from "../../hooks/useAuth";
import Avatar from "../common/Avatar";
import EmptyState from "../common/EmptyState";

const GlobalSearchModal = ({ show, onHide }) => {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [total, setTotal] = useState(0);

  // ⭐ إعادة التصفير عند الإغلاق
  useEffect(() => {
    if (!show) {
      setQuery("");
      setResults([]);
      setError("");
      setTotal(0);
    }
  }, [show]);

  // ⭐ بحث مع debounce
  useEffect(() => {
    if (!query.trim() || query.trim().length < 2) {
      setResults([]);
      setTotal(0);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      setError("");
      try {
        const res = await messageService.searchAll(query.trim(), 1, 50);
        setResults(res.data || []);
        setTotal(res.pagination?.total || 0);
      } catch (err) {
        setError(err.response?.data?.message || t("common.error"));
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [query, t]);

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

  // ⭐ التنسيق
  const formatDate = (date) => {
    if (!date) return "";
    const d = new Date(date);
    const locale = i18n.language === "ar" ? ar : enUS;

    if (isToday(d)) return i18n.language === "ar" ? "اليوم" : "Today";
    if (isYesterday(d))
      return i18n.language === "ar" ? "أمس" : "Yesterday";
    return format(d, "dd MMM yyyy", { locale });
  };

  // ⭐ تمييز النص المطابق
  const highlightMatch = (text, q) => {
    if (!text || !q) return text || "";
    const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(`(${escaped})`, "gi");
    const parts = text.split(regex);
    const lowerQ = q.toLowerCase();

    return parts.map((part, i) =>
      part.toLowerCase() === lowerQ ? (
        <mark
          key={i}
          style={{
            padding: 0,
            backgroundColor: "#ffe066",
            color: "inherit",
            borderRadius: "2px",
          }}
        >
          {part}
        </mark>
      ) : (
        <span key={i}>{part}</span>
      )
    );
  };

  // ⭐ الانتقال للرسالة
  const handleGoTo = (msg) => {
    const convId = msg.conversation?._id || msg.conversation;
    onHide();
    navigate(`/chat/${convId}`, { state: { messageId: msg._id } });
  };

  return (
    <Modal show={show} onHide={onHide} centered size="lg">
      <Modal.Header closeButton>
        <Modal.Title className="fs-6 fw-bold">
          <i className="bi bi-search me-2"></i>
          {t("chat.globalSearch")}
        </Modal.Title>
      </Modal.Header>

      <Modal.Body style={{ minHeight: "300px", maxHeight: "75vh", overflowY: "auto" }}>
        {/* ⭐ حقل البحث */}
        <Form.Control
          type="text"
          placeholder={t("chat.globalSearchPlaceholder")}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="mb-3 bg-body-tertiary border-0"
          autoFocus
        />

        {/* ⭐ حالة البحث */}
        {error && (
          <Alert variant="danger" className="small">
            {error}
          </Alert>
        )}

        {loading ? (
          <div className="text-center py-4">
            <Spinner animation="border" variant="success" />
            <div className="small text-muted mt-2">{t("chat.searching")}</div>
          </div>
        ) : !query.trim() ? (
          <EmptyState
            icon="bi-search"
            title={t("chat.searchEverywhere")}
            description={t("chat.searchEverywhereDesc")}
          />
        ) : query.trim().length < 2 ? (
          <div className="text-center text-muted py-4 small">
            {t("chat.searchMinChars")}
          </div>
        ) : results.length === 0 ? (
          <EmptyState
            icon="bi-search"
            title={t("chat.noResults")}
            description=""
          />
        ) : (
          <>
            <div className="small text-muted mb-2">
              <Badge bg="success" className="me-2">
                {total}
              </Badge>
              {t("chat.searchResults")}
            </div>

            <div className="d-flex flex-column gap-2">
              {results.map((msg) => {
                const convInfo = getConversationInfo(msg.conversation);
                const dateLabel = formatDate(msg.createdAt);

                return (
                  <div
                    key={msg._id}
                    className="p-3 rounded-3 border"
                    style={{
                      cursor: "pointer",
                      backgroundColor: "var(--bs-body-bg)",
                      transition: "background-color 0.15s",
                    }}
                    onClick={() => handleGoTo(msg)}
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
                    </div>

                    <div
                      className="small"
                      style={{
                        lineHeight: 1.5,
                        wordBreak: "break-word",
                      }}
                    >
                      {highlightMatch(msg.content, query)}
                    </div>
                  </div>
                );
              })}
            </div>

            {total > results.length && (
              <div className="text-center text-muted small mt-3">
                {t("chat.showingResults", {
                  shown: results.length,
                  total,
                })}
              </div>
            )}
          </>
        )}
      </Modal.Body>
    </Modal>
  );
};

export default GlobalSearchModal;