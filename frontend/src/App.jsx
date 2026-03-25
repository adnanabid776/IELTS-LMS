import React, { Suspense, lazy } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

// Core Components (Eager Load)
import ProtectedRoute from "./utils/ProtectedRoute";
import ErrorBoundary from "./components/ErrorBoundary";

// Lazy-loaded Custom Components
const NotFound = lazy(() => import("./pages/NotFound"));

// Lazy-loaded Auth Pages
const LoginSignUp = lazy(() => import("./pages/LoginSignUp"));

// Lazy-loaded Common Pages (All Roles)
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Profile = lazy(() => import("./pages/Profile"));

// Lazy-loaded Student Pages
const TestList = lazy(() => import("./pages/TestList"));
const TestDetail = lazy(() => import("./pages/TestDetail"));
const TestTaking = lazy(() => import("./pages/TestTaking"));
const Results = lazy(() => import("./pages/Results"));
const TestHistory = lazy(() => import("./pages/TestHistory"));
const AnswerReview = lazy(() => import("./pages/AnswerReview"));
const AssignedTests = lazy(() => import("./pages/AssignedTests"));
const ListeningTestTaking = lazy(() => import("./pages/ListeningTestTaking"));

// Lazy-loaded Teacher Pages
const MyStudents = lazy(() => import("./pages/teacher/MyStudents"));
const StudentDetail = lazy(() => import("./pages/teacher/StudentDetail"));
const CreateAssignment = lazy(() => import("./pages/teacher/CreateAssignment"));
const TeacherAssignments = lazy(() => import("./pages/teacher/TeacherAssignments"));
const AssignmentDetail = lazy(() => import("./pages/teacher/AssignmentDetail"));
const ReviewSubmission = lazy(() => import("./pages/teacher/ReviewSubmission"));
const PendingReviews = lazy(() => import("./pages/PendingReviews"));
const GradeResult = lazy(() => import("./pages/GradeResult"));

// Lazy-loaded Admin Pages
const UserManagement = lazy(() => import("./pages/admin/UserManagement"));
const QuestionManagement = lazy(() => import("./pages/admin/QuestionManagement"));
const SectionManagement = lazy(() => import("./pages/admin/SectionManagement"));
const TestManagement = lazy(() => import("./pages/admin/TestManagement"));

// Loading Fallback Component
const Loader = () => (
  <div className="flex h-[calc(100vh-64px)] items-center justify-center">
    <div className="h-12 w-12 animate-spin rounded-full border-4 border-blue-200 border-t-blue-600"></div>
  </div>
);

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
        <Suspense fallback={<Loader />}>
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
            {/* NOTE: Added allowedRoles=["student"] to ListeningTestTaking context which was previously missing */}
            <Route
              path="/test/listening/:testId"
              element={
                <ProtectedRoute allowedRoles={["student"]}>
                  <ListeningTestTaking />
                </ProtectedRoute>
              }
            />
            
            {/* ================================================
                SHARED ROUTES (Student + Teacher)
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

            {/* ================================================
                ADMIN-ONLY ROUTES
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

            {/* ================================================
                404 - PAGE NOT FOUND
            ================================================ */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </ErrorBoundary>
    </>
  );
}

export default App;
