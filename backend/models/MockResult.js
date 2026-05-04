const mongoose = require("mongoose");

const mockResultSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    mockExamId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "MockExam",
      required: true,
    },
    listeningResultId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Result",
      required: false,
    },
    readingResultId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Result",
      required: false,
    },
    writingResultId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Result",
      required: false,
    },
    // The status goes from "in-progress" (testing) -> "pending_evaluation" -> "completed"
    status: {
      type: String,
      enum: ["in-progress", "pending_evaluation", "completed"],
      default: "in-progress",
    },
    // Band Scores (populated as they finish/are graded)
    listeningBand: { type: Number, default: null },
    readingBand: { type: Number, default: null },
    writingBand: { type: Number, default: null },
    
    // Speaking is fully manual
    speakingBand: { type: Number, default: null },
    speakingTeacherId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    speakingEvaluatedAt: { type: Date, default: null },
    speakingNotes: { type: String, trim: true },

    overallBand: { type: Number, default: null },
  },
  {
    timestamps: true,
  }
);

// Calculate overall band score if all 4 are present
mockResultSchema.methods.calculateOverallBand = function () {
  if (
    this.listeningBand !== null &&
    this.readingBand !== null &&
    this.writingBand !== null &&
    this.speakingBand !== null
  ) {
    const sum = this.listeningBand + this.readingBand + this.writingBand + this.speakingBand;
    const average = sum / 4;
    
    // Standard IELTS rounding:
    // If ending in .25, round up to .5
    // If ending in .75, round up to next whole number
    // Otherwise round to nearest half band
    const fraction = average - Math.floor(average);
    let finalBand;
    
    if (fraction < 0.25) {
      finalBand = Math.floor(average);
    } else if (fraction >= 0.25 && fraction < 0.75) {
      finalBand = Math.floor(average) + 0.5;
    } else {
      finalBand = Math.ceil(average);
    }
    
    this.overallBand = finalBand;
    this.status = "completed";
  }
};

module.exports = mongoose.model("MockResult", mockResultSchema);
