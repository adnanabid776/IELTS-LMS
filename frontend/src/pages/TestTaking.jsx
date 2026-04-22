import React, { useCallback, useEffect, useRef, useState, useMemo } from "react";
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
  markAudioPlayed,
} from "../services/api";
import { toast } from "react-toastify";
import DashboardLayout from "../components/Layout/DashboardLayout";
import QuestionRenderer from "../components/QuestionRenderer";
import AudioPlayer from "../components/AudioPlayer";
import WritingTestTaking from "./WritingTestTaking";
import OfflineQueue from "../utils/OfflineQueue";
import { resolveImageUrl } from "../utils/urlHelper";

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

  // Dynamic Audio Logic
  const isItemWise = test ? (test.testFormat === "item-wise" || test.totalSections < 2 || test.duration < 30) : false;

  const globalAudioSection = useMemo(() => {
    if (isItemWise) return null;
    return sections.find((s) => s.audioUrl) || null;
  }, [sections, isItemWise]);

  const activeAudioSection = globalAudioSection?.audioUrl ? globalAudioSection : currentSection;

  // Exit confirmation modal state
  const [showExitModal, setShowExitModal] = useState(false);

  // Fullscreen State
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Resizable split pane state
  const [splitPos, setSplitPos] = useState(50); // percent
  const isDragging = useRef(false);
  const containerRef = useRef(null);

  const handleDividerMouseDown = useCallback((e) => {
    isDragging.current = true;
    e.preventDefault();
    const onMouseMove = (ev) => {
      if (!isDragging.current || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const newPos = ((ev.clientX - rect.left) / rect.width) * 100;
      setSplitPos(Math.min(Math.max(newPos, 20), 80));
    };
    const onMouseUp = () => {
      isDragging.current = false;
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
    };
    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
  }, []);

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
      moduleCheck.module !== "writing"
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

  // --- Fullscreen Toggle Logic ---
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

  // ✅ Block browser close / refresh (native browser dialog)
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

  const handleAudioEnded = async () => {
    if (!activeAudioSection || !session) return;
    try {
      await markAudioPlayed(session._id, activeAudioSection._id);
      // Update local session state to reflect change immediately
      setSession((prev) => ({
        ...prev,
        audioPlayedSections: [
          ...(prev.audioPlayedSections || []),
          activeAudioSection._id,
        ],
      }));
    } catch (error) {
      console.error("Failed to mark audio played:", error);
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

      if (document.fullscreenElement && document.exitFullscreen) {
        document.exitFullscreen().catch((err) => console.error(err));
      }

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

  // ✅ Set global test guard — SideBar reads this to intercept clicks
  useEffect(() => {
    if (session && session.status === "in-progress" && !isSubmitting) {
      window.__testGuard = {
        active: true,
        onExitRequest: () => setShowExitModal(true),
      };
    } else {
      window.__testGuard = null;
    }
    return () => {
      window.__testGuard = null;
    };
  }, [session, isSubmitting]);

  // ✅ Intercept browser back button
  useEffect(() => {
    const handlePopState = (e) => {
      if (sessionRef.current && !isSubmittingRef.current && sessionRef.current.status === "in-progress") {
        // Push a dummy state to prevent actual navigation
        window.history.pushState(null, "", window.location.href);
        setShowExitModal(true);
      }
    };
    // Push a state so we can intercept the first back press
    window.history.pushState(null, "", window.location.href);
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  // Handler: student confirms leaving — submit with current answers then go to results
  const handleConfirmExit = async () => {
    setShowExitModal(false);
    window.__testGuard = null;
    setIsSubmitting(true);
    try {
      await saveBulkAnswers();
      await submitTestSession(session._id);
      const resultResponse = await submitTestResult(session._id);
      OfflineQueue.clear();
      if (assignmentId) {
        await updateSubmissionStatus(
          assignmentId,
          session._id,
          resultResponse.result._id,
          "completed",
        );
      }
      toast.success("Test submitted. Redirecting to results...");
      
      if (document.fullscreenElement && document.exitFullscreen) {
        document.exitFullscreen().catch((err) => console.error(err));
      }

      setTimeout(() => {
        navigate(`/results/${resultResponse.result._id}`);
      }, 1200);
    } catch (err) {
      toast.error("Failed to submit. Please try again.");
      setIsSubmitting(false);
    }
  };

  // Handler: student cancels — stay in test
  const handleCancelExit = () => {
    setShowExitModal(false);
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
    <DashboardLayout title={test.title} hideHeader={true} collapseSidebar={true}>
      {/* Test Header - Compact */}
      <div
        className={`rounded-xl shadow-md px-3 py-2 mb-3 sticky top-0 z-10 border transition-all duration-300 ${
          isOffline
            ? "bg-gradient-to-r from-gray-100 to-gray-200 border-gray-300"
            : timeRemaining < 300
              ? "bg-gradient-to-r from-red-50 to-orange-50 border-red-200"
              : "bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-100"
        }`}
      >
        <div className="flex items-center justify-between gap-3">
          {/* Test Info */}
          <div className="flex items-center gap-2 min-w-0">
            <div
              className={`w-8 h-8 flex-shrink-0 rounded-lg flex items-center justify-center text-white font-bold text-sm shadow ${
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
            <div className="min-w-0 flex-1">
              <h2 className="text-sm font-bold text-gray-800 truncate">{test.title}</h2>
              <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
                <span className="px-2 py-0.5 bg-white/70 rounded-full text-[10px] font-semibold text-gray-600 shadow-sm whitespace-nowrap">
                  📑 Section {currentSectionIndex + 1}/{sections.length}
                </span>
                <span className="px-2 py-0.5 bg-white/70 rounded-full text-[10px] font-semibold text-gray-600 shadow-sm whitespace-nowrap">
                  ✅ {answeredInSection}/{questions.length} answered
                </span>
                {isOffline ? (
                  <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded-full text-[10px] font-bold border border-red-200 animate-pulse whitespace-nowrap">🚫 Offline</span>
                ) : isSyncing ? (
                  <span className="px-2 py-0.5 bg-yellow-100 text-yellow-700 rounded-full text-[10px] font-bold border border-yellow-200 whitespace-nowrap">🔄 Syncing...</span>
                ) : (
                  <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-[10px] font-bold border border-green-200 whitespace-nowrap">☁️ Saved</span>
                )}
              </div>
            </div>
          </div>

          {/* Controls Group */}
          <div className="flex items-center gap-2 flex-shrink-0 self-center">
            {/* Fullscreen Button */}
            <button
              onClick={toggleFullscreen}
              className="px-3 py-2 text-sm bg-white hover:bg-gray-50 rounded-lg text-gray-700 shadow transition-all border border-gray-200 flex items-center justify-center h-full"
              title={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
            >
              {isFullscreen ? "🗗 Exit" : "⛶ Fullscreen"}
            </button>

            {/* Timer - Compact */}
            <div
              className={`text-center px-3 py-1 rounded-lg shadow-md transition-all duration-300 ${
                isOffline
                ? "bg-gray-400"
                : timeRemaining < 300
                  ? "bg-gradient-to-br from-red-500 to-red-600 animate-pulse"
                  : timeRemaining < 600
                    ? "bg-gradient-to-br from-orange-500 to-orange-600"
                    : "bg-gradient-to-br from-blue-500 to-indigo-600"
            }`}
            >
              <p className="text-[9px] text-white/80 font-medium leading-none mb-0.5">⏱️ Time Left</p>
              <p className={`text-xl font-bold tracking-wider leading-none ${
                timeRemaining < 300 && !isOffline ? "text-white animate-pulse" : "text-white"
              }`}>
                {formatTime(timeRemaining)}
              </p>
              {timeRemaining < 300 && !isOffline && (
                <p className="text-[9px] text-white font-semibold mt-0.5">⚠️ Hurry!</p>
              )}
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mt-2">
          <div className="w-full bg-gray-200 rounded-full h-1">
            <div
              className={`h-1 rounded-full transition-all duration-500 ${isOffline ? "bg-gray-500" : "bg-gradient-to-r from-blue-500 to-indigo-600"}`}
              style={{
                width: `${questions.length > 0 ? (answeredInSection / questions.length) * 100 : 0}%`,
              }}
            />
          </div>
          <div className="flex justify-between text-[10px] text-gray-500 mt-1">
            <span>Section {currentSectionIndex + 1} of {sections.length}</span>
            <span className={`font-medium ${isOffline ? "text-gray-600" : "text-blue-600"}`}>
              {answeredInSection}/{questions.length} Answered
            </span>
          </div>
        </div>
      </div>

      {/* Section Content - Side-by-side layout for reading, stacked for others */}
      {currentSection && (
        <div className="mb-6">
          {/* Section Header above both columns */}
          <div className="bg-white rounded-2xl shadow-lg p-5 mb-4 border border-gray-100">
            <div className="flex items-center gap-4 mb-2">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center text-white font-bold text-lg shadow-lg">
                {currentSection.sectionNumber}
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-800">{currentSection.title}</h3>
                {currentSection.questionRange && (
                  <p className="text-sm text-gray-500 mt-0.5">📋 {currentSection.questionRange}</p>
                )}
              </div>
            </div>
            {currentSection.instructions && (
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-l-4 border-blue-500 rounded-r-xl p-3 mt-2">
                <div className="flex items-start gap-2">
                  <span className="text-blue-500 text-base">💡</span>
                  <p className="text-blue-900 text-sm leading-relaxed">{currentSection.instructions}</p>
                </div>
              </div>
            )}
          </div>

          {/* Audio Player (for listening) */}
          {activeAudioSection?.audioUrl && (
            <div className="mb-4">
              <AudioPlayer 
                key={activeAudioSection.audioUrl}
                audioUrl={resolveImageUrl(activeAudioSection.audioUrl)}
                title="Listen to the Audio"
                playOnce={!!activeAudioSection.playOnceOnly}
                disableSeeking={!!activeAudioSection.disableReplay}
                initialPlayed={session?.audioPlayedSections?.includes(activeAudioSection._id)}
                onEnded={handleAudioEnded}
              />
              {!activeAudioSection.disableReplay && (
                <p className="text-sm text-green-700 mt-2 flex items-center gap-1 bg-green-50 p-2 rounded-lg border border-green-100">
                  <span>🔄</span> You can replay the audio as needed (Test Format: {isItemWise ? "Section-wise" : "Full Exam"})
                </p>
              )}
            </div>
          )}

          {/* Parallel Layout: Passage LEFT | Questions RIGHT (Reading)
               Stacked Layout: just Questions (Listening / Writing) */}
          {currentSection.passageText ? (
            /* Resizable split: passage | divider | questions */
            <div
              ref={containerRef}
              className="flex items-stretch gap-0"
              style={{ height: "calc(100vh - 220px)", minHeight: "400px" }}
            >
              {/* Left: Reading Passage */}
              <div
                className="bg-white rounded-2xl shadow-lg border border-amber-200 overflow-hidden flex flex-col"
                style={{ width: `${splitPos}%`, minWidth: "20%" }}
              >
                <div className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-amber-50 to-orange-50 border-b border-amber-200">
                  <span className="text-base">📖</span>
                  <h4 className="text-sm font-bold text-gray-800">Reading Passage</h4>
                </div>
                <div className="overflow-y-auto flex-1 p-4">
                  {currentSection.passageImageUrl && (
                    <div className="mb-6 rounded-xl overflow-hidden shadow-sm border border-gray-100 flex justify-center bg-gray-50 p-2">
                       <img 
                          src={resolveImageUrl(currentSection.passageImageUrl)} 
                          alt="Passage Illustration" 
                          className="max-w-full h-auto rounded-lg"
                       />
                    </div>
                  )}
                  <div className="prose max-w-none text-gray-700 whitespace-pre-wrap leading-relaxed text-sm">
                    {currentSection.passageText}
                  </div>
                </div>
              </div>

              {/* Draggable Divider */}
              <div
                onMouseDown={handleDividerMouseDown}
                className="flex-shrink-0 w-2 mx-1 flex items-center justify-center cursor-col-resize group z-10"
                title="Drag to resize"
              >
                <div className="w-1 h-16 rounded-full bg-gray-300 group-hover:bg-blue-400 group-active:bg-blue-500 transition-colors duration-150 shadow-sm" />
              </div>

              {/* Right: Questions */}
              <div
                className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden flex flex-col"
                style={{ flex: 1, minWidth: "20%" }}
              >
                <div className="flex items-center justify-between px-4 py-2.5 bg-gradient-to-r from-indigo-50 to-purple-50 border-b border-indigo-100">
                  <h4 className="text-sm font-bold text-gray-800 flex items-center gap-1.5">
                    <span className="w-5 h-5 bg-gradient-to-br from-indigo-500 to-purple-600 rounded flex items-center justify-center text-white text-[10px]">❓</span>
                    Questions
                  </h4>
                  <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs font-semibold">
                    {answeredInSection}/{questions.length} Answered
                  </span>
                </div>
                <div className="overflow-y-auto flex-1 p-3">
                  {questions.length > 0 ? (
                    <div className="space-y-3">
                      {questions.map((question) => (
                        <div
                          key={question._id}
                          className={`rounded-xl p-4 transition-all duration-300 border-2 ${
                            answers[question._id]
                              ? "border-green-300 bg-gradient-to-r from-green-50 to-emerald-50 shadow-md"
                              : "border-gray-200 hover:border-blue-300 hover:shadow-lg bg-white"
                          }`}
                        >
                          <QuestionRenderer
                            question={question}
                            answers={answers}
                            handleAnswerChange={handleAnswerChange}
                            handleSummaryAnswerChange={handleSummaryAnswerChange}
                          />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500 text-center py-8">No questions available for this section.</p>
                  )}
                </div>
              </div>
            </div>
          ) : (
            /* Stacked: Questions only (Listening, Writing) */
            <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
              <div className="flex items-center justify-between mb-5">
                <h4 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                  <span className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center text-white text-sm">❓</span>
                  Questions
                </h4>
                <span className="px-4 py-2 bg-blue-100 text-blue-700 rounded-full text-sm font-semibold">
                  {answeredInSection}/{questions.length} Answered
                </span>
              </div>
              
              {/* Listening module image support (maps, diagrams, etc.) */}
              {currentSection.passageImageUrl && (
                <div className="mb-6 rounded-xl overflow-hidden shadow-sm border border-gray-100 flex justify-center bg-gray-50 p-2">
                   <img 
                      src={resolveImageUrl(currentSection.passageImageUrl)} 
                      alt="Section Visual" 
                      className="max-w-full h-auto rounded-lg"
                   />
                </div>
              )}

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
                      <QuestionRenderer
                        question={question}
                        answers={answers}
                        handleAnswerChange={handleAnswerChange}
                        handleSummaryAnswerChange={handleSummaryAnswerChange}
                      />
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-8">No questions available for this section.</p>
              )}
            </div>
          )}
        </div>
      )}

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

      {/* ✅ Exit Confirmation Modal — fires on sidebar click, back button, any in-app nav */}
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
                disabled={isSubmitting}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 text-white font-semibold transition-all shadow-lg text-sm disabled:opacity-60 flex items-center gap-2 justify-center"
              >
                {isSubmitting ? (
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

export default TestTaking;
