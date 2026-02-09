const Section = require("../models/Section");
const Test = require("../models/Test");
const Question = require("../models/Question");

// Create a section
exports.createSection = async (req, res) => {
  try {
    const {
      testId,
      sectionNumber,
      title,
      passageText,
      audioUrl,
      audioScript,
      playOnceOnly,
      disableReplay,
      lockNavigationDuringAudio,
      instructions,
      questionRange,
      totalQuestions,
      duration,
      // Writing fields
      taskType,
      taskImageUrl,
      wordLimit,
      // Speaking fields
      cueCard,
      speakingPartNumber,
    } = req.body;

    // Validate required fields
    if (!testId || !sectionNumber || !title) {
      return res
        .status(400)
        .json({ error: "Test ID, section number, and title are required" });
    }

    // Check if test exists
    const test = await Test.findById(testId);
    if (!test) {
      return res.status(404).json({ error: "Test not found" });
    }

    // Create section
    const section = await Section.create({
      testId,
      sectionNumber,
      title,
      passageText,
      audioUrl,
      audioScript,
      playOnceOnly,
      disableReplay,
      lockNavigationDuringAudio,
      instructions,
      questionRange,
      totalQuestions: totalQuestions || 0,
      duration,
      taskType,
      taskImageUrl,
      wordLimit,
      cueCard,
      speakingPartNumber,
    });

    // Update test's totalSections
    await Test.findByIdAndUpdate(testId, {
      $inc: { totalSections: 1 },
    });

    res.status(201).json({
      message: "Section created successfully",
      section,
    });
  } catch (error) {
    console.error("Create section error:", error);
    res.status(500).json({ error: "Server error" });
  }
};

// Get sections by test ID
exports.getSectionsByTestId = async (req, res) => {
  try {
    const { testId } = req.params;

    const sections = await Section.find({ testId }).sort({ sectionNumber: 1 });

    res.json({
      count: sections.length,
      sections,
    });
  } catch (error) {
    console.error("Get sections error:", error);
    res.status(500).json({ error: "Server error" });
  }
};

// Get single section by ID
exports.getSectionById = async (req, res) => {
  try {
    const { id } = req.params;

    const section = await Section.findById(id).populate(
      "testId",
      "title module",
    );

    if (!section) {
      return res.status(404).json({ error: "Section not found" });
    }

    // Get questions for this section
    const questions = await Question.find({ sectionId: id }).sort({
      questionNumber: 1,
    });

    res.json({
      section,
      questions,
    });
  } catch (error) {
    console.error("Get section error:", error);
    res.status(500).json({ error: "Server error" });
  }
};

// Update section
exports.updateSection = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      title,
      passageText,
      audioUrl,
      audioScript,
      playOnceOnly,
      disableReplay,
      lockNavigationDuringAudio,
      instructions,
      questionRange,
      duration,
      // Writing fields
      taskType,
      taskImageUrl,
      wordLimit,
      // Speaking fields
      cueCard,
      speakingPartNumber,
    } = req.body;

    const section = await Section.findByIdAndUpdate(
      id,
      {
        title,
        passageText,
        audioUrl,
        audioScript,
        playOnceOnly,
        disableReplay,
        lockNavigationDuringAudio,
        instructions,
        questionRange,
        duration,
        taskType,
        taskImageUrl,
        wordLimit,
        cueCard,
        speakingPartNumber,
      },
      { new: true, runValidators: true },
    );

    if (!section) {
      return res.status(404).json({ error: "Section not found" });
    }

    res.json({
      message: "Section updated successfully",
      section,
    });
  } catch (error) {
    console.error("Update section error:", error);
    res.status(500).json({ error: "Server error" });
  }
};

// Delete section
exports.deleteSection = async (req, res) => {
  try {
    const { id } = req.params;

    const section = await Section.findById(id);
    if (!section) {
      return res.status(404).json({ error: "Section not found" });
    }

    // Delete section
    await Section.findByIdAndDelete(id);

    // Delete all questions in this section
    await Question.deleteMany({ sectionId: id });

    // Update test's totalSections
    await Test.findByIdAndUpdate(section.testId, {
      $inc: { totalSections: -1 },
    });

    res.json({
      message: "Section deleted successfully",
    });
  } catch (error) {
    console.error("Delete section error:", error);
    res.status(500).json({ error: "Server error" });
  }
};
