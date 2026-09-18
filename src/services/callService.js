import api from "./api";

export const callService = {
  // ⭐ جلب سجل المكالمات
  getCallLogs: async (page = 1, limit = 50) => {
    const { data } = await api.get("/calls", {
      params: { page, limit },
    });
    return data;
  },

  // ⭐ حذف سجل مكالمة
  deleteCallLog: async (callId) => {
    const { data } = await api.delete(`/calls/${callId}`);
    return data;
  },

  // ⭐ حذف كل السجل
  clearCallLogs: async () => {
    const { data } = await api.delete("/calls");
    return data;
  },

  // ⭐ جلب ICE servers من الخادم
  getIceServers: async () => {
    const { data } = await api.get("/ice-servers");
    return data.data;
  },
};
