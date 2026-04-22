const multiNorm = (val) => {
  if (!val) return "";
  return val.toString()
    .replace(/[^a-zA-Z]/g, "") // Remove all non-letters
    .toLowerCase()
    .split("")
    .sort()
    .join("");
};

const testCases = [
  {
    user: ["B", "E", "H", "I", "J"],
    correct: "B, E, H, I, J",
    expected: true
  },
  {
    user: ["B", "E", "H", "I", "J"],
    correct: "B,E,H,I,J",
    expected: true
  },
  {
    user: "B,E,H,I,J",
    correct: "B, E, H, I, J",
    expected: true
  },
  {
    user: ["J", "I", "H", "E", "B"], // Different order in array
    correct: "B, E, H, I, J",
    expected: true
  },
  {
    user: ["A", "B"],
    correct: "A, C",
    expected: false
  },
  {
    user: ["A", "B"],
    correct: "A, B, C",
    expected: false
  }
];

testCases.forEach((tc, i) => {
  const userNorm = multiNorm(tc.user);
  const correctNorm = multiNorm(tc.correct);
  const result = userNorm === correctNorm;
  console.log(`Test Case ${i + 1}: ${result === tc.expected ? "PASSED" : "FAILED"}`);
  if (result !== tc.expected) {
    console.log(`  User: ${tc.user} -> ${userNorm}`);
    console.log(`  Correct: ${tc.correct} -> ${correctNorm}`);
  }
});
