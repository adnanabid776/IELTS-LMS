import axios from "axios";
import { toast } from "react-toastify";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

// Create a shared axios instance with base URL
const apiClient = axios.create({
  baseURL: API_URL,
});

// Request interceptor: attach auth token to every request
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

// Response interceptor: handle 401 errors globally
apiClient.interceptors.response.use(
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

// Shared error handler
export const handleApiError = (error, customMessage) => {
  if (error.response) {
    const message =
      error.response.data?.error ||
      error.response.data?.message ||
      customMessage;

    // Don't show toast if it's 401 (interceptor handles it)
    if (error.response.status !== 401) {
      toast.error(message);
    }
  } else if (error.request) {
    toast.error(
      "Cannot connect to server. Please check your internet connection.",
    );
  } else {
    toast.error(customMessage || "An unexpected error occurred");
  }

  throw error;
};

export default apiClient;
