const mongoose = require("mongoose");

const sectionSchema = new mongoose.Schema(
  {
    // Which test this section belongs to
    testId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Test",
      required: true,
    },

    // Section number (1, 2, 3)
    sectionNumber: {
      type: Number,
      required: true,
    },

    // Section title
    title: {
      type: String,
      required: true,
      trim: true,
    },

    // For Reading: the passage text
    passageText: {
      type: String,
      trim: true,
    },

    // For Listening: audio file URL
    audioUrl: {
      type: String,
      trim: true,
    },

    // Audio configuration for Listening
    audioScript: {
      type: String,
      select: false, // Hidden by default from students
    },
    playOnceOnly: {
      type: Boolean,
      default: false,
    },
    disableReplay: {
      type: Boolean,
      default: true,
    },
    lockNavigationDuringAudio: {
      type: Boolean,
      default: false,
    },

    // Section instructions
    instructions: {
      type: String,
      trim: true,
    },

    // Question range (e.g., "Questions 1-13")
    questionRange: {
      type: String,
      trim: true,
    },

    // How many questions in this section
    totalQuestions: {
      type: Number,
      required: true,
      default: 0,
    },

    // Time limit for this section (optional)
    duration: {
      type: Number,
    },
    taskType: {
      type: String,
      enum: ["task1", "task2"],
      // Only used when test.module = 'writing'
    },
    taskImageUrl: {
      type: String,
      trim: true,
      // Diagram/chart image for Writing Task 1
    },
    wordLimit: {
      type: Number,
      // 150 for Task 1, 250 for Task 2
    },

    cueCard: {
      topic: String,
      bulletPoints: [String],
      preparationTime: Number, // seconds (usually 60)
    },
  },
  {
    timestamps: true,
  },
);

// Index for faster queries
sectionSchema.index({ testId: 1, sectionNumber: 1 });

// Virtual field to get questions
sectionSchema.virtual("questions", {
  ref: "Question",
  localField: "_id",
  foreignField: "sectionId",
});

sectionSchema.set("toJSON", { virtuals: true });
sectionSchema.set("toObject", { virtuals: true });

module.exports = mongoose.model("Section", sectionSchema);
