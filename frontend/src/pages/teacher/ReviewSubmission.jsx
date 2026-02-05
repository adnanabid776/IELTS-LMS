import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  getAssignmentById,
  reviewSubmission,
  getResultById,
} from '../../services/api';
import { toast } from 'react-toastify';
import DashboardLayout from '../../components/Layout/DashboardLayout';

const ReviewSubmission = () => {
  const { assignmentId, studentId } = useParams();
  const navigate = useNavigate();

  const [assignment, setAssignment] = useState(null);
  const [submission, setSubmission] = useState(null);
  const [result, setResult] = useState(null);
  const [comments, setComments] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchData();
  }, [assignmentId, studentId]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const assignmentResponse = await getAssignmentById(assignmentId);
      setAssignment(assignmentResponse.assignment);

      // Find this student's submission
      const studentSubmission = assignmentResponse.assignment.submissions.find(
        (s) => s.studentId._id === studentId
      );

      if (!studentSubmission) {
        toast.error('Submission not found');
        navigate(`/teacher/assignment/${assignmentId}`);
        return;
      }

      setSubmission(studentSubmission);
      setComments(studentSubmission.teacherComments || '');

      // If completed, fetch result details
      if (studentSubmission.resultId) {
        const resultResponse = await getResultById(studentSubmission.resultId._id);
        setResult(resultResponse.result);
      }
    } catch (error) {
      console.error('Fetch data error:', error);
      toast.error('Failed to load submission details');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!comments.trim()) {
      toast.error('Please add some feedback');
      return;
    }

    try {
      setSubmitting(true);
      await reviewSubmission(assignmentId, studentId, comments.trim());
      toast.success('Review submitted successfully!');
      setTimeout(() => {
        navigate(`/teacher/assignment/${assignmentId}`);
      }, 1500);
    } catch (error) {
      console.error('Submit review error:', error);
      toast.error('Failed to submit review');
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getBandColor = (band) => {
    if (band >= 7) return 'text-green-600';
    if (band >= 5) return 'text-yellow-600';
    return 'text-red-600';
  };

  if (loading) {
    return (
      <DashboardLayout title="Review Submission">
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </DashboardLayout>
    );
  }

  if (!submission || submission.status !== 'completed') {
    return (
      <DashboardLayout title="Review Submission">
        <div className="text-center py-12">
          <h3 className="text-2xl font-bold text-gray-800 mb-4">
            Cannot Review This Submission
          </h3>
          <p className="text-gray-600 mb-6">
            This submission is not yet completed or does not exist.
          </p>
          <button
            onClick={() => navigate(`/teacher/assignment/${assignmentId}`)}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Back to Assignment
          </button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Review Submission">
      {/* Back Button */}
      <button
        onClick={() => navigate(`/teacher/assignment/${assignmentId}`)}
        className="mb-6 flex items-center text-blue-600 hover:text-blue-700 font-medium"
      >
        ← Back to Assignment
      </button>

      {/* Header */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-4">
          Review Submission
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-gray-600">Student</p>
            <p className="text-lg font-semibold text-gray-800">
              {submission.studentId.firstName} {submission.studentId.lastName}
            </p>
            <p className="text-sm text-gray-500">{submission.studentId.email}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Test</p>
            <p className="text-lg font-semibold text-gray-800">
              {assignment.testId?.title}
            </p>
            <p className="text-sm text-gray-500">
              Submitted: {formatDate(submission.submittedAt)}
            </p>
          </div>
        </div>
      </div>

      {/* Result Summary */}
      {result && (
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h3 className="text-xl font-bold text-gray-800 mb-4">
            📊 Result Summary
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-blue-50 rounded-lg p-4 text-center">
              <p className="text-sm text-gray-600 mb-1">Band Score</p>
              <p className={`text-3xl font-bold ${getBandColor(result.bandScore)}`}>
                {result.bandScore}
              </p>
            </div>
            <div className="bg-green-50 rounded-lg p-4 text-center">
              <p className="text-sm text-gray-600 mb-1">Correct</p>
              <p className="text-3xl font-bold text-green-600">
                {result.correctAnswers}
              </p>
            </div>
            <div className="bg-red-50 rounded-lg p-4 text-center">
              <p className="text-sm text-gray-600 mb-1">Incorrect</p>
              <p className="text-3xl font-bold text-red-600">
                {result.incorrectAnswers}
              </p>
            </div>
            <div className="bg-purple-50 rounded-lg p-4 text-center">
              <p className="text-sm text-gray-600 mb-1">Accuracy</p>
              <p className="text-3xl font-bold text-purple-600">
                {result.percentage}%
              </p>
            </div>
          </div>

          {/* View Detailed Results Button */}
          <div className="mt-4">
            <button
              onClick={() => navigate(`/results/${result._id}`)}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold"
            >
              View Detailed Results & Answers
            </button>
          </div>
        </div>
      )}

      {/* Review Form */}
      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-6">
        <h3 className="text-xl font-bold text-gray-800 mb-4">
          Teacher Feedback
        </h3>

        {/* Existing Review Warning */}
        {submission.teacherComments && (
          <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4 mb-4">
            <p className="text-sm text-yellow-800">
              <strong>Note:</strong> You have already reviewed this submission.
              Submitting again will replace your previous feedback.
            </p>
            {submission.reviewedAt && (
              <p className="text-xs text-yellow-700 mt-1">
                Last reviewed: {formatDate(submission.reviewedAt)}
              </p>
            )}
          </div>
        )}

        {/* Comments Textarea */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Your Feedback <span className="text-red-500">*</span>
          </label>
          <textarea
            value={comments}
            onChange={(e) => setComments(e.target.value)}
            rows="8"
            placeholder="Provide constructive feedback to help the student improve..."
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
          <p className="text-xs text-gray-500 mt-1">
            Students will see this feedback when they view their assignment
          </p>
        </div>

        {/* Suggested Topics */}
        <div className="bg-gray-50 rounded-lg p-4 mb-6">
          <p className="text-sm font-medium text-gray-700 mb-2">
            💡 Suggested feedback topics:
          </p>
          <ul className="text-sm text-gray-600 space-y-1">
            <li>• Strengths demonstrated in this test</li>
            <li>• Areas that need improvement</li>
            <li>• Specific question types to practice</li>
            <li>• Time management observations</li>
            <li>• Recommendations for next steps</li>
          </ul>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-4 justify-end pt-4 border-t border-gray-200">
          <button
            type="button"
            onClick={() => navigate(`/teacher/assignment/${assignmentId}`)}
            className="px-6 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 font-semibold"
            disabled={submitting}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className={`px-6 py-2 rounded-lg font-semibold ${
              submitting
                ? 'bg-gray-400 text-gray-200 cursor-not-allowed'
                : 'bg-green-600 text-white hover:bg-green-700'
            }`}
          >
            {submitting ? 'Submitting...' : 'Submit Review'}
          </button>
        </div>
      </form>
    </DashboardLayout>
  );
};

export default ReviewSubmission;