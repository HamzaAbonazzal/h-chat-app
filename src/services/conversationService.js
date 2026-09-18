import api from "./api";

export const conversationService = {
  getConversations: async () => {
    const { data } = await api.get("/conversations");
    return data.data;
  },

  createOrGetConversation: async (userId) => {
    const { data } = await api.post("/conversations", { userId });
    return data.data;
  },

  createGroup: async (userIds, name) => {
    const { data } = await api.post("/conversations", {
      userIds,
      name,
      isGroup: true,
    });
    return data.data;
  },

  getConversationById: async (id) => {
    const { data } = await api.get(`/conversations/${id}`);
    return data.data;
  },

  updateGroup: async (id, { name, groupAvatar, description }) => {
    const { data } = await api.put(`/conversations/${id}`, {
      name,
      groupAvatar,
      description,
    });
    return data.data;
  },

  addParticipant: async (id, userId) => {
    const { data } = await api.post(`/conversations/${id}/participants`, {
      userId,
    });
    return data.data;
  },

  removeParticipant: async (id, userId) => {
    const { data } = await api.delete(
      `/conversations/${id}/participants/${userId}`,
    );
    return data.data;
  },

  leaveGroup: async (id) => {
    const { data } = await api.post(`/conversations/${id}/leave`);
    return data;
  },

  deleteGroup: async (id) => {
    const { data } = await api.delete(`/conversations/${id}/group`);
    return data;
  },

  promoteToAdmin: async (id, userId) => {
    const { data } = await api.post(`/conversations/${id}/admins`, {
      userId,
    });
    return data.data;
  },

  demoteFromAdmin: async (id, userId) => {
    const { data } = await api.delete(`/conversations/${id}/admins/${userId}`);
    return data.data;
  },

  updatePermissions: async (id, permissions) => {
    const { data } = await api.put(
      `/conversations/${id}/permissions`,
      permissions,
    );
    return data.data;
  },

  // ⭐ جديد: تنظيم المحادثة
  togglePin: async (id) => {
    const { data } = await api.put(`/conversations/${id}/pin`);
    return data.data;
  },

  toggleMute: async (id, duration = null) => {
    const { data } = await api.put(`/conversations/${id}/mute`, {
      duration,
    });
    return data.data;
  },

  toggleArchive: async (id) => {
    const { data } = await api.put(`/conversations/${id}/archive`);
    return data.data;
  },

  deleteConversation: async (id) => {
    const { data } = await api.delete(`/conversations/${id}`);
    return data;
  },
  updateDisappearing: async (id, duration) => {
    const { data } = await api.put(`/conversations/${id}/disappearing`, {
      duration,
    });
    return data.data;
  },
};
