import React, { useEffect, useState, useCallback, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import DashboardLayout from "../components/Layout/DashboardLayout";
import AudioPlayer from "../components/AudioPlayer";
import { toast } from "react-toastify";
import axios from "axios";

const API_URL = "http://localhost:5000/api";

const ListeningTestTaking = () => {
  const { testId } = useParams();
  const navigate = useNavigate();

  // State
  const [test, setTest] = useState(null);
  const [sections, setSections] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [session, setSession] = useState(null);
  const [currentSectionIndex, setCurrentSectionIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(0);

  // Get current section
  const currentSection = useMemo(
    () => sections[currentSectionIndex] || null,
    [sections, currentSectionIndex],
  );

  // Get questions for current section
  const currentQuestions = useMemo(
    () => questions.filter((q) => q.sectionId === currentSection?._id),
    [questions, currentSection],
  );

  // Calculate progress
  const progress = useMemo(() => {
    const totalQuestions = questions.length;
    const answeredQuestions = Object.keys(answers).length;
    return totalQuestions > 0 ? (answeredQuestions / totalQuestions) * 100 : 0;
  }, [answers, questions]);

  // Load test data
  useEffect(() => {
    fetchTestData();
  }, [testId]);

  // Timer countdown
  useEffect(() => {
    if (!session || session.status !== "in-progress") return;

    const timer = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          handleAutoSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [session]);

  // Auto-save every 30 seconds
  useEffect(() => {
    if (!session || session.status !== "in-progress") return;

    const autoSave = setInterval(() => {
      saveAnswersToBackend();
    }, 30000); // Every 30 seconds

    return () => clearInterval(autoSave);
  }, [session, answers]);

  const fetchTestData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");

      // Get test details
      const testResponse = await axios.get(`${API_URL}/tests/${testId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const testData = testResponse.data.test;
      const sectionsData = testResponse.data.sections;

      setTest(testData);
      setSections(sectionsData);

      // Get all questions for all sections
      const allQuestions = [];
      for (const section of sectionsData) {
        const qResponse = await axios.get(
          `${API_URL}/questions/section/${section._id}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          },
        );
        allQuestions.push(...qResponse.data.questions);
      }
      setQuestions(allQuestions);

      // Start or resume session
      await startOrResumeSession(testData);
    } catch (error) {
      console.error("Fetch test data error:", error);
      toast.error("Failed to load test");
      navigate("/tests");
    } finally {
      setLoading(false);
    }
  };

  const startOrResumeSession = async () => {
    try {
      const token = localStorage.getItem("token");

      const response = await axios.post(
        `${API_URL}/sessions/start`,
        { testId },
        { headers: { Authorization: `Bearer ${token}` } },
      );

      const sessionData = response.data.session;
      setSession(sessionData);
      setTimeRemaining(sessionData.timeRemaining);

      // If resuming, load existing answers
      if (response.data.isResuming) {
        const sessionResponse = await axios.get(
          `${API_URL}/sessions/${sessionData._id}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          },
        );

        const existingAnswers = {};
        sessionResponse.data.session.answers.forEach((ans) => {
          existingAnswers[ans.questionId] = ans.userAnswer;
        });
        setAnswers(existingAnswers);

        toast.info("Resuming your previous session");
      } else {
        toast.success("Test started! Good luck!");
      }
    } catch (error) {
      console.error("Start session error:", error);
      toast.error("Failed to start test");
      navigate("/tests");
    }
  };

  const handleAnswerChange = useCallback((questionId, value) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: value,
    }));
  }, []);

  const handleMultiAnswerChange = useCallback(
    (questionId, value, isChecked) => {
      setAnswers((prev) => {
        const currentAnswers = prev[questionId] || [];
        // Ensure currentAnswers is an array
        const currentArray = Array.isArray(currentAnswers)
          ? currentAnswers
          : [];
        let newAnswers;
        if (isChecked) {
          newAnswers = [...currentArray, value];
        } else {
          newAnswers = currentArray.filter((v) => v !== value);
        }
        return {
          ...prev,
          [questionId]: newAnswers,
        };
      });
    },
    [],
  );

  const saveAnswersToBackend = async () => {
    if (!session || Object.keys(answers).length === 0) return;

    try {
      const token = localStorage.getItem("token");
      const answersArray = Object.entries(answers).map(
        ([questionId, userAnswer]) => ({
          questionId,
          userAnswer,
          timeSpent: 0,
        }),
      );

      await axios.post(
        `${API_URL}/sessions/bulk-save`,
        { sessionId: session._id, answers: answersArray },
        { headers: { Authorization: `Bearer ${token}` } },
      );
    } catch (error) {
      console.error("Auto-save error:", error);
    }
  };

  const handleNextSection = () => {
    if (currentSectionIndex < sections.length - 1) {
      setCurrentSectionIndex((prev) => prev + 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const handlePreviousSection = () => {
    if (currentSectionIndex > 0) {
      setCurrentSectionIndex((prev) => prev - 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const handleAutoSubmit = async () => {
    toast.warning("Time is up! Submitting your test...");
    await handleSubmitTest();
  };

  const handleSubmitTest = async () => {
    if (submitting) return;

    const confirmed = window.confirm(
      "Are you sure you want to submit? You cannot change your answers after submission.",
    );

    if (!confirmed) return;

    setSubmitting(true);

    try {
      const token = localStorage.getItem("token");

      // Final save
      await saveAnswersToBackend();

      // Submit session
      await axios.post(
        `${API_URL}/sessions/submit`,
        { sessionId: session._id },
        { headers: { Authorization: `Bearer ${token}` } },
      );

      // Calculate result
      const resultResponse = await axios.post(
        `${API_URL}/results/calculate`,
        { sessionId: session._id },
        { headers: { Authorization: `Bearer ${token}` } },
      );

      toast.success("✅ Test submitted successfully!");

      setTimeout(() => {
        navigate(`/result/${resultResponse.data.result._id}`);
      }, 1500);
    } catch (error) {
      console.error("Submit test error:", error);
      toast.error("Failed to submit test");
      setSubmitting(false);
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const getTimerColor = () => {
    if (timeRemaining > 600) return "text-blue-600"; // > 10 mins
    if (timeRemaining > 300) return "text-orange-600"; // > 5 mins
    return "text-red-600"; // < 5 mins
  };

  const handleAudioEnded = async () => {
    if (!currentSection || !session) return;
    try {
      const token = localStorage.getItem("token");
      await axios.post(
        `${API_URL}/sessions/mark-audio-played`,
        { sessionId: session._id, sectionId: currentSection._id },
        { headers: { Authorization: `Bearer ${token}` } },
      );
      // Update local session state to reflect change immediately
      setSession((prev) => ({
        ...prev,
        audioPlayedSections: [
          ...(prev.audioPlayedSections || []),
          currentSection._id,
        ],
      }));
    } catch (error) {
      console.error("Failed to mark audio played:", error);
    }
  };

  const renderQuestion = (question) => {
    const questionId = question._id;
    const userAnswer = answers[questionId] || "";

    switch (question.questionType) {
      case "multiple-choice":
        return (
          <div
            key={questionId}
            className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-4 hover:shadow-md transition"
          >
            <div className="flex items-start gap-3 mb-4">
              <span className="text-lg font-bold text-blue-600 bg-blue-100 w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0">
                {question.questionNumber}
              </span>
              <p className="text-gray-800 font-medium flex-1">
                {question.questionText}
              </p>
            </div>

            <div className="space-y-2 ml-11">
              {question.options.map((option, index) => (
                <label
                  key={index}
                  className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition ${
                    userAnswer === option
                      ? "bg-blue-100 border-2 border-blue-500"
                      : "bg-gray-50 border-2 border-transparent hover:bg-gray-100"
                  }`}
                >
                  <input
                    type="radio"
                    name={questionId}
                    value={option}
                    checked={userAnswer === option}
                    onChange={(e) =>
                      handleAnswerChange(questionId, e.target.value)
                    }
                    className="w-5 h-5 text-blue-600"
                  />
                  <span className="font-semibold text-gray-700 w-8">
                    {String.fromCharCode(65 + index)}.
                  </span>
                  <span className="text-gray-800">{option}</span>
                </label>
              ))}
            </div>
          </div>
        );

      case "multiple-choice-multi": {
        const userAnswersMulti = Array.isArray(userAnswer) ? userAnswer : [];
        return (
          <div
            key={questionId}
            className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-4 hover:shadow-md transition"
          >
            <div className="flex items-start gap-3 mb-4">
              <span className="text-lg font-bold text-blue-600 bg-blue-100 w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0">
                {question.questionNumber}
              </span>
              <p className="text-gray-800 font-medium flex-1">
                {question.questionText}{" "}
                <span className="text-sm text-blue-500">
                  (Select all that apply)
                </span>
              </p>
            </div>

            <div className="space-y-2 ml-11">
              {question.options.map((option, index) => {
                const isSelected = userAnswersMulti.includes(option);
                return (
                  <label
                    key={index}
                    className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition ${
                      isSelected
                        ? "bg-blue-100 border-2 border-blue-500"
                        : "bg-gray-50 border-2 border-transparent hover:bg-gray-100"
                    }`}
                  >
                    <input
                      type="checkbox"
                      name={questionId}
                      value={option}
                      checked={isSelected}
                      onChange={(e) =>
                        handleMultiAnswerChange(
                          questionId,
                          option,
                          e.target.checked,
                        )
                      }
                      className="w-5 h-5 text-blue-600 rounded"
                    />
                    <span className="font-semibold text-gray-700 w-8">
                      {String.fromCharCode(65 + index)}.
                    </span>
                    <span className="text-gray-800">{option}</span>
                  </label>
                );
              })}
            </div>
          </div>
        );
      }

      case "short-answer":
      case "sentence-completion":
      case "summary-completion":
      case "note-completion":
      case "form-completion": // ✅ Added form-completion
        return (
          <div
            key={questionId}
            className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-4 hover:shadow-md transition"
          >
            <div className="flex items-start gap-3 mb-3">
              <span className="text-lg font-bold text-blue-600 bg-blue-100 w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0">
                {question.questionNumber}
              </span>
              <div className="flex-1">
                <p className="text-gray-800 font-medium mb-2">
                  {question.questionText}
                </p>
                {question.wordLimit && (
                  <p className="text-xs text-gray-500 font-semibold mb-2">
                    Word Limit: {question.wordLimit} words{" "}
                    {question.allowNumber
                      ? "(Numbers allowed)"
                      : "(No numbers)"}
                  </p>
                )}
              </div>
            </div>

            <input
              type="text"
              value={userAnswer}
              onChange={(e) => {
                const val = e.target.value;

                // Validate Number Constraint
                if (question.allowNumber === false && /\d/.test(val)) {
                  // If number not allowed, don't update (or could show toast)
                  return;
                }

                // Validate Word Limit
                if (question.wordLimit) {
                  const words = val
                    .trim()
                    .split(/\s+/)
                    .filter((w) => w.length > 0);
                  // Allow typing if under limit, or if just added a space (to start next word)
                  // But if valid word count > limit, block.
                  // A simple check: if current words > limit and user is typing meaningful char (not deleting), block.
                  // Actually, safer is: if val has more words than limit, don't update.
                  // Exception: if user is deleting, always allow.
                  // But identifying delete is hard here.
                  // Let's just check word count of NEW value.
                  if (words.length > question.wordLimit) {
                    // check if we are just adding spaces at the end?
                    // If existing is "A B" (2 words, limit 2) and user types " " -> "A B " (still 2 words).
                    // "A B C" -> 3 words -> block.
                    // But val.trim() handles the trailing space.
                    // So "A B " is 2 words. "A B c" is 3 words.
                    return;
                  }
                }

                handleAnswerChange(questionId, val);
              }}
              placeholder="Type your answer here..."
              className="w-full p-3 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none ml-11"
            />
          </div>
        );

      case "true-false-not-given":
      case "yes-no-not-given": {
        const tfOptions =
          question.questionType === "true-false-not-given"
            ? ["True", "False", "Not Given"]
            : ["Yes", "No", "Not Given"];

        return (
          <div
            key={questionId}
            className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-4 hover:shadow-md transition"
          >
            <div className="flex items-start gap-3 mb-4">
              <span className="text-lg font-bold text-blue-600 bg-blue-100 w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0">
                {question.questionNumber}
              </span>
              <p className="text-gray-800 font-medium flex-1">
                {question.questionText}
              </p>
            </div>

            <div className="flex gap-3 ml-11">
              {tfOptions.map((option) => (
                <button
                  key={option}
                  onClick={() => handleAnswerChange(questionId, option)}
                  className={`px-6 py-2 rounded-full font-semibold transition ${
                    userAnswer === option
                      ? "bg-blue-600 text-white"
                      : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                  }`}
                >
                  {option}
                </button>
              ))}
            </div>
          </div>
        );
      }

      case "map-labeling":
        return (
          <div
            key={questionId}
            className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-4 hover:shadow-md transition"
          >
            <div className="flex items-start gap-3 mb-4">
              <span className="text-lg font-bold text-blue-600 bg-blue-100 w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0">
                {question.questionNumber}
              </span>
              <div className="flex-1">
                <p className="text-gray-800 font-medium mb-3">
                  {question.questionText}
                </p>
                {question.imageUrl && (
                  <div className="mb-4 bg-gray-100 rounded-lg p-2 border border-gray-200">
                    <img
                      src={question.imageUrl}
                      alt="Map/Diagram"
                      className="max-h-96 mx-auto rounded-lg"
                    />
                  </div>
                )}
                <div className="space-y-4">
                  {question.items &&
                    question.items.map((item, idx) => (
                      <div
                        key={idx}
                        className="flex flex-col sm:flex-row sm:items-center gap-3 bg-blue-50 p-3 rounded-lg border border-blue-100"
                      >
                        <span className="font-bold text-blue-800 w-8 h-8 bg-white rounded-full flex items-center justify-center border border-blue-200 shadow-sm shrink-0">
                          {item.label}
                        </span>
                        <p className="flex-1 text-gray-700 font-medium">
                          {item.text}
                        </p>
                        <select
                          value={userAnswer[item.label] || ""} // Store as object { "A": "Option X" } logic needs update or simplified string map?
                          // Let's assume for map labeling we simplify to just selecting from dropdown for that specific item line
                          // Actually, if it's one question doc with many items, we need to handle sub-answers.
                          // For simplicity in this iteration, let's treat the Main Answer as an object/JSON string?
                          // Or better: Each item is a "question" in UI?
                          // Backend schema suggests `items` inside one Question doc.
                          // So `answers[questionId]` should be an object: { "A": "i", "B": "ii" }
                          onChange={(e) => {
                            const newAns =
                              typeof userAnswer === "object"
                                ? { ...userAnswer }
                                : {};
                            newAns[item.label] = e.target.value;
                            handleAnswerChange(questionId, newAns);
                          }}
                          className="w-full sm:w-48 p-2 border border-gray-300 rounded-lg focus:border-blue-500 outline-none"
                        >
                          <option value="">Select Label...</option>
                          {question.options.map((opt, oIdx) => (
                            <option key={oIdx} value={opt}>
                              {opt}
                            </option>
                          ))}
                        </select>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          </div>
        );

      default:
        return (
          <div
            key={questionId}
            className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-4"
          >
            <div className="flex items-start gap-3 mb-3">
              <span className="text-lg font-bold text-blue-600 bg-blue-100 w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0">
                {question.questionNumber}
              </span>
              <p className="text-gray-800 font-medium flex-1">
                {question.questionText}
              </p>
            </div>

            <input
              type="text"
              value={userAnswer}
              onChange={(e) => handleAnswerChange(questionId, e.target.value)}
              placeholder="Type your answer..."
              className="w-full p-3 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none ml-11"
            />
          </div>
        );
    }
  };

  if (loading) {
    return (
      <DashboardLayout title="Loading Test...">
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Listening Test">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg shadow-lg p-6 mb-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className="text-4xl">🎧</span>
              <h1 className="text-3xl font-bold">{test?.title}</h1>
            </div>
            <p className="text-blue-100">
              Section {currentSectionIndex + 1} of {sections.length} •{" "}
              {currentQuestions.length} Questions
            </p>
          </div>

          <div className="text-right">
            <p className="text-sm text-blue-100 mb-1">Time Remaining</p>
            <p
              className={`text-4xl font-bold ${getTimerColor()} bg-white px-4 py-2 rounded-lg`}
            >
              {formatTime(timeRemaining)}
            </p>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mt-4">
          <div className="flex justify-between text-sm mb-1">
            <span>Progress: {Math.round(progress)}%</span>
            <span>
              {Object.keys(answers).length} / {questions.length} answered
            </span>
          </div>
          <div className="h-2 bg-blue-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-yellow-400 transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>

      {/* Audio Player */}
      {currentSection?.audioUrl && (
        <div className="mb-6">
          <AudioPlayer
            key={currentSection._id}
            audioUrl={currentSection.audioUrl}
            title={currentSection.title}
            playOnce={!!currentSection.playOnceOnly}
            disableSeeking={!!currentSection.disableReplay}
            initialPlayed={session?.audioPlayedSections?.includes(
              currentSection._id,
            )}
            onEnded={handleAudioEnded}
          />
        </div>
      )}

      {/* Instructions */}
      {currentSection?.instructions && (
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6">
          <p className="text-yellow-800 font-medium">
            <span className="font-bold">Instructions:</span>{" "}
            {currentSection.instructions}
          </p>
        </div>
      )}

      {/* Questions */}
      <div className="mb-6">
        <h3 className="text-xl font-bold text-gray-800 mb-4">
          Questions {currentSection?.questionRange || ""}
        </h3>
        {currentQuestions.map((question) => renderQuestion(question))}
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between gap-4 sticky bottom-0 bg-white p-4 border-t-2 border-gray-200 shadow-lg">
        <button
          onClick={handlePreviousSection}
          disabled={currentSectionIndex === 0}
          className="px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
        >
          ← Previous Section
        </button>

        <div className="text-center">
          <p className="text-sm text-gray-600">
            Section {currentSectionIndex + 1} of {sections.length}
          </p>
        </div>

        {currentSectionIndex < sections.length - 1 ? (
          <button
            onClick={handleNextSection}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold"
          >
            Next Section →
          </button>
        ) : (
          <button
            onClick={handleSubmitTest}
            disabled={submitting}
            className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? "Submitting..." : "✓ Submit Test"}
          </button>
        )}
      </div>
    </DashboardLayout>
  );
};

export default ListeningTestTaking;
