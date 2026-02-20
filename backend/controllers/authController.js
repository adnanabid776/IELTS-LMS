const User = require("../models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");

// ============================================
// REGISTER
// ============================================
exports.register = async (req, res) => {
  try {
    const { firstName, lastName, email, password } = req.body;
    //if user already registered
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: "User Already exists!" });
    }

    //hash passwords
    const hashedPassword = await bcrypt.hash(password, 10);
    //create user (role is always "student" for public registration)
    const user = await User.create({
      firstName,
      lastName,
      email,
      password: hashedPassword,
      role: "student",
    });

    const token = jwt.sign(
      { userId: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "7d" },
    );

    // ============================================
    // SINGLE SESSION: Store token hash
    // ============================================
    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
    user.activeSessionToken = tokenHash;
    user.lastLoginAt = new Date();
    user.lastLoginDevice = req.headers["user-agent"] || "Unknown";
    await user.save();

    res.status(201).json({
      message: "User Registered Successfully!",
      token,
      user: {
        _id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("Register error:", error);
    res.status(500).json({ error: "Server error during registration." });
  }
};

// ============================================
// LOGIN
// ============================================
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    //find the user
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ error: "Invalid Credentials" });
    }

    //Check password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ error: "Invalid Credentials" });
    }

    //check if user is active
    if (!user.isActive) {
      return res.status(401).json({ error: "Account is deactivated" });
    }

    //generate the jwt token
    const token = jwt.sign(
      { userId: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "7d" },
    );

    // ============================================
    // SINGLE SESSION: Update active session token
    // This invalidates all previous tokens!
    // ============================================
    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
    user.activeSessionToken = tokenHash;
    user.lastLoginAt = new Date();
    user.lastLoginDevice = req.headers["user-agent"] || "Unknown";
    await user.save();

    console.log(
      `✅ User ${user.email} logged in from new device. Previous sessions invalidated.`,
    );

    res.json({
      message: "Login Successfully",
      token,
      user: {
        _id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ error: "Server error during login!" });
  }
};

// ============================================
// LOGOUT (NEW)
// ============================================
exports.logout = async (req, res) => {
  try {
    const userId = req.user.userId;

    // Clear active session token
    await User.findByIdAndUpdate(userId, {
      activeSessionToken: null,
    });

    console.log(`✅ User ${userId} logged out. Session invalidated.`);

    res.json({ message: "Logged out successfully" });
  } catch (error) {
    console.error("Logout error:", error);
    res.status(500).json({ error: "Server error during logout" });
  }
};

// ============================================
// UPDATE PROFILE
// ============================================
exports.updateProfile = async (req, res) => {
  try {
    const { firstName, lastName } = req.body;
    const userId = req.user.userId;

    //find the user and update
    const user = await User.findByIdAndUpdate(
      userId,
      {
        firstName,
        lastName,
      },
      {
        new: true, //return updated user
        runValidators: true, //validate the data
      },
    ).select("-password");
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    res.status(200).json({
      message: "user updated successfully!",
      user: {
        _id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("update profile error:", error);
    res.status(500).json({ error: "Server error" });
  }
};

// ==========================================
// GET ALL STUDENTS (Teacher/Admin)
// ==========================================
exports.getAllStudents = async (req, res) => {
  try {
    const students = await User.find({ role: "student" })
      .select("firstName lastName email createdAt role")
      .sort({ createdAt: -1 });

    res.json({
      count: students.length,
      students,
    });
  } catch (error) {
    console.error("Get all students error:", error);
    res.status(500).json({ error: "Server error" });
  }
};

// ==========================================
// GET STUDENT DETAILS WITH RESULTS (Teacher/Admin)
// ==========================================
exports.getStudentDetails = async (req, res) => {
  try {
    const { studentId } = req.params;

    // Get student info
    const student = await User.findById(studentId).select(
      "firstName lastName email createdAt role",
    );

    if (!student) {
      return res.status(404).json({ error: "Student not found" });
    }

    if (student.role !== "student") {
      return res.status(400).json({ error: "User is not a student" });
    }

    // Get student's results
    const Result = require("../models/Result");
    const results = await Result.find({ userId: studentId })
      .populate("testId", "title module")
      .sort({ createdAt: -1 });

    // Calculate statistics
    const totalTests = results.length;
    const averageBand =
      totalTests > 0
        ? (
            results.reduce((sum, r) => sum + r.bandScore, 0) / totalTests
          ).toFixed(1)
        : 0;
    const highestBand =
      totalTests > 0 ? Math.max(...results.map((r) => r.bandScore)) : 0;
    const lowestBand =
      totalTests > 0 ? Math.min(...results.map((r) => r.bandScore)) : 0;

    res.json({
      student,
      stats: {
        totalTests,
        averageBand,
        highestBand,
        lowestBand,
      },
      recentResults: results.slice(0, 10), // Last 10 tests
    });
  } catch (error) {
    console.error("Get student details error:", error);
    res.status(500).json({ error: "Server error" });
  }
};

// ==========================================
// GET TEACHER DASHBOARD STATS
// ==========================================
exports.getTeacherDashboardStats = async (req, res) => {
  try {
    const teacherId = req.user.userId;

    // Get total students count
    const totalStudents = await User.countDocuments({
      role: "student",
      isActive: true,
    });

    // Get teacher's assignments
    const Assignment = require("../models/Assignment");
    const assignments = await Assignment.find({
      assignedBy: teacherId,
      isActive: true,
    });

    // Count pending reviews from assignments (completed submissions without teacher comments)
    let pendingReviews = 0;
    const processedResultIds = new Set();

    assignments.forEach((assignment) => {
      assignment.submissions.forEach((submission) => {
        if (submission.status === "completed" && !submission.teacherComments) {
          pendingReviews++;
          if (submission.resultId) {
            processedResultIds.add(submission.resultId.toString());
          }
        }
      });
    });

    // Also count direct submissions (Writing/Speaking) that need manual grading
    const Result = require("../models/Result");
    const directResultsCount = await Result.countDocuments({
      isManuallyGraded: true,
      bandScore: null,
      teacherGradedBy: null,
      _id: { $nin: Array.from(processedResultIds) }, // Exclude already counted
    });

    pendingReviews += directResultsCount;

    // Total tests assigned
    const testsAssigned = assignments.length;

    // Get active classes (unique students who have assignments)
    const uniqueStudents = new Set();
    assignments.forEach((assignment) => {
      assignment.students.forEach((studentId) => {
        uniqueStudents.add(studentId.toString());
      });
    });
    const activeClasses = uniqueStudents.size;

    res.json({
      totalStudents,
      pendingReviews,
      testsAssigned,
      activeClasses,
    });
  } catch (error) {
    console.error("Get teacher dashboard stats error:", error);
    res.status(500).json({ error: "Server error" });
  }
};

// ==========================================
// GET PENDING REVIEWS FOR TEACHER
// ==========================================
exports.getTeacherPendingReviews = async (req, res) => {
  try {
    const teacherId = req.user.userId;

    const Result = require("../models/Result");
    const Assignment = require("../models/Assignment");

    const assignments = await Assignment.find({
      assignedBy: teacherId,
      isActive: true,
    })
      .populate("testId", "title module")
      .populate("submissions.studentId", "firstName lastName email")
      .populate("submissions.resultId", "bandScore");

    // Extract pending reviews from Assignments
    const pendingReviews = [];
    const processedResultIds = new Set();

    assignments.forEach((assignment) => {
      assignment.submissions.forEach((submission) => {
        const isGraded =
          submission.resultId && submission.resultId.bandScore != null;

        if (submission.status === "completed" && !isGraded) {
          if (submission.resultId?._id) {
            processedResultIds.add(submission.resultId._id.toString());
          }
          pendingReviews.push({
            assignmentId: assignment._id,
            testTitle: assignment.testId.title,
            testModule: assignment.testId.module,
            student: submission.studentId,
            submittedAt: submission.submittedAt,
            resultId: submission.resultId?._id,
            bandScore: submission.resultId?.bandScore,
          });
        }
      });
    });

    // Also get direct submissions (not via assignments) that need manual grading
    const directResults = await Result.find({
      isManuallyGraded: true,
      bandScore: null,
      teacherGradedBy: null,
    })
      .populate("userId", "firstName lastName email")
      .populate("testId", "title module")
      .sort({ createdAt: -1 });

    // Add direct results that aren't already in the assignment-based list
    directResults.forEach((result) => {
      if (!processedResultIds.has(result._id.toString())) {
        pendingReviews.push({
          assignmentId: null,
          testTitle: result.testId?.title || "Unknown Test",
          testModule: result.testId?.module || "unknown",
          student: result.userId,
          submittedAt: result.createdAt,
          resultId: result._id,
          bandScore: result.bandScore,
        });
      }
    });

    // Sort by submission date (most recent first)
    pendingReviews.sort(
      (a, b) => new Date(b.submittedAt) - new Date(a.submittedAt),
    );

    res.json({
      count: pendingReviews.length,
      reviews: pendingReviews,
    });
  } catch (error) {
    console.error("Get teacher pending reviews error:", error);
    res.status(500).json({ error: "Server error" });
  }
};

// ==========================================
// ADMIN - GET ALL USERS
// ==========================================
exports.getAllUsers = async (req, res) => {
  try {
    const { role, search, isActive } = req.query;

    let filter = {};

    if (role) {
      filter.role = role;
    }

    if (search) {
      filter.$or = [
        { firstName: { $regex: search, $options: "i" } },
        { lastName: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
      ];
    }

    if (isActive !== undefined) {
      filter.isActive = isActive === "true";
    }

    const users = await User.find(filter)
      .select("-password") // Don't send passwords
      .sort({ createdAt: -1 });

    res.json({
      count: users.length,
      users,
    });
  } catch (error) {
    console.error("Get all users error:", error);
    res.status(500).json({ error: "Server error" });
  }
};

// ==========================================
// ADMIN - GET USER BY ID
// ==========================================
exports.getUserById = async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findById(userId).select("-password");

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Get additional stats based on role
    let stats = {};

    if (user.role === "student") {
      const Result = require("../models/Result");
      const results = await Result.find({ userId: user._id });

      stats = {
        totalTests: results.length,
        averageBand:
          results.length > 0
            ? (
                results.reduce((sum, r) => sum + r.bandScore, 0) /
                results.length
              ).toFixed(1)
            : 0,
        highestBand:
          results.length > 0 ? Math.max(...results.map((r) => r.bandScore)) : 0,
      };
    } else if (user.role === "teacher") {
      const Assignment = require("../models/Assignment");
      const assignments = await Assignment.find({ assignedBy: user._id });

      stats = {
        totalAssignments: assignments.length,
        activeAssignments: assignments.filter((a) => a.isActive).length,
      };
    }

    res.json({
      user,
      stats,
    });
  } catch (error) {
    console.error("Get user by ID error:", error);
    res.status(500).json({ error: "Server error" });
  }
};

// ==========================================
// ADMIN - CREATE USER
// ==========================================
exports.createUser = async (req, res) => {
  try {
    const { firstName, lastName, email, password, role } = req.body;

    // Validation
    if (!firstName || !lastName || !email || !password || !role) {
      return res.status(400).json({ error: "All fields are required" });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: "Email already registered" });
    }

    // Validate role
    if (!["student", "teacher", "admin"].includes(role)) {
      return res.status(400).json({ error: "Invalid role" });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const user = new User({
      firstName,
      lastName,
      email,
      password: hashedPassword,
      role,
      isActive: true,
    });

    await user.save();

    res.status(201).json({
      message: "User created successfully",
      user: {
        _id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
        isActive: user.isActive,
      },
    });
  } catch (error) {
    console.error("Create user error:", error);
    res.status(500).json({ error: "Server error" });
  }
};

// ==========================================
// ADMIN - UPDATE USER
// ==========================================
exports.updateUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const { firstName, lastName, email, role, isActive } = req.body;

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Update fields if provided
    if (firstName) user.firstName = firstName;
    if (lastName) user.lastName = lastName;
    if (email) {
      // Check if new email already exists
      const existingUser = await User.findOne({ email, _id: { $ne: userId } });
      if (existingUser) {
        return res.status(400).json({ error: "Email already in use" });
      }
      user.email = email;
    }
    if (role) {
      if (!["student", "teacher", "admin"].includes(role)) {
        return res.status(400).json({ error: "Invalid role" });
      }
      user.role = role;
    }
    if (isActive !== undefined) {
      user.isActive = isActive;
    }

    await user.save();

    res.json({
      message: "User updated successfully",
      user: {
        _id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
        isActive: user.isActive,
      },
    });
  } catch (error) {
    console.error("Update user error:", error);
    res.status(500).json({ error: "Server error" });
  }
};

// ==========================================
// ADMIN - DELETE USER (Soft Delete)
// ==========================================
exports.deleteUser = async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Prevent deleting yourself
    if (user._id.toString() === req.user.userId) {
      return res.status(400).json({ error: "Cannot delete your own account" });
    }

    // Hard delete (remove from DB entirely as requested)
    await User.findByIdAndDelete(userId);

    res.json({
      message: "User deleted successfully",
    });
  } catch (error) {
    console.error("Delete user error:", error);
    res.status(500).json({ error: "Server error" });
  }
};

// ==========================================
// ADMIN - GET DASHBOARD STATS
// ==========================================
exports.getAdminDashboardStats = async (req, res) => {
  try {
    // Count users by role
    const totalUsers = await User.countDocuments({ isActive: true });
    const students = await User.countDocuments({
      role: "student",
      isActive: true,
    });
    const teachers = await User.countDocuments({
      role: "teacher",
      isActive: true,
    });
    const admins = await User.countDocuments({ role: "admin", isActive: true });

    // Count questions
    const Question = require("../models/Question");
    const totalQuestions = await Question.countDocuments();

    // Count tests
    const Test = require("../models/Test");
    const totalTests = await Test.countDocuments();

    // Count test sessions
    const Session = require("../models/Session");
    const totalAttempts = await Session.countDocuments({ status: "completed" });

    // Recent users (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const recentUsers = await User.countDocuments({
      createdAt: { $gte: sevenDaysAgo },
      isActive: true,
    });

    res.json({
      totalUsers,
      students,
      teachers,
      admins,
      totalQuestions,
      totalTests,
      totalAttempts,
      recentUsers,
    });
  } catch (error) {
    console.error("Get admin dashboard stats error:", error);
    res.status(500).json({ error: "Server error" });
  }
};
