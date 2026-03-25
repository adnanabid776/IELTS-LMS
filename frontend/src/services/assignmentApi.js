import apiClient from "./apiClient";

// ==========================================
// ASSIGNMENT APIs
// ==========================================

export const createAssignment = async (assignmentData) => {
  try {
    const response = await apiClient.post("/assignments", assignmentData);
    return response.data;
  } catch (error) {
    console.error("Create assignment error:", error);
    throw error;
  }
};

export const getTeacherAssignments = async () => {
  try {
    const response = await apiClient.get("/assignments/teacher");
    return response.data;
  } catch (error) {
    console.error("Get teacher assignments error:", error);
    throw error;
  }
};

export const getAssignedTests = async (status = null) => {
  try {
    const url = status
      ? `/assignments/student?status=${status}`
      : "/assignments/student";
    const response = await apiClient.get(url);
    return response.data;
  } catch (error) {
    console.error("Get assigned tests error:", error);
    throw error;
  }
};

export const getAssignmentById = async (assignmentId) => {
  try {
    const response = await apiClient.get(`/assignments/${assignmentId}`);
    return response.data;
  } catch (error) {
    console.error("Get assignment error:", error);
    throw error;
  }
};

export const updateSubmissionStatus = async (
  assignmentId,
  sessionId,
  resultId,
  status,
) => {
  try {
    const response = await apiClient.put("/assignments/submission", {
      assignmentId,
      sessionId,
      resultId,
      status,
    });
    return response.data;
  } catch (error) {
    console.error("Update submission status error:", error);
    throw error;
  }
};

export const reviewSubmission = async (assignmentId, studentId, comments) => {
  try {
    const response = await apiClient.post("/assignments/review", {
      assignmentId,
      studentId,
      comments,
    });
    return response.data;
  } catch (error) {
    console.error("Review submission error:", error);
    throw error;
  }
};

export const getAssignmentStats = async (assignmentId) => {
  try {
    const response = await apiClient.get(
      `/assignments/${assignmentId}/stats`,
    );
    return response.data;
  } catch (error) {
    console.error("Get assignment stats error:", error);
    throw error;
  }
};

export const deleteAssignment = async (assignmentId) => {
  try {
    const response = await apiClient.delete(`/assignments/${assignmentId}`);
    return response.data;
  } catch (error) {
    console.error("Delete assignment error:", error);
    throw error;
  }
};
