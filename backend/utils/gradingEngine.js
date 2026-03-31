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

  // 2. Summary/Sentence Completion (Dual Check: Label or Text)
  if (
    questionType === "summary-completion" ||
    questionType === "sentence-completion"
  ) {
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

  if (
    question.questionType === "map-labeling" ||
    question.questionType === "matching-headings" ||
    question.questionType === "matching-information" ||
    question.questionType === "matching-features" ||
    question.questionType === "table-completion" ||
    question.questionType === "form-completion"
  ) {
    let items = question.items || [];
    if (question.questionType === "form-completion") {
      items = items.filter(item => item.text && item.text.includes("__________"));
    }
    
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

    items.forEach((item, index) => {
      // For form-completion, item.label is visual text, so we use its row index as the key
      const itemKey = question.questionType === "form-completion" ? String(index + 1) : item.label;
      const userVal = userAnswer[itemKey] || userAnswer[String(itemKey)];
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

  // 2. Multiple Choice Multi (Per-answer scoring)
  if (question.questionType === "multiple-choice-multi") {
    const isAttempted =
      userAnswer &&
      (Array.isArray(userAnswer) ? userAnswer.length > 0 : !!userAnswer);

    // Normalize user answer to a sorted set of uppercase letters
    let userLetters = [];
    if (Array.isArray(userAnswer)) {
      userLetters = userAnswer.map((v) => v.toString().trim().toUpperCase());
    } else if (typeof userAnswer === "string" && userAnswer.trim()) {
      userLetters = userAnswer
        .toUpperCase()
        .split(/[\s,]+/)
        .map((v) => v.trim())
        .filter((v) => v.length > 0);
    }

    // Normalize correct answer to a sorted set of uppercase letters
    let correctLetters = [];
    if (question.correctAnswer && typeof question.correctAnswer === "string") {
      correctLetters = question.correctAnswer
        .toUpperCase()
        .split(/[\s,]+/)
        .map((v) => v.trim())
        .filter((v) => v.length > 0);
    }

    // If correctAnswer has single letters concatenated like "AC", split them
    if (
      correctLetters.length === 1 &&
      correctLetters[0].length > 1 &&
      /^[A-Z]+$/.test(correctLetters[0])
    ) {
      correctLetters = correctLetters[0].split("");
    }
    // Same for user answer
    if (
      userLetters.length === 1 &&
      userLetters[0].length > 1 &&
      /^[A-Z]+$/.test(userLetters[0])
    ) {
      userLetters = userLetters[0].split("");
    }

    // Total points = number of correct answers expected
    const totalPoints = correctLetters.length;

    // Count how many correct letters the user selected
    const correctPicks = userLetters.filter((l) =>
      correctLetters.includes(l)
    ).length;

    // Count wrong picks (user selected but not in correct)
    const wrongPicks = userLetters.filter(
      (l) => !correctLetters.includes(l)
    ).length;

    // Score: correct picks minus wrong picks, minimum 0
    const scored = Math.max(0, correctPicks - wrongPicks);

    return {
      scored: scored,
      total: totalPoints,
      attempted: isAttempted ? 1 : 0,
    };
  }

  // 3. Standard Types (Short Answer, MC-Std, Matching-Endings, etc)
  // For multiple-choice and matching-endings: resolve letter <-> option text mismatch
  // Bulk uploads store correctAnswer as "D", frontend stores full option text, or vice versa
  if (
    (question.questionType === "multiple-choice" ||
      question.questionType === "matching-endings") &&
    question.options &&
    question.options.length > 0
  ) {
    const normUser = normalizeAnswer(userAnswer);
    const normCorrect = normalizeAnswer(question.correctAnswer);

    // Direct match
    if (normUser === normCorrect) {
      return { scored: 1, total: 1, attempted: 1 };
    }

    // Case A: correctAnswer is a letter ("D"), userAnswer is full text
    if (/^[a-z]$/i.test(question.correctAnswer)) {
      const idx = question.correctAnswer.toUpperCase().charCodeAt(0) - 65;
      if (idx >= 0 && idx < question.options.length) {
        const resolvedCorrectText = normalizeAnswer(question.options[idx]);
        if (normUser === resolvedCorrectText) {
          return { scored: 1, total: 1, attempted: 1 };
        }
      }
    }

    // Case B: correctAnswer is full text, userAnswer is a letter
    if (/^[a-z]$/i.test(userAnswer)) {
      const idx = userAnswer.toUpperCase().charCodeAt(0) - 65;
      if (idx >= 0 && idx < question.options.length) {
        const resolvedUserText = normalizeAnswer(question.options[idx]);
        if (resolvedUserText === normCorrect) {
          return { scored: 1, total: 1, attempted: 1 };
        }
      }
    }

    // Check alternativeAnswers with the same resolution
    for (const alt of question.alternativeAnswers || []) {
      const normAlt = normalizeAnswer(alt);
      if (normUser === normAlt) {
        return { scored: 1, total: 1, attempted: 1 };
      }
      // If alt is a letter, resolve it
      if (/^[a-z]$/i.test(alt)) {
        const idx = alt.toUpperCase().charCodeAt(0) - 65;
        if (idx >= 0 && idx < question.options.length) {
          if (normUser === normalizeAnswer(question.options[idx])) {
            return { scored: 1, total: 1, attempted: 1 };
          }
        }
      }
    }

    // If none matched, it's incorrect
    const isAttempted =
      userAnswer &&
      (typeof userAnswer === "string"
        ? userAnswer.trim().length > 0
        : !!userAnswer);
    return { scored: 0, total: 1, attempted: isAttempted ? 1 : 0 };
  }

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
