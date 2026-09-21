import { useState, useEffect } from "react";
import { Modal, Form, ListGroup, Spinner, Button } from "react-bootstrap";
import { useTranslation } from "react-i18next";
import { userService } from "../../services/userService";
import { conversationService } from "../../services/conversationService";
import Avatar from "../common/Avatar";

const NewChatModal = ({ show, onHide, onConversationCreated }) => {
  const { t } = useTranslation();
  const [search, setSearch] = useState("");
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(null);

  useEffect(() => {
    if (!show) {
      setSearch("");
      setUsers([]);
      return;
    }

    const load = async () => {
      setLoading(true);
      try {
        const data = await userService.searchUsers(search);
        setUsers(data);
      } catch (err) {
        console.error("Search failed:", err);
      } finally {
        setLoading(false);
      }
    };

    const timer = setTimeout(load, 300);
    return () => clearTimeout(timer);
  }, [search, show]);

  const handleSelectUser = async (userId) => {
    setCreating(userId);
    try {
      const conversation =
        await conversationService.createOrGetConversation(userId);
      onConversationCreated?.(conversation);
      onHide();
    } catch (err) {
      console.error("Failed to create conversation:", err);
    } finally {
      setCreating(null);
    }
  };

  return (
    <Modal show={show} onHide={onHide} centered>
      <Modal.Header closeButton>
        <Modal.Title className="fs-6 fw-bold">{t("chat.newChat")}</Modal.Title>
      </Modal.Header>

      <Modal.Body>
        <Form.Control
          type="text"
          placeholder={t("chat.searchUsersPlaceholder")}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          autoFocus
          className="mb-3"
        />

        {loading ? (
          <div className="text-center py-4">
            <Spinner animation="border" variant="success" />
          </div>
        ) : users.length === 0 ? (
          <div className="text-center text-muted py-4 small">
            {search ? "No users found" : "Start typing to search"}
          </div>
        ) : (
          <ListGroup
            variant="flush"
            style={{ maxHeight: "400px", overflowY: "auto" }}
          >
            {users.map((u) => (
              <ListGroup.Item
                key={u._id}
                className="d-flex align-items-center gap-3 cursor-pointer"
                onClick={() => handleSelectUser(u._id)}
                style={{ cursor: "pointer" }}
              >
                <Avatar user={u} size={44} showOnline isOnline={u.isOnline} />
                <div className="flex-grow-1 min-w-0">
                  <div className="fw-semibold text-truncate">{u.username}</div>
                  <div className="small text-muted text-truncate">
                    {u.bio || ""}
                  </div>
                </div>
                {creating === u._id && (
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

export default NewChatModal;
