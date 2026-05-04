import React, { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import DashboardLayout from "../components/Layout/DashboardLayout";
import AudioPlayer from "../components/AudioPlayer";
import { toast } from "react-toastify";
import axios from "axios";
import { resolveImageUrl } from "../utils/urlHelper";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

const ListeningTestTaking = () => {
  const { testId } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const mockExamId = searchParams.get("mockExamId");
  const mockResultId = searchParams.get("mockResultId");
  const readingTestId = searchParams.get("readingTestId");
  const writingTestId = searchParams.get("writingTestId");

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

  // Fullscreen State
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Exit confirmation modal state
  const [showExitModal, setShowExitModal] = useState(false);

  // Get current section
  const currentSection = useMemo(
    () => sections[currentSectionIndex] || null,
    [sections, currentSectionIndex],
  );

  // Get global audio section (typically section 1 holds the full audio)
  const globalAudioSection = useMemo(
    () => sections.find((s) => s.audioUrl) || null,
    [sections]
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

  // Anti-Cheat Refs
  const sessionRef = useRef(session);
  const isSubmittingRef = useRef(submitting);
  const autoAdvancedSections = useRef(new Set());

  useEffect(() => {
    sessionRef.current = session;
    isSubmittingRef.current = submitting;
  }, [session, submitting]);

  // ✅ NEW: Auto-advance to next section when all questions are answered
  useEffect(() => {
    const answeredCount = currentQuestions.filter((q) => answers[q._id]).length;
    
    if (currentQuestions.length > 0 && answeredCount === currentQuestions.length) {
      if (!autoAdvancedSections.current.has(currentSectionIndex)) {
        autoAdvancedSections.current.add(currentSectionIndex);
        
        const timer = setTimeout(() => {
          if (currentSectionIndex < sections.length - 1) {
             toast.success("Section complete! Moving to next section.", { autoClose: 2000, toastId: "auto-advance-list" });
             setCurrentSectionIndex(prev => prev + 1);
             window.scrollTo(0, 0);
          }
        }, 1200);
        return () => clearTimeout(timer);
      }
    }
  }, [answers, currentQuestions, currentSectionIndex, sections.length]);

  // ✅ Block browser close / refresh
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (sessionRef.current && !isSubmittingRef.current && sessionRef.current.status === "in-progress") {
        e.preventDefault();
        e.returnValue = "";
        return "";
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, []);

  // ✅ Block tab switching — show a toast warning
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (
        document.hidden &&
        sessionRef.current &&
        !isSubmittingRef.current &&
        sessionRef.current.status === "in-progress"
      ) {
        toast.warn(
          "⚠️ You left the test tab! Please return to continue your test.",
          { autoClose: 4000, toastId: "tab-warning" }
        );
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, []);

  // ✅ Intercept browser back button
  useEffect(() => {
    const handlePopState = (e) => {
      if (sessionRef.current && !isSubmittingRef.current && sessionRef.current.status === "in-progress") {
        window.history.pushState(null, "", window.location.href);
        setShowExitModal(true);
      }
    };
    window.history.pushState(null, "", window.location.href);
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  // ✅ Set global test guard
  useEffect(() => {
    if (session && session.status === "in-progress" && !submitting) {
      window.__testGuard = {
        active: true,
        onExitRequest: () => {
          setShowExitModal(true);
        },
      };
    } else {
      window.__testGuard = null;
    }
    return () => {
      window.__testGuard = null;
    };
  }, [session, submitting]);

  const handleConfirmExit = async () => {
    setShowExitModal(false);
    window.__testGuard = null;
    await handleSubmitTest();
  };

  const handleCancelExit = () => {
    setShowExitModal(false);
  };

  // --- Fullscreen Toggle logic ---
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch((err) => {
        toast.error(`Error attempting to enable fullscreen: ${err.message}`);
      });
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
  };

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

    setSubmitting(true);

    try {
      const token = localStorage.getItem("token");

      // Final save
      try {
        await saveAnswersToBackend();
      } catch (e) {
        // Ignore auto-save errors during final submit
      }

      // Submit session
      try {
        await axios.post(
          `${API_URL}/sessions/submit`,
          { sessionId: session._id },
          { headers: { Authorization: `Bearer ${token}` } },
        );
      } catch (e) {
        // If it's already submitted (e.g. from auto-save expiry), ignore and proceed to calculate
        if (e.response && e.response.status === 400 && e.response.data.error === "Test already submitted") {
          console.log("Test was already submitted. Proceeding to calculate...");
        } else {
          throw e;
        }
      }

      // Calculate result
      const resultResponse = await axios.post(
        `${API_URL}/results/submit`,
        { sessionId: session._id },
        { headers: { Authorization: `Bearer ${token}` } },
      );

      toast.success("✅ Test submitted successfully!");

      if (document.fullscreenElement && document.exitFullscreen) {
        document.exitFullscreen().catch((err) => console.error(err));
      }

      // --- MOCK EXAM PROGRESSION ---
      if (mockExamId && mockResultId && readingTestId) {
        // Update mock result with listening band
        try {
          const token = localStorage.getItem("token");
          await axios.put(
            `${API_URL}/mock-results/update-module`,
            {
              mockExamId,
              module: "listening",
              resultId: resultResponse.data.result._id,
              bandScore: resultResponse.data.result.bandScore,
            },
            { headers: { Authorization: `Bearer ${token}` } }
          );
        } catch (e) {
          console.error("Failed to update mock result:", e);
        }

        toast.info("🎧 Listening complete! Moving to Reading...", { autoClose: 3000 });
        setTimeout(() => {
          navigate(`/test-taking/${readingTestId}?mockExamId=${mockExamId}&mockResultId=${mockResultId}&writingTestId=${writingTestId}`);
        }, 2000);
        return;
      }

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
    return "timer-warning"; // < 5 mins - flashing red
  };

  const handleAudioEnded = async () => {
    if (!globalAudioSection || !session) return;
    try {
      const token = localStorage.getItem("token");
      await axios.post(
        `${API_URL}/sessions/mark-audio-played`,
        { sessionId: session._id, sectionId: globalAudioSection._id },
        { headers: { Authorization: `Bearer ${token}` } },
      );
      // Update local session state to reflect change immediately
      setSession((prev) => ({
        ...prev,
        audioPlayedSections: [
          ...(prev.audioPlayedSections || []),
          globalAudioSection._id,
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
            className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 mb-6 hover:shadow-md transition-all duration-300 relative overflow-hidden"
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
        return (
          <div
            key={questionId}
            className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 mb-6 hover:shadow-md transition-all duration-300 relative overflow-hidden"
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
                if (question.allowNumber === false && /\d/.test(val)) return;
                if (question.wordLimit) {
                  const words = val
                    .trim()
                    .split(/\s+/)
                    .filter((w) => w.length > 0);
                  if (words.length > question.wordLimit) return;
                }
                handleAnswerChange(questionId, val);
              }}
              placeholder="Type your answer here..."
              className="w-full p-3 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none ml-11"
            />
          </div>
        );

      case "sentence-completion":
      case "summary-completion":
      case "note-completion": {
        // Build inline input handler
        const completionHandler = (val) => {
          if (question.allowNumber === false && /\d/.test(val)) return;
          if (question.wordLimit) {
            const words = val
              .trim()
              .split(/\s+/)
              .filter((w) => w.length > 0);
            if (words.length > question.wordLimit) return;
          }
          handleAnswerChange(questionId, val);
        };

        const hasBlank = question.questionText.includes("__________");
        const inputClasses = `inline-block w-36 sm:w-44 mx-1 px-3 py-1 border-b-2 rounded-md text-sm focus:outline-none transition-all duration-200 align-baseline ${
          userAnswer
            ? "border-green-500 bg-green-50 text-green-800"
            : "border-blue-400 bg-blue-50/50 text-gray-800 focus:border-blue-600"
        }`;

        return (
          <div
            key={questionId}
            className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 mb-6 hover:shadow-md transition-all duration-300 relative overflow-hidden"
          >
            <div className="flex items-start gap-3">
              <span className="text-lg font-bold text-blue-600 bg-blue-100 w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0">
                {question.questionNumber}
              </span>
              <div className="flex-1">
                {hasBlank ? (
                  <p className="text-gray-800 font-medium mb-2 leading-relaxed">
                    {(() => {
                      const parts = question.questionText.split(/________+/);
                      return parts.map((part, idx) => (
                        <span key={idx}>
                          {part}
                          {idx < parts.length - 1 && (
                            <input
                              type="text"
                              value={userAnswer}
                              onChange={(e) =>
                                completionHandler(e.target.value)
                              }
                              placeholder="..."
                              className={inputClasses}
                            />
                          )}
                        </span>
                      ));
                    })()}
                  </p>
                ) : (
                  <p className="text-gray-800 font-medium mb-2 leading-relaxed">
                    {question.questionText}{" "}
                    <input
                      type="text"
                      value={userAnswer}
                      onChange={(e) => completionHandler(e.target.value)}
                      placeholder="..."
                      className={inputClasses}
                    />
                  </p>
                )}
                {question.wordLimit && (
                  <p className="text-xs text-gray-500 font-semibold">
                    Word Limit: {question.wordLimit} words{" "}
                    {question.allowNumber
                      ? "(Numbers allowed)"
                      : "(No numbers)"}
                  </p>
                )}
              </div>
            </div>
          </div>
        );
      }

      case "true-false-not-given":
      case "yes-no-not-given": {
        const tfOptions =
          question.questionType === "yes-no-not-given"
            ? ["Yes", "No", "Not Given"]
            : ["True", "False", "Not Given"];

        return (
          <div
            key={questionId}
            className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 mb-6 hover:shadow-md transition-all duration-300 relative overflow-hidden"
          >
            <div className="flex items-start gap-3 mb-4">
              {/* TEMPORARY DEBUG */}
              <div className="absolute top-0 right-0 text-xs text-red-500 p-1">
                {question.questionType}
              </div>
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

      case "form-completion": {
        const formImage = question.imageUrl;
        return (
          <div
            key={questionId}
            className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 mb-6 hover:shadow-md transition-all duration-300 relative overflow-hidden"
          >
            {/* Header / Instructions */}
            <div className="flex items-start gap-4 mb-8">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <span className="px-3 py-1 bg-blue-100 text-blue-700 text-xs font-bold rounded-full uppercase tracking-wider">
                    Form Completion
                  </span>
                  {question.wordLimit && (
                    <span className="text-xs font-bold text-orange-600 bg-orange-50 px-2 py-1 rounded-md border border-orange-100">
                      Limit: {question.wordLimit} words
                    </span>
                  )}
                </div>
                <p className="text-gray-800 font-bold text-lg leading-tight">
                  {question.questionText}
                </p>
              </div>
            </div>

            {formImage && (
              <div className="mb-8 p-4 bg-gray-50 rounded-xl border border-gray-100 shadow-inner flex justify-center">
                <img
                  src={resolveImageUrl(formImage)}
                  alt="Form Diagram"
                  className="max-w-full h-auto max-h-96 rounded shadow-sm"
                />
              </div>
            )}

            <div className="border border-blue-100 rounded-2xl bg-white max-w-4xl mx-auto overflow-hidden shadow-sm">
              <table className="w-full border-collapse">
                <tbody>
                  {(question.items || []).map((item, index) => {
                    const hasBlank = item.text && item.text.includes("__________");
                    const isSubheading = !item.text && item.label;

                    return (
                      <tr key={index} className="border-b border-gray-100 last:border-0 hover:bg-blue-50/30 transition-colors">
                        {isSubheading ? (
                          <td colSpan={2} className="bg-blue-50/50 px-6 py-4 text-center border-b border-blue-100">
                            <span className="font-black text-blue-900 uppercase tracking-[0.2em] text-sm">
                              {item.label}
                            </span>
                          </td>
                        ) : (
                          <>
                            <td className="px-6 py-4 text-gray-600 font-bold border-r border-gray-100 w-1/3 align-top text-sm">
                              {item.label}
                            </td>
                            <td className="px-6 py-4 text-gray-800 font-medium align-top leading-relaxed">
                              {hasBlank ? (
                                item.text.split(/________+/).map((part, pIdx, parts) => {
                                  const itemSubKey = String(index + 1);
                                  const currentVal = userAnswer && typeof userAnswer === 'object' ? userAnswer[itemSubKey] : "";

                                  return (
                                    <span key={pIdx}>
                                      {part}
                                      {pIdx < parts.length - 1 && (
                                        <span className="whitespace-nowrap inline-flex items-center gap-1 mx-2">
                                          <strong className="bg-blue-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-[10px] shadow-sm font-black shrink-0">
                                            {itemSubKey}
                                          </strong>
                                          <input
                                            type="text"
                                            value={currentVal || ""}
                                            onChange={(e) => handleAnswerChange(questionId, { ...userAnswer, [itemSubKey]: e.target.value })}
                                            className="w-32 sm:w-48 px-2 py-1 border-b-2 border-blue-200 focus:border-blue-600 focus:outline-none bg-transparent transition-all text-blue-900 font-bold placeholder:text-blue-200"
                                            placeholder="..."
                                          />
                                        </span>
                                      )}
                                    </span>
                                  );
                                })
                              ) : (
                                item.text
                              )}
                            </td>
                          </>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        );
      }

      case "table-completion":
        return (
          <div
            key={questionId}
            className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 mb-6 hover:shadow-md transition-all duration-300 relative overflow-hidden"
          >
            {/* Header / Instructions */}
            <div className="flex items-start gap-4 mb-8">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <span className="px-3 py-1 bg-blue-100 text-blue-700 text-xs font-bold rounded-full uppercase tracking-wider">
                    Table Completion
                  </span>
                  {question.wordLimit && (
                    <span className="text-xs font-bold text-orange-600 bg-orange-50 px-2 py-1 rounded-md border border-orange-100">
                      Limit: {question.wordLimit} words
                    </span>
                  )}
                </div>
                <p className="text-gray-800 font-bold text-lg leading-tight">
                  {question.questionText}
                </p>
              </div>
            </div>

            {question.tableStructure && (
              <div className="overflow-x-auto rounded-2xl border border-blue-100 shadow-sm">
                <table className="min-w-full border-collapse bg-white text-sm">
                  <thead className="bg-blue-600">
                    <tr>
                      {question.tableStructure.headers.map((header, idx) => (
                        <th
                          key={idx}
                          className="px-6 py-4 text-left font-black text-white uppercase tracking-widest text-xs"
                        >
                          {header}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {question.tableStructure.rows.map((row, rIdx) => (
                      <tr
                        key={rIdx}
                        className={`transition-colors border-b border-gray-100 last:border-0 ${
                          rIdx % 2 === 0 ? "bg-white" : "bg-blue-50/20"
                        } hover:bg-blue-50/50`}
                      >
                        {row.map((cell, cIdx) => (
                          <td
                            key={cIdx}
                            className="px-6 py-4 text-gray-700 border-r border-gray-100 last:border-0"
                          >
                            {cell.split(/(\{\{\d+\}\})/g).map((part, pIdx) => {
                              const match = part.match(/\{\{(\d+)\}\}/);
                              if (match) {
                                const answerIndex = match[1];
                                const currentVal = userAnswer?.[answerIndex] || "";

                                return (
                                  <span
                                    key={pIdx}
                                    className="inline-flex items-center gap-2"
                                  >
                                    <span className="bg-blue-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-[10px] shadow-sm font-black shrink-0">
                                      {answerIndex}
                                    </span>
                                    <input
                                      type="text"
                                      className={`w-32 sm:w-44 px-3 py-1.5 border-b-2 rounded-md transition-all duration-200 focus:outline-none font-bold ${
                                        currentVal
                                          ? "bg-blue-100 border-blue-500 text-blue-900"
                                          : "bg-blue-50/50 border-blue-200 text-gray-800 focus:border-blue-600"
                                      }`}
                                      value={currentVal}
                                      onChange={(e) => {
                                        const currentAnswers =
                                          typeof userAnswer === "object"
                                            ? userAnswer
                                            : {};
                                        handleAnswerChange(questionId, {
                                          ...currentAnswers,
                                          [answerIndex]: e.target.value,
                                        });
                                      }}
                                      placeholder="..."
                                    />
                                  </span>
                                );
                              }
                              return <span key={pIdx} className="font-medium">{part}</span>;
                            })}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        );

      case "matching-headings":
      case "matching-information":
      case "matching-features":
        return (
          <div
            key={questionId}
            className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 mb-6 hover:shadow-md transition-all duration-300 relative overflow-hidden"
          >
            <div className="flex items-start gap-4 mb-8">
              <span className="text-lg font-bold text-blue-600 bg-blue-100 w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 shadow-sm">
                {question.questionNumber}
              </span>
              <p className="text-gray-800 font-bold text-lg leading-tight flex-1">
                {question.questionText}
              </p>
            </div>

            <div className="space-y-6">
              {/* Reference List (Features/Options) */}
              <div className="bg-blue-50/50 p-6 rounded-2xl border border-blue-100 shadow-inner">
                <h5 className="font-black text-blue-800 mb-4 uppercase tracking-widest text-xs">
                  {question.questionType === "matching-features"
                    ? "List of Features"
                    : "Available Options"}
                </h5>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {question.features && question.features.length > 0
                    ? question.features.map((feat, idx) => (
                        <div key={idx} className="flex items-center gap-3 bg-white p-2.5 rounded-xl border border-blue-100 shadow-sm">
                          <span className="bg-blue-600 text-white rounded-lg px-2 py-1 text-[10px] font-black min-w-[24px] text-center">
                            {feat.label}
                          </span>
                          <span className="text-sm text-gray-700 font-medium">{feat.text}</span>
                        </div>
                      ))
                    : question.options.map((opt, idx) => (
                        <div key={idx} className="flex items-center gap-3 bg-white p-2.5 rounded-xl border border-blue-100 shadow-sm">
                          <span className="bg-blue-600 text-white rounded-lg px-2 py-1 text-[10px] font-black min-w-[24px] text-center">
                            {question.questionType === "matching-headings"
                              ? ["i", "ii", "iii", "iv", "v", "vi", "vii", "viii", "ix", "x"][idx] || idx + 1
                              : String.fromCharCode(65 + idx)}
                          </span>
                          <span className="text-sm text-gray-700 font-medium">{opt}</span>
                        </div>
                      ))}
                </div>
              </div>

              {/* Questions/Items */}
              <div className="space-y-3">
                {(question.items || []).map((item, idx) => (
                  <div
                    key={idx}
                    className="flex flex-col sm:flex-row sm:items-center gap-4 bg-white p-4 rounded-xl border border-gray-100 shadow-sm hover:border-blue-200 transition-all"
                  >
                    <span className="bg-blue-600 text-white rounded-full w-7 h-7 flex items-center justify-center text-[10px] shadow-md font-black shrink-0">
                      {item.label || idx + 1}
                    </span>
                    <p className="flex-1 text-gray-700 font-bold text-sm">
                      {item.text}
                    </p>
                    <select
                      value={
                        (userAnswer &&
                          typeof userAnswer === "object" &&
                          userAnswer[item.label || idx + 1]) ||
                        ""
                      }
                      onChange={(e) => {
                        const currentAnswers =
                          typeof userAnswer === "object" ? userAnswer : {};
                        handleAnswerChange(questionId, {
                          ...currentAnswers,
                          [item.label || idx + 1]: e.target.value,
                        });
                      }}
                      className="w-full sm:w-44 p-2.5 bg-blue-50/50 border-2 border-blue-100 rounded-xl focus:border-blue-500 focus:bg-white outline-none font-bold text-blue-900 text-sm transition-all cursor-pointer"
                    >
                      <option value="">Select...</option>
                      {question.features && question.features.length > 0
                        ? question.features.map((feat, fIdx) => (
                            <option key={fIdx} value={feat.label}>
                              {feat.label} - {feat.text.substring(0, 30)}...
                            </option>
                          ))
                        : question.options.map((opt, optIdx) => (
                            <option
                              key={optIdx}
                              value={
                                question.questionType === "matching-headings"
                                  ? ["i", "ii", "iii", "iv", "v", "vi", "vii", "viii", "ix", "x"][optIdx] || optIdx + 1
                                  : String.fromCharCode(65 + optIdx)
                              }
                            >
                              {question.questionType === "matching-headings"
                                ? ["i", "ii", "iii", "iv", "v", "vi", "vii", "viii", "ix", "x"][optIdx] || optIdx + 1
                                : String.fromCharCode(65 + optIdx)} - {opt.substring(0, 30)}...
                            </option>
                          ))}
                    </select>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );

      case "map-labeling":
        return (
          <div
            key={questionId}
            className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 mb-6 hover:shadow-md transition-all duration-300 relative overflow-hidden"
          >
            <div className="flex items-start gap-4 mb-8">
              <span className="text-lg font-bold text-blue-600 bg-blue-100 w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 shadow-sm">
                {question.questionNumber}
              </span>
              <div className="flex-1">
                <p className="text-gray-800 font-bold text-lg leading-tight mb-2">
                  {question.questionText}
                </p>
                <span className="px-3 py-1 bg-blue-100 text-blue-700 text-xs font-bold rounded-full uppercase tracking-wider">
                  Map / Diagram Labeling
                </span>
              </div>
            </div>

            <div className="space-y-8">
              {question.imageUrl && (
                <div className="bg-gray-50 rounded-2xl p-6 border border-gray-100 shadow-inner flex justify-center">
                  <img
                    src={resolveImageUrl(question.imageUrl)}
                    alt="Map/Diagram"
                    className="max-h-[500px] w-auto rounded-xl shadow-lg border border-white"
                  />
                </div>
              )}
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {question.items &&
                  question.items.map((item, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-4 bg-white p-4 rounded-xl border border-gray-100 shadow-sm hover:border-blue-200 transition-all"
                    >
                      <span className="bg-blue-600 text-white rounded-full w-8 h-8 flex items-center justify-center text-xs shadow-md font-black shrink-0">
                        {item.label}
                      </span>
                      <p className="flex-1 text-gray-700 font-bold text-sm">
                        {item.text}
                      </p>
                      <select
                        value={userAnswer[item.label] || ""}
                        onChange={(e) => {
                          const newAns =
                            typeof userAnswer === "object"
                              ? { ...userAnswer }
                              : {};
                          newAns[item.label] = e.target.value;
                          handleAnswerChange(questionId, newAns);
                        }}
                        className="w-32 p-2.5 bg-blue-50/50 border-2 border-blue-100 rounded-xl focus:border-blue-500 focus:bg-white outline-none font-bold text-blue-900 text-xs transition-all cursor-pointer"
                      >
                        <option value="">Select...</option>
                        {question.options && question.options.map((opt, optIdx) => (
                          <option key={optIdx} value={opt}>
                            {opt}
                          </option>
                        ))}
                      </select>
                    </div>
                  ))}
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
    <DashboardLayout title="Listening Test" hideHeader={true} collapseSidebar={true}>
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

          <div className="text-right flex items-center gap-4">
            <button
              onClick={toggleFullscreen}
              className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg text-white font-medium transition-all border border-white/20 flex flex-col items-center justify-center shrink-0"
              title={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
            >
              <span className="text-xl mb-1 leading-none">{isFullscreen ? "🗗" : "⛶"}</span>
              <span className="text-[10px] uppercase tracking-wider">{isFullscreen ? "Exit Fullscreen" : "Fullscreen"}</span>
            </button>
            <div>
              <p className="text-sm text-blue-100 mb-1">Time Remaining</p>
              <p
                className={`text-4xl font-bold ${getTimerColor()} bg-white px-4 py-2 rounded-lg`}
              >
                {formatTime(timeRemaining)}
              </p>
            </div>
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
      {globalAudioSection?.audioUrl && (
        <div className="mb-6">
          <AudioPlayer
            key={globalAudioSection.audioUrl}
            audioUrl={globalAudioSection.audioUrl}
            title={test?.title || "Listening Test Audio"}
            playOnce={!!globalAudioSection.playOnceOnly}
            disableSeeking={!!globalAudioSection.disableReplay}
            initialPlayed={session?.audioPlayedSections?.includes(
              globalAudioSection._id,
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
            onClick={() => setShowExitModal(true)}
            disabled={submitting}
            className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? "Submitting..." : "✓ Submit Test"}
          </button>
        )}
      </div>

      {/* ✅ Exit Confirmation Modal */}
      {showExitModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 overflow-hidden animate-in fade-in zoom-in duration-200">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-red-500 to-orange-500 px-6 py-5 text-white">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center text-2xl">
                  ⚠️
                </div>
                <div>
                  <h3 className="text-xl font-bold">Leave Test?</h3>
                  <p className="text-sm text-white/80 mt-0.5">Your test is still running</p>
                </div>
              </div>
            </div>

            {/* Modal Body */}
            <div className="px-6 py-5">
              <p className="text-gray-700 text-sm leading-relaxed mb-2">
                Are you sure you want to <strong>leave this test</strong>? If you exit:
              </p>
              <ul className="text-sm text-gray-600 space-y-1.5 mb-4 pl-4">
                <li className="flex items-start gap-2">
                  <span className="text-orange-500 mt-0.5">•</span>
                  Your current answers will be <strong>submitted immediately</strong>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-orange-500 mt-0.5">•</span>
                  Unanswered questions will count as <strong>zero marks</strong>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-orange-500 mt-0.5">•</span>
                  You <strong>cannot resume</strong> this test attempt
                </li>
              </ul>
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-sm text-amber-800 flex items-start gap-2">
                <span className="text-amber-500 shrink-0">💡</span>
                <span>If you want to finish later, simply leave this page — your progress is already auto-saved and you can resume, but the timer will keep running.</span>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 bg-gray-50 border-t flex flex-col sm:flex-row gap-3 justify-end">
              <button
                onClick={handleCancelExit}
                className="px-6 py-2.5 rounded-xl bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold transition-all text-sm"
              >
                ← Continue Test
              </button>
              <button
                onClick={handleConfirmExit}
                disabled={submitting}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 text-white font-semibold transition-all shadow-lg text-sm disabled:opacity-60 flex items-center gap-2 justify-center"
              >
                {submitting ? (
                  <><span className="animate-spin">⏳</span> Submitting...</>
                ) : (
                  <>🚪 End & Submit Test</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
};

export default ListeningTestTaking;
