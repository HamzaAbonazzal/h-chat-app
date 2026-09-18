import api from "./api";

export const blockService = {
  blockUser: async (userId) => {
    const { data } = await api.post("/blocks", { userId });
    return data.data;
  },

  unblockUser: async (userId) => {
    const { data } = await api.delete(`/blocks/${userId}`);
    return data;
  },

  getBlockedUsers: async () => {
    const { data } = await api.get("/blocks");
    return data.data;
  },

  checkBlockStatus: async (userId) => {
    const { data } = await api.get(`/blocks/check/${userId}`);
    return data.data;
  },
};
