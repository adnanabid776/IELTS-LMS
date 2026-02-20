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
  const [testTypeFilter, setTestTypeFilter] = useState("all"); // ✅ New state

  //fetching tests on component mount
  useEffect(() => {
    const fetchTests = async () => {
      try {
        setLoading(true);
        const module = selectedModule === "all" ? null : selectedModule;
        const response = await getAllTests(module);
        let loadedTests = response.tests || [];
        // Filter out speaking tests (module no longer supported)
        loadedTests = loadedTests.filter((t) => t.module !== "speaking");
        setTests(loadedTests);
      } catch (error) {
        console.error("Fetch test error: ", error);
        toast.error("Failed to load tests!");
      } finally {
        setLoading(false);
      }
    };
    fetchTests();
  }, [selectedModule]);

  // ✅ Updated Module Filter Handler
  const handleModuleFilter = (module) => {
    setSelectedModule(module);
    // Logic: If specific module selected, default to "Full Tests". If "All Modules", default to "All Types".
    if (module === "all") {
      setTestTypeFilter("all");
    } else {
      setTestTypeFilter("full");
    }
  };

  // ✅ New Type Filter Handler
  const handleTypeFilter = (type) => {
    setTestTypeFilter(type);
  };

  const handleViewTest = (testId) => {
    navigate(`/test-detail/${testId}`);
  };

  // ✅ Item-wise Detection Logic
  const isItemWise = (test) => {
    // Condition: Less than 3 sections OR Less than 40 minutes
    return test.totalSections < 3 || test.duration < 40;
  };

  // ✅ Filtered Tests Calculation
  const getFilteredTests = () => {
    let filtered = tests;

    if (testTypeFilter === "full") {
      filtered = filtered.filter((test) => !isItemWise(test));
    } else if (testTypeFilter === "item-wise") {
      filtered = filtered.filter((test) => isItemWise(test));
    }

    return filtered;
  };

  const filteredTests = getFilteredTests();

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
      <div className="flex flex-col gap-4 mb-6">
        {/* Module Filters */}
        <div className="flex flex-wrap gap-3">
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
        </div>

        {/* ✅ Sub-Filters (Test Type) */}
        <div className="flex flex-wrap gap-2 items-center">
          <span className="text-sm font-semibold text-gray-500 mr-2">
            Filter by:
          </span>
          <button
            onClick={() => handleTypeFilter("all")}
            className={`px-3 py-1 rounded-full text-sm font-medium transition border ${
              testTypeFilter === "all"
                ? "bg-gray-800 text-white border-gray-800"
                : "bg-white text-gray-600 border-gray-300 hover:bg-gray-50"
            }`}
          >
            All Types
          </button>
          <button
            onClick={() => handleTypeFilter("full")}
            className={`px-3 py-1 rounded-full text-sm font-medium transition border ${
              testTypeFilter === "full"
                ? "bg-blue-600 text-white border-blue-600"
                : "bg-white text-gray-600 border-gray-300 hover:bg-blue-50"
            }`}
          >
            Full Tests {selectedModule !== "all" && "(Default)"}
          </button>
          <button
            onClick={() => handleTypeFilter("item-wise")}
            className={`px-3 py-1 rounded-full text-sm font-medium transition border ${
              testTypeFilter === "item-wise"
                ? "bg-purple-600 text-white border-purple-600"
                : "bg-white text-gray-600 border-gray-300 hover:bg-purple-50"
            }`}
          >
            Item-wise Practice
          </button>
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      )}

      {/* Tests Grid */}
      {!loading && filteredTests.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTests.map((test) => (
            <div
              key={test._id}
              className="bg-white rounded-lg shadow hover:shadow-xl transition-shadow p-6 relative overflow-hidden"
            >
              {/* Item-wise Badge */}
              {isItemWise(test) && (
                <div className="absolute top-0 right-0 bg-purple-500 text-white text-xs font-bold px-2 py-1 rounded-bl-lg">
                  Item-wise
                </div>
              )}

              {/* Module Badge */}
              <div className="flex items-center justify-between mb-4 mt-2">
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
      {!loading && filteredTests.length === 0 && (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-5xl">📝</span>
          </div>
          <h3 className="text-2xl font-bold text-gray-800 mb-2">
            No Tests Available
          </h3>
          <p className="text-gray-600 mb-6">
            {selectedModule === "all"
              ? "No tests match your filters."
              : `No ${selectedModule} tests available with current filters.`}
          </p>
          <button
            onClick={() => {
              handleModuleFilter("all");
              handleTypeFilter("all");
            }}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Reset Filters
          </button>
        </div>
      )}
    </DashboardLayout>
  );
};

export default TestList;
