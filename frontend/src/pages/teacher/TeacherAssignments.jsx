import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getTeacherAssignments, deleteAssignment } from '../../services/api';
import { toast } from 'react-toastify';
import DashboardLayout from '../../components/Layout/DashboardLayout';

const TeacherAssignments = () => {
  const navigate = useNavigate();
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAssignments();
  }, []);

  const fetchAssignments = async () => {
    try {
      setLoading(true);
      const response = await getTeacherAssignments();
      setAssignments(response.assignments);
    } catch (error) {
      console.error('Fetch assignments error:', error);
      toast.error('Failed to load assignments');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (assignmentId) => {
    const confirmed = window.confirm(
      'Are you sure you want to delete this assignment? This action cannot be undone.'
    );

    if (!confirmed) return;

    try {
      await deleteAssignment(assignmentId);
      toast.success('Assignment deleted successfully');
      // Remove from local state
      setAssignments(assignments.filter((a) => a._id !== assignmentId));
    } catch (error) {
      console.error('Delete assignment error:', error);
      toast.error('Failed to delete assignment');
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const isOverdue = (dueDate) => {
    return new Date(dueDate) < new Date();
  };

  const getCompletionStats = (assignment) => {
    const total = assignment.students.length;
    const completed = assignment.submissions.filter(
      (s) => s.status === 'completed'
    ).length;
    const pending = assignment.submissions.filter((s) => s.status === 'pending')
      .length;
    const inProgress = assignment.submissions.filter(
      (s) => s.status === 'in-progress'
    ).length;

    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

    return { total, completed, pending, inProgress, completionRate };
  };

  return (
    <DashboardLayout title="My Assignments">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">
            My Assignments
          </h2>
          <p className="text-gray-600">
            Manage tests assigned to your students
          </p>
        </div>
        <button
          onClick={() => navigate('/teacher/create-assignment')}
          className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold flex items-center gap-2"
        >
          <span className="text-xl">➕</span>
          Create Assignment
        </button>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      )}

      {/* Assignments Grid */}
      {!loading && assignments.length > 0 && (
        <div className="grid grid-cols-1 gap-6">
          {assignments.map((assignment) => {
            const stats = getCompletionStats(assignment);
            const overdue = isOverdue(assignment.dueDate);

            return (
              <div
                key={assignment._id}
                className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow"
              >
                <div className="p-6">
                  {/* Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="text-xl font-bold text-gray-800 mb-2">
                        {assignment.testId?.title || 'Unknown Test'}
                      </h3>
                      <div className="flex items-center gap-4 text-sm text-gray-600">
                        <span className="flex items-center gap-1">
                          <span className="font-medium">Module:</span>
                          <span
                            className={`px-2 py-1 rounded text-xs font-semibold ${
                              assignment.testId?.module === 'reading'
                                ? 'bg-blue-100 text-blue-800'
                                : assignment.testId?.module === 'listening'
                                ? 'bg-green-100 text-green-800'
                                : assignment.testId?.module === 'writing'
                                ? 'bg-purple-100 text-purple-800'
                                : 'bg-orange-100 text-orange-800'
                            }`}
                          >
                            {assignment.testId?.module?.toUpperCase()}
                          </span>
                        </span>
                        <span>
                          📝 {assignment.testId?.totalQuestions} questions
                        </span>
                        <span>⏱️ {assignment.testId?.duration} minutes</span>
                      </div>
                    </div>
                  </div>

                  {/* Due Date */}
                  <div className="mb-4">
                    <p
                      className={`text-sm ${
                        overdue ? 'text-red-600 font-semibold' : 'text-gray-600'
                      }`}
                    >
                      📅 Due: {formatDate(assignment.dueDate)}
                      {overdue && (
                        <span className="ml-2 px-2 py-1 bg-red-100 text-red-600 rounded text-xs">
                          OVERDUE
                        </span>
                      )}
                    </p>
                  </div>

                  {/* Progress Bar */}
                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-700">
                        Completion Progress
                      </span>
                      <span className="text-sm font-semibold text-blue-600">
                        {stats.completionRate}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-3">
                      <div
                        className="bg-blue-600 h-3 rounded-full transition-all"
                        style={{ width: `${stats.completionRate}%` }}
                      ></div>
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="grid grid-cols-4 gap-4 mb-4">
                    <div className="bg-gray-50 rounded-lg p-3 text-center">
                      <p className="text-xs text-gray-600 mb-1">Total</p>
                      <p className="text-2xl font-bold text-gray-800">
                        {stats.total}
                      </p>
                    </div>
                    <div className="bg-green-50 rounded-lg p-3 text-center">
                      <p className="text-xs text-gray-600 mb-1">Completed</p>
                      <p className="text-2xl font-bold text-green-600">
                        {stats.completed}
                      </p>
                    </div>
                    <div className="bg-yellow-50 rounded-lg p-3 text-center">
                      <p className="text-xs text-gray-600 mb-1">In Progress</p>
                      <p className="text-2xl font-bold text-yellow-600">
                        {stats.inProgress}
                      </p>
                    </div>
                    <div className="bg-red-50 rounded-lg p-3 text-center">
                      <p className="text-xs text-gray-600 mb-1">Pending</p>
                      <p className="text-2xl font-bold text-red-600">
                        {stats.pending}
                      </p>
                    </div>
                  </div>

                  {/* Instructions Preview */}
                  {assignment.instructions && (
                    <div className="bg-blue-50 border-l-4 border-blue-500 p-3 mb-4">
                      <p className="text-sm text-blue-800">
                        <strong>Instructions:</strong> {assignment.instructions}
                      </p>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex gap-3 pt-4 border-t border-gray-200">
                    <button
                      onClick={() =>
                        navigate(`/teacher/assignment/${assignment._id}`)
                      }
                      className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold"
                    >
                      View Details
                    </button>
                    <button
                      onClick={() => handleDelete(assignment._id)}
                      className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-semibold"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Empty State */}
      {!loading && assignments.length === 0 && (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-5xl">📋</span>
          </div>
          <h3 className="text-2xl font-bold text-gray-800 mb-2">
            No Assignments Yet
          </h3>
          <p className="text-gray-600 mb-6">
            Create your first assignment to get started
          </p>
          <button
            onClick={() => navigate('/teacher/create-assignment')}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold"
          >
            Create Assignment
          </button>
        </div>
      )}
    </DashboardLayout>
  );
};

export default TeacherAssignments;