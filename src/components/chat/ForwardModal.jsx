import { useState, useEffect } from "react";
import { Modal, Form, ListGroup, Spinner } from "react-bootstrap";
import { useTranslation } from "react-i18next";
import { useAuth } from "../../hooks/useAuth";
import { conversationService } from "../../services/conversationService";
import Avatar from "../common/Avatar";
import { truncate } from "../../utils/formatters";

const ForwardModal = ({ show, onHide, message, onConfirm }) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [conversations, setConversations] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [forwarding, setForwarding] = useState(null);

  useEffect(() => {
    if (!show) {
      setSearch("");
      return;
    }

    const load = async () => {
      setLoading(true);
      try {
        const data = await conversationService.getConversations();
        setConversations(data);
      } catch (err) {
        console.error("Failed to load conversations:", err);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [show]);

  const handleSelect = async (conversationId) => {
    setForwarding(conversationId);
    try {
      await onConfirm(conversationId);
      onHide();
    } catch (err) {
      console.error("Forward failed:", err);
    } finally {
      setForwarding(null);
    }
  };

  const getDisplayName = (conv) => {
    if (conv.isGroup) return conv.name;
    const other = conv.participants.find((p) => p._id !== user?._id);
    return other?.username || "Unknown";
  };

  const getDisplayUser = (conv) => {
    if (conv.isGroup) {
      return { username: conv.name, avatar: conv.groupAvatar };
    }
    return conv.participants.find((p) => p._id !== user?._id);
  };

  const filtered = conversations.filter((conv) =>
    getDisplayName(conv).toLowerCase().includes(search.toLowerCase())
  );

  // معاينة الرسالة
  let previewContent = message?.content || "";
  if (message?.type === "image") previewContent = "📷 " + t("chat.sendImage");
  else if (message?.type === "video") previewContent = "🎥 " + t("chat.sendVideo");
  else if (message?.type === "audio") previewContent = "🎤";
  else if (message?.type === "file") previewContent = "📎";

  return (
    <Modal show={show} onHide={onHide} centered>
      <Modal.Header closeButton>
        <Modal.Title className="fs-6 fw-bold">
          {t("chat.forwardTo")}
        </Modal.Title>
      </Modal.Header>

      <Modal.Body>
        {/* ⭐ معاينة الرسالة */}
        {message && (
          <div
            className="p-2 mb-3 rounded-2 small border"
            style={{
              backgroundColor: "var(--bs-tertiary-bg)",
              borderLeft: "3px solid #008069",
            }}
          >
            <div className="text-muted" style={{ fontSize: "0.75rem" }}>
              {t("chat.forwarding")}
            </div>
            <div className="text-truncate-2">
              {truncate(previewContent, 100)}
            </div>
          </div>
        )}

        <Form.Control
          type="text"
          placeholder={t("common.search")}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="mb-3"
          autoFocus
        />

        {loading ? (
          <div className="text-center py-4">
            <Spinner animation="border" variant="success" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center text-muted py-4 small">
            {t("chat.noChats")}
          </div>
        ) : (
          <ListGroup
            variant="flush"
            style={{ maxHeight: "400px", overflowY: "auto" }}
          >
            {filtered.map((conv) => (
              <ListGroup.Item
                key={conv._id}
                className="d-flex align-items-center gap-3 cursor-pointer"
                onClick={() => handleSelect(conv._id)}
                style={{ cursor: "pointer" }}
              >
                <Avatar user={getDisplayUser(conv)} size={44} />
                <div className="flex-grow-1 min-w-0">
                  <div className="fw-semibold text-truncate">
                    {getDisplayName(conv)}
                  </div>
                  {conv.isGroup && (
                    <div className="small text-muted">
                      {conv.participants.length}{" "}
                      {t("chat.members")}
                    </div>
                  )}
                </div>
                {forwarding === conv._id && (
                  <Spinner animation="border" size="sm" variant="success" />
                )}
              </ListGroup.Item>
            ))}
          </ListGroup>
        )}
      </Modal.Body>
    </Modal>
  );
};

export default ForwardModal;