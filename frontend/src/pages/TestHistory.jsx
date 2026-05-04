import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getUserResults } from "../services/api";
import { getMyMockResults, deleteMockResult } from "../services/mockApi";
import { toast } from "react-toastify";
import DashboardLayout from "../components/Layout/DashboardLayout";

const TestHistory = () => {
  const navigate = useNavigate();

  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedModule, setSelectedModule] = useState("all");

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const resultsPerPage = 10;

  useEffect(() => {
    fetchResults();
  }, [selectedModule]);

  const fetchResults = async () => {
    try {
      setLoading(true);
      if (selectedModule === "mock") {
        const mockResults = await getMyMockResults();
        // Transform mock results to match the table structure
        const transformedResults = mockResults.map((mr) => ({
          _id: mr._id,
          testId: { title: mr.mockExamId?.title || "Mock Exam" },
          module: "mock",
          createdAt: mr.createdAt,
          bandScore: mr.overallBand,
          status: mr.status,
          listeningBand: mr.listeningBand,
          readingBand: mr.readingBand,
          writingBand: mr.writingBand,
          speakingBand: mr.speakingBand,
        }));
        setResults(transformedResults);
      } else {
        const module = selectedModule === "all" ? null : selectedModule;
        const response = await getUserResults(module);
        setResults(response.results || []);
      }
    } catch (error) {
      console.error("Fetch results error: ", error);
      toast.error("Failed to load test history");
    } finally {
      setLoading(false);
    }
  };

  const handleViewResult = (resultId, module) => {
    if (module === "mock") {
      navigate(`/mock-results/${resultId}`);
    } else {
      navigate(`/results/${resultId}`);
    }
  };

  const handleDeleteMock = async (resultId) => {
    if (window.confirm("Are you sure you want to delete this mock exam result? This action cannot be undone.")) {
      try {
        await deleteMockResult(resultId);
        toast.success("Mock result deleted successfully");
        fetchResults(); // Refresh list
      } catch (error) {
        console.error("Delete mock error:", error);
        toast.error("Failed to delete mock result");
      }
    }
  };
  const getBandColor = (band) => {
    if (band >= 7) {
      return "text-green-600";
    } else if (band >= 5) {
      return "text-yellow-600";
    } else {
      return "text-red-600";
    }
  };
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  // Pagination calculations
  const totalPages = Math.ceil(results.length / resultsPerPage);
  const indexOfLastResult = currentPage * resultsPerPage;
  const indexOfFirstResult = indexOfLastResult - resultsPerPage;
  const currentResults = results.slice(indexOfFirstResult, indexOfLastResult);

  // Reset to page 1 when module filter changes
  const handleModuleChange = (module) => {
    setSelectedModule(module);
    setCurrentPage(1);
  };

  return (
    <DashboardLayout title="Test History">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-2">
          My Test History
        </h2>
        <p className="text-gray-600">
          View all your past test attempts and results
        </p>
      </div>
      {/* filtering system to filter out the type of module of tests.*/}
      <div className="flex flex-wrap gap-3 mb-7">
        <button
          onClick={() => handleModuleChange("all")}
          className={`px-4 py-2 rounded-lg font-medium transition ${
            selectedModule === "all"
              ? "bg-blue-600 text-white"
              : "bg-gray-200 text-gray-700 hover:bg-gray-300"
          }`}
        >
          All Modules
        </button>
        <button
          onClick={() => handleModuleChange("reading")}
          className={`px-4 py-2 rounded-lg font-medium transition ${
            selectedModule === "reading"
              ? "bg-blue-600 text-white"
              : "bg-gray-200 text-gray-700 hover:bg-gray-300"
          }`}
        >
          📖 Reading
        </button>
        <button
          onClick={() => handleModuleChange("listening")}
          className={`px-4 py-2 rounded-lg font-medium transition ${
            selectedModule === "listening"
              ? "bg-blue-600 text-white"
              : "bg-gray-200 text-gray-700 hover:bg-gray-300"
          }`}
        >
          🎧 Listening
        </button>
        <button
          onClick={() => handleModuleChange("writing")}
          className={`px-4 py-2 rounded-lg font-medium transition ${
            selectedModule === "writing"
              ? "bg-blue-600 text-white"
              : "bg-gray-200 text-gray-700 hover:bg-gray-300"
          }`}
        >
          ✍️ Writing
        </button>
        <button
          onClick={() => handleModuleChange("mock")}
          className={`px-4 py-2 rounded-lg font-medium transition ${
            selectedModule === "mock"
              ? "bg-orange-600 text-white"
              : "bg-gray-200 text-gray-700 hover:bg-gray-300"
          }`}
        >
          🎓 Full Mock Exams
        </button>
      </div>
      {/* Results Count & Pagination Info */}
      {!loading && results.length > 0 && (
        <div className="flex justify-between items-center mb-4">
          <p className="text-gray-600 text-sm">
            Showing {indexOfFirstResult + 1}-
            {Math.min(indexOfLastResult, results.length)} of {results.length}{" "}
            results
          </p>
        </div>
      )}
      {/* Results Table */}
      {!loading && results.length > 0 && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Sr.
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Test Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Module
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Score
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Band
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {currentResults.map((result, index) => (
                  <tr key={result._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {indexOfFirstResult + index + 1}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {result.testId?.title || "Unknown Test"}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <span
                        className={`px-2 py-1 rounded text-xs font-semibold ${
                          result.module === "reading"
                            ? "bg-blue-100 text-blue-800"
                            : result.module === "listening"
                              ? "bg-green-100 text-green-800"
                              : result.module === "writing"
                                ? "bg-purple-100 text-purple-800"
                                : result.module === "mock"
                                  ? "bg-orange-100 text-orange-800"
                                  : "bg-gray-100 text-gray-800"
                        }`}
                      >
                        {result.module.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {formatDate(result.createdAt)}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {result.module === "mock" ? (
                        <div className="flex flex-col gap-1 text-xs">
                          <span>L: {result.listeningBand || "-"}</span>
                          <span>R: {result.readingBand || "-"}</span>
                          <span>W: {result.writingBand || "-"}</span>
                          <span>S: {result.speakingBand || "-"}</span>
                        </div>
                      ) : result.module === "reading" ||
                        result.module === "listening" ? (
                        // Auto-graded: show correctAnswers/totalQuestions (percentage%)
                        <>
                          {result.correctAnswers}/{result.totalQuestions} (
                          {result.percentage || 0}%)
                        </>
                      ) : // Manual graded (writing/speaking): show just percentage or pending
                      result.bandScore != null ? (
                        <span className="text-purple-600 font-medium">
                          {result.percentage || 0}%
                        </span>
                      ) : (
                        <span className="text-orange-500 italic">Pending</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <span
                        className={`font-bold text-lg ${getBandColor(result.bandScore)}`}
                      >
                        {result.module === "mock" && result.bandScore === null ? (
                          <span className="text-sm font-normal italic text-orange-500">Pending</span>
                        ) : (
                          result.bandScore
                        )}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleViewResult(result._id, result.module)}
                          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-semibold whitespace-nowrap"
                        >
                          View Details
                        </button>
                        {result.module === "mock" && (
                          <button
                            onClick={() => handleDeleteMock(result._id)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors shadow-sm border border-red-100"
                            title="Delete Mock Result"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Pagination Controls */}
      {!loading && results.length > 0 && totalPages > 1 && (
        <div className="mt-6 flex items-center justify-between bg-white rounded-lg shadow px-6 py-4">
          <div className="text-sm text-gray-600">
            Page {currentPage} of {totalPages}
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setCurrentPage(1)}
              disabled={currentPage === 1}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition ${
                currentPage === 1
                  ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                  : "bg-gray-200 text-gray-700 hover:bg-gray-300"
              }`}
            >
              First
            </button>
            <button
              onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                currentPage === 1
                  ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                  : "bg-gray-200 text-gray-700 hover:bg-gray-300"
              }`}
            >
              ← Previous
            </button>

            {/* Page numbers */}
            <div className="flex gap-1">
              {[...Array(Math.min(5, totalPages))].map((_, i) => {
                let pageNum;
                if (totalPages <= 5) {
                  pageNum = i + 1;
                } else if (currentPage <= 3) {
                  pageNum = i + 1;
                } else if (currentPage >= totalPages - 2) {
                  pageNum = totalPages - 4 + i;
                } else {
                  pageNum = currentPage - 2 + i;
                }

                return (
                  <button
                    key={pageNum}
                    onClick={() => setCurrentPage(pageNum)}
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition ${
                      currentPage === pageNum
                        ? "bg-blue-600 text-white"
                        : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}
            </div>

            <button
              onClick={() =>
                setCurrentPage((prev) => Math.min(prev + 1, totalPages))
              }
              disabled={currentPage === totalPages}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                currentPage === totalPages
                  ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                  : "bg-gray-200 text-gray-700 hover:bg-gray-300"
              }`}
            >
              Next →
            </button>
            <button
              onClick={() => setCurrentPage(totalPages)}
              disabled={currentPage === totalPages}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition ${
                currentPage === totalPages
                  ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                  : "bg-gray-200 text-gray-700 hover:bg-gray-300"
              }`}
            >
              Last
            </button>
          </div>
        </div>
      )}
      {/* Empty State */}
      {!loading && results.length === 0 && (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-5xl">📊</span>
          </div>
          <h3 className="text-2xl font-bold text-gray-800 mb-2">
            No Test History Yet
          </h3>
          <p className="text-gray-600 mb-6">
            {selectedModule === "all"
              ? "You haven't taken any tests yet. Start practicing now!"
              : `No ${selectedModule} tests taken yet.`}
          </p>
          <button
            onClick={() => navigate("/tests")}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold"
          >
            Browse Tests
          </button>
        </div>
      )}
    </DashboardLayout>
  );
};

export default TestHistory;
