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
import Avatar from "../components/common/Avatar";

const ChatPage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { conversationId } = useParams();
  const { user } = useAuth();
  const { isConnected, on } = useSocket();

  // ⭐ الحالات الأساسية
  const [conversations, setConversations] = useState([]);
  const [archivedConversations, setArchivedConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showNewChat, setShowNewChat] = useState(false);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [activeTab, setActiveTab] = useState("all");

  // ⭐ منع تمرير الصفحة
  useEffect(() => {
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, []);

  // ⭐ جلب المحادثات
  const fetchConversations = useCallback(async () => {
    try {
      const [regular, archived] = await Promise.all([
        conversationService.getConversations(false),
        conversationService.getConversations(true),
      ]);
      setConversations(regular);
      setArchivedConversations(archived);
    } catch (err) {
      console.error("Failed to load conversations:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  // ⭐ أحداث Socket.IO
  useEffect(() => {
    // رسالة جديدة
    const offNewMessage = on("newMessage", (message) => {
      const convId = message.conversation?._id || message.conversation;

      // تحديث قائمة المحادثات العادية
      setConversations((prev) => {
        const index = prev.findIndex((c) => c._id === convId);
        if (index === -1) {
          fetchConversations();
          return prev;
        }

        const updated = [...prev];
        const conv = { ...updated[index] };
        conv.lastMessage = message;
        conv.updatedAt = new Date().toISOString();

        if (message.sender?._id !== user._id && convId !== conversationId) {
          conv.unreadCount = (conv.unreadCount || 0) + 1;
        }

        updated.splice(index, 1);
        updated.unshift(conv);
        return updated;
      });

      // تحديث قائمة الأرشيف
      setArchivedConversations((prev) => {
        const index = prev.findIndex((c) => c._id === convId);
        if (index === -1) return prev;

        const updated = [...prev];
        const conv = { ...updated[index] };
        conv.lastMessage = message;
        conv.updatedAt = new Date().toISOString();

        if (message.sender?._id !== user._id && convId !== conversationId) {
          conv.unreadCount = (conv.unreadCount || 0) + 1;
        }

        updated.splice(index, 1);
        updated.unshift(conv);
        return updated;
      });
    });

    // تحديث عداد غير المقروءة
    const offUnread = on(
      "unreadCountUpdated",
      ({ conversationId: convId, unreadCount }) => {
        setConversations((prev) =>
          prev.map((c) => (c._id === convId ? { ...c, unreadCount } : c)),
        );
        setArchivedConversations((prev) =>
          prev.map((c) => (c._id === convId ? { ...c, unreadCount } : c)),
        );
      },
    );

    // مغادرة محادثة
    const offLeft = on("conversationLeft", ({ conversationId: convId }) => {
      setConversations((prev) => prev.filter((c) => c._id !== convId));
      setArchivedConversations((prev) => prev.filter((c) => c._id !== convId));
      if (conversationId === convId) navigate("/");
    });

    // حذف محادثة
    const offDeleted = on(
      "conversationDeleted",
      ({ conversationId: convId }) => {
        setConversations((prev) => prev.filter((c) => c._id !== convId));
        setArchivedConversations((prev) =>
          prev.filter((c) => c._id !== convId),
        );
        if (conversationId === convId) navigate("/");
      },
    );

    return () => {
      offNewMessage?.();
      offUnread?.();
      offLeft?.();
      offDeleted?.();
    };
  }, [on, user._id, conversationId, fetchConversations, navigate]);

  // ⭐ تصفير العداد عند فتح المحادثة
  useEffect(() => {
    if (!conversationId) return;
    setConversations((prev) =>
      prev.map((c) =>
        c._id === conversationId ? { ...c, unreadCount: 0 } : c,
      ),
    );
    setArchivedConversations((prev) =>
      prev.map((c) =>
        c._id === conversationId ? { ...c, unreadCount: 0 } : c,
      ),
    );
  }, [conversationId]);

  const activeConversation =
    conversations.find((c) => c._id === conversationId) ||
    archivedConversations.find((c) => c._id === conversationId);

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

  // ⭐ حذف محادثة (يُستدعى من ChatHeader)
  const handleConversationDeleted = (convId) => {
    console.log("🗑️ [ChatPage] Removing conversation:", convId);
    setConversations((prev) => prev.filter((c) => c._id !== convId));
    setArchivedConversations((prev) => prev.filter((c) => c._id !== convId));
  };

  const handleLeft = (convId) => {
    setConversations((prev) => prev.filter((c) => c._id !== convId));
    setArchivedConversations((prev) => prev.filter((c) => c._id !== convId));
    if (conversationId === convId) navigate("/");
  };

  const handleConversationUpdated = () => {
    fetchConversations();
  };

  return (
    <div className="chat-app-layout">
      {/* ⭐ TopBar */}
      <div
        className="border-bottom px-3 d-flex align-items-center justify-content-between"
        style={{
          height: "60px",
          backgroundColor: "var(--bs-body-bg)",
          flexShrink: 0,
        }}
      >
        <div className="d-flex align-items-center gap-3">
          {/* <Avatar user={user} size={40} showOnline isOnline={isConnected} /> */}
          <div className="d-none d-sm-flex gap-2">
            <div className="d-flex align-items-center gap-2">
              <img
                src="/favicon.svg"
                alt="Logo"
                style={{ width: "32px", height: "32px" }}
              />
              {/* <span className="fw-bold d-none d-sm-inline">H Chat App</span> */}
            </div>
            <div className="fw-semibold small">H Chat App</div>
            {/* <div
              className="small"
              style={{
                color: isConnected ? "#25d366" : "var(--bs-secondary-color)",
                fontSize: "0.7rem",
              }}
            >
              {isConnected ? t("common.online") : t("common.offline")}
            </div> */}
          </div>
        </div>

        <div className="d-flex align-items-center gap-1">
          <Button
            variant="link"
            className="text-decoration-none text-secondary p-2"
            onClick={() => navigate("/settings")}
            title={t("settings.title")}
          >
            <i className="bi bi-gear fs-5"></i>
          </Button>
        </div>
      </div>

      {/* ⭐ Body */}
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
              archivedConversations={archivedConversations}
              loading={loading}
              activeConversationId={conversationId}
              onSelectConversation={handleSelectConversation}
              onNewChat={() => setShowNewChat(true)}
              onNewGroup={() => setShowCreateGroup(true)}
              activeTab={activeTab}
              onTabChange={setActiveTab}
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

      {/* Modals */}
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
    </div>
  );
};

export default ChatPage;
