const Question = require("../models/Question");
const Section = require("../models/Section");
const Test = require("../models/Test");

//creating a Question
exports.createQuestion = async (req, res) => {
  try {
    const {
      sectionId,
      questionNumber,
      questionType,
      questionText,
      options,
      correctAnswer,
      alternativeAnswers,
      points,
      imageUrl,
      explanation,
      items, // ✅ ADDED
    } = req.body;

    // Validate required fields
    if (
      !sectionId ||
      !questionNumber ||
      !questionText ||
      !questionType ||
      !correctAnswer
    ) {
      return res
        .status(400)
        .json({ error: "All required fields must be provided" });
    }

    // Check if section exists
    const section = await Section.findById(sectionId);
    if (!section) {
      return res.status(404).json({ error: "Section not found" });
    }
    const existingQuestion = await Question.findOne({
      sectionId,
      questionNumber,
    });

    if (existingQuestion) {
      return res.status(400).json({
        error: `Question number ${questionNumber} already exists in this section`,
      });
    }

    // Create question
    const question = await Question.create({
      sectionId,
      questionNumber,
      questionText,
      questionType,
      options,
      correctAnswer,
      alternativeAnswers,
      points: points || 1,
      imageUrl,
      explanation,
      items, // ✅ ADDED
    });

    //update the section's total questions
    await Section.findByIdAndUpdate(sectionId, {
      $inc: { totalQuestions: 1 },
    });

    //update the test's totalQuestions
    await Test.findByIdAndUpdate(section.testId, {
      $inc: { totalQuestions: 1 },
    });
    res.status(201).json({
      message: "Question Created Successfully!",
      _id: question._id,
      question: {
        _id: question._id,
        questionNumber: question.questionNumber,
        questionType: question.questionType,
      },
    });
  } catch (error) {
    console.error("Create question error:", error);
    if (error.code === 11000) {
      return res.status(400).json({
        error: "This question number already exists in this section",
      });
    }
    res.status(500).json({ error: "Server error" });
  }
};

exports.getQuestionsBySectionId = async (req, res) => {
  try {
    const { sectionId } = req.params;
    const userRole = req.user.role; // Assuming authMiddleware populates req.user

    // Determine fields to select based on role
    let selectFields = "";
    if (userRole !== "admin" && userRole !== "teacher") {
      selectFields = "-correctAnswer -explanation -alternativeAnswers";
    }

    const questions = await Question.find({ sectionId })
      .select(selectFields)
      .sort({
        questionNumber: 1,
      });

    res.status(201).json({
      count: questions.length,
      questions,
    });
  } catch (error) {
    console.error("Get questions error: ", error);
    res.status(500).json({ error: "Server error" });
  }
};

exports.getQuestionById = async (req, res) => {
  try {
    const { id } = req.params;
    const question = await Question.findById(id).populate({
      path: "sectionId",
      populate: { path: "testId", select: "title module" },
    });
    if (!question) {
      return res.status(404).json({ error: "Question Not found" });
    }
    res.json({ question });
  } catch (error) {
    console.error("Get question error: ", error);
    res.status(500).json({ error: "Server error" });
  }
};

// Update question
exports.updateQuestion = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      questionText,
      questionType,
      options,
      correctAnswer,
      alternativeAnswers,
      points,
      imageUrl,
      explanation,
      items, // ✅ ADDED
    } = req.body;

    const question = await Question.findByIdAndUpdate(
      id,
      {
        questionText,
        questionType,
        options,
        correctAnswer,
        alternativeAnswers,
        points,
        imageUrl,
        explanation,
        items, // ✅ ADDED
      },
      { new: true, runValidators: true },
    );

    if (!question) {
      return res.status(404).json({ error: "Question not found" });
    }

    res.json({
      message: "Question updated successfully",
      question,
    });
  } catch (error) {
    console.error("Update question error:", error);
    res.status(500).json({ error: "Server error" });
  }
};

// Delete question
exports.deleteQuestion = async (req, res) => {
  try {
    const { id } = req.params;

    const question = await Question.findById(id);
    if (!question) {
      return res.status(404).json({ error: "Question not found" });
    }

    const section = await Section.findById(question.sectionId);

    // Delete question
    await Question.findByIdAndDelete(id);

    // Update section's totalQuestions
    await Section.findByIdAndUpdate(question.sectionId, {
      $inc: { totalQuestions: -1 },
    });

    // Update test's totalQuestions
    if (section) {
      await Test.findByIdAndUpdate(section.testId, {
        $inc: { totalQuestions: -1 },
      });
    }

    res.json({
      message: "Question deleted successfully",
    });
  } catch (error) {
    console.error("Delete question error:", error);
    res.status(500).json({ error: "Server error" });
  }
};

// Bulk create questions
// exports.bulkCreateQuestions = async (req, res) => {
//   try {
//     const { questions } = req.body;  // Array of question objects

//     if (!Array.isArray(questions) || questions.length === 0) {
//       return res.status(400).json({ error: 'Questions array is required' });
//     }

//     // Insert all questions
//     const createdQuestions = await Question.insertMany(questions);

//     // Update section and test counts
//     const sectionId = questions[0].sectionId;
//     const section = await Section.findById(sectionId);

//     await Section.findByIdAndUpdate(sectionId, {
//       $inc: { totalQuestions: questions.length }
//     });

//     if (section) {
//       await Test.findByIdAndUpdate(section.testId, {
//         $inc: { totalQuestions: questions.length }
//       });
//     }

//     res.status(201).json({
//       message: `${createdQuestions.length} questions created successfully`,
//       count: createdQuestions.length,
//       questions: createdQuestions
//     });

//   } catch (error) {
//     console.error('Bulk create questions error:', error);
//     res.status(500).json({ error: 'Server error' });
//   }
// };

exports.bulkCreateQuestions = async (req, res) => {
  try {
    const { questions } = req.body; // Array of question objects

    // Validate questions array exists
    if (!Array.isArray(questions) || questions.length === 0) {
      return res.status(400).json({ error: "Questions array is required" });
    }

    // ✅ ADD: Validate each question has required fields
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];

      if (!q.sectionId) {
        return res.status(400).json({
          error: `Question ${i + 1}: sectionId is required`,
        });
      }

      if (!q.questionNumber && q.questionNumber !== 0) {
        return res.status(400).json({
          error: `Question ${i + 1}: questionNumber is required`,
        });
      }

      if (!q.questionText) {
        return res.status(400).json({
          error: `Question ${i + 1}: questionText is required`,
        });
      }

      if (!q.questionType) {
        return res.status(400).json({
          error: `Question ${i + 1}: questionType is required`,
        });
      }

      if (!q.correctAnswer) {
        return res.status(400).json({
          error: `Question ${i + 1}: correctAnswer is required`,
        });
      }
    }

    // ✅ ADD: Verify section exists
    const sectionId = questions[0].sectionId;
    const section = await Section.findById(sectionId);

    if (!section) {
      return res.status(404).json({ error: "Section not found" });
    }

    // ✅ ADD: Check for duplicate question numbers
    const questionNumbers = questions.map((q) => q.questionNumber);
    const duplicates = questionNumbers.filter(
      (num, index) => questionNumbers.indexOf(num) !== index,
    );

    if (duplicates.length > 0) {
      return res.status(400).json({
        error: `Duplicate question numbers found: ${duplicates.join(", ")}`,
      });
    }

    // ✅ ADD: Check if any question number already exists in database
    const existingQuestions = await Question.find({
      sectionId: sectionId,
      questionNumber: { $in: questionNumbers },
    });

    if (existingQuestions.length > 0) {
      const existingNumbers = existingQuestions.map((q) => q.questionNumber);
      return res.status(400).json({
        error: `Question numbers already exist in this section: ${existingNumbers.join(", ")}`,
      });
    }

    // Insert all questions
    const createdQuestions = await Question.insertMany(questions);

    // Update section's totalQuestions
    await Section.findByIdAndUpdate(sectionId, {
      $inc: { totalQuestions: questions.length },
    });

    // Update test's totalQuestions (FIXED!)
    if (section) {
      await Test.findByIdAndUpdate(section.testId, {
        $inc: { totalQuestions: questions.length },
      });
    }

    res.status(201).json({
      message: `${createdQuestions.length} questions created successfully`,
      count: createdQuestions.length,
      questions: createdQuestions,
    });
  } catch (error) {
    console.error("Bulk create questions error:", error);

    // Handle duplicate key error
    if (error.code === 11000) {
      return res.status(400).json({
        error: "One or more question numbers already exist in this section",
      });
    }

    // Handle validation errors from Mongoose
    if (error.name === "ValidationError") {
      const messages = Object.values(error.errors).map((err) => err.message);
      return res.status(400).json({
        error: "Validation failed",
        details: messages,
      });
    }

    res.status(500).json({ error: "Server error" });
  }
};

// ==========================================
// ADMIN - GET ALL QUESTIONS WITH FILTERS
// ==========================================
exports.getAllQuestions = async (req, res) => {
  try {
    const {
      module, // reading, listening, writing, speaking
      questionType, // multiple-choice, true-false-not-given, etc.
      search, // search in questionText
      sectionId, // specific section
      testId, // specific test
    } = req.query;

    // Build filter query
    const filter = {};

    // Filter by test/section
    if (testId) {
      const sections = await Section.find({ testId });
      const sectionIds = sections.map((s) => s._id);
      filter.sectionId = { $in: sectionIds };
    } else if (sectionId) {
      filter.sectionId = sectionId;
    }

    // Filter by question type
    if (questionType) {
      filter.questionType = questionType;
    }

    // Search in question text
    if (search) {
      filter.questionText = { $regex: search, $options: "i" };
    }

    // Get questions with populated data
    const questions = await Question.find(filter)
      .populate({
        path: "sectionId",
        populate: {
          path: "testId",
          select: "title module",
        },
      })
      .sort({ createdAt: -1 });

    // Filter by module if specified
    let filteredQuestions = questions;
    if (module) {
      filteredQuestions = questions.filter(
        (q) => q.sectionId?.testId?.module === module,
      );
    }

    res.json({
      count: filteredQuestions.length,
      questions: filteredQuestions,
    });
  } catch (error) {
    console.error("Get all questions error:", error);
    res.status(500).json({ error: "Server error" });
  }
};

// ==========================================
// ADMIN - GET QUESTION STATISTICS
// ==========================================
exports.getQuestionStats = async (req, res) => {
  try {
    // Total questions
    const totalQuestions = await Question.countDocuments();

    // Questions by type
    const byType = await Question.aggregate([
      {
        $group: {
          _id: "$questionType",
          count: { $sum: 1 },
        },
      },
      {
        $sort: { count: -1 },
      },
    ]);

    // Questions by module (need to join with Section and Test)
    const byModule = await Question.aggregate([
      {
        $lookup: {
          from: "sections",
          localField: "sectionId",
          foreignField: "_id",
          as: "section",
        },
      },
      {
        $unwind: "$section",
      },
      {
        $lookup: {
          from: "tests",
          localField: "section.testId",
          foreignField: "_id",
          as: "test",
        },
      },
      {
        $unwind: "$test",
      },
      {
        $group: {
          _id: "$test.module",
          count: { $sum: 1 },
        },
      },
      {
        $sort: { count: -1 },
      },
    ]);

    // Recent questions (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const recentQuestions = await Question.countDocuments({
      createdAt: { $gte: sevenDaysAgo },
    });

    res.json({
      totalQuestions,
      byType,
      byModule,
      recentQuestions,
    });
  } catch (error) {
    console.error("Get question stats error:", error);
    res.status(500).json({ error: "Server error" });
  }
};

// ==========================================
// ADMIN - GET SECTIONS FOR DROPDOWN
// ==========================================
exports.getSectionsForDropdown = async (req, res) => {
  try {
    const { testId } = req.query;

    let filter = {};
    if (testId) {
      filter.testId = testId;
    }

    const sections = await Section.find(filter)
      .populate("testId", "title module")
      .sort({ createdAt: -1 })
      .select("_id title sectionNumber testId");

    res.json({
      count: sections.length,
      sections,
    });
  } catch (error) {
    console.error("Get sections for dropdown error:", error);
    res.status(500).json({ error: "Server error" });
  }
};
