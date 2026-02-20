import React, { useState, useEffect } from "react";
import { updateSection } from "../../../services/api";
import { toast } from "react-toastify";

const EditSectionModal = ({ section, testModule, onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    title: "",
    passageText: "",
    audioUrl: "",
    audioScript: "",
    playOnceOnly: false,
    disableReplay: true,
    lockNavigationDuringAudio: false,
    instructions: "",
    questionRange: "",
    duration: "",
    // Writing fields
    taskType: "task1",
    taskImageUrl: "",
    wordLimit: 150,
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (section) {
      setFormData({
        title: section.title || "",
        passageText: section.passageText || "",
        audioUrl: section.audioUrl || "",
        audioScript: section.audioScript || "",
        playOnceOnly: section.playOnceOnly || false,
        disableReplay:
          section.disableReplay !== undefined ? section.disableReplay : true,
        lockNavigationDuringAudio: section.lockNavigationDuringAudio || false,
        instructions: section.instructions || "",
        questionRange: section.questionRange || "",
        duration: section.duration || "",
        // Writing fields
        taskType: section.taskType || "task1",
        taskImageUrl: section.taskImageUrl || "",
        wordLimit: section.wordLimit || 150,
      });
    }
  }, [section]);

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
      newErrors.title = "Section title is required";
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
        duration: formData.duration ? parseInt(formData.duration) : null,
      };

      await updateSection(section._id, submitData);
      toast.success("Section updated successfully!");
      onSuccess();
    } catch (error) {
      console.error("Update section error:", error);
      const errorMsg =
        error.response?.data?.error || "Failed to update section";
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full my-8">
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-t-xl flex items-center justify-between">
          <div>
            <h3 className="text-xl font-bold">✏️ Edit Section</h3>
            <p className="text-sm text-blue-100">
              Section {section?.sectionNumber}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:bg-white hover:bg-opacity-20 rounded-full w-8 h-8 flex items-center justify-center text-2xl transition"
          >
            ×
          </button>
        </div>

        {/* Form */}
        <form
          onSubmit={handleSubmit}
          className="px-6 py-6 max-h-[70vh] overflow-y-auto"
        >
          <div className="space-y-4">
            {/* Title */}
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                Section Title <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="title"
                value={formData.title}
                onChange={handleChange}
                className={`w-full px-4 py-2.5 border-2 rounded-lg focus:outline-none focus:ring-2 ${
                  errors.title
                    ? "border-red-500 focus:ring-red-500"
                    : "border-gray-300 focus:ring-blue-500"
                }`}
                placeholder="e.g., The History of Coffee"
              />
              {errors.title && (
                <p className="text-red-500 text-xs mt-1">{errors.title}</p>
              )}
            </div>

            {/* Question Range & Duration */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  Question Range
                </label>
                <input
                  type="text"
                  name="questionRange"
                  value={formData.questionRange}
                  onChange={handleChange}
                  className="w-full px-4 py-2.5 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., Questions 1-13"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  Duration (minutes)
                </label>
                <input
                  type="number"
                  name="duration"
                  value={formData.duration}
                  onChange={handleChange}
                  min="1"
                  className="w-full px-4 py-2.5 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Instructions */}
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                Instructions
              </label>
              <textarea
                name="instructions"
                value={formData.instructions}
                onChange={handleChange}
                rows="2"
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Instructions for students..."
              />
            </div>

            {/* Passage Text */}
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                Passage Text (For Reading)
              </label>
              <textarea
                name="passageText"
                value={formData.passageText}
                onChange={handleChange}
                rows="8"
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Paste the reading passage here..."
              />
            </div>

            {/* Audio URL */}
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                Audio URL (For Listening)
              </label>
              <input
                type="url"
                name="audioUrl"
                value={formData.audioUrl}
                onChange={handleChange}
                className="w-full px-4 py-2.5 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="https://example.com/audio.mp3"
              />
            </div>

            {/* Listening Fields */}
            {testModule === "listening" && (
              <div className="border-t-2 border-gray-200 pt-4 mt-4">
                <h4 className="text-lg font-bold text-gray-800 mb-4">
                  🎧 Listening Settings
                </h4>

                {/* Audio Script */}
                <div className="mb-4">
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    Audio Script (Hidden from students)
                  </label>
                  <textarea
                    name="audioScript"
                    value={formData.audioScript}
                    onChange={handleChange}
                    rows="4"
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Paste the transcript here..."
                  />
                </div>

                {/* Toggles */}
                <div className="space-y-3">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      name="playOnceOnly"
                      checked={formData.playOnceOnly}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          playOnceOnly: e.target.checked,
                        }))
                      }
                      className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                    />
                    <span className="text-gray-700 font-medium">
                      Play Once Only
                    </span>
                  </label>

                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      name="disableReplay"
                      checked={formData.disableReplay}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          disableReplay: e.target.checked,
                        }))
                      }
                      className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                    />
                    <span className="text-gray-700 font-medium">
                      Disable Replay (Hide seek bar)
                    </span>
                  </label>

                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      name="lockNavigationDuringAudio"
                      checked={formData.lockNavigationDuringAudio}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          lockNavigationDuringAudio: e.target.checked,
                        }))
                      }
                      className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                    />
                    <span className="text-gray-700 font-medium">
                      Lock Navigation During Audio
                    </span>
                  </label>
                </div>
              </div>
            )}

            {/* Writing Fields */}
            {testModule === "writing" && (
              <>
                {/* Task Type */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">
                      Task Type <span className="text-red-500">*</span>
                    </label>
                    <select
                      name="taskType"
                      value={formData.taskType}
                      onChange={handleChange}
                      className="w-full px-4 py-2.5 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="task1">
                        Task 1 (150 words - Diagram/Chart)
                      </option>
                      <option value="task2">Task 2 (250 words - Essay)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">
                      Word Limit
                    </label>
                    <input
                      type="number"
                      name="wordLimit"
                      value={formData.wordLimit}
                      onChange={handleChange}
                      min="100"
                      className="w-full px-4 py-2.5 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="150"
                    />
                  </div>
                </div>

                {/* Task Image URL (for Task 1) */}
                {formData.taskType === "task1" && (
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">
                      Task Image URL (For Task 1 - Chart/Diagram)
                    </label>
                    <input
                      type="url"
                      name="taskImageUrl"
                      value={formData.taskImageUrl}
                      onChange={handleChange}
                      className="w-full px-4 py-2.5 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="https://example.com/chart.png"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Provide the URL of the chart, graph, or diagram for Task 1
                    </p>
                  </div>
                )}
              </>
            )}
          </div>
        </form>

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-50 rounded-b-xl flex gap-3 justify-end border-t-2 border-gray-200">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="px-6 py-2.5 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 font-semibold transition"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className={`px-6 py-2.5 rounded-lg font-semibold transition ${
              loading
                ? "bg-gray-400 text-gray-200 cursor-not-allowed"
                : "bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-700 hover:to-purple-700 shadow-lg"
            }`}
          >
            {loading ? "Updating..." : "✓ Update Section"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default EditSectionModal;
