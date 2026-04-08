/**
 * One-time migration script
 * Sets testFormat = "full" on all tests that don't have the field yet.
 * Run once: node scripts/migrateTestFormat.js
 */

require("dotenv").config();
const mongoose = require("mongoose");

async function migrate() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("✅ Connected to MongoDB");

    const result = await mongoose.connection
      .collection("tests")
      .updateMany(
        { testFormat: { $exists: false } }, // only tests without the field
        { $set: { testFormat: "full" } }
      );

    console.log(`✅ Migration complete — ${result.modifiedCount} tests updated to testFormat: "full"`);
  } catch (err) {
    console.error("❌ Migration failed:", err);
  } finally {
    await mongoose.disconnect();
    console.log("🔌 Disconnected.");
  }
}

migrate();
