import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "../components/Layout/DashboardLayout";
import {
  getUserResults,
  getAssignedTests,
  getTeacherDashboardStats,
  getTeacherPendingReviews,
  getAdminDashboardStats,
  getStudentAnalytics,
} from "../services/api";
import { toast } from "react-toastify";
import DashboardCharts from "../components/DashboardCharts";

const Dashboard = () => {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem("user"));

  // Student state
  const [stats, setStats] = useState({
    totalTests: 0,
    averageBand: 0,
    highestBand: 0,
    assignedTests: 0,
    recentResults: [],
    trendData: [],
    moduleData: [],
  });

  // Teacher state
  const [teacherStats, setTeacherStats] = useState({
    totalStudents: 0,
    pendingReviews: 0,
    testsAssigned: 0,
    activeClasses: 0,
  });
  const [pendingReviews, setPendingReviews] = useState([]);

  //admin state
  const [adminStats, setAdminStats] = useState({
    totalUsers: 0,
    students: 0,
    teachers: 0,
    admins: 0,
    totalQuestions: 0,
    totalTests: 0,
    totalAttempts: 0,
    recentUsers: 0,
  });

  const [loading, setLoading] = useState(true);

  // Fetch dashboard data based on role
  useEffect(() => {
    if (user?.role === "student") {
      fetchStudentDashboardData();
    } else if (user?.role === "teacher") {
      fetchTeacherDashboardData();
    } else if (user?.role === "admin") {
      fetchAdminDashboardData();
    } else {
      setLoading(false);
    }
  }, [user?.role]);

  // ==========================================
  // STUDENT DASHBOARD DATA
  // ==========================================
  const fetchStudentDashboardData = async () => {
    try {
      setLoading(true);

      const response = await getUserResults();
      const results = response.results || [];

      // Fetch Analytics (Charts)
      let analytics = { trendData: [], moduleData: [] };
      try {
        analytics = await getStudentAnalytics();
      } catch (err) {
        console.error("Failed to fetch analytics:", err);
      }

      const totalTests = results.length;

      // Filter out ungraded tests for average calculation
      const gradedResults = results.filter(
        (r) => r.bandScore !== null && r.bandScore !== undefined,
      );
      const averageBand =
        gradedResults.length > 0
          ? (
              gradedResults.reduce((sum, r) => sum + r.bandScore, 0) /
              gradedResults.length
            ).toFixed(1)
          : 0;

      const highestBand =
        gradedResults.length > 0
          ? Math.max(...gradedResults.map((r) => r.bandScore))
          : 0;
      const recentResults = results.slice(0, 5);

      let assignedTests = 0;
      try {
        const assignedResponse = await getAssignedTests("pending");
        assignedTests = assignedResponse.assignments.length;
      } catch (error) {
        console.error("Failed to fetch assigned tests:", error);
      }

      setStats({
        totalTests,
        averageBand,
        highestBand,
        assignedTests,
        recentResults,
        trendData: analytics.trendData || [],
        moduleData: analytics.moduleData || [],
      });
    } catch (error) {
      console.error("Fetch student dashboard data error:", error);
      toast.error("Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  };

  // ==========================================
  // TEACHER DASHBOARD DATA
  // ==========================================
  const fetchTeacherDashboardData = async () => {
    try {
      setLoading(true);

      const statsResponse = await getTeacherDashboardStats();
      setTeacherStats(statsResponse);

      const reviewsResponse = await getTeacherPendingReviews();
      setPendingReviews(reviewsResponse.reviews);
    } catch (error) {
      console.error("Fetch teacher dashboard data error:", error);
      toast.error("Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  };

  // ===================================
  //admin dashboard
  //====================================
  const fetchAdminDashboardData = async () => {
    try {
      setLoading(true);
      const statsResponse = await getAdminDashboardStats();
      setAdminStats(statsResponse);
    } catch (error) {
      console.error("Fetch admin dashboard data error:", error);
      toast.error("Failed to load dashboard data");
    } finally {
      setLoading(false);
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

  const getBandColor = (band) => {
    if (band >= 7) return "text-green-600";
    if (band >= 5) return "text-yellow-600";
    return "text-red-600";
  };

  const handleViewAnalysis = (resultId) => {
    navigate(`/results/${resultId}`);
  };

  const handleReviewNow = (resultId) => {
    navigate(`/grade-result/${resultId}`);
  };

  return (
    <DashboardLayout title="Dashboard">
      {/* STUDENT DASHBOARD */}
      {user?.role === "student" && (
        <>
          {/* Stats Cards - 4 CARDS with Gradients */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            {/* Total Tests */}
            <div className="bg-linear-to-br from-blue-500 to-blue-600 rounded-lg shadow-lg p-6 text-white transform hover:scale-105 transition-transform">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-100 text-sm mb-1">Tests Attempted</p>
                  <h3 className="text-4xl font-bold mt-2">
                    {loading ? "..." : stats.totalTests}
                  </h3>
                </div>
                <div className="bg-white bg-opacity-20 p-3 rounded-full">
                  <span className="text-3xl">📝</span>
                </div>
              </div>
            </div>

            {/* Average Band */}
            <div className="bg-linear-to-br from-green-500 to-green-600 rounded-lg shadow-lg p-6 text-white transform hover:scale-105 transition-transform">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-green-100 text-sm mb-1">Average Band</p>
                  <h3 className="text-4xl font-bold mt-2">
                    {loading ? "..." : stats.averageBand}
                  </h3>
                </div>
                <div className="bg-white bg-opacity-20 p-3 rounded-full">
                  <span className="text-3xl">🎯</span>
                </div>
              </div>
            </div>

            {/* Highest Band */}
            <div className="bg-linear-to-br from-yellow-500 to-orange-500 rounded-lg shadow-lg p-6 text-white transform hover:scale-105 transition-transform">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-yellow-100 text-sm mb-1">Highest Band</p>
                  <h3 className="text-4xl font-bold mt-2">
                    {loading ? "..." : stats.highestBand}
                  </h3>
                </div>
                <div className="bg-white bg-opacity-20 p-3 rounded-full">
                  <span className="text-3xl">⭐</span>
                </div>
              </div>
            </div>

            {/* Assigned Tests - Clickable */}
            <div
              onClick={() => navigate("/assigned-tests")}
              className="bg-linear-to-br from-purple-500 to-purple-600 rounded-lg shadow-lg p-6 text-white cursor-pointer transform hover:scale-105 transition-transform"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-purple-100 text-sm mb-1">Assigned Tests</p>
                  <h3 className="text-4xl font-bold mt-2">
                    {loading ? "..." : stats.assignedTests}
                  </h3>
                  {stats.assignedTests > 0 && !loading && (
                    <p className="text-xs text-purple-100 font-semibold mt-1">
                      {stats.assignedTests} pending
                    </p>
                  )}
                </div>
                <div className="bg-white bg-opacity-20 p-3 rounded-full">
                  <span className="text-3xl">✅</span>
                </div>
              </div>
            </div>
          </div>

          {/* Visual Analytics Charts */}
          {!loading &&
            (stats.trendData.length > 0 || stats.moduleData.length > 0) && (
              <DashboardCharts
                trendData={stats.trendData}
                moduleData={stats.moduleData}
              />
            )}

          {/* Recent Test Results */}
          <div className="bg-white rounded-lg shadow-lg mb-6">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between bg-linear-to-r from-blue-50 to-purple-50">
              <h3 className="text-xl font-semibold text-gray-800">
                Recent Test Results
              </h3>
              <button
                onClick={() => navigate("/history")}
                className="text-blue-600 hover:text-blue-700 text-sm font-semibold"
              >
                View All →
              </button>
            </div>
            {!loading && stats.recentResults.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
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
                        Band Score
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Action
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {stats.recentResults.map((result) => (
                      <tr key={result._id} className="hover:bg-gray-50">
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
                                    : "bg-orange-100 text-orange-800"
                            }`}
                          >
                            {result.module.toUpperCase()}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                          {formatDate(result.createdAt)}
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={`text-lg font-bold ${getBandColor(
                              result.bandScore,
                            )}`}
                          >
                            {result.bandScore}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <button
                            onClick={() => handleViewAnalysis(result._id)}
                            className="px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 text-sm font-semibold"
                          >
                            View
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-12 text-center text-gray-500">
                <div className="w-16 h-16 bg-gradient-to-br from-blue-100 to-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-3xl">📊</span>
                </div>
                <p className="mb-4">
                  No tests attempted yet. Start your first test!
                </p>
                <button
                  onClick={() => navigate("/tests")}
                  className="px-6 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700"
                >
                  Browse Tests
                </button>
              </div>
            )}
          </div>

          {/* Quick Actions */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h3 className="text-xl font-semibold text-gray-800 mb-4">
              Quick Actions
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <button
                onClick={() => navigate("/tests")}
                className="p-4 border-2 border-blue-600 text-blue-600 rounded-lg hover:bg-gradient-to-r hover:from-blue-600 hover:to-blue-700 hover:text-white font-semibold transition-all"
              >
                📝 Take New Test
              </button>
              <button
                onClick={() => navigate("/history")}
                className="p-4 border-2 border-green-600 text-green-600 rounded-lg hover:bg-gradient-to-r hover:from-green-600 hover:to-green-700 hover:text-white font-semibold transition-all"
              >
                📈 View History
              </button>
              <button
                onClick={() => navigate("/profile")}
                className="p-4 border-2 border-purple-600 text-purple-600 rounded-lg hover:bg-gradient-to-r hover:from-purple-600 hover:to-purple-700 hover:text-white font-semibold transition-all"
              >
                👤 Edit Profile
              </button>
            </div>
          </div>
        </>
      )}

      {/* TEACHER DASHBOARD */}
      {user?.role === "teacher" && (
        <>
          {/* Stats Cards with Gradients */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div
              onClick={() => navigate("/teacher/students")}
              className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg shadow-lg p-6 text-white cursor-pointer transform hover:scale-105 transition-transform"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-100 text-sm">Total Students</p>
                  <h3 className="text-4xl font-bold mt-2">
                    {loading ? "..." : teacherStats.totalStudents}
                  </h3>
                </div>
                <div className="bg-white bg-opacity-20 p-3 rounded-full">
                  <span className="text-3xl">👥</span>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg shadow-lg p-6 text-white transform hover:scale-105 transition-transform">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-orange-100 text-sm">Pending Reviews</p>
                  <h3 className="text-4xl font-bold mt-2">
                    {loading ? "..." : teacherStats.pendingReviews}
                  </h3>
                </div>
                <div className="bg-white bg-opacity-20 p-3 rounded-full">
                  <span className="text-3xl">⏳</span>
                </div>
              </div>
            </div>

            <div
              onClick={() => navigate("/teacher/assignments")}
              className="bg-gradient-to-br from-green-500 to-green-600 rounded-lg shadow-lg p-6 text-white cursor-pointer transform hover:scale-105 transition-transform"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-green-100 text-sm">Tests Assigned</p>
                  <h3 className="text-4xl font-bold mt-2">
                    {loading ? "..." : teacherStats.testsAssigned}
                  </h3>
                </div>
                <div className="bg-white bg-opacity-20 p-3 rounded-full">
                  <span className="text-3xl">✅</span>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg shadow-lg p-6 text-white transform hover:scale-105 transition-transform">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-purple-100 text-sm">Active Students</p>
                  <h3 className="text-4xl font-bold mt-2">
                    {loading ? "..." : teacherStats.activeClasses}
                  </h3>
                </div>
                <div className="bg-white bg-opacity-20 p-3 rounded-full">
                  <span className="text-3xl">📚</span>
                </div>
              </div>
            </div>
          </div>

          {/* Pending Reviews */}
          <div className="bg-white rounded-lg shadow-lg mb-6">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between bg-gradient-to-r from-blue-50 to-purple-50">
              <h3 className="text-xl font-semibold text-gray-800">
                Pending Reviews
              </h3>
              <button
                onClick={() => navigate("/teacher/assignments")}
                className="text-blue-600 hover:text-blue-700 text-sm font-semibold"
              >
                View All →
              </button>
            </div>
            {!loading && pendingReviews.length > 0 ? (
              <div className="p-6">
                {pendingReviews.map((review) => (
                  <div
                    key={
                      review.resultId ||
                      `${review.assignmentId}-${review.studentId}`
                    }
                    className="flex items-center justify-between p-4 border-b last:border-0 hover:bg-gray-50 rounded"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-1">
                        <p className="font-semibold text-gray-800">
                          {review.student?.firstName} {review.student?.lastName}
                        </p>
                        {review.bandScore && (
                          <span
                            className={`text-sm font-bold ${getBandColor(review.bandScore)}`}
                          >
                            Band {review.bandScore}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600">
                        {review.testTitle}
                      </p>
                      <p className="text-xs text-gray-400">
                        Submitted: {formatDate(review.submittedAt)}
                      </p>
                    </div>
                    <button
                      onClick={() => handleReviewNow(review.resultId)}
                      className="px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 font-semibold"
                    >
                      Review Now
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-12 text-center text-gray-500">
                <div className="w-16 h-16 bg-gradient-to-br from-blue-100 to-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-3xl">✅</span>
                </div>
                <p className="mb-4">
                  {loading
                    ? "Loading..."
                    : "No pending reviews! All caught up! 🎉"}
                </p>
              </div>
            )}
          </div>

          {/* Quick Actions */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h3 className="text-xl font-semibold text-gray-800 mb-4">
              Quick Actions
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <button
                onClick={() => navigate("/teacher/students")}
                className="p-4 border-2 border-blue-600 text-blue-600 rounded-lg hover:bg-gradient-to-r hover:from-blue-600 hover:to-blue-700 hover:text-white font-semibold transition-all"
              >
                👥 View Students
              </button>
              <button
                onClick={() => navigate("/teacher/create-assignment")}
                className="p-4 border-2 border-green-600 text-green-600 rounded-lg hover:bg-gradient-to-r hover:from-green-600 hover:to-green-700 hover:text-white font-semibold transition-all"
              >
                ✅ Create Assignment
              </button>
              <button
                onClick={() => navigate("/teacher/assignments")}
                className="p-4 border-2 border-purple-600 text-purple-600 rounded-lg hover:bg-gradient-to-r hover:from-purple-600 hover:to-purple-700 hover:text-white font-semibold transition-all"
              >
                📋 My Assignments
              </button>
            </div>
          </div>
        </>
      )}

      {/* ADMIN DASHBOARD */}
      {user?.role === "admin" && (
        <>
          {/* Stats Cards with Gradients */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div
              onClick={() => navigate("/admin/users")}
              className="bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg shadow-lg p-6 text-white cursor-pointer transform hover:scale-105 transition-transform"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-100 text-sm">Total Users</p>
                  <h3 className="text-4xl font-bold mt-2">
                    {loading ? "..." : adminStats.totalUsers}
                  </h3>
                  <div className="text-xs text-blue-100 mt-2">
                    <span className="font-semibold">
                      {adminStats.students} S
                    </span>
                    {" • "}
                    <span className="font-semibold">
                      {adminStats.teachers} T
                    </span>
                    {" • "}
                    <span className="font-semibold">{adminStats.admins} A</span>
                  </div>
                </div>
                <div className="bg-white bg-opacity-20 p-3 rounded-full">
                  <span className="text-3xl">👥</span>
                </div>
              </div>
            </div>

            <div
              onClick={() => navigate("/admin/questions")}
              className="bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg shadow-lg p-6 text-white cursor-pointer transform hover:scale-105 transition-transform"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-green-100 text-sm">Question Bank</p>
                  <h3 className="text-4xl font-bold mt-2">
                    {loading ? "..." : adminStats.totalQuestions}
                  </h3>
                  <p className="text-xs text-green-100 mt-2">Total questions</p>
                </div>
                <div className="bg-white bg-opacity-20 p-3 rounded-full">
                  <span className="text-3xl">❓</span>
                </div>
              </div>
            </div>

            <div
              onClick={() => navigate("/admin/tests")}
              className="bg-gradient-to-br from-purple-500 to-pink-600 rounded-lg shadow-lg p-6 text-white cursor-pointer transform hover:scale-105 transition-transform"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-purple-100 text-sm">Tests Created</p>
                  <h3 className="text-4xl font-bold mt-2">
                    {loading ? "..." : adminStats.totalTests}
                  </h3>
                  <p className="text-xs text-purple-100 mt-2">
                    Total test papers
                  </p>
                </div>
                <div className="bg-white bg-opacity-20 p-3 rounded-full">
                  <span className="text-3xl">📝</span>
                </div>
              </div>
            </div>

            <div
              onClick={() => navigate("/admin/tests")}
              className="bg-gradient-to-br from-orange-500 to-red-600 rounded-lg shadow-lg p-6 text-white cursor-pointer transform hover:scale-105 transition-transform"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-orange-100 text-sm">Test Attempts</p>
                  <h3 className="text-4xl font-bold mt-2">
                    {loading ? "..." : adminStats.totalAttempts}
                  </h3>
                  <p className="text-xs text-orange-100 mt-2">
                    Completed tests
                  </p>
                </div>
                <div className="bg-white bg-opacity-20 p-3 rounded-full">
                  <span className="text-3xl">📊</span>
                </div>
              </div>
            </div>
          </div>

          {/* Recent Activity */}
          <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
            <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-4 mb-4">
              <h3 className="text-xl font-semibold text-gray-800">
                📈 System Overview
              </h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4 border-l-4 border-blue-500">
                <p className="text-sm text-gray-600 mb-1">
                  New Users (Last 7 Days)
                </p>
                <p className="text-3xl font-bold text-blue-600">
                  {loading ? "..." : adminStats.recentUsers}
                </p>
              </div>
              <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-4 border-l-4 border-green-500">
                <p className="text-sm text-gray-600 mb-1">Active Students</p>
                <p className="text-3xl font-bold text-green-600">
                  {loading ? "..." : adminStats.students}
                </p>
              </div>
              <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-4 border-l-4 border-purple-500">
                <p className="text-sm text-gray-600 mb-1">Active Teachers</p>
                <p className="text-3xl font-bold text-purple-600">
                  {loading ? "..." : adminStats.teachers}
                </p>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h3 className="text-xl font-semibold text-gray-800 mb-4">
              Quick Actions
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <button
                onClick={() => navigate("/admin/users")}
                className="p-4 border-2 border-blue-600 text-blue-600 rounded-lg hover:bg-gradient-to-r hover:from-blue-600 hover:to-indigo-600 hover:text-white font-semibold transition-all"
              >
                👥 Manage Users
              </button>
              <button className="p-4 border-2 border-green-600 text-green-600 rounded-lg hover:bg-linear-to-r hover:from-green-600 hover:to-emerald-600 hover:text-white font-semibold transition-all"
              onClick={()=> navigate('/admin/questions')}>
                ❓ Question Bank
              </button>
              <button className="p-4 border-2 border-purple-600 text-purple-600 rounded-lg hover:bg-linear-to-r hover:from-purple-600 hover:to-pink-600 hover:text-white font-semibold transition-all"
              onClick={()=> navigate('/admin/tests')}>
                📝 Manage Tests
              </button>
            </div>
          </div>
        </>
      )}
    </DashboardLayout>
  );
};

export default Dashboard;
