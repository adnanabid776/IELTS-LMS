require("dotenv").config();
const mongoose = require("mongoose");
const Question = require("../models/Question");

const run = async () => {
  try {
    await mongoose.connect("mongodb://localhost:27017/ielts-lms");
    console.log("Connected to DB");

    // Search for the question with the specific answer text
    const questions = await Question.find({
      "items.correctAnswer":
        /A single certainty among other less definite facts/i,
    });

    console.log(`Found ${questions.length} matching questions.`);

    questions.forEach((q, i) => {
      console.log(`\n--- Question ${i + 1} ---`);
      console.log("ID:", q._id);
      console.log("Text:", q.questionText);
      console.log("Options (Headings):");
      q.options.forEach((opt, idx) => console.log(`  [${idx}] ${opt}`));

      console.log("Items (Paragraphs):");
      q.items.forEach((item) => {
        console.log(`  Label: ${item.label}`);
        console.log(`  Correct Answer (DB): "${item.correctAnswer}"`);
      });
    });

    process.exit(0);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
};

run();
