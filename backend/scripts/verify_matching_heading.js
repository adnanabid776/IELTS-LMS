console.log("Starting verification script...");
let gradingEngine;
try {
  gradingEngine = require("../utils/gradingEngine");
  console.log("Successfully required gradingEngine");
} catch (error) {
  console.error("Failed to require gradingEngine:", error);
  process.exit(1);
}

const { calculatePoints } = gradingEngine;

console.log("--- Verifying Matching Title Grading ---");

const question = {
  _id: "6992c78519bd293dc94df868",
  questionType: "matching-headings",
  questionText: "Real Question",
  options: [
    "The areas and artefacts within the pyramid itself",
    "A difficult task for those involved",
    "A king who saved his people",
    "A single certainty among other less definite facts", // Index 3 -> iv
    "An overview of the external buildings and areas",
    "A pyramid design that others copied",
    "An idea for changing the design of burial structures",
    "An incredible experience despite the few remains",
    "The answers to some unexpected questions",
  ],
  items: [
    {
      label: "A",
      correctAnswer: "A single certainty among other less definite facts",
    },
  ],
};

const userAnswer = {
  A: "iv",
};

const result = calculatePoints(userAnswer, question);

console.log("Scored:", result.scored);
console.log("Item Details:", result.itemDetails);

if (result.itemDetails["A"] === true) {
  console.log("✅ SUCCESS: Matching Heading logic works with REAL data.");
} else {
  console.error("❌ FAILURE: Logic incorrect with REAL data.");
  console.log("Expected A=true, got", result.itemDetails["A"]);
  process.exit(1);
}
