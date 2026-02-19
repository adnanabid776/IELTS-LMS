import React, { useEffect, useRef, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import {
  getQuestionsBySectionId,
  getTestById,
  startTestSession,
  getSession,
  bulkSaveAnswers,
  submitTestSession,
  submitTestResult,
  updateSubmissionStatus,
  pauseTestSession,
} from "../services/api";
import { toast } from "react-toastify";
import DashboardLayout from "../components/Layout/DashboardLayout";
import WritingTestTaking from "./WritingTestTaking";
import OfflineQueue from "../utils/OfflineQueue";

const TestTaking = () => {
  const { testId } = useParams();
  const navigate = useNavigate();

  const [test, setTest] = useState(null);
  const [sections, setSections] = useState([]);
  const [currentSectionIndex, setCurrentSectionIndex] = useState(0);
  const [currentSection, setCurrentSection] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [loading, setLoading] = useState(true);
  const [timeRemaining, setTimeRemaining] = useState(3600);
  const [session, setSession] = useState(null);
  const autoSaveInterval = useRef(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchParams] = useSearchParams();
  const assignmentId = searchParams.get("assignmentId");
  const [moduleCheck, setModuleCheck] = useState({
    loading: true,
    module: null,
  });

  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    const checkModule = async () => {
      try {
        const response = await getTestById(testId);
        setModuleCheck({ loading: false, module: response.test.module });
      } catch (error) {
        console.error("Error loading test:", error);
        setModuleCheck({ loading: false, module: null });
      }
    };
    checkModule();
  }, [testId]);

  //load test data - wait for module check first
  useEffect(() => {
    if (
      !moduleCheck.loading &&
      moduleCheck.module &&
      moduleCheck.module !== "writing" &&
      moduleCheck.module !== "speaking"
    ) {
      loadTestData();
    }
  }, [testId, moduleCheck.loading, moduleCheck.module]);
  //load current section questions
  useEffect(() => {
    if (sections.length > 0 && currentSectionIndex < sections.length) {
      const section = sections[currentSectionIndex];
      setCurrentSection(section); // ✅ Set the section object
      loadSectionQuestions(section._id); // ✅ Load questions
    }
  }, [currentSectionIndex, sections]);

  useEffect(() => {
    if (!session || loading) return;

    // Auto-save answers every 30 seconds
    autoSaveInterval.current = setInterval(() => {
      saveBulkAnswers();
    }, 30000);

    return () => {
      // Clear auto-save interval
      if (autoSaveInterval.current) {
        clearInterval(autoSaveInterval.current);
      }
    };
  }, [answers, session, loading]);

  // Handle Pause on Unmount / Navigation
  useEffect(() => {
    const handleUnmount = async () => {
      if (session && !isSubmitting && session.status !== "completed") {
        try {
          // Use sendBeacon for reliable unmount requests if supported, fallback to API
          const isPageHide = true; // Flag to indicate this is happening on hide/unload

          // We can't use async await reliably in unload, so we use sendBeacon or synchronous XHR if needed
          // But for React Router navigation (component unmount), standard async works fine.

          // NOTE: We rely on the timeRemaining state which is closure-captured.
          // To get fresh state we might need a ref, but here we can trust timeRemaining from render scope
          // strictly if this effect dependency includes timeRemaining or if we use a ref.

          // BETTER APPROACH: Use a Ref for timeRemaining to always get latest value in cleanup
        } catch (error) {
          console.error("Pause session error:", error);
        }
      }
    };

    return () => {
      // Logic moved to a separate ref-based cleanup to access latest state
    };
  }, []); // Only run once to setup? No, we need dependencies.

  // Ref to hold latest time for cleanup
  const timeRemainingRef = useRef(timeRemaining);
  const sessionRef = useRef(session);
  const isSubmittingRef = useRef(isSubmitting);

  useEffect(() => {
    timeRemainingRef.current = timeRemaining;
    sessionRef.current = session;
    isSubmittingRef.current = isSubmitting;
  }, [timeRemaining, session, isSubmitting]);

  // Actual Cleanup Effect
  useEffect(() => {
    return () => {
      const currentSession = sessionRef.current;
      const currentTime = timeRemainingRef.current;
      const submitting = isSubmittingRef.current;

      if (
        currentSession &&
        !submitting &&
        currentSession.status === "in-progress"
      ) {
        console.log("Pausing session...", currentTime);
        // Call pause API
        pauseTestSession(currentSession._id, currentTime).catch((err) =>
          console.error("Failed to pause session:", err),
        );
      }
    };
  }, []);

  //warning for Remaining 5 mins
  useEffect(() => {
    if (timeRemaining === 300) {
      toast.warn("You only have 5 Minutes!", { autoClose: 5000 });
    }
    if (timeRemaining === 60) {
      toast.warn("You have only 1 min", { autoClose: 5000 });
    }
  }, [timeRemaining]);

  // NEW: Offline Listeners
  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    const handleSyncStart = () => setIsSyncing(true);
    const handleSyncEnd = () => setIsSyncing(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    window.addEventListener("offline-sync-start", handleSyncStart);
    window.addEventListener("offline-sync-end", handleSyncEnd);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("offline-sync-start", handleSyncStart);
      window.removeEventListener("offline-sync-end", handleSyncEnd);
    };
  }, []);

  const loadTestData = async () => {
    try {
      setLoading(true);

      // Start or resume session
      try {
        const sessionResponse = await startTestSession(testId);
        setSession(sessionResponse.session);

        // Load test data
        const response = await getTestById(testId);
        setTest(response.test);
        setSections(response.sections || []);

        // If resuming, load saved answers
        if (sessionResponse.isResuming) {
          const sessionData = await getSession(sessionResponse.session._id);
          const savedAnswers = {};
          sessionData.session.answers.forEach((answer) => {
            savedAnswers[answer.questionId] = answer.userAnswer;
          });
          setAnswers(savedAnswers);
        }
      } catch (sessionError) {
        // CRITICAL FIX: If session start fails, try again
        if (sessionError.response?.status === 400) {
          console.log("Session start failed, retrying...");

          // Wait a moment
          await new Promise((resolve) => setTimeout(resolve, 1000));

          // Retry session start
          const sessionResponse = await startTestSession(testId);
          setSession(sessionResponse.session);

          // Load test data
          const response = await getTestById(testId);
          setTest(response.test);
          setSections(response.sections || []);
        } else {
          throw sessionError;
        }
      }
    } catch (error) {
      console.error("Load test error:", error);
      toast.error("Failed to load test!");
    } finally {
      setLoading(false);
    }
  };
  const loadSectionQuestions = async (sectionId) => {
    try {
      const response = await getQuestionsBySectionId(sectionId);

      setQuestions(response.questions || []);
    } catch (error) {
      console.error("Load Section Questions error:", error);
      toast.error("Failed to load questions");
    }
  };
  const saveBulkAnswers = async () => {
    if (!session || Object.keys(answers).length === 0) return;

    const answersArray = Object.entries(answers).map(
      ([questionId, userAnswer]) => ({
        questionId,
        userAnswer,
        timeSpent: 0,
      }),
    );

    // If offline, add to queue immediately
    if (!navigator.onLine) {
      OfflineQueue.add("SAVE_ANSW_BULK", {
        sessionId: session._id,
        answers: answersArray,
      });
      return;
    }

    try {
      await bulkSaveAnswers(session._id, answersArray);
    } catch (error) {
      // CRITICAL FIX: Don't queue client errors (like 400 Bad Request / Session Expired)
      const status = error.response?.status;
      if (status && status >= 400 && status < 500) {
        console.error("Auto-save failed with permanent error:", error);
        if (error.response?.data?.error === "Session expired") {
          toast.error("Session expired. Please submit or refresh.");
        }
        return; // Stop here, don't queue
      }

      console.error("Auto-save failed, queuing offline:", error);
      // Fallback to offline queue on API failure (network/server only)
      OfflineQueue.add("SAVE_ANSW_BULK", {
        sessionId: session._id,
        answers: answersArray,
      });
    }
  };

  // Modified handleSubmitTest with Offline Check
  const handleSubmitTest = async () => {
    // prevent multiple submissions
    if (isSubmitting || !session) return;

    // Check if offline or syncing
    if (!navigator.onLine || isSyncing) {
      toast.warn(
        "⚠️ You are offline or syncing. Please wait for connection to submit.",
      );
      // Try to trigger sync if possible (in case event missed)
      OfflineQueue.process();
      return;
    }

    // Check if queue has pending items
    if (OfflineQueue.getQueue().length > 0) {
      toast.info("⏳ Additionally syncing pending answers...");
      await OfflineQueue.process();
      // Re-check after sync attempt
      if (OfflineQueue.getQueue().length > 0) {
        toast.error("Unable to sync all answers. Please check connection.");
        return;
      }
    }

    const confirmed = window.confirm(
      "Are you sure to submit this test? You cannot change the answers after submission.",
    );

    if (!confirmed) return;

    setIsSubmitting(true);

    try {
      // Save any pending answers (this now uses the robust saveBulkAnswers which queues if needed)
      await saveBulkAnswers();

      // Force one last sync if anything got queued just now
      if (OfflineQueue.getQueue().length > 0) {
        await OfflineQueue.process();
      }

      if (OfflineQueue.getQueue().length > 0) {
        throw new Error("Cannot submit with unsaved offline changes.");
      }

      // Submit session
      await submitTestSession(session._id);

      // Calculate results
      const resultResponse = await submitTestResult(session._id);

      // Clear the queue for this session effectively (it should be empty anyway)
      OfflineQueue.clear();

      // ✅ NEW: If this was an assigned test, update submission status
      if (assignmentId) {
        await updateSubmissionStatus(
          assignmentId,
          session._id,
          resultResponse.result._id,
          "completed",
        );
      }

      toast.success("Test submitted successfully!");

      // Navigate to results (you'll create this page next)
      setTimeout(() => {
        navigate(`/results/${resultResponse.result._id}`);
      }, 1500);
    } catch (error) {
      console.error("Submit failed:", error);
      toast.error(error.message || "Failed to submit test");
      setIsSubmitting(false);
    }
  };

  // ... existing Timer logic
  useEffect(() => {
    if (loading || !session || isSubmitting) return;

    setTimeRemaining(session.timeRemaining || 3600);

    const timer = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          // Time's up! Auto-submit
          // NOTE: Only auto-submit if online?
          // If offline, we might want to just stop the test and save locally.
          // For now, let's try to submit, which will trigger the offline guard above.
          // Ideally: Force a local save and lock the UI.
          handleSubmitTest();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [session, loading, isSubmitting]);

  const handleAnswerChange = (questionId, answer) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: answer,
    }));
  };

  // ✅ NEW: Summary Validation Handler
  const handleSummaryAnswerChange = (questionId, newValue, config) => {
    if (!config) {
      handleAnswerChange(questionId, newValue);
      return;
    }

    const { wordLimitType, maxWords } = config;

    // 1. Number Only Check
    if (wordLimitType === "number-only") {
      if (newValue === "" || /^\d*$/.test(newValue)) {
        handleAnswerChange(questionId, newValue);
      }
      return;
    }

    // 2. Word Count Check
    let allowedWords = 100; // Default high
    if (wordLimitType === "one-word") allowedWords = 1;
    else if (wordLimitType === "two-words") allowedWords = 2;
    else if (wordLimitType === "three-words") allowedWords = 3;
    else if (wordLimitType === "no-more-than") allowedWords = maxWords || 1;
    else if (wordLimitType === "word-or-number") allowedWords = 1;

    // Count words (handling multiple spaces correctly)
    const wordCount =
      newValue.trim() === "" ? 0 : newValue.trim().split(/\s+/).length;
    // If we have 'word word' (2 words), and limit is 2.
    // 'word word' -> count 2. OK.
    // 'word word ' -> count 2. OK.
    // 'word word c' -> count 3. BLOCK.
    if (wordCount <= allowedWords) {
      handleAnswerChange(questionId, newValue);
    }
  };
  const handleNextSection = () => {
    if (currentSectionIndex < sections.length - 1) {
      setCurrentSectionIndex((prev) => prev + 1);
      document.getElementById("dashboard-main-content")?.scrollTo(0, 0);
    }
  };
  const handlePreviousSection = () => {
    if (currentSectionIndex > 0) {
      setCurrentSectionIndex((prev) => prev - 1);
      document.getElementById("dashboard-main-content")?.scrollTo(0, 0);
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  // Check module first - Writing tests use a different component
  if (moduleCheck.loading) {
    return (
      <DashboardLayout title="Loading Test...">
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </DashboardLayout>
    );
  }

  // Route to WritingTestTaking for Writing tests
  if (moduleCheck.module === "writing") {
    return <WritingTestTaking />;
  }

  // Route to SpeakingTestTaking for Speaking tests
  // Route to SpeakingTestTaking for Speaking tests
  if (moduleCheck.module === "speaking") {
    // return <SpeakingTestTaking />;
    return (
      <DashboardLayout title="Module Disabled">
        <div className="text-center py-20">
          <div className="text-6xl mb-4">🚫</div>
          <h2 className="text-3xl font-bold text-gray-800">
            Speaking Module Disabled
          </h2>
          <p className="text-gray-600 mt-2">
            This module is currently unavailable from the frontend interface.
          </p>
          <button
            onClick={() => navigate("/tests")}
            className="mt-6 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Back to Tests
          </button>
        </div>
      </DashboardLayout>
    );
  }

  // General loading state for non-writing tests
  if (loading) {
    return (
      <DashboardLayout title="Loading Test...">
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </DashboardLayout>
    );
  }

  if (!test || sections.length === 0) {
    return (
      <DashboardLayout title="Test Not Found">
        <div className="text-center py-12">
          <h3 className="text-2xl font-bold text-gray-800 mb-4">
            Test Not Available
          </h3>
          <button
            onClick={() => navigate("/tests")}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Back to Tests
          </button>
        </div>
      </DashboardLayout>
    );
  }

  const answeredInSection = questions.filter((q) => answers[q._id]).length;

  return (
    <DashboardLayout title={test.title} hideHeader={true}>
      {/* Test Header - Fixed Top with Enhanced Design */}
      <div
        className={`rounded-2xl shadow-lg p-5 mb-6 sticky top-[-10px] z-10 border transition-all duration-300 ${
          isOffline
            ? "bg-gradient-to-r from-gray-100 to-gray-200 border-gray-300"
            : timeRemaining < 300
              ? "bg-gradient-to-r from-red-50 to-orange-50 border-red-200"
              : "bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-100"
        }`}
      >
        <div className="flex items-center justify-between">
          {/* Test Info */}
          <div className="flex items-center gap-4">
            <div
              className={`w-14 h-14 rounded-xl flex items-center justify-center text-white font-bold text-lg shadow-lg ${
                isOffline
                  ? "bg-gray-500"
                  : test.module === "reading"
                    ? "bg-gradient-to-br from-blue-500 to-blue-700"
                    : test.module === "listening"
                      ? "bg-gradient-to-br from-green-500 to-green-700"
                      : test.module === "writing"
                        ? "bg-gradient-to-br from-purple-500 to-purple-700"
                        : "bg-gradient-to-br from-orange-500 to-orange-700"
              }`}
            >
              {isOffline
                ? "📡"
                : test.module === "reading"
                  ? "📖"
                  : test.module === "listening"
                    ? "🎧"
                    : test.module === "writing"
                      ? "✍️"
                      : "🎤"}
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-800">{test.title}</h2>
              <div className="flex items-center gap-2 mt-1">
                <span className="px-3 py-1 bg-white/70 rounded-full text-xs font-semibold text-gray-600 shadow-sm">
                  📑 Section {currentSectionIndex + 1} of {sections.length}
                </span>
                <span className="px-3 py-1 bg-white/70 rounded-full text-xs font-semibold text-gray-600 shadow-sm">
                  ✅ {answeredInSection}/{questions.length} answered
                </span>
                {/* Connection Status Badge */}
                {isOffline ? (
                  <span className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-xs font-bold border border-red-200 flex items-center gap-1 animate-pulse">
                    🚫 Offline - Saving Locally
                  </span>
                ) : isSyncing ? (
                  <span className="px-3 py-1 bg-yellow-100 text-yellow-700 rounded-full text-xs font-bold border border-yellow-200 flex items-center gap-1">
                    🔄 Syncing...
                  </span>
                ) : (
                  <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-bold border border-green-200 flex items-center gap-1">
                    ☁️ Saved Online
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Timer with Enhanced Design */}
          <div
            className={`text-center px-3 py-1 rounded-xl shadow-lg transition-all duration-300 ${
              isOffline
                ? "bg-gray-400"
                : timeRemaining < 300
                  ? "bg-gradient-to-br from-red-500 to-red-600 animate-pulse"
                  : timeRemaining < 600
                    ? "bg-gradient-to-br from-orange-500 to-orange-600"
                    : "bg-gradient-to-br from-blue-500 to-indigo-600"
            }`}
          >
            <p className="text-xs text-white/80 font-medium">⏱️ Time Left</p>
            <p className="text-3xl font-bold text-white tracking-wider">
              {formatTime(timeRemaining)}
            </p>
            {timeRemaining < 300 && !isOffline && (
              <p className="text-xs text-white font-semibold mt-1 animate-bounce">
                ⚠️ Hurry up!
              </p>
            )}
          </div>
        </div>

        {/* Progress Bar - Based on Questions Answered */}
        <div className="mt-5">
          <div className="w-full bg-gray-200 rounded-full h-2.5">
            <div
              className={`h-2.5 rounded-full transition-all duration-500 ${isOffline ? "bg-gray-500" : "bg-gradient-to-r from-blue-500 to-indigo-600"}`}
              style={{
                width: `${questions.length > 0 ? (answeredInSection / questions.length) * 100 : 0}%`,
              }}
            />
          </div>
          <div className="flex justify-between text-xs text-gray-500 mt-2">
            <span>
              Section {currentSectionIndex + 1} of {sections.length}
            </span>
            <span
              className={`font-medium ${isOffline ? "text-gray-600" : "text-blue-600"}`}
            >
              {answeredInSection}/{questions.length} Questions Answered
            </span>
          </div>
        </div>
      </div>

      {/* Section Content - Enhanced */}
      {currentSection && (
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-6 border border-gray-100">
          {/* Section Header */}
          <div className="mb-6">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center text-white font-bold text-xl shadow-lg">
                {currentSection.sectionNumber}
              </div>
              <div>
                <h3 className="text-2xl font-bold text-gray-800">
                  {currentSection.title}
                </h3>
                {currentSection.questionRange && (
                  <p className="text-sm text-gray-500 mt-1">
                    📋 {currentSection.questionRange}
                  </p>
                )}
              </div>
            </div>

            {currentSection.instructions && (
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-l-4 border-blue-500 rounded-r-xl p-4 mb-4">
                <div className="flex items-start gap-2">
                  <span className="text-blue-500 text-lg">💡</span>
                  <p className="text-blue-900 text-sm leading-relaxed">
                    {currentSection.instructions}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Passage (for reading) - Enhanced */}
          {currentSection.passageText && (
            <div className="mb-6 p-6 bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl border border-amber-200 shadow-inner">
              <div className="flex items-center gap-2 mb-4">
                <span className="text-2xl">📖</span>
                <h4 className="text-lg font-bold text-gray-800">
                  Reading Passage
                </h4>
              </div>
              <div className="prose max-w-none text-gray-700 whitespace-pre-wrap leading-relaxed text-base">
                {currentSection.passageText}
              </div>
            </div>
          )}

          {/* Audio Player (for listening) - Enhanced */}
          {currentSection.audioUrl && (
            <div className="mb-6 p-6 bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl border border-green-200">
              <div className="flex items-center gap-2 mb-4">
                <span className="text-2xl animate-pulse">🎧</span>
                <h4 className="text-lg font-bold text-gray-800">
                  Listen to the Audio
                </h4>
              </div>
              <audio controls className="w-full rounded-lg">
                <source src={currentSection.audioUrl} type="audio/mpeg" />
                Your browser does not support the audio element.
              </audio>
              <p className="text-sm text-green-700 mt-3 flex items-center gap-1">
                <span>🔄</span> You can replay the audio as needed
              </p>
            </div>
          )}
        </div>
      )}

      {/* Questions - Enhanced */}
      <div className="bg-white rounded-2xl shadow-lg p-6 mb-6 border border-gray-100">
        <div className="flex items-center justify-between mb-6">
          <h4 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            <span className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center text-white text-sm">
              ❓
            </span>
            Questions
          </h4>
          <span className="px-4 py-2 bg-blue-100 text-blue-700 rounded-full text-sm font-semibold">
            {answeredInSection}/{questions.length} Answered
          </span>
        </div>

        {questions.length > 0 ? (
          <div className="space-y-5">
            {questions.map((question) => (
              <div
                key={question._id}
                className={`rounded-xl p-5 transition-all duration-300 border-2 ${
                  answers[question._id]
                    ? "border-green-300 bg-gradient-to-r from-green-50 to-emerald-50 shadow-md"
                    : "border-gray-200 hover:border-blue-300 hover:shadow-lg hover:-translate-y-0.5 bg-white"
                }`}
              >
                {/* Question Number and Text */}
                <div className="mb-4">
                  <div className="flex items-start gap-4">
                    <span
                      className={`w-10 h-10 flex-shrink-0 rounded-xl flex items-center justify-center font-bold text-sm shadow ${
                        answers[question._id]
                          ? "bg-gradient-to-br from-green-500 to-green-600 text-white"
                          : "bg-gradient-to-br from-blue-500 to-indigo-600 text-white"
                      }`}
                    >
                      {question.questionNumber}
                    </span>
                    <div className="flex-1">
                      <p className="text-gray-800 font-medium text-base leading-relaxed">
                        {question.questionText}
                      </p>
                      <span className="inline-block mt-2 px-3 py-1 bg-gray-100 text-gray-500 text-xs rounded-full font-medium">
                        {question.questionType.replace(/-/g, " ").toUpperCase()}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Answer Input - Multiple Choice - Enhanced */}
                {question.questionType === "multiple-choice" &&
                  question.options && (
                    <div className="ml-14 space-y-2">
                      {question.options.map((option, optIndex) => (
                        <label
                          key={optIndex}
                          className={`flex items-center p-4 rounded-xl cursor-pointer transition-all duration-200 border-2 ${
                            answers[question._id] === option
                              ? "border-blue-500 bg-gradient-to-r from-blue-50 to-indigo-50 shadow-md"
                              : "border-gray-200 hover:border-blue-300 hover:bg-gray-50"
                          }`}
                        >
                          <span
                            className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold mr-4 transition-all ${
                              answers[question._id] === option
                                ? "bg-blue-500 text-white shadow"
                                : "bg-gray-200 text-gray-600"
                            }`}
                          >
                            {String.fromCharCode(65 + optIndex)}
                          </span>
                          <input
                            type="radio"
                            name={`question-${question._id}`}
                            value={option}
                            checked={answers[question._id] === option}
                            onChange={(e) =>
                              handleAnswerChange(question._id, e.target.value)
                            }
                            className="hidden"
                          />
                          <span
                            className={`flex-1 ${
                              answers[question._id] === option
                                ? "text-blue-700 font-medium"
                                : "text-gray-700"
                            }`}
                          >
                            {option}
                          </span>
                          {answers[question._id] === option && (
                            <span className="text-blue-500 text-lg">✓</span>
                          )}
                        </label>
                      ))}
                    </div>
                  )}

                {/* Answer Input - True/False/Not Given - Enhanced */}
                {(question.questionType === "true-false-not-given" ||
                  question.questionType === "yes-no-not-given") && (
                  <div className="ml-14 flex flex-wrap gap-3">
                    {(question.questionType === "yes-no-not-given"
                      ? ["Yes", "No", "Not Given"]
                      : ["True", "False", "Not Given"]
                    ).map((option, idx) => (
                      <label
                        key={option}
                        className={`flex items-center px-6 py-3 rounded-xl cursor-pointer transition-all duration-200 border-2 ${
                          answers[question._id] === option
                            ? idx === 0
                              ? "border-green-500 bg-gradient-to-r from-green-50 to-emerald-50 shadow-md"
                              : idx === 1
                                ? "border-red-500 bg-gradient-to-r from-red-50 to-rose-50 shadow-md"
                                : "border-gray-500 bg-gradient-to-r from-gray-50 to-slate-100 shadow-md"
                            : "border-gray-200 hover:border-blue-300 hover:bg-gray-50"
                        }`}
                      >
                        <input
                          type="radio"
                          name={`question-${question._id}`}
                          value={option}
                          checked={answers[question._id] === option}
                          onChange={(e) =>
                            handleAnswerChange(question._id, e.target.value)
                          }
                          className="hidden"
                        />
                        <span
                          className={`font-medium ${
                            answers[question._id] === option
                              ? idx === 0
                                ? "text-green-700"
                                : idx === 1
                                  ? "text-red-700"
                                  : "text-gray-700"
                              : "text-gray-600"
                          }`}
                        >
                          {idx === 0 ? "✓ " : idx === 1 ? "✗ " : "— "}
                          {option}
                        </span>
                      </label>
                    ))}
                  </div>
                )}

                {/* Answer Input - Multiple Choice Multi (Checkboxes) - NEW */}
                {question.questionType === "multiple-choice-multi" && (
                  <div className="ml-14 space-y-3">
                    <p className="text-sm font-semibold text-gray-500 mb-2">
                      Select all that apply:
                    </p>
                    {question.options.map((option, idx) => {
                      const currentAnswers = answers[question._id] || []; // Should be an array
                      const isSelected = currentAnswers.includes(
                        String.fromCharCode(65 + idx),
                      );

                      return (
                        <label
                          key={idx}
                          className={`flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all duration-200 group ${
                            isSelected
                              ? "border-blue-500 bg-blue-50/50"
                              : "border-gray-200 hover:border-blue-200 hover:bg-gray-50"
                          }`}
                        >
                          <div
                            className={`w-6 h-6 rounded border-2 flex items-center justify-center transition-colors ${
                              isSelected
                                ? "bg-blue-500 border-blue-500"
                                : "border-gray-300 group-hover:border-blue-400"
                            }`}
                          >
                            {isSelected && (
                              <span className="text-white text-sm font-bold">
                                ✓
                              </span>
                            )}
                          </div>
                          <input
                            type="checkbox"
                            name={`question-${question._id}`}
                            value={String.fromCharCode(65 + idx)}
                            checked={isSelected}
                            onChange={(e) => {
                              const val = e.target.value;
                              let newAnswers = Array.isArray(currentAnswers)
                                ? [...currentAnswers]
                                : [];
                              if (e.target.checked) {
                                newAnswers.push(val);
                              } else {
                                newAnswers = newAnswers.filter(
                                  (v) => v !== val,
                                );
                              }
                              // Sort to keep consistent (A, B, C...)
                              newAnswers.sort();
                              handleAnswerChange(question._id, newAnswers);
                            }}
                            className="hidden"
                          />
                          <div className="flex gap-3">
                            <span
                              className={`font-bold ${
                                isSelected ? "text-blue-600" : "text-gray-500"
                              }`}
                            >
                              {String.fromCharCode(65 + idx)}.
                            </span>
                            <span className="text-gray-700">{option}</span>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                )}

                {/* Answer Input - Short Answer / Sentence Completion */}
                {(question.questionType === "short-answer" ||
                  (question.questionType === "sentence-completion" &&
                    question.summaryConfig?.answerMode !== "select") ||
                  (question.questionType === "summary-completion" &&
                    question.summaryConfig?.answerMode !== "select") || // Default to typed if not select
                  question.questionType === "note-completion") && (
                  <div className="ml-14 space-y-3">
                    {/* Custom Instruction for Summary */}
                    {question.questionType === "summary-completion" &&
                      question.summaryConfig?.customInstruction && (
                        <p className="text-sm font-bold text-gray-500 uppercase tracking-wide">
                          {question.summaryConfig.customInstruction}
                        </p>
                      )}

                    <div className="relative">
                      <input
                        type="text"
                        value={answers[question._id] || ""}
                        onChange={(e) => {
                          if (
                            question.questionType === "summary-completion" ||
                            question.questionType === "sentence-completion"
                          ) {
                            handleSummaryAnswerChange(
                              question._id,
                              e.target.value,
                              question.summaryConfig,
                            );
                          } else {
                            handleAnswerChange(question._id, e.target.value);
                          }
                        }}
                        placeholder="Type your answer here..."
                        className={`w-full px-5 py-3 border-2 rounded-xl focus:outline-none transition-all duration-200 ${
                          answers[question._id]
                            ? "border-green-400 bg-green-50 focus:border-green-500 focus:ring-2 focus:ring-green-200"
                            : "border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                        }`}
                      />
                      {answers[question._id] && (
                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-green-500 text-lg">
                          ✓
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {/* Answer Input - Summary/Sentence Completion (Select Mode) */}
                {(question.questionType === "summary-completion" ||
                  question.questionType === "sentence-completion") &&
                  question.summaryConfig?.answerMode === "select" && (
                    <div className="ml-14 space-y-4">
                      {/* Check if options exist */}
                      {question.summaryConfig?.options?.length > 0 && (
                        <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 mb-4">
                          <h5 className="font-bold text-gray-700 mb-2">
                            Options:
                          </h5>
                          <div className="flex flex-wrap gap-2">
                            {question.summaryConfig.options.map((opt, idx) => (
                              <span
                                key={idx}
                                className="inline-flex items-center px-3 py-1 rounded-full bg-white border border-gray-300 text-sm text-gray-700"
                              >
                                <span className="font-bold mr-1.5 text-blue-600">
                                  {String.fromCharCode(65 + idx)}
                                </span>
                                {opt}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Custom Instruction */}
                      {question.summaryConfig?.customInstruction && (
                        <p className="text-sm font-bold text-gray-500 uppercase tracking-wide">
                          {question.summaryConfig.customInstruction}
                        </p>
                      )}

                      <div className="relative">
                        <select
                          value={answers[question._id] || ""}
                          onChange={(e) =>
                            handleAnswerChange(question._id, e.target.value)
                          }
                          className={`w-full px-5 py-3 border-2 rounded-xl focus:outline-none transition-all duration-200 appearance-none bg-white ${
                            answers[question._id]
                              ? "border-blue-500 bg-blue-50 focus:border-blue-600 focus:ring-2 focus:ring-blue-200"
                              : "border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                          }`}
                        >
                          <option value="">Select an answer...</option>
                          {question.summaryConfig?.options?.map((opt, idx) => (
                            <option
                              key={idx}
                              value={String.fromCharCode(65 + idx)}
                            >
                              {String.fromCharCode(65 + idx)}
                            </option>
                          ))}
                        </select>
                        <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500">
                          ▼
                        </div>
                      </div>
                    </div>
                  )}

                {/* Answer Input - Matching Headings / Information / Features - NEW */}
                {(question.questionType === "matching-headings" ||
                  question.questionType === "matching-information" ||
                  question.questionType === "matching-features") &&
                  (question.items || question.features) && (
                    <div className="ml-14 space-y-4">
                      {/* Display Headings / Features List for Reference */}
                      <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                        <h5 className="font-bold text-gray-700 mb-2">
                          {question.questionType === "matching-headings"
                            ? "Options (Headings):"
                            : question.questionType === "matching-features"
                              ? "List of Features:"
                              : "Options (Paragraphs):"}
                        </h5>
                        <ul className="space-y-1">
                          {/* Handle Features (Objects) or Options (Strings) */}
                          {question.features && question.features.length > 0
                            ? question.features.map((feat, idx) => (
                                <li key={idx} className="text-sm text-gray-600">
                                  <span className="font-bold mr-2 text-gray-800">
                                    {feat.label}.
                                  </span>
                                  {feat.text}
                                </li>
                              ))
                            : question.options.map((opt, idx) => (
                                <li key={idx} className="text-sm text-gray-600">
                                  <span className="font-bold mr-2 text-gray-800">
                                    {question.questionType ===
                                    "matching-headings"
                                      ? [
                                          "i",
                                          "ii",
                                          "iii",
                                          "iv",
                                          "v",
                                          "vi",
                                          "vii",
                                          "viii",
                                          "ix",
                                          "x",
                                        ][idx] || idx + 1
                                      : String.fromCharCode(65 + idx)}
                                    .
                                  </span>
                                  {opt}
                                </li>
                              ))}
                        </ul>
                      </div>

                      {/* Display Items (Questions) and Inputs */}
                      <div className="space-y-4">
                        {(question.items || []).map((item, idx) => (
                          <div
                            key={idx}
                            className="p-4 border rounded-xl bg-white hover:shadow-sm transition-shadow"
                          >
                            <div className="flex gap-4">
                              <div className="flex-shrink-0 w-8 h-8 bg-blue-100 text-blue-700 rounded-lg flex items-center justify-center font-bold">
                                {item.label || idx + 1}
                              </div>
                              <div className="flex-1 space-y-3">
                                <p className="text-gray-800 leading-relaxed">
                                  {item.text}
                                </p>
                                <div className="flex items-center gap-3">
                                  <label className="text-sm font-semibold text-gray-600">
                                    {question.questionType ===
                                    "matching-headings"
                                      ? "Select Heading:"
                                      : "Select Option:"}
                                  </label>
                                  <select
                                    value={
                                      (answers[question._id] &&
                                        answers[question._id][
                                          item.label || idx + 1
                                        ]) ||
                                      ""
                                    }
                                    onChange={(e) => {
                                      const currentAnswers =
                                        answers[question._id] || {};
                                      // Store as object { "14": "B", "15": "C" }
                                      handleAnswerChange(question._id, {
                                        ...currentAnswers,
                                        [item.label || idx + 1]: e.target.value,
                                      });
                                    }}
                                    className="px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                  >
                                    <option value="">Choose...</option>
                                    {question.features &&
                                    question.features.length > 0
                                      ? question.features.map((feat, fIdx) => (
                                          <option key={fIdx} value={feat.label}>
                                            {feat.label}
                                          </option>
                                        ))
                                      : question.options.map((opt, optIdx) => (
                                          <option
                                            key={optIdx}
                                            value={
                                              // ALWAYS send value as Letter (A, B, C...) for consistency with grading engine
                                              // The Display (children) will remain Roman Numerals for UI
                                              String.fromCharCode(65 + optIdx)
                                            }
                                          >
                                            {question.questionType ===
                                            "matching-headings"
                                              ? [
                                                  "i",
                                                  "ii",
                                                  "iii",
                                                  "iv",
                                                  "v",
                                                  "vi",
                                                  "vii",
                                                  "viii",
                                                  "ix",
                                                  "x",
                                                ][optIdx] || optIdx + 1
                                              : String.fromCharCode(
                                                  65 + optIdx,
                                                )}
                                          </option>
                                        ))}
                                  </select>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                {/* Answer Input - Table Completion - NEW */}
                {question.questionType === "table-completion" &&
                  question.tableStructure && (
                    <div className="ml-14 mt-4 overflow-x-auto">
                      <table className="min-w-full border-collapse border border-gray-300 bg-white text-sm rounded-lg overflow-hidden shadow-sm">
                        <thead className="bg-gray-100">
                          <tr>
                            {question.tableStructure.headers.map(
                              (header, idx) => (
                                <th
                                  key={idx}
                                  className="border border-gray-300 px-4 py-3 text-left font-bold text-gray-700 uppercase tracking-wider"
                                >
                                  {header}
                                </th>
                              ),
                            )}
                          </tr>
                        </thead>
                        <tbody>
                          {question.tableStructure.rows.map((row, rIdx) => (
                            <tr
                              key={rIdx}
                              className={
                                rIdx % 2 === 0 ? "bg-white" : "bg-gray-50"
                              }
                            >
                              {row.map((cell, cIdx) => (
                                <td
                                  key={cIdx}
                                  className="border border-gray-300 px-4 py-2"
                                >
                                  {cell
                                    .split(/(\{\{\d+\}\})/g)
                                    .map((part, pIdx) => {
                                      const match = part.match(/\{\{(\d+)\}\}/);
                                      if (match) {
                                        const answerIndex = match[1]; // "1", "2"...
                                        return (
                                          <span
                                            key={pIdx}
                                            className="inline-flex items-center gap-1"
                                          >
                                            <span className="text-xs font-bold text-gray-500 select-none">
                                              ({answerIndex})
                                            </span>
                                            <input
                                              type="text"
                                              className={`w-32 px-2 py-1 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors ${
                                                answers[question._id]?.[
                                                  answerIndex
                                                ]
                                                  ? "bg-blue-50 border-blue-400 font-medium text-blue-800"
                                                  : "border-gray-300"
                                              }`}
                                              value={
                                                answers[question._id]?.[
                                                  answerIndex
                                                ] || ""
                                              }
                                              onChange={(e) => {
                                                const currentAnswers =
                                                  answers[question._id] || {};
                                                handleAnswerChange(
                                                  question._id,
                                                  {
                                                    ...currentAnswers,
                                                    [answerIndex]:
                                                      e.target.value,
                                                  },
                                                );
                                              }}
                                            />
                                          </span>
                                        );
                                      }
                                      return <span key={pIdx}>{part}</span>;
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
            ))}
          </div>
        ) : (
          <p className="text-gray-500 text-center py-8">
            No questions available for this section.
          </p>
        )}
      </div>

      {/* Navigation Buttons - Enhanced */}
      <div className="bg-gradient-to-r from-gray-50 to-slate-100 rounded-2xl shadow-lg p-6 border border-gray-200">
        <div className="flex items-center justify-between">
          {/* Previous Button */}
          <button
            onClick={handlePreviousSection}
            disabled={currentSectionIndex === 0}
            className={`px-8 py-3 rounded-xl font-semibold transition-all duration-300 flex items-center gap-2 ${
              currentSectionIndex === 0
                ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                : "bg-white text-gray-700 hover:bg-gray-100 hover:shadow-lg border-2 border-gray-300 hover:-translate-x-1"
            }`}
          >
            <span>←</span> Previous
          </button>

          {/* Section Indicators */}
          <div className="flex items-center gap-3">
            {sections.map((_, idx) => (
              <div
                key={idx}
                className={`w-3 h-3 rounded-full transition-all duration-300 ${
                  idx < currentSectionIndex
                    ? "bg-green-500"
                    : idx === currentSectionIndex
                      ? "bg-blue-500 w-4 h-4 animate-pulse"
                      : "bg-gray-300"
                }`}
              />
            ))}
          </div>

          {/* Next or Submit Button */}
          {currentSectionIndex < sections.length - 1 ? (
            <button
              onClick={handleNextSection}
              className="px-8 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl hover:from-blue-600 hover:to-indigo-700 font-semibold transition-all duration-300 shadow-lg hover:shadow-xl hover:translate-x-1 flex items-center gap-2"
            >
              Next <span>→</span>
            </button>
          ) : (
            <button
              onClick={handleSubmitTest}
              disabled={isSubmitting}
              className="px-8 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl hover:from-green-600 hover:to-emerald-700 font-semibold transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-105 flex items-center gap-2 disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <span className="animate-spin">⏳</span> Submitting...
                </>
              ) : (
                <>✓ Submit Test</>
              )}
            </button>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default TestTaking;
