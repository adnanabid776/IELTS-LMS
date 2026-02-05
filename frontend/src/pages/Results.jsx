import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getResultById } from "../services/api";
import { toast } from "react-toastify";
import DashboardLayout from "../components/Layout/DashboardLayout";

const Results = () => {
  const { resultId } = useParams();
  const navigate = useNavigate();

  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchResult();
  }, [resultId]);

  const fetchResult = async () => {
    try {
      setLoading(true);
      const response = await getResultById(resultId);
      setResult(response.result);
    } catch (error) {
      console.error("Fetch result error:", error);
      toast.error("Failed to load results");
    } finally {
      setLoading(false);
    }
  };

  const getBandColor = (band) => {
    if (!band) return "text-gray-600"; // ← FIX: Handle null
    if (band >= 7) return "text-green-600";
    if (band >= 5) return "text-yellow-600";
    return "text-red-600";
  };

  const getBandBgColor = (band) => {
    if (!band) return "bg-gray-100"; // ← FIX: Handle null
    if (band >= 7) return "bg-green-100";
    if (band >= 5) return "bg-yellow-100";
    return "bg-red-100";
  };

  if (loading) {
    return (
      <DashboardLayout title="Test Results">
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </DashboardLayout>
    );
  }

  if (!result) {
    return (
      <DashboardLayout title="Test Results">
        <div className="text-center py-12">
          <h3 className="text-2xl font-bold text-gray-800 mb-4">
            Result Not Found
          </h3>
          <button
            onClick={() => navigate("/dashboard")}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Back to Dashboard
          </button>
        </div>
      </DashboardLayout>
    );
  }

  // ============================================
  // FIX: Check if manual grading is pending
  // ============================================
  const isPendingGrading = result.isManuallyGraded && !result.bandScore;

  return (
    <DashboardLayout title="Test Results">
      {/* Hero Section - Band Score OR Pending Message */}
      {isPendingGrading ? (
        // ============================================
        // PENDING GRADING MESSAGE (Writing/Speaking)
        // ============================================
        <div className="bg-yellow-50 border-2 border-yellow-300 rounded-lg p-8 mb-6 text-center">
          <div className="text-6xl mb-4">⏳</div>
          <h2 className="text-3xl font-bold text-gray-800 mb-2">
            Test Submitted Successfully!
          </h2>
          <p className="text-gray-600 mb-4">
            Your {result.module} test is being reviewed by your teacher.
          </p>
          <div className="bg-white rounded-lg p-4 inline-block">
            <p className="text-sm text-gray-600 mb-1">Status</p>
            <p className="text-lg font-bold text-yellow-600">
              Pending Teacher Review
            </p>
          </div>
        </div>
      ) : (
        // ============================================
        // GRADED RESULT (Reading/Listening or Graded Writing/Speaking)
        // ============================================
        <div
          className={`${getBandBgColor(result.bandScore)} rounded-lg p-8 mb-6 text-center`}
        >
          <h2 className="text-3xl font-bold text-gray-800 mb-2">
            🎉 Test Completed!
          </h2>
          <p className="text-gray-600 mb-6">Great job on completing the test!</p>

          <div className="inline-block">
            <p className="text-sm text-gray-600 mb-2">Your Band Score</p>
            <div
              className={`text-7xl font-bold ${getBandColor(result.bandScore)}`}
            >
              {result.bandScore || "—"}
            </div>
            <p className="text-sm text-gray-500 mt-2">out of 9.0</p>
          </div>

          {/* Show grading details for Writing/Speaking if graded */}
          {result.isManuallyGraded && result.bandScore && (
            <div className="mt-6 bg-white rounded-lg p-4">
              <p className="text-sm text-gray-600 font-semibold mb-2">
                Graded by Teacher
              </p>
              {result.gradingNotes && (
                <p className="text-sm text-gray-700 italic">
                  "{result.gradingNotes}"
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Performance Overview - Only show if auto-graded OR graded by teacher */}
      {!isPendingGrading && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-gray-500 text-sm mb-1">Total Questions</p>
            <p className="text-3xl font-bold text-gray-800">
              {result.totalQuestions}
            </p>
          </div>

          {/* Only show these for auto-graded tests */}
          {!result.isManuallyGraded && (
            <>
              <div className="bg-white rounded-lg shadow p-6">
                <p className="text-gray-500 text-sm mb-1">Correct Answers</p>
                <p className="text-3xl font-bold text-green-600">
                  {result.correctAnswers || 0}
                </p>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <p className="text-gray-500 text-sm mb-1">Incorrect</p>
                <p className="text-3xl font-bold text-red-600">
                  {result.incorrectAnswers || 0}
                </p>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <p className="text-gray-500 text-sm mb-1">Accuracy</p>
                <p className="text-3xl font-bold text-blue-600">
                  {result.percentage || 0}%
                </p>
              </div>
            </>
          )}

          {/* Show module-specific scores for Writing/Speaking if graded */}
          {result.isManuallyGraded && result.writingScores && (
            <>
              <div className="bg-white rounded-lg shadow p-6">
                <p className="text-gray-500 text-xs mb-1">Task Achievement</p>
                <p className="text-2xl font-bold text-blue-600">
                  {result.writingScores.taskAchievement}
                </p>
              </div>
              <div className="bg-white rounded-lg shadow p-6">
                <p className="text-gray-500 text-xs mb-1">Coherence & Cohesion</p>
                <p className="text-2xl font-bold text-blue-600">
                  {result.writingScores.coherenceCohesion}
                </p>
              </div>
              <div className="bg-white rounded-lg shadow p-6">
                <p className="text-gray-500 text-xs mb-1">Lexical Resource</p>
                <p className="text-2xl font-bold text-blue-600">
                  {result.writingScores.lexicalResource}
                </p>
              </div>
            </>
          )}

          {result.isManuallyGraded && result.speakingScores && (
            <>
              <div className="bg-white rounded-lg shadow p-6">
                <p className="text-gray-500 text-xs mb-1">Fluency & Coherence</p>
                <p className="text-2xl font-bold text-blue-600">
                  {result.speakingScores.fluencyCoherence}
                </p>
              </div>
              <div className="bg-white rounded-lg shadow p-6">
                <p className="text-gray-500 text-xs mb-1">Pronunciation</p>
                <p className="text-2xl font-bold text-blue-600">
                  {result.speakingScores.pronunciation}
                </p>
              </div>
            </>
          )}
        </div>
      )}

      {/* Question Type Breakdown - Only for auto-graded */}
      {!result.isManuallyGraded &&
        result.questionTypeBreakdown &&
        result.questionTypeBreakdown.length > 0 && (
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h3 className="text-xl font-bold text-gray-800 mb-4">
              📊 Question Type Breakdown
            </h3>
            <div className="space-y-4">
              {result.questionTypeBreakdown.map((type, index) => (
                <div key={index}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-gray-700 font-medium capitalize">
                      {type.type.replace(/-/g, " ")}
                    </span>
                    <span className="text-gray-600">
                      {type.correct}/{type.total} ({type.percentage}%)
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div
                      className={`h-3 rounded-full ${
                        type.percentage >= 70
                          ? "bg-green-500"
                          : type.percentage >= 50
                            ? "bg-yellow-500"
                            : "bg-red-500"
                      }`}
                      style={{ width: `${type.percentage}%` }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      {/* Weak Areas - Only for auto-graded */}
      {!result.isManuallyGraded &&
        result.weakAreas &&
        result.weakAreas.length > 0 && (
          <div className="bg-red-50 border-l-4 border-red-600 rounded-lg p-6 mb-6">
            <h3 className="text-xl font-bold text-red-900 mb-4">
              ⚠️ Areas to Improve
            </h3>
            <ul className="list-disc list-inside space-y-2">
              {result.weakAreas.map((area, index) => (
                <li key={index} className="text-red-800 capitalize">
                  {area.replace(/-/g, " ")}
                </li>
              ))}
            </ul>
          </div>
        )}

      {/* Recommendations */}
      {result.recommendations && result.recommendations.length > 0 && (
        <div className="bg-blue-50 border-l-4 border-blue-600 rounded-lg p-6 mb-6">
          <h3 className="text-xl font-bold text-blue-900 mb-4">
            💡 Recommendations
          </h3>
          <ul className="list-disc list-inside space-y-2">
            {result.recommendations.map((rec, index) => (
              <li key={index} className="text-blue-800">
                {rec}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Action Buttons */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex flex-wrap gap-4 justify-center">
          {!isPendingGrading && (
            <button
              onClick={() => navigate(`/answer-review/${resultId}`)}
              className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-semibold"
            >
              📝 View Answers
            </button>
          )}
          <button
            onClick={() => navigate("/tests")}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold"
          >
            Browse More Tests
          </button>
          <button
            onClick={() => navigate("/history")}
            className="px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 font-semibold"
          >
            View Test History
          </button>
          <button
            onClick={() => navigate("/dashboard")}
            className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Results;