const mongoose = require("mongoose");

const assignmentSchema  = new mongoose.Schema(
  {
    //which test should be assigned and determined by testId
    testId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Test",
      required: true,
    },
    //Which teacher could assign test to students.
    assignedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    //which student (can assigned to multiple students)
    students: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    //deadline
    dueDate: {
      type: Date,
      required: true,
    },
    // Instructions from teacher
    instructions: {
      type: String,
    },

    // Status tracking per student
    submissions: [
      {
        studentId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
        sessionId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Session",
        },
        resultId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Result",
        },
        status: {
          type: String,
          enum: ["pending", "in-progress", "completed"],
          default: "pending",
        },
        submittedAt: Date,
        reviewedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
        teacherComments: String,
        reviewedAt: Date,
      },
    ],

    // Is this assignment active?
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true },
);


assignmentSchema.index({ assignedBy: 1, isActive: 1 });
assignmentSchema.index({ 'students': 1, isActive: 1 });

module.exports = mongoose.model('Assignment', assignmentSchema);