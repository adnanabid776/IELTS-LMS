import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  getAllQuestions,
  deleteQuestion,
  bulkDeleteQuestions, // ✅ Added import
  getQuestionStats,
  getSectionsForDropdown,
} from "../../services/api";
import { toast } from "react-toastify";
import DashboardLayout from "../../components/Layout/DashboardLayout";
import AddQuestionModal from "./components/AddQuestionModal";
import EditQuestionModal from "./components/EditQuestionModal";
import BulkAddQuestionsModal from "./components/BulkAddQuestionsModal";

const QuestionManagement = () => {
  const navigate = useNavigate();

  const [questions, setQuestions] = useState([]);
  const [filteredQuestions, setFilteredQuestions] = useState([]);
  const [stats, setStats] = useState(null);
  const [sections, setSections] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [moduleFilter, setModuleFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [sectionFilter, setSectionFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [selectedQuestion, setSelectedQuestion] = useState(null);

  // Bulk Selection
  const [selectedQuestions, setSelectedQuestions] = useState([]); // ✅ Added state

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    applyFilters();
    setSelectedQuestions([]); // Clear selection on filter change
  }, [questions, moduleFilter, typeFilter, sectionFilter, searchTerm]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [questionsRes, statsRes, sectionsRes] = await Promise.all([
        getAllQuestions(),
        getQuestionStats(),
        getSectionsForDropdown(),
      ]);

      setQuestions(questionsRes.questions);
      setStats(statsRes);
      setSections(sectionsRes.sections);
    } catch (error) {
      console.error("Fetch data error:", error);
      toast.error("Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...questions];

    if (moduleFilter !== "all") {
      filtered = filtered.filter(
        (q) => q.sectionId?.testId?.module === moduleFilter,
      );
    }

    if (typeFilter !== "all") {
      filtered = filtered.filter((q) => q.questionType === typeFilter);
    }

    if (sectionFilter !== "all") {
      filtered = filtered.filter((q) => q.sectionId?._id === sectionFilter);
    }

    if (searchTerm) {
      filtered = filtered.filter((q) =>
        q.questionText.toLowerCase().includes(searchTerm.toLowerCase()),
      );
    }

    setFilteredQuestions(filtered);
    setCurrentPage(1); // Reset to first page when filtering
  };

  // ✅ New Handler: Select All
  const handleSelectAll = (e) => {
    if (e.target.checked) {
      // Select all visible questions (across all pages or just current page?
      // Usually users expect "Select All" to select everything in the filtered list, not just the page.
      // But for safety let's select all FILTERED questions.
      const allIds = filteredQuestions.map((q) => q._id);
      setSelectedQuestions(allIds);
    } else {
      setSelectedQuestions([]);
    }
  };

  // ✅ New Handler: Toggle Single Selection
  const handleSelectQuestion = (questionId) => {
    setSelectedQuestions((prev) => {
      if (prev.includes(questionId)) {
        return prev.filter((id) => id !== questionId);
      } else {
        return [...prev, questionId];
      }
    });
  };

  // ✅ New Handler: Bulk Delete
  const handleBulkDelete = async () => {
    if (selectedQuestions.length === 0) return;

    const confirmed = window.confirm(
      `Are you sure you want to delete ${selectedQuestions.length} questions? This action cannot be undone.`,
    );

    if (!confirmed) return;

    try {
      setLoading(true);
      await bulkDeleteQuestions(selectedQuestions);
      toast.success(
        `${selectedQuestions.length} questions deleted successfully`,
      );
      setSelectedQuestions([]);
      fetchData(); // Reload data
    } catch (error) {
      console.error("Bulk delete error:", error);
      toast.error("Failed to delete selected questions");
      setLoading(false);
    }
  };

  const handleDelete = async (questionId, questionText) => {
    const confirmed = window.confirm(
      `Are you sure you want to delete this question?\n\n"${questionText.substring(0, 80)}..."`,
    );

    if (!confirmed) return;

    try {
      await deleteQuestion(questionId);
      toast.success("Question deleted successfully");
      fetchData();
    } catch (error) {
      console.error("Delete question error:", error);
      const errorMsg =
        error.response?.data?.error || "Failed to delete question";
      toast.error(errorMsg);
    }
  };

  const handleEdit = (question) => {
    setSelectedQuestion(question);
    setShowEditModal(true);
  };

  const getTypeShortName = (type) => {
    const typeMap = {
      "multiple-choice": "MC",
      "true-false-not-given": "T/F/NG",
      "yes-no-not-given": "Y/N/NG",
      "matching-headings": "Match Head",
      "matching-information": "Match Info",
      "matching-features": "Match Feat",
      "sentence-completion": "Sent Comp",
      "summary-completion": "Sum Comp",
      "note-completion": "Note Comp",
      "table-completion": "Table Comp",
      "flow-chart-completion": "Flow Chart",
      "diagram-labeling": "Diagram",
      "short-answer": "Short Ans",
    };
    return typeMap[type] || type;
  };

  const questionTypes = [
    "multiple-choice",
    "true-false-not-given",
    "yes-no-not-given",
    "matching-headings",
    "matching-information",
    "matching-features",
    "sentence-completion",
    "summary-completion",
    "note-completion",
    "table-completion",
    "flow-chart-completion",
    "diagram-labeling",
    "short-answer",
  ];

  return (
    <DashboardLayout title="Question Management">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">
            Question Bank
          </h2>
          <p className="text-gray-600 text-sm">
            Manage all IELTS test questions
          </p>
        </div>
        <div className="flex gap-3">
          {/* ✅ Delete Selected Button */}
          {selectedQuestions.length > 0 && (
            <button
              onClick={handleBulkDelete}
              className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 font-semibold flex items-center gap-2 shadow-lg transform hover:scale-105 transition"
            >
              <span className="text-xl">🗑️</span>
              Delete ({selectedQuestions.length})
            </button>
          )}

          <button
            onClick={() => setShowBulkModal(true)}
            className="px-6 py-3 bg-gradient-to-r from-green-600 to-teal-600 text-white rounded-lg hover:from-green-700 hover:to-teal-700 font-semibold flex items-center gap-2 shadow-lg transform hover:scale-105 transition"
          >
            <span className="text-xl">📋</span>
            Bulk Add
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 font-semibold flex items-center gap-2 shadow-lg transform hover:scale-105 transition"
          >
            <span className="text-xl">➕</span>
            Add Question
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg shadow-lg p-4 text-white">
            <p className="text-blue-100 text-xs mb-1">Total Questions</p>
            <p className="text-3xl font-bold">{stats.totalQuestions}</p>
          </div>

          {stats.byModule.slice(0, 3).map((module) => (
            <div
              key={module._id}
              className={`rounded-lg shadow-lg p-4 text-white ${
                module._id === "reading"
                  ? "bg-gradient-to-br from-green-500 to-green-600"
                  : module._id === "listening"
                    ? "bg-gradient-to-br from-purple-500 to-purple-600"
                    : module._id === "writing"
                      ? "bg-gradient-to-br from-orange-500 to-orange-600"
                      : module._id === "speaking"
                        ? "bg-gradient-to-br from-orange-500 to-orange-600"
                        : "bg-gradient-to-br from-pink-500 to-pink-600"
              }`}
            >
              <p className="text-white opacity-90 text-xs mb-1">
                {module._id.toUpperCase()}
              </p>
              <p className="text-3xl font-bold">{module.count}</p>
            </div>
          ))}
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Search */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-2">
              Search
            </label>
            <input
              type="text"
              placeholder="Search question text..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Module Filter */}
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
              <option value="speaking">Speaking</option>
            </select>
          </div>

          {/* Type Filter */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-2">
              Question Type
            </label>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Types</option>
              {questionTypes.map((type) => (
                <option key={type} value={type}>
                  {getTypeShortName(type)}
                </option>
              ))}
            </select>
          </div>

          {/* Section Filter */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-2">
              Section
            </label>
            <select
              value={sectionFilter}
              onChange={(e) => setSectionFilter(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Sections</option>
              {sections.map((section) => (
                <option key={section._id} value={section._id}>
                  {section.testId?.title} - {section.title}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-4 text-xs text-gray-600 font-semibold">
          Showing {filteredQuestions.length} of {questions.length} questions
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      )}

      {/* Questions Table - IMPROVED */}
      {!loading && filteredQuestions.length > 0 && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gradient-to-r from-blue-50 to-purple-50">
                <tr>
                  {/* ✅ Checkbox Header */}
                  <th className="px-3 py-3 text-left w-10">
                    <input
                      type="checkbox"
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 h-4 w-4"
                      onChange={handleSelectAll}
                      checked={
                        filteredQuestions.length > 0 &&
                        selectedQuestions.length === filteredQuestions.length
                      }
                    />
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wide">
                    Q#
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wide">
                    Question
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wide">
                    Type
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wide">
                    Module
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wide">
                    Section
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wide">
                    Answer
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wide">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredQuestions
                  .slice(
                    (currentPage - 1) * itemsPerPage,
                    currentPage * itemsPerPage,
                  )
                  .map((question) => (
                    <tr
                      key={question._id}
                      className={`hover:bg-blue-50 transition ${
                        selectedQuestions.includes(question._id)
                          ? "bg-blue-50"
                          : ""
                      }`}
                    >
                      {/* ✅ Checkbox Cell */}
                      <td className="px-3 py-3">
                        <input
                          type="checkbox"
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 h-4 w-4"
                          checked={selectedQuestions.includes(question._id)}
                          onChange={() => handleSelectQuestion(question._id)}
                        />
                      </td>
                      <td className="px-3 py-3 font-bold text-gray-900">
                        {question.questionNumber}
                      </td>
                      <td className="px-3 py-3 text-gray-700 max-w-md">
                        <div className="line-clamp-2">
                          {question.questionText}
                        </div>
                      </td>
                      <td className="px-3 py-3">
                        <span className="px-2 py-1 rounded text-xs font-semibold bg-blue-100 text-blue-700 whitespace-nowrap">
                          {getTypeShortName(question.questionType)}
                        </span>
                      </td>
                      <td className="px-3 py-3">
                        <span
                          className={`px-2 py-1 rounded text-xs font-semibold whitespace-nowrap ${
                            question.sectionId?.testId?.module === "reading"
                              ? "bg-green-100 text-green-700"
                              : question.sectionId?.testId?.module ===
                                  "listening"
                                ? "bg-purple-100 text-purple-700"
                                : question.sectionId?.testId?.module ===
                                    "writing"
                                  ? "bg-orange-100 text-orange-700"
                                  : "bg-pink-100 text-pink-700"
                          }`}
                        >
                          {question.sectionId?.testId?.module?.toUpperCase() ||
                            "N/A"}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-gray-600 text-xs">
                        {question.sectionId?.title || "N/A"}
                      </td>
                      <td className="px-3 py-3 font-semibold text-gray-900">
                        {question.correctAnswer}
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleEdit(question)}
                            className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 font-semibold text-xs"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() =>
                              handleDelete(question._id, question.questionText)
                            }
                            className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 font-semibold text-xs"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          {/* Pagination Controls */}
          <div className="bg-gray-50 px-4 py-3 border-t border-gray-200 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-sm text-gray-700">
              Showing{" "}
              <span className="font-medium">
                {(currentPage - 1) * itemsPerPage + 1}
              </span>{" "}
              to{" "}
              <span className="font-medium">
                {Math.min(currentPage * itemsPerPage, filteredQuestions.length)}
              </span>{" "}
              of <span className="font-medium">{filteredQuestions.length}</span>{" "}
              results
            </div>

            <div className="flex-1 flex justify-end w-full sm:w-auto">
              <nav
                className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px max-w-full overflow-x-auto"
                aria-label="Pagination"
              >
                {/* First Page */}
                <button
                  onClick={() => setCurrentPage(1)}
                  disabled={currentPage === 1}
                  className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:bg-gray-100 disabled:cursor-not-allowed"
                  title="First Page"
                >
                  <span className="sr-only">First</span>
                  &laquo;
                </button>

                {/* Previous */}
                <button
                  onClick={() =>
                    setCurrentPage((prev) => Math.max(prev - 1, 1))
                  }
                  disabled={currentPage === 1}
                  className="relative inline-flex items-center px-2 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:bg-gray-100 disabled:cursor-not-allowed"
                >
                  <span className="sr-only">Previous</span>
                  &lsaquo;
                </button>

                {/* Page Numbers - Scrollable Container */}
                <div className="flex overflow-x-auto max-w-[200px] sm:max-w-none scrollbar-hide">
                  {[
                    ...Array(
                      Math.ceil(filteredQuestions.length / itemsPerPage),
                    ),
                  ].map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setCurrentPage(i + 1)}
                      className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium min-w-[40px] justify-center ${
                        currentPage === i + 1
                          ? "z-10 bg-blue-600 border-blue-600 text-white"
                          : "bg-white border-gray-300 text-gray-500 hover:bg-gray-50"
                      }`}
                    >
                      {i + 1}
                    </button>
                  ))}
                </div>

                {/* Next */}
                <button
                  onClick={() =>
                    setCurrentPage((prev) =>
                      Math.min(
                        prev + 1,
                        Math.ceil(filteredQuestions.length / itemsPerPage),
                      ),
                    )
                  }
                  disabled={
                    currentPage ===
                    Math.ceil(filteredQuestions.length / itemsPerPage)
                  }
                  className="relative inline-flex items-center px-2 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:bg-gray-100 disabled:cursor-not-allowed"
                >
                  <span className="sr-only">Next</span>
                  &rsaquo;
                </button>

                {/* Last Page */}
                <button
                  onClick={() =>
                    setCurrentPage(
                      Math.ceil(filteredQuestions.length / itemsPerPage),
                    )
                  }
                  disabled={
                    currentPage ===
                    Math.ceil(filteredQuestions.length / itemsPerPage)
                  }
                  className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:bg-gray-100 disabled:cursor-not-allowed"
                  title="Last Page"
                >
                  <span className="sr-only">Last</span>
                  &raquo;
                </button>
              </nav>
            </div>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!loading && filteredQuestions.length === 0 && (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <div className="w-24 h-24 bg-gradient-to-br from-blue-100 to-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-5xl">❓</span>
          </div>
          <h3 className="text-2xl font-bold text-gray-800 mb-2">
            No questions found
          </h3>
          <p className="text-gray-600 mb-6">
            {searchTerm || moduleFilter !== "all" || typeFilter !== "all"
              ? "Try adjusting your filters"
              : "Create your first question to get started"}
          </p>
          {(searchTerm || moduleFilter !== "all" || typeFilter !== "all") && (
            <button
              onClick={() => {
                setSearchTerm("");
                setModuleFilter("all");
                setTypeFilter("all");
                setSectionFilter("all");
              }}
              className="px-6 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 font-semibold"
            >
              Clear Filters
            </button>
          )}
        </div>
      )}

      {/* Modals */}
      {showAddModal && (
        <AddQuestionModal
          sections={sections}
          onClose={() => setShowAddModal(false)}
          onSuccess={() => {
            setShowAddModal(false);
            fetchData();
          }}
        />
      )}

      {showBulkModal && (
        <BulkAddQuestionsModal
          sections={sections}
          onClose={() => setShowBulkModal(false)}
          onSuccess={() => {
            setShowBulkModal(false);
            fetchData();
          }}
        />
      )}

      {showEditModal && selectedQuestion && (
        <EditQuestionModal
          question={selectedQuestion}
          sections={sections}
          onClose={() => {
            setShowEditModal(false);
            setSelectedQuestion(null);
          }}
          onSuccess={() => {
            setShowEditModal(false);
            setSelectedQuestion(null);
            fetchData();
          }}
        />
      )}
    </DashboardLayout>
  );
};

export default QuestionManagement;
