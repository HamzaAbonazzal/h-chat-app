import {
  useEffect,
  useRef,
  forwardRef,
  useImperativeHandle,
  useState,
} from "react";
import { useTranslation } from "react-i18next";
import { Spinner, Button } from "react-bootstrap";
import MessageBubble from "./MessageBubble";
import SystemMessage from "./SystemMessage";
import { isSameDay, format, isToday, isYesterday } from "date-fns";
import { ar, enUS } from "date-fns/locale";

const MessageList = forwardRef(
  (
    {
      messages,
      pendingUploads = [],
      loading,
      currentUserId,
      firstUnreadMessageId, // ⭐ جديد
      onDelete,
      onEdit,
      onReply,
      onForward,
      onToggleReaction,
      onToggleStar,
      onTogglePin,
      pinnedIds = new Set(),
      onShowInfo,
      onLoadMore,
      hasMore,
      highlightQuery = "",
      contextMode = false,
      onLoadContext,
      onExitContext,
      onImageClick,
      onClearFirstUnread, // ⭐ جديد
    },
    ref
  ) => {
    const { i18n, t } = useTranslation();
    const containerRef = useRef(null);
    const bottomRef = useRef(null);
    const prevScrollHeightRef = useRef(0);
    const isInitialLoad = useRef(true);
    const lastMessageIdRef = useRef(null);
    const isNearBottomRef = useRef(true);
    const hasScrolledToUnread = useRef(false);

    const [contextLoading, setContextLoading] = useState(false);
    const [isNearBottom, setIsNearBottom] = useState(true);
    const [newMessagesCount, setNewMessagesCount] = useState(0);

    // ⭐ التمرير لأول رسالة غير مقروءة عند التحميل الأولي
    useEffect(() => {
      if (loading || contextMode) return;
      if (hasScrolledToUnread.current) return;
      if (!messages.length) return;

      // ⭐ إذا كان هناك unread، مرّر إليها
      if (firstUnreadMessageId) {
        hasScrolledToUnread.current = true;

        setTimeout(() => {
          const container = containerRef.current;
          if (!container) return;

          const target = container.querySelector(
            `[data-unread-divider="true"]`
          );

          if (target) {
            target.scrollIntoView({
              behavior: "smooth",
              block: "start",
            });
          }
        }, 300);
      } else {
        hasScrolledToUnread.current = true;
      }
    }, [loading, firstUnreadMessageId, messages.length, contextMode]);

    // ⭐ التمرير التلقائي عند وصول رسائل جديدة
    useEffect(() => {
      if (loading) return;

      if (isInitialLoad.current) {
        if (!firstUnreadMessageId) {
          bottomRef.current?.scrollIntoView({ behavior: "auto" });
        }
        isInitialLoad.current = false;
        const last = messages[messages.length - 1];
        if (last) lastMessageIdRef.current = last._id;
        return;
      }

      const last = messages[messages.length - 1];
      const lastId = last?._id;
      const isNewTail = lastId && lastId !== lastMessageIdRef.current;

      if (isNewTail) {
        lastMessageIdRef.current = lastId;
        const isMine = last.sender?._id === currentUserId;

        if (isMine && !contextMode) {
          bottomRef.current?.scrollIntoView({ behavior: "smooth" });
          setNewMessagesCount(0);
          setIsNearBottom(true);
          isNearBottomRef.current = true;
          return;
        }

        if (!isMine && !isNearBottomRef.current && !contextMode) {
          setNewMessagesCount((prev) => prev + 1);
          return;
        }
      }

      if (contextMode) return;

      if (isNearBottomRef.current) {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
      }
    }, [messages, loading, currentUserId, contextMode, firstUnreadMessageId]);

    // ⭐ التمرير عند إضافة رفع جديد
    useEffect(() => {
      if (pendingUploads.length === 0) return;
      if (isNearBottomRef.current && !contextMode) {
        setTimeout(() => {
          bottomRef.current?.scrollIntoView({ behavior: "smooth" });
        }, 100);
      }
    }, [pendingUploads.length, contextMode]);

    const handleContainerScroll = () => {
      const container = containerRef.current;
      if (!container) return;

      const distanceFromBottom =
        container.scrollHeight -
        container.scrollTop -
        container.clientHeight;

      const near = distanceFromBottom < 150;

      if (near !== isNearBottomRef.current) {
        isNearBottomRef.current = near;
        setIsNearBottom(near);

        if (near) {
          setNewMessagesCount(0);
          // ⭐ مسح فاصل Unread عند الوصول للأسفل
          if (firstUnreadMessageId && onClearFirstUnread) {
            onClearFirstUnread();
          }
        }
      }

      if (
        container.scrollTop < 100 &&
        hasMore &&
        !loading &&
        !contextMode
      ) {
        prevScrollHeightRef.current = container.scrollHeight;
        onLoadMore();
      }
    };

    useEffect(() => {
      const container = containerRef.current;
      if (!container || !prevScrollHeightRef.current) return;

      if (container.scrollHeight > prevScrollHeightRef.current) {
        const diff = container.scrollHeight - prevScrollHeightRef.current;
        container.scrollTop = diff;
        prevScrollHeightRef.current = 0;
      }
    }, [messages]);

    const scrollToMessageInternal = (messageId) => {
      const container = containerRef.current;
      if (!container) return false;

      const target = container.querySelector(
        `[data-message-id="${messageId}"]`
      );

      if (!target) return false;

      target.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });

      const bubble = target.querySelector(".message-bubble-body");
      if (bubble) {
        bubble.classList.add("message-highlight");
        setTimeout(() => {
          bubble.classList.remove("message-highlight");
        }, 1500);
      }

      return true;
    };

    const scrollToMessage = async (messageId) => {
      const success = scrollToMessageInternal(messageId);
      if (success) return true;
      if (!onLoadContext) return false;

      setContextLoading(true);
      try {
        await onLoadContext(messageId);
        setTimeout(() => {
          scrollToMessageInternal(messageId);
          setContextLoading(false);
        }, 300);
        return true;
      } catch (err) {
        console.error("Failed to load context:", err);
        setContextLoading(false);
        return false;
      }
    };

    const scrollToBottom = () => {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
      setNewMessagesCount(0);
      setIsNearBottom(true);
      isNearBottomRef.current = true;
      if (firstUnreadMessageId && onClearFirstUnread) {
        onClearFirstUnread();
      }
    };

    useImperativeHandle(ref, () => ({
      scrollToMessage: scrollToMessageInternal,
    }));

    const groupMessagesByDate = () => {
      const groups = [];

      const allMessages = [...messages, ...pendingUploads];

      const validMessages = allMessages.filter(
        (m) =>
          m && m._id && m.createdAt && (m.sender || m.type === "system")
      );

      validMessages.forEach((msg, index) => {
        const msgDate = new Date(msg.createdAt);
        const prevMsg = validMessages[index - 1];
        const isNewDay =
          !prevMsg || !isSameDay(msgDate, new Date(prevMsg.createdAt));

        if (isNewDay) {
          let label;
          if (isToday(msgDate))
            label = i18n.language === "ar" ? "اليوم" : "Today";
          else if (isYesterday(msgDate))
            label = i18n.language === "ar" ? "أمس" : "Yesterday";
          else
            label = format(msgDate, "dd MMMM yyyy", {
              locale: i18n.language === "ar" ? ar : enUS,
            });

          groups.push({ type: "date", label, key: `date-${msg._id}` });
        }

        // ⭐ فاصل الرسائل الجديدة
        if (msg._id === firstUnreadMessageId) {
          groups.push({
            type: "unread-divider",
            key: `unread-${msg._id}`,
          });
        }

        const nextMsg = validMessages[index + 1];
        const showAvatar =
          msg.type !== "system" &&
          (!nextMsg ||
            nextMsg.sender?._id !== msg.sender?._id ||
            !isSameDay(new Date(nextMsg.createdAt), msgDate));

        groups.push({
          type: "message",
          message: msg,
          showAvatar,
          key: msg._id,
        });
      });

      return groups;
    };

    if (loading) {
      return (
        <div className="d-flex justify-content-center align-items-center h-100">
          <Spinner animation="border" variant="success" />
        </div>
      );
    }

    if (messages.length === 0 && pendingUploads.length === 0) {
      return (
        <div className="d-flex flex-column justify-content-center align-items-center h-100 text-center text-muted">
          <i className="bi bi-chat-dots fs-1 opacity-25 mb-2"></i>
          <p className="small">
            {t("chat.noMessages") || "لا توجد رسائل بعد — ابدأ المحادثة!"}
          </p>
        </div>
      );
    }

    const grouped = groupMessagesByDate();

    return (
      <div className="h-100 position-relative" style={{ minHeight: 0 }}>
        {contextMode && (
          <div
            className="d-flex align-items-center justify-content-between px-3 py-2 border-bottom"
            style={{
              backgroundColor: "rgba(255, 193, 7, 0.15)",
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              zIndex: 20,
            }}
          >
            <div className="d-flex align-items-center gap-2 small">
              <i className="bi bi-info-circle text-warning"></i>
              <span className="fw-semibold">{t("chat.contextBanner")}</span>
            </div>
            <Button
              variant="link"
              size="sm"
              className="text-decoration-none p-0 text-primary fw-semibold small"
              onClick={onExitContext}
            >
              <i className="bi bi-arrow-down-circle me-1"></i>
              {t("chat.backToRecent")}
            </Button>
          </div>
        )}

        {contextLoading && (
          <div
            className="position-absolute top-0 start-50 translate-middle-x mt-2 px-3 py-1 rounded-pill"
            style={{
              backgroundColor: "var(--bs-body-bg)",
              boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
              zIndex: 100,
            }}
          >
            <Spinner animation="border" size="sm" variant="success" />
            <span className="small ms-2">{t("chat.loadingContext")}</span>
          </div>
        )}

        <div
          ref={containerRef}
          onScroll={handleContainerScroll}
          className="messages-scroll-container h-100 px-3 py-2"
          style={{
            backgroundColor: "var(--bs-tertiary-bg)",
            paddingTop: contextMode ? "60px" : "8px",
          }}
        >
          {hasMore && !contextMode && (
            <div className="text-center mb-3">
              <button
                className="btn btn-sm btn-link text-decoration-none"
                onClick={onLoadMore}
              >
                <i className="bi bi-arrow-up-circle me-1"></i>
                تحميل الرسائل الأقدم
              </button>
            </div>
          )}

          {grouped.map((item) => {
            if (item.type === "date") {
              return (
                <div key={item.key} className="text-center my-3">
                  <span
                    className="badge bg-body-secondary text-body-secondary rounded-pill px-3 py-1 small"
                    style={{ fontSize: "0.7rem" }}
                  >
                    {item.label}
                  </span>
                </div>
              );
            }

            // ⭐ فاصل الرسائل الجديدة
            if (item.type === "unread-divider") {
              return (
                <div
                  key={item.key}
                  data-unread-divider="true"
                  className="unread-divider my-3"
                >
                  <div className="unread-divider-line">
                    <span className="unread-divider-badge">
                      {t("chat.newMessages", "رسائل جديدة")}
                    </span>
                  </div>
                </div>
              );
            }

            const { message, showAvatar } = item;

            if (message.type === "system") {
              return (
                <div key={item.key} data-message-id={message._id}>
                  <SystemMessage message={message} />
                </div>
              );
            }

            const isMine = message.sender?._id === currentUserId;
            const isPinned = pinnedIds.has(message._id);

            return (
              <MessageBubble
                key={item.key}
                message={message}
                isMine={isMine}
                showAvatar={showAvatar}
                currentUserId={currentUserId}
                isPinned={isPinned}
                onDelete={onDelete}
                onEdit={onEdit}
                onReply={onReply}
                onForward={onForward}
                onToggleReaction={onToggleReaction}
                onToggleStar={onToggleStar}
                onTogglePin={onTogglePin}
                onShowInfo={onShowInfo}
                onReplyQuoteClick={scrollToMessage}
                onImageClick={onImageClick}
                highlightQuery={highlightQuery}
              />
            );
          })}

          <div ref={bottomRef} style={{ height: "1px" }} />
        </div>

        {!isNearBottom && !contextMode && (
          <button
            type="button"
            onClick={scrollToBottom}
            className="scroll-to-bottom-btn"
            title={t("chat.scrollToBottom")}
            style={{
              position: "absolute",
              bottom: "20px",
              right: "20px",
              width: "44px",
              height: "44px",
              borderRadius: "50%",
              backgroundColor: "#008069",
              border: "none",
              color: "#fff",
              zIndex: 50,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 4px 12px rgba(0, 0, 0, 0.25)",
              cursor: "pointer",
              animation: "scrollBtnFadeIn 0.2s ease-out",
            }}
          >
            <i className="bi bi-arrow-down" style={{ fontSize: "1.2rem" }}></i>

            {newMessagesCount > 0 && (
              <span
                className="position-absolute"
                style={{
                  top: "-4px",
                  right: "-4px",
                  minWidth: "20px",
                  height: "20px",
                  borderRadius: "10px",
                  backgroundColor: "#dc3545",
                  color: "#fff",
                  fontSize: "0.7rem",
                  fontWeight: 600,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: "0 5px",
                  border: "2px solid var(--bs-body-bg)",
                }}
              >
                {newMessagesCount > 99 ? "99+" : newMessagesCount}
              </span>
            )}
          </button>
        )}
      </div>
    );
  }
);

MessageList.displayName = "MessageList";

export default MessageList;