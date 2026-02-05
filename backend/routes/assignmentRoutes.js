const express = require('express');
const router = express.Router();
const assignmentController = require('../controllers/assignmentController');
const authMiddleware = require('../middleware/auth');
const roleCheck = require('../middleware/roleCheck');

// All routes require authentication
router.use(authMiddleware);

// ==========================================
// TEACHER ROUTES
// ==========================================

// Create new assignment (Teacher/Admin only)
router.post(
  '/',
  roleCheck('teacher', 'admin'),
  assignmentController.createAssignment
);

// Get all assignments created by this teacher
router.get(
  '/teacher',
  roleCheck('teacher', 'admin'),
  assignmentController.getTeacherAssignments
);

// Review a student's submission (Teacher/Admin only)
router.post(
  '/review',
  roleCheck('teacher', 'admin'),
  assignmentController.reviewSubmission
);

// Get assignment statistics
router.get(
  '/:id/stats',
  roleCheck('teacher', 'admin'),
  assignmentController.getAssignmentStats
);

// Delete assignment (Teacher/Admin only)
router.delete(
  '/:id',
  roleCheck('teacher', 'admin'),
  assignmentController.deleteAssignment
);

// ==========================================
// STUDENT ROUTES
// ==========================================

// Get all assignments for this student
router.get(
  '/student',
  assignmentController.getStudentAssignments
);

// Update submission status (when student starts/completes)
router.put(
  '/submission',
  assignmentController.updateSubmissionStatus
);

// ==========================================
// SHARED ROUTES (Teacher & Student)
// ==========================================

// Get single assignment by ID
router.get(
  '/:id',
  assignmentController.getAssignmentById
);

module.exports = router;