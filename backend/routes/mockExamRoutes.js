const express = require("express");
const router = express.Router();
const mockExamController = require("../controllers/mockExamController");
const authMiddleware = require("../middleware/auth");
const roleCheck = require("../middleware/roleCheck");

router.use(authMiddleware);

// Admin/Teacher routes
router.post(
  "/upload",
  roleCheck("admin", "teacher"),
  mockExamController.uploadMockExamJson
);

// Get all mock exams
router.get("/", mockExamController.getAllMockExams);

// Get single mock exam
router.get("/:id", mockExamController.getMockExamById);

// Delete mock exam
router.delete("/:id", roleCheck("admin", "teacher"), mockExamController.deleteMockExam);

module.exports = router;
