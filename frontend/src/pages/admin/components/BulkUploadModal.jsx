import React, { useState, useRef } from "react";
import { bulkUploadTest } from "../../../services/api";
import { toast } from "react-toastify";

const BulkUploadModal = ({ onClose, onSuccess }) => {
  const [fileData, setFileData] = useState(null);
  const [fileName, setFileName] = useState("");
  const [preview, setPreview] = useState(null);
  const [errors, setErrors] = useState([]);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef(null);

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.name.endsWith(".json")) {
      setErrors(["Please select a .json file"]);
      return;
    }

    setFileName(file.name);
    setErrors([]);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target.result);
        setFileData(data);

        // Build preview
        const sectionSummaries = (data.sections || []).map((sec, i) => ({
          number: sec.sectionNumber || i + 1,
          title: sec.title || "Untitled",
          questionCount: (sec.questions || []).length,
          types: [...new Set((sec.questions || []).map((q) => q.questionType))],
        }));

        setPreview({
          title: data.title || "No title",
          module: data.module || "Unknown",
          duration: data.duration || 0,
          difficulty: data.difficulty || "medium",
          sectionCount: (data.sections || []).length,
          totalQuestions: sectionSummaries.reduce(
            (sum, s) => sum + s.questionCount,
            0,
          ),
          sections: sectionSummaries,
        });
      } catch {
        setErrors(["Invalid JSON file. Please check the file format."]);
        setFileData(null);
        setPreview(null);
      }
    };
    reader.readAsText(file);
  };

  const handleUpload = async () => {
    if (!fileData) return;

    try {
      setLoading(true);
      setErrors([]);
      const result = await bulkUploadTest(fileData);
      toast.success(
        `✅ Test "${result.test.title}" uploaded! ${result.test.totalSections} sections, ${result.test.totalQuestions} questions`,
      );
      onSuccess();
    } catch (error) {
      const details = error.response?.data?.details;
      if (details && Array.isArray(details)) {
        setErrors(details);
      } else {
        setErrors([
          error.response?.data?.error || "Upload failed. Please try again.",
        ]);
      }
    } finally {
      setLoading(false);
    }
  };

  const getModuleIcon = (module) => {
    switch (module) {
      case "reading":
        return "📖";
      case "listening":
        return "🎧";
      case "writing":
        return "✍️";
      default:
        return "📝";
    }
  };

  const getModuleColor = (module) => {
    switch (module) {
      case "reading":
        return "bg-blue-100 text-blue-800";
      case "listening":
        return "bg-purple-100 text-purple-800";
      case "writing":
        return "bg-green-100 text-green-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full flex flex-col max-h-[90vh] overflow-hidden animate-in fade-in zoom-in duration-200">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              📤 Bulk Upload Test
            </h2>
            <p className="text-indigo-100 text-sm mt-1">
              Upload a JSON file to create a complete test with sections and
              questions
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white text-2xl leading-none p-1"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto flex-1">
          {/* File Input */}
          <div
            className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
              fileName
                ? "border-indigo-300 bg-indigo-50"
                : "border-gray-300 hover:border-indigo-400 hover:bg-gray-50"
            }`}
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              onChange={handleFileSelect}
              className="hidden"
            />
            <div className="text-4xl mb-3">{fileName ? "📄" : "📁"}</div>
            {fileName ? (
              <div>
                <p className="text-indigo-700 font-semibold">{fileName}</p>
                <p className="text-sm text-gray-500 mt-1">
                  Click to select a different file
                </p>
              </div>
            ) : (
              <div>
                <p className="text-gray-600 font-medium">
                  Click to select a JSON file
                </p>
                <p className="text-sm text-gray-400 mt-1">
                  Supports .json format only
                </p>
              </div>
            )}
          </div>

          {/* Preview */}
          {preview && (
            <div className="mt-5 bg-gray-50 rounded-xl p-4 border border-gray-200">
              <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                👁️ Preview
              </h3>

              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="bg-white rounded-lg p-3 border">
                  <p className="text-xs text-gray-500 uppercase">Title</p>
                  <p className="font-medium text-gray-800 truncate">
                    {preview.title}
                  </p>
                </div>
                <div className="bg-white rounded-lg p-3 border">
                  <p className="text-xs text-gray-500 uppercase">Module</p>
                  <p className="font-medium">
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-sm ${getModuleColor(preview.module)}`}
                    >
                      {getModuleIcon(preview.module)} {preview.module}
                    </span>
                  </p>
                </div>
                <div className="bg-white rounded-lg p-3 border">
                  <p className="text-xs text-gray-500 uppercase">Duration</p>
                  <p className="font-medium text-gray-800">
                    {preview.duration} minutes
                  </p>
                </div>
                <div className="bg-white rounded-lg p-3 border">
                  <p className="text-xs text-gray-500 uppercase">Total</p>
                  <p className="font-medium text-gray-800">
                    {preview.sectionCount} sections, {preview.totalQuestions}{" "}
                    questions
                  </p>
                </div>
              </div>

              {/* Section breakdown */}
              <div className="space-y-2">
                {preview.sections.map((sec, i) => (
                  <div
                    key={i}
                    className="bg-white rounded-lg p-3 border flex items-center justify-between"
                  >
                    <div>
                      <span className="text-sm font-semibold text-indigo-600">
                        Section {sec.number}:
                      </span>
                      <span className="text-sm text-gray-700 ml-2">
                        {sec.title}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-sm text-gray-500">
                        {sec.questionCount} questions
                      </span>
                      <div className="flex flex-wrap gap-1 mt-1 justify-end">
                        {sec.types.map((type, j) => (
                          <span
                            key={j}
                            className="text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded"
                          >
                            {type}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Errors */}
          {errors.length > 0 && (
            <div className="mt-4 bg-red-50 border border-red-200 rounded-xl p-4">
              <h4 className="text-red-800 font-semibold mb-2 flex items-center gap-2">
                ❌ Validation Errors
              </h4>
              <ul className="space-y-1">
                {errors.map((err, i) => (
                  <li
                    key={i}
                    className="text-sm text-red-700 flex items-start gap-2"
                  >
                    <span className="text-red-400 mt-0.5">•</span>
                    {err}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-50 border-t flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl border border-gray-300 text-gray-700 hover:bg-gray-100 font-medium transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleUpload}
            disabled={!fileData || loading}
            className={`px-5 py-2.5 rounded-xl font-medium transition-all flex items-center gap-2 ${
              !fileData || loading
                ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                : "bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:shadow-lg hover:shadow-indigo-200"
            }`}
          >
            {loading ? (
              <>
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                    fill="none"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                  />
                </svg>
                Uploading...
              </>
            ) : (
              <>📤 Upload Test</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default BulkUploadModal;
