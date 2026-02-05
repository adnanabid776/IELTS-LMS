const Assignment = require("../models/Assignment");
const User = require("../models/User");
const Test = require("../models/Test");
const Session = require("../models/Session");
const Result = require("../models/Result");

// ==========================================
// CREATE ASSIGNMENT (Teacher)
// ==========================================
exports.createAssignment = async (req, res) => {
  try {
    const { testId, students, dueDate, instructions } = req.body;
    const teacherId = req.user.userId;

    // Validate required fields
    if (!testId || !students || !dueDate) {
      return res.status(400).json({
        error: "Test ID, students, and due date are required",
      });
    }

    // Validate test exists
    const test = await Test.findById(testId);
    if (!test) {
      return res.status(404).json({ error: "Test not found" });
    }

    // Validate students exist and are actually students
    const studentUsers = await User.find({
      _id: { $in: students },
      role: "student",
    });

    if (studentUsers.length !== students.length) {
      return res.status(400).json({
        error: "Some users are not valid students",
      });
    }

    // Create submissions array (one per student)
    const submissions = students.map((studentId) => ({
      studentId,
      status: "pending",
    }));

    // Create assignment
    const assignment = await Assignment.create({
      testId,
      assignedBy: teacherId,
      students,
      dueDate,
      instructions,
      submissions,
    });

    // Populate for response
    const populatedAssignment = await Assignment.findById(assignment._id)
      .populate("testId", "title module duration totalQuestions")
      .populate("students", "firstName lastName email")
      .populate("assignedBy", "firstName lastName");

    res.status(201).json({
      message: "Assignment created successfully",
      assignment: populatedAssignment,
    });
  } catch (error) {
    console.error("Create assignment error:", error);
    res.status(500).json({ error: "Server error" });
  }
};

// ==========================================
// GET ASSIGNMENTS FOR TEACHER
// ==========================================
exports.getTeacherAssignments = async (req, res) => {
  try {
    const teacherId = req.user.userId;
    const { isActive } = req.query;

    // By default, only show active assignments (exclude soft-deleted)
    const filter = {
      assignedBy: teacherId,
      isActive: isActive === "false" ? false : true, // Default to true (active only)
    };

    const assignments = await Assignment.find(filter)
      .populate("testId", "title module duration totalQuestions")
      .populate("students", "firstName lastName email")
      .populate("submissions.studentId", "firstName lastName email")
      .populate("submissions.resultId")
      .sort({ createdAt: -1 });

    res.json({
      count: assignments.length,
      assignments,
    });
  } catch (error) {
    console.error("Get teacher assignments error:", error);
    res.status(500).json({ error: "Server error" });
  }
};

// ==========================================
// GET ASSIGNMENTS FOR STUDENT
// ==========================================
exports.getStudentAssignments = async (req, res) => {
  try {
    const studentId = req.user.userId;
    const { status } = req.query;

    // Find assignments where student is in the students array
    const filter = {
      students: studentId,
      isActive: true,
    };

    const assignments = await Assignment.find(filter)
      .populate("testId", "title module duration totalQuestions difficulty")
      .populate("assignedBy", "firstName lastName email")
      .sort({ dueDate: 1 }); // Sort by due date (earliest first)

    // Filter by submission status if provided
    let filteredAssignments = assignments;
    if (status) {
      filteredAssignments = assignments.filter((assignment) => {
        const submission = assignment.submissions.find(
          (s) => s.studentId.toString() === studentId,
        );
        return submission && submission.status === status;
      });
    }

    // Add submission info for this student to each assignment
    const assignmentsWithStatus = filteredAssignments.map((assignment) => {
      const submission = assignment.submissions.find(
        (s) => s.studentId.toString() === studentId,
      );

      return {
        _id: assignment._id,
        testId: assignment.testId,
        assignedBy: assignment.assignedBy,
        dueDate: assignment.dueDate,
        instructions: assignment.instructions,
        createdAt: assignment.createdAt,
        // Student's specific submission data
        status: submission?.status || "pending",
        sessionId: submission?.sessionId,
        resultId: submission?.resultId,
        submittedAt: submission?.submittedAt,
        teacherComments: submission?.teacherComments,
        reviewedAt: submission?.reviewedAt,
      };
    });

    res.json({
      count: assignmentsWithStatus.length,
      assignments: assignmentsWithStatus,
    });
  } catch (error) {
    console.error("Get student assignments error:", error);
    res.status(500).json({ error: "Server error" });
  }
};

// ==========================================
// GET SINGLE ASSIGNMENT
// ==========================================
exports.getAssignmentById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;
    const userRole = req.user.role;

    const assignment = await Assignment.findById(id)
      .populate("testId", "title module duration totalQuestions")
      .populate("assignedBy", "firstName lastName email")
      .populate("students", "firstName lastName email")
      .populate("submissions.studentId", "firstName lastName email")
      .populate("submissions.resultId");

    if (!assignment) {
      return res.status(404).json({ error: "Assignment not found" });
    }

    // Check authorization
    const isTeacher = assignment.assignedBy._id.toString() === userId;
    const isStudent = assignment.students.some(
      (s) => s._id.toString() === userId,
    );
    const isAdmin = userRole === "admin";

    if (!isTeacher && !isStudent && !isAdmin) {
      return res.status(403).json({ error: "Unauthorized" });
    }

    res.json({ assignment });
  } catch (error) {
    console.error("Get assignment error:", error);
    res.status(500).json({ error: "Server error" });
  }
};

// ==========================================
// UPDATE SUBMISSION STATUS (when student starts/completes test)
// ==========================================
exports.updateSubmissionStatus = async (req, res) => {
  try {
    const { assignmentId, sessionId, resultId, status } = req.body;
    const studentId = req.user.userId;

    const assignment = await Assignment.findById(assignmentId);

    if (!assignment) {
      return res.status(404).json({ error: "Assignment not found" });
    }

    // Find student's submission
    const submission = assignment.submissions.find(
      (s) => s.studentId.toString() === studentId,
    );

    if (!submission) {
      return res.status(404).json({
        error: "Submission not found for this student",
      });
    }

    // Update submission
    if (sessionId) submission.sessionId = sessionId;
    if (resultId) submission.resultId = resultId;
    if (status) submission.status = status;

    if (status === "completed") {
      submission.submittedAt = new Date();
    }

    await assignment.save();

    res.json({
      message: "Submission updated successfully",
      submission,
    });
  } catch (error) {
    console.error("Update submission error:", error);
    res.status(500).json({ error: "Server error" });
  }
};

// ==========================================
// REVIEW SUBMISSION (Teacher adds comments)
// ==========================================
exports.reviewSubmission = async (req, res) => {
  try {
    const { assignmentId, studentId, comments } = req.body;
    const teacherId = req.user.userId;

    const assignment = await Assignment.findById(assignmentId);

    if (!assignment) {
      return res.status(404).json({ error: "Assignment not found" });
    }

    // Check if this teacher created the assignment
    if (assignment.assignedBy.toString() !== teacherId) {
      return res.status(403).json({
        error: "You can only review your own assignments",
      });
    }

    // Find student's submission
    const submission = assignment.submissions.find(
      (s) => s.studentId.toString() === studentId,
    );

    if (!submission) {
      return res.status(404).json({
        error: "Submission not found for this student",
      });
    }

    if (submission.status !== "completed") {
      return res.status(400).json({
        error: "Cannot review incomplete submission",
      });
    }

    // Add teacher's review
    submission.teacherComments = comments;
    submission.reviewedBy = teacherId;
    submission.reviewedAt = new Date();

    await assignment.save();

    res.json({
      message: "Review submitted successfully",
      submission,
    });
  } catch (error) {
    console.error("Review submission error:", error);
    res.status(500).json({ error: "Server error" });
  }
};

// ==========================================
// DELETE ASSIGNMENT (Teacher)
// ==========================================
exports.deleteAssignment = async (req, res) => {
  try {
    const { id } = req.params;
    const teacherId = req.user.userId;
    const userRole = req.user.role;

    const assignment = await Assignment.findById(id);

    if (!assignment) {
      return res.status(404).json({ error: "Assignment not found" });
    }

    // Check authorization (only creator or admin)
    if (
      assignment.assignedBy.toString() !== teacherId &&
      userRole !== "admin"
    ) {
      return res.status(403).json({
        error: "You can only delete your own assignments",
      });
    }

    // Soft delete (set isActive to false)
    assignment.isActive = false;
    await assignment.save();

    res.json({
      message: "Assignment deleted successfully",
    });
  } catch (error) {
    console.error("Delete assignment error:", error);
    res.status(500).json({ error: "Server error" });
  }
};

// ==========================================
// GET ASSIGNMENT STATISTICS (Teacher)
// ==========================================
exports.getAssignmentStats = async (req, res) => {
  try {
    const { id } = req.params;
    const teacherId = req.user.userId;

    const assignment = await Assignment.findById(id).populate(
      "submissions.resultId",
    );

    if (!assignment) {
      return res.status(404).json({ error: "Assignment not found" });
    }

    if (
      assignment.assignedBy.toString() !== teacherId &&
      req.user.role !== "admin"
    ) {
      return res.status(403).json({ error: "Unauthorized" });
    }

    // Calculate statistics
    const totalStudents = assignment.students.length;
    const completed = assignment.submissions.filter(
      (s) => s.status === "completed",
    ).length;
    const pending = assignment.submissions.filter(
      (s) => s.status === "pending",
    ).length;
    const inProgress = assignment.submissions.filter(
      (s) => s.status === "in-progress",
    ).length;

    // Calculate average band score for completed submissions
    const completedSubmissions = assignment.submissions.filter(
      (s) => s.status === "completed" && s.resultId,
    );

    let averageBand = 0;
    if (completedSubmissions.length > 0) {
      const totalBand = completedSubmissions.reduce(
        (sum, s) => sum + (s.resultId?.bandScore || 0),
        0,
      );
      averageBand = (totalBand / completedSubmissions.length).toFixed(1);
    }

    res.json({
      stats: {
        totalStudents,
        completed,
        pending,
        inProgress,
        completionRate:
          totalStudents > 0 ? Math.round((completed / totalStudents) * 100) : 0,
        averageBand,
      },
    });
  } catch (error) {
    console.error("Get assignment stats error:", error);
    res.status(500).json({ error: "Server error" });
  }
};
