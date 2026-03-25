/**
 * Fix Matching-Headings Item Labels
 * Changes labels from letters (A, B, C) to question numbers (14, 15, 16...)
 * based on parent questionNumber + item index.
 *
 * Usage: node scripts/fixMatchingHeadingsLabels.js
 */

require("dotenv").config();
const mongoose = require("mongoose");

const MONGO_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/ielts-lms";

async function main() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log("✅ Connected to MongoDB");

    const Question = mongoose.connection.collection("questions");

    // Find all matching-headings questions with items
    const questions = await Question.find({
      questionType: "matching-headings",
      "items.0": { $exists: true },
    }).toArray();

    console.log(`Found ${questions.length} matching-headings questions with items.`);

    let updated = 0;

    for (const q of questions) {
      const baseNum = q.questionNumber || 1;
      let needsUpdate = false;

      const newItems = q.items.map((item, idx) => {
        const newLabel = String(baseNum + idx);
        if (item.label !== newLabel) {
          needsUpdate = true;
        }
        return { ...item, label: newLabel };
      });

      if (needsUpdate) {
        await Question.updateOne(
          { _id: q._id },
          { $set: { items: newItems } }
        );
        console.log(
          `  Updated Q#${baseNum} "${q.questionText.substring(0, 50)}..." → labels: [${newItems.map((i) => i.label).join(", ")}]`
        );
        updated++;
      }
    }

    console.log(`\n✅ Done! Updated ${updated} of ${questions.length} questions.`);
  } catch (err) {
    console.error("❌ Error:", err);
  } finally {
    await mongoose.disconnect();
    console.log("Disconnected from MongoDB.");
  }
}

main();
