import axios from "axios";
import { toast } from "react-toastify";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

axios.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      const errorCode = error.response.data?.code;

      if (errorCode === "SESSION_INVALIDATED") {
        toast.error("⚠️ You have been logged in from another device.");
      } else if (errorCode === "TOKEN_EXPIRED") {
        toast.error("Session expired. Please login again.");
      } else {
        toast.error("Please login again.");
      }

      localStorage.removeItem("token");
      localStorage.removeItem("user");

      setTimeout(() => {
        window.location.href = "/";
      }, 2000);
    }

    return Promise.reject(error);
  },
);

//Helper funtion to get the token

const getToken = () => localStorage.getItem("token");

const handleApiError = (error, customMessage) => {
  console.error("API Error:", error);

  if (error.response) {
    const message =
      error.response.data?.error ||
      error.response.data?.message ||
      customMessage;

    // Don't show toast if it's 401 (interceptor handles it)
    if (error.response.status !== 401) {
      toast.error(message);
    }

    // Note: 401 is now handled by interceptor
  } else if (error.request) {
    toast.error(
      "Cannot connect to server. Please check your internet connection.",
    );
  } else {
    toast.error(customMessage || "An unexpected error occurred");
  }

  throw error;
};

//Auth api fetching

export const loginUser = async (email, password) => {
  const response = await axios.post(`${API_URL}/auth/login`, {
    email,
    password,
  });
  return response.data;
};

export const registerUser = async (userData) => {
  const response = await axios.post(`${API_URL}/auth/register`, userData);
  return response.data;
};

export const getCurrUser = async () => {
  const response = await axios.get(`${API_URL}/auth/me`, {
    headers: {
      Authorization: `Bearer ${getToken()}`,
    },
  });
  return response.data;
};
//for updating the profile
export const updateUserProfile = async (firstName, lastName) => {
  const response = await axios.put(
    `${API_URL}/auth/update`,
    { firstName, lastName },
    {
      headers: {
        Authorization: `Bearer ${getToken()}`,
      },
    },
  );
  return response.data;
};

//getting all test
export const getAllTests = async (module = null) => {
  try {
    const url = module
      ? `${API_URL}/tests?module=${module}`
      : `${API_URL}/tests`;
    const response = await axios.get(url, {
      headers: {
        Authorization: `Bearer ${getToken()}`,
      },
    });
    return response.data;
  } catch (error) {
    handleApiError(error, "Failed to load tests");
    console.error("Get tests error: ", error);
    throw error;
  }
};

//getting single test by id (with sections)
export const getTestById = async (testId) => {
  try {
    const response = await axios.get(`${API_URL}/tests/${testId}`, {
      headers: {
        Authorization: `Bearer ${getToken()}`,
      },
    });
    return response.data;
  } catch (error) {
    console.error("Get test by id error:", error);
    throw error;
  }
};

//get sections by testId
export const getSectionsByTestId = async (testId) => {
  try {
    const response = await axios.get(`${API_URL}/sections/test/${testId}`, {
      headers: {
        Authorization: `Bearer ${getToken()}`,
      },
    });
    return response.data;
  } catch (error) {
    console.error("Get Sections error:", error);
    throw error;
  }
};
//get questions by sectionId
export const getQuestionsBySectionId = async (sectionId) => {
  try {
    const response = await axios.get(
      `${API_URL}/questions/section/${sectionId}`,
      {
        headers: {
          Authorization: `Bearer ${getToken()}`,
        },
      },
    );
    return response.data;
  } catch (error) {
    console.error("Get Sections error:", error);
    throw error;
  }
};

export const startTestSession = async (testId) => {
  const response = await axios.post(
    `${API_URL}/sessions/start`,
    { testId },
    {
      headers: {
        Authorization: `Bearer ${getToken()}`,
      },
    },
  );
  return response.data;
};

export const saveAnswer = async (sessionId, questionId, userAnswer) => {
  const response = await axios.post(
    `${API_URL}/sessions/save-answer`,
    { sessionId, questionId, userAnswer },
    {
      headers: {
        Authorization: `Bearer ${getToken()}`,
      },
    },
  );
  return response.data;
};

export const bulkSaveAnswers = async (sessionId, answers) => {
  const response = await axios.post(
    `${API_URL}/sessions/bulk-save`,
    { sessionId, answers },
    {
      headers: {
        Authorization: `Bearer ${getToken()}`,
      },
    },
  );
  return response.data;
};

export const getSession = async (sessionId) => {
  const response = await axios.get(`${API_URL}/sessions/${sessionId}`, {
    headers: {
      Authorization: `Bearer ${getToken()}`,
    },
  });
  return response.data;
};

// ==========================================
// TEACHER - STUDENT MANAGEMENT
// ==========================================

// Get all students (Teacher/Admin)
export const getAllStudents = async () => {
  try {
    const response = await axios.get(`${API_URL}/auth/students`, {
      headers: {
        Authorization: `Bearer ${getToken()}`,
      },
    });
    return response.data;
  } catch (error) {
    console.error("Get all students error:", error);
    throw error;
  }
};

// Get student details with results (Teacher/Admin)
export const getStudentDetails = async (studentId) => {
  try {
    const response = await axios.get(`${API_URL}/auth/student/${studentId}`, {
      headers: {
        Authorization: `Bearer ${getToken()}`,
      },
    });
    return response.data;
  } catch (error) {
    console.error("Get student details error:", error);
    throw error;
  }
};

export const submitTestSession = async (sessionId) => {
  const response = await axios.post(
    `${API_URL}/sessions/submit`,
    { sessionId },
    {
      headers: {
        Authorization: `Bearer ${getToken()}`,
      },
    },
  );
  return response.data;
};

export const submitTestResult = async (sessionId) => {
  const response = await axios.post(
    `${API_URL}/results/submit`,
    { sessionId },
    {
      headers: {
        Authorization: `Bearer ${getToken()}`,
      },
    },
  );
  return response.data;
};

export const getResultById = async (resultId) => {
  try {
    const response = await axios.get(`${API_URL}/results/${resultId}`, {
      headers: {
        Authorization: `Bearer ${getToken()}`,
      },
    });
    return response.data;
  } catch (error) {
    console.error("Get result by ID error:", error);
    throw error;
  }
};

export const getUserResults = async (module = null) => {
  try {
    const url = module
      ? `${API_URL}/results/my-results?module=${module}`
      : `${API_URL}/results/my-results`;
    const response = await axios.get(url, {
      headers: {
        Authorization: `Bearer ${getToken()}`,
      },
    });
    return response.data;
  } catch (error) {
    console.error("Get user results error:", error);
    throw error;
  }
};

// Get student analytics for dashboard
export const getStudentAnalytics = async () => {
  try {
    const response = await axios.get(`${API_URL}/results/analytics`, {
      headers: {
        Authorization: `Bearer ${getToken()}`,
      },
    });
    return response.data;
  } catch (error) {
    console.error("Get analytics error:", error);
    throw error;
  }
};

// Get detailed result with answers
export const getDetailedResult = async (resultId) => {
  try {
    const response = await axios.get(
      `${API_URL}/results/${resultId}/detailed`,
      {
        headers: {
          Authorization: `Bearer ${getToken()}`,
        },
      },
    );
    return response.data;
  } catch (error) {
    console.error("Get detailed result error:", error);
    throw error;
  }
};
// ==========================================
// ASSIGNMENT APIs
// ==========================================

// Teacher: Create new assignment
export const createAssignment = async (assignmentData) => {
  try {
    const response = await axios.post(
      `${API_URL}/assignments`,
      assignmentData,
      {
        headers: {
          Authorization: `Bearer ${getToken()}`,
        },
      },
    );
    return response.data;
  } catch (error) {
    console.error("Create assignment error:", error);
    throw error;
  }
};

// Teacher: Get all my assignments
export const getTeacherAssignments = async () => {
  try {
    const response = await axios.get(`${API_URL}/assignments/teacher`, {
      headers: {
        Authorization: `Bearer ${getToken()}`,
      },
    });
    return response.data;
  } catch (error) {
    console.error("Get teacher assignments error:", error);
    throw error;
  }
};

// Student: Get my assigned tests
export const getAssignedTests = async (status = null) => {
  try {
    const url = status
      ? `${API_URL}/assignments/student?status=${status}`
      : `${API_URL}/assignments/student`;
    const response = await axios.get(url, {
      headers: {
        Authorization: `Bearer ${getToken()}`,
      },
    });
    return response.data;
  } catch (error) {
    console.error("Get assigned tests error:", error);
    throw error;
  }
};

// Get single assignment by ID
export const getAssignmentById = async (assignmentId) => {
  try {
    const response = await axios.get(`${API_URL}/assignments/${assignmentId}`, {
      headers: {
        Authorization: `Bearer ${getToken()}`,
      },
    });
    return response.data;
  } catch (error) {
    console.error("Get assignment error:", error);
    throw error;
  }
};

// Update submission status (when student starts/completes test)
export const updateSubmissionStatus = async (
  assignmentId,
  sessionId,
  resultId,
  status,
) => {
  try {
    const response = await axios.put(
      `${API_URL}/assignments/submission`,
      {
        assignmentId,
        sessionId,
        resultId,
        status,
      },
      {
        headers: {
          Authorization: `Bearer ${getToken()}`,
        },
      },
    );
    return response.data;
  } catch (error) {
    console.error("Update submission status error:", error);
    throw error;
  }
};

// Teacher: Submit review for student's submission
export const reviewSubmission = async (assignmentId, studentId, comments) => {
  try {
    const response = await axios.post(
      `${API_URL}/assignments/review`,
      {
        assignmentId,
        studentId,
        comments,
      },
      {
        headers: {
          Authorization: `Bearer ${getToken()}`,
        },
      },
    );
    return response.data;
  } catch (error) {
    console.error("Review submission error:", error);
    throw error;
  }
};

// Teacher: Get assignment statistics
export const getAssignmentStats = async (assignmentId) => {
  try {
    const response = await axios.get(
      `${API_URL}/assignments/${assignmentId}/stats`,
      {
        headers: {
          Authorization: `Bearer ${getToken()}`,
        },
      },
    );
    return response.data;
  } catch (error) {
    console.error("Get assignment stats error:", error);
    throw error;
  }
};

// Teacher: Delete assignment
export const deleteAssignment = async (assignmentId) => {
  try {
    const response = await axios.delete(
      `${API_URL}/assignments/${assignmentId}`,
      {
        headers: {
          Authorization: `Bearer ${getToken()}`,
        },
      },
    );
    return response.data;
  } catch (error) {
    console.error("Delete assignment error:", error);
    throw error;
  }
};
// ==========================================
// TEACHER DASHBOARD
// ==========================================

// Get teacher dashboard stats
export const getTeacherDashboardStats = async () => {
  try {
    const response = await axios.get(
      `${API_URL}/auth/teacher/dashboard-stats`,
      {
        headers: {
          Authorization: `Bearer ${getToken()}`,
        },
      },
    );
    return response.data;
  } catch (error) {
    console.error("Get teacher dashboard stats error:", error);
    throw error;
  }
};

// Get teacher pending reviews
export const getTeacherPendingReviews = async () => {
  try {
    const response = await axios.get(
      `${API_URL}/auth/teacher/pending-reviews`,
      {
        headers: {
          Authorization: `Bearer ${getToken()}`,
        },
      },
    );
    return response.data;
  } catch (error) {
    console.error("Get teacher pending reviews error:", error);
    throw error;
  }
};

// ==========================================
// ADMIN - USER MANAGEMENT
// ==========================================
//get all users
export const getAllUsersAdmin = async (filters = {}) => {
  try {
    const queryParams = new URLSearchParams(filters).toString();
    const response = await axios.get(
      `${API_URL}/auth/admin/users${queryParams ? `?${queryParams}` : ""}`,
      {
        headers: {
          Authorization: `Bearer ${getToken()}`,
        },
      },
    );
    return response.data;
  } catch (error) {
    console.error("Fetching users data error: ", error);
    throw error;
  }
};

//get user by ID
export const getUserByIdAdmin = async (userId) => {
  try {
    const response = await axios.get(`${API_URL}/auth/admin/users/${userId}`, {
      headers: {
        Authorization: `Bearer ${getToken()}`,
      },
    });
    return response.data;
  } catch (error) {
    console.error("Get user by id error: ", error);
    throw error;
  }
};

//creating new user by admin
export const createUserAdmin = async (userData) => {
  try {
    const response = await axios.post(`${API_URL}/auth/admin/users`, userData, {
      headers: {
        Authorization: `Bearer ${getToken()}`,
      },
    });
    return response.data;
  } catch (error) {
    console.error("create user by admin error: ", error);
    throw error;
  }
};
//update user by admin
export const updateUserAdmin = async (userId, userData) => {
  try {
    const response = await axios.put(
      `${API_URL}/auth/admin/users/${userId}`,
      userData,
      {
        headers: {
          Authorization: `Bearer ${getToken()}`,
        },
      },
    );
    return response.data;
  } catch (error) {
    console.error("update user error:", error);
    throw error;
  }
};

// Delete user
export const deleteUserAdmin = async (userId) => {
  try {
    const response = await axios.delete(
      `${API_URL}/auth/admin/users/${userId}`,
      {
        headers: {
          Authorization: `Bearer ${getToken()}`,
        },
      },
    );
    return response.data;
  } catch (error) {
    console.error("Delete user error:", error);
    throw error;
  }
};

// Get admin dashboard stats
export const getAdminDashboardStats = async () => {
  try {
    const response = await axios.get(`${API_URL}/auth/admin/dashboard-stats`, {
      headers: {
        Authorization: `Bearer ${getToken()}`,
      },
    });
    return response.data;
  } catch (error) {
    console.error("Get admin dashboard stats error:", error);
    throw error;
  }
};
// ==========================================
// ADMIN - QUESTION MANAGEMENT
// ==========================================

// Get all questions with filters
export const getAllQuestions = async (filters = {}) => {
  try {
    const queryParams = new URLSearchParams(filters).toString();
    const response = await axios.get(
      `${API_URL}/questions/admin/all${queryParams ? `?${queryParams}` : ""}`,
      {
        headers: {
          Authorization: `Bearer ${getToken()}`,
        },
      },
    );
    return response.data;
  } catch (error) {
    console.error("Get all questions error:", error);
    throw error;
  }
};

// Get question statistics
export const getQuestionStats = async () => {
  try {
    const response = await axios.get(`${API_URL}/questions/admin/stats`, {
      headers: {
        Authorization: `Bearer ${getToken()}`,
      },
    });
    return response.data;
  } catch (error) {
    console.error("Get question stats error:", error);
    throw error;
  }
};

// Get sections for dropdown
export const getSectionsForDropdown = async (testId = null) => {
  try {
    const url = testId
      ? `${API_URL}/questions/admin/sections?testId=${testId}`
      : `${API_URL}/questions/admin/sections`;

    const response = await axios.get(url, {
      headers: {
        Authorization: `Bearer ${getToken()}`,
      },
    });
    return response.data;
  } catch (error) {
    console.error("Get sections for dropdown error:", error);
    throw error;
  }
};

// Get question by ID
export const getQuestionById = async (questionId) => {
  try {
    const response = await axios.get(`${API_URL}/questions/${questionId}`, {
      headers: {
        Authorization: `Bearer ${getToken()}`,
      },
    });
    return response.data;
  } catch (error) {
    console.error("Get question by ID error:", error);
    throw error;
  }
};

// Create question
export const createQuestion = async (questionData) => {
  try {
    const response = await axios.post(`${API_URL}/questions`, questionData, {
      headers: {
        Authorization: `Bearer ${getToken()}`,
      },
    });
    return response.data;
  } catch (error) {
    console.error("Create question error:", error);
    throw error;
  }
};

// Update question
export const updateQuestion = async (questionId, questionData) => {
  try {
    const response = await axios.put(
      `${API_URL}/questions/${questionId}`,
      questionData,
      {
        headers: {
          Authorization: `Bearer ${getToken()}`,
        },
      },
    );
    return response.data;
  } catch (error) {
    console.error("Update question error:", error);
    throw error;
  }
};

// Delete question
export const deleteQuestion = async (questionId) => {
  try {
    const response = await axios.delete(`${API_URL}/questions/${questionId}`, {
      headers: {
        Authorization: `Bearer ${getToken()}`,
      },
    });
    return response.data;
  } catch (error) {
    console.error("Delete question error:", error);
    throw error;
  }
};

// Bulk create questions
export const bulkCreateQuestions = async (questionsData) => {
  try {
    const response = await axios.post(
      `${API_URL}/questions/bulk`,
      questionsData,
      {
        headers: {
          Authorization: `Bearer ${getToken()}`,
        },
      },
    );
    return response.data;
  } catch (error) {
    console.error("Bulk create questions error:", error);
    throw error;
  }
};

// Get questions by section ID
export const getQuestionsBySection = async (sectionId) => {
  try {
    const response = await axios.get(
      `${API_URL}/questions/section/${sectionId}`,
      {
        headers: {
          Authorization: `Bearer ${getToken()}`,
        },
      },
    );
    return response.data;
  } catch (error) {
    console.error("Get questions by section error:", error);
    throw error;
  }
};
// Create new test (Teacher/Admin)
export const createTest = async (testData) => {
  try {
    const response = await axios.post(`${API_URL}/tests`, testData, {
      headers: {
        Authorization: `Bearer ${getToken()}`,
      },
    });
    return response.data;
  } catch (error) {
    handleApiError(error, "Failed to create test");
    throw error;
  }
};
// Update existing test (Teacher/Admin)
export const updateTest = async (testId, updatedData) => {
  try {
    const response = await axios.put(
      `${API_URL}/tests/${testId}`,
      updatedData,
      {
        headers: {
          Authorization: `Bearer ${getToken()}`,
        },
      },
    );
    return response.data;
  } catch (error) {
    handleApiError(error, "Failed to update test");
    throw error;
  }
};
// Delete test (Teacher/Admin)
export const deleteTest = async (testId) => {
  try {
    const response = await axios.delete(`${API_URL}/tests/${testId}`, {
      headers: {
        Authorization: `Bearer ${getToken()}`,
      },
    });
    return response.data;
  } catch (error) {
    handleApiError(error, "Failed to delete test");
    throw error;
  }
};

// Get all sections for a test

// Get single section by ID
export const getSectionById = async (sectionId) => {
  try {
    const response = await axios.get(`${API_URL}/sections/${sectionId}`, {
      headers: {
        Authorization: `Bearer ${getToken()}`,
      },
    });
    return response.data;
  } catch (error) {
    console.error("Get section error:", error);
    throw error;
  }
};

// Create section
export const createSection = async (sectionData) => {
  try {
    const response = await axios.post(`${API_URL}/sections`, sectionData, {
      headers: {
        Authorization: `Bearer ${getToken()}`,
      },
    });
    return response.data;
  } catch (error) {
    console.error("Create section error:", error);
    throw error;
  }
};

// Update section
export const updateSection = async (sectionId, sectionData) => {
  try {
    const response = await axios.put(
      `${API_URL}/sections/${sectionId}`,
      sectionData,
      {
        headers: {
          Authorization: `Bearer ${getToken()}`,
        },
      },
    );
    return response.data;
  } catch (error) {
    console.error("Update section error:", error);
    throw error;
  }
};

// Delete section
export const deleteSection = async (sectionId) => {
  try {
    const response = await axios.delete(`${API_URL}/sections/${sectionId}`, {
      headers: {
        Authorization: `Bearer ${getToken()}`,
      },
    });
    return response.data;
  } catch (error) {
    console.error("Delete section error:", error);
    throw error;
  }
};

// ============================================
// FILE UPLOAD FUNCTIONS
// ============================================

// Upload image (for Writing Task diagrams)
export const uploadImage = async (file) => {
  try {
    const formData = new FormData();
    formData.append("image", file);

    const response = await axios.post(`${API_URL}/upload/image`, formData, {
      headers: {
        Authorization: `Bearer ${getToken()}`,
        "Content-Type": "multipart/form-data",
      },
    });
    return response.data;
  } catch (error) {
    handleApiError(error, "Failed to upload image");
  }
};

// Upload audio (for Listening tests & Speaking responses)
export const uploadAudio = async (file) => {
  try {
    const formData = new FormData();
    formData.append("audio", file);

    const response = await axios.post(`${API_URL}/upload/audio`, formData, {
      headers: {
        Authorization: `Bearer ${getToken()}`,
        "Content-Type": "multipart/form-data",
      },
    });
    return response.data;
  } catch (error) {
    handleApiError(error, "Failed to upload audio");
  }
};
