import apiClient, { handleApiError } from "./apiClient";

// ==========================================
// MOCK EXAM APIs
// ==========================================

export const getAllMockExams = async () => {
  try {
    const response = await apiClient.get("/mock-exams");
    return response.data;
  } catch (error) {
    handleApiError(error, "Failed to load mock exams");
    throw error;
  }
};

export const getMockExamById = async (id) => {
  try {
    const response = await apiClient.get(`/mock-exams/${id}`);
    return response.data;
  } catch (error) {
    handleApiError(error, "Failed to load mock exam");
    throw error;
  }
};

export const deleteMockExam = async (id) => {
  try {
    const response = await apiClient.delete(`/mock-exams/${id}`);
    return response.data;
  } catch (error) {
    handleApiError(error, "Failed to delete mock exam");
    throw error;
  }
};

export const uploadMockExamJson = async (data) => {
  try {
    const response = await apiClient.post("/mock-exams/upload", data, {
      headers: { "Content-Type": "application/json" },
    });
    return response.data;
  } catch (error) {
    handleApiError(error, "Failed to upload mock exam");
    throw error;
  }
};

// ==========================================
// MOCK RESULT APIs
// ==========================================

export const initializeMockResult = async (mockExamId) => {
  try {
    const response = await apiClient.post("/mock-results/start", { mockExamId });
    return response.data;
  } catch (error) {
    handleApiError(error, "Failed to start mock exam");
    throw error;
  }
};

export const updateMockResultModule = async (data) => {
  try {
    const response = await apiClient.put("/mock-results/update-module", data);
    return response.data;
  } catch (error) {
    handleApiError(error, "Failed to update mock result");
    throw error;
  }
};

export const getAllMockResults = async () => {
  try {
    const response = await apiClient.get("/mock-results");
    return response.data;
  } catch (error) {
    handleApiError(error, "Failed to load mock results");
    throw error;
  }
};

export const getMockResultById = async (id) => {
  try {
    const response = await apiClient.get(`/mock-results/${id}`);
    return response.data;
  } catch (error) {
    handleApiError(error, "Failed to load mock result");
    throw error;
  }
};

export const getMyMockResults = async () => {
  try {
    const response = await apiClient.get("/mock-results/user/my-results");
    return response.data;
  } catch (error) {
    handleApiError(error, "Failed to load your mock results");
    throw error;
  }
};

export const evaluateMockResult = async (mockResultId, data) => {
  try {
    const response = await apiClient.put(`/mock-results/${mockResultId}/evaluate`, data);
    return response.data;
  } catch (error) {
    handleApiError(error, "Failed to evaluate mock result");
    throw error;
  }
};

export const deleteMockResult = async (id) => {
  try {
    const response = await apiClient.delete(`/mock-results/${id}`);
    return response.data;
  } catch (error) {
    handleApiError(error, "Failed to delete mock result");
    throw error;
  }
};
