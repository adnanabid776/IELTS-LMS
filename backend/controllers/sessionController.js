const Session = require("../models/Session");
const Test = require("../models/Test");
const Section = require("../models/Section");
const Question = require("../models/Question");

// ==========================================
// HELPER FUNCTIONS
// ==========================================

// Normalize answer for comparison (remove articles, extra spaces)
const normalizeAnswer = (answer) => {
  if (!answer) return "";
  return answer
    .toString()
    .toLowerCase()
    .trim()
    .replace(/^(the|a|an)\s+/i, "") // Remove leading articles
    .replace(/\s+/g, " ") // Normalize spaces
    .replace(/[.,;!?]/g, ""); // Remove punctuation
};

// Check if answer is correct (handles fuzzy matching)
const isAnswerCorrect = (
  userAnswer,
  correctAnswer,
  alternativeAnswers = [],
) => {
  if (!userAnswer) return false;

  const normalizedUserAnswer = normalizeAnswer(userAnswer);
  const normalizedCorrectAnswer = normalizeAnswer(correctAnswer);

  // Check exact match with correct answer
  if (normalizedUserAnswer === normalizedCorrectAnswer) return true;

  // Check if user answer contains correct answer or vice versa
  if (
    normalizedUserAnswer.includes(normalizedCorrectAnswer) ||
    normalizedCorrectAnswer.includes(normalizedUserAnswer)
  ) {
    return true;
  }

  // Check alternative answers
  for (let alt of alternativeAnswers) {
    const normalizedAlt = normalizeAnswer(alt);
    if (normalizedUserAnswer === normalizedAlt) return true;
    if (
      normalizedUserAnswer.includes(normalizedAlt) ||
      normalizedAlt.includes(normalizedUserAnswer)
    ) {
      return true;
    }
  }

  return false;
};

// ==========================================
// START TEST
// ==========================================
exports.startTest = async (req, res) => {
  try {
    const { testId } = req.body;
    const userId = req.user.userId;

    // Validate test exists
    const test = await Test.findById(testId);
    if (!test) {
      return res.status(404).json({ error: "Test not found" });
    }

    if (!test.isActive) {
      return res.status(400).json({ error: "Test is not active" });
    }

    // Check if student already has an active session for this test
    const existingSession = await Session.findActiveSession(userId, testId);

    if (existingSession) {
      // Check if session is expired
      if (existingSession.isExpired()) {
        // Auto-submit expired session
        existingSession.status = "expired";
        existingSession.completedAt = new Date();
        await existingSession.save();

        // DON'T return error - create new session instead!
        console.log("Previous session expired, creating new one");
        // Fall through to create new session below
      } else {
        // Check if session is paused - if so, resume it
        if (existingSession.status === "paused") {
          console.log("Resuming paused session");

          // Update session to in-progress
          existingSession.status = "in-progress";
          existingSession.startedAt = new Date(); // Reset start time for new interval
          // existingSession.timeRemaining is already correct from pause
          await existingSession.save();

          return res.json({
            message: "Resuming paused session",
            session: {
              _id: existingSession._id,
              status: "in-progress",
              startedAt: existingSession.startedAt,
              timeRemaining: existingSession.timeRemaining,
              currentQuestionIndex: existingSession.currentQuestionIndex,
              answeredCount: existingSession.answers.length,
            },
            isResuming: true,
          });
        }

        // Session is still active - return existing session
        return res.json({
          message: "Resuming active session",
          session: {
            _id: existingSession._id,
            status: existingSession.status,
            startedAt: existingSession.startedAt,
            timeRemaining: existingSession.getRemainingTime(),
            currentQuestionIndex: existingSession.currentQuestionIndex,
            answeredCount: existingSession.answers.length,
          },
          isResuming: true,
        });
      }
    }

    // Create new session (moved outside if block)
    const session = await Session.create({
      userId,
      testId,
      status: "in-progress",
      startedAt: new Date(),
      timeRemaining: test.duration * 60,
      answers: [],
    });

    res.status(201).json({
      message: "Test started successfully",
      session: {
        _id: session._id,
        testId: session.testId,
        status: session.status,
        startedAt: session.startedAt,
        timeRemaining: session.timeRemaining,
      },
      isResuming: false,
    });
  } catch (error) {
    console.error("Start test error:", error);
    res.status(500).json({ error: "Server error" });
  }
};

// ==========================================
// SAVE ANSWER (Auto-save & Manual save)
// ==========================================
exports.saveAnswer = async (req, res) => {
  try {
    const { sessionId, questionId, userAnswer, timeSpent } = req.body;
    const userId = req.user.userId;

    // Validate session
    const session = await Session.findById(sessionId);

    if (!session) {
      return res.status(404).json({ error: "Session not found" });
    }

    if (session.userId.toString() !== userId) {
      return res.status(403).json({ error: "Unauthorized" });
    }

    if (session.status !== "in-progress") {
      return res.status(400).json({ error: "Session is not active" });
    }

    // Check if session is expired
    if (session.isExpired()) {
      session.status = "expired";
      session.completedAt = new Date();
      await session.save();

      return res.status(400).json({
        error: "Session expired",
        timeRemaining: 0,
      });
    }

    // Validate question exists
    const question = await Question.findById(questionId);
    if (!question) {
      return res.status(404).json({ error: "Question not found" });
    }

    // Find if answer already exists for this question
    const answerIndex = session.answers.findIndex(
      (a) => a.questionId.toString() === questionId,
    );

    const answerData = {
      questionId,
      userAnswer,
      timeSpent: timeSpent || 0,
      answeredAt: new Date(),
    };

    if (answerIndex >= 0) {
      // Update existing answer
      session.answers[answerIndex] = answerData;
    } else {
      // Add new answer
      session.answers.push(answerData);
    }

    // Update last activity
    session.lastActivityAt = new Date();

    await session.save();

    res.json({
      message: "Answer saved successfully",
      answeredCount: session.answers.length,
      timeRemaining: session.getRemainingTime(),
    });
  } catch (error) {
    console.error("Save answer error:", error);
    res.status(500).json({ error: "Server error" });
  }
};

// ==========================================
// SAVE SPEAKING ANSWER
// ==========================================

exports.saveSpeakingAnswer = async (req, res) => {
  try {
    const { sessionId, sectionId, audioUrl } = req.body;
    const userId = req.user.userId;

    // Validate session
    const session = await Session.findById(sessionId);

    if (!session) {
      return res.status(404).json({ error: "Session not found" });
    }

    if (session.userId.toString() !== userId) {
      return res.status(403).json({ error: "Unauthorized" });
    }

    if (session.status !== "in-progress") {
      return res.status(400).json({ error: "Session is not active" });
    }

    // Validate section exists
    const section = await Section.findById(sectionId);
    if (!section) {
      return res.status(404).json({ error: "Section not found" });
    }

    // Find if answer already exists for this section
    const answerIndex = session.answers.findIndex(
      (a) => a.questionId.toString() === sectionId,
    );

    const answerData = {
      questionId: sectionId, // Store section ID as questionId for compatibility
      userAnswer: audioUrl,
      timeSpent: 0,
      answeredAt: new Date(),
    };

    if (answerIndex >= 0) {
      // Update existing answer
      session.answers[answerIndex] = answerData;
    } else {
      // Add new answer
      session.answers.push(answerData);
    }

    // Update last activity
    session.lastActivityAt = new Date();

    await session.save();

    res.json({
      message: "Speaking answer saved successfully",
      answeredCount: session.answers.length,
      audioUrl: audioUrl,
    });
  } catch (error) {
    console.error("Save speaking answer error:", error);
    res.status(500).json({ error: "Server error" });
  }
};

// ==========================================
// BULK SAVE ANSWERS (For auto-save all at once)
// ==========================================

exports.bulkSaveAnswers = async (req, res) => {
  try {
    const { sessionId, answers } = req.body; // answers = [{ questionId, userAnswer, timeSpent }]
    const userId = req.user.userId;

    const session = await Session.findById(sessionId);

    if (!session) {
      return res.status(404).json({ error: "Session not found" });
    }

    if (session.userId.toString() !== userId) {
      return res.status(403).json({ error: "Unauthorized" });
    }

    if (session.status !== "in-progress") {
      return res.status(400).json({ error: "Session is not active" });
    }

    // Check if session is expired
    if (session.isExpired()) {
      session.status = "expired";
      session.completedAt = new Date();
      await session.save();

      return res.status(400).json({
        error: "Session expired",
        timeRemaining: 0,
      });
    }

    // Update answers
    answers.forEach(({ questionId, userAnswer, timeSpent }) => {
      const answerIndex = session.answers.findIndex(
        (a) => a.questionId.toString() === questionId,
      );

      const answerData = {
        questionId,
        userAnswer,
        timeSpent: timeSpent || 0,
        answeredAt: new Date(),
      };

      if (answerIndex >= 0) {
        session.answers[answerIndex] = answerData;
      } else {
        session.answers.push(answerData);
      }
    });

    session.lastActivityAt = new Date();
    await session.save();

    res.json({
      message: "Answers saved successfully",
      answeredCount: session.answers.length,
      timeRemaining: session.getRemainingTime(),
    });
  } catch (error) {
    console.error("Bulk save answers error:", error);
    res.status(500).json({ error: "Server error" });
  }
};

// ==========================================
// GET SESSION (Resume test)
// ==========================================
exports.getSession = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const userId = req.user.userId;
    const userRole = req.user.role;

    const session = await Session.findById(sessionId).populate(
      "testId",
      "title module duration totalQuestions",
    );

    if (!session) {
      return res.status(404).json({ error: "Session not found" });
    }

    // Allow access if: owner OR teacher/admin (for grading)
    const isOwner = session.userId.toString() === userId;
    const isTeacherOrAdmin = userRole === "teacher" || userRole === "admin";

    if (!isOwner && !isTeacherOrAdmin) {
      return res.status(403).json({ error: "Unauthorized" });
    }

    // Check if expired
    if (session.status === "in-progress" && session.isExpired()) {
      session.status = "expired";
      session.completedAt = new Date();
      await session.save();

      return res.json({
        session,
        timeRemaining: 0,
        isExpired: true,
        message: "Session has expired",
      });
    }

    res.json({
      session,
      timeRemaining: session.getRemainingTime(),
      isExpired: false,
    });
  } catch (error) {
    console.error("Get session error:", error);
    res.status(500).json({ error: "Server error" });
  }
};

// ==========================================
// UPDATE SESSION PROGRESS (Current question, section)
// ==========================================
exports.updateProgress = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { currentQuestionIndex, currentSectionNumber } = req.body;
    const userId = req.user.userId;

    const session = await Session.findById(sessionId);

    if (!session) {
      return res.status(404).json({ error: "Session not found" });
    }

    if (session.userId.toString() !== userId) {
      return res.status(403).json({ error: "Unauthorized" });
    }

    if (currentQuestionIndex !== undefined) {
      session.currentQuestionIndex = currentQuestionIndex;
    }

    if (currentSectionNumber !== undefined) {
      session.currentSectionNumber = currentSectionNumber;
    }

    session.lastActivityAt = new Date();
    await session.save();

    res.json({
      message: "Progress updated",
      currentQuestionIndex: session.currentQuestionIndex,
      currentSectionNumber: session.currentSectionNumber,
    });
  } catch (error) {
    console.error("Update progress error:", error);
    res.status(500).json({ error: "Server error" });
  }
};

// ==========================================
// SUBMIT TEST
// ==========================================
exports.submitTest = async (req, res) => {
  try {
    const { sessionId } = req.body;
    const userId = req.user.userId;

    const session = await Session.findById(sessionId);

    if (!session) {
      return res.status(404).json({ error: "Session not found" });
    }

    if (session.userId.toString() !== userId) {
      return res.status(403).json({ error: "Unauthorized" });
    }

    if (session.status === "completed") {
      return res.status(400).json({ error: "Test already submitted" });
    }

    // Calculate total time spent
    const timeSpent = Math.floor(
      (Date.now() - session.startedAt.getTime()) / 1000,
    );

    // Update session
    session.status = "completed";
    session.completedAt = new Date();
    session.totalTimeSpent = timeSpent;

    await session.save();

    res.json({
      message: "Test submitted successfully",
      sessionId: session._id,
      totalTimeSpent: timeSpent,
      answeredCount: session.answers.length,
    });
  } catch (error) {
    console.error("Submit test error:", error);
    res.status(500).json({ error: "Server error" });
  }
};

// ==========================================
// GET USER'S SESSIONS
// ==========================================
exports.getUserSessions = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { status } = req.query;

    const filter = { userId };
    if (status) filter.status = status;

    const sessions = await Session.find(filter)
      .populate("testId", "title module duration")
      .sort({ createdAt: -1 });

    res.json({
      count: sessions.length,
      sessions,
    });
  } catch (error) {
    console.error("Get user sessions error:", error);
    res.status(500).json({ error: "Server error" });
  }
};

// ==========================================
// TRACK TAB SWITCH (Anti-cheating)
// ==========================================
exports.trackTabSwitch = async (req, res) => {
  try {
    const { sessionId } = req.body;
    const userId = req.user.userId;

    const session = await Session.findById(sessionId);

    if (!session) {
      return res.status(404).json({ error: "Session not found" });
    }

    if (session.userId.toString() !== userId) {
      return res.status(403).json({ error: "Unauthorized" });
    }

    session.tabSwitchCount += 1;

    // Flag for review if too many switches
    if (session.tabSwitchCount >= 5) {
      session.flaggedForReview = true;
    }

    await session.save();

    res.json({
      message: "Tab switch recorded",
      tabSwitchCount: session.tabSwitchCount,
      flaggedForReview: session.flaggedForReview,
    });
  } catch (error) {
    console.error("Track tab switch error:", error);
    res.status(500).json({ error: "Server error" });
  }
};

// ==========================================
// MARK AUDIO PLAYED
// ==========================================
exports.markAudioPlayed = async (req, res) => {
  try {
    const { sessionId, sectionId } = req.body;
    const userId = req.user.userId;

    const session = await Session.findById(sessionId);

    if (!session) {
      return res.status(404).json({ error: "Session not found" });
    }

    if (session.userId.toString() !== userId) {
      return res.status(403).json({ error: "Unauthorized" });
    }

    // Add sectionId to audioPlayedSections if not already present
    // Ensure array exists (schema default should handle this but safety check)
    if (!session.audioPlayedSections) {
      session.audioPlayedSections = [];
    }

    if (!session.audioPlayedSections.includes(sectionId)) {
      session.audioPlayedSections.push(sectionId);
      await session.save();
    }

    res.json({
      message: "Audio marked as played",
      audioPlayedSections: session.audioPlayedSections,
    });
  } catch (error) {
    console.error("Mark audio played error:", error);
    res.status(500).json({ error: "Server error" });
  }
};
// ==========================================
// PAUSE SESSION (When user navigates away)
// ==========================================
exports.pauseSession = async (req, res) => {
  try {
    const { sessionId, timeRemaining } = req.body;
    const userId = req.user.userId;

    const session = await Session.findById(sessionId);

    if (!session) {
      return res.status(404).json({ error: "Session not found" });
    }

    if (session.userId.toString() !== userId) {
      return res.status(403).json({ error: "Unauthorized" });
    }

    // Only pause if currently in-progress
    if (session.status === "in-progress") {
      session.status = "paused";
      session.timeRemaining = timeRemaining; // Save exact remaining time
      session.lastActivityAt = new Date();
      await session.save();
    }

    res.json({
      message: "Session paused",
      status: session.status,
      timeRemaining: session.timeRemaining,
    });
  } catch (error) {
    console.error("Pause session error:", error);
    res.status(500).json({ error: "Server error" });
  }
};
