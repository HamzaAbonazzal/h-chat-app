import api from "./api";

export const authService = {
  register: async (username, email, password) => {
    const { data } = await api.post("/auth/register", {
      username,
      email,
      password,
    });
    return data.data;
  },

  login: async (email, password) => {
    const { data } = await api.post("/auth/login", { email, password });
    return data.data;
  },

  logout: async () => {
    const refreshToken = localStorage.getItem("refreshToken");
    if (refreshToken) {
      await api.post("/auth/logout", { refreshToken });
    }
  },

  getMe: async () => {
    const { data } = await api.get("/auth/me");
    return data.data;
  },
};
