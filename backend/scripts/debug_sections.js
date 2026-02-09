const mongoose = require("mongoose");
const Section = require("../models/Section");
const Test = require("../models/Test");
require("dotenv").config();

const debugSections = async () => {
  try {
    await mongoose.connect(
      process.env.MONGO_URI || "mongodb://localhost:27017/ielts-lms",
    );
    console.log("Connected to DB");

    const sections = await Section.find({}).populate("testId", "title module");

    console.log("\n--- LISTENING SECTIONS DEBUG ---");
    const listeningSections = sections.filter(
      (s) => s.testId && s.testId.module === "listening",
    );

    if (listeningSections.length === 0) {
      console.log("No Listening sections found.");
    }

    listeningSections.forEach((s) => {
      console.log(`\nSection: ${s.sectionNumber} - ${s.title}`);
      console.log(`Test: ${s.testId.title}`);
      console.log(`ID: ${s._id}`);
      console.log(`Audio URL: ${s.audioUrl || "NONE"}`);
      console.log(
        `Play Once Only: ${s.playOnceOnly} (Type: ${typeof s.playOnceOnly})`,
      );
      console.log(
        `Disable Replay: ${s.disableReplay} (Type: ${typeof s.disableReplay})`,
      );
      console.log(
        `Lock Nav: ${s.lockNavigationDuringAudio} (Type: ${typeof s.lockNavigationDuringAudio})`,
      );
    });
    console.log("\n--------------------------------");
  } catch (error) {
    console.error("Error:", error);
  } finally {
    await mongoose.disconnect();
  }
};

debugSections();
