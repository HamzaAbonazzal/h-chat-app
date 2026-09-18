import api from "./api";

export const messageService = {
  getMessages: async (conversationId, page = 1, limit = 30) => {
    const { data } = await api.get(`/messages/${conversationId}`, {
      params: { page, limit },
    });
    return data;
  },

  sendMessage: async ({
    conversationId,
    content,
    type = "text",
    mediaUrl,
    duration,
    replyToId = null,
    linkPreview = null,
  }) => {
    const { data } = await api.post("/messages", {
      conversationId,
      content,
      type,
      mediaUrl,
      duration,
      replyToId,
      linkPreview,
    });
    return data.data;
  },

  forwardMessage: async (messageId, conversationId) => {
    const { data } = await api.post("/messages/forward", {
      messageId,
      conversationId,
    });
    return data.data;
  },

  editMessage: async (messageId, content) => {
    const { data } = await api.put(`/messages/${messageId}`, { content });
    return data.data;
  },

  toggleReaction: async (messageId, emoji) => {
    const { data } = await api.post(`/messages/${messageId}/reactions`, {
      emoji,
    });
    return data.data;
  },

  // ⭐ تبديل النجمة
  toggleStar: async (messageId) => {
    const { data } = await api.put(`/messages/${messageId}/star`);
    return data.data;
  },

  // ⭐ جلب الرسائل المحفوظة
  getStarredMessages: async (page = 1, limit = 30, conversationId = null) => {
    const { data } = await api.get("/messages/starred", {
      params: { page, limit, ...(conversationId && { conversationId }) },
    });
    return data;
  },

  getMessageInfo: async (messageId) => {
    const { data } = await api.get(`/messages/${messageId}/info`);
    return data.data;
  },

  searchInConversation: async (conversationId, query, page = 1, limit = 30) => {
    const { data } = await api.get(`/messages/${conversationId}/search`, {
      params: { q: query, page, limit },
    });
    return data;
  },

  searchAll: async (query, page = 1, limit = 20) => {
    const { data } = await api.get("/messages/search/all", {
      params: { q: query, page, limit },
    });
    return data;
  },

  markAsDelivered: async (messageIds) => {
    const { data } = await api.post("/messages/delivered", { messageIds });
    return data;
  },

  markAsRead: async (messageIds) => {
    const { data } = await api.post("/messages/read", { messageIds });
    return data;
  },

  markConversationAsRead: async (conversationId) => {
    const { data } = await api.put(`/messages/${conversationId}/read-all`);
    return data;
  },

  deleteMessage: async (messageId, forEveryone = false) => {
    const { data } = await api.delete(`/messages/${messageId}`, {
      params: { forEveryone },
    });
    return data;
  },
  // ⭐ سياق رسالة
  getMessageContext: async (messageId, limit = 15) => {
    const { data } = await api.get(`/messages/${messageId}/context`, {
      params: { limit },
    });
    return data;
  },

  // ⭐ مسح محادثة
  clearConversation: async (conversationId) => {
    const { data } = await api.delete(
      `/messages/conversation/${conversationId}/clear`,
    );
    return data;
  },

  // ⭐ تثبيت رسالة
  togglePin: async (messageId) => {
    const { data } = await api.put(`/messages/${messageId}/pin`);
    return data.data;
  },

  // ⭐ جلب الرسائل المثبتة
  getPinnedMessages: async (conversationId) => {
    const { data } = await api.get(`/messages/${conversationId}/pinned`);
    return data.data;
  },
};
