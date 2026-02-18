import React, { useState } from "react";
import { createTest } from "../../../services/api";
import { toast } from "react-toastify";

const CreateTestModal = ({ onClose, onSuccess }) => {
  const user = JSON.parse(localStorage.getItem("user"));

  const [formData, setFormData] = useState({
    title: "",
    module: "reading",
    description: "",
    duration: 60,
    difficulty: "medium",
    instructions: "",
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  const validate = () => {
    const newErrors = {};

    if (!formData.title.trim()) {
      newErrors.title = "Test title is required";
    }
    if (!formData.duration || formData.duration < 1) {
      newErrors.duration = "Duration must be at least 1 minute";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validate()) return;

    try {
      setLoading(true);

      const submitData = {
        ...formData,
        duration: parseInt(formData.duration),
        createdBy: user._id,
      };

      await createTest(submitData);
      toast.success("Test created successfully!");
      onSuccess();
    } catch (error) {
      console.error("Create test error:", error);
      const errorMsg = error.response?.data?.error || "Failed to create test";
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  // Get module icon
  const getModuleIcon = (module) => {
    switch (module) {
      case "reading":
        return "📖";
      case "listening":
        return "🎧";
      case "writing":
        return "✍️";
      case "speaking":
        return "🗣️";
      default:
        return "📝";
    }
  };

  // Get difficulty color
  const getDifficultyColor = (difficulty) => {
    switch (difficulty) {
      case "easy":
        return "bg-green-100 text-green-800";
      case "medium":
        return "bg-yellow-100 text-yellow-800";
      case "hard":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full flex flex-col max-h-[90vh] overflow-hidden animate-in fade-in zoom-in duration-200">
        {/* Header */}
        <div className="px-6 py-5 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-500 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center text-2xl">
              {getModuleIcon(formData.module)}
            </div>
            <div>
              <h3 className="text-xl font-bold">Create New Test</h3>
              <p className="text-sm text-white/80 mt-0.5">
                Set up a new IELTS practice test
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-white/20 transition text-2xl"
          >
            ×
          </button>
        </div>

        {/* Preview Badge */}
        <div className="px-6 py-3 bg-gradient-to-r from-gray-50 to-gray-100 border-b flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-gray-500">Preview:</span>
            <span className="px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full text-sm font-semibold">
              {formData.module.charAt(0).toUpperCase() +
                formData.module.slice(1)}{" "}
              Module
            </span>
          </div>
          <div>
            <span
              className={`px-3 py-1 rounded-full text-sm font-semibold ${getDifficultyColor(formData.difficulty)}`}
            >
              {formData.difficulty.charAt(0).toUpperCase() +
                formData.difficulty.slice(1)}
            </span>
          </div>
          <div className="ml-auto text-sm text-gray-600">
            <span className="font-medium">{formData.duration || 0}</span> min
          </div>
        </div>

        {/* Scrollable Form */}
        <form
          onSubmit={handleSubmit}
          className="px-6 py-5 overflow-y-auto flex-1 scroll-smooth overscroll-contain"
          style={{ scrollBehavior: "smooth", scrollbarWidth: "thin" }}
        >
          <div className="space-y-5">
            {/* Title */}
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                Test Title <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="title"
                value={formData.title}
                onChange={handleChange}
                className={`w-full px-4 py-3 border-2 rounded-xl focus:outline-none focus:ring-2 transition-all ${
                  errors.title
                    ? "border-red-400 focus:ring-red-400 bg-red-50"
                    : "border-gray-200 focus:ring-indigo-500 focus:border-indigo-500 hover:border-gray-300"
                }`}
                placeholder="e.g. IELTS Reading Practice Test 1"
              />
              {errors.title && (
                <p className="text-xs text-red-500 mt-1.5 flex items-center gap-1">
                  <span>⚠️</span> {errors.title}
                </p>
              )}
            </div>

            {/* Module + Difficulty */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  Module <span className="text-red-500">*</span>
                </label>
                <select
                  name="module"
                  value={formData.module}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 hover:border-gray-300 transition-all"
                >
                  <option value="reading">📖 Reading</option>
                  <option value="listening">🎧 Listening</option>
                  <option value="writing">✍️ Writing</option>
                  {/* <option value="speaking">🗣️ Speaking (Disabled)</option> */}
                </select>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  Difficulty
                </label>
                <select
                  name="difficulty"
                  value={formData.difficulty}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 hover:border-gray-300 transition-all"
                >
                  <option value="easy">🟢 Easy</option>
                  <option value="medium">🟡 Medium</option>
                  <option value="hard">🔴 Hard</option>
                </select>
              </div>
            </div>

            {/* Duration */}
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                Duration (minutes) <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="number"
                  name="duration"
                  min="1"
                  value={formData.duration}
                  onChange={handleChange}
                  className={`w-full px-4 py-3 border-2 rounded-xl focus:outline-none focus:ring-2 transition-all ${
                    errors.duration
                      ? "border-red-400 focus:ring-red-400 bg-red-50"
                      : "border-gray-200 focus:ring-indigo-500 focus:border-indigo-500 hover:border-gray-300"
                  }`}
                  placeholder="60"
                />
                <div className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400">
                  ⏱️
                </div>
              </div>
              {errors.duration && (
                <p className="text-xs text-red-500 mt-1.5 flex items-center gap-1">
                  <span>⚠️</span> {errors.duration}
                </p>
              )}
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                Description
              </label>
              <textarea
                name="description"
                rows="3"
                value={formData.description}
                onChange={handleChange}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 hover:border-gray-300 transition-all resize-none"
                placeholder="Brief description of the test..."
              />
            </div>

            {/* Instructions */}
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                Instructions
              </label>
              <textarea
                name="instructions"
                rows="3"
                value={formData.instructions}
                onChange={handleChange}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 hover:border-gray-300 transition-all resize-none"
                placeholder="General instructions for students..."
              />
            </div>
          </div>
        </form>

        {/* Footer */}
        <div className="px-6 py-4 border-t-2 border-gray-100 bg-gray-50 flex justify-between items-center gap-3">
          <p className="text-xs text-gray-500">
            <span className="text-red-500">*</span> Required fields
          </p>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-6 py-2.5 rounded-xl bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold transition-all"
            >
              Cancel
            </button>

            <button
              onClick={handleSubmit}
              disabled={loading}
              className={`px-8 py-2.5 rounded-xl font-semibold text-white transition-all flex items-center gap-2 ${
                loading
                  ? "bg-gray-400 cursor-not-allowed"
                  : "bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-500 hover:from-indigo-700 hover:via-purple-700 hover:to-pink-600 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
              }`}
            >
              {loading ? (
                <>
                  <svg
                    className="animate-spin h-4 w-4"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  Creating...
                </>
              ) : (
                <>
                  <span>✓</span> Create Test
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreateTestModal;
