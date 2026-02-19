const mongoose = require("mongoose");
const Question = require("../models/Question");
require("dotenv").config();

const run = async () => {
  try {
    // Connect to DB (assuming local or from env)
    await mongoose.connect(
      process.env.MONGODB_URI || "mongodb://localhost:27017/ielts-lms",
    );
    console.log("Connected to DB");

    // Search for the question text snippet from the screenshot
    const snippet =
      "Simon Colton says it is important to consider the long-term view when";
    const question = await Question.findOne({
      questionText: { $regex: snippet, $options: "i" },
    });

    if (!question) {
      console.log("Question not found!");
    } else {
      console.log("Question Found:");
      console.log(`_id: ${question._id}`);
      console.log(`Type: ${question.questionType}`);
      console.log(
        `Summary Config:`,
        JSON.stringify(question.summaryConfig, null, 2),
      );
      console.log(`Correct Answer:`, question.correctAnswer);
      console.log("--------------------------------");

      // Test grading logic manually on this specific doc
      const { isAnswerCorrect } = require("./gradingEngine");
      const userAnswer = "D"; // From screenshot
      const isCorrect = isAnswerCorrect(
        userAnswer,
        question.correctAnswer,
        question.alternativeAnswers,
        question.questionType,
        question.summaryConfig,
      );
      console.log(`Test Grading with input 'D': ${isCorrect}`);
    }
  } catch (error) {
    console.error(error);
  } finally {
    await mongoose.disconnect();
  }
};

run();
