import apiClient from "./apiClient";

// ==========================================
// AUTH & USER APIs
// ==========================================

export const loginUser = async (email, password) => {
  const response = await apiClient.post("/auth/login", { email, password });
  return response.data;
};

export const registerUser = async (userData) => {
  const response = await apiClient.post("/auth/register", userData);
  return response.data;
};

export const getCurrUser = async () => {
  const response = await apiClient.get("/auth/me");
  return response.data;
};

export const updateUserProfile = async (firstName, lastName) => {
  const response = await apiClient.put("/auth/update", {
    firstName,
    lastName,
  });
  return response.data;
};

// ==========================================
// TEACHER - STUDENT MANAGEMENT
// ==========================================

export const getAllStudents = async () => {
  try {
    const response = await apiClient.get("/auth/students");
    return response.data;
  } catch (error) {
    console.error("Get all students error:", error);
    throw error;
  }
};

export const getStudentDetails = async (studentId) => {
  try {
    const response = await apiClient.get(`/auth/student/${studentId}`);
    return response.data;
  } catch (error) {
    console.error("Get student details error:", error);
    throw error;
  }
};

// ==========================================
// TEACHER DASHBOARD
// ==========================================

export const getTeacherDashboardStats = async () => {
  try {
    const response = await apiClient.get("/auth/teacher/dashboard-stats");
    return response.data;
  } catch (error) {
    console.error("Get teacher dashboard stats error:", error);
    throw error;
  }
};

export const getTeacherPendingReviews = async () => {
  try {
    const response = await apiClient.get("/auth/teacher/pending-reviews");
    return response.data;
  } catch (error) {
    console.error("Get teacher pending reviews error:", error);
    throw error;
  }
};

// ==========================================
// ADMIN - USER MANAGEMENT
// ==========================================

export const getAllUsersAdmin = async (filters = {}) => {
  try {
    const queryParams = new URLSearchParams(filters).toString();
    const response = await apiClient.get(
      `/auth/admin/users${queryParams ? `?${queryParams}` : ""}`,
    );
    return response.data;
  } catch (error) {
    console.error("Fetching users data error: ", error);
    throw error;
  }
};

export const getUserByIdAdmin = async (userId) => {
  try {
    const response = await apiClient.get(`/auth/admin/users/${userId}`);
    return response.data;
  } catch (error) {
    console.error("Get user by id error: ", error);
    throw error;
  }
};

export const createUserAdmin = async (userData) => {
  try {
    const response = await apiClient.post("/auth/admin/users", userData);
    return response.data;
  } catch (error) {
    console.error("create user by admin error: ", error);
    throw error;
  }
};

export const updateUserAdmin = async (userId, userData) => {
  try {
    const response = await apiClient.put(
      `/auth/admin/users/${userId}`,
      userData,
    );
    return response.data;
  } catch (error) {
    console.error("update user error:", error);
    throw error;
  }
};

export const deleteUserAdmin = async (userId) => {
  try {
    const response = await apiClient.delete(`/auth/admin/users/${userId}`);
    return response.data;
  } catch (error) {
    console.error("Delete user error:", error);
    throw error;
  }
};

export const getAdminDashboardStats = async () => {
  try {
    const response = await apiClient.get("/auth/admin/dashboard-stats");
    return response.data;
  } catch (error) {
    console.error("Get admin dashboard stats error:", error);
    throw error;
  }
};
