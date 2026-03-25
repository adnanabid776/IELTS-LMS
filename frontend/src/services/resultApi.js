import apiClient from "./apiClient";

// ==========================================
// RESULT APIs
// ==========================================

export const submitTestResult = async (sessionId) => {
  const response = await apiClient.post("/results/submit", { sessionId });
  return response.data;
};

export const getResultById = async (resultId) => {
  try {
    const response = await apiClient.get(`/results/${resultId}`);
    return response.data;
  } catch (error) {
    console.error("Get result by ID error:", error);
    throw error;
  }
};

export const getUserResults = async (module = null) => {
  try {
    const url = module
      ? `/results/my-results?module=${module}`
      : "/results/my-results";
    const response = await apiClient.get(url);
    return response.data;
  } catch (error) {
    console.error("Get user results error:", error);
    throw error;
  }
};

export const getStudentAnalytics = async () => {
  try {
    const response = await apiClient.get("/results/analytics");
    return response.data;
  } catch (error) {
    console.error("Get analytics error:", error);
    throw error;
  }
};

export const getDetailedResult = async (resultId) => {
  try {
    const response = await apiClient.get(`/results/${resultId}/detailed`);
    return response.data;
  } catch (error) {
    console.error("Get detailed result error:", error);
    throw error;
  }
};
