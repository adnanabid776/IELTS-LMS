import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "../components/Layout/DashboardLayout";
import { getTeacherPendingReviews } from "../services/api";
import { toast } from "react-toastify";

const PendingReviews = () => {
  const navigate = useNavigate();
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all"); // all, writing

  useEffect(() => {
    fetchPendingReviews();
  }, []);

  const fetchPendingReviews = async () => {
    try {
      setLoading(true);
      const data = await getTeacherPendingReviews();
      setReviews(data.reviews || []);
    } catch (error) {
      console.error("Fetch pending reviews error:", error);
      toast.error("Failed to load pending reviews");
    } finally {
      setLoading(false);
    }
  };

  const handleGradeNow = (review) => {
    navigate(`/grade-result/${review.resultId}`);
  };

  const getModuleIcon = (module) => {
    switch (module) {
      case "writing":
        return "📝";
      case "reading":
        return "📖";
      case "listening":
        return "🎧";
      default:
        return "📄";
    }
  };

  const getModuleColor = (module) => {
    switch (module) {
      case "writing":
        return "bg-purple-100 text-purple-800";
      case "reading":
        return "bg-blue-100 text-blue-800";
      case "listening":
        return "bg-green-100 text-green-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getTimeAgo = (date) => {
    const seconds = Math.floor((new Date() - new Date(date)) / 1000);

    if (seconds < 60) return "Just now";
    if (seconds < 3600) return `${Math.floor(seconds / 60)} minutes ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`;
    return `${Math.floor(seconds / 86400)} days ago`;
  };

  const filteredReviews =
    filter === "all" ? reviews : reviews.filter((r) => r.testModule === filter);

  if (loading) {
    return (
      <DashboardLayout title="Pending Reviews">
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Pending Reviews">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-2">
          Pending Reviews ({filteredReviews.length})
        </h2>
        <p className="text-gray-600">
          Grade student submissions that are waiting for your review
        </p>
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-6">
        <button
          onClick={() => setFilter("all")}
          className={`px-4 py-2 rounded-lg font-medium transition ${
            filter === "all"
              ? "bg-blue-600 text-white"
              : "bg-gray-200 text-gray-700 hover:bg-gray-300"
          }`}
        >
          All ({reviews.length})
        </button>
        <button
          onClick={() => setFilter("writing")}
          className={`px-4 py-2 rounded-lg font-medium transition ${
            filter === "writing"
              ? "bg-purple-600 text-white"
              : "bg-gray-200 text-gray-700 hover:bg-gray-300"
          }`}
        >
          📝 Writing ({reviews.filter((r) => r.testModule === "writing").length}
          )
        </button>
      </div>

      {/* Reviews List */}
      {filteredReviews.length > 0 ? (
        <div className="space-y-4">
          {filteredReviews.map((review) => (
            <div
              key={review.resultId}
              className="bg-white rounded-lg shadow hover:shadow-lg transition p-6 border-l-4 border-blue-500"
            >
              <div className="flex items-start justify-between">
                {/* Left side - Info */}
                <div className="flex-1">
                  {/* Module Badge */}
                  <div className="flex items-center gap-3 mb-3">
                    <span
                      className={`px-3 py-1 rounded-full text-sm font-semibold ${getModuleColor(review.testModule)}`}
                    >
                      {getModuleIcon(review.testModule)}{" "}
                      {review.testModule.toUpperCase()}
                    </span>
                    <span className="text-sm text-gray-500">
                      {getTimeAgo(review.submittedAt)}
                    </span>
                  </div>

                  {/* Test Title */}
                  <h3 className="text-xl font-bold text-gray-800 mb-2">
                    {review.testTitle}
                  </h3>

                  {/* Student Info */}
                  <div className="flex items-center gap-2 text-gray-600 mb-2">
                    <span className="font-medium">Student:</span>
                    <span>
                      {review.student.firstName} {review.student.lastName}
                    </span>
                    <span className="text-gray-400">•</span>
                    <span className="text-sm">{review.student.email}</span>
                  </div>

                  {/* Submission Date */}
                  <div className="text-sm text-gray-500">
                    Submitted: {new Date(review.submittedAt).toLocaleString()}
                  </div>
                </div>

                {/* Right side - Action */}
                <div className="ml-6">
                  <button
                    onClick={() => handleGradeNow(review)}
                    className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold transition shadow-md hover:shadow-lg"
                  >
                    Grade Now →
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        // Empty State
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-5xl">✅</span>
          </div>
          <h3 className="text-2xl font-bold text-gray-800 mb-2">
            All Caught Up!
          </h3>
          <p className="text-gray-600 mb-6">
            {filter === "all"
              ? "No pending reviews at the moment."
              : `No pending ${filter} reviews.`}
          </p>
          {filter !== "all" && (
            <button
              onClick={() => setFilter("all")}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              View All Reviews
            </button>
          )}
        </div>
      )}
    </DashboardLayout>
  );
};

export default PendingReviews;
