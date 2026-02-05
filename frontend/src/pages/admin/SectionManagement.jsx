import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  getSectionsByTestId,
  deleteSection,
  getTestById,
} from "../../services/api";
import { toast } from "react-toastify";
import DashboardLayout from "../../components/Layout/DashboardLayout";
import AddSectionModal from "./components/AddSectionModal";
import EditSectionModal from "./components/EditSectionModal";

const SectionManagement = () => {
  const { testId } = useParams();
  const navigate = useNavigate();

  const [sections, setSections] = useState([]);
  const [testInfo, setTestInfo] = useState(null);
  const [loading, setLoading] = useState(true);

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedSection, setSelectedSection] = useState(null);

  useEffect(() => {
    if (testId) {
      fetchSections();
    }
  }, [testId]);

  const fetchSections = async () => {
    try {
      setLoading(true);

      // Fetch test info to get the module type
      const testResponse = await getTestById(testId);
      setTestInfo(testResponse.test);

      const response = await getSectionsByTestId(testId);
      setSections(response.sections);
    } catch (error) {
      console.error("Fetch sections error:", error);
      toast.error("Failed to load sections");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (sectionId, sectionTitle) => {
    const confirmed = window.confirm(
      `Are you sure you want to delete "${sectionTitle}"?\n\nThis will also delete ALL questions in this section!`,
    );

    if (!confirmed) return;

    try {
      await deleteSection(sectionId);
      toast.success("Section deleted successfully");
      fetchSections();
    } catch (error) {
      console.error("Delete section error:", error);
      const errorMsg =
        error.response?.data?.error || "Failed to delete section";
      toast.error(errorMsg);
    }
  };

  const handleEdit = (section) => {
    setSelectedSection(section);
    setShowEditModal(true);
  };

  return (
    <DashboardLayout title="Section Management">
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => navigate("/admin/tests")}
          className="text-blue-600 hover:text-blue-700 font-semibold mb-3 flex items-center gap-2"
        >
          ← Back to Tests
        </button>
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">
              Manage Sections
            </h2>
            {/* <p className="text-gray-600 text-sm">
              {testInfo
                ? `${testInfo.title} - ${(testInfo.module || "N/A").toUpperCase()}`
                : "Loading..."}
            </p> */}
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 font-semibold flex items-center gap-2 shadow-lg transform hover:scale-105 transition"
          >
            <span className="text-xl">➕</span>
            Add Section
          </button>
        </div>
      </div>

      {/* Info Box */}
      <div className="mb-6 bg-blue-50 border-2 border-blue-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <span className="text-2xl">💡</span>
          <div>
            <h3 className="font-bold text-blue-900 mb-1">
              IELTS Test Structure
            </h3>
            <p className="text-sm text-blue-800">
              Each test should have <strong>3 sections</strong> with
              approximately <strong>13-14 questions each</strong> (total 40
              questions).
              <br />
              • Section 1: Questions 1-13
              <br />
              • Section 2: Questions 14-27
              <br />• Section 3: Questions 28-40
            </p>
          </div>
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      )}

      {/* Sections Grid */}
      {!loading && sections.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {sections.map((section) => (
            <div
              key={section._id}
              className="bg-white rounded-lg shadow-lg border-2 border-gray-200 hover:border-blue-500 transition overflow-hidden"
            >
              {/* Card Header */}
              <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white px-4 py-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-lg">
                    Section {section.sectionNumber}
                  </h3>
                  {/* Nothing was here...... */}
                </div>
              </div>

              {/* Card Content */}
              <div className="p-4">
                <h4 className="font-bold text-gray-800 mb-2 text-lg">
                  {section.title}
                </h4>

                <div className="space-y-2 text-sm text-gray-600 mb-4">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">Questions:</span>
                    <span>{section.questionRange || "Not set"}</span>
                  </div>
                  {section.duration && (
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">Duration:</span>
                      <span>{section.duration} minutes</span>
                    </div>
                  )}
                </div>

                {section.passageText && (
                  <div className="bg-gray-50 p-3 rounded mb-4">
                    <p className="text-xs text-gray-600 line-clamp-3">
                      {section.passageText}
                    </p>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex gap-2">
                  {/* <button
                    onClick={() => handleViewQuestions(section._id)}
                    className="flex-1 px-3 py-2 bg-green-600 text-white rounded hover:bg-green-700 font-semibold text-sm"
                  >
                    View Questions
                  </button> */}
                  <button
                    onClick={() => handleEdit(section)}
                    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 font-semibold text-sm"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(section._id, section.title)}
                    className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 font-semibold text-sm"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!loading && sections.length === 0 && (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <div className="w-24 h-24 bg-gradient-to-br from-blue-100 to-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-5xl">📚</span>
          </div>
          <h3 className="text-2xl font-bold text-gray-800 mb-2">
            No sections yet
          </h3>
          <p className="text-gray-600 mb-6">
            Create 3 sections for this test to get started
          </p>
          <button
            onClick={() => setShowAddModal(true)}
            className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 font-semibold"
          >
            Create First Section
          </button>
        </div>
      )}

      {/* Modals */}
      {showAddModal && (
        <AddSectionModal
          testId={testId}
          testModule={testInfo?.module}
          existingSections={sections}
          onClose={() => setShowAddModal(false)}
          onSuccess={() => {
            setShowAddModal(false);
            fetchSections();
          }}
        />
      )}

      {showEditModal && selectedSection && (
        <EditSectionModal
          section={selectedSection}
          testModule={testInfo?.module}
          onClose={() => {
            setShowEditModal(false);
            setSelectedSection(null);
          }}
          onSuccess={() => {
            setShowEditModal(false);
            setSelectedSection(null);
            fetchSections();
          }}
        />
      )}
    </DashboardLayout>
  );
};

export default SectionManagement;
