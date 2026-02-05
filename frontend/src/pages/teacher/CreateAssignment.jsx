import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAllTests, getAllStudents, createAssignment } from '../../services/api';
import { toast } from 'react-toastify';
import DashboardLayout from '../../components/Layout/DashboardLayout';

const CreateAssignment = () => {
  const navigate = useNavigate();

  const [tests, setTests] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [selectedTest, setSelectedTest] = useState('');
  const [selectedStudents, setSelectedStudents] = useState([]);
  const [dueDate, setDueDate] = useState('');
  const [instructions, setInstructions] = useState('');
  const [selectAll, setSelectAll] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [testsResponse, studentsResponse] = await Promise.all([
        getAllTests(),
        getAllStudents(),
      ]);
      setTests(testsResponse.tests);
      setStudents(studentsResponse.students);
    } catch (error) {
      console.error('Fetch data error:', error);
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedStudents([]);
    } else {
      setSelectedStudents(students.map((s) => s._id));
    }
    setSelectAll(!selectAll);
  };

  const handleStudentToggle = (studentId) => {
    if (selectedStudents.includes(studentId)) {
      setSelectedStudents(selectedStudents.filter((id) => id !== studentId));
      setSelectAll(false);
    } else {
      const newSelected = [...selectedStudents, studentId];
      setSelectedStudents(newSelected);
      if (newSelected.length === students.length) {
        setSelectAll(true);
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validation
    if (!selectedTest) {
      toast.error('Please select a test');
      return;
    }
    if (selectedStudents.length === 0) {
      toast.error('Please select at least one student');
      return;
    }
    if (!dueDate) {
      toast.error('Please set a due date');
      return;
    }

    // Check due date is in the future
    const dueDateObj = new Date(dueDate);
    const now = new Date();
    if (dueDateObj <= now) {
      toast.error('Due date must be in the future');
      return;
    }

    try {
      setSubmitting(true);

      const assignmentData = {
        testId: selectedTest,
        students: selectedStudents,
        dueDate: dueDateObj.toISOString(),
        instructions: instructions.trim() || undefined,
      };

      await createAssignment(assignmentData);

      toast.success(
        `Assignment created successfully! Assigned to ${selectedStudents.length} student${
          selectedStudents.length > 1 ? 's' : ''
        }`
      );

      // Navigate to assignments list
      setTimeout(() => {
        navigate('/teacher/assignments');
      }, 1500);
    } catch (error) {
      console.error('Create assignment error:', error);
      toast.error('Failed to create assignment');
    } finally {
      setSubmitting(false);
    }
  };

  const getMinDate = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
  };

  if (loading) {
    return (
      <DashboardLayout title="Create Assignment">
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Create Assignment">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-2">
          Create New Assignment
        </h2>
        <p className="text-gray-600">Assign a test to your students</p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-6">
        {/* Select Test */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Select Test <span className="text-red-500">*</span>
          </label>
          <select
            value={selectedTest}
            onChange={(e) => setSelectedTest(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          >
            <option value="">-- Choose a test --</option>
            {tests.map((test) => (
              <option key={test._id} value={test._id}>
                {test.title} ({test.module.toUpperCase()} - {test.totalQuestions}{' '}
                questions)
              </option>
            ))}
          </select>
          {tests.length === 0 && (
            <p className="text-sm text-red-600 mt-1">
              No tests available. Please create a test first.
            </p>
          )}
        </div>

        {/* Select Students */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <label className="block text-sm font-medium text-gray-700">
              Select Students <span className="text-red-500">*</span>
            </label>
            <button
              type="button"
              onClick={handleSelectAll}
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              {selectAll ? 'Deselect All' : 'Select All'}
            </button>
          </div>

          {students.length > 0 ? (
            <div className="border border-gray-300 rounded-lg max-h-64 overflow-y-auto">
              {students.map((student) => (
                <label
                  key={student._id}
                  className="flex items-center p-3 hover:bg-gray-50 cursor-pointer border-b last:border-b-0"
                >
                  <input
                    type="checkbox"
                    checked={selectedStudents.includes(student._id)}
                    onChange={() => handleStudentToggle(student._id)}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                  />
                  <div className="ml-3 flex items-center flex-1">
                    <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold text-xs mr-3">
                      {student.firstName[0]}
                      {student.lastName[0]}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {student.firstName} {student.lastName}
                      </p>
                      <p className="text-xs text-gray-500">{student.email}</p>
                    </div>
                  </div>
                </label>
              ))}
            </div>
          ) : (
            <p className="text-sm text-red-600 border border-red-300 rounded-lg p-4 bg-red-50">
              No students found. Students need to register first.
            </p>
          )}

          {selectedStudents.length > 0 && (
            <p className="text-sm text-gray-600 mt-2">
              {selectedStudents.length} student{selectedStudents.length > 1 ? 's' : ''}{' '}
              selected
            </p>
          )}
        </div>

        {/* Due Date */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Due Date <span className="text-red-500">*</span>
          </label>
          <input
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            min={getMinDate()}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
          <p className="text-xs text-gray-500 mt-1">
            Students must complete the test before this date
          </p>
        </div>

        {/* Instructions (Optional) */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Instructions (Optional)
          </label>
          <textarea
            value={instructions}
            onChange={(e) => setInstructions(e.target.value)}
            rows="4"
            placeholder="Add any special instructions for students..."
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <p className="text-xs text-gray-500 mt-1">
            These instructions will be shown to students when they view the assignment
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-4 justify-end pt-4 border-t border-gray-200">
          <button
            type="button"
            onClick={() => navigate('/teacher/assignments')}
            className="px-6 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 font-semibold"
            disabled={submitting}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className={`px-6 py-2 rounded-lg font-semibold ${
              submitting
                ? 'bg-gray-400 text-gray-200 cursor-not-allowed'
                : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
          >
            {submitting ? 'Creating...' : 'Create Assignment'}
          </button>
        </div>
      </form>
    </DashboardLayout>
  );
};

export default CreateAssignment;