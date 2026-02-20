const express = require("express");
const router = express.Router();
const rateLimit = require("express-rate-limit");
const authController = require("../controllers/authController");
const authMiddleware = require("../middleware/auth");
const roleCheck = require("../middleware/roleCheck");

// Rate limiters for auth endpoints
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 attempts per window
  message: {
    error: "Too many login attempts. Please try again after 15 minutes.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // 5 registrations per hour per IP
  message: {
    error:
      "Too many accounts created from this IP. Please try again after an hour.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Register route
router.post("/register", registerLimiter, authController.register);

// Login Route
router.post("/login", loginLimiter, authController.login);

// ==========================================
// AUTHENTICATED ROUTES
// ==========================================

// Logout Route (NEW - clears active session)
router.post("/logout", authMiddleware, authController.logout);

// Update profile
router.put("/update", authMiddleware, authController.updateProfile);

// ==========================================
// TEACHER/ADMIN ROUTES
// ==========================================

// Get all students (Teacher/Admin only)
router.get(
  "/students",
  authMiddleware,
  roleCheck("teacher", "admin"),
  authController.getAllStudents,
);

// Get student details (Teacher/Admin only)
router.get(
  "/student/:studentId",
  authMiddleware,
  roleCheck("teacher", "admin"),
  authController.getStudentDetails,
);

// Teacher dashboard stats
router.get(
  "/teacher/dashboard-stats",
  authMiddleware,
  roleCheck("teacher", "admin"),
  authController.getTeacherDashboardStats,
);

// Teacher pending reviews
router.get(
  "/teacher/pending-reviews",
  authMiddleware,
  roleCheck("teacher", "admin"),
  authController.getTeacherPendingReviews,
);

// ==========================================
// ADMIN ROUTES
// ==========================================

// Get all users
router.get(
  "/admin/users",
  authMiddleware,
  roleCheck("admin"),
  authController.getAllUsers,
);

// Get user by id
router.get(
  "/admin/users/:userId",
  authMiddleware,
  roleCheck("admin"),
  authController.getUserById,
);

// Create new user by admin
router.post(
  "/admin/users",
  authMiddleware,
  roleCheck("admin"),
  authController.createUser,
);

// Update user's data
router.put(
  "/admin/users/:userId",
  authMiddleware,
  roleCheck("admin"),
  authController.updateUser,
);

// Delete a user
router.delete(
  "/admin/users/:userId",
  authMiddleware,
  roleCheck("admin"),
  authController.deleteUser,
);

// Get admin dashboard stats
router.get(
  "/admin/dashboard-stats",
  authMiddleware,
  roleCheck("admin"),
  authController.getAdminDashboardStats,
);

module.exports = router;
