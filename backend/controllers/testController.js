const Test = require("../models/Test");
const Section = require("../models/Section");
const Question = require("../models/Question");

exports.createTest = async (req, res) => {
  try {
    const {
      title,
      module,
      description,
      duration,
      difficulty,
      instructions,
      testType,
    } = req.body;
    const userId = req.user.userId;
    //validate the required fields
    if (!title || !module || !duration) {
      return res
        .status(400)
        .json({ error: "Title, module, and duration are required." });
    }
    //create test
    const test = await Test.create({
      title,
      module,
      description,
      duration,
      difficulty: difficulty || "medium",
      instructions,
      testType: testType || "academic",
      createdBy: userId,
      totalQuestions: 0,
      totalSections: 0,
    });
    res.status(201).json({
      message: "Test created successfully",
      test,
    });
  } catch (error) {
    console.error("Create test error: ", error);
    res.status(500).json({ error: "Server error" });
  }
};
exports.getAllTests = async (req, res) => {
  try {
    const { module, difficulty, isActive } = req.query;

    // Build filter
    const filter = {};
    if (module) filter.module = module;
    if (difficulty) filter.difficulty = difficulty;
    if (isActive !== undefined) filter.isActive = isActive;

    // Filter by studentType for students
    if (req.user.role === "student") {
      filter.$or = [
        { testType: req.userDoc.studentType || "academic" },
        { module: "listening" } // Universal bypass for listening
      ];
    }

    const tests = await Test.find(filter)
      .populate("createdBy", "firstName lastName email")
      .sort({ createdAt: -1 });

    res.json({
      count: tests.length,
      tests,
    });
  } catch (error) {
    console.error("Get tests error:", error.message);
    res.status(500).json({ error: "Server error" });
  }
};

// Get single test by ID
exports.getTestById = async (req, res) => {
  try {
    const { id } = req.params;

    const test = await Test.findById(id).populate(
      "createdBy",
      "firstName lastName email",
    );

    if (!test) {
      return res.status(404).json({ error: "Test not found" });
    }

    // Security check: If student, ensure testType matches (Universal bypass for listening)
    if (req.user.role === "student" && test.module !== "listening") {
      const studentType = req.userDoc?.studentType || "academic";
      if (test.testType !== studentType && test.testType !== "both") {
        return res.status(403).json({
          error: "Unauthorized: This test is not in your current category (Academic/General)",
        });
      }
    }

    // Get sections for this test
    const sections = await Section.find({ testId: id }).sort({
      sectionNumber: 1,
    });

    res.json({
      test,
      sections,
    });
  } catch (error) {
    console.error("Get test error:", error);
    res.status(500).json({ error: "Server error" });
  }
};

// Update test
exports.updateTest = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      title,
      module,
      description,
      duration,
      difficulty,
      instructions,
      isActive,
      testType,
      testFormat,
    } = req.body;

    const test = await Test.findByIdAndUpdate(
      id,
      {
        title,
        module,
        description,
        duration,
        difficulty,
        instructions,
        isActive,
        testType,
        testFormat,
      },
      { new: true, runValidators: true },
    );

    if (!test) {
      return res.status(404).json({ error: "Test not found" });
    }

    res.json({
      message: "Test updated successfully",
      test,
    });
  } catch (error) {
    console.error("Update test error:", error);
    res.status(500).json({ error: "Server error" });
  }
};

// Delete test
exports.deleteTest = async (req, res) => {
  try {
    const { id } = req.params;

    const test = await Test.findByIdAndDelete(id);

    if (!test) {
      return res.status(404).json({ error: "Test not found" });
    }

    // Also delete all sections and questions for this test
    await Section.deleteMany({ testId: id });

    res.json({
      message: "Test deleted successfully",
    });
  } catch (error) {
    console.error("Delete test error:", error);
    res.status(500).json({ error: "Server error" });
  }
};

// Get tests by module
exports.getTestsByModule = async (req, res) => {
  try {
    const { module } = req.params;

    const tests = await Test.find({ module, isActive: true }).sort({
      createdAt: -1,
    });

    res.json({
      count: tests.length,
      tests,
    });
  } catch (error) {
    console.error("Get tests by module error:", error);
    res.status(500).json({ error: "Server error" });
  }
};

// ==========================================
// BULK UPLOAD TEST (Test + Sections + Questions)
// ==========================================
exports.bulkUploadTest = async (req, res) => {
  const createdIds = { testId: null, sectionIds: [], questionIds: [] };

  try {
    const {
      title,
      module,
      duration,
      difficulty,
      description,
      instructions,
      testType,
      testFormat,
      sections,
    } = req.body;
    const userId = req.user.userId;

    // --- Validate top-level fields ---
    const errors = [];
    if (!title || !title.trim()) errors.push("Test title is required");
    if (!module || !["reading", "listening", "writing"].includes(module)) {
      errors.push("Module must be one of: reading, listening, writing");
    }
    if (!duration || duration < 1)
      errors.push("Duration is required and must be at least 1 minute");
    if (!sections || !Array.isArray(sections) || sections.length === 0) {
      errors.push("At least one section is required");
    }

    if (errors.length > 0) {
      return res
        .status(400)
        .json({ error: "Validation failed", details: errors });
    }

    // --- Validate sections and questions ---
    const validQuestionTypes = [
      "multiple-choice",
      "true-false-not-given",
      "yes-no-not-given",
      "matching-headings",
      "matching-information",
      "matching-features",
      "matching-endings",
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
    ];

    let totalQuestionCount = 0;

    for (let si = 0; si < sections.length; si++) {
      const sec = sections[si];
      if (!sec.title || !sec.title.trim()) {
        errors.push(`Section ${si + 1}: title is required`);
      }
      if (!sec.sectionNumber) {
        sec.sectionNumber = si + 1;
      }
      if (
        !sec.questions ||
        !Array.isArray(sec.questions) ||
        sec.questions.length === 0
      ) {
        errors.push(
          `Section ${si + 1} ("${sec.title || "Untitled"}"): must have at least one question`,
        );
        continue;
      }

      let sectionRealQuestionCount = 0;
      for (let qi = 0; qi < sec.questions.length; qi++) {
        const q = sec.questions[qi];
        const qLabel = `Section ${si + 1}, Question ${qi + 1}`;

        if (!q.questionText || !q.questionText.trim()) {
          errors.push(`${qLabel}: questionText is required`);
        }
        if (!q.questionType || !validQuestionTypes.includes(q.questionType)) {
          errors.push(`${qLabel}: invalid questionType "${q.questionType}"`);
        }
        if (
          q.questionType !== "writing-task" &&
          !q.correctAnswer &&
          (!q.items || q.items.length === 0)
        ) {
          errors.push(
            `${qLabel}: correctAnswer or items required for type "${q.questionType}"`,
          );
        }

        // Calculate True Question Weight
        let questionWeight = 1;
        if (q.items && q.items.length > 0) {
          questionWeight = q.items.length;
        } else if (q.questionType === "multiple-choice-multi" && q.correctAnswer) {
          questionWeight = q.correctAnswer.split(",").length;
        }

        if (!q.questionNumber) {
          q.questionNumber = totalQuestionCount + sectionRealQuestionCount + 1;
        }

        sectionRealQuestionCount += questionWeight;
      }
      sec.calculatedTotalQuestions = sectionRealQuestionCount;

      // --- Propagate shared options for matching-endings ---
      // In IELTS format, only the first matching-endings question has the options array.
      // Copy it to all subsequent matching-endings questions in this section.
      const matchingEndingsQuestions = sec.questions.filter(
        (q) => q.questionType === "matching-endings",
      );
      if (matchingEndingsQuestions.length > 0) {
        const sharedOptions = matchingEndingsQuestions.find(
          (q) => q.options && q.options.length > 0,
        );
        if (sharedOptions) {
          matchingEndingsQuestions.forEach((q) => {
            if (!q.options || q.options.length === 0) {
              q.options = [...sharedOptions.options];
            }
          });
        }
      }

      totalQuestionCount += sec.calculatedTotalQuestions;
    }

    if (errors.length > 0) {
      return res
        .status(400)
        .json({ error: "Validation failed", details: errors });
    }

    // --- Create Test ---
    const test = await Test.create({
      title: title.trim(),
      module,
      description: description || "",
      duration,
      difficulty: difficulty || "medium",
      instructions: instructions || "",
      testType: testType || "academic",
      testFormat: testFormat || "full",
      createdBy: userId,
      totalQuestions: totalQuestionCount,
      totalSections: sections.length,
    });
    createdIds.testId = test._id;

    // --- Create Sections and Questions ---
    for (const sec of sections) {
      const section = await Section.create({
        testId: test._id,
        sectionNumber: sec.sectionNumber,
        title: sec.title,
        passageText: sec.passageText || "",
        audioUrl: sec.audioUrl || "",
        audioScript: sec.audioScript || "",
        playOnceOnly: sec.playOnceOnly || false,
        disableReplay:
          sec.disableReplay !== undefined ? sec.disableReplay : true,
        lockNavigationDuringAudio: sec.lockNavigationDuringAudio || false,
        instructions: sec.instructions || "",
        questionRange: sec.questionRange || "",
        totalQuestions: sec.calculatedTotalQuestions || sec.questions.length,
        duration: sec.duration || null,
        taskType: sec.taskType || undefined,
        taskImageUrl: sec.taskImageUrl || undefined,
        wordLimit: sec.wordLimit || undefined,
      });
      createdIds.sectionIds.push(section._id);

      const questionDocs = sec.questions.map((q) => ({
        sectionId: section._id,
        questionNumber: q.questionNumber,
        questionText: q.questionText,
        questionType: q.questionType,
        options: q.options || [],
        correctAnswer: q.correctAnswer || undefined,
        alternativeAnswers: q.alternativeAnswers || [],
        items: q.items || [],
        features: q.features || [],
        tableStructure: q.tableStructure || undefined,
        summaryConfig: q.summaryConfig || undefined,
        points: q.points || 1,
        imageUrl: q.imageUrl || undefined,
        explanation: q.explanation || undefined,
        gradingRubric: q.gradingRubric || undefined,
        wordLimit: q.wordLimit || undefined,
        allowNumber: q.allowNumber !== undefined ? q.allowNumber : true,
      }));

      const createdQuestions = await Question.insertMany(questionDocs);
      createdIds.questionIds.push(...createdQuestions.map((q) => q._id));
    }

    res.status(201).json({
      message: "Test uploaded successfully",
      test: {
        _id: test._id,
        title: test.title,
        module: test.module,
        totalSections: sections.length,
        totalQuestions: totalQuestionCount,
      },
    });
  } catch (error) {
    console.error("Bulk upload error:", error);

    // Cleanup on failure
    try {
      if (createdIds.questionIds.length > 0) {
        await Question.deleteMany({ _id: { $in: createdIds.questionIds } });
      }
      if (createdIds.sectionIds.length > 0) {
        await Section.deleteMany({ _id: { $in: createdIds.sectionIds } });
      }
      if (createdIds.testId) {
        await Test.findByIdAndDelete(createdIds.testId);
      }
    } catch (cleanupError) {
      console.error("Cleanup error:", cleanupError);
    }

    res.status(500).json({
      error: "Failed to upload test. All changes have been rolled back.",
    });
  }
};
// Sync/Recalculate all totals for a test (Repair Utility)
exports.recalculateTotals = async (req, res) => {
  try {
    const { id } = req.params;
    const { syncTestAndSectionTotals } = require("./questionController");

    const result = await syncTestAndSectionTotals(null, id);

    if (!result) {
      return res.status(404).json({ error: "Test not found or could not be synced" });
    }

    res.json({
      message: "Test totals recalculated successfully",
      testId: id,
      newTotal: result.testTotal,
    });
  } catch (error) {
    console.error("Recalculate totals error:", error);
    res.status(500).json({ error: "Server error" });
  }
};
