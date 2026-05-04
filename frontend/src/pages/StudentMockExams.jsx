import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "../components/Layout/DashboardLayout";
import { getAllMockExams, initializeMockResult } from "../services/api";
import { toast } from "react-toastify";

const StudentMockExams = () => {
  const navigate = useNavigate();
  const [mockExams, setMockExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);

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
      toast.error("Failed to load available mock exams");
    } finally {
      setLoading(false);
    }
  };

  const handleStartExam = async (exam) => {
    const confirmed = window.confirm(
      `Ready to start ${exam.title}?\n\nThis is a full-length mock exam containing Listening, Reading, and Writing sections. It will take approximately 2 hours and 45 minutes.`
    );

    if (!confirmed) return;

    try {
      setStarting(true);
      
      // Initialize the mock result session
      const resultData = await initializeMockResult(exam._id);
      
      // Navigate to the listening test (first module in IELTS)
      toast.info("Starting Mock Exam: Listening Module...");
      setTimeout(() => {
        navigate(`/test/listening/${exam.listeningTestId._id}?mockExamId=${exam._id}&mockResultId=${resultData._id}&readingTestId=${exam.readingTestId._id}&writingTestId=${exam.writingTestId._id}`);
      }, 1500);

    } catch (error) {
      console.error("Start exam error:", error);
      setStarting(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout title="Mock Exams">
        <div className="flex justify-center items-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Mock Exams">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-8 text-center bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-3xl p-8 shadow-xl">
          <h1 className="text-4xl font-extrabold mb-4">IELTS Mock Exams</h1>
          <p className="text-indigo-100 max-w-2xl mx-auto text-lg">
            Experience the real test environment. Full-length mock exams covering Listening, Reading, and Writing in a single session.
          </p>
        </div>

        {mockExams.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-2xl shadow-sm border border-gray-100">
            <p className="text-6xl mb-4">🎯</p>
            <h3 className="text-2xl font-bold text-gray-800 mb-2">No Mock Exams Available</h3>
            <p className="text-gray-500">Check back later for new full-length practice tests.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {mockExams.map((exam) => (
              <div
                key={exam._id}
                className="bg-white rounded-2xl shadow-sm border border-gray-100 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 overflow-hidden flex flex-col"
              >
                <div className="p-6 flex-1">
                  <div className="flex justify-between items-start mb-4">
                    <span className="bg-indigo-100 text-indigo-800 text-xs font-bold px-3 py-1 rounded-full">
                      FULL EXAM
                    </span>
                    <span className="text-gray-400 text-sm">~ 2h 45m</span>
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">{exam.title}</h3>
                  <p className="text-gray-600 text-sm mb-6 line-clamp-2">
                    {exam.description || "Complete IELTS practice test covering three modules sequentially."}
                  </p>
                  
                  <div className="space-y-3">
                    <div className="flex items-center text-sm">
                      <span className="w-8 text-xl">🎧</span>
                      <span className="text-gray-700">Listening ({exam.listeningTestId?.totalSections || 4} sections)</span>
                    </div>
                    <div className="flex items-center text-sm">
                      <span className="w-8 text-xl">📖</span>
                      <span className="text-gray-700">Reading ({exam.readingTestId?.totalSections || 3} sections)</span>
                    </div>
                    <div className="flex items-center text-sm">
                      <span className="w-8 text-xl">✍️</span>
                      <span className="text-gray-700">Writing ({exam.writingTestId?.totalSections || 2} tasks)</span>
                    </div>
                  </div>
                </div>
                
                <div className="p-4 bg-gray-50 border-t border-gray-100">
                  <button
                    onClick={() => handleStartExam(exam)}
                    disabled={starting}
                    className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold transition shadow-md hover:shadow-lg disabled:opacity-50"
                  >
                    {starting ? "Initializing..." : "Start Mock Exam"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default StudentMockExams;
