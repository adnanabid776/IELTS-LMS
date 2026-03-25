import apiClient from "./apiClient";

// ==========================================
// QUESTION APIs
// ==========================================

export const getQuestionsBySectionId = async (sectionId) => {
  try {
    const response = await apiClient.get(`/questions/section/${sectionId}`);
    return response.data;
  } catch (error) {
    console.error("Get Sections error:", error);
    throw error;
  }
};

export const getAllQuestions = async (filters = {}) => {
  try {
    const queryParams = new URLSearchParams(filters).toString();
    const response = await apiClient.get(
      `/questions/admin/all${queryParams ? `?${queryParams}` : ""}`,
    );
    return response.data;
  } catch (error) {
    console.error("Get all questions error:", error);
    throw error;
  }
};

export const getQuestionStats = async () => {
  try {
    const response = await apiClient.get("/questions/admin/stats");
    return response.data;
  } catch (error) {
    console.error("Get question stats error:", error);
    throw error;
  }
};

export const getSectionsForDropdown = async (testId = null) => {
  try {
    const url = testId
      ? `/questions/admin/sections?testId=${testId}`
      : "/questions/admin/sections";
    const response = await apiClient.get(url);
    return response.data;
  } catch (error) {
    console.error("Get sections for dropdown error:", error);
    throw error;
  }
};

export const getQuestionById = async (questionId) => {
  try {
    const response = await apiClient.get(`/questions/${questionId}`);
    return response.data;
  } catch (error) {
    console.error("Get question by ID error:", error);
    throw error;
  }
};

export const createQuestion = async (questionData) => {
  try {
    const response = await apiClient.post("/questions", questionData);
    return response.data;
  } catch (error) {
    console.error("Create question error:", error);
    throw error;
  }
};

export const updateQuestion = async (questionId, questionData) => {
  try {
    const response = await apiClient.put(
      `/questions/${questionId}`,
      questionData,
    );
    return response.data;
  } catch (error) {
    console.error("Update question error:", error);
    throw error;
  }
};

export const deleteQuestion = async (questionId) => {
  try {
    const response = await apiClient.delete(`/questions/${questionId}`);
    return response.data;
  } catch (error) {
    console.error("Delete question error:", error);
    throw error;
  }
};

export const bulkDeleteQuestions = async (questionIds) => {
  try {
    const response = await apiClient.post("/questions/bulk-delete", {
      questionIds,
    });
    return response.data;
  } catch (error) {
    console.error("Bulk delete questions error:", error);
    throw error;
  }
};

export const bulkCreateQuestions = async (questionsData) => {
  try {
    const response = await apiClient.post("/questions/bulk", questionsData);
    return response.data;
  } catch (error) {
    console.error("Bulk create questions error:", error);
    throw error;
  }
};

export const getQuestionsBySection = async (sectionId) => {
  try {
    const response = await apiClient.get(`/questions/section/${sectionId}`);
    return response.data;
  } catch (error) {
    console.error("Get questions by section error:", error);
    throw error;
  }
};
