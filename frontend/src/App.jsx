import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

// Components
import ProtectedRoute from "./utils/ProtectedRoute";
import ErrorBoundary from "./components/ErrorBoundary";

// Auth Pages
import LoginSignUp from "./pages/LoginSignUp";

// Common Pages (All Roles)
import Dashboard from "./pages/Dashboard";
import Profile from "./pages/Profile";

// Student Pages
import TestList from "./pages/TestList";
import TestDetail from "./pages/TestDetail";
import TestTaking from "./pages/TestTaking";
import Results from "./pages/Results";
import TestHistory from "./pages/TestHistory";
import AnswerReview from "./pages/AnswerReview";
import AssignedTests from "./pages/AssignedTests";

// Teacher Pages
import MyStudents from "./pages/teacher/MyStudents";
import StudentDetail from "./pages/teacher/StudentDetail";
import CreateAssignment from "./pages/teacher/CreateAssignment";
import TeacherAssignments from "./pages/teacher/TeacherAssignments";
import AssignmentDetail from "./pages/teacher/AssignmentDetail";
import ReviewSubmission from "./pages/teacher/ReviewSubmission";
import UserManagement from "./pages/admin/UserManagement";
import QuestionManagement from "./pages/admin/QuestionManagement";
import SectionManagement from "./pages/admin/SectionManagement";
import TestManagement from "./pages/admin/TestManagement";
import PendingReviews from "./pages/PendingReviews";
import GradeResult from "./pages/GradeResult";
import ListeningTestTaking from "./pages/ListeningTestTaking";
import SpeakingTestTaking from "./pages/SpeakingTestTaking";

function App() {
  return (
    <>
      <ToastContainer
        position="top-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="light"
      />

      <ErrorBoundary>
        <Routes>
          {/* ================================================
              PUBLIC ROUTES (No Login Required)
          ================================================ */}
          <Route path="/" element={<LoginSignUp />} />
          <Route path="/login" element={<LoginSignUp />} />
          {/* ================================================
              COMMON ROUTES (All Authenticated Users)
          ================================================ */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute allowedRoles={["student", "teacher", "admin"]}>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/profile"
            element={
              <ProtectedRoute allowedRoles={["student", "teacher", "admin"]}>
                <Profile />
              </ProtectedRoute>
            }
          />
          {/* ================================================
              STUDENT-ONLY ROUTES
          ================================================ */}
          <Route
            path="/tests"
            element={
              <ProtectedRoute allowedRoles={["student"]}>
                <TestList />
              </ProtectedRoute>
            }
          />
          <Route
            path="/test-detail/:testId"
            element={
              <ProtectedRoute allowedRoles={["student"]}>
                <TestDetail />
              </ProtectedRoute>
            }
          />
          <Route
            path="/test-taking/:testId"
            element={
              <ProtectedRoute allowedRoles={["student"]}>
                <TestTaking />
              </ProtectedRoute>
            }
          />
          <Route
            path="/assigned-tests"
            element={
              <ProtectedRoute allowedRoles={["student"]}>
                <AssignedTests />
              </ProtectedRoute>
            }
          />
          <Route
            path="/history"
            element={
              <ProtectedRoute allowedRoles={["student"]}>
                <TestHistory />
              </ProtectedRoute>
            }
          />
          <Route
            path="/answer-review/:resultId"
            element={
              <ProtectedRoute allowedRoles={["student"]}>
                <AnswerReview />
              </ProtectedRoute>
            }
          />
          {/* ================================================
              SHARED ROUTES (Student + Teacher)
              Teachers can view student results
          ================================================ */}
          <Route
            path="/results/:resultId"
            element={
              <ProtectedRoute allowedRoles={["student", "teacher"]}>
                <Results />
              </ProtectedRoute>
            }
          />
          {/* ================================================
              TEACHER-ONLY ROUTES
          ================================================ */}
          <Route
            path="/teacher/students"
            element={
              <ProtectedRoute allowedRoles={["teacher"]}>
                <MyStudents />
              </ProtectedRoute>
            }
          />
          <Route
            path="/teacher/student/:studentId"
            element={
              <ProtectedRoute allowedRoles={["teacher"]}>
                <StudentDetail />
              </ProtectedRoute>
            }
          />
          <Route
            path="/teacher/create-assignment"
            element={
              <ProtectedRoute allowedRoles={["teacher"]}>
                <CreateAssignment />
              </ProtectedRoute>
            }
          />
          <Route
            path="/teacher/assignments"
            element={
              <ProtectedRoute allowedRoles={["teacher"]}>
                <TeacherAssignments />
              </ProtectedRoute>
            }
          />
          <Route
            path="/teacher/assignment/:assignmentId"
            element={
              <ProtectedRoute allowedRoles={["teacher"]}>
                <AssignmentDetail />
              </ProtectedRoute>
            }
          />
          <Route
            path="/teacher/review/:assignmentId/:studentId"
            element={
              <ProtectedRoute allowedRoles={["teacher"]}>
                <ReviewSubmission />
              </ProtectedRoute>
            }
          />
          {/* ================================================
              ADMIN-ONLY ROUTES (Placeholder for future)
          ================================================ */}
          <Route
            path="/admin/questions"
            element={
              <ProtectedRoute allowedRoles={["admin"]}>
                <QuestionManagement />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/tests"
            element={
              <ProtectedRoute allowedRoles={["admin"]}>
                <TestManagement />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/users"
            element={
              <ProtectedRoute allowedRoles={["admin"]}>
                <UserManagement />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/tests/:testId/sections"
            element={
              <ProtectedRoute allowedRoles={["admin"]}>
                <SectionManagement />
              </ProtectedRoute>
            }
          />
          <Route
            path="/pending-reviews"
            element={
              <ProtectedRoute allowedRoles={["teacher", "admin"]}>
                <PendingReviews />
              </ProtectedRoute>
            }
          />
          <Route
            path="/grade-result/:resultId"
            element={
              <ProtectedRoute allowedRoles={["teacher", "admin"]}>
                <GradeResult />
              </ProtectedRoute>
            }
          />
          <Route
            path="/test/listening/:testId"
            element={
              <ProtectedRoute>
                <ListeningTestTaking />
              </ProtectedRoute>
            }
          />
          {/* Speaking Module Disabled
          <Route
            path="/test/speaking/:testId"
            element={
              <ProtectedRoute>
                <SpeakingTestTaking />
              </ProtectedRoute>
            }
          />
*/}

          {/* ================================================
              404 - PAGE NOT FOUND
          ================================================ */}
          <Route
            path="*"
            element={
              <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-blue-500 to-purple-600">
                <div className="bg-white rounded-2xl shadow-2xl p-12 text-center max-w-md">
                  <div className="text-8xl mb-4">🔍</div>
                  <h1 className="text-6xl font-bold text-gray-800 mb-4">404</h1>
                  <p className="text-xl text-gray-600 mb-8">
                    Oops! This page doesn't exist.
                  </p>
                  <a
                    href="/dashboard"
                    className="inline-block px-8 py-3 bg-linear-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 font-semibold transform hover:scale-105 transition"
                  >
                    Go to Dashboard
                  </a>
                </div>
              </div>
            }
          />
        </Routes>
      </ErrorBoundary>
    </>
  );
}

export default App;
