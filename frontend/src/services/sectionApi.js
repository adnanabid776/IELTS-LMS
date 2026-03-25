import apiClient from "./apiClient";

// ==========================================
// SECTION APIs
// ==========================================

export const getSectionsByTestId = async (testId) => {
  try {
    const response = await apiClient.get(`/sections/test/${testId}`);
    return response.data;
  } catch (error) {
    console.error("Get Sections error:", error);
    throw error;
  }
};

export const getSectionById = async (sectionId) => {
  try {
    const response = await apiClient.get(`/sections/${sectionId}`);
    return response.data;
  } catch (error) {
    console.error("Get section error:", error);
    throw error;
  }
};

export const createSection = async (sectionData) => {
  try {
    const response = await apiClient.post("/sections", sectionData);
    return response.data;
  } catch (error) {
    console.error("Create section error:", error);
    throw error;
  }
};

export const updateSection = async (sectionId, sectionData) => {
  try {
    const response = await apiClient.put(
      `/sections/${sectionId}`,
      sectionData,
    );
    return response.data;
  } catch (error) {
    console.error("Update section error:", error);
    throw error;
  }
};

export const deleteSection = async (sectionId) => {
  try {
    const response = await apiClient.delete(`/sections/${sectionId}`);
    return response.data;
  } catch (error) {
    console.error("Delete section error:", error);
    throw error;
  }
};
