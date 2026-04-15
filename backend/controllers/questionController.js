const Question = require("../models/Question");
const Section = require("../models/Section");
const Test = require("../models/Test");

// Helper function to keep Test and Section totals in sync with reality
const syncTestAndSectionTotals = async (sectionId, testId) => {
  try {
    if (!sectionId && !testId) return;

    // Resolve IDs if only one is provided
    if (!testId && sectionId) {
      const section = await Section.findById(sectionId);
      if (section) testId = section.testId;
    }
    if (!sectionId && testId) {
      // If we only have testId, we might need to sync ALL sections of that test
      const allSections = await Section.find({ testId });
      for (const sec of allSections) {
        await syncTestAndSectionTotals(sec._id, testId);
      }
      // Return final state
      const updatedTest = await Test.findById(testId);
      return { testTotal: updatedTest?.totalQuestions };
    }

    // 1. Sync Section Total
    const sectionQuestions = await Question.find({ sectionId });
    let sectionTotal = 0;
    
    // Exact list of composite types from resultController.js
    const compositeTypes = [
      "map-labeling",
      "matching-headings",
      "matching-information",
      "matching-features",
      "table-completion",
      "form-completion",
      "flow-chart-completion",
      "diagram-labeling"
    ];

    sectionQuestions.forEach((q) => {
      // IELTS logic: Each sub-item in a composite question counts as 1.
      // Standard questions count as 1.
      if (compositeTypes.includes(q.questionType) && q.items && q.items.length > 0) {
        let itemsCount = q.items.length;
        if (q.questionType === "form-completion") {
          itemsCount = q.items.filter(item => item.text && item.text.includes("__________")).length;
        }
        sectionTotal += itemsCount > 0 ? itemsCount : 1;
      } else {
        sectionTotal += 1;
      }
    });
    await Section.findByIdAndUpdate(sectionId, { totalQuestions: sectionTotal });

    // 2. Sync Test Total Questions and Total Sections
    const sections = await Section.find({ testId });
    let testTotal = 0;
    for (const sec of sections) {
      const questions = await Question.find({ sectionId: sec._id });
      questions.forEach((q) => {
        if (compositeTypes.includes(q.questionType) && q.items && q.items.length > 0) {
          let itemsCount = q.items.length;
          if (q.questionType === "form-completion") {
            itemsCount = q.items.filter(item => item.text && item.text.includes("__________")).length;
          }
          testTotal += itemsCount > 0 ? itemsCount : 1;
        } else {
          testTotal += 1;
        }
      });
    }

    await Test.findByIdAndUpdate(testId, {
      totalQuestions: testTotal,
      totalSections: sections.length,
    });

    return { sectionTotal, testTotal };
  } catch (error) {
    console.error("Sync Totals Error:", error);
  }
};

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
      items,
      wordLimit,
      allowNumber,
      tableStructure,
      features,
      summaryConfig, // ✅ ADDED
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
      items,
      wordLimit,
      allowNumber,
      tableStructure,
      features, 
      summaryConfig, 
    });

    // Sync totals
    await syncTestAndSectionTotals(sectionId, section.testId);
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
      selectFields =
        "-correctAnswer -explanation -alternativeAnswers -items.correctAnswer -gradingRubric";
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
    console.error("Get questions error: ", error.message);
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
      items,
      wordLimit,
      allowNumber,
      tableStructure,
      features, // ✅ ADDED
      summaryConfig, // ✅ ADDED
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
        items,
        wordLimit,
        allowNumber,
        tableStructure,
        features, // ✅ ADDED
        summaryConfig, // ✅ ADDED
      },
      { new: true, runValidators: true },
    );

    // Sync totals if items changed
    if (items !== undefined) {
      const section = await Section.findById(question.sectionId);
      await syncTestAndSectionTotals(question.sectionId, section?.testId);
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

    // Sync totals
    await syncTestAndSectionTotals(question.sectionId, section?.testId);

    res.json({
      message: "Question deleted successfully",
    });
  } catch (error) {
    console.error("Delete question error:", error);
    res.status(500).json({ error: "Server error" });
  }
};

exports.bulkDeleteQuestions = async (req, res) => {
  try {
    const { questionIds } = req.body;

    if (!Array.isArray(questionIds) || questionIds.length === 0) {
      return res
        .status(400)
        .json({ error: "No questions selected for deletion" });
    }

    // 1. Get all questions to be deleted to find their sections
    const questions = await Question.find({ _id: { $in: questionIds } });

    if (questions.length === 0) {
      return res.status(404).json({ error: "Questions not found" });
    }

    // 2. Delete questions
    await Question.deleteMany({ _id: { $in: questionIds } });

    // 3. Update section counts for syncing
    const sectionCounts = {};
    questions.forEach((q) => {
      if (q.sectionId) {
        sectionCounts[q.sectionId] = (sectionCounts[q.sectionId] || 0) + 1;
      }
    });

    const sectionIds = Object.keys(sectionCounts);
    for (const sectionId of sectionIds) {
      const section = await Section.findById(sectionId);
      await syncTestAndSectionTotals(sectionId, section?.testId);
    }

    res.json({
      message: `${questions.length} questions deleted successfully`,
    });
  } catch (error) {
    console.error("Bulk delete questions error:", error);
    res.status(500).json({ error: "Server error" });
  }
};

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

      // Types that store answers in items[], not top-level correctAnswer
      const typesWithoutTopLevelAnswer = [
        "writing-task",
        "matching-headings",
        "matching-information",
        "matching-features",
        "matching-endings",
        "table-completion",
        "diagram-labeling",
        "map-labeling",
        "flow-chart-completion"
      ];

      if (!q.correctAnswer && !typesWithoutTopLevelAnswer.includes(q.questionType)) {
        return res.status(400).json({
          error: `Question ${i + 1}: correctAnswer is required for type "${q.questionType}"`,
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

    // Sync totals
    await syncTestAndSectionTotals(sectionId, section.testId);

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
// ADMIN - GET ALL QUESTIONS WITH FILTERS + PAGINATION
// ==========================================
exports.getAllQuestions = async (req, res) => {
  try {
    const {
      module, // reading, listening, writing
      questionType, // multiple-choice, true-false-not-given, etc.
      search, // search in questionText
      sectionId, // specific section
      testId, // specific test
      page = 1,
      limit = 10,
    } = req.query;

    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.max(1, Math.min(100, parseInt(limit)));
    const skip = (pageNum - 1) * limitNum;

    // Build filter query
    const filter = {};

    // Filter by module — resolve to section IDs at DB level
    if (module) {
      const Test = require("../models/Test");
      const matchingTests = await Test.find({ module }).select("_id");
      const testIds = matchingTests.map((t) => t._id);
      const matchingSections = await Section.find({
        testId: { $in: testIds },
      }).select("_id");
      filter.sectionId = { $in: matchingSections.map((s) => s._id) };
    }

    // Filter by test/section (overrides module filter if both given)
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

    // Get total count for pagination
    const totalCount = await Question.countDocuments(filter);
    const totalPages = Math.ceil(totalCount / limitNum);

    // Get paginated questions with populated data
    const questions = await Question.find(filter)
      .populate({
        path: "sectionId",
        populate: {
          path: "testId",
          select: "title module",
        },
      })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum);

    res.json({
      count: questions.length,
      totalCount,
      totalPages,
      page: pageNum,
      questions,
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
// Export the sync helper for use in Test controller or repair routes
exports.syncTestAndSectionTotals = syncTestAndSectionTotals;
