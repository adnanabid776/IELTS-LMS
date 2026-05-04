const MockResult = require("../models/MockResult");
const Result = require("../models/Result");
const MockExam = require("../models/MockExam");

exports.initializeMockResult = async (req, res) => {
  try {
    const { mockExamId } = req.body;
    const userId = req.user.userId;

    const mockExam = await MockExam.findById(mockExamId);
    if (!mockExam) return res.status(404).json({ error: "Mock Exam not found" });

    // Check if one already exists
    let mockResult = await MockResult.findOne({ userId, mockExamId, status: "in-progress" });
    if (!mockResult) {
      mockResult = await MockResult.create({ userId, mockExamId });
    }

    res.status(201).json(mockResult);
  } catch (error) {
    res.status(500).json({ error: "Failed to initialize mock result" });
  }
};

exports.updateMockResultModule = async (req, res) => {
  try {
    const { mockExamId, module, resultId, bandScore } = req.body;
    const userId = req.user.userId;

    const mockResult = await MockResult.findOne({ mockExamId, userId }).sort({ createdAt: -1 });
    if (!mockResult) return res.status(404).json({ error: "Mock Result not found" });

    if (module === "listening") {
      mockResult.listeningResultId = resultId;
      mockResult.listeningBand = bandScore;
    } else if (module === "reading") {
      mockResult.readingResultId = resultId;
      mockResult.readingBand = bandScore;
    } else if (module === "writing") {
      mockResult.writingResultId = resultId;
      mockResult.status = "pending_evaluation";
      // writingBand will be updated later when teacher grades it
    }

    await mockResult.save();
    res.json(mockResult);
  } catch (error) {
    res.status(500).json({ error: "Failed to update mock result" });
  }
};

// Teacher calls this to grade Speaking and/or Writing
exports.evaluateMockResult = async (req, res) => {
  try {
    const { mockResultId } = req.params;
    const { speakingBand, speakingNotes, writingBand } = req.body;
    const teacherId = req.user.userId;

    const mockResult = await MockResult.findById(mockResultId);
    if (!mockResult) return res.status(404).json({ error: "Mock Result not found" });

    if (speakingBand !== undefined) {
      mockResult.speakingBand = Number(speakingBand);
      mockResult.speakingTeacherId = teacherId;
      mockResult.speakingEvaluatedAt = new Date();
      mockResult.speakingNotes = speakingNotes || "";
    }

    if (writingBand !== undefined) {
      mockResult.writingBand = Number(writingBand);
    }

    // Try to calculate overall if everything is graded
    if (mockResult.speakingBand !== null && mockResult.writingBand !== null && mockResult.listeningBand !== null && mockResult.readingBand !== null) {
      mockResult.calculateOverallBand();
    }

    await mockResult.save();
    res.json(mockResult);
  } catch (error) {
    res.status(500).json({ error: "Failed to evaluate mock result" });
  }
};

exports.getMockResults = async (req, res) => {
  try {
    const results = await MockResult.find()
      .populate("userId", "name email")
      .populate("mockExamId", "title")
      .sort({ createdAt: -1 });
    res.json(results);
  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
};

exports.getMyMockResults = async (req, res) => {
  try {
    const userId = req.user.userId;
    const results = await MockResult.find({ userId })
      .populate("mockExamId", "title")
      .sort({ createdAt: -1 });
    res.json(results);
  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
};

exports.getMockResultById = async (req, res) => {
  try {
    const result = await MockResult.findById(req.params.id)
      .populate("userId", "name email firstName lastName")
      .populate("mockExamId")
      .populate("speakingTeacherId", "name")
      .populate("writingResultId");
    
    if (!result) return res.status(404).json({ error: "Not found" });

    // If writing result exists, fetch the session answers so teacher can see what was written
    let writingAnswers = null;
    if (result.writingResultId && result.writingResultId.sessionId) {
      const Session = require("../models/Session");
      const session = await Session.findById(result.writingResultId.sessionId);
      if (session && session.answers) {
        writingAnswers = session.answers;
      }
    }

    const responseData = result.toObject();
    responseData.writingAnswers = writingAnswers;

    res.json(responseData);
  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
};

exports.deleteMockResult = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    const mockResult = await MockResult.findById(id);
    if (!mockResult) return res.status(404).json({ error: "Mock result not found" });

    // Only owner or admin/teacher can delete
    if (mockResult.userId.toString() !== userId && req.user.role !== "admin" && req.user.role !== "teacher") {
      return res.status(403).json({ error: "Unauthorized" });
    }

    await MockResult.findByIdAndDelete(id);
    res.json({ message: "Mock result deleted successfully" });
  } catch (error) {
    console.error("Delete mock result error:", error);
    res.status(500).json({ error: "Server error" });
  }
};
