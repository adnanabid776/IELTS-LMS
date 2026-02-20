const mongoose = require("mongoose");

const resultSchema = new mongoose.Schema(
  {
    // Which user
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // Which test
    testId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Test",
      required: true,
    },

    // Session reference
    sessionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Session",
      required: true,
    },

    // Module (listening, reading, writing)
    module: {
      type: String,
      required: true,
      enum: ["listening", "reading", "writing"],
    },

    // Score details
    totalQuestions: {
      type: Number,
      required: true,
    },

    correctAnswers: {
      type: Number,
      required: false,
      default: 0,
    },

    incorrectAnswers: {
      type: Number,
      required: false,
      default: 0,
    },

    unanswered: {
      type: Number,
      default: 0,
    },

    // Band score (IELTS band: 0-9)
    bandScore: {
      type: Number,
      required: false,
      min: 0,
      max: 9,
    },
    isManuallyGraded: {
      type: Boolean,
      default: false,
      // True for Writing module
    },

    teacherGradedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      // Teacher who graded this result
    },

    teacherGradedAt: {
      type: Date,
      // When teacher completed grading
    },

    gradingNotes: {
      type: String,
      trim: true,
      // Teacher's feedback on Writing performance
    },

    // Module-specific scores for Writing
    writingScores: {
      taskAchievement: { type: Number, min: 0, max: 9 },
      coherenceCohesion: { type: Number, min: 0, max: 9 },
      lexicalResource: { type: Number, min: 0, max: 9 },
      grammaticalRange: { type: Number, min: 0, max: 9 },
    },

    // ============================================
    // FIX: Make percentage optional for manual grading
    // ============================================
    percentage: {
      type: Number,
      required: false, // ← CHANGED FROM true TO false
      default: null, // ← ADDED default null
    },

    // Question type breakdown
    questionTypeBreakdown: [
      {
        type: {
          type: String,
        },
        total: Number,
        correct: Number,
        percentage: Number,
      },
    ],

    // Section-wise performance
    sectionPerformance: [
      {
        sectionNumber: Number,
        sectionTitle: String,
        questionsAttempted: Number,
        correctAnswers: Number,
        percentage: Number,
      },
    ],

    // Time taken
    timeTaken: {
      type: Number, // in seconds
    },

    // Weak areas
    weakAreas: [
      {
        type: String,
      },
    ],

    // Recommendations
    recommendations: [
      {
        type: String,
      },
    ],
  },
  {
    timestamps: true,
  },
);

// Index for faster queries
resultSchema.index({ userId: 1, testId: 1 });
resultSchema.index({ userId: 1, module: 1 });

module.exports = mongoose.model("Result", resultSchema);
