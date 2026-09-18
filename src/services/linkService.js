import api from "./api";

export const linkService = {
  // ⭐ جلب معاينة الرابط
  getPreview: async (url) => {
    const { data } = await api.post("/link-preview", { url });
    return data.data;
  },
};

// ⭐ استخراج أول رابط من النص
export const extractFirstUrl = (text) => {
  if (!text) return null;
  const urlRegex = /(https?:\/\/[^\s<>"']+)/i;
  const match = text.match(urlRegex);
  return match ? match[1] : null;
};
