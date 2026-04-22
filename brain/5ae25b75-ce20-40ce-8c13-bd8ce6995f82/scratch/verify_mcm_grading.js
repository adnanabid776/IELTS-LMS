
const normalizeAnswer = (answer) => {
  if (!answer) return "";
  return answer
    .toString()
    .replace(/<[^>]*>/g, "")
    .toLowerCase()
    .trim()
    .replace(/^(the|a|an)\s+/i, "")
    .replace(/\s+/g, " ")
    .replace(/[.,;!?]/g, "");
};

const isAnswerCorrect = (user, correct, alts = [], type) => {
  if (type === "multiple-choice-multi") {
    const multiNorm = (val) => {
      if (!val) return "";
      return val.toString().replace(/[^a-zA-Z]/g, "").toLowerCase().split("").sort().join("");
    };
    return multiNorm(user) === multiNorm(correct);
  }
  return normalizeAnswer(user) === normalizeAnswer(correct);
}

const calculatePoints = (userAnswer, question) => {
  if (question.questionType === "multiple-choice-multi") {
    const totalPossible = (question.items && question.items.length > 0)
      ? question.items.length
      : (question.points > 1 ? question.points : 1);

    const multiNorm = (val) => {
      if (!val) return [];
      const str = Array.isArray(val) ? val.join(",") : val.toString();
      return str
        .replace(/[^a-zA-Z]/g, "")
        .toLowerCase()
        .split("");
    };

    const userLetters = multiNorm(userAnswer);
    const correctLetters = multiNorm(question.correctAnswer);

    if (totalPossible > 1) {
      let scored = 0;
      const remainingCorrect = [...correctLetters];
      userLetters.forEach((letter) => {
        const idx = remainingCorrect.indexOf(letter);
        if (idx !== -1) {
          scored++;
          remainingCorrect.splice(idx, 1);
        }
      });

      return {
        scored: Math.min(scored, totalPossible),
        total: totalPossible,
        attempted: userLetters.length > 0 ? totalPossible : 0,
      };
    } else {
      const isCorrect = isAnswerCorrect(userAnswer, question.correctAnswer, [], "multiple-choice-multi");
      return { scored: isCorrect ? 1 : 0, total: 1, attempted: userLetters.length > 0 ? 1 : 0 };
    }
  }
  return { scored: 0, total: 1 };
};

// TEST CASES
const testCases = [
  {
    name: "Standard 'Choose 2' - Full Marks",
    user: ["B", "D"],
    question: { questionType: "multiple-choice-multi", correctAnswer: "B,D", items: [{}, {}] },
    expected: { scored: 2, total: 2, attempted: 2 }
  },
  {
    name: "Standard 'Choose 2' - Partial Marks (1/2)",
    user: ["B", "A"],
    question: { questionType: "multiple-choice-multi", correctAnswer: "B,D", items: [{}, {}] },
    expected: { scored: 1, total: 2, attempted: 2 }
  },
  {
    name: "Standard 'Choose 2' - Zero Marks",
    user: ["A", "C"],
    question: { questionType: "multiple-choice-multi", correctAnswer: "B,D", items: [{}, {}] },
    expected: { scored: 0, total: 2, attempted: 2 }
  },
  {
    name: "Points-based 'Choose 2' - Full Marks",
    user: "B,D",
    question: { questionType: "multiple-choice-multi", correctAnswer: "B,D", points: 2 },
    expected: { scored: 2, total: 2, attempted: 2 }
  }
];

console.log("--- MCM Grading Verification (Bug Fix) ---");
testCases.forEach(tc => {
  const result = calculatePoints(tc.user, tc.question);
  const qIncorrect = result.attempted - result.scored;
  const passed = result.scored === tc.expected.scored && result.total === tc.expected.total && qIncorrect >= 0;
  console.log(`${passed ? '✅' : '❌'} ${tc.name}: Got ${result.scored}/${result.total}, Attempted: ${result.attempted}, Incorrect: ${qIncorrect}`);
});
