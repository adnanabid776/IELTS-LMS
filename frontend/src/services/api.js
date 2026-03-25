/**
 * API Service Barrel File
 *
 * This file re-exports all API functions from domain-specific modules.
 * All existing imports like `import { someFunc } from "../services/api"`
 * continue to work without any changes.
 *
 * For new code, prefer importing directly from the domain files:
 *   import { loginUser } from "../services/authApi"
 *   import { getAllTests } from "../services/testApi"
 */

import axios from "axios";
import { toast } from "react-toastify";

// ==========================================
// GLOBAL AXIOS INTERCEPTOR (Backwards Compatibility)
// ==========================================
// GradeResult.jsx and ListeningTestTaking.jsx use `axios` directly,
// so we must keep this global interceptor active.
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

// Re-export all domain APIs
export * from "./authApi";
export * from "./testApi";
export * from "./sectionApi";
export * from "./questionApi";
export * from "./sessionApi";
export * from "./resultApi";
export * from "./assignmentApi";
export * from "./uploadApi";
