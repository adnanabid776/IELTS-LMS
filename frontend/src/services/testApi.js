import apiClient, { handleApiError } from "./apiClient";

// ==========================================
// TEST APIs
// ==========================================

export const getAllTests = async (module = null) => {
  try {
    const url = module ? `/tests?module=${module}` : "/tests";
    const response = await apiClient.get(url);
    return response.data;
  } catch (error) {
    handleApiError(error, "Failed to load tests");
    console.error("Get tests error: ", error);
    throw error;
  }
};

export const getTestById = async (testId) => {
  try {
    const response = await apiClient.get(`/tests/${testId}`);
    return response.data;
  } catch (error) {
    console.error("Get test by id error:", error);
    throw error;
  }
};

export const createTest = async (testData) => {
  try {
    const response = await apiClient.post("/tests", testData);
    return response.data;
  } catch (error) {
    handleApiError(error, "Failed to create test");
    throw error;
  }
};

export const updateTest = async (testId, updatedData) => {
  try {
    const response = await apiClient.put(`/tests/${testId}`, updatedData);
    return response.data;
  } catch (error) {
    handleApiError(error, "Failed to update test");
    throw error;
  }
};

export const deleteTest = async (testId) => {
  try {
    const response = await apiClient.delete(`/tests/${testId}`);
    return response.data;
  } catch (error) {
    handleApiError(error, "Failed to delete test");
    throw error;
  }
};

export const bulkUploadTest = async (testData) => {
  try {
    const response = await apiClient.post("/tests/bulk-upload", testData, {
      headers: {
        "Content-Type": "application/json",
      },
    });
    return response.data;
  } catch (error) {
    handleApiError(error, "Failed to upload test");
    throw error;
  }
};
