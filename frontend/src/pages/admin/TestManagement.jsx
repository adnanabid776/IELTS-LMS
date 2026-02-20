import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getAllTests, deleteTest } from "../../services/api";
import { toast } from "react-toastify";
import DashboardLayout from "../../components/Layout/DashboardLayout";
import CreateTestModal from "./components/CreateTestModal";
import EditTestModal from "./components/EditTestModal";

const TestManagement = () => {
  const navigate = useNavigate();

  const [tests, setTests] = useState([]);
  const [filteredTests, setFilteredTests] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [moduleFilter, setModuleFilter] = useState("all");
  const [difficultyFilter, setDifficultyFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedTest, setSelectedTest] = useState(null);

  useEffect(() => {
    fetchTests();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [tests, moduleFilter, difficultyFilter, searchTerm]);

  const fetchTests = async () => {
    try {
      setLoading(true);
      const response = await getAllTests();
      // Filter out speaking tests (module no longer supported)
      const allTests = response.tests || [];
      setTests(allTests.filter((t) => t.module !== "speaking"));
    } catch (error) {
      console.error("Fetch tests error:", error);
      toast.error("Failed to load tests");
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...tests];

    if (moduleFilter !== "all") {
      filtered = filtered.filter((t) => t.module === moduleFilter);
    }

    if (difficultyFilter !== "all") {
      filtered = filtered.filter((t) => t.difficulty === difficultyFilter);
    }

    if (searchTerm) {
      filtered = filtered.filter((t) =>
        t.title.toLowerCase().includes(searchTerm.toLowerCase()),
      );
    }

    setFilteredTests(filtered);
  };

  const handleDelete = async (testId, testTitle) => {
    const confirmed = window.confirm(
      `Are you sure you want to delete "${testTitle}"?\n\nThis will delete ALL sections and questions in this test!`,
    );

    if (!confirmed) return;

    try {
      await deleteTest(testId);
      toast.success("Test deleted successfully");
      fetchTests();
    } catch (error) {
      console.error("Delete test error:", error);
      const errorMsg = error.response?.data?.error || "Failed to delete test";
      toast.error(errorMsg);
    }
  };

  const handleEdit = (test) => {
    setSelectedTest(test);
    setShowEditModal(true);
  };

  const getModuleColor = (module) => {
    const colors = {
      reading: "from-green-500 to-green-600",
      listening: "from-purple-500 to-purple-600",
      writing: "from-orange-500 to-orange-600",
    };
    return colors[module] || "from-gray-500 to-gray-600";
  };

  const getModuleIcon = (module) => {
    const icons = {
      reading: "📖",
      listening: "🎧",
      writing: "✍️",
    };
    return icons[module] || "📝";
  };

  const stats = {
    total: tests.length,
    reading: tests.filter((t) => t.module === "reading").length,
    listening: tests.filter((t) => t.module === "listening").length,
    writing: tests.filter((t) => t.module === "writing").length,
  };

  return (
    <DashboardLayout title="Test Management">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">
            Test Management
          </h2>
          <p className="text-gray-600 text-sm">Manage all IELTS tests</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 font-semibold flex items-center gap-2 shadow-lg transform hover:scale-105 transition"
        >
          <span className="text-xl">➕</span>
          Create Test
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg shadow-lg p-4 text-white">
          <p className="text-blue-100 text-xs mb-1">Total Tests</p>
          <p className="text-3xl font-bold">{stats.total}</p>
        </div>
        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-lg shadow-lg p-4 text-white">
          <p className="text-green-100 text-xs mb-1">Reading</p>
          <p className="text-3xl font-bold">{stats.reading}</p>
        </div>
        <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg shadow-lg p-4 text-white">
          <p className="text-purple-100 text-xs mb-1">Listening</p>
          <p className="text-3xl font-bold">{stats.listening}</p>
        </div>
        <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg shadow-lg p-4 text-white">
          <p className="text-orange-100 text-xs mb-1">Writing</p>
          <p className="text-3xl font-bold">{stats.writing}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-2">
              Search
            </label>
            <input
              type="text"
              placeholder="Search test title..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-2">
              Module
            </label>
            <select
              value={moduleFilter}
              onChange={(e) => setModuleFilter(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Modules</option>
              <option value="reading">Reading</option>
              <option value="listening">Listening</option>
              <option value="writing">Writing</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-2">
              Difficulty
            </label>
            <select
              value={difficultyFilter}
              onChange={(e) => setDifficultyFilter(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Levels</option>
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="hard">Hard</option>
            </select>
          </div>
        </div>

        <div className="mt-4 text-xs text-gray-600 font-semibold">
          Showing {filteredTests.length} of {tests.length} tests
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      )}

      {/* Tests Grid */}
      {!loading && filteredTests.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTests.map((test) => (
            <div
              key={test._id}
              className="bg-white rounded-lg shadow-lg border-2 border-gray-200 hover:border-blue-500 transition overflow-hidden"
            >
              {/* Card Header */}
              <div
                className={`bg-gradient-to-r ${getModuleColor(test.module)} text-white px-4 py-3`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">
                      {getModuleIcon(test.module)}
                    </span>
                    <span className="font-bold text-sm uppercase">
                      {test.module}
                    </span>
                  </div>
                  <span
                    className={`px-2 py-1 rounded text-xs font-semibold ${
                      test.difficulty === "easy"
                        ? "bg-green-200 text-green-800"
                        : test.difficulty === "medium"
                          ? "bg-yellow-200 text-yellow-800"
                          : "bg-red-200 text-red-800"
                    }`}
                  >
                    {test.difficulty?.toUpperCase()}
                  </span>
                </div>
              </div>

              {/* Card Content */}
              <div className="p-4">
                <h3 className="font-bold text-gray-800 mb-2 text-lg line-clamp-2">
                  {test.title}
                </h3>

                <div className="space-y-2 text-sm text-gray-600 mb-4">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">Sections:</span>
                    <span>{test.totalSections || 0}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">Questions:</span>
                    <span>{test.totalQuestions || 0}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">Duration:</span>
                    <span>{test.duration} min</span>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col gap-2">
                  <button
                    onClick={() =>
                      navigate(`/admin/tests/${test._id}/sections`)
                    }
                    className="w-full px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded hover:from-blue-700 hover:to-purple-700 font-semibold text-sm"
                  >
                    📚 Manage Sections
                  </button>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEdit(test)}
                      className="flex-1 px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 font-semibold text-sm"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(test._id, test.title)}
                      className="flex-1 px-3 py-2 bg-red-600 text-white rounded hover:bg-red-700 font-semibold text-sm"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!loading && filteredTests.length === 0 && (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <div className="w-24 h-24 bg-gradient-to-br from-blue-100 to-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-5xl">📝</span>
          </div>
          <h3 className="text-2xl font-bold text-gray-800 mb-2">
            No tests found
          </h3>
          <p className="text-gray-600 mb-6">
            {searchTerm || moduleFilter !== "all" || difficultyFilter !== "all"
              ? "Try adjusting your filters"
              : "Create your first test to get started"}
          </p>
          {searchTerm ||
          moduleFilter !== "all" ||
          difficultyFilter !== "all" ? (
            <button
              onClick={() => {
                setSearchTerm("");
                setModuleFilter("all");
                setDifficultyFilter("all");
              }}
              className="px-6 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 font-semibold"
            >
              Clear Filters
            </button>
          ) : (
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 font-semibold"
            >
              Create First Test
            </button>
          )}
        </div>
      )}

      {/* Modals */}
      {showCreateModal && (
        <CreateTestModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            setShowCreateModal(false);
            fetchTests();
          }}
        />
      )}

      {showEditModal && selectedTest && (
        <EditTestModal
          isOpen={showEditModal}
          test={selectedTest}
          onClose={() => {
            setShowEditModal(false);
            setSelectedTest(null);
          }}
          onUpdated={() => {
            setShowEditModal(false);
            setSelectedTest(null);
            fetchTests();
          }}
        />
      )}
    </DashboardLayout>
  );
};

export default TestManagement;
