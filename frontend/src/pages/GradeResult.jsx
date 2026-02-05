import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import DashboardLayout from "../components/Layout/DashboardLayout";
import RubricSlider from "../components/RubricSlider";
import { toast } from "react-toastify";
import axios from "axios";

const API_URL = "http://localhost:5000/api";

const GradeResult = () => {
  const { resultId } = useParams();
  const navigate = useNavigate();

  const [result, setResult] = useState(null);
  const [session, setSession] = useState(null);
  const [answers, setAnswers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Writing Scores
  const [writingScores, setWritingScores] = useState({
    taskAchievement: 5,
    coherenceCohesion: 5,
    lexicalResource: 5,
    grammaticalRange: 5,
  });

  // Speaking Scores
  const [speakingScores, setSpeakingScores] = useState({
    fluencyCoherence: 5,
    lexicalResource: 5,
    grammaticalRange: 5,
    pronunciation: 5,
  });

  // Manual Band Score (for Reading/Listening overrides)
  const [manualBandScore, setManualBandScore] = useState(0);

  const [gradingNotes, setGradingNotes] = useState("");

  const isWriting = result?.module === "writing";
  // const isSpeaking = result?.module === "speaking";

  useEffect(() => {
    fetchResultDetails();
  }, [resultId]);

  const fetchResultDetails = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");

      // Get result
      const resultResponse = await axios.get(`${API_URL}/results/${resultId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const resultData = resultResponse.data.result;
      setResult(resultData);

      // Get session to retrieve answers
      const sessionResponse = await axios.get(
        `${API_URL}/sessions/${resultData.sessionId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      setSession(sessionResponse.data.session);
      setAnswers(sessionResponse.data.session.answers || []);

      // If already graded, pre-fill scores
      if (resultData.writingScores) {
        setWritingScores(resultData.writingScores);
      }
      if (resultData.speakingScores) {
        setSpeakingScores(resultData.speakingScores);
      }
      if (resultData.gradingNotes) {
        setGradingNotes(resultData.gradingNotes);
      }
      if (resultData.bandScore && resultData.module !== "writing") {
        setManualBandScore(resultData.bandScore);
      }
    } catch (error) {
      console.error("Fetch result details error:", error);
      toast.error("Failed to load submission details");
    } finally {
      setLoading(false);
    }
  };

  const calculateOverallBand = () => {
    if (isWriting) {
      const avg =
        (writingScores.taskAchievement +
          writingScores.coherenceCohesion +
          writingScores.lexicalResource +
          writingScores.grammaticalRange) /
        4;
      return Math.round(avg * 2) / 2; // Round to nearest 0.5
    } 
    return manualBandScore;
  };

  const handleSubmitGrade = async () => {
    if (submitting) return;

    const overallBand = calculateOverallBand();

    if (!gradingNotes.trim()) {
      toast.error("Please provide feedback for the student");
      return;
    }

    if (overallBand < 0) {
      // Allow 0, but usually 1-9. Relaxed check.
      toast.error("Please set appropriate scores");
      return;
    }

    const confirmed = window.confirm(
      `Submit grade of ${overallBand} with feedback? This will notify the student.`,
    );

    if (!confirmed) return;

    setSubmitting(true);

    try {
      const token = localStorage.getItem("token");

      const payload = {
        bandScore: overallBand,
        gradingNotes: gradingNotes.trim(),
      };

      if (isWriting) {
        payload.writingScores = writingScores;
      } 

      await axios.post(`${API_URL}/results/${resultId}/grade`, payload, {
        headers: { Authorization: `Bearer ${token}` },
      });

      toast.success("✅ Grade submitted successfully!");

      setTimeout(() => {
        navigate("/pending-reviews");
      }, 1500);
    } catch (error) {
      console.error("Submit grade error:", error);
      toast.error("Failed to submit grade");
      setSubmitting(false);
    }
  };

  const countWords = (text) => {
    return text
      .trim()
      .split(/\s+/)
      .filter((word) => word.length > 0).length;
  };

  if (loading) {
    return (
      <DashboardLayout title="Grade Submission">
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </DashboardLayout>
    );
  }

  if (!result) {
    return (
      <DashboardLayout title="Grade Submission">
        <div className="text-center py-12">
          <h3 className="text-2xl font-bold text-gray-800 mb-4">
            Submission Not Found
          </h3>
          <button
            onClick={() => navigate("/pending-reviews")}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Back to Pending Reviews
          </button>
        </div>
      </DashboardLayout>
    );
  }

  const overallBand = calculateOverallBand();

  // Helper for display title
  const getModuleDisplay = () => {
    if (!result?.module) return "Submission";
    return result.module.charAt(0).toUpperCase() + result.module.slice(1);
  };

  return (
    <DashboardLayout title={`Grade ${getModuleDisplay()}`}>
      {/* Header */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">
              {getModuleDisplay()} Submission
            </h2>
            <p className="text-gray-600 mt-1">
              Student: {result.userId?.firstName} {result.userId?.lastName}
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-600">Overall Band Score</p>
            <p className="text-4xl font-bold text-blue-600">
              {overallBand.toFixed(1)}
            </p>
          </div>
        </div>

        {/* Test Info */}
        <div className="flex items-center gap-6 text-sm text-gray-600">
          <div>
            <span className="font-medium">Test:</span> {result.testId?.title}
          </div>
          <div>
            <span className="font-medium">Submitted:</span>{" "}
            {new Date(result.createdAt).toLocaleString()}
          </div>
          <div>
            <span className="font-medium">Status:</span>{" "}
            {result.bandScore ? (
              <span className="text-green-600">✅ Graded</span>
            ) : (
              <span className="text-orange-600">⏳ Pending</span>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column - Student's Work */}
        <div className="space-y-6">
          {/* Essay/Recording Display */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-xl font-bold text-gray-800 mb-4">
              {isWriting === "Student Essay"}
            </h3>

            {answers.length > 0 && (
              <div>
                {answers.map((answer, index) => (
                  <div key={answer._id} className="mb-6">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-semibold text-gray-700">
                        Task {index + 1}
                      </h4>
                      <span className="text-sm text-gray-600">
                        {countWords(answer.userAnswer || "")} words
                      </span>
                    </div>
                    <div className="p-4 bg-gray-50 rounded border border-gray-200 min-h-[100px] whitespace-pre-wrap font-serif text-base leading-relaxed">
                      {answer.userAnswer || "(No answer provided)"}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* {isSpeaking && (
              <div className="space-y-4">
                <p className="text-gray-600 mb-4">
                  Listen to the student's speaking recording:
                </p>
                {answers.length > 0 ? (
                  answers.map((answer, index) => (
                    <div key={answer._id || index} className="mb-4">
                      <h4 className="font-semibold text-gray-700 mb-2">
                        Part {index + 1}
                      </h4>
                      {answer.userAnswer &&
                      answer.userAnswer.startsWith("http") ? (
                        <audio controls className="w-full">
                          <source src={answer.userAnswer} type="audio/mpeg" />
                          Your browser does not support the audio element.
                        </audio>
                      ) : (
                        <p className="text-gray-500 italic">
                          No recording available
                        </p>
                      )}
                    </div>
                  ))
                ) : (
                  <p className="text-gray-500 italic">No recordings found</p>
                )}
              </div>
            )} */}
          </div>
        </div>

        {/* Right Column - Grading */}
        <div className="space-y-6">
          {/* Rubric */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-xl font-bold text-gray-800 mb-6">
              Grading Rubric
            </h3>

            {!isWriting && (
              <div className="mb-6 p-4 bg-blue-50 rounded-lg">
                <label className="block text-gray-700 font-bold mb-2">
                  Overall Band Score Override
                </label>
                <div className="flex items-center gap-4">
                  <input
                    type="number"
                    min="0"
                    max="9"
                    step="0.5"
                    value={manualBandScore}
                    onChange={(e) =>
                      setManualBandScore(parseFloat(e.target.value) || 0)
                    }
                    className="w-24 p-2 border border-blue-300 rounded text-xl font-bold text-center focus:border-blue-500 focus:outline-none"
                  />
                  <span className="text-gray-600 text-sm">(0.0 - 9.0)</span>
                </div>
                <p className="text-sm text-gray-500 mt-2">
                  Manually enter the final band score for this {result.module}{" "}
                  test.
                </p>
              </div>
            )}

            {isWriting && (
              <div>
                <RubricSlider
                  criterion="Task Achievement"
                  value={writingScores.taskAchievement}
                  onChange={(val) =>
                    setWritingScores({ ...writingScores, taskAchievement: val })
                  }
                  description="How well does the response address the task?"
                />
                <RubricSlider
                  criterion="Coherence & Cohesion"
                  value={writingScores.coherenceCohesion}
                  onChange={(val) =>
                    setWritingScores({
                      ...writingScores,
                      coherenceCohesion: val,
                    })
                  }
                  description="Is the writing organized and easy to follow?"
                />
                <RubricSlider
                  criterion="Lexical Resource"
                  value={writingScores.lexicalResource}
                  onChange={(val) =>
                    setWritingScores({ ...writingScores, lexicalResource: val })
                  }
                  description="Range and accuracy of vocabulary"
                />
                <RubricSlider
                  criterion="Grammatical Range & Accuracy"
                  value={writingScores.grammaticalRange}
                  onChange={(val) =>
                    setWritingScores({
                      ...writingScores,
                      grammaticalRange: val,
                    })
                  }
                  description="Variety and accuracy of grammar structures"
                />
              </div>
            )}

            {/* {isSpeaking && (
              <div>
                <RubricSlider
                  criterion="Fluency & Coherence"
                  value={speakingScores.fluencyCoherence}
                  onChange={(val) =>
                    setSpeakingScores({
                      ...speakingScores,
                      fluencyCoherence: val,
                    })
                  }
                  description="Smoothness and logical flow of speech"
                />
                <RubricSlider
                  criterion="Lexical Resource"
                  value={speakingScores.lexicalResource}
                  onChange={(val) =>
                    setSpeakingScores({
                      ...speakingScores,
                      lexicalResource: val,
                    })
                  }
                  description="Range and accuracy of vocabulary"
                />
                <RubricSlider
                  criterion="Grammatical Range & Accuracy"
                  value={speakingScores.grammaticalRange}
                  onChange={(val) =>
                    setSpeakingScores({
                      ...speakingScores,
                      grammaticalRange: val,
                    })
                  }
                  description="Variety and accuracy of grammar"
                />
                <RubricSlider
                  criterion="Pronunciation"
                  value={speakingScores.pronunciation}
                  onChange={(val) =>
                    setSpeakingScores({ ...speakingScores, pronunciation: val })
                  }
                  description="Clarity and ease of understanding"
                />
              </div>
            )} */}
          </div>

          {/* Feedback */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-xl font-bold text-gray-800 mb-4">
              Teacher Feedback
            </h3>
            <textarea
              value={gradingNotes}
              onChange={(e) => setGradingNotes(e.target.value)}
              placeholder="Provide constructive feedback for the student..."
              className="w-full h-40 p-4 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none resize-none"
            />
            <p className="text-sm text-gray-600 mt-2">
              {gradingNotes.length} characters
            </p>
          </div>

          {/* Actions */}
          <div className="flex gap-4">
            <button
              onClick={() => navigate("/pending-reviews")}
              className="flex-1 px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 font-semibold"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmitGrade}
              disabled={submitting}
              className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? "Submitting..." : "✓ Submit Grade"}
            </button>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default GradeResult;
