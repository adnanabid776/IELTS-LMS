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
  const [timeRemaining, setTimeRemaining] = useState(3600);
  const [session, setSession] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const autoSaveInterval = useRef(null);

  // Load test data
  useEffect(() => {
    loadTestData();
  }, [testId]);

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

  // Countdown timer
  useEffect(() => {
    if (loading || !session || isSubmitting) return;

    setTimeRemaining(session.timeRemaining || test.duration * 60);

    const timer = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          handleSubmitTest();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [session, loading, isSubmitting]);

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

    const confirmed = window.confirm(
      "Are you sure you want to submit your essays? You cannot change them after submission.",
    );

    if (!confirmed) {
      setIsSubmitting(false);
      return;
    }

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

      setTimeout(() => {
        navigate(`/results/${resultResponse.result._id}`);
      }, 1500);
    } catch (error) {
      console.error("Submit failed:", error);
      toast.error("Failed to submit essays");
      setIsSubmitting(false);
    }
  };

  const handleEssayChange = (sectionId, text) => {
    setEssays((prev) => ({
      ...prev,
      [sectionId]: text,
    }));
  };

  const handleNextSection = () => {
    if (currentSectionIndex < sections.length - 1) {
      setCurrentSectionIndex((prev) => prev + 1);
      window.scrollTo(0, 0);
    }
  };

  const handlePreviousSection = () => {
    if (currentSectionIndex > 0) {
      setCurrentSectionIndex((prev) => prev - 1);
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
          <div className="text-right">
            <p className="text-sm text-gray-600">Time Remaining</p>
            <p
              className={`text-3xl font-bold ${
                timeRemaining < 300 ? "text-red-600" : "text-blue-600"
              }`}
            >
              {formatTime(timeRemaining)}
            </p>
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

      {/* Task Content */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        {/* Task Image (if Task 1) */}
        {displayTask.taskImageUrl && (
          <div className="mb-6">
            <img
              src={displayTask.taskImageUrl}
              alt="Task diagram"
              className="w-full max-w-3xl mx-auto rounded-lg border-2 border-gray-200"
            />
          </div>
        )}

        {/* Instructions */}
        <div className="mb-6 p-4 bg-blue-50 border-l-4 border-blue-600 rounded">
          <h3 className="font-semibold text-gray-800 mb-2">Instructions:</h3>
          <p className="text-gray-700">{displayTask.instructions}</p>
          <p className="text-sm text-gray-600 mt-2">
            <strong>Minimum words:</strong> {displayTask.wordLimit}
          </p>
        </div>

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
          disabled={currentSectionIndex === 0}
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
            onClick={handleSubmitTest}
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
    </DashboardLayout>
  );
};

export default WritingTestTaking;
