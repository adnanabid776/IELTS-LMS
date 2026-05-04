import React, { useEffect, useState, useRef } from "react";
import { getAllMockExams, uploadMockExamJson, deleteMockExam } from "../../services/api";
import { toast } from "react-toastify";
import DashboardLayout from "../../components/Layout/DashboardLayout";

const MockExamManagement = () => {
  const [mockExams, setMockExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState(null);
  const [jsonPreview, setJsonPreview] = useState(null);
  const [jsonError, setJsonError] = useState(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    fetchMockExams();
  }, []);

  const fetchMockExams = async () => {
    try {
      setLoading(true);
      const data = await getAllMockExams();
      setMockExams(data || []);
    } catch (error) {
      console.error("Fetch mock exams error:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (examId, examTitle) => {
    const confirmed = window.confirm(`Are you sure you want to delete "${examTitle}"? This will disable the mock exam for all students.`);
    if (!confirmed) return;

    try {
      setDeleting(examId);
      await deleteMockExam(examId);
      toast.success("Mock exam deleted successfully");
      fetchMockExams();
    } catch (error) {
      console.error("Delete error:", error);
      toast.error("Failed to delete mock exam");
    } finally {
      setDeleting(null);
    }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setJsonError(null);
    setJsonPreview(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target.result);

        // Basic validation
        if (!parsed.title) throw new Error("Missing 'title' field");
        if (!parsed.listeningTest) throw new Error("Missing 'listeningTest' object");
        if (!parsed.readingTest) throw new Error("Missing 'readingTest' object");
        if (!parsed.writingTest) throw new Error("Missing 'writingTest' object");

        const listSections = parsed.listeningTest.sections?.length || 0;
        const readSections = parsed.readingTest.sections?.length || 0;
        const writeSections = parsed.writingTest.sections?.length || 0;

        let totalQ = 0;
        [parsed.listeningTest, parsed.readingTest, parsed.writingTest].forEach(t => {
          (t.sections || []).forEach(s => {
            totalQ += (s.questions || []).length;
          });
        });

        setJsonPreview({
          title: parsed.title,
          description: parsed.description || "—",
          listeningDuration: parsed.listeningTest.duration || 30,
          readingDuration: parsed.readingTest.duration || 60,
          writingDuration: parsed.writingTest.duration || 60,
          listSections,
          readSections,
          writeSections,
          totalQ,
          raw: parsed,
        });
      } catch (err) {
        setJsonError(err.message);
      }
    };
    reader.readAsText(file);
  };

  const handleUpload = async () => {
    if (!jsonPreview?.raw) return;
    try {
      setUploading(true);
      await uploadMockExamJson(jsonPreview.raw);
      toast.success("🎉 Mock Exam uploaded successfully!");
      setShowUploadModal(false);
      setJsonPreview(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      fetchMockExams();
    } catch (error) {
      console.error("Upload error:", error);
    } finally {
      setUploading(false);
    }
  };

  const getModuleColor = (module) => {
    const colors = {
      listening: "bg-purple-100 text-purple-800",
      reading: "bg-blue-100 text-blue-800",
      writing: "bg-green-100 text-green-800",
    };
    return colors[module] || "bg-gray-100 text-gray-800";
  };

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">🎯 Mock Exam Management</h1>
            <p className="text-gray-500 mt-1">
              Create and manage full-length IELTS Mock Tests (Listening + Reading + Writing)
            </p>
          </div>
          <button
            onClick={() => setShowUploadModal(true)}
            className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-semibold shadow-lg hover:from-indigo-700 hover:to-purple-700 transition flex items-center gap-2"
          >
            <span>📤</span> Upload Mock Exam JSON
          </button>
        </div>

        {/* Mock Exams Grid */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="h-12 w-12 animate-spin rounded-full border-4 border-indigo-200 border-t-indigo-600"></div>
          </div>
        ) : mockExams.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-2xl shadow-sm border border-gray-100">
            <p className="text-6xl mb-4">📋</p>
            <h3 className="text-xl font-semibold text-gray-700 mb-2">No Mock Exams Yet</h3>
            <p className="text-gray-500 mb-6">Upload your first mock exam JSON to get started.</p>
            <button
              onClick={() => setShowUploadModal(true)}
              className="px-6 py-2.5 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition"
            >
              Upload Now
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {mockExams.map((exam) => (
              <div
                key={exam._id}
                className="bg-white rounded-2xl shadow-sm border border-gray-100 hover:shadow-lg transition-all duration-300 overflow-hidden"
              >
                <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-4">
                  <h3 className="text-lg font-bold text-white truncate">{exam.title}</h3>
                  <p className="text-indigo-100 text-sm mt-1 truncate">
                    {exam.description || "Full-length Mock Test"}
                  </p>
                </div>
                <div className="p-5 space-y-3">
                  {/* Module Cards */}
                  {[
                    { label: "Listening", data: exam.listeningTestId, icon: "🎧" },
                    { label: "Reading", data: exam.readingTestId, icon: "📖" },
                    { label: "Writing", data: exam.writingTestId, icon: "✍️" },
                  ].map((mod) => (
                    <div
                      key={mod.label}
                      className={`flex items-center justify-between px-3 py-2 rounded-lg ${getModuleColor(mod.label.toLowerCase())}`}
                    >
                      <span className="font-semibold text-sm">
                        {mod.icon} {mod.label}
                      </span>
                      <span className="text-xs">
                        {mod.data?.totalSections || "?"} sections · {mod.data?.duration || "?"}min
                      </span>
                    </div>
                  ))}
                  <div className="pt-2 border-t border-gray-100 flex justify-between items-center">
                    <p className="text-xs text-gray-400">
                      Created {new Date(exam.createdAt).toLocaleDateString()}
                    </p>
                    <button
                      onClick={() => handleDelete(exam._id, exam.title)}
                      disabled={deleting === exam._id}
                      className={`text-red-500 hover:text-red-700 transition font-medium text-xs flex items-center gap-1 ${deleting === exam._id ? "opacity-50 cursor-not-allowed" : ""}`}
                    >
                      {deleting === exam._id ? "..." : (
                        <>
                          <span>🗑️</span> Delete
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Upload Modal */}
        {showUploadModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
              {/* Modal Header */}
              <div className="px-6 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white flex items-center justify-between flex-shrink-0">
                <div>
                  <h3 className="text-xl font-bold">📤 Upload Mock Exam</h3>
                  <p className="text-sm text-indigo-100">
                    Upload a JSON file containing the full mock exam data
                  </p>
                </div>
                <button
                  onClick={() => {
                    setShowUploadModal(false);
                    setJsonPreview(null);
                    setJsonError(null);
                  }}
                  className="text-white hover:bg-white hover:bg-opacity-20 rounded-full w-8 h-8 flex items-center justify-center text-2xl transition"
                >
                  ×
                </button>
              </div>

              {/* Modal Body */}
              <div className="flex-1 overflow-y-auto p-6">
                {/* File Input */}
                <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:border-indigo-400 transition">
                  <p className="text-4xl mb-3">📁</p>
                  <p className="text-gray-600 font-semibold mb-2">
                    Select your Mock Exam JSON file
                  </p>
                  <p className="text-xs text-gray-400 mb-4">
                    Must contain: title, listeningTest, readingTest, writingTest
                  </p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".json"
                    onChange={handleFileSelect}
                    className="block mx-auto text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                  />
                </div>

                {/* Error */}
                {jsonError && (
                  <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-red-700 font-semibold text-sm">❌ Invalid JSON: {jsonError}</p>
                  </div>
                )}

                {/* Preview */}
                {jsonPreview && (
                  <div className="mt-6 space-y-4">
                    <h4 className="font-bold text-gray-800 text-lg">📋 Preview</h4>
                    <div className="bg-gray-50 rounded-xl p-5 space-y-3">
                      <div className="flex justify-between">
                        <span className="text-gray-500 font-medium">Title</span>
                        <span className="font-bold text-gray-800">{jsonPreview.title}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500 font-medium">Description</span>
                        <span className="text-gray-700 text-sm">{jsonPreview.description}</span>
                      </div>
                      <hr />
                      <div className="grid grid-cols-3 gap-3 text-center">
                        <div className="bg-purple-50 rounded-lg p-3">
                          <p className="text-2xl">🎧</p>
                          <p className="font-bold text-purple-800">{jsonPreview.listSections} Sections</p>
                          <p className="text-xs text-purple-600">{jsonPreview.listeningDuration} min</p>
                        </div>
                        <div className="bg-blue-50 rounded-lg p-3">
                          <p className="text-2xl">📖</p>
                          <p className="font-bold text-blue-800">{jsonPreview.readSections} Sections</p>
                          <p className="text-xs text-blue-600">{jsonPreview.readingDuration} min</p>
                        </div>
                        <div className="bg-green-50 rounded-lg p-3">
                          <p className="text-2xl">✍️</p>
                          <p className="font-bold text-green-800">{jsonPreview.writeSections} Sections</p>
                          <p className="text-xs text-green-600">{jsonPreview.writingDuration} min</p>
                        </div>
                      </div>
                      <div className="text-center pt-2">
                        <p className="text-sm text-gray-600">
                          Total Questions: <span className="font-bold text-indigo-600">{jsonPreview.totalQ}</span>
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="px-6 py-4 bg-gray-50 flex gap-3 justify-end border-t border-gray-200 flex-shrink-0">
                <button
                  onClick={() => {
                    setShowUploadModal(false);
                    setJsonPreview(null);
                    setJsonError(null);
                  }}
                  className="px-6 py-2.5 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 font-semibold transition"
                >
                  Cancel
                </button>
                <button
                  onClick={handleUpload}
                  disabled={uploading || !jsonPreview}
                  className={`px-6 py-2.5 rounded-lg font-semibold transition ${
                    uploading || !jsonPreview
                      ? "bg-gray-400 text-gray-200 cursor-not-allowed"
                      : "bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:from-indigo-700 hover:to-purple-700 shadow-lg"
                  }`}
                >
                  {uploading ? "Uploading..." : "✓ Upload Mock Exam"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default MockExamManagement;
