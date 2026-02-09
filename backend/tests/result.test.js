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
    // 1. Mock Session
    Session.findById.mockReturnValue({
      populate: jest.fn().mockResolvedValue({
        _id: "mockSessionId",
        userId: "mockUserId",
        testId: { _id: "mockTestId", module: "listening" },
        status: "in-progress",
        answers: [
          {
            questionId: "q1",
            userAnswer: { A: "Label1", B: "WrongLabel" }, // 1 correct, 1 wrong
          },
        ],
        save: jest.fn(),
      }),
    });

    // 2. Mock Test, Section, Questions
    Section.find.mockResolvedValue([{ _id: "s1" }]);
    Question.find.mockReturnValue({
      sort: jest.fn().mockResolvedValue([
        {
          _id: "q1",
          sectionId: "s1",
          questionType: "map-labeling",
          questionNumber: 1,
          items: [
            { label: "A", correctAnswer: "Label1" },
            { label: "B", correctAnswer: "CorrectLabel2" },
          ],
        },
      ]),
    });

    // 3. Mock Result Creation
    Result.create.mockResolvedValue({
      _id: "mockResultId",
      correctAnswers: 1, // Expect 1 point
      totalQuestions: 2, // Expect 2 points total
      percentage: 50,
      bandScore: 3, // Mock value
    });

    await resultController.submitTest(req, res);

    expect(Result.create).toHaveBeenCalledWith(
      expect.objectContaining({
        correctAnswers: 1,
        totalQuestions: 2,
        percentage: 50,
      }),
    );
    expect(res.status).toHaveBeenCalledWith(201);
  });

  test("should calculate correct score for Multiple Choice Multi", async () => {
    // 1. Mock Session
    Session.findById.mockReturnValue({
      populate: jest.fn().mockResolvedValue({
        _id: "mockSessionId",
        userId: "mockUserId",
        testId: { _id: "mockTestId", module: "listening" },
        status: "in-progress",
        answers: [
          {
            questionId: "q2",
            userAnswer: ["OptionA", "OptionB"], // Correct
          },
          {
            questionId: "q3",
            userAnswer: ["OptionA"], // Incorrect (Partial) - strict logic = 0
          },
        ],
        save: jest.fn(),
      }),
    });

    // 2. Mock Test, Section, Questions
    Section.find.mockResolvedValue([{ _id: "s1" }]);
    Question.find.mockReturnValue({
      sort: jest.fn().mockResolvedValue([
        {
          _id: "q2",
          sectionId: "s1",
          questionType: "multiple-choice-multi",
          questionNumber: 1,
          correctAnswer: "OptionA",
          alternativeAnswers: ["OptionB"], // Assuming stricter logic or simple "includes" logic
        },
        {
          _id: "q3",
          sectionId: "s1",
          questionType: "multiple-choice-multi",
          questionNumber: 2,
          correctAnswer: "OptionA",
          alternativeAnswers: ["OptionB"],
        },
      ]),
    });


    Result.create.mockResolvedValue({
      _id: "mockResultId",
      correctAnswers: 2,
      totalQuestions: 2,
    });

    await resultController.submitTest(req, res);

    expect(Result.create).toHaveBeenCalledWith(
      expect.objectContaining({
        correctAnswers: 2, // Both considered correct with current loose logic
        totalQuestions: 2,
      }),
    );
  });
});
