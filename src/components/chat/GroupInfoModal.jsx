import { useState, useEffect } from "react";
import {
  Modal,
  Button,
  ListGroup,
  Dropdown,
  Badge,
  Form,
  Spinner,
  Nav,
  Alert,
} from "react-bootstrap";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { conversationService } from "../../services/conversationService";
import { userService } from "../../services/userService";
import { uploadService } from "../../services/uploadService";
import Avatar from "../common/Avatar";
import ConfirmModal from "./ConfirmModal";

const GroupInfoModal = ({
  show,
  onHide,
  conversation: initialConversation,
  onConversationUpdated,
  onLeft,
}) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [conversation, setConversation] = useState(initialConversation);
  const [activeTab, setActiveTab] = useState("members");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // ⭐ تعديل الاسم
  const [editingName, setEditingName] = useState(false);
  const [newName, setNewName] = useState("");

  // ⭐ إضافة عضو
  const [showAddMember, setShowAddMember] = useState(false);
  const [searchUsers, setSearchUsers] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searching, setSearching] = useState(false);

  // ⭐ تأكيدات
  const [confirm, setConfirm] = useState({
    show: false,
    title: "",
    message: "",
    action: null,
    variant: "danger",
  });

  // ⭐ أعد الجلب عند الفتح
  useEffect(() => {
    if (!show || !initialConversation?._id) return;

    const fetch = async () => {
      setLoading(true);
      try {
        const data = await conversationService.getConversationById(
          initialConversation._id
        );
        setConversation(data);
        setNewName(data.name);
      } catch (err) {
        console.error("Failed to fetch group:", err);
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, [show, initialConversation?._id]);

  // ⭐ البحث عن مستخدمين
  useEffect(() => {
    if (!showAddMember) return;

    const load = async () => {
      setSearching(true);
      try {
        const data = await userService.searchUsers(searchQuery);
        // استثنِ الأعضاء الحاليين
        const memberIds = new Set(
          conversation?.participants?.map((p) => p._id) || []
        );
        setSearchUsers(data.filter((u) => !memberIds.has(u._id)));
      } catch (err) {
        console.error("Search failed:", err);
      } finally {
        setSearching(false);
      }
    };

    const timer = setTimeout(load, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, showAddMember, conversation]);

  if (!conversation) return null;

  const myId = user._id;
  const isOwner = conversation.owner?._id === myId || conversation.owner === myId;
  const isAdmin = conversation.admins?.some(
    (a) => (a._id || a) === myId
  );

  const canAddMembers =
    isOwner ||
    isAdmin ||
    conversation.permissions?.addMembers === "all";

  const canEditInfo =
    isOwner ||
    isAdmin ||
    conversation.permissions?.editGroupInfo === "all";

  // ⭐ تعديل الاسم
  const handleSaveName = async () => {
    if (!newName.trim() || newName.trim() === conversation.name) {
      setEditingName(false);
      return;
    }

    setSaving(true);
    try {
      const updated = await conversationService.updateGroup(conversation._id, {
        name: newName.trim(),
      });
      setConversation(updated);
      onConversationUpdated?.(updated);
      setEditingName(false);
    } catch (err) {
      console.error("Failed to update name:", err);
    } finally {
      setSaving(false);
    }
  };

  // ⭐ تعديل صورة المجموعة
  const handleAvatarChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSaving(true);
    try {
      const uploaded = await uploadService.uploadFile(file);
      const updated = await conversationService.updateGroup(conversation._id, {
        groupAvatar: uploaded.url,
      });
      setConversation(updated);
      onConversationUpdated?.(updated);
    } catch (err) {
      console.error("Failed to update avatar:", err);
    } finally {
      setSaving(false);
    }
  };

  // ⭐ ترقية أدمن
  const handlePromote = (userId) => {
    setConfirm({
      show: true,
      title: t("chat.promoteAdmin"),
      message: t("chat.promoteAdminConfirm"),
      variant: "success",
      action: async () => {
        try {
          await conversationService.promoteToAdmin(conversation._id, userId);
          // أعد الجلب
          const data = await conversationService.getConversationById(
            conversation._id
          );
          setConversation(data);
          onConversationUpdated?.(data);
        } catch (err) {
          console.error(err);
        }
      },
    });
  };

  // ⭐ تنزيل أدمن
  const handleDemote = (userId) => {
    setConfirm({
      show: true,
      title: t("chat.demoteAdmin"),
      message: t("chat.demoteAdminConfirm"),
      variant: "warning",
      action: async () => {
        try {
          await conversationService.demoteFromAdmin(conversation._id, userId);
          const data = await conversationService.getConversationById(
            conversation._id
          );
          setConversation(data);
          onConversationUpdated?.(data);
        } catch (err) {
          console.error(err);
        }
      },
    });
  };

  // ⭐ إزالة عضو
  const handleRemove = (userId) => {
    setConfirm({
      show: true,
      title: t("chat.removeMember"),
      message: t("chat.removeMemberConfirm"),
      variant: "danger",
      action: async () => {
        try {
          await conversationService.removeParticipant(
            conversation._id,
            userId
          );
          const data = await conversationService.getConversationById(
            conversation._id
          );
          setConversation(data);
          onConversationUpdated?.(data);
        } catch (err) {
          console.error(err);
        }
      },
    });
  };

  // ⭐ إضافة عضو
  const handleAddMember = async (userId) => {
    try {
      await conversationService.addParticipant(conversation._id, userId);
      const data = await conversationService.getConversationById(
        conversation._id
      );
      setConversation(data);
      onConversationUpdated?.(data);
      setShowAddMember(false);
      setSearchQuery("");
    } catch (err) {
      console.error(err);
    }
  };

  // ⭐ مغادرة
  const handleLeave = () => {
    setConfirm({
      show: true,
      title: t("chat.leaveGroup"),
      message: t("chat.leaveGroupConfirm"),
      variant: "danger",
      action: async () => {
        try {
          await conversationService.leaveGroup(conversation._id);
          onLeft?.(conversation._id);
          onHide();
        } catch (err) {
          console.error(err);
        }
      },
    });
  };

  // ⭐ حذف المجموعة
  const handleDeleteGroup = () => {
    setConfirm({
      show: true,
      title: t("chat.deleteGroup"),
      message: t("chat.deleteGroupConfirm"),
      variant: "danger",
      action: async () => {
        try {
          await conversationService.deleteGroup(conversation._id);
          onLeft?.(conversation._id);
          onHide();
        } catch (err) {
          console.error(err);
        }
      },
    });
  };

  // ⭐ تغيير صلاحية
  const handlePermissionChange = async (key, value) => {
    setSaving(true);
    try {
      const updated = await conversationService.updatePermissions(
        conversation._id,
        { [key]: value }
      );
      setConversation((prev) => ({
        ...prev,
        permissions: { ...prev.permissions, ...updated },
      }));
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Modal show={show} onHide={onHide} centered size="lg">
        <Modal.Header closeButton>
          <Modal.Title className="fs-6 fw-bold">
            {t("chat.groupInfo")}
          </Modal.Title>
        </Modal.Header>

        <Modal.Body style={{ maxHeight: "70vh", overflowY: "auto" }}>
          {loading ? (
            <div className="text-center py-4">
              <Spinner animation="border" variant="success" />
            </div>
          ) : (
            <>
              {/* ⭐ الهيدر: الصورة + الاسم */}
              <div className="text-center mb-4">
                <div className="position-relative d-inline-block">
                  <Avatar
                    user={{
                      username: conversation.name,
                      avatar: conversation.groupAvatar,
                    }}
                    size={100}
                  />
                  {canEditInfo && (
                    <>
                      <Button
                        variant="success"
                        size="sm"
                        className="position-absolute rounded-circle p-0 d-flex align-items-center justify-content-center"
                        style={{
                          width: "32px",
                          height: "32px",
                          bottom: 0,
                          right: 0,
                        }}
                        onClick={() =>
                          document
                            .getElementById("group-avatar-input")
                            ?.click()
                        }
                        disabled={saving}
                      >
                        {saving ? (
                          <Spinner animation="border" size="sm" />
                        ) : (
                          <i className="bi bi-camera-fill"></i>
                        )}
                      </Button>
                      <input
                        id="group-avatar-input"
                        type="file"
                        accept="image/*"
                        hidden
                        onChange={handleAvatarChange}
                      />
                    </>
                  )}
                </div>

                {editingName ? (
                  <div className="d-flex gap-2 mt-3 mx-auto" style={{ maxWidth: "400px" }}>
                    <Form.Control
                      type="text"
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      autoFocus
                      maxLength={50}
                    />
                    <Button
                      variant="success"
                      size="sm"
                      onClick={handleSaveName}
                      disabled={saving}
                    >
                      <i className="bi bi-check-lg"></i>
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => {
                        setEditingName(false);
                        setNewName(conversation.name);
                      }}
                    >
                      <i className="bi bi-x-lg"></i>
                    </Button>
                  </div>
                ) : (
                  <div className="d-flex align-items-center justify-content-center gap-2 mt-3">
                    <h5 className="fw-bold mb-0">{conversation.name}</h5>
                    {canEditInfo && (
                      <Button
                        variant="link"
                        size="sm"
                        className="p-0 text-secondary"
                        onClick={() => setEditingName(true)}
                      >
                        <i className="bi bi-pencil"></i>
                      </Button>
                    )}
                  </div>
                )}

                <p className="text-muted small mb-0 mt-1">
                  {t("chat.groupMembersCount", {
                    count: conversation.participants?.length || 0,
                  })}
                </p>
              </div>

              {/* ⭐ التبويبات */}
              <Nav
                variant="tabs"
                activeKey={activeTab}
                onSelect={(k) => setActiveTab(k)}
                className="mb-3"
              >
                <Nav.Item>
                  <Nav.Link eventKey="members">
                    <i className="bi bi-people me-1"></i>
                    {t("chat.members")}
                  </Nav.Link>
                </Nav.Item>
                {isOwner && (
                  <Nav.Item>
                    <Nav.Link eventKey="permissions">
                      <i className="bi bi-shield-check me-1"></i>
                      {t("chat.permissions")}
                    </Nav.Link>
                  </Nav.Item>
                )}
              </Nav>

              {/* ⭐ تبويب الأعضاء */}
              {activeTab === "members" && (
                <>
                  {canAddMembers && (
                    <Button
                      variant="outline-success"
                      size="sm"
                      className="mb-3 w-100"
                      onClick={() => setShowAddMember((p) => !p)}
                    >
                      <i className="bi bi-person-plus me-2"></i>
                      {t("chat.addMembers")}
                    </Button>
                  )}

                  {/* ⭐ إضافة عضو */}
                  {showAddMember && (
                    <div className="mb-3 p-3 border rounded">
                      <Form.Control
                        type="text"
                        size="sm"
                        placeholder={t("common.search")}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        autoFocus
                        className="mb-2"
                      />
                      {searching ? (
                        <div className="text-center py-2">
                          <Spinner animation="border" size="sm" />
                        </div>
                      ) : searchUsers.length === 0 ? (
                        <div className="text-center text-muted small py-2">
                          {searchQuery ? t("chat.noResults") : ""}
                        </div>
                      ) : (
                        <ListGroup
                          variant="flush"
                          style={{ maxHeight: "200px", overflowY: "auto" }}
                        >
                          {searchUsers.map((u) => (
                            <ListGroup.Item
                              key={u._id}
                              className="d-flex align-items-center gap-2 py-2"
                              style={{ cursor: "pointer" }}
                              onClick={() => handleAddMember(u._id)}
                            >
                              <Avatar user={u} size={32} />
                              <span className="small">{u.username}</span>
                            </ListGroup.Item>
                          ))}
                        </ListGroup>
                      )}
                    </div>
                  )}

                  <ListGroup variant="flush">
                    {conversation.participants?.map((p) => {
                      const isMe = p._id === myId;
                      const isUserOwner =
                        conversation.owner?._id === p._id ||
                        conversation.owner === p._id;
                      const isUserAdmin = conversation.admins?.some(
                        (a) => (a._id || a) === p._id
                      );

                      return (
                        <ListGroup.Item
                          key={p._id}
                          className="d-flex align-items-center gap-3 py-3"
                        >
                          <div
                            style={{ cursor: "pointer" }}
                            onClick={() => {
                              navigate(`/profile/${p._id}`);
                              onHide();
                            }}
                          >
                            <Avatar user={p} size={44} />
                          </div>
                          <div
                            className="flex-grow-1 min-w-0"
                            style={{ cursor: "pointer" }}
                            onClick={() => {
                              if (!isMe) {
                                navigate(`/profile/${p._id}`);
                                onHide();
                              }
                            }}
                          >
                            <div className="fw-semibold text-truncate">
                              {p.username}
                              {isMe && (
                                <span className="text-muted small">
                                  {" "}
                                  ({t("common.you")})
                                </span>
                              )}
                            </div>
                            <div className="small text-muted">
                              {isUserOwner && (
                                <Badge bg="warning" text="dark" className="me-1">
                                  {t("chat.owner")}
                                </Badge>
                              )}
                              {isUserAdmin && !isUserOwner && (
                                <Badge bg="success" className="me-1">
                                  {t("chat.admin")}
                                </Badge>
                              )}
                            </div>
                          </div>

                          {/* ⭐ قائمة الإجراءات */}
                          {!isMe && (isOwner || isAdmin) && (
                            <Dropdown align="end">
                              <Dropdown.Toggle
                                as="button"
                                bsPrefix="btn btn-link p-1 text-secondary"
                                style={{ border: "none" }}
                              >
                                <i className="bi bi-three-dots-vertical"></i>
                              </Dropdown.Toggle>
                              <Dropdown.Menu>
                                {isOwner && !isUserAdmin && !isUserOwner && (
                                  <Dropdown.Item
                                    onClick={() => handlePromote(p._id)}
                                  >
                                    <i className="bi bi-shield-plus me-2"></i>
                                    {t("chat.promoteAdmin")}
                                  </Dropdown.Item>
                                )}
                                {isOwner && isUserAdmin && !isUserOwner && (
                                  <Dropdown.Item
                                    onClick={() => handleDemote(p._id)}
                                  >
                                    <i className="bi bi-shield-minus me-2"></i>
                                    {t("chat.demoteAdmin")}
                                  </Dropdown.Item>
                                )}
                                {(isOwner ||
                                  (isAdmin && !isUserAdmin)) && (
                                  <Dropdown.Item
                                    className="text-danger"
                                    onClick={() => handleRemove(p._id)}
                                  >
                                    <i className="bi bi-person-dash me-2"></i>
                                    {t("chat.removeMember")}
                                  </Dropdown.Item>
                                )}
                              </Dropdown.Menu>
                            </Dropdown>
                          )}
                        </ListGroup.Item>
                      );
                    })}
                  </ListGroup>
                </>
              )}

              {/* ⭐ تبويب الصلاحيات */}
              {activeTab === "permissions" && isOwner && (
                <>
                  <Alert variant="info" className="small">
                    <i className="bi bi-info-circle me-1"></i>
                    {t("chat.permissionsInfo")}
                  </Alert>

                  <Form.Group className="mb-3">
                    <Form.Label className="small fw-semibold">
                      <i className="bi bi-chat me-1"></i>
                      {t("chat.whoCanSendMessages")}
                    </Form.Label>
                    <Form.Select
                      value={conversation.permissions?.sendMessages || "all"}
                      onChange={(e) =>
                        handlePermissionChange("sendMessages", e.target.value)
                      }
                      disabled={saving}
                    >
                      <option value="all">{t("chat.allMembers")}</option>
                      <option value="admins">
                        {t("chat.adminsOnly")}
                      </option>
                    </Form.Select>
                  </Form.Group>

                  <Form.Group className="mb-3">
                    <Form.Label className="small fw-semibold">
                      <i className="bi bi-person-plus me-1"></i>
                      {t("chat.whoCanAddMembers")}
                    </Form.Label>
                    <Form.Select
                      value={conversation.permissions?.addMembers || "all"}
                      onChange={(e) =>
                        handlePermissionChange("addMembers", e.target.value)
                      }
                      disabled={saving}
                    >
                      <option value="all">{t("chat.allMembers")}</option>
                      <option value="admins">
                        {t("chat.adminsOnly")}
                      </option>
                    </Form.Select>
                  </Form.Group>

                  <Form.Group className="mb-3">
                    <Form.Label className="small fw-semibold">
                      <i className="bi bi-pencil me-1"></i>
                      {t("chat.whoCanEditInfo")}
                    </Form.Label>
                    <Form.Select
                      value={conversation.permissions?.editGroupInfo || "all"}
                      onChange={(e) =>
                        handlePermissionChange(
                          "editGroupInfo",
                          e.target.value
                        )
                      }
                      disabled={saving}
                    >
                      <option value="all">{t("chat.allMembers")}</option>
                      <option value="admins">
                        {t("chat.adminsOnly")}
                      </option>
                    </Form.Select>
                  </Form.Group>
                </>
              )}
            </>
          )}
        </Modal.Body>

        <Modal.Footer>
          {isOwner ? (
            <Button variant="danger" onClick={handleDeleteGroup}>
              <i className="bi bi-trash me-2"></i>
              {t("chat.deleteGroup")}
            </Button>
          ) : (
            <Button variant="danger" onClick={handleLeave}>
              <i className="bi bi-box-arrow-right me-2"></i>
              {t("chat.leaveGroup")}
            </Button>
          )}
          <Button variant="secondary" onClick={onHide}>
            {t("common.close")}
          </Button>
        </Modal.Footer>
      </Modal>

      <ConfirmModal
        show={confirm.show}
        onHide={() => setConfirm((p) => ({ ...p, show: false }))}
        onConfirm={async () => {
          await confirm.action?.();
          setConfirm((p) => ({ ...p, show: false }));
        }}
        title={confirm.title}
        message={confirm.message}
        confirmVariant={confirm.variant}
        icon="bi-exclamation-triangle"
      />
    </>
  );
};

export default GroupInfoModal;