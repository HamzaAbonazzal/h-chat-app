import api from "./api";

export const userService = {
  searchUsers: async (search = "") => {
    const { data } = await api.get("/users", { params: { search } });
    return data.data;
  },

  getUserById: async (userId) => {
    const { data } = await api.get(`/users/${userId}`);
    return data.data;
  },

  updateProfile: async ({ username, bio, avatar }) => {
    const { data } = await api.put("/users/profile", {
      username,
      bio,
      avatar,
    });
    return data.data;
  },

  updatePassword: async (currentPassword, newPassword) => {
    const { data } = await api.put("/users/password", {
      currentPassword,
      newPassword,
    });
    return data;
  },

  updatePrivacy: async (privacy) => {
    const { data } = await api.put("/users/privacy", privacy);
    return data.data;
  },

  getUserStatus: async (userId) => {
    const { data } = await api.get(`/users/${userId}/status`);
    return data.data;
  },

  getUsersStatus: async (userIds) => {
    const { data } = await api.post("/users/status", { userIds });
    return data.data;
  },
  deleteAccount: async (password, reason = "") => {
    const { data } = await api.delete("/users/me", {
      data: { password, reason },
    });
    return data;
  },
};
