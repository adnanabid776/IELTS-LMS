const express = require("express");
const router = express.Router();
const sessionController = require("../controllers/sessionController");
const authMiddleware = require("../middleware/auth");

router.use(authMiddleware);

// ✅ SPECIFIC ROUTES FIRST
router.post("/start", sessionController.startTest);
router.post("/save-answer", sessionController.saveAnswer);
router.post("/bulk-save", sessionController.bulkSaveAnswers);
router.post("/submit", sessionController.submitTest);
router.post("/track-tab-switch", sessionController.trackTabSwitch);
router.post("/mark-audio-played", sessionController.markAudioPlayed);
router.post("/pause", sessionController.pauseSession);

// ✅ DYNAMIC ROUTES LAST
router.put("/:sessionId/progress", sessionController.updateProgress);
router.get("/:sessionId", sessionController.getSession);
router.get("/", sessionController.getUserSessions);

module.exports = router;
