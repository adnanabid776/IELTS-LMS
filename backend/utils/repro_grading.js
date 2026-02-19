const fs = require("fs");
const mongoose = require("mongoose");
const Question = require("../models/Question");

const updateQuestion = async () => {
  const logFile = "debug_output.txt";
  const log = (msg) => {
    console.log(msg);
    fs.appendFileSync(logFile, msg + "\n");
  };

  try {
    fs.writeFileSync(logFile, "Starting update...\n");
    await mongoose.connect("mongodb://localhost:27017/ielts-lms");
    log("Connected to MongoDB");

    // Find the first T/F question
    const q = await Question.findOne({ questionType: "true-false-not-given" });

    if (q) {
      log(`Found Question ID: ${q._id}`);
      log(`Old Type: ${q.questionType}`);

      q.questionType = "yes-no-not-given";
      await q.save();

      log(`New Type: ${q.questionType}`);
      log("Update Successful.");
    } else {
      log("No 'true-false-not-given' question found to update.");
    }
  } catch (error) {
    log(`Error: ${error.message}`);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
};

updateQuestion();
