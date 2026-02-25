const resultController = require("../controllers/resultController");
const Session = require("../models/Session");
const Result = require("../models/Result");
const Test = require("../models/Test");
const Section = require("../models/Section");
const Question = require("../models/Question");

// Mock Mongoose models
jest.mock("../models/Session");
jest.mock("../models/Result");
jest.mock("../models/Test");
jest.mock("../models/Section");
jest.mock("../models/Question");

// Mock the grading engine's calculateResult to prevent shadow grading errors
jest.mock("../utils/gradingEngine", () => {
  const actual = jest.requireActual("../utils/gradingEngine");
  return {
    ...actual,
    calculateResult: jest.fn().mockReturnValue({
      correctAnswers: 0,
      totalQuestions: 0,
      incorrectAnswers: 0,
    }),
  };
});

describe("Result Controller - submitTest", () => {
  let req, res;

  beforeEach(() => {
    req = {
      body: { sessionId: "mockSessionId" },
      user: { userId: "mockUserId" },
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    jest.clearAllMocks();
  });

  test("should calculate correct score for Map Labeling question", async () => {
    // 1. Mock Session with proper toString() support on IDs
    const mockSession = {
      _id: "mockSessionId",
      userId: { toString: () => "mockUserId" },
      testId: {
        _id: { toString: () => "mockTestId" },
        module: "listening",
      },
      status: "in-progress",
      answers: [
        {
          questionId: { toString: () => "q1" },
          userAnswer: { A: "Label1", B: "WrongLabel" }, // 1 correct, 1 wrong
        },
      ],
      totalTimeSpent: 1800,
      startedAt: new Date(Date.now() - 1800000),
      save: jest.fn().mockResolvedValue(true),
    };

    Session.findById.mockReturnValue({
      populate: jest.fn().mockResolvedValue(mockSession),
    });

    // 2. Mock Sections with toString() on _id
    const mockSection = {
      _id: { toString: () => "s1" },
      sectionNumber: 1,
      title: "Section 1",
    };
    Section.find.mockResolvedValue([mockSection]);

    // 3. Mock Questions with toString() on _id and sectionId
    const mockQuestion = {
      _id: { toString: () => "q1" },
      sectionId: { toString: () => "s1" },
      questionType: "map-labeling",
      questionNumber: 1,
      correctAnswer: "",
      alternativeAnswers: [],
      items: [
        { label: "A", correctAnswer: "Label1" },
        { label: "B", correctAnswer: "CorrectLabel2" },
      ],
      options: [],
    };

    Question.find.mockReturnValue({
      sort: jest.fn().mockResolvedValue([mockQuestion]),
    });

    // 4. Mock Result Creation - return what we expect
    Result.create.mockImplementation((data) =>
      Promise.resolve({
        _id: "mockResultId",
        ...data,
      }),
    );

    await resultController.submitTest(req, res);

    // Verify Result.create was called with correct scoring
    expect(Result.create).toHaveBeenCalledWith(
      expect.objectContaining({
        correctAnswers: 1, // 1 out of 2 items correct
        totalQuestions: 2, // 2 items total
        percentage: 50,
      }),
    );
    expect(res.status).toHaveBeenCalledWith(201);
  });

  test("should calculate correct score for Multiple Choice Multi", async () => {
    // 1. Mock Session
    const mockSession = {
      _id: "mockSessionId",
      userId: { toString: () => "mockUserId" },
      testId: {
        _id: { toString: () => "mockTestId" },
        module: "listening",
      },
      status: "in-progress",
      answers: [
        {
          questionId: { toString: () => "q2" },
          userAnswer: ["OptionA", "OptionB"], // Matches correctAnswer
        },
        {
          questionId: { toString: () => "q3" },
          userAnswer: ["OptionA"], // Partial match
        },
      ],
      totalTimeSpent: 1800,
      startedAt: new Date(Date.now() - 1800000),
      save: jest.fn().mockResolvedValue(true),
    };

    Session.findById.mockReturnValue({
      populate: jest.fn().mockResolvedValue(mockSession),
    });

    // 2. Mock Sections
    const mockSection = {
      _id: { toString: () => "s1" },
      sectionNumber: 1,
      title: "Section 1",
    };
    Section.find.mockResolvedValue([mockSection]);

    // 3. Mock Questions
    Question.find.mockReturnValue({
      sort: jest.fn().mockResolvedValue([
        {
          _id: { toString: () => "q2" },
          sectionId: { toString: () => "s1" },
          questionType: "multiple-choice-multi",
          questionNumber: 1,
          correctAnswer: "OptionA",
          alternativeAnswers: ["OptionB"],
          options: [],
        },
        {
          _id: { toString: () => "q3" },
          sectionId: { toString: () => "s1" },
          questionType: "multiple-choice-multi",
          questionNumber: 2,
          correctAnswer: "OptionA",
          alternativeAnswers: ["OptionB"],
          options: [],
        },
      ]),
    });

    // 4. Mock Result Creation
    Result.create.mockImplementation((data) =>
      Promise.resolve({
        _id: "mockResultId",
        ...data,
      }),
    );

    await resultController.submitTest(req, res);

    expect(Result.create).toHaveBeenCalledWith(
      expect.objectContaining({
        correctAnswers: 1, // First Q fully correct, second Q partial = incorrect
        totalQuestions: 2,
      }),
    );
    expect(res.status).toHaveBeenCalledWith(201);
  });
});
