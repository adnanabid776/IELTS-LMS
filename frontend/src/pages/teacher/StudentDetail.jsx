import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getStudentDetails } from '../../services/api';
import { toast } from 'react-toastify';
import DashboardLayout from '../../components/Layout/DashboardLayout';

const StudentDetail = () => {
  const { studentId } = useParams();
  const navigate = useNavigate();

  const [student, setStudent] = useState(null);
  const [stats, setStats] = useState(null);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStudentDetails();
  }, [studentId]);

  const fetchStudentDetails = async () => {
    try {
      setLoading(true);
      const response = await getStudentDetails(studentId);
      setStudent(response.student);
      setStats(response.stats);
      setResults(response.recentResults);
    } catch (error) {
      console.error("Fetch student details error:", error);
      toast.error("Failed to load student details");
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString("en-US", {
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

  if (loading) {
    return (
      <DashboardLayout title="Student Details">
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </DashboardLayout>
    );
  }

  if (!student) {
    return (
      <DashboardLayout title="Student Details">
        <div className="text-center py-12">
          <h3 className="text-2xl font-bold text-gray-800 mb-4">
            Student Not Found
          </h3>
          <button
            onClick={() => navigate("/teacher/students")}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Back to Students
          </button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Student Details">
      {/* Back Button */}
      <button
        onClick={() => navigate("/teacher/students")}
        className="mb-6 flex items-center text-blue-600 hover:text-blue-700 font-medium"
      >
        ← Back to Students
      </button>

      {/* Student Profile Card */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="flex items-center mb-6">
          {/* Avatar */}
          <div className="w-20 h-20 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold text-2xl mr-4">
            {student.firstName[0]}
            {student.lastName[0]}
          </div>

          {/* Info */}
          <div className="flex-1">
            <h2 className="text-2xl font-bold text-gray-800 mb-1">
              {student.firstName} {student.lastName}
            </h2>
            <p className="text-gray-600 mb-1">📧 {student.email}</p>
            <p className="text-sm text-gray-500">
              Joined: {formatDate(student.createdAt)}
            </p>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-blue-50 rounded-lg p-4">
            <p className="text-sm text-gray-600 mb-1">Tests Taken</p>
            <p className="text-3xl font-bold text-blue-600">
              {stats.totalTests}
            </p>
          </div>
          <div className="bg-green-50 rounded-lg p-4">
            <p className="text-sm text-gray-600 mb-1">Average Band</p>
            <p
              className={`text-3xl font-bold ${getBandColor(stats.averageBand)}`}
            >
              {stats.averageBand}
            </p>
          </div>
          <div className="bg-yellow-50 rounded-lg p-4">
            <p className="text-sm text-gray-600 mb-1">Highest Band</p>
            <p
              className={`text-3xl font-bold ${getBandColor(stats.highestBand)}`}
            >
              {stats.highestBand}
            </p>
          </div>
          <div className="bg-red-50 rounded-lg p-4">
            <p className="text-sm text-gray-600 mb-1">Lowest Band</p>
            <p
              className={`text-3xl font-bold ${getBandColor(stats.lowestBand)}`}
            >
              {stats.lowestBand}
            </p>
          </div>
        </div>
      </div>

      {/* Recent Test Results */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-xl font-semibold text-gray-800">
            Recent Test Results
          </h3>
        </div>

        {results.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    #
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
                {results.map((result, index) => (
                  <tr key={result._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {index + 1}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {result.testId?.title || 'Unknown Test'}
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
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {result.module === "reading" ||
                      result.module === "listening" ? (
                        <>
                          {result.correctAnswers}/{result.totalQuestions} (
                          {result.percentage || 0}%)
                        </>
                      ) : result.bandScore != null ? (
                        <span className="text-purple-600 font-medium">
                          {result.percentage || 0}%
                        </span>
                      ) : (
                        <span className="text-orange-500 italic">Pending</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <span
                        className={`font-bold text-lg ${getBandColor(
                          result.bandScore,
                        )}`}
                      >
                        {result.bandScore}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => navigate(`/results/${result._id}`)}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-semibold"
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
          <div className="p-8 text-center text-gray-500">
            <p>No test results yet</p>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default StudentDetail;
