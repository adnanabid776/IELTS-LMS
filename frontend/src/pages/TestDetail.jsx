import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getTestById } from "../services/api";
import { toast } from "react-toastify";
import DashboardLayout from "../components/Layout/DashboardLayout";

const TestDetail = () => {
  const { testId } = useParams();
  const navigate = useNavigate();

  const [test, setTest] = useState(null);
  const [sections, setSections] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTestDetail();
  }, [testId]);

  const fetchTestDetail = async () => {
    try {
      setLoading(true);
      const response = await getTestById(testId);
      setTest(response.test);
      setSections(response.sections || []);
    } catch (error) {
      console.error("Fetch test detail error:", error);
      toast.error("Failed to load test details");
    } finally {
      setLoading(false);
    }
  };

  const handleStartTest = () => {
    // For now, just navigate to test taking page
    // We'll create session in next step
    navigate(`/test-taking/${testId}`);
  };

  const handleBack = () => {
    navigate("/tests");
  };

  if (loading) {
    return (
      <DashboardLayout title="Test Details">
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </DashboardLayout>
    );
  }

  if (!test) {
    return (
      <DashboardLayout title="Test Details">
        <div className="text-center py-12">
          <h3 className="text-2xl font-bold text-gray-800 mb-4">
            Test Not Found
          </h3>
          <button
            onClick={handleBack}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Back to Tests
          </button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title={test.title}>
      {/* Back Button */}
      <button
        onClick={handleBack}
        className="mb-6 flex items-center text-blue-600 hover:text-blue-700 font-medium"
      >
        ← Back to Tests
      </button>

      {/* Test Header Card */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-3">
              <span
                className={`px-3 py-1 rounded-full text-sm font-semibold ${
                  test.module === "reading"
                    ? "bg-blue-100 text-blue-800"
                    : test.module === "listening"
                      ? "bg-green-100 text-green-800"
                      : test.module === "writing"
                        ? "bg-purple-100 text-purple-800"
                        : "bg-orange-100 text-orange-800"
                }`}
              >
                {test.module.toUpperCase()}
              </span>

              <span
                className={`px-2 py-1 rounded text-xs font-semibold ${
                  test.difficulty === "easy"
                    ? "bg-green-100 text-green-700"
                    : test.difficulty === "medium"
                      ? "bg-yellow-100 text-yellow-700"
                      : "bg-red-100 text-red-700"
                }`}
              >
                {test.difficulty}
              </span>
            </div>

            <h2 className="text-3xl font-bold text-gray-800 mb-2">
              {test.title}
            </h2>

            {test.description && (
              <p className="text-gray-600 mb-4">{test.description}</p>
            )}
          </div>
        </div>

        {/* Test Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-gray-500 text-sm mb-1">Total Questions</p>
            <p className="text-2xl font-bold text-gray-800">
              {test.totalQuestions}
            </p>
          </div>
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-gray-500 text-sm mb-1">Sections</p>
            <p className="text-2xl font-bold text-gray-800">
              {test.totalSections}
            </p>
          </div>
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-gray-500 text-sm mb-1">Duration</p>
            <p className="text-2xl font-bold text-gray-800">
              {test.duration} min
            </p>
          </div>
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-gray-500 text-sm mb-1">Difficulty</p>
            <p className="text-2xl font-bold text-gray-800 capitalize">
              {test.difficulty}
            </p>
          </div>
        </div>

        {/* Instructions */}
        {test.instructions && (
          <div className="bg-blue-50 border-l-4 border-blue-600 p-4 mb-6">
            <h4 className="font-semibold text-blue-900 mb-2">Instructions:</h4>
            <p className="text-blue-800 text-sm">{test.instructions}</p>
          </div>
        )}
      </div>

      {/* Sections List */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h3 className="text-xl font-bold text-gray-800 mb-4">Test Sections</h3>

        {sections.length > 0 ? (
          <div className="space-y-4">
            {sections.map((section, index) => (
              <div
                key={section._id}
                className="border-2 border-gray-200 rounded-lg p-4 hover:border-blue-300 transition"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="bg-blue-600 text-white w-8 h-8 rounded-full flex items-center justify-center font-bold">
                        {section.sectionNumber}
                      </span>
                      <h4 className="text-lg font-semibold text-gray-800">
                        {section.title}
                      </h4>
                    </div>

                    {section.questionRange && (
                      <p className="text-sm text-gray-600 ml-11">
                        {section.questionRange}
                      </p>
                    )}

                    {section.instructions && (
                      <p className="text-sm text-gray-500 ml-11 mt-2">
                        {section.instructions}
                      </p>
                    )}
                  </div>

                  <div className="text-right">
                    <p className="text-sm text-gray-500">Questions</p>
                    <p className="text-2xl font-bold text-blue-600">
                      {section.totalQuestions}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500 text-center py-8">
            No sections available for this test.
          </p>
        )}
      </div>

      {/* Start Test Button */}
      <div className="bg-white rounded-lg shadow p-6 text-center">
        <p className="text-gray-600 mb-4">
          Ready to start? You'll have {test.duration} minutes to complete this
          test.
        </p>
        <button
          onClick={handleStartTest}
          className="px-8 py-3 rounded-lg font-bold text-lg transition bg-green-600 text-white hover:bg-green-700"
        >
          🚀 Start Test
        </button>
      </div>
    </DashboardLayout>
  );
};

export default TestDetail;
