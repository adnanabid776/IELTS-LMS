import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "../components/Layout/DashboardLayout";
import { getAllMockResults } from "../services/api";
import { toast } from "react-toastify";

const MockResultsList = () => {
  const navigate = useNavigate();
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("pending"); // pending, completed, all

  useEffect(() => {
    fetchResults();
  }, []);

  const fetchResults = async () => {
    try {
      setLoading(true);
      const data = await getAllMockResults();
      setResults(data || []);
    } catch (error) {
      console.error("Fetch mock results error:", error);
      toast.error("Failed to load mock results");
    } finally {
      setLoading(false);
    }
  };

  const filteredResults = results.filter((r) => {
    if (filter === "pending") return r.status === "pending_evaluation";
    if (filter === "completed") return r.status === "completed";
    return true;
  });

  const getStatusBadge = (status) => {
    switch (status) {
      case "in-progress":
        return (
          <span className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs font-semibold">
            ⏳ In Progress
          </span>
        );
      case "pending_evaluation":
        return (
          <span className="px-3 py-1 bg-orange-100 text-orange-800 rounded-full text-xs font-semibold">
            📋 Pending Evaluation
          </span>
        );
      case "completed":
        return (
          <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-xs font-semibold">
            ✅ Completed
          </span>
        );
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <DashboardLayout title="Mock Evaluations">
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Mock Evaluations">
      <div className="max-w-6xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-800 mb-2">
            🎯 Mock Exam Evaluations ({filteredResults.length})
          </h2>
          <p className="text-gray-600">
            Review and grade student mock exam submissions (Writing + Speaking)
          </p>
        </div>

        {/* Filters */}
        <div className="flex gap-3 mb-6">
          {["pending", "completed", "all"].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-lg font-medium transition ${
                filter === f
                  ? "bg-indigo-600 text-white"
                  : "bg-gray-200 text-gray-700 hover:bg-gray-300"
              }`}
            >
              {f === "pending"
                ? `📋 Pending (${results.filter((r) => r.status === "pending_evaluation").length})`
                : f === "completed"
                ? `✅ Completed (${results.filter((r) => r.status === "completed").length})`
                : `All (${results.length})`}
            </button>
          ))}
        </div>

        {/* Results List */}
        {filteredResults.length > 0 ? (
          <div className="space-y-4">
            {filteredResults.map((result) => (
              <div
                key={result._id}
                className="bg-white rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition p-5"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      {getStatusBadge(result.status)}
                      <span className="text-sm text-gray-500">
                        {new Date(result.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <h3 className="text-lg font-bold text-gray-800">
                      {result.mockExamId?.title || "Mock Exam"}
                    </h3>
                    <p className="text-gray-600 text-sm mt-1">
                      Student: {result.userId?.name || result.userId?.email || "Unknown"}
                    </p>
                    {/* Band Scores Summary */}
                    <div className="flex gap-4 mt-3 text-sm">
                      <span className="text-purple-600">
                        🎧 L: {result.listeningBand !== null ? result.listeningBand : "—"}
                      </span>
                      <span className="text-blue-600">
                        📖 R: {result.readingBand !== null ? result.readingBand : "—"}
                      </span>
                      <span className="text-green-600">
                        ✍️ W: {result.writingBand !== null ? result.writingBand : "—"}
                      </span>
                      <span className="text-orange-600">
                        🗣️ S: {result.speakingBand !== null ? result.speakingBand : "—"}
                      </span>
                      {result.overallBand !== null && (
                        <span className="text-indigo-700 font-bold">
                          Overall: {result.overallBand}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="ml-4">
                    {result.status === "pending_evaluation" ? (
                      <button
                        onClick={() => navigate(`/mock-evaluate/${result._id}`)}
                        className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg hover:from-indigo-700 hover:to-purple-700 font-semibold transition shadow-md"
                      >
                        Evaluate →
                      </button>
                    ) : result.status === "completed" ? (
                      <button
                        onClick={() => navigate(`/mock-evaluate/${result._id}`)}
                        className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-semibold transition"
                      >
                        View →
                      </button>
                    ) : null}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm p-12 text-center">
            <p className="text-5xl mb-4">✅</p>
            <h3 className="text-xl font-bold text-gray-800 mb-2">
              {filter === "pending" ? "No Pending Evaluations" : "No Results Found"}
            </h3>
            <p className="text-gray-500">
              {filter === "pending"
                ? "All mock exams have been evaluated!"
                : "No mock exam results match your filter."}
            </p>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default MockResultsList;
