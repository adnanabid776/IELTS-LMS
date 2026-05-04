const MockExam = require("../models/MockExam");
const Test = require("../models/Test");
const Section = require("../models/Section");
const Question = require("../models/Question");

// Helper to create a single test from the mock JSON payload
const createTestFromPayload = async (testPayload, module, userId, createdIds) => {
  if (!testPayload || !testPayload.sections) return null;

  let totalQuestionCount = 0;
  for (const sec of testPayload.sections) {
    let sectionRealQuestionCount = 0;
    for (const q of sec.questions || []) {
      let questionWeight = 1;
      if (q.items && q.items.length > 0) {
        questionWeight = q.items.length;
      } else if (q.questionType === "multiple-choice-multi" && q.correctAnswer) {
        questionWeight = q.correctAnswer.split(",").length;
      }

      // Auto-assign questionNumber if missing (crucial for grouped questions)
      if (!q.questionNumber) {
        q.questionNumber = totalQuestionCount + sectionRealQuestionCount + 1;
      }

      sectionRealQuestionCount += questionWeight;
    }
    sec.calculatedTotalQuestions = sectionRealQuestionCount;
    totalQuestionCount += sectionRealQuestionCount;
  }

  const test = await Test.create({
    title: testPayload.title || `Mock ${module} Test`,
    module: module,
    description: testPayload.description || "",
    duration: testPayload.duration || 60,
    testFormat: "mock",
    createdBy: userId,
    totalQuestions: totalQuestionCount,
    totalSections: testPayload.sections.length,
  });
  createdIds.testIds.push(test._id);

  for (const sec of testPayload.sections) {
    const section = await Section.create({
      testId: test._id,
      sectionNumber: sec.sectionNumber,
      title: sec.title,
      passageText: sec.passageText || "",
      audioUrl: sec.audioUrl || "",
      audioScript: sec.audioScript || "",
      totalQuestions: sec.calculatedTotalQuestions || (sec.questions ? sec.questions.length : 0),
      taskType: sec.taskType || undefined,
    });
    createdIds.sectionIds.push(section._id);

    const questionDocs = (sec.questions || []).map((q) => ({
      sectionId: section._id,
      questionNumber: q.questionNumber,
      questionText: q.questionText,
      questionType: q.questionType,
      options: q.options || [],
      correctAnswer: q.correctAnswer || undefined,
      alternativeAnswers: q.alternativeAnswers || [],
      items: q.items || [],
      points: q.points || 1,
    }));

    if (questionDocs.length > 0) {
      const createdQuestions = await Question.insertMany(questionDocs);
      createdIds.questionIds.push(...createdQuestions.map((q) => q._id));
    }
  }

  return test._id;
};

exports.uploadMockExamJson = async (req, res) => {
  const createdIds = { testIds: [], sectionIds: [], questionIds: [], mockExamId: null };

  try {
    const { title, description, listeningTest, readingTest, writingTest } = req.body;
    const userId = req.user.userId;

    if (!title || !listeningTest || !readingTest || !writingTest) {
      return res.status(400).json({ error: "Missing required mock exam components" });
    }

    const listeningTestId = await createTestFromPayload(listeningTest, "listening", userId, createdIds);
    const readingTestId = await createTestFromPayload(readingTest, "reading", userId, createdIds);
    const writingTestId = await createTestFromPayload(writingTest, "writing", userId, createdIds);

    const mockExam = await MockExam.create({
      title,
      description: description || "",
      listeningTestId,
      readingTestId,
      writingTestId,
      createdBy: userId,
    });
    createdIds.mockExamId = mockExam._id;

    res.status(201).json({
      message: "Mock Exam created successfully",
      mockExam,
    });
  } catch (error) {
    console.error("Mock Exam upload error:", error);
    try {
      if (createdIds.questionIds.length > 0) await Question.deleteMany({ _id: { $in: createdIds.questionIds } });
      if (createdIds.sectionIds.length > 0) await Section.deleteMany({ _id: { $in: createdIds.sectionIds } });
      if (createdIds.testIds.length > 0) await Test.deleteMany({ _id: { $in: createdIds.testIds } });
      if (createdIds.mockExamId) await MockExam.findByIdAndDelete(createdIds.mockExamId);
    } catch (cleanupError) {}

    res.status(500).json({ error: "Failed to upload mock exam. Changes rolled back." });
  }
};

exports.getAllMockExams = async (req, res) => {
  try {
    const exams = await MockExam.find({ isActive: true })
      .populate("listeningTestId readingTestId writingTestId", "title duration totalQuestions totalSections")
      .sort({ createdAt: -1 });
    res.json(exams);
  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
};

exports.getMockExamById = async (req, res) => {
  try {
    const exam = await MockExam.findById(req.params.id)
      .populate("listeningTestId readingTestId writingTestId");
    if (!exam) return res.status(404).json({ error: "Mock Exam not found" });
    res.json(exam);
  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
};

exports.deleteMockExam = async (req, res) => {
  try {
    const exam = await MockExam.findById(req.params.id);
    if (!exam) return res.status(404).json({ error: "Mock Exam not found" });

    // We can either soft delete or hard delete. 
    // Soft delete is safer.
    exam.isActive = false;
    await exam.save();

    res.json({ message: "Mock Exam deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
};
