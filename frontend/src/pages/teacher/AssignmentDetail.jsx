import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getAssignmentById, getAssignmentStats } from '../../services/api';
import { toast } from 'react-toastify';
import DashboardLayout from '../../components/Layout/DashboardLayout';

const AssignmentDetail = () => {
  const { assignmentId } = useParams();
  const navigate = useNavigate();

  const [assignment, setAssignment] = useState(null);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAssignmentDetails();
  }, [assignmentId]);

  const fetchAssignmentDetails = async () => {
    try {
      setLoading(true);
      const [assignmentResponse, statsResponse] = await Promise.all([
        getAssignmentById(assignmentId),
        getAssignmentStats(assignmentId),
      ]);
      setAssignment(assignmentResponse.assignment);
      setStats(statsResponse.stats);
    } catch (error) {
      console.error('Fetch assignment details error:', error);
      toast.error('Failed to load assignment details');
    } finally {
      setLoading(false);
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

  const getStatusBadge = (status) => {
    const badges = {
      completed: 'bg-green-100 text-green-800',
      'in-progress': 'bg-yellow-100 text-yellow-800',
      pending: 'bg-red-100 text-red-800',
    };
    return badges[status] || 'bg-gray-100 text-gray-800';
  };

  const getBandColor = (band) => {
    if (band >= 7) return 'text-green-600';
    if (band >= 5) return 'text-yellow-600';
    return 'text-red-600';
  };

  if (loading) {
    return (
      <DashboardLayout title="Assignment Details">
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </DashboardLayout>
    );
  }

  if (!assignment) {
    return (
      <DashboardLayout title="Assignment Details">
        <div className="text-center py-12">
          <h3 className="text-2xl font-bold text-gray-800 mb-4">
            Assignment Not Found
          </h3>
          <button
            onClick={() => navigate('/teacher/assignments')}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Back to Assignments
          </button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Assignment Details">
      {/* Back Button */}
      <button
        onClick={() => navigate('/teacher/assignments')}
        className="mb-6 flex items-center text-blue-600 hover:text-blue-700 font-medium"
      >
        ← Back to Assignments
      </button>

      {/* Assignment Info Card */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <h2 className="text-2xl font-bold text-gray-800 mb-2">
              {assignment.testId?.title || 'Unknown Test'}
            </h2>
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
              <span>📝 {assignment.testId?.totalQuestions} questions</span>
              <span>⏱️ {assignment.testId?.duration} minutes</span>
            </div>
          </div>
        </div>

        {/* Due Date */}
        <div className="mb-4">
          <p
            className={`text-sm ${
              isOverdue(assignment.dueDate)
                ? 'text-red-600 font-semibold'
                : 'text-gray-600'
            }`}
          >
            📅 Due: {formatDate(assignment.dueDate)}
            {isOverdue(assignment.dueDate) && (
              <span className="ml-2 px-2 py-1 bg-red-100 text-red-600 rounded text-xs">
                OVERDUE
              </span>
            )}
          </p>
        </div>

        {/* Instructions */}
        {assignment.instructions && (
          <div className="bg-blue-50 border-l-4 border-blue-500 p-3 mb-4">
            <p className="text-sm text-blue-800">
              <strong>Instructions:</strong> {assignment.instructions}
            </p>
          </div>
        )}

        {/* Statistics */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 pt-4 border-t border-gray-200">
            <div className="text-center">
              <p className="text-sm text-gray-600 mb-1">Total Students</p>
              <p className="text-2xl font-bold text-gray-800">
                {stats.totalStudents}
              </p>
            </div>
            <div className="text-center">
              <p className="text-sm text-gray-600 mb-1">Completed</p>
              <p className="text-2xl font-bold text-green-600">
                {stats.completed}
              </p>
            </div>
            <div className="text-center">
              <p className="text-sm text-gray-600 mb-1">In Progress</p>
              <p className="text-2xl font-bold text-yellow-600">
                {stats.inProgress}
              </p>
            </div>
            <div className="text-center">
              <p className="text-sm text-gray-600 mb-1">Pending</p>
              <p className="text-2xl font-bold text-red-600">{stats.pending}</p>
            </div>
            <div className="text-center">
              <p className="text-sm text-gray-600 mb-1">Avg Band</p>
              <p className={`text-2xl font-bold ${getBandColor(stats.averageBand)}`}>
                {stats.averageBand || 'N/A'}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Student Submissions Table */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-xl font-semibold text-gray-800">
            Student Submissions
          </h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  #
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Student
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Submitted
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Band Score
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Review
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Action
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {assignment.submissions.map((submission, index) => (
                <tr key={submission.studentId._id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {index + 1}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center">
                      <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold text-xs mr-3">
                        {submission.studentId.firstName[0]}
                        {submission.studentId.lastName[0]}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {submission.studentId.firstName}{' '}
                          {submission.studentId.lastName}
                        </p>
                        <p className="text-xs text-gray-500">
                          {submission.studentId.email}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-semibold ${getStatusBadge(
                        submission.status
                      )}`}
                    >
                      {submission.status.toUpperCase()}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {submission.submittedAt
                      ? formatDate(submission.submittedAt)
                      : '-'}
                  </td>
                  <td className="px-6 py-4">
                    {submission.resultId ? (
                      <span
                        className={`text-lg font-bold ${getBandColor(
                          submission.resultId.bandScore
                        )}`}
                      >
                        {submission.resultId.bandScore}
                      </span>
                    ) : (
                      <span className="text-sm text-gray-400">-</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    {submission.teacherComments ? (
                      <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                        ✓ Reviewed
                      </span>
                    ) : submission.status === 'completed' ? (
                      <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded">
                        Pending
                      </span>
                    ) : (
                      <span className="text-xs text-gray-400">-</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    {submission.status === 'completed' ? (
                      <div className="flex gap-2">
                        <button
                          onClick={() =>
                            navigate(`/results/${submission.resultId._id}`)
                          }
                          className="px-3 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700 font-semibold"
                        >
                          View
                        </button>
                        <button
                          onClick={() =>
                            navigate(
                              `/teacher/review/${assignmentId}/${submission.studentId._id}`
                            )
                          }
                          className="px-3 py-1 bg-green-600 text-white rounded text-xs hover:bg-green-700 font-semibold"
                        >
                          {submission.teacherComments ? 'Edit Review' : 'Review'}
                        </button>
                      </div>
                    ) : submission.status === 'in-progress' ? (
                      <span className="text-xs text-gray-500 italic">
                        In progress...
                      </span>
                    ) : (
                      <span className="text-xs text-gray-400">
                        Not started
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default AssignmentDetail;