const mongoose = require("mongoose");

const questionSchema = new mongoose.Schema(
  {
    // Which section this question belongs to
    sectionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Section",
      required: true,
    },

    // Question number in the test (1-40)
    questionNumber: {
      type: Number,
      required: true,
    },

    // Question text
    questionText: {
      type: String,
      required: true,
      trim: true,
    },

    // Question type
    questionType: {
      type: String,
      required: true,
      enum: [
        "multiple-choice",
        "true-false-not-given",
        "yes-no-not-given",
        "matching-headings",
        "matching-information",
        "matching-features",
        "sentence-completion",
        "summary-completion",
        "note-completion",
        "table-completion",
        "flow-chart-completion",
        "diagram-labeling",
        "short-answer",
        "writing-task",
        "form-completion",
        "multiple-choice-multi",
        "map-labeling",
      ],
    },

    // Options (for multiple choice, matching, etc.)
    options: [
      {
        type: String,
        trim: true,
      },
    ],

    // Correct answer
    correctAnswer: {
      type: String,
      required: function () {
        return (
          this.questionType !== "essay" &&
          // this.questionType !== "speaking-prompt" &&
          this.questionType !== "writing-task"
        );
      },
      trim: true,
    },
    // Grading rubric (for Writing and Speaking)
    gradingRubric: {
      type: String,
      trim: true,
      // Contains criteria for manual grading
    },

    // Constraints for Listening/Reading
    wordLimit: {
      type: Number,
      default: null,
    },
    allowNumber: {
      type: Boolean,
      default: true,
    },

    // For matching questions (Headings,    // For Table Completion / Matching
    items: [
      {
        label: String, // e.g., "1", "2" or "A", "B"
        text: String, // The text/prompt for the sub-question
        correctAnswer: String,
        options: [String], // For dropdowns in table/matching
        row: Number, // For table layout
        col: Number, // For table layout
      },
    ],

    // For Matching Features (User requested specific structure)
    features: [
      {
        label: String, // "A", "B", "C"
        text: String, // "Mark VanDam"
      },
    ],

    // For Table Completion
    tableStructure: {
      headers: [String],
      rows: [[String]], // 2D array representing the grid
    },

    // Alternative correct answers (for spelling variations)
    alternativeAnswers: [
      {
        type: String,
        trim: true,
      },
    ],

    // Points for this question
    points: {
      type: Number,
      default: 1,
    },

    // Image for question (if needed)
    imageUrl: {
      type: String,
      trim: true,
    },

    // Explanation for correct answer
    explanation: {
      type: String,
      trim: true,
    },

    // Table Structure for Table Completion
    tableStructure: {
      headers: [String],
      rows: [[String]],
    },

    // Summary Completion Specific Configuration
    summaryConfig: {
      answerMode: {
        type: String,
        enum: ["typed", "select"],
        default: "typed",
      },
      wordLimitType: {
        type: String,
        enum: [
          "one-word",
          "two-words",
          "three-words",
          "number-only",
          "word-or-number",
          "no-more-than",
        ],
        default: "no-more-than",
      },
      maxWords: {
        type: Number,
        default: 1,
      },
      customInstruction: {
        type: String,
        trim: true,
      },
      options: [
        {
          type: String,
          trim: true,
        },
      ], // Used only if answerMode === 'select'
    },
  },
  {
    timestamps: true,
  },
);

// Index for faster queries
questionSchema.index({ sectionId: 1, questionNumber: 1 }, { unique: true });

module.exports = mongoose.model("Question", questionSchema);
