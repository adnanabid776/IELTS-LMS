import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAssignedTests, updateSubmissionStatus } from '../services/api';
import { toast } from 'react-toastify';
import DashboardLayout from '../components/Layout/DashboardLayout';

const AssignedTests = () => {
  const navigate = useNavigate();
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all, pending, completed

  useEffect(() => {
    fetchAssignments();
  }, [filter]);

  const fetchAssignments = async () => {
    try {
      setLoading(true);
      const status = filter === 'all' ? null : filter;
      const response = await getAssignedTests(status);
      setAssignments(response.assignments);
    } catch (error) {
      console.error('Fetch assignments error:', error);
      toast.error('Failed to load assignments');
    } finally {
      setLoading(false);
    }
  };

  const handleStartTest = async (testId, assignmentId, status) => {
    try {
      // If starting fresh, update status to in-progress
      if (status === 'pending') {
        await updateSubmissionStatus(assignmentId, null, null, 'in-progress');
      }
      
      // Navigate to test taking
      navigate(`/test-taking/${testId}?assignmentId=${assignmentId}`);
    } catch (error) {
      console.error('Start test error:', error);
      toast.error('Failed to start test');
    }
  };

  const getStatusColor = (status) => {
    switch(status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'in-progress':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-red-100 text-red-800';
    }
  };

  const isOverdue = (dueDate) => {
    return new Date(dueDate) < new Date();
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <DashboardLayout title="Assigned Tests">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-2">
          Tests Assigned by Your Teacher
        </h2>
        <p className="text-gray-600">
          Complete these tests before the due date
        </p>
      </div>

      {/* Filter Tabs */}
      <div className="bg-white rounded-lg shadow mb-6 p-4">
        <div className="flex gap-4">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-lg font-semibold ${
              filter === 'all'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            All ({assignments.length})
          </button>
          <button
            onClick={() => setFilter('pending')}
            className={`px-4 py-2 rounded-lg font-semibold ${
              filter === 'pending'
                ? 'bg-red-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Pending
          </button>
          <button
            onClick={() => setFilter('in-progress')}
            className={`px-4 py-2 rounded-lg font-semibold ${
              filter === 'in-progress'
                ? 'bg-yellow-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            In Progress
          </button>
          <button
            onClick={() => setFilter('completed')}
            className={`px-4 py-2 rounded-lg font-semibold ${
              filter === 'completed'
                ? 'bg-green-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Completed
          </button>
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      )}

      {/* Assignments Grid */}
      {!loading && assignments.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {assignments.map((assignment) => (
            <div
              key={assignment._id}
              className={`bg-white rounded-lg shadow p-6 border-l-4 ${
                isOverdue(assignment.dueDate) && assignment.status === 'pending'
                  ? 'border-red-500'
                  : assignment.status === 'completed'
                  ? 'border-green-500'
                  : 'border-blue-500'
              }`}
            >
              {/* Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-gray-800 mb-1">
                    {assignment.testId?.title || 'Unknown Test'}
                  </h3>
                  <p className="text-sm text-gray-500">
                    Assigned by: {assignment.assignedBy?.firstName}{' '}
                    {assignment.assignedBy?.lastName}
                  </p>
                </div>
                <span
                  className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(
                    assignment.status
                  )}`}
                >
                  {assignment.status.toUpperCase()}
                </span>
              </div>

              {/* Test Info */}
              <div className="space-y-2 mb-4 text-sm">
                <div className="flex items-center text-gray-600">
                  <span className="font-medium mr-2">📝 Questions:</span>
                  <span>{assignment.testId?.totalQuestions || 'N/A'}</span>
                </div>
                <div className="flex items-center text-gray-600">
                  <span className="font-medium mr-2">⏱️ Duration:</span>
                  <span>{assignment.testId?.duration || 'N/A'} minutes</span>
                </div>
                <div className="flex items-center text-gray-600">
                  <span className="font-medium mr-2">📚 Module:</span>
                  <span className="capitalize">
                    {assignment.testId?.module || 'N/A'}
                  </span>
                </div>
                <div className="flex items-center">
                  <span className="font-medium mr-2 text-gray-600">📅 Due Date:</span>
                  <span
                    className={
                      isOverdue(assignment.dueDate) && assignment.status !== 'completed'
                        ? 'text-red-600 font-semibold'
                        : 'text-gray-600'
                    }
                  >
                    {formatDate(assignment.dueDate)}
                    {isOverdue(assignment.dueDate) && assignment.status !== 'completed' && (
                      <span className="ml-2 text-xs bg-red-100 text-red-600 px-2 py-1 rounded">
                        OVERDUE
                      </span>
                    )}
                  </span>
                </div>
              </div>

              {/* Instructions */}
              {assignment.instructions && (
                <div className="bg-blue-50 border-l-4 border-blue-500 p-3 mb-4">
                  <p className="text-sm text-blue-800">
                    <strong>Instructions:</strong> {assignment.instructions}
                  </p>
                </div>
              )}

              {/* Teacher Comments (if reviewed) */}
              {assignment.teacherComments && (
                <div className="bg-green-50 border-l-4 border-green-500 p-3 mb-4">
                  <p className="text-sm text-green-800">
                    <strong>Teacher Feedback:</strong>
                    <br />
                    {assignment.teacherComments}
                  </p>
                  <p className="text-xs text-green-600 mt-2">
                    Reviewed on: {formatDate(assignment.reviewedAt)}
                  </p>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3">
                {assignment.status === 'pending' && (
                  <button
                    onClick={() =>
                      handleStartTest(
                        assignment.testId._id,
                        assignment._id,
                        assignment.status
                      )
                    }
                    className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold"
                  >
                    Start Test
                  </button>
                )}
                {assignment.status === 'in-progress' && (
                  <button
                    onClick={() =>
                      handleStartTest(
                        assignment.testId._id,
                        assignment._id,
                        assignment.status
                      )
                    }
                    className="flex-1 px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 font-semibold"
                  >
                    Resume Test
                  </button>
                )}
                {assignment.status === 'completed' && (
                  <button
                    onClick={() => navigate(`/results/${assignment.resultId}`)}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold"
                  >
                    View Results
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!loading && assignments.length === 0 && (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-5xl">📚</span>
          </div>
          <h3 className="text-2xl font-bold text-gray-800 mb-2">
            {filter === 'all'
              ? 'No Assigned Tests'
              : `No ${filter.charAt(0).toUpperCase() + filter.slice(1)} Tests`}
          </h3>
          <p className="text-gray-600 mb-6">
            {filter === 'all'
              ? "Your teacher hasn't assigned any tests yet."
              : `You don't have any ${filter} assignments.`}
          </p>
          <button
            onClick={() => navigate('/tests')}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold"
          >
            Browse Practice Tests
          </button>
        </div>
      )}
    </DashboardLayout>
  );
};

export default AssignedTests;