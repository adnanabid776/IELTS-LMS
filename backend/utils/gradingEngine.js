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
  // Helper to get Roman numeral
  const toRoman = (num) => {
    if (num === 1) return "i";
    if (num === 2) return "ii";
    if (num === 3) return "iii";
    if (num === 4) return "iv";
    if (num === 5) return "v";
    if (num === 6) return "vi";
    if (num === 7) return "vii";
    if (num === 8) return "viii";
    if (num === 9) return "ix";
    if (num === 10) return "x";
    return String.fromCharCode(96 + num); // Fallback to a, b, c
  };

  // ... existing code

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

        // SPECIAL HANDLING FOR MATCHING TYPES
        let normalizedUserVal = userVal;

        // For mathing-headings, userVal is usually "i", "iv", etc.
        // For matching-information/features, it's usually "A", "B", etc.

        if (
          question.questionType === "matching-information" ||
          question.questionType === "matching-features"
        ) {
          // Extract just the letter if it looks like "Paragraph X"
          const match = userVal.match(/\b([A-Z])\b/i);
          if (match) {
            normalizedUserVal = match[0].toUpperCase();
          }
        }

        // Use question options or item options for resolution
        const targetOptions =
          question.options && question.options.length > 0
            ? question.options
            : item.options && item.options.length > 0
              ? item.options
              : [];

        // 2. Resolve Correct Answer to Label if it's a long string found in options
        let resolvedCorrectAnswer = item.correctAnswer;

        // If the correct answer is already short (like "iv" or "A"), we don't need to resolve via text matching
        const needsResolution =
          item.correctAnswer &&
          item.correctAnswer.length > 4 && // threshold for "long string"
          targetOptions.length > 0;

        if (needsResolution) {
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

          // Strategy 3: Token Overlap
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
            if (question.questionType === "matching-headings") {
              // Support BOTH Roman Numerals (frontend display) AND Letters (legacy/standard backend)
              const roman = toRoman(optionIndex + 1);
              const letter = String.fromCharCode(97 + optionIndex); // 'a', 'b', 'c' (lowercase)

              // We will compare against both. For standard flow, we set resolvedCorrectAnswer to match the user's format if possible,
              // or just let isAnswerCorrect handle one.
              // Hack: We can set resolvedCorrectAnswer to a regex or array?
              // Easier: Check if userVal matches either.

              // If user sent a letter, correct answer is letter.
              // If user sent roman, correct answer is roman.
              if (/^[a-z]$/i.test(normalizedUserVal)) {
                resolvedCorrectAnswer = letter;
              } else {
                resolvedCorrectAnswer = roman;
              }
            } else {
              // Use Letters (0-based index -> A, B, C...)
              resolvedCorrectAnswer = String.fromCharCode(65 + optionIndex);
            }
          } else {
            // Could not resolve correct answer text for Item ${item.label}.
          }
        }

        // Final check
        const isMatch = isAnswerCorrect(
          normalizedUserVal,
          resolvedCorrectAnswer,
          item.options || [], // alternatives
          question.questionType,
        );

        if (isMatch) {
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
