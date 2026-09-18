import { useState, useEffect, useCallback } from "react";
import { Row, Col, Button } from "react-bootstrap";
import { useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "../hooks/useAuth";
import { useSocket } from "../hooks/useSocket";
import { conversationService } from "../services/conversationService";
import ChatList from "../components/chat/ChatList";
import ChatWindow from "../components/chat/ChatWindow";
import NewChatModal from "../components/chat/NewChatModal";
import CreateGroupModal from "../components/chat/CreateGroupModal";
import StarredMessagesModal from "../components/chat/StarredMessagesModal";
import GlobalSearchModal from "../components/chat/GlobalSearchModal";
import CallLogModal from "../components/call/CallLogModal";
import Avatar from "../components/common/Avatar";
import ConnectionBanner from "../components/common/ConnectionBanner";

const ChatPage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { conversationId } = useParams();
  const { user } = useAuth();
  const { isConnected, on } = useSocket();

  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showNewChat, setShowNewChat] = useState(false);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [showStarred, setShowStarred] = useState(false);
  const [showGlobalSearch, setShowGlobalSearch] = useState(false);
  const [showCallLog, setShowCallLog] = useState(false);

  // ⭐ منع body من التمرير في صفحة المحادثة
  useEffect(() => {
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, []);

  const fetchConversations = useCallback(async () => {
    try {
      const data = await conversationService.getConversations();
      setConversations(data);
    } catch (err) {
      console.error("Failed to load conversations:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  // ⭐ Socket events
  useEffect(() => {
    const offNewMessage = on("newMessage", (message) => {
      setConversations((prev) => {
        const convId = message.conversation?._id || message.conversation;
        const index = prev.findIndex((c) => c._id === convId);

        if (index === -1) {
          fetchConversations();
          return prev;
        }

        const updated = [...prev];
        const conv = { ...updated[index] };
        conv.lastMessage = message;
        conv.updatedAt = new Date().toISOString();

        if (conv.isArchived) {
          conv.isArchived = false;
        }

        if (message.sender?._id !== user._id && convId !== conversationId) {
          conv.unreadCount = (conv.unreadCount || 0) + 1;
        }

        updated.splice(index, 1);
        updated.unshift(conv);
        return updated;
      });
    });

    const offUnread = on(
      "unreadCountUpdated",
      ({ conversationId: convId, unreadCount }) => {
        setConversations((prev) =>
          prev.map((c) => (c._id === convId ? { ...c, unreadCount } : c))
        );
      }
    );

    const offLeft = on("conversationLeft", ({ conversationId: convId }) => {
      setConversations((prev) => prev.filter((c) => c._id !== convId));
      if (conversationId === convId) navigate("/");
    });

    const offDeleted = on(
      "conversationDeleted",
      ({ conversationId: convId }) => {
        setConversations((prev) => prev.filter((c) => c._id !== convId));
        if (conversationId === convId) navigate("/");
      }
    );

    return () => {
      offNewMessage?.();
      offUnread?.();
      offLeft?.();
      offDeleted?.();
    };
  }, [on, user._id, conversationId, fetchConversations, navigate]);

  // ⭐ تصفير unreadCount عند فتح محادثة
  useEffect(() => {
    if (!conversationId) return;
    setConversations((prev) =>
      prev.map((c) =>
        c._id === conversationId ? { ...c, unreadCount: 0 } : c
      )
    );
  }, [conversationId]);

  const activeConversation = conversations.find(
    (c) => c._id === conversationId
  );

  const handleSelectConversation = (id) => {
    navigate(`/chat/${id}`);
  };

  const handleBack = () => {
    navigate("/");
  };

  const handleConversationCreated = (conversation) => {
    setConversations((prev) => {
      if (prev.some((c) => c._id === conversation._id)) return prev;
      return [conversation, ...prev];
    });
    navigate(`/chat/${conversation._id}`);
  };

  const handleConversationDeleted = (convId) => {
    setConversations((prev) => prev.filter((c) => c._id !== convId));
  };

  const handleLeft = (convId) => {
    setConversations((prev) => prev.filter((c) => c._id !== convId));
    if (conversationId === convId) {
      navigate("/");
    }
  };

  const handleConversationUpdated = (updatedConv) => {
    setConversations((prev) =>
      prev.map((c) =>
        c._id === updatedConv._id ? { ...c, ...updatedConv } : c
      )
    );
  };

  return (
    <div className="chat-app-layout">
      {/* ⭐═══════════ TopBar ⭐══════════ */}
      <div
        className="border-bottom px-3 d-flex align-items-center justify-content-between topbar-blur"
        style={{
          height: "64px",
          flexShrink: 0,
          zIndex: 100,
        }}
      >
        {/* ⭐ بيانات المستخدم */}
        <div className="d-flex align-items-center gap-3">
          <Avatar user={user} size={42} showOnline isOnline={isConnected} />
          <div className="d-none d-sm-block">
            <div className="fw-bold small" style={{ fontSize: "0.95rem" }}>
              {user?.username}
            </div>
            <div
              className="small d-flex align-items-center gap-1"
              style={{
                color: isConnected ? "#25d366" : "var(--bs-secondary-color)",
                fontSize: "0.72rem",
              }}
            >
              {isConnected && (
                <span
                  className="online-dot"
                  style={{
                    display: "inline-block",
                    width: "7px",
                    height: "7px",
                    borderRadius: "50%",
                    backgroundColor: "#25d366",
                  }}
                ></span>
              )}
              {isConnected ? t("common.online") : t("common.offline")}
            </div>
          </div>
        </div>

        {/* ⭐ الأزرار */}
        <div className="d-flex align-items-center gap-1">
          <Button
            variant="link"
            className="text-decoration-none text-secondary p-2 rounded-circle"
            onClick={() => setShowGlobalSearch(true)}
            title={t("chat.globalSearch")}
            style={{
              width: "42px",
              height: "42px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <i className="bi bi-search fs-5"></i>
          </Button>

          <Button
            variant="link"
            className="text-decoration-none text-secondary p-2 rounded-circle"
            onClick={() => setShowStarred(true)}
            title={t("chat.starredMessages")}
            style={{
              width: "42px",
              height: "42px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <i className="bi bi-star fs-5"></i>
          </Button>

          <Button
            variant="link"
            className="text-decoration-none text-secondary p-2 rounded-circle"
            onClick={() => setShowCallLog(true)}
            title={t("call.callHistory")}
            style={{
              width: "42px",
              height: "42px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <i className="bi bi-telephone fs-5"></i>
          </Button>

          <Button
            variant="link"
            className="text-decoration-none text-secondary p-2 rounded-circle"
            onClick={() => navigate("/settings")}
            title={t("settings.title")}
            style={{
              width: "42px",
              height: "42px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <i className="bi bi-gear fs-5"></i>
          </Button>
        </div>
      </div>

            {/* ⭐ Connection Banner */}
      <ConnectionBanner />
      
      {/* ⭐═══════════ Body ⭐══════════ */}
      <div className="flex-grow-1 overflow-hidden">
        <Row className="h-100 g-0">
          {/* Sidebar */}
          <Col
            xs={12}
            md={4}
            lg={3}
            className={`h-100 border-end ${
              conversationId ? "d-none d-md-block" : ""
            }`}
          >
            <ChatList
              conversations={conversations}
              loading={loading}
              activeConversationId={conversationId}
              onSelectConversation={handleSelectConversation}
              onNewChat={() => setShowNewChat(true)}
              onNewGroup={() => setShowCreateGroup(true)}
            />
          </Col>

          {/* Chat Window */}
          <Col
            xs={12}
            md={8}
            lg={9}
            className={`h-100 ${!conversationId ? "d-none d-md-block" : ""}`}
          >
            <ChatWindow
              conversation={activeConversation}
              onBack={handleBack}
              onConversationDeleted={handleConversationDeleted}
              onLeft={handleLeft}
              onConversationUpdated={handleConversationUpdated}
            />
          </Col>
        </Row>
      </div>

      {/* ⭐═══════════ Modals ⭐══════════ */}
      <NewChatModal
        show={showNewChat}
        onHide={() => setShowNewChat(false)}
        onConversationCreated={handleConversationCreated}
      />

      <CreateGroupModal
        show={showCreateGroup}
        onHide={() => setShowCreateGroup(false)}
        onGroupCreated={handleConversationCreated}
      />

      <StarredMessagesModal
        show={showStarred}
        onHide={() => setShowStarred(false)}
      />

      <GlobalSearchModal
        show={showGlobalSearch}
        onHide={() => setShowGlobalSearch(false)}
      />

      <CallLogModal
        show={showCallLog}
        onHide={() => setShowCallLog(false)}
      />
    </div>
  );
};

export default ChatPage;