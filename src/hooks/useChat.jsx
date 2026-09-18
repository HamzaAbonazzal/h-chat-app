import { useState, useEffect, useCallback, useRef } from "react";
import { useSocket } from "./useSocket";
import { useAuth } from "./useAuth";
import { messageService } from "../services/messageService";
import { uploadService } from "../services/uploadService";

const sanitizeMessages = (msgs) => {
  if (!Array.isArray(msgs)) return [];
  return msgs.filter(
    (m) =>
      m &&
      typeof m === "object" &&
      m._id &&
      (m.sender || m.type === "system")
  );
};

const filterExpired = (msgs) => {
  const now = Date.now();
  return msgs.filter(
    (m) => !m.expiresAt || new Date(m.expiresAt).getTime() > now
  );
};

export const useChat = (conversationId) => {
  const { user } = useAuth();
  const { emit, on } = useSocket();

  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(1);
  const [typingUsers, setTypingUsers] = useState({});
  const [sending, setSending] = useState(false);
  const [contextMode, setContextMode] = useState(false);
  const [pinnedMessages, setPinnedMessages] = useState([]);
  const [pendingUploads, setPendingUploads] = useState([]);

  // ⭐ ID أول رسالة غير مقروءة (للفاصل)
  const [firstUnreadMessageId, setFirstUnreadMessageId] = useState(null);

  const typingTimeoutRef = useRef(null);
  const isTypingRef = useRef(false);
  const conversationIdRef = useRef(conversationId);
  // ⭐ Map: messageId -> localBlobUrl
  const localMediaCacheRef = useRef(new Map());

  useEffect(() => {
    conversationIdRef.current = conversationId;
  }, [conversationId]);

  // ⭐ تحميل الرسائل عند تغيير المحادثة
  useEffect(() => {
    if (!conversationId) {
      setMessages([]);
      setPinnedMessages([]);
      setPage(1);
      setHasMore(true);
      setContextMode(false);
      setFirstUnreadMessageId(null);
      return;
    }

    const loadMessages = async () => {
      setLoading(true);
      setMessages([]);
      setPinnedMessages([]);
      setPage(1);
      setHasMore(true);
      setContextMode(false);
      setFirstUnreadMessageId(null);

      try {
        const [messagesRes, pinnedRes] = await Promise.all([
          messageService.getMessages(conversationId, 1, 30),
          messageService.getPinnedMessages(conversationId),
        ]);

        let cleaned = filterExpired(sanitizeMessages(messagesRes.data || []));

        // ⭐ استعد local URLs من الكاش
        cleaned = cleaned.map((m) => {
          const localUrl = localMediaCacheRef.current.get(m._id);
          if (localUrl) {
            return { ...m, _localPreviewUrl: localUrl };
          }
          return m;
        });

        setMessages(cleaned);
        setPinnedMessages(pinnedRes || []);
        if (!messagesRes.data || messagesRes.data.length < 30)
          setHasMore(false);

        // ⭐ البحث عن أول رسالة غير مقروءة
        const uid = user._id.toString();
        const firstUnread = cleaned.find((m) => {
          if (m.type === "system" || !m.sender) return false;
          const senderId =
            typeof m.sender === "object" ? m.sender._id : m.sender;
          if (senderId?.toString() === uid) return false;

          const readByIds = (m.readBy || []).map((id) =>
            typeof id === "object" ? id._id?.toString() : id.toString()
          );
          return !readByIds.includes(uid);
        });

        setFirstUnreadMessageId(firstUnread?._id || null);

        emit("joinConversation", conversationId);
        emit("conversationOpened", { conversationId, userId: user._id });
      } catch (err) {
        console.error("Failed to load messages:", err);
      } finally {
        setLoading(false);
      }
    };

    loadMessages();

    return () => {
      emit("leaveConversation", conversationId);
      setTypingUsers({});
      setFirstUnreadMessageId(null);
    };
  }, [conversationId, user?._id, emit]);

  // ⭐ الاستماع لأحداث Socket
  useEffect(() => {
    if (!conversationId) return;

    const offNewMessage = on("newMessage", (message) => {
      if (!message || !message._id) return;
      if (!message.sender && message.type !== "system") return;

      const msgConvId = message.conversation?._id || message.conversation;
      if (msgConvId !== conversationId) return;

      if (
        message.expiresAt &&
        new Date(message.expiresAt).getTime() <= Date.now()
      ) {
        return;
      }

      setMessages((prev) => {
        if (prev.some((m) => m._id === message._id)) return prev;
        return [...prev, message];
      });

      if (message.sender?._id && message.sender._id !== user._id) {
        emit("messageDelivered", {
          messageIds: [message._id],
          userId: user._id,
        });
        emit("messageRead", {
          messageIds: [message._id],
          userId: user._id,
        });
      }

      if (message.sender?._id) {
        setTypingUsers((prev) => {
          const next = { ...prev };
          delete next[message.sender._id];
          return next;
        });
      }
    });

    const offDelivered = on("messageDelivered", ({ messageId }) => {
      if (!messageId) return;
      setMessages((prev) =>
        prev.map((m) =>
          m._id === messageId
            ? {
                ...m,
                deliveredTo: [...(m.deliveredTo || []), user._id],
                status: "delivered",
              }
            : m
        )
      );
    });

    const offRead = on("messageRead", ({ messageId }) => {
      if (!messageId) return;
      setMessages((prev) =>
        prev.map((m) =>
          m._id === messageId ? { ...m, status: "read" } : m
        )
      );
    });

    const offMessagesRead = on(
      "messagesRead",
      ({ conversationId: convId, messageIds }) => {
        if (convId !== conversationId) return;
        if (!Array.isArray(messageIds)) return;
        const idsSet = new Set(messageIds);
        setMessages((prev) =>
          prev.map((m) =>
            idsSet.has(m._id) ? { ...m, status: "read" } : m
          )
        );
      }
    );

    const offEdited = on(
      "messageEdited",
      ({ messageId, conversationId: convId, content, editedAt }) => {
        if (convId !== conversationId) return;
        if (!messageId) return;
        setMessages((prev) =>
          prev.map((m) =>
            m._id === messageId ? { ...m, content, editedAt } : m
          )
        );
      }
    );

    const offDeleted = on(
      "messageDeleted",
      ({ messageId, conversationId: convId, forEveryone }) => {
        if (convId !== conversationId) return;
        if (!messageId) return;

        if (forEveryone) {
          setMessages((prev) =>
            prev.map((m) => {
              if (m._id === messageId) {
                return {
                  ...m,
                  isDeleted: true,
                  content: "",
                  mediaUrl: "",
                  reactions: [],
                };
              }
              if (m.replyTo) {
                const replyToId =
                  typeof m.replyTo === "object" ? m.replyTo._id : m.replyTo;
                if (replyToId === messageId && typeof m.replyTo === "object") {
                  return {
                    ...m,
                    replyTo: {
                      ...m.replyTo,
                      isDeleted: true,
                      content: "",
                      mediaUrl: "",
                    },
                  };
                }
              }
              return m;
            })
          );

          setPinnedMessages((prev) =>
            prev.filter((p) => p._id !== messageId)
          );
        }
      }
    );

    const offReaction = on(
      "messageReaction",
      ({ messageId, conversationId: convId, reactions }) => {
        if (convId !== conversationId) return;
        if (!messageId || !Array.isArray(reactions)) return;

        setMessages((prev) =>
          prev.map((m) => (m._id === messageId ? { ...m, reactions } : m))
        );

        setPinnedMessages((prev) =>
          prev.map((m) => (m._id === messageId ? { ...m, reactions } : m))
        );
      }
    );

    const offCleared = on(
      "conversationCleared",
      ({ conversationId: convId }) => {
        if (convId !== conversationId) return;
        setMessages([]);
        setPinnedMessages([]);
        setContextMode(false);
        setFirstUnreadMessageId(null);
      }
    );

    const offPinned = on(
      "messagePinned",
      ({ conversationId: convId, isPinned, messageId, systemMessage }) => {
        if (convId !== conversationId) return;

        if (systemMessage && systemMessage._id) {
          setMessages((prev) => {
            if (prev.some((m) => m._id === systemMessage._id)) return prev;
            return [...prev, systemMessage];
          });
        }

        if (isPinned) {
          messageService
            .getPinnedMessages(conversationId)
            .then((data) => setPinnedMessages(data || []))
            .catch((err) =>
              console.error("Failed to refresh pinned:", err)
            );
        } else {
          setPinnedMessages((prev) =>
            prev.filter((m) => m._id !== messageId)
          );
        }
      }
    );

    const offTyping = on(
      "typing",
      ({ conversationId: convId, userId, username }) => {
        if (convId !== conversationId || userId === user._id) return;
        if (!userId) return;
        setTypingUsers((prev) => ({ ...prev, [userId]: username }));
      }
    );

    const offStopTyping = on(
      "stopTyping",
      ({ conversationId: convId, userId }) => {
        if (convId !== conversationId) return;
        if (!userId) return;
        setTypingUsers((prev) => {
          const next = { ...prev };
          delete next[userId];
          return next;
        });
      }
    );

    return () => {
      offNewMessage?.();
      offDelivered?.();
      offRead?.();
      offMessagesRead?.();
      offEdited?.();
      offDeleted?.();
      offReaction?.();
      offCleared?.();
      offPinned?.();
      offTyping?.();
      offStopTyping?.();
    };
  }, [conversationId, user?._id, on, emit]);

  // ⭐ تحميل سياق رسالة
  const loadContext = useCallback(
    async (messageId) => {
      if (!conversationId) return null;

      setLoading(true);
      try {
        const res = await messageService.getMessageContext(messageId);
        setMessages(filterExpired(sanitizeMessages(res.data || [])));
        setContextMode(true);
        return res.targetId;
      } catch (err) {
        console.error("Failed to load context:", err);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [conversationId]
  );

  const exitContext = useCallback(async () => {
    if (!conversationId) return;

    setContextMode(false);
    setLoading(true);
    try {
      const res = await messageService.getMessages(conversationId, 1, 30);
      setMessages(filterExpired(sanitizeMessages(res.data || [])));
      setPage(1);
      setHasMore(!res.data || res.data.length >= 30);
    } catch (err) {
      console.error("Failed to reload messages:", err);
    } finally {
      setLoading(false);
    }
  }, [conversationId]);

  const clearChat = useCallback(async () => {
    if (!conversationId) return;

    try {
      await messageService.clearConversation(conversationId);
      setMessages([]);
      setPinnedMessages([]);
      setContextMode(false);
      setPage(1);
      setHasMore(false);
      setFirstUnreadMessageId(null);
    } catch (err) {
      console.error("Failed to clear conversation:", err);
      throw err;
    }
  }, [conversationId]);

  // ⭐ مسح فاصل الرسائل الجديدة
  const clearFirstUnread = useCallback(() => {
    setFirstUnreadMessageId(null);
  }, []);

  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore || !conversationId || contextMode) return;

    setLoadingMore(true);
    try {
      const nextPage = page + 1;
      const res = await messageService.getMessages(
        conversationId,
        nextPage,
        30
      );

      if (!res.data || res.data.length < 30) setHasMore(false);

      let newMessages = filterExpired(sanitizeMessages(res.data || []));
      newMessages = newMessages.map((m) => {
        const localUrl = localMediaCacheRef.current.get(m._id);
        if (localUrl) return { ...m, _localPreviewUrl: localUrl };
        return m;
      });

      setMessages((prev) => [...newMessages, ...prev]);
      setPage(nextPage);
    } catch (err) {
      console.error("Failed to load more:", err);
    } finally {
      setLoadingMore(false);
    }
  }, [conversationId, page, loadingMore, hasMore, contextMode]);

  const sendMessage = useCallback(
    async (content, options = {}) => {
      if (!content.trim() || !conversationId) return;

      setSending(true);
      try {
        const message = await messageService.sendMessage({
          conversationId,
          content: content.trim(),
          type: "text",
          replyToId: options.replyToId || null,
          linkPreview: options.linkPreview || null,
        });

        if (!message || !message._id) return;

        if (contextMode) setContextMode(false);

        setMessages((prev) => {
          if (prev.some((m) => m._id === message._id)) return prev;
          return [...prev, message];
        });

        return message;
      } catch (err) {
        console.error("Failed to send message:", err);
        throw err;
      } finally {
        setSending(false);
      }
    },
    [conversationId, contextMode]
  );

  const sendMediaMessage = useCallback(
    async (file, type, duration = 0, options = {}) => {
      const targetConversationId = conversationId;
      if (!targetConversationId) return;

      const localPreviewUrl = URL.createObjectURL(file);
      const tempId = `temp-${Date.now()}-${Math.random()
        .toString(36)
        .substring(2, 8)}`;

      const pendingMessage = {
        _id: tempId,
        _isPending: true,
        _uploadProgress: 0,
        _localPreviewUrl: localPreviewUrl,
        conversation: targetConversationId,
        sender: user,
        content: "",
        type,
        mediaUrl: localPreviewUrl,
        duration,
        createdAt: new Date().toISOString(),
        reactions: [],
        deliveredTo: [],
        readBy: [],
      };

      setPendingUploads((prev) => [...prev, pendingMessage]);

      try {
        const uploaded = await uploadService.uploadFile(file, (percent) => {
          setPendingUploads((prev) =>
            prev.map((m) =>
              m._id === tempId ? { ...m, _uploadProgress: percent } : m
            )
          );
        });

        const message = await messageService.sendMessage({
          conversationId: targetConversationId,
          content: "",
          type,
          mediaUrl: uploaded.url,
          duration,
          replyToId: options.replyToId || null,
        });

        setPendingUploads((prev) => prev.filter((m) => m._id !== tempId));

        if (!message || !message._id) return;

        // ⭐ احفظ local URL
        localMediaCacheRef.current.set(message._id, localPreviewUrl);

        const messageWithLocal = {
          ...message,
          _localPreviewUrl: localPreviewUrl,
        };

        if (conversationIdRef.current === targetConversationId) {
          if (contextMode) setContextMode(false);

          setMessages((prev) => {
            if (prev.some((m) => m._id === message._id)) return prev;
            return [...prev, messageWithLocal];
          });
        }

        return message;
      } catch (err) {
        console.error("Failed to send media:", err);
        URL.revokeObjectURL(localPreviewUrl);
        setPendingUploads((prev) => prev.filter((m) => m._id !== tempId));
        throw err;
      }
    },
    [conversationId, user, contextMode]
  );

  const forwardMessage = useCallback(
    async (messageId, targetConversationId) => {
      try {
        const message = await messageService.forwardMessage(
          messageId,
          targetConversationId
        );
        if (!message || !message._id) return;

        if (targetConversationId === conversationId) {
          setMessages((prev) => {
            if (prev.some((m) => m._id === message._id)) return prev;
            return [...prev, message];
          });
        }
        return message;
      } catch (err) {
        console.error("Failed to forward:", err);
        throw err;
      }
    },
    [conversationId]
  );

  const editMessage = useCallback(async (messageId, newContent) => {
    try {
      const updated = await messageService.editMessage(messageId, newContent);
      if (!updated) return;
      setMessages((prev) =>
        prev.map((m) =>
          m._id === messageId
            ? { ...m, content: updated.content, editedAt: updated.editedAt }
            : m
        )
      );
      return updated;
    } catch (err) {
      console.error("Failed to edit message:", err);
      throw err;
    }
  }, []);

  const deleteMessage = useCallback(async (messageId, forEveryone = false) => {
    try {
      await messageService.deleteMessage(messageId, forEveryone);

      if (forEveryone) {
        setMessages((prev) =>
          prev.map((m) =>
            m._id === messageId
              ? {
                  ...m,
                  isDeleted: true,
                  content: "",
                  mediaUrl: "",
                  reactions: [],
                }
              : m
          )
        );
        setPinnedMessages((prev) => prev.filter((m) => m._id !== messageId));
      } else {
        setMessages((prev) => prev.filter((m) => m._id !== messageId));
      }
    } catch (err) {
      console.error("Failed to delete message:", err);
      throw err;
    }
  }, []);

  const toggleReaction = useCallback(async (messageId, emoji) => {
    try {
      const result = await messageService.toggleReaction(messageId, emoji);
      setMessages((prev) =>
        prev.map((m) =>
          m._id === messageId ? { ...m, reactions: result.reactions } : m
        )
      );
      return result;
    } catch (err) {
      console.error("Failed to toggle reaction:", err);
      throw err;
    }
  }, []);

  const toggleStar = useCallback(async (messageId) => {
    try {
      const result = await messageService.toggleStar(messageId);
      setMessages((prev) =>
        prev.map((m) =>
          m._id === messageId ? { ...m, isStarred: result.isStarred } : m
        )
      );
      return result;
    } catch (err) {
      console.error("Failed to toggle star:", err);
      throw err;
    }
  }, []);

  const togglePinMessage = useCallback(
    async (messageId) => {
      try {
        const result = await messageService.togglePin(messageId);
        if (result.isPinned) {
          const data = await messageService.getPinnedMessages(conversationId);
          setPinnedMessages(data || []);
        } else {
          setPinnedMessages((prev) => prev.filter((m) => m._id !== messageId));
        }
        return result;
      } catch (err) {
        console.error("Failed to pin message:", err);
        throw err;
      }
    },
    [conversationId]
  );

  const refreshPinnedMessages = useCallback(async () => {
    if (!conversationId) return;
    try {
      const data = await messageService.getPinnedMessages(conversationId);
      setPinnedMessages(data || []);
    } catch (err) {
      console.error("Failed to refresh pinned:", err);
    }
  }, [conversationId]);

  const startTyping = useCallback(() => {
    if (!conversationId) return;

    if (!isTypingRef.current) {
      isTypingRef.current = true;
      emit("typing", {
        conversationId,
        userId: user._id,
        username: user.username,
      });
    }

    clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      isTypingRef.current = false;
      emit("stopTyping", { conversationId, userId: user._id });
    }, 2000);
  }, [conversationId, user?._id, user?.username, emit]);

  const stopTyping = useCallback(() => {
    if (!conversationId) return;
    clearTimeout(typingTimeoutRef.current);
    if (isTypingRef.current) {
      isTypingRef.current = false;
      emit("stopTyping", { conversationId, userId: user._id });
    }
  }, [conversationId, user?._id, emit]);

  return {
    messages,
    pendingUploads: pendingUploads.filter(
      (p) => p.conversation === conversationId
    ),
    // ⭐ جديد: فاصل الرسائل الجديدة
    firstUnreadMessageId,
    clearFirstUnread,
    loading,
    loadingMore,
    hasMore,
    sending,
    typingUsers,
    contextMode,
    pinnedMessages,
    sendMessage,
    sendMediaMessage,
    forwardMessage,
    editMessage,
    deleteMessage,
    toggleReaction,
    toggleStar,
    togglePinMessage,
    refreshPinnedMessages,
    loadContext,
    exitContext,
    clearChat,
    loadMore,
    startTyping,
    stopTyping,
  };
};