import React, { useEffect, useRef, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import {
  getTestById,
  startTestSession,
  getSession,
  bulkSaveAnswers,
  submitTestSession,
  submitTestResult,
  updateSubmissionStatus,
  getQuestionsBySectionId,
} from "../services/api";
import { toast } from "react-toastify";
import DashboardLayout from "../components/Layout/DashboardLayout";
import EssayEditor from "../components/EssayEditor";
import { resolveImageUrl } from "../utils/urlHelper";

const WritingTestTaking = () => {
  const { testId } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const assignmentId = searchParams.get("assignmentId");

  // State
  const [test, setTest] = useState(null);
  const [sections, setSections] = useState([]);
  const [currentSectionIndex, setCurrentSectionIndex] = useState(0);
  const [essays, setEssays] = useState({}); // { sectionId: essayText }
  const [loading, setLoading] = useState(true);
  
  // Independent timers
  const [task1Time, setTask1Time] = useState(1200); // 20 mins max
  const [task2Time, setTask2Time] = useState(2400); // 40 mins max
  const [timeRemaining, setTimeRemaining] = useState(3600); // Total

  const [session, setSession] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showExitModal, setShowExitModal] = useState(false);

  // Fullscreen State
  const [isFullscreen, setIsFullscreen] = useState(false);

  const autoSaveInterval = useRef(null);
  const timersInitialized = useRef(false);

  // Load test data
  useEffect(() => {
    loadTestData();
  }, [testId]);

  // Anti-Cheat Refs
  const sessionRef = useRef(session);
  const isSubmittingRef = useRef(isSubmitting);

  useEffect(() => {
    sessionRef.current = session;
    isSubmittingRef.current = isSubmitting;
  }, [session, isSubmitting]);

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
    if (session && session.status === "in-progress" && !isSubmitting) {
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
  }, [session, isSubmitting]);

  // Auto-save every 30 seconds
  useEffect(() => {
    if (!session || loading) return;

    autoSaveInterval.current = setInterval(() => {
      saveEssays();
    }, 30000);

    return () => clearInterval(autoSaveInterval.current);
  }, [essays, session, loading]);

  // Timer warnings
  useEffect(() => {
    if (timeRemaining === 300) {
      toast.warn("⏰ 5 minutes remaining!", { autoClose: 5000 });
    }
    if (timeRemaining === 60) {
      toast.warn("⏰ 1 minute remaining!", { autoClose: 5000 });
    }
  }, [timeRemaining]);

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

  // Countdown timer
  useEffect(() => {
    if (loading || !session || isSubmitting) return;

    if (!timersInitialized.current) {
      // Initialize total time from session only once
      const totalTime = session.timeRemaining || (test.duration || 60) * 60;
      setTimeRemaining(totalTime);
      
      // Distribute time based on standard 20/40 split if possible
      setTask1Time(Math.max(0, totalTime - 2400));
      setTask2Time(Math.min(totalTime, 2400));
      timersInitialized.current = true;
    }

    const timer = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          handleSubmitTest();
          return 0;
        }
        return prev - 1;
      });

      // --- WRITING SPECIFIC INDEPENDENT TIMERS ---
      if (test.module === "writing" && sections.length >= 2) {
        if (currentSectionIndex === 0) {
          setTask1Time((prev) => {
            if (prev <= 1) {
              toast.info("Task 1 time is up! Switching to Task 2.", { 
                toastId: "task-switch",
                autoClose: 5000 
              });
              setCurrentSectionIndex(1);
              return 0;
            }
            return prev - 1;
          });
        } else if (currentSectionIndex === 1) {
          setTask2Time((prev) => Math.max(0, prev - 1));
        }
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [session, loading, isSubmitting, test, currentSectionIndex, sections.length]);

  // Load test data
  const loadTestData = async () => {
    try {
      setLoading(true);

      // Start or resume session
      const sessionResponse = await startTestSession(testId);
      setSession(sessionResponse.session);

      // Load test data
      const response = await getTestById(testId);

      setTest(response.test);
      const loadedSections = response.sections || [];

      // Fetch questions for each section (for new Writing Task format)
      const sectionsWithQuestions = await Promise.all(
        loadedSections.map(async (section) => {
          try {
            const qResponse = await getQuestionsBySectionId(section._id);
            // If we found questions, attach the first one (Writing tasks usually have 1 question per section)
            if (qResponse.questions && qResponse.questions.length > 0) {
              return { ...section, question: qResponse.questions[0] };
            }
          } catch (err) {
            console.error(
              "Error fetching questions for section",
              section._id,
              err,
            );
          }
          return section;
        }),
      );

      setSections(sectionsWithQuestions);

      // If resuming, load saved essays
      if (sessionResponse.isResuming) {
        const sessionData = await getSession(sessionResponse.session._id);
        const savedEssays = {};
        sessionData.session.answers.forEach((answer) => {
          savedEssays[answer.questionId] = answer.userAnswer;
        });
        setEssays(savedEssays);
      }
    } catch (error) {
      console.error("Load test error:", error);
      toast.error("Failed to load test");
    } finally {
      setLoading(false);
    }
  };

  // Save essays to backend
  const saveEssays = async () => {
    if (!session || Object.keys(essays).length === 0) return;

    const answersArray = Object.entries(essays).map(
      ([sectionId, essayText]) => ({
        questionId: sectionId, // For Writing, we treat section as the "question"
        userAnswer: essayText,
        timeSpent: 0,
      }),
    );

    try {
      await bulkSaveAnswers(session._id, answersArray);
    } catch (error) {
      console.error("❌ Auto-save failed:", error);
    }
  };

  const handleSubmitTest = async () => {
    if (isSubmitting || !session) return;

    setIsSubmitting(true);

    try {
      // Save any pending essays
      await saveEssays();

      // Submit session
      await submitTestSession(session._id);

      // Calculate results (will be null for Writing until teacher grades)
      const resultResponse = await submitTestResult(session._id);

      // Update assignment if applicable
      if (assignmentId) {
        await updateSubmissionStatus(
          assignmentId,
          session._id,
          resultResponse.result._id,
          "completed",
        );
      }

      toast.success("Essays submitted! Your teacher will grade them soon.");

      if (document.fullscreenElement && document.exitFullscreen) {
        document.exitFullscreen().catch((err) => console.error(err));
      }

      setTimeout(() => {
        navigate(`/results/${resultResponse.result._id}`);
      }, 1500);
    } catch (error) {
      console.error("Submit failed:", error);
      toast.error("Failed to submit essays");
      setIsSubmitting(false);
    }
  };

  const handleConfirmExit = async () => {
    setShowExitModal(false);
    window.__testGuard = null;
    await handleSubmitTest();
  };

  const handleCancelExit = () => {
    setShowExitModal(false);
  };

  const handleEssayChange = (sectionId, text) => {
    setEssays((prev) => ({
      ...prev,
      [sectionId]: text,
    }));
  };

  const handlePreviousSection = () => {
    if (currentSectionIndex > 0) {
      // Writing Lock: Prevent going back to Task 1 if time is <= 40 minutes (2400s)
      if (test.module === "writing" && currentSectionIndex === 1 && timeRemaining <= 2400) {
        toast.error("Task 1 is locked as the time for it has expired.");
        return;
      }
      setCurrentSectionIndex((prev) => prev - 1);
      window.scrollTo(0, 0);
    }
  };

  const handleNextSection = () => {
    if (currentSectionIndex < sections.length - 1) {
      setCurrentSectionIndex((prev) => prev + 1);
      window.scrollTo(0, 0);
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

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

  const currentSection = sections[currentSectionIndex];

  // MERGE LOGIC: Use Question data if Section data is missing (New Format)
  const displayTask = {
    ...currentSection,
    // If section has no image but question does, use question's image
    taskImageUrl:
      currentSection.taskImageUrl || currentSection.question?.imageUrl,
    // If section instructions are empty, use question text
    instructions:
      currentSection.instructions || currentSection.question?.questionText,
    // Default word limits if missing
    wordLimit:
      currentSection.wordLimit ||
      (currentSection.taskType === "task1" ? 150 : 250),
  };

  const currentEssay = essays[currentSection._id] || "";

  return (
    <DashboardLayout title={test.title}>
      {/* Header */}
      <div className="bg-white rounded-lg shadow mb-6 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">{test.title}</h2>
            <p className="text-gray-600 mt-1">
              {displayTask.taskType === "task1" ? "Task 1" : "Task 2"} -{" "}
              {displayTask.title}
            </p>
          </div>
          <div className="text-right flex items-center gap-4">
            <button
              onClick={toggleFullscreen}
              className="px-4 py-2 bg-gray-50 hover:bg-gray-100 rounded-lg text-gray-700 font-medium transition-all border border-gray-200 flex flex-col items-center justify-center shrink-0"
              title={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
            >
              <span className="text-xl mb-1 leading-none">{isFullscreen ? "🗗" : "⛶"}</span>
              <span className="text-[10px] uppercase tracking-wider">{isFullscreen ? "Exit Fullscreen" : "Fullscreen"}</span>
            </button>
            <div>
              <p className="text-sm text-gray-600 mb-1">Time Remaining</p>
              <p
                className={`text-3xl font-bold ${
                  (currentSectionIndex === 0 ? task1Time : task2Time) < 300 ? "text-red-600" : "text-blue-600"
                }`}
              >
                {formatTime(currentSectionIndex === 0 ? task1Time : task2Time)}
              </p>
            </div>
          </div>
        </div>

        {/* Progress */}
        <div className="mt-4">
          <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
            <span>
              Task {currentSectionIndex + 1} of {sections.length}
            </span>
            <span>
              {Math.round(((currentSectionIndex + 1) / sections.length) * 100)}%
              Complete
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all"
              style={{
                width: `${((currentSectionIndex + 1) / sections.length) * 100}%`,
              }}
            ></div>
          </div>
        </div>
      </div>

      {/* Instructions */}
        <div className="mb-6 p-4 bg-blue-50 border-l-4 border-blue-600 rounded">
          <h3 className="font-semibold text-gray-800 mb-2">Instructions:</h3>
          <p className="text-gray-700">{displayTask.instructions}</p>
          <p className="text-sm text-gray-600 mt-2">
            <strong>Minimum words:</strong> {displayTask.wordLimit}
          </p>
        </div>

      {/* Task Content */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        {/* Task Image (if Task 1) */}
        {displayTask.taskImageUrl && (
          <div className="mb-6">
            <img
              src={resolveImageUrl(displayTask.taskImageUrl)}
              alt="Task diagram"
              className="w-full max-w-3xl mx-auto rounded-lg border-2 border-gray-200"
            />
          </div>
        )}

        

        {/* Essay Editor */}
        <EssayEditor
          value={currentEssay}
          onChange={(text) => handleEssayChange(currentSection._id, text)}
          minWords={displayTask.wordLimit || 150}
          placeholder={`Write your ${displayTask.taskType === "task1" ? "summary" : "essay"} here...`}
        />
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={handlePreviousSection}
          disabled={currentSectionIndex === 0 || (test.module === "writing" && currentSectionIndex === 1 && timeRemaining <= 2400)}
          className="px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          ← Previous Task
        </button>

        <button
          onClick={() => saveEssays()}
          className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700"
        >
          💾 Save Draft
        </button>

        {currentSectionIndex === sections.length - 1 ? (
          <button
            onClick={() => setShowExitModal(true)}
            disabled={isSubmitting}
            className="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold disabled:opacity-50"
          >
            {isSubmitting ? "Submitting..." : "✓ Submit Test"}
          </button>
        ) : (
          <button
            onClick={handleNextSection}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Next Task →
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
                  Your current essays will be <strong>submitted immediately</strong>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-orange-500 mt-0.5">•</span>
                  Unanswered tasks will count as <strong>zero marks</strong>
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

export default WritingTestTaking;
