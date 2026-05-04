const express = require("express");
const router = express.Router();
const mockResultController = require("../controllers/mockResultController");
const authMiddleware = require("../middleware/auth");
const roleCheck = require("../middleware/roleCheck");

router.use(authMiddleware);

// Initialize a new mock result when student starts
router.post("/start", mockResultController.initializeMockResult);

// Update module score during progression
router.put("/update-module", mockResultController.updateMockResultModule);

// Get all
router.get("/", roleCheck("admin", "teacher"), mockResultController.getMockResults);

// Get by ID
router.get("/:id", mockResultController.getMockResultById);

// Get my results
router.get("/user/my-results", mockResultController.getMyMockResults);

// Delete mock result
router.delete("/:id", mockResultController.deleteMockResult);

// Teacher evaluates speaking/writing
router.put(
  "/:mockResultId/evaluate",
  roleCheck("admin", "teacher"),
  mockResultController.evaluateMockResult
);

module.exports = router;
