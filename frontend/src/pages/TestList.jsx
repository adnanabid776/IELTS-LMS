import React, { useEffect } from "react";
import { useState } from "react";
import DashboardLayout from "../components/Layout/DashboardLayout";
import { useNavigate } from "react-router-dom";
import { getAllTests } from "../services/api";
import { toast } from "react-toastify";

const TestList = () => {
  // const response = JSON.parse(localStorage.getItem("user"));

  const navigate = useNavigate();
  const [tests, setTests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedModule, setSelectedModule] = useState("all");

  //fetching tests on component mount
  useEffect(() => {
    fetchTests();
  }, [selectedModule]);

  const fetchTests = async () => {
    try {
      setLoading(true);
      const module = selectedModule === "all" ? null : selectedModule;
      const response = await getAllTests(module);
      let loadedTests = response.tests || [];
      // DISABLE SPEAKING MODULE UI: Filter out speaking tests
      loadedTests = loadedTests.filter((t) => t.module !== "speaking");
      setTests(loadedTests);
    } catch (error) {
      console.error("Fetch test error: ", error);
      toast.error("Failed to load tests!");
    } finally {
      setLoading(false);
    }
  };
  const handleModuleFilter = (module) => {
    setSelectedModule(module);
  };

  const handleViewTest = (testId) => {
    navigate(`/test-detail/${testId}`);
  };

  return (
    <DashboardLayout title="Online Tests">
      {/* Page Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-2">
          Available Tests
        </h2>
        <p className="text-gray-600">Browse and attempt IELTS practice tests</p>
      </div>

      {/* Filter Buttons */}
      <div className="flex flex-wrap gap-3 mb-6">
        <button
          onClick={() => handleModuleFilter("all")}
          className={`px-4 py-2 rounded-lg font-medium transition ${
            selectedModule === "all"
              ? "bg-blue-600 text-white"
              : "bg-gray-200 text-gray-700 hover:bg-gray-300"
          }`}
        >
          All Tests
        </button>
        <button
          onClick={() => handleModuleFilter("reading")}
          className={`px-4 py-2 rounded-lg font-medium transition ${
            selectedModule === "reading"
              ? "bg-blue-600 text-white"
              : "bg-gray-200 text-gray-700 hover:bg-gray-300"
          }`}
        >
          📖 Reading
        </button>
        <button
          onClick={() => handleModuleFilter("listening")}
          className={`px-4 py-2 rounded-lg font-medium transition ${
            selectedModule === "listening"
              ? "bg-blue-600 text-white"
              : "bg-gray-200 text-gray-700 hover:bg-gray-300"
          }`}
        >
          🎧 Listening
        </button>
        <button
          onClick={() => handleModuleFilter("writing")}
          className={`px-4 py-2 rounded-lg font-medium transition ${
            selectedModule === "writing"
              ? "bg-blue-600 text-white"
              : "bg-gray-200 text-gray-700 hover:bg-gray-300"
          }`}
        >
          ✍️ Writing
        </button>
        {/* Speaking Button Disabled */}
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      )}

      {/* Tests Grid */}
      {!loading && tests.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {tests.map((test) => (
            <div
              key={test._id}
              className="bg-white rounded-lg shadow hover:shadow-xl transition-shadow p-6"
            >
              {/* Module Badge */}
              <div className="flex items-center justify-between mb-4">
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

                {/* Difficulty Badge */}
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

              {/* Test Title */}
              <h3 className="text-xl font-bold text-gray-800 mb-2">
                {test.title}
              </h3>

              {/* Test Description */}
              {test.description && (
                <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                  {test.description}
                </p>
              )}

              {/* Test Info */}
              <div className="space-y-2 mb-4 text-sm text-gray-600">
                <div className="flex items-center">
                  <span className="font-medium mr-2">📝 Questions:</span>
                  <span>{test.totalQuestions}</span>
                </div>
                <div className="flex items-center">
                  <span className="font-medium mr-2">⏱️ Duration:</span>
                  <span>{test.duration} minutes</span>
                </div>
                <div className="flex items-center">
                  <span className="font-medium mr-2">📑 Sections:</span>
                  <span>{test.totalSections}</span>
                </div>
              </div>

              {/* View Test Button */}
              <button
                onClick={() => handleViewTest(test._id)}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold transition"
              >
                View Test
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!loading && tests.length === 0 && (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-5xl">📝</span>
          </div>
          <h3 className="text-2xl font-bold text-gray-800 mb-2">
            No Tests Available
          </h3>
          <p className="text-gray-600 mb-6">
            {selectedModule === "all"
              ? "No tests have been created yet."
              : `No ${selectedModule} tests available.`}
          </p>
          <button
            onClick={() => handleModuleFilter("all")}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            View All Tests
          </button>
        </div>
      )}
    </DashboardLayout>
  );
};

export default TestList;
