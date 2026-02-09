const mongoose = require("mongoose");

const sessionSchema = new mongoose.Schema(
  {
    // Which user is taking the test
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // Which test they're taking
    testId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Test",
      required: true,
    },

    // Session status
    status: {
      type: String,
      enum: ["in-progress", "completed", "abandoned", "expired"],
      default: "in-progress",
    },

    // Timestamps
    startedAt: {
      type: Date,
      default: Date.now,
      required: true,
    },

    completedAt: {
      type: Date,
    },

    lastActivityAt: {
      type: Date,
      default: Date.now,
    },

    // Time tracking (in seconds)
    timeRemaining: {
      type: Number,
      default: 3600, // 60 minutes = 3600 seconds
    },

    totalTimeSpent: {
      type: Number,
      default: 0,
    },

    // User's answers - FLEXIBLE structure for different question types
    answers: [
      {
        questionId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Question",
          required: true,
        },

        // Can store: String, Array, Object - flexible for all question types
        userAnswer: {
          type: mongoose.Schema.Types.Mixed,
        },

        // Time spent on this specific question
        timeSpent: {
          type: Number,
          default: 0,
        },

        answeredAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],

    // Current progress tracking
    currentQuestionIndex: {
      type: Number,
      default: 0,
    },

    currentSectionNumber: {
      type: Number,
      default: 1,
    },

    // Security & Anti-cheating
    activeDeviceId: {
      type: String, // Prevent multiple devices
    },

    tabSwitchCount: {
      type: Number,
      default: 0,
    },

    flaggedForReview: {
      type: Boolean,
      default: false,
    },

    // Track which sections' audio has been played (for Play Once feature)
    audioPlayedSections: {
      type: [String], // Array of Section IDs
      default: [],
    },

    // Scoring (populated after submission)
    score: {
      type: Number,
      min: 0,
    },

    bandScore: {
      type: Number,
      min: 0,
      max: 9,
    },

    // Module-wise breakdown
    moduleScores: {
      reading: Number,
      listening: Number,
      writing: Number,
      // speaking: Number,
    },
  },
  {
    timestamps: true, // Adds createdAt and updatedAt automatically
  },
);

// Compound index for faster queries
sessionSchema.index({ userId: 1, testId: 1, status: 1 });

// Index for finding active sessions
sessionSchema.index({ status: 1, lastActivityAt: 1 });

// Method to check if session is expired
sessionSchema.methods.isExpired = function () {
  const elapsed = (Date.now() - this.startedAt.getTime()) / 1000; // seconds
  return elapsed >= this.timeRemaining; // Use actual test duration
};

// Method to calculate remaining time
sessionSchema.methods.getRemainingTime = function () {
  const elapsed = (Date.now() - this.startedAt.getTime()) / 1000;
  const remaining = this.timeRemaining - elapsed; // Use actual test duration
  return Math.max(0, Math.floor(remaining));
};

// Static method to find active session for user and test
sessionSchema.statics.findActiveSession = function (userId, testId) {
  return this.findOne({
    userId,
    testId,
    status: "in-progress",
  });
};

module.exports = mongoose.model("Session", sessionSchema);
