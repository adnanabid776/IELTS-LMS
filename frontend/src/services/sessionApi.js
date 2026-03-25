import apiClient from "./apiClient";

// ==========================================
// SESSION APIs
// ==========================================

export const startTestSession = async (testId) => {
  const response = await apiClient.post("/sessions/start", { testId });
  return response.data;
};

export const saveAnswer = async (sessionId, questionId, userAnswer) => {
  const response = await apiClient.post("/sessions/save-answer", {
    sessionId,
    questionId,
    userAnswer,
  });
  return response.data;
};

export const bulkSaveAnswers = async (sessionId, answers) => {
  const response = await apiClient.post("/sessions/bulk-save", {
    sessionId,
    answers,
  });
  return response.data;
};

export const pauseTestSession = async (sessionId, timeRemaining) => {
  const response = await apiClient.post("/sessions/pause", {
    sessionId,
    timeRemaining,
  });
  return response.data;
};

export const getSession = async (sessionId) => {
  const response = await apiClient.get(`/sessions/${sessionId}`);
  return response.data;
};

export const submitTestSession = async (sessionId) => {
  const response = await apiClient.post("/sessions/submit", { sessionId });
  return response.data;
};
