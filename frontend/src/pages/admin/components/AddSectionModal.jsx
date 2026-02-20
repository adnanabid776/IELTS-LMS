import React, { useState } from "react";
import { createSection } from "../../../services/api";
import { toast } from "react-toastify";

const AddSectionModal = ({
  testId,
  testModule,
  existingSections,
  onClose,
  onSuccess,
}) => {
  const [formData, setFormData] = useState({
    sectionNumber: existingSections.length + 1,
    title: "",
    passageText: "",
    audioUrl: "",
    audioScript: "", // ✅ ADDED
    playOnceOnly: false, // ✅ ADDED
    disableReplay: true, // ✅ ADDED
    lockNavigationDuringAudio: false, // ✅ ADDED
    instructions: "",
    questionRange: "",
    duration: 20,
    // Writing fields
    taskType: "task1",
    taskImageUrl: "",
    wordLimit: 150,
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
      newErrors.title = "Section title is required";
    }
    if (!formData.sectionNumber) {
      newErrors.sectionNumber = "Section number is required";
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
        testId,
        ...formData,
        sectionNumber: parseInt(formData.sectionNumber),
        duration: formData.duration ? parseInt(formData.duration) : null,
      };

      await createSection(submitData);
      toast.success("Section created successfully!");
      onSuccess();
    } catch (error) {
      console.error("Create section error:", error);
      const errorMsg =
        error.response?.data?.error || "Failed to create section";
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
          <h3 className="text-xl font-bold">➕ Add New Section</h3>
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
            {/* Section Number & Title */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  Section # <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  name="sectionNumber"
                  value={formData.sectionNumber}
                  onChange={handleChange}
                  min="1"
                  className={`w-full px-4 py-2.5 border-2 rounded-lg focus:outline-none focus:ring-2 ${
                    errors.sectionNumber
                      ? "border-red-500 focus:ring-red-500"
                      : "border-gray-300 focus:ring-blue-500"
                  }`}
                />
                {errors.sectionNumber && (
                  <p className="text-red-500 text-xs mt-1">
                    {errors.sectionNumber}
                  </p>
                )}
              </div>

              <div className="md:col-span-3">
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
                  placeholder="20"
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

            {/* Passage Text (for Reading) */}
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                Passage Text (For Reading Module)
              </label>
              <textarea
                name="passageText"
                value={formData.passageText}
                onChange={handleChange}
                rows="8"
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Paste the reading passage here..."
              />
              <p className="text-xs text-gray-500 mt-1">
                For Reading module, paste the full passage that students will
                read
              </p>
            </div>

            {/* Audio URL (for Listening) */}
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                Audio URL (For Listening Module)
              </label>
              <input
                type="url"
                name="audioUrl"
                value={formData.audioUrl}
                onChange={handleChange}
                className="w-full px-4 py-2.5 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="https://example.com/audio.mp3"
              />
              <p className="text-xs text-gray-500 mt-1">
                For Listening module, provide the audio file URL
              </p>
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
            {loading ? "Creating..." : "✓ Create Section"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AddSectionModal;
