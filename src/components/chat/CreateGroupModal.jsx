import { useState, useEffect } from "react";
import { Modal, Form, ListGroup, Button, Spinner, Badge } from "react-bootstrap";
import { useTranslation } from "react-i18next";
import { userService } from "../../services/userService";
import { conversationService } from "../../services/conversationService";
import Avatar from "../common/Avatar";

const CreateGroupModal = ({ show, onHide, onGroupCreated }) => {
  const { t } = useTranslation();
  const [step, setStep] = useState(1); // 1: اختيار الأعضاء، 2: الاسم والصورة
  const [search, setSearch] = useState("");
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [groupName, setGroupName] = useState("");

  useEffect(() => {
    if (!show) {
      setStep(1);
      setSearch("");
      setUsers([]);
      setSelectedUsers([]);
      setGroupName("");
    }
  }, [show]);

  useEffect(() => {
    if (!show) return;

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

  const toggleUser = (user) => {
    setSelectedUsers((prev) =>
      prev.some((u) => u._id === user._id)
        ? prev.filter((u) => u._id !== user._id)
        : [...prev, user]
    );
  };

  const handleCreate = async () => {
    if (!groupName.trim() || selectedUsers.length === 0) return;

    setCreating(true);
    try {
      const userIds = selectedUsers.map((u) => u._id);
      const group = await conversationService.createGroup(
        userIds,
        groupName.trim()
      );
      onGroupCreated?.(group);
      onHide();
    } catch (err) {
      console.error("Failed to create group:", err);
    } finally {
      setCreating(false);
    }
  };

  return (
    <Modal show={show} onHide={onHide} centered size="lg">
      <Modal.Header closeButton>
        <Modal.Title className="fs-6 fw-bold">
          {step === 1
            ? t("chat.selectMembers")
            : t("chat.newGroup")}
        </Modal.Title>
      </Modal.Header>

      <Modal.Body style={{ minHeight: "400px" }}>
        {step === 1 ? (
          <>
            {/* ⭐ المختارون */}
            {selectedUsers.length > 0 && (
              <div className="mb-3 d-flex flex-wrap gap-2">
                {selectedUsers.map((u) => (
                  <Badge
                    key={u._id}
                    bg="success"
                    className="d-flex align-items-center gap-2 py-2 px-3"
                    style={{ fontSize: "0.8rem", cursor: "pointer" }}
                    onClick={() => toggleUser(u)}
                  >
                    {u.username}
                    <i className="bi bi-x"></i>
                  </Badge>
                ))}
              </div>
            )}

            <Form.Control
  type="text"
  placeholder={t("chat.searchUsersPlaceholder")}
  value={search}
  onChange={(e) => setSearch(e.target.value)}
  className="mb-3"
  autoFocus
/>

            {loading ? (
              <div className="text-center py-4">
                <Spinner animation="border" variant="success" />
              </div>
            ) : users.length === 0 ? (
              <div className="text-center text-muted py-4 small">
                {search ? t("chat.noResults") : t("chat.startTyping")}
              </div>
            ) : (
              <ListGroup
                variant="flush"
                style={{ maxHeight: "350px", overflowY: "auto" }}
              >
                {users.map((u) => {
                  const isSelected = selectedUsers.some(
                    (s) => s._id === u._id
                  );
                  return (
                    <ListGroup.Item
                      key={u._id}
                      className="d-flex align-items-center gap-3"
                      onClick={() => toggleUser(u)}
                      style={{
                        cursor: "pointer",
                        backgroundColor: isSelected
                          ? "rgba(0, 128, 105, 0.08)"
                          : undefined,
                      }}
                    >
                      <Avatar user={u} size={44} showOnline isOnline={u.isOnline} />
                      <div className="flex-grow-1 min-w-0">
                        <div className="fw-semibold text-truncate">
                          {u.username}
                        </div>
                        <div className="small text-muted text-truncate">
                          {u.bio || ""}
                        </div>
                      </div>
                      <Form.Check
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleUser(u)}
                        onClick={(e) => e.stopPropagation()}
                      />
                    </ListGroup.Item>
                  );
                })}
              </ListGroup>
            )}
          </>
        ) : (
          // ⭐ المرحلة 2: اسم المجموعة
          <>
            <Form.Group className="mb-3">
              <Form.Label className="small fw-semibold">
                {t("chat.groupName")}
              </Form.Label>
              <Form.Control
                type="text"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                placeholder={t("chat.groupNamePlaceholder")}
                autoFocus
                maxLength={50}
              />
            </Form.Group>

            <div className="small text-muted mb-3">
              {selectedUsers.length} {t("chat.members")}
            </div>

            <div className="d-flex flex-wrap gap-2 mb-3">
              {selectedUsers.map((u) => (
                <div key={u._id} className="d-flex flex-column align-items-center">
                  <Avatar user={u} size={50} />
                  <span className="small text-truncate" style={{ maxWidth: "60px" }}>
                    {u.username}
                  </span>
                </div>
              ))}
            </div>
          </>
        )}
      </Modal.Body>

      <Modal.Footer>
        {step === 1 ? (
          <>
            <Button variant="secondary" onClick={onHide}>
              {t("common.cancel")}
            </Button>
            <Button
              variant="success"
              disabled={selectedUsers.length === 0}
              onClick={() => setStep(2)}
            >
              {t("common.next")}
            </Button>
          </>
        ) : (
          <>
            <Button
              variant="secondary"
              onClick={() => setStep(1)}
              disabled={creating}
            >
              {t("common.back")}
            </Button>
            <Button
              variant="success"
              disabled={!groupName.trim() || creating}
              onClick={handleCreate}
            >
              {creating ? (
                <Spinner animation="border" size="sm" />
              ) : (
                t("chat.createGroup")
              )}
            </Button>
          </>
        )}
      </Modal.Footer>
    </Modal>
  );
};

export default CreateGroupModal;