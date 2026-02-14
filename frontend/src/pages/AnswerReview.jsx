import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getDetailedResult } from "../services/api";
import { toast } from "react-toastify";
import DashboardLayout from "../components/Layout/DashboardLayout";

const AnswerReview = () => {
  const navigate = useNavigate();
  const { resultId } = useParams();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  useEffect(() => {
    fetchDetailedResult();
  }, [resultId]);

  //fetch result detail function
  const fetchDetailedResult = async () => {
    try {
      setLoading(true);
      const response = await getDetailedResult(resultId);
      setData(response);
    } catch (error) {
      console.error("Fetch result detail error: ", error);
      toast.error("Failed to fetch result detail!");
    } finally {
      setLoading(false);
    }
  };
  if (loading) {
    return (
      <DashboardLayout title="Answer Review">
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </DashboardLayout>
    );
  }
  if (!data) {
    return (
      <DashboardLayout title="Answer Review">
        <div className="text-center py-12">
          <h3 className="text-2xl font-bold text-gray-800 mb-4">
            Data Not Found
          </h3>
          <button
            onClick={() => navigate("/history")}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Back to History
          </button>
        </div>
      </DashboardLayout>
    );
  }
  const { result, answerReview } = data;

  // Pagination Logic
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = answerReview
    ? answerReview.slice(indexOfFirstItem, indexOfLastItem)
    : [];
  const totalPages = answerReview
    ? Math.ceil(answerReview.length / itemsPerPage)
    : 0;

  const handlePageChange = (pageNumber) => {
    setCurrentPage(pageNumber);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const formatAnswer = (answer) => {
    if (!answer) return "Not answered";
    if (typeof answer === "object") {
      try {
        return Object.entries(answer)
          .map(([key, value]) => `${key} → ${value}`)
          .join(", ");
      } catch (error) {
        console.warn("Format answer error:", error);
        return JSON.stringify(answer);
      }
    }
    return answer;
  };

  const normalizeAnswer = (answer) => {
    if (!answer) return "";
    return answer
      .toString()
      .toLowerCase()
      .trim()
      .replace(/^(the|a|an)\s+/i, "")
      .replace(/\s+/g, " ")
      .replace(/[.,;!?]/g, "");
  };

  return (
    <DashboardLayout title="Answer Review">
      {/* Header */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">
              {result.testId?.title}
            </h2>
            <p className="text-gray-600">
              Score: {result.correctAnswers}/{result.totalQuestions} (
              {result.percentage}%) • Band:{" "}
              <span className="font-bold text-blue-600">
                {result.bandScore}
              </span>
            </p>
          </div>
          <button
            onClick={() => navigate(`/results/${resultId}`)}
            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
          >
            Back to Results
          </button>
        </div>
      </div>

      {/* Answer Review */}
      <div className="space-y-4">
        {currentItems.map((item, index) => (
          <div
            key={index}
            className={`bg-white rounded-lg shadow p-6 border-l-4 ${
              item.isCorrect
                ? "border-green-500"
                : item.isPartial
                  ? "border-yellow-500"
                  : "border-red-500"
            }`}
          >
            {/* Question */}
            <div className="flex items-start gap-3 mb-4">
              <span
                className={`px-3 py-1 rounded-full text-sm font-bold ${
                  item.isCorrect
                    ? "bg-green-100 text-green-800"
                    : item.isPartial
                      ? "bg-yellow-100 text-yellow-800"
                      : "bg-red-100 text-red-800"
                }`}
              >
                {item.isCorrect ? "✓" : item.isPartial ? "⚠" : "✗"}
                {item.maxScore > 1 && (
                  <span className="ml-2 text-xs opacity-75">
                    {item.score}/{item.maxScore}
                  </span>
                )}
              </span>
              <div className="flex-1">
                <p className="text-gray-600 text-sm mb-1">
                  Question {item.questionNumber}
                </p>
                <p className="text-gray-800 font-medium text-lg">
                  {item.questionText}
                </p>
                <span className="inline-block mt-2 px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded">
                  {item.questionType.replace(/-/g, " ")}
                </span>
              </div>
            </div>

            {/* Options (if multiple choice) */}
            {item.options && item.options.length > 0 && (
              <div className="mb-4 ml-12">
                <p className="text-sm text-gray-600 mb-2">Options:</p>
                <div className="space-y-1">
                  {item.options.map((option, idx) => (
                    <div
                      key={idx}
                      className={`p-2 rounded ${
                        option === item.correctAnswer
                          ? "bg-green-50 border border-green-300"
                          : option === item.studentAnswer
                            ? "bg-red-50 border border-red-300"
                            : "bg-gray-50"
                      }`}
                    >
                      <span className="text-sm">{option}</span>
                      {option === item.correctAnswer && (
                        <span className="ml-2 text-green-600 text-xs font-semibold">
                          ✓ Correct
                        </span>
                      )}
                      {option === item.studentAnswer && !item.isCorrect && (
                        <span className="ml-2 text-red-600 text-xs font-semibold">
                          Your answer
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Answers Comparison */}
            <div className="ml-12 space-y-3">
              {/* COMPOSITE TYPES (Table, Matching, etc.) */}
              {(item.questionType === "table-completion" ||
                item.questionType === "matching-headings" ||
                item.questionType === "matching-information" ||
                item.questionType === "matching-features" ||
                item.questionType === "map-labeling") &&
              item.items ? (
                <div className="mt-4">
                  <p className="text-sm font-semibold text-gray-700 mb-2">
                    Detailed Answers:
                  </p>
                  <div className="border rounded-lg overflow-hidden text-sm">
                    <table className="w-full">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-3 py-2 text-left border-b">Item</th>
                          <th className="px-3 py-2 text-left border-b">
                            Your Answer
                          </th>
                          <th className="px-3 py-2 text-left border-b">
                            Correct Answer
                          </th>
                          <th className="px-3 py-2 text-center border-b">
                            Status
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {item.items.map((subItem, idx) => {
                          const subLabel = subItem.label || idx + 1;
                          const userVal =
                            typeof item.studentAnswer === "object"
                              ? item.studentAnswer?.[subLabel]
                              : "";
                          const correctVal = subItem.correctAnswer;

                          // Use backend grading result if available, fallback to simple check (legacy support)
                          let isSubCorrect = false;
                          if (
                            item.itemDetails &&
                            item.itemDetails[subLabel] !== undefined
                          ) {
                            isSubCorrect = item.itemDetails[subLabel];
                          } else {
                            // Fallback
                            isSubCorrect =
                              normalizeAnswer(userVal) ===
                              normalizeAnswer(correctVal);
                          }

                          return (
                            <tr
                              key={idx}
                              className={`border-b last:border-0 ${
                                isSubCorrect ? "bg-green-50" : "bg-red-50"
                              }`}
                            >
                              <td className="px-3 py-2 font-medium">
                                {subItem.label || subItem.text}
                              </td>
                              <td className="px-3 py-2 text-gray-700">
                                {userVal || (
                                  <span className="text-gray-400 italic">
                                    Empty
                                  </span>
                                )}
                              </td>
                              <td className="px-3 py-2 text-gray-700 font-medium">
                                {correctVal}
                              </td>
                              <td className="px-3 py-2 text-center">
                                {isSubCorrect ? (
                                  <span className="text-green-600">✓</span>
                                ) : (
                                  <span className="text-red-600">✗</span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                /* SIMPLE TYPES (Multiple Choice, Short Answer, etc.) */
                <>
                  {/* Your Answer */}
                  <div>
                    <p className="text-sm font-semibold text-gray-700 mb-1">
                      Your Answer:
                    </p>
                    <p
                      className={`text-sm px-3 py-2 rounded ${
                        item.isCorrect
                          ? "bg-green-50 text-green-800 border border-green-200"
                          : "bg-red-50 text-red-800 border border-red-200"
                      }`}
                    >
                      {formatAnswer(item.studentAnswer)}
                    </p>
                  </div>

                  {/* Correct Answer (only show if wrong) */}
                  {!item.isCorrect && (
                    <div>
                      <p className="text-sm font-semibold text-gray-700 mb-1">
                        Correct Answer:
                      </p>
                      <p className="text-sm px-3 py-2 bg-green-50 text-green-800 border border-green-200 rounded">
                        {formatAnswer(item.correctAnswer)}
                      </p>
                      {item.alternativeAnswers &&
                        item.alternativeAnswers.length > 0 && (
                          <p className="text-xs text-gray-500 mt-1">
                            Also accepted: {item.alternativeAnswers.join(", ")}
                          </p>
                        )}
                    </div>
                  )}
                </>
              )}

              {/* Explanation (Common) */}
              {item.explanation && (
                <div className="bg-blue-50 border-l-4 border-blue-500 p-3 rounded mt-3">
                  <p className="text-sm font-semibold text-blue-900 mb-1">
                    💡 Explanation:
                  </p>
                  <p className="text-sm text-blue-800">{item.explanation}</p>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Pagination Controls */}
      {answerReview && answerReview.length > itemsPerPage && (
        <div className="flex justify-center items-center mt-8 gap-4">
          <button
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className={`px-4 py-2 rounded-lg border ${
              currentPage === 1
                ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                : "bg-white text-blue-600 hover:bg-blue-50 border-blue-600"
            }`}
          >
            ← Previous
          </button>

          <span className="text-gray-600 font-medium">
            Page {currentPage} of {totalPages}
          </span>

          <button
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            className={`px-4 py-2 rounded-lg border ${
              currentPage === totalPages
                ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                : "bg-white text-blue-600 hover:bg-blue-50 border-blue-600"
            }`}
          >
            Next →
          </button>
        </div>
      )}

      {/* Bottom Actions */}
      <div className="bg-white rounded-lg shadow p-6 mt-6 text-center">
        <button
          onClick={() => navigate("/tests")}
          className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold mr-4"
        >
          Practice More Tests
        </button>
        <button
          onClick={() => navigate("/history")}
          className="px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 font-semibold"
        >
          Back to History
        </button>
      </div>
    </DashboardLayout>
  );
};

export default AnswerReview;
