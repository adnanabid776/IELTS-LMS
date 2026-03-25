import apiClient, { handleApiError } from "./apiClient";

// ==========================================
// FILE UPLOAD APIs
// ==========================================

export const uploadImage = async (file) => {
  try {
    const formData = new FormData();
    formData.append("image", file);

    const response = await apiClient.post("/upload/image", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
    return response.data;
  } catch (error) {
    handleApiError(error, "Failed to upload image");
  }
};

export const uploadAudio = async (file) => {
  try {
    const formData = new FormData();
    formData.append("audio", file);

    const response = await apiClient.post("/upload/audio", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
    return response.data;
  } catch (error) {
    handleApiError(error, "Failed to upload audio");
  }
};
