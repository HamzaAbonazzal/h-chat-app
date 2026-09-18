import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Form, Button, Spinner, Dropdown, Nav } from "react-bootstrap";
import ChatListItem from "./ChatListItem";
import EmptyState from "../common/EmptyState";
import { useSocket } from "../../hooks/useSocket";
import { useAuth } from "../../hooks/useAuth";

const ChatList = ({
  conversations,
  loading,
  activeConversationId,
  onSelectConversation,
  onNewChat,
  onNewGroup,
}) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { onlineUsers } = useSocket();
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState("all"); // all | archived

  const currentUserId = user?._id;

  // ⭐ فلترة حسب التبويب
  const visibleConversations = useMemo(() => {
    let list = conversations;

    if (tab === "archived") {
      list = list.filter((c) => c.isArchived);
    } else {
      list = list.filter((c) => !c.isArchived);
    }

    return list;
  }, [conversations, tab]);

  const archivedCount = useMemo(
    () => conversations.filter((c) => c.isArchived).length,
    [conversations]
  );

  // ⭐ الترتيب + البحث
  const filtered = useMemo(() => {
    let list = [...visibleConversations];

    // الترتيب: المثبتة أولاً، ثم الأحدث
    list.sort((a, b) => {
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      return new Date(b.updatedAt) - new Date(a.updatedAt);
    });

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((conv) => {
        const name = conv.isGroup
          ? conv.name
          : conv.participants.find((p) => p._id !== currentUserId)?.username ||
            "";
        return name.toLowerCase().includes(q);
      });
    }

    return list;
  }, [visibleConversations, search, currentUserId]);

  return (
    <div
      className="h-100 d-flex flex-column sidebar"
      style={{ backgroundColor: "var(--bs-body-bg)" }}
    >
      {/* ⭐═══════════ Header: Search + New ═══════════ */}
      <div className="p-2 border-bottom">
        <div className="d-flex gap-2 mb-2">
          {/* ⭐ شريط البحث مع أيقونة */}
          <div className="position-relative flex-grow-1">
            <i
              className="bi bi-search position-absolute text-muted"
              style={{
                top: "50%",
                transform: "translateY(-50%)",
                left: "12px",
                fontSize: "0.9rem",
                pointerEvents: "none",
              }}
            ></i>
            <Form.Control
              type="text"
              size="sm"
              placeholder={t("chat.searchChats")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-body-tertiary border-0"
              style={{
                paddingLeft: "36px",
                paddingRight: search ? "32px" : "12px",
                borderRadius: "20px",
                height: "38px",
                fontSize: "0.88rem",
              }}
            />
            {search && (
              <button
                type="button"
                className="btn btn-link position-absolute p-0 text-muted text-decoration-none"
                style={{
                  top: "50%",
                  transform: "translateY(-50%)",
                  right: "12px",
                  lineHeight: 1,
                }}
                onClick={() => setSearch("")}
                title={t("common.close")}
              >
                <i className="bi bi-x-circle-fill" style={{ fontSize: "0.85rem" }}></i>
              </button>
            )}
          </div>

          {/* ⭐ زر إنشاء جديد */}
          <Dropdown align="end">
            <Dropdown.Toggle
              as={Button}
              variant="success"
              size="sm"
              className="rounded-circle d-flex align-items-center justify-content-center flex-shrink-0"
              style={{
                width: "38px",
                height: "38px",
                padding: 0,
                border: "none",
              }}
              title={t("chat.newChat")}
            >
              <i className="bi bi-plus-lg"></i>
            </Dropdown.Toggle>
            <Dropdown.Menu>
              <Dropdown.Item onClick={onNewChat}>
                <i className="bi bi-chat-dots me-2"></i>
                {t("chat.newChat")}
              </Dropdown.Item>
              <Dropdown.Item onClick={onNewGroup}>
                <i className="bi bi-people me-2"></i>
                {t("chat.newGroup")}
              </Dropdown.Item>
            </Dropdown.Menu>
          </Dropdown>
        </div>

        {/* ⭐ تبويبات: الكل / المؤرشفة */}
        <Nav
          variant="pills"
          activeKey={tab}
          onSelect={(k) => setTab(k)}
          className="chat-list-tabs"
        >
          <Nav.Item>
            <Nav.Link eventKey="all" className="py-1 px-3 small">
              {t("chat.allChats")}
            </Nav.Link>
          </Nav.Item>
          <Nav.Item>
            <Nav.Link eventKey="archived" className="py-1 px-3 small">
              {t("chat.archived")}
              {archivedCount > 0 && (
                <span
                  className="ms-1 badge bg-body-secondary text-body-secondary rounded-pill"
                  style={{ fontSize: "0.65rem" }}
                >
                  {archivedCount}
                </span>
              )}
            </Nav.Link>
          </Nav.Item>
        </Nav>
      </div>

      {/* ⭐═══════════ القائمة ⭐══════════ */}
      <div className="flex-grow-1 overflow-auto">
        {loading ? (
          <div className="text-center py-5">
            <Spinner animation="border" variant="success" />
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={
              tab === "archived"
                ? "bi-archive"
                : "bi-chat-square-dots"
            }
            title={
              search
                ? t("chat.noResults")
                : tab === "archived"
                ? t("chat.noArchived")
                : t("chat.noChats")
            }
            description={
              !search && tab === "all" ? t("chat.noChatsDesc") : ""
            }
            action={
              !search && tab === "all" && (
                <div className="d-flex gap-2">
                  <Button variant="success" size="sm" onClick={onNewChat}>
                    <i className="bi bi-chat-dots me-2"></i>
                    {t("chat.newChat")}
                  </Button>
                  <Button
                    variant="outline-success"
                    size="sm"
                    onClick={onNewGroup}
                  >
                    <i className="bi bi-people me-2"></i>
                    {t("chat.newGroup")}
                  </Button>
                </div>
              )
            }
          />
        ) : (
          <div className="list-group list-group-flush">
            {filtered.map((conv) => {
              const otherUser = conv.isGroup
                ? null
                : conv.participants.find((p) => p._id !== currentUserId);

              const isOnline = otherUser
                ? onlineUsers.has(otherUser._id)
                : false;

              return (
                <ChatListItem
                  key={conv._id}
                  conversation={conv}
                  currentUserId={currentUserId}
                  isActive={conv._id === activeConversationId}
                  onClick={() => onSelectConversation(conv._id)}
                  isOnline={isOnline}
                />
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatList;