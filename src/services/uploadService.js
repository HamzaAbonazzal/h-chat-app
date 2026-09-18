import api from "./api";

export const uploadService = {
  uploadFile: async (file, onProgress) => {
    const formData = new FormData();
    formData.append("file", file);

    const { data } = await api.post("/upload", formData, {
      headers: { "Content-Type": "multipart/form-data" },
      onUploadProgress: (progressEvent) => {
        if (onProgress) {
          const percent = Math.round(
            (progressEvent.loaded * 100) / progressEvent.total,
          );
          onProgress(percent);
        }
      },
    });

    return data.data;
  },
};
