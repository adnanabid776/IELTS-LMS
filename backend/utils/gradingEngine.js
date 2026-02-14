const mongoose = require("mongoose");

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

  // 2. Lenient Matching (Fill in the blanks / Short Answer)
  // Even for short-answer, we usually want EXACT match of the keyword.
  // "includes" logic leads to false positives like "ropesodk" matches "ropes".
  // Normalization handles capitalization, punctuation, and articles.

  // Check exact match first
  if (normUser === normCorrect) return true;

  // Check alternative answers
  for (let alt of alternativeAnswers) {
    const normAlt = normalizeAnswer(alt);
    if (normUser === normAlt) return true;
  }

  return false;
};

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

/**
 * Calculates the full result for a session using the Shadow Grader logic.
 * @param {Object} session - The session object containing answers.
 * @param {Array} allQuestions - Array of question objects.
 * @returns {Object} { correctAnswers, incorrectAnswers, unanswered, totalQuestions }
 */
const calculateResult = (session, allQuestions) => {
  // Create a map of questions for faster lookup
  const questionMap = {};
  allQuestions.forEach((q) => {
    questionMap[q._id.toString()] = q;
  });

  let correctAnswers = 0;
  let incorrectAnswers = 0;
  let unanswered = 0;
  let totalQuestionsCalc = 0;

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
    const qIncorrect = attempted - scored;
    incorrectAnswers += qIncorrect;
  });

  return {
    correctAnswers,
    incorrectAnswers,
    unanswered,
    totalQuestions: totalQuestionsCalc,
  };
};

module.exports = {
  normalizeAnswer,
  isAnswerCorrect,
  calculatePoints,
  calculateResult,
};
