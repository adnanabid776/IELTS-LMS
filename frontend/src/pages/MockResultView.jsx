import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import DashboardLayout from "../components/Layout/DashboardLayout";
import { getMockResultById } from "../services/api";
import { toast } from "react-toastify";

const MockResultView = () => {
  const { mockResultId } = useParams();
  const navigate = useNavigate();

  const [mockResult, setMockResult] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMockResult();
  }, [mockResultId]);

  const fetchMockResult = async () => {
    try {
      setLoading(true);
      const data = await getMockResultById(mockResultId);
      setMockResult(data);
    } catch (error) {
      console.error("Fetch mock result error:", error);
      toast.error("Failed to load mock result");
    } finally {
      setLoading(false);
    }
  };

  const getBandColor = (band) => {
    if (band === null || band === undefined) return "text-gray-400";
    if (band >= 7) return "text-green-600";
    if (band >= 5) return "text-yellow-600";
    return "text-red-600";
  };

  const getBandBgColor = (band) => {
    if (band === null || band === undefined) return "bg-gray-50";
    if (band >= 7) return "bg-green-50";
    if (band >= 5) return "bg-yellow-50";
    return "bg-red-50";
  };

  if (loading) {
    return (
      <DashboardLayout title="Mock Exam Result">
        <div className="flex justify-center items-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
        </div>
      </DashboardLayout>
    );
  }

  if (!mockResult) {
    return (
      <DashboardLayout title="Mock Exam Result">
        <div className="text-center py-20">
          <h3 className="text-2xl font-bold text-gray-800 mb-4">Mock Result Not Found</h3>
          <button
            onClick={() => navigate("/history")}
            className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
          >
            Back to History
          </button>
        </div>
      </DashboardLayout>
    );
  }

  const isCompleted = mockResult.status === "completed";

  return (
    <DashboardLayout title="Mock Exam Result">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Overall Score Header */}
        <div className={`${getBandBgColor(mockResult.overallBand)} rounded-3xl shadow-sm border border-gray-100 p-10 text-center mb-8 relative overflow-hidden`}>
          <div className="relative z-10">
            <h2 className="text-3xl font-black text-gray-900 mb-2 uppercase tracking-tight">
              Mock Exam Result
            </h2>
            <p className="text-gray-600 mb-8 font-medium">
              {mockResult.mockExamId?.title || "IELTS Full Mock Test"}
            </p>

            <div className="flex flex-col items-center">
              <span className="text-sm font-bold text-gray-500 uppercase tracking-widest mb-1">Overall Band Score</span>
              <div className={`text-9xl font-black ${getBandColor(mockResult.overallBand)} drop-shadow-sm`}>
                {mockResult.overallBand !== null ? mockResult.overallBand.toFixed(1) : "—"}
              </div>
              <p className="text-lg font-semibold text-gray-400 mt-2">out of 9.0</p>
            </div>

            {!isCompleted && (
              <div className="mt-8 inline-flex items-center gap-2 px-4 py-2 bg-orange-100 text-orange-700 rounded-full text-sm font-bold animate-pulse">
                <span>⏳</span> Evaluation in Progress
              </div>
            )}
          </div>
          
          {/* Decorative Background Circles */}
          <div className="absolute -top-10 -right-10 w-40 h-40 bg-white opacity-20 rounded-full"></div>
          <div className="absolute -bottom-10 -left-10 w-60 h-60 bg-white opacity-20 rounded-full"></div>
        </div>

        {/* Module Breakdown */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {[
            { label: "Listening", band: mockResult.listeningBand, icon: "🎧", color: "purple" },
            { label: "Reading", band: mockResult.readingBand, icon: "📖", color: "blue" },
            { label: "Writing", band: mockResult.writingBand, icon: "✍️", color: "green" },
            { label: "Speaking", band: mockResult.speakingBand, icon: "🗣️", color: "orange" },
          ].map((mod) => (
            <div key={mod.label} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex items-center justify-between hover:shadow-md transition-shadow">
              <div className="flex items-center gap-4">
                <div className={`w-14 h-14 rounded-2xl bg-${mod.color}-50 flex items-center justify-center text-3xl`}>
                  {mod.icon}
                </div>
                <div>
                  <h4 className="font-bold text-gray-800 text-lg">{mod.label}</h4>
                  <p className="text-xs text-gray-500 font-medium">IELTS Module</p>
                </div>
              </div>
              <div className="text-right">
                <div className={`text-4xl font-black ${getBandColor(mod.band)}`}>
                  {mod.band !== null ? mod.band.toFixed(1) : "—"}
                </div>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Band Score</p>
              </div>
            </div>
          ))}
        </div>

        {/* Speaking Feedback (If exists) */}
        {mockResult.speakingNotes && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 mb-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center text-xl">🗣️</div>
              <h3 className="text-xl font-bold text-gray-800">Speaking Feedback</h3>
            </div>
            <div className="prose prose-indigo max-w-none">
              <p className="text-gray-700 leading-relaxed italic">
                "{mockResult.speakingNotes}"
              </p>
            </div>
            {mockResult.speakingTeacherId && (
              <p className="text-xs text-gray-400 mt-6 font-medium">
                — Evaluated by {mockResult.speakingTeacherId?.name || "IELTS Specialist"}
              </p>
            )}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4">
          <button
            onClick={() => navigate("/history?tab=mock")}
            className="flex-1 px-8 py-4 bg-gray-100 text-gray-800 rounded-2xl hover:bg-gray-200 font-bold transition flex items-center justify-center gap-2"
          >
            <span>🔙</span> Back to History
          </button>
          <button
            onClick={() => navigate("/dashboard")}
            className="flex-1 px-8 py-4 bg-indigo-600 text-white rounded-2xl hover:bg-indigo-700 font-bold transition shadow-lg shadow-indigo-200 flex items-center justify-center gap-2"
          >
            <span>🏠</span> Go to Dashboard
          </button>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default MockResultView;
