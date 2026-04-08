/**
 * Migration script for Academic/General student and test types.
 * Sets studentType = "academic" for all users with role "student".
 * Sets testType = "academic" or "general" based on title keywords.
 * Defaults to "academic" if no keyword is found.
 * Run once: node scripts/migrateAcademicGeneral.js
 */

require("dotenv").config();
const mongoose = require("mongoose");

async function migrate() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("✅ Connected to MongoDB");

    // 1. Update Students
    const studentResult = await mongoose.connection
      .collection("users")
      .updateMany(
        { role: "student", studentType: { $exists: false } },
        { $set: { studentType: "academic" } }
      );
    console.log(`✅ Updated ${studentResult.modifiedCount} existing students to studentType: "academic"`);

    // 2. Update Tests (Categorize by title)
    const Test = require("../models/Test");
    const tests = await Test.find({});
    let academicCount = 0;
    let generalCount = 0;

    for (const test of tests) {
      let type = "academic"; // Default
      const titleLower = test.title.toLowerCase();
      
      if (titleLower.includes("general")) {
        type = "general";
        generalCount++;
      } else if (titleLower.includes("academic")) {
        type = "academic";
        academicCount++;
      } else {
        // Fallback to academic if no keyword found
        type = "academic";
        academicCount++;
      }

      await Test.findByIdAndUpdate(test._id, { testType: type });
    }

    console.log(`✅ Migration complete — Categorized ${academicCount} tests as Academic and ${generalCount} as General.`);
  } catch (err) {
    console.error("❌ Migration failed:", err);
  } finally {
    await mongoose.disconnect();
    console.log("🔌 Disconnected.");
  }
}

migrate();
