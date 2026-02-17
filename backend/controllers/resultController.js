const Result = require("../models/Result");
const mongoose = require("mongoose");
const Session = require("../models/Session");
const Test = require("../models/Test");
const Section = require("../models/Section");
const Question = require("../models/Question");
const gradingEngine = require("../utils/gradingEngine"); // Shadow Grader

// Normalize answer for comparison
const normalizeAnswer = (answer) => {
  if (!answer) return "";
  return answer
    .toString()
    .replace(/<[^>]*>/g, "") // Strip HTML tags
    .toLowerCase()
    .trim()
    .replace(/^(the|a|an)\s+/i, "") // Remove leading articles
    .replace(/\s+/g, " ") // Normalize spaces
    .replace(/[.,;!?]/g, ""); // Remove punctuation
};
// Check if answer is correct (handles fuzzy matching based on type)
const isAnswerCorrect = (
  userAnswer,
  correctAnswer,
  alternativeAnswers = [],
  questionType = "short-answer", // Default to lenient
  summaryConfig = null,
) => {
  if (!userAnswer) return false;
  if (
    !correctAnswer &&
    (!alternativeAnswers || alternativeAnswers.length === 0)
  )
    return false; // No correct answer defined = cannot be correct

  // Normalize
  const normUser = normalizeAnswer(userAnswer);
  const normCorrect = normalizeAnswer(correctAnswer);

  // 1. Strict Matching Types
  const strictTypes = [
    "multiple-choice",
    "multiple-choice-multi",
    "true-false-not-given",
    "yes-no-not-given",
    "matching-headings",
    "matching-information",
    "matching-features",
    "map-labeling",
    "table-completion", // Table completion usually expects specific words/numbers
  ];

  if (strictTypes.includes(questionType)) {
    // Check main correct answer
    if (normUser === normCorrect) return true;

    // Check alternatives (keywords) strict match
    for (let alt of alternativeAnswers) {
      if (normUser === normalizeAnswer(alt)) return true;
    }

    return false;
  }

  // 2. Summary Completion (Dual Check: Label or Text)
  if (questionType === "summary-completion") {
    // Check 1: Direct Match (User Answer vs Correct Answer)
    if (normUser === normCorrect) return true;

    // Check 2: Alternative Answers
    for (let alt of alternativeAnswers) {
      if (normUser === normalizeAnswer(alt)) return true;
    }

    // Check 3: Option-based Resolution (if select mode or manual match)
    // If strict options exist (A, B, C...)
    const options = summaryConfig?.options || [];
    if (options.length > 0) {
      // Case A: User Answer is a Label ("A"), Correct Answer is Text ("Information")
      // Resolve User Label to Text
      if (/^[A-Z]$/i.test(userAnswer)) {
        const index = userAnswer.toUpperCase().charCodeAt(0) - 65;
        if (options[index]) {
          const resolvedUserText = normalizeAnswer(options[index]);
          if (resolvedUserText === normCorrect) return true;
          // Check alternatives against resolved text
          for (let alt of alternativeAnswers) {
            if (resolvedUserText === normalizeAnswer(alt)) return true;
          }
        }
      }

      // Case B: User Answer is Text ("Information"), Correct Answer is Label ("A")
      // Resolve Correct Label to Text
      if (/^[A-Z]$/i.test(correctAnswer)) {
        const index = correctAnswer.toUpperCase().charCodeAt(0) - 65;
        if (options[index]) {
          const resolvedCorrectText = normalizeAnswer(options[index]);
          if (normUser === resolvedCorrectText) return true;
        }
      }
    }
    return false;
  }
  // 2. Lenient Matching (Fill in the blanks / Short Answer)
  // Check exact match first
  if (normUser === normCorrect) return true;

  // Check alternative answers
  for (let alt of alternativeAnswers) {
    const normAlt = normalizeAnswer(alt);
    if (normUser === normAlt) return true;
  }

  return false;
};

// Calculate band score from correct answers
const calculateBandScore = (correctAnswers, totalQuestions, module) => {
  if (totalQuestions === 0) return 0;
  const percentage = (correctAnswers / totalQuestions) * 100;

  // IELTS band score conversion (simplified)
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
// Helper to calculate points for a question
const calculatePoints = (userAnswer, question) => {
  // 1. Composite Types (Map Labeling, Matching, Table Completion)
  if (
    question.questionType === "map-labeling" ||
    question.questionType === "matching-headings" ||
    question.questionType === "matching-information" ||
    question.questionType === "matching-features" ||
    question.questionType === "table-completion"
  ) {
    const items = question.items || [];
    let scored = 0;
    let attempted = 0;
    const total = items.length;
    const itemDetails = {}; // Map label -> boolean (isCorrect)

    if (!userAnswer || typeof userAnswer !== "object") {
      // Mark all as incorrect
      items.forEach((item) => {
        itemDetails[item.label] = false;
      });
      return { scored: 0, total, attempted: 0, itemDetails };
    }

    items.forEach((item) => {
      const userVal = userAnswer[item.label] || userAnswer[String(item.label)];
      let isItemCorrect = false;

      // Check if this specific item was attempted
      if (userVal && userVal.trim() !== "") {
        attempted++;

        // SPECIAL HANDLING FOR MATCHING TYPES (Headings, Information, Features)
        // Correct answer is usually a single letter (A, B, C...)
        // User answer might be "Paragraph A" or "Section B" or just "A"
        let normalizedUserVal = userVal;

        if (
          question.questionType === "matching-headings" ||
          question.questionType === "matching-information" ||
          question.questionType === "matching-features"
        ) {
          // Extract just the letter if it looks like "Paragraph X"
          // Regex to find a lone letter or "Paragraph X"
          // But simpler: just take the last word if it's a single letter?
          // Or safer: specific replace.
          const match = userVal.match(/\b([A-Z])\b/i); // Find a single letter boundary
          if (match) {
            normalizedUserVal = match[0].toUpperCase();
          }
        }

        // Check correctness using the normalized value for matching types
        // For others (Map/Table), use original userVal
        const valToCheck =
          question.questionType === "matching-headings" ||
          question.questionType === "matching-information" ||
          question.questionType === "matching-features"
            ? normalizedUserVal
            : userVal;

        // Use question options or item options for resolution
        const targetOptions =
          question.options && question.options.length > 0
            ? question.options
            : item.options && item.options.length > 0
              ? item.options
              : [];

        // 2. Resolve Correct Answer to Label if it's a long string found in options
        // If correctAnswer is NOT a single letter, try to find it in options.
        let resolvedCorrectAnswer = item.correctAnswer;

        if (
          item.correctAnswer &&
          item.correctAnswer.length > 1 &&
          targetOptions.length > 0
        ) {
          const normCorrect = normalizeAnswer(item.correctAnswer);

          // Strategy 1: Exact Match (Normalized)
          let optionIndex = targetOptions.findIndex(
            (opt) => normalizeAnswer(opt) === normCorrect,
          );

          // Strategy 2: Inclusion (if exact match fails)
          if (optionIndex === -1) {
            optionIndex = targetOptions.findIndex((opt) => {
              const normOpt = normalizeAnswer(opt);
              if (normCorrect.length < 15 || normOpt.length < 15) return false;
              return (
                normOpt.includes(normCorrect) || normCorrect.includes(normOpt)
              );
            });
          }

          // Strategy 3: Token Overlap (Best effort for messy text)
          if (optionIndex === -1 && normCorrect.length > 20) {
            optionIndex = targetOptions.findIndex((opt) => {
              const normOpt = normalizeAnswer(opt);
              const tokensCorrect = new Set(
                normCorrect.split(" ").filter((t) => t.length > 3),
              );
              const tokensOpt = new Set(
                normOpt.split(" ").filter((t) => t.length > 3),
              );

              if (tokensCorrect.size < 5) return false;

              let shared = 0;
              tokensCorrect.forEach((t) => {
                if (tokensOpt.has(t)) shared++;
              });

              const overlap = shared / tokensCorrect.size;
              return overlap > 0.6;
            });
          }

          if (optionIndex !== -1) {
            // Convert Index to Letter (0->A, 1->B)
            resolvedCorrectAnswer = String.fromCharCode(65 + optionIndex);
            // console.log(`[Grading] Resolved long answer to ${resolvedCorrectAnswer} for item ${item.label}`);
          } else {
            console.warn(
              `[Grading Warning] Could not resolve correct answer text to any option for Item ${item.label}. DB Mismatch likely.`,
            );
            console.warn(
              `Correct Text: ${item.correctAnswer.substring(0, 50)}...`,
            );
          }
        }

        if (
          isAnswerCorrect(
            valToCheck,
            resolvedCorrectAnswer,
            item.options || [],
            [],
            question.questionType,
          )
        ) {
          scored++;
          isItemCorrect = true;
        }
      }
      itemDetails[item.label] = isItemCorrect;
    });

    return { scored, total, attempted, itemDetails };
  }

  // 2. Multiple Choice Multi
  if (question.questionType === "multiple-choice-multi") {
    // For multi-choice, we need to check how many were selected vs total allowed?
    // IF items exist (unlikely for MC-Multi in this schema), handle like composite.

    // Attempted logic:
    const isAttempted = userAnswer && userAnswer.length > 0;

    const isCorrect = isAnswerCorrect(
      userAnswer,
      question.correctAnswer,
      question.alternativeAnswers,
      question.questionType,
    );
    return {
      scored: isCorrect ? 1 : 0,
      total: 1,
      attempted: isAttempted ? 1 : 0,
    };
  }

  // 3. Standard Types (Short Answer, MC-Std, etc)
  const isCorrect = isAnswerCorrect(
    userAnswer,
    question.correctAnswer,
    question.alternativeAnswers,
    question.questionType,
    question.summaryConfig, // Pass config
  );

  const isAttempted =
    userAnswer &&
    (typeof userAnswer === "string"
      ? userAnswer.trim().length > 0
      : !!userAnswer);

  return {
    scored: isCorrect ? 1 : 0,
    total: 1,
    attempted: isAttempted ? 1 : 0,
  };
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
    let totalQuestionsCalc = 0; // Calculated based on sub-items

    const questionTypeBreakdown = {};
    const sectionPerformance = [];

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

        // Calculate points
        const { scored, total } = calculatePoints(answer.userAnswer, question);

        correctAnswers += scored;

        // Incorrect logic is tricky with partial points.
        // Let's say: incorrect = total - scored.
        incorrectAnswers += total - scored;

        // Track by question type
        if (!questionTypeBreakdown[question.questionType]) {
          questionTypeBreakdown[question.questionType] = {
            type: question.questionType,
            total: 0,
            correct: 0,
          };
        }
        questionTypeBreakdown[question.questionType].total += total;
        questionTypeBreakdown[question.questionType].correct += scored;
      });

      // Handle Unanswered & Calculate Total Questions accurately
      // Iterate over ALL questions to ensure full coverage
      correctAnswers = 0;
      incorrectAnswers = 0;
      unanswered = 0;
      totalQuestionsCalc = 0;

      // Reset breakdown
      for (const key in questionTypeBreakdown)
        delete questionTypeBreakdown[key];

      allQuestions.forEach((q) => {
        const answerEntry = session.answers.find(
          (a) => a.questionId.toString() === q._id.toString(),
        );
        const userAnswer = answerEntry ? answerEntry.userAnswer : null;

        const { scored, total, attempted } = calculatePoints(userAnswer, q);

        totalQuestionsCalc += total;
        correctAnswers += scored;

        // Unanswered = Total Items - Attempted Items
        const qUnanswered = total - attempted;
        unanswered += qUnanswered;

        // Incorrect = Attempted Items - Scored (Correct) Items
        // (If I attempted 3, and got 1 right, then 2 were wrong)
        const qIncorrect = attempted - scored;
        incorrectAnswers += qIncorrect;

        // Breakdown
        if (!questionTypeBreakdown[q.questionType]) {
          questionTypeBreakdown[q.questionType] = {
            type: q.questionType,
            total: 0,
            correct: 0,
          };
        }
        questionTypeBreakdown[q.questionType].total += total;
        questionTypeBreakdown[q.questionType].correct += scored;
      });
    } else {
      // MANUAL GRADING: Just record that answers were submitted
      console.log(`Test requires manual grading (module: ${module})`);
      totalQuestionsCalc = allQuestions.length; // Fallback
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
      let sectionTotal = 0;

      sectionQuestions.forEach((q) => {
        const answer = session.answers.find(
          (a) => a.questionId.toString() === q._id.toString(),
        );
        const { scored, total } = calculatePoints(
          answer ? answer.userAnswer : null,
          q,
        );
        sectionCorrect += scored;
        sectionTotal += total;
      });

      sectionPerformance.push({
        sectionNumber: section.sectionNumber,
        sectionTitle: section.title,
        questionsAttempted: sectionTotal, // Assuming all "available" points
        correctAnswers: sectionCorrect,
        percentage:
          sectionTotal > 0
            ? Math.round((sectionCorrect / sectionTotal) * 100)
            : 0,
      });
    }

    // Calculate band score
    const totalQuestions = totalQuestionsCalc; // Use calculated total
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
    // Calculate total time spent if not already set (for Result creation)
    if (!session.totalTimeSpent) {
      session.totalTimeSpent = Math.floor(
        (Date.now() - session.startedAt.getTime()) / 1000,
      );
    }

    // Create result
    const result = await Result.create({
      userId,
      testId: test._id,
      sessionId,
      module: test.module,
      totalQuestions,
      correctAnswers,
      incorrectAnswers,
      unanswered,
      bandScore,
      percentage,
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

    // Mark session as completed to prevent duplicate submissions
    if (session.status !== "completed") {
      session.status = "completed";
      session.completedAt = new Date();
      await session.save();
    }

    // ============================================
    // SHADOW GRADING CHECK (Safe Mode)
    // ============================================
    if (!needsManualGrading) {
      try {
        const shadowResult = gradingEngine.calculateResult(
          session,
          allQuestions,
        );

        // Compare Shadow vs Live
        if (
          shadowResult.correctAnswers !== correctAnswers ||
          shadowResult.totalQuestions !== totalQuestions ||
          shadowResult.incorrectAnswers !== incorrectAnswers
        ) {
          console.warn(`⚠️ [SHADOW GRADER MISMATCH] Session ID: ${sessionId}`);
          console.warn(
            `   Live:   Correct=${correctAnswers}, Total=${totalQuestions}, Incorrect=${incorrectAnswers}`,
          );
          console.warn(
            `   Shadow: Correct=${shadowResult.correctAnswers}, Total=${shadowResult.totalQuestions}, Incorrect=${shadowResult.incorrectAnswers}`,
          );
        } else {
          console.log(`✅ [SHADOW GRADER MATCH] Session ID: ${sessionId}`);
        }
      } catch (shadowError) {
        console.error("⚠️ [SHADOW GRADER ERROR]", shadowError);
      }
    }

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

    // NOTE: isAnswerCorrect logic is now handled by calculatePoints (shared)
    // We don't need a local definition here anymore.

    // Build answer comparison
    const answerReview = allQuestions.map((question) => {
      const studentAnswer = session.answers.find(
        (a) =>
          a.questionId &&
          a.questionId._id &&
          a.questionId._id.toString() === question._id.toString(),
      );

      const userVal = studentAnswer?.userAnswer;
      // Use the shared calculatePoints logic to get accurate score/status
      const { scored, total, itemDetails } = calculatePoints(userVal, question);

      return {
        questionNumber: question.questionNumber,
        questionText: question.questionText,
        questionType: question.questionType,
        options: question.options,
        items: question.items, // Add items for matching/table types
        features: question.features, // Add features for Matching Features
        tableStructure: question.tableStructure, // Add table structure
        studentAnswer: userVal, // RAW answer (object or string)
        correctAnswer: question.correctAnswer,
        alternativeAnswers: question.alternativeAnswers,
        isCorrect: scored === total, // Fully correct (Green)
        score: scored, // Partial score
        maxScore: total, // Total possible
        isPartial: scored > 0 && scored < total, // Partial flag
        itemDetails, // Per-item correctness for composite questions
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
