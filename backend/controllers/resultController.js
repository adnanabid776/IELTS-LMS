const Result = require("../models/Result");
const mongoose = require("mongoose");
const Session = require("../models/Session");
const Test = require("../models/Test");
const Section = require("../models/Section");
const Question = require("../models/Question");

// Normalize answer for comparison
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

  // Handle array answers (multiple choice with multiple selections)
  if (Array.isArray(userAnswer)) {
    const normalizedUserAnswers = userAnswer.map((a) => normalizeAnswer(a));
    const normalizedCorrectAnswer = normalizeAnswer(correctAnswer);

    // Check if any user answer matches
    return normalizedUserAnswers.some(
      (ua) =>
        ua === normalizedCorrectAnswer ||
        ua.includes(normalizedCorrectAnswer) ||
        normalizedCorrectAnswer.includes(ua),
    );
  }

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

// Calculate band score from correct answers
const calculateBandScore = (correctAnswers, totalQuestions, module) => {
  const percentage = (correctAnswers / totalQuestions) * 100;

  // IELTS band score conversion (simplified)
  // In real implementation, use official IELTS conversion tables
  if (percentage >= 90) return 9;
  if (percentage >= 82) return 8.5;
  if (percentage >= 75) return 8;
  if (percentage >= 67) return 7.5;
  if (percentage >= 60) return 7;
  if (percentage >= 52) return 6.5;
  if (percentage >= 45) return 6;
  if (percentage >= 37) return 5.5;
  if (percentage >= 30) return 5;
  if (percentage >= 22) return 4.5;
  if (percentage >= 15) return 4;
  if (percentage >= 10) return 3.5;
  if (percentage >= 5) return 3;
  return 2.5;
};

// ==========================================
// SUBMIT TEST AND CALCULATE RESULT
// ==========================================
exports.submitTest = async (req, res) => {
  try {
    const { sessionId } = req.body;
    const userId = req.user.userId;

    // Get session
    const session = await Session.findById(sessionId).populate("testId");

    if (!session) {
      return res.status(404).json({ error: "Session not found" });
    }

    if (session.userId.toString() !== userId) {
      return res.status(403).json({ error: "Unauthorized" });
    }

    if (session.status === "completed") {
      // Already submitted, return existing result
      const existingResult = await Result.findOne({ sessionId });
      if (existingResult) {
        return res.json({
          message: "Test already submitted",
          result: existingResult,
        });
      }
    }

    // Get all questions for this test
    const test = session.testId;
    const module = test.module; // ← ADD THIS LINE
    const sections = await Section.find({ testId: test._id });
    const sectionIds = sections.map((s) => s._id);

    const allQuestions = await Question.find({
      sectionId: { $in: sectionIds },
    }).sort({ questionNumber: 1 });

    // ============================================
    // CONDITIONAL LOGIC: Check if manual grading needed
    // ============================================
    const needsManualGrading = module === "writing" || module === "speaking";

    // Calculate results (only for auto-graded modules)
    let correctAnswers = needsManualGrading ? null : 0;
    let incorrectAnswers = needsManualGrading ? null : 0;
    let unanswered = needsManualGrading ? null : 0;

    const questionTypeBreakdown = {};
    const sectionPerformance = [];

    // Create a map of questions for faster lookup
    // Create a map of questions for faster lookup
    const questionMap = {};
    allQuestions.forEach((q) => {
      questionMap[q._id.toString()] = q;
    });

    if (!needsManualGrading) {
      // AUTO-GRADING: Process each answer for Reading/Listening
      session.answers.forEach((answer) => {
        const question = questionMap[answer.questionId.toString()];

        if (!question) return;

        // Check if answer is correct using our smart matching function
        const isCorrect = isAnswerCorrect(
          answer.userAnswer,
          question.correctAnswer,
          question.alternativeAnswers,
        );

        if (isCorrect) {
          correctAnswers++;
        } else if (answer.userAnswer) {
          incorrectAnswers++;
        } else {
          unanswered++;
        }

        // Track by question type
        if (!questionTypeBreakdown[question.questionType]) {
          questionTypeBreakdown[question.questionType] = {
            type: question.questionType,
            total: 0,
            correct: 0,
          };
        }
        questionTypeBreakdown[question.questionType].total++;
        if (isCorrect) {
          questionTypeBreakdown[question.questionType].correct++;
        }
      });

      // Count unanswered questions
      const answeredQuestionIds = new Set(
        session.answers.map((a) => a.questionId.toString()),
      );
      allQuestions.forEach((q) => {
        if (!answeredQuestionIds.has(q._id.toString())) {
          unanswered++;

          // Add to question type breakdown
          if (!questionTypeBreakdown[q.questionType]) {
            questionTypeBreakdown[q.questionType] = {
              type: q.questionType,
              total: 0,
              correct: 0,
            };
          }
          questionTypeBreakdown[q.questionType].total++;
        }
      });
    } else {
      // MANUAL GRADING: Just record that answers were submitted
      console.log(`Test requires manual grading (module: ${module})`);
    }

    // Calculate percentages for question types
    const questionTypeArray = Object.values(questionTypeBreakdown).map(
      (type) => ({
        ...type,
        percentage:
          type.total > 0 ? Math.round((type.correct / type.total) * 100) : 0,
      }),
    );

    // Calculate section-wise performance
    for (let section of sections) {
      const sectionQuestions = allQuestions.filter(
        (q) => q.sectionId.toString() === section._id.toString(),
      );

      let sectionCorrect = 0;
      let sectionAttempted = 0;

      sectionQuestions.forEach((q) => {
        const answer = session.answers.find(
          (a) => a.questionId.toString() === q._id.toString(),
        );

        if (answer && answer.userAnswer) {
          sectionAttempted++;
          if (
            isAnswerCorrect(
              answer.userAnswer,
              q.correctAnswer,
              q.alternativeAnswers,
            )
          ) {
            sectionCorrect++;
          }
        }
      });

      sectionPerformance.push({
        sectionNumber: section.sectionNumber,
        sectionTitle: section.title,
        questionsAttempted: sectionAttempted,
        correctAnswers: sectionCorrect,
        percentage:
          sectionAttempted > 0
            ? Math.round((sectionCorrect / sectionAttempted) * 100)
            : 0,
      });
    }

    // Calculate band score
    // Calculate band score (only for auto-graded modules)
    const totalQuestions = allQuestions.length;
    let percentage, bandScore;

    if (!needsManualGrading) {
      // AUTO-GRADED: Calculate scores
      percentage =
        totalQuestions > 0
          ? Math.round((correctAnswers / totalQuestions) * 100)
          : 0;
      bandScore = calculateBandScore(
        correctAnswers,
        totalQuestions,
        test.module,
      );
    } else {
      // MANUAL GRADING: Set to null, teacher will grade later
      percentage = null;
      bandScore = null;
    }

    // Identify weak areas (only for auto-graded modules)
    let weakAreas = [];
    let recommendations = [];

    if (!needsManualGrading) {
      weakAreas = questionTypeArray
        .filter((type) => type.percentage < 50 && type.total > 0)
        .map((type) => type.type);

      // Generate recommendations
      if (weakAreas.length > 0) {
        weakAreas.forEach((area) => {
          recommendations.push(
            `Practice more ${area.replace(/-/g, " ")} questions to improve your score.`,
          );
        });
      }

      if (unanswered > 0) {
        recommendations.push(
          `You left ${unanswered} question(s) unanswered. Try to manage your time better.`,
        );
      }

      if (bandScore < 6) {
        recommendations.push(
          "Focus on building your fundamentals in this module.",
        );
      }
    } else {
      // MANUAL GRADING: Add placeholder message
      recommendations.push(
        "Your test is being reviewed by your teacher. Results will be available soon.",
      );
    }
    // Create result
    // Create result
    const result = await Result.create({
      userId,
      testId: test._id,
      sessionId,
      module: test.module,
      totalQuestions,
      correctAnswers, // Will be null for Writing/Speaking
      incorrectAnswers, // Will be null for Writing/Speaking
      unanswered, // Will be null for Writing/Speaking
      bandScore, // Will be null for Writing/Speaking
      percentage, // Will be null for Writing/Speaking
      questionTypeBreakdown: needsManualGrading ? [] : questionTypeArray,
      sectionPerformance: needsManualGrading ? [] : sectionPerformance,
      timeTaken: session.totalTimeSpent,
      weakAreas,
      recommendations,
      // ADD MANUAL GRADING FLAG
      isManuallyGraded: needsManualGrading,
      teacherGradedBy: null,
      teacherGradedAt: null,
      gradingNotes: null,
    });

    // Update session status if not already completed
    // if (session.status !== 'completed') {
    //   session.status = "completed";
    //   session.completedAt = new Date();
    //   session.score = correctAnswers;
    //   session.bandScore = bandScore;
    //   await session.save();
    // }

    res.status(201).json({
      message: "Test submitted successfully",
      result: {
        _id: result._id,
        bandScore: result.bandScore,
        percentage: result.percentage,
        correctAnswers: result.correctAnswers,
        incorrectAnswers: result.incorrectAnswers,
        unanswered: result.unanswered,
        totalQuestions: result.totalQuestions,
        weakAreas: result.weakAreas,
        recommendations: result.recommendations,
        questionTypeBreakdown: result.questionTypeBreakdown,
        sectionPerformance: result.sectionPerformance,
      },
    });
  } catch (error) {
    console.error("Submit test error:", error);
    res.status(500).json({ error: "Server error" });
  }
};

// ==========================================
// GET RESULT BY ID
// ==========================================
exports.getResultById = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await Result.findById(id)
      .populate("userId", "firstName lastName email")
      .populate("testId", "title module duration");

    if (!result) {
      return res.status(404).json({ error: "Result not found" });
    }

    res.json({ result });
  } catch (error) {
    console.error("Get result error:", error);
    res.status(500).json({ error: "Server error" });
  }
};

// ==========================================
// GET ALL RESULTS FOR A USER
// ==========================================
exports.getUserResults = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { module } = req.query;

    const filter = { userId };
    if (module) filter.module = module;

    const results = await Result.find(filter)
      .populate("testId", "title module")
      .sort({ createdAt: -1 });

    res.json({
      count: results.length,
      results,
    });
  } catch (error) {
    console.error("Get user results error:", error);
    res.status(500).json({ error: "Server error" });
  }
};

// ==========================================
// GET ALL RESULTS (ADMIN/TEACHER)
// ==========================================
exports.getAllResults = async (req, res) => {
  try {
    const { userId, module, testId } = req.query;

    const filter = {};
    if (userId) filter.userId = userId;
    if (module) filter.module = module;
    if (testId) filter.testId = testId;

    const results = await Result.find(filter)
      .populate("userId", "firstName lastName email")
      .populate("testId", "title module")
      .sort({ createdAt: -1 });

    res.json({
      count: results.length,
      results,
    });
  } catch (error) {
    console.error("Get all results error:", error);
    res.status(500).json({ error: "Server error" });
  }
};
// ==========================================
// GET DETAILED RESULT WITH ANSWERS
// ==========================================
exports.getDetailedResult = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    const result = await Result.findById(id)
      .populate("userId", "firstName lastName email")
      .populate("testId", "title module duration")
      .populate("sessionId");

    if (!result) {
      return res.status(404).json({ error: "Result not found" });
    }

    // Check authorization
    if (
      result.userId._id.toString() !== userId &&
      req.user.role !== "admin" &&
      req.user.role !== "teacher"
    ) {
      return res.status(403).json({ error: "Unauthorized" });
    }

    // Get session with answers and questions
    const session = await Session.findById(result.sessionId).populate({
      path: "answers.questionId",
      select:
        "questionNumber questionText questionType correctAnswer alternativeAnswers explanation options",
    });

    // Get all questions for this test
    const sections = await Section.find({ testId: result.testId._id });
    const sectionIds = sections.map((s) => s._id);
    const allQuestions = await Question.find({
      sectionId: { $in: sectionIds },
    }).sort({ questionNumber: 1 });

    // Helper function for answer checking
    const normalizeAnswer = (answer) => {
      if (!answer) return "";
      return answer
        .toString()
        .toLowerCase()
        .trim()
        .replace(/^(the|a|an)\s+/i, "")
        .replace(/\s+/g, " ")
        .replace(/[.,;!?]/g, "");
    };

    const isAnswerCorrect = (
      userAnswer,
      correctAnswer,
      alternativeAnswers = [],
    ) => {
      if (!userAnswer) return false;

      const normalizedUserAnswer = normalizeAnswer(userAnswer);
      const normalizedCorrectAnswer = normalizeAnswer(correctAnswer);

      if (normalizedUserAnswer === normalizedCorrectAnswer) return true;

      if (
        normalizedUserAnswer.includes(normalizedCorrectAnswer) ||
        normalizedCorrectAnswer.includes(normalizedUserAnswer)
      ) {
        return true;
      }

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

    // Build answer comparison
    const answerReview = allQuestions.map((question) => {
      const studentAnswer = session.answers.find(
        (a) =>
          a.questionId &&
          a.questionId._id &&
          a.questionId._id.toString() === question._id.toString(),
      );

      const isCorrect = isAnswerCorrect(
        studentAnswer?.userAnswer,
        question.correctAnswer,
        question.alternativeAnswers,
      );

      return {
        questionNumber: question.questionNumber,
        questionText: question.questionText,
        questionType: question.questionType,
        options: question.options,
        studentAnswer: studentAnswer?.userAnswer || "Not answered",
        correctAnswer: question.correctAnswer,
        alternativeAnswers: question.alternativeAnswers,
        isCorrect,
        explanation: question.explanation,
      };
    });

    res.json({
      result,
      answerReview,
      session: {
        totalTimeSpent: session.totalTimeSpent,
        tabSwitchCount: session.tabSwitchCount,
        flaggedForReview: session.flaggedForReview,
      },
    });
  } catch (error) {
    console.error("Get detailed result error:", error);
    res.status(500).json({ error: "Server error" });
  }
};

// ============================================
// NEW FUNCTION: TEACHER MANUAL GRADING
// ============================================
exports.teacherGradeResult = async (req, res) => {
  try {
    const { id } = req.params; // Result ID
    const { bandScore, writingScores, gradingNotes } = req.body;

    // Validate
    if (!bandScore || bandScore < 0 || bandScore > 9) {
      return res
        .status(400)
        .json({ error: "Band score must be between 0 and 9" });
    }

    // Get result
    const result = await Result.findById(id);
    if (!result) {
      return res.status(404).json({ error: "Result not found" });
    }

    // Check if this is a manual grading module
    // if (result.module !== "writing" && result.module !== "speaking") {
    //   return res.status(400).json({
    //     error: "This result is auto-graded. Manual grading not needed.",
    //   });
    // }

    // Update result with teacher's grades
    result.bandScore = bandScore;
    result.isManuallyGraded = true;
    result.teacherGradedBy = req.user.userId;
    result.teacherGradedAt = new Date();
    result.gradingNotes = gradingNotes || "";

    // Add module-specific scores
    if (result.module === "writing" && writingScores) {
      result.writingScores = {
        taskAchievement: writingScores.taskAchievement,
        coherenceCohesion: writingScores.coherenceCohesion,
        lexicalResource: writingScores.lexicalResource,
        grammaticalRange: writingScores.grammaticalRange,
      };

      // Calculate average as overall band score if not provided
      const avg =
        (writingScores.taskAchievement +
          writingScores.coherenceCohesion +
          writingScores.lexicalResource +
          writingScores.grammaticalRange) /
        4;
      result.bandScore = Math.round(avg * 2) / 2; // Round to nearest 0.5
    }

    if (result.module === "speaking" && speakingScores) {
      result.speakingScores = {
        fluencyCoherence: speakingScores.fluencyCoherence,
        lexicalResource: speakingScores.lexicalResource,
        grammaticalRange: speakingScores.grammaticalRange,
        pronunciation: speakingScores.pronunciation,
      };

      // Calculate average
      const avg =
        (speakingScores.fluencyCoherence +
          speakingScores.lexicalResource +
          speakingScores.grammaticalRange +
          speakingScores.pronunciation) /
        4;
      result.bandScore = Math.round(avg * 2) / 2;
    }

    // Calculate percentage from band score (band 0-9 → 0-100%)
    result.percentage = Math.round((result.bandScore / 9) * 100);

    await result.save();

    res.json({
      message: "Result graded successfully",
      result,
    });
  } catch (error) {
    console.error("Teacher grade result error:", error);
    res.status(500).json({ error: "Server error" });
  }
};

exports.createManualResult = async (req, res) => {
  try {
    const { sessionId, testId, module } = req.body;
    const userId = req.user.userId;

    // Validate required fields
    if (!sessionId || !testId || !module) {
      return res.status(400).json({
        error: "Session ID, Test ID, and module are required",
      });
    }

    // Validate module is manually graded
    if (module !== "writing" && module !== "speaking") {
      return res.status(400).json({
        error: "This endpoint is only for Writing and Speaking modules",
      });
    }

    // Validate session exists and belongs to user
    const session = await Session.findById(sessionId);
    if (!session) {
      return res.status(404).json({ error: "Session not found" });
    }

    if (session.userId.toString() !== userId) {
      return res.status(403).json({ error: "Unauthorized" });
    }

    if (session.status !== "completed") {
      return res.status(400).json({
        error: "Session must be completed before creating result",
      });
    }

    // Check if result already exists
    const existingResult = await Result.findOne({ sessionId });
    if (existingResult) {
      return res.status(400).json({
        error: "Result already exists for this session",
      });
    }

    // Get test
    const test = await Test.findById(testId);
    if (!test) {
      return res.status(404).json({ error: "Test not found" });
    }

    // Create result (pending teacher grading)
    const result = await Result.create({
      userId,
      testId,
      sessionId,
      module,
      totalQuestions: test.totalQuestions,
      correctAnswers: 0,
      incorrectAnswers: 0,
      unanswered: 0,
      bandScore: null, // Will be set by teacher
      percentage: null, // Will be calculated after grading
      isManuallyGraded: true,
      gradingNotes: null,
      writingScores: module === "writing" ? {} : undefined,
      speakingScores: module === "speaking" ? {} : undefined,
    });

    res.status(201).json({
      message: "Result created. Waiting for teacher grading.",
      result,
    });
  } catch (error) {
    console.error("Create manual result error:", error);
    res.status(500).json({ error: "Server error" });
  }
};

// ==========================================
// GET STUDENT ANALYTICS (DASHBOARD CHARTS)
// ==========================================
exports.getStudentAnalytics = async (req, res) => {
  try {
    const userId = req.user.userId;

    // 1. Get Trend Data (Last 10 results)
    const trendResults = await Result.find({
      userId,
      bandScore: { $ne: null }, // Only graded tests
    })
      .sort({ createdAt: -1 }) // Latest first for line chart
      .select("bandScore module createdAt")
      .limit(15); // Limit to latest 10 tests

    const trendData = trendResults.reverse().map((r) => {
      const date = new Date(r.createdAt);
      return {
        date: `${date.toLocaleDateString()} ${date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`,
        score: r.bandScore,
        module: r.module,
      };
    });

    // 2. Get Module Averages
    const moduleStats = await Result.aggregate([
      {
        $match: {
          userId: new mongoose.Types.ObjectId(userId),
          bandScore: { $ne: null },
        },
      },
      {
        $group: {
          _id: "$module",
          averageScore: { $avg: "$bandScore" },
          testsTaken: { $sum: 1 },
        },
      },
    ]);

    // Format for charts
    const moduleData = [
      { name: "Reading", score: 0, count: 0 },
      { name: "Listening", score: 0, count: 0 },
      { name: "Writing", score: 0, count: 0 },
    ];

    moduleStats.forEach((stat) => {
      const index = moduleData.findIndex(
        (m) => m.name.toLowerCase() === stat._id,
      );
      if (index !== -1) {
        moduleData[index].score = Math.round(stat.averageScore * 10) / 10;
        moduleData[index].count = stat.testsTaken;
      }
    });

    res.json({
      trendData,
      moduleData,
    });
  } catch (error) {
    console.error("Get analytics error:", error);
    res.status(500).json({ error: "Server error" });
  }
};
