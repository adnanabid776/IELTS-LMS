/**
 * Shared utility functions for answer validation
 * Used by sessionController and resultController
 */

// Normalize answer for comparison (remove articles, extra spaces)
const normalizeAnswer = (answer) => {
  if (!answer) return "";
  return answer
    .toString()
    .toLowerCase()
    .trim()
    .replace(/^(a|an|the)\s+/i, "") // Remove leading articles
    .replace(/\s+/g, " "); // Normalize spaces
};

// Check if answer is correct (handles fuzzy matching)
const isAnswerCorrect = (
  userAnswer,
  correctAnswer,
  alternativeAnswers = [],
) => {
  if (!userAnswer || !correctAnswer) return false;

  const normalizedUser = normalizeAnswer(userAnswer);
  const normalizedCorrect = normalizeAnswer(correctAnswer);

  // Exact match
  if (normalizedUser === normalizedCorrect) return true;

  // Check alternative answers
  for (const alt of alternativeAnswers) {
    if (normalizeAnswer(alt) === normalizedUser) return true;
  }

  // Check if user answer contains the correct answer (for longer answers)
  if (
    normalizedUser.includes(normalizedCorrect) ||
    normalizedCorrect.includes(normalizedUser)
  ) {
    // Only accept if the difference is minimal (e.g., extra article)
    const lengthDiff = Math.abs(
      normalizedUser.length - normalizedCorrect.length,
    );
    if (lengthDiff <= 5) return true;
  }

  return false;
};

module.exports = {
  normalizeAnswer,
  isAnswerCorrect,
};
