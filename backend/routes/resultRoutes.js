const express = require("express");
const router = express.Router();
const resultController = require("../controllers/resultController");
const authMiddleware = require("../middleware/auth");
const roleCheck = require("../middleware/roleCheck");

//routes authentication
router.use(authMiddleware);

//submit test and create results
router.post("/submit", resultController.submitTest);

//get user's own results
router.get("/my-results", resultController.getUserResults);

// Get analytics for dashboard
router.get("/analytics", resultController.getStudentAnalytics);

//get the detail of the result
router.get("/:id/detailed", resultController.getDetailedResult);

//get single result
router.get("/:id", resultController.getResultById);

// Teacher grades a result (Writing)
router.post(
  "/:id/grade",
  roleCheck("teacher", "admin"),
  resultController.teacherGradeResult,
);

//manual result
router.post(
  "/create-manual",
  authMiddleware,
  resultController.createManualResult,
);

//get all results
router.get("/", resultController.getAllResults);

module.exports = router;
