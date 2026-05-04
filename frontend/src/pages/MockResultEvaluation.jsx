import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import DashboardLayout from "../components/Layout/DashboardLayout";
import RubricSlider from "../components/RubricSlider";
import { getMockResultById, evaluateMockResult } from "../services/api";
import { toast } from "react-toastify";

const MockResultEvaluation = () => {
  const { mockResultId } = useParams();
  const navigate = useNavigate();

  const [mockResult, setMockResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Two-phase: "writing" or "speaking"
  const [currentPhase, setCurrentPhase] = useState("writing");

  const [writingScores, setWritingScores] = useState({
    taskResponse: 5,
    coherenceCohesion: 5,
    lexicalResource: 5,
    grammaticalRange: 5,
  });

  const [speakingScores, setSpeakingScores] = useState({
    fluencyCoherence: 5,
    lexicalResource: 5,
    grammaticalRange: 5,
    pronunciation: 5,
  });

  const [speakingNotes, setSpeakingNotes] = useState("");

  useEffect(() => {
    fetchMockResult();
  }, [mockResultId]);

  const fetchMockResult = async () => {
    try {
      setLoading(true);
      const data = await getMockResultById(mockResultId);
      setMockResult(data);

      // Determine initial phase based on what's already graded
      if (data.writingBand !== null && data.speakingBand === null) {
        setCurrentPhase("speaking");
      } else if (data.writingBand !== null && data.speakingBand !== null) {
        // Already fully evaluated — still show but in speaking phase
        setCurrentPhase("speaking");
      }

      // Pre-fill if already graded
      if (data.writingBand !== null) {
        const band = data.writingBand;
        setWritingScores({
          taskResponse: band,
          coherenceCohesion: band,
          lexicalResource: band,
          grammaticalRange: band,
        });
      }
      if (data.speakingBand !== null) {
        const band = data.speakingBand;
        setSpeakingScores({
          fluencyCoherence: band,
          lexicalResource: band,
          grammaticalRange: band,
          pronunciation: band,
        });
      }
      if (data.speakingNotes) setSpeakingNotes(data.speakingNotes);
    } catch (error) {
      console.error("Fetch mock result error:", error);
      toast.error("Failed to load mock result");
    } finally {
      setLoading(false);
    }
  };

  const calculateWritingBand = () => {
    const avg =
      (writingScores.taskResponse +
        writingScores.coherenceCohesion +
        writingScores.lexicalResource +
        writingScores.grammaticalRange) /
      4;
    return Math.round(avg * 2) / 2;
  };

  const calculateSpeakingBand = () => {
    const avg =
      (speakingScores.fluencyCoherence +
        speakingScores.lexicalResource +
        speakingScores.grammaticalRange +
        speakingScores.pronunciation) /
      4;
    return Math.round(avg * 2) / 2;
  };

  // Phase 1: Submit Writing Band Only
  const handleSubmitWriting = async () => {
    if (submitting) return;

    const finalWritingBand = calculateWritingBand();

    const confirmed = window.confirm(
      `Submit Writing Band: ${finalWritingBand}?\n\nYou can evaluate Speaking later after the interview.`
    );
    if (!confirmed) return;

    setSubmitting(true);
    try {
      await evaluateMockResult(mockResultId, {
        writingBand: finalWritingBand,
      });
      toast.success("✅ Writing evaluation saved! You can now evaluate Speaking when ready.");
      // Refresh data and move to speaking phase
      await fetchMockResult();
      setCurrentPhase("speaking");
    } catch (error) {
      console.error("Writing evaluation error:", error);
      toast.error("Failed to submit writing evaluation");
    } finally {
      setSubmitting(false);
    }
  };

  // Phase 2: Submit Speaking Band + Calculate Overall
  const handleSubmitSpeaking = async () => {
    if (submitting) return;

    const finalSpeakingBand = calculateSpeakingBand();

    const confirmed = window.confirm(
      `Submit Speaking Band: ${finalSpeakingBand}?\n\nThis will calculate the overall mock exam score.`
    );
    if (!confirmed) return;

    setSubmitting(true);
    try {
      await evaluateMockResult(mockResultId, {
        speakingBand: finalSpeakingBand,
        speakingNotes: speakingNotes.trim() || "",
      });
      toast.success("✅ Mock Exam evaluation complete! Overall band calculated.");
      setTimeout(() => navigate("/pending-reviews"), 1500);
    } catch (error) {
      console.error("Speaking evaluation error:", error);
      toast.error("Failed to submit speaking evaluation");
      setSubmitting(false);
    }
  };

  // Extract writing answers for display
  const getWritingContent = () => {
    if (!mockResult?.writingAnswers) return [];
    // Writing answers is an array of objects: [{ questionId, userAnswer, timeSpent }]
    if (Array.isArray(mockResult.writingAnswers)) {
      return mockResult.writingAnswers;
    }
    return [];
  };

  if (loading) {
    return (
      <DashboardLayout title="Mock Exam Evaluation">
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
        </div>
      </DashboardLayout>
    );
  }

  if (!mockResult) {
    return (
      <DashboardLayout title="Mock Exam Evaluation">
        <div className="text-center py-12">
          <h3 className="text-2xl font-bold text-gray-800 mb-4">Mock Result Not Found</h3>
          <button
            onClick={() => navigate("/pending-reviews")}
            className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
          >
            Back to Reviews
          </button>
        </div>
      </DashboardLayout>
    );
  }

  const writingBand = calculateWritingBand();
  const speakingBand = calculateSpeakingBand();
  const writingContent = getWritingContent();

  // Calculate preview overall
  const canCalculateOverall =
    mockResult.listeningBand !== null && mockResult.readingBand !== null;
  let previewOverall = null;
  if (canCalculateOverall) {
    const wBand = mockResult.writingBand !== null ? mockResult.writingBand : writingBand;
    const sBand = mockResult.speakingBand !== null ? mockResult.speakingBand : speakingBand;
    const sum = mockResult.listeningBand + mockResult.readingBand + wBand + sBand;
    const avg = sum / 4;
    const fraction = avg - Math.floor(avg);
    if (fraction < 0.25) previewOverall = Math.floor(avg);
    else if (fraction >= 0.25 && fraction < 0.75) previewOverall = Math.floor(avg) + 0.5;
    else previewOverall = Math.ceil(avg);
  }

  const studentName = mockResult.userId?.firstName
    ? `${mockResult.userId.firstName} ${mockResult.userId.lastName || ""}`
    : mockResult.userId?.name || mockResult.userId?.email || "Unknown";

  return (
    <DashboardLayout title="Mock Exam Evaluation">
      <div className="max-w-6xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-2xl font-bold text-gray-800">
                🎯 Mock Exam Evaluation
              </h2>
              <p className="text-gray-600 mt-1">Student: {studentName}</p>
              <p className="text-gray-500 text-sm mt-1">
                Exam: {mockResult.mockExamId?.title || "Mock Exam"}
              </p>
            </div>
            {previewOverall !== null && (
              <div className="text-right">
                <p className="text-sm text-gray-500">Preview Overall Band</p>
                <p className="text-5xl font-bold text-indigo-600">{previewOverall.toFixed(1)}</p>
              </div>
            )}
          </div>

          {/* Auto-Graded Modules */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
            <div className="bg-purple-50 rounded-xl p-4 text-center">
              <p className="text-sm text-purple-600 font-medium">🎧 Listening</p>
              <p className="text-3xl font-bold text-purple-800 mt-1">
                {mockResult.listeningBand !== null ? mockResult.listeningBand.toFixed(1) : "—"}
              </p>
              <p className="text-xs text-purple-500 mt-1">Auto-graded</p>
            </div>
            <div className="bg-blue-50 rounded-xl p-4 text-center">
              <p className="text-sm text-blue-600 font-medium">📖 Reading</p>
              <p className="text-3xl font-bold text-blue-800 mt-1">
                {mockResult.readingBand !== null ? mockResult.readingBand.toFixed(1) : "—"}
              </p>
              <p className="text-xs text-blue-500 mt-1">Auto-graded</p>
            </div>
            <div className={`rounded-xl p-4 text-center ${currentPhase === "writing" ? "bg-green-100 ring-2 ring-green-400" : "bg-green-50"}`}>
              <p className="text-sm text-green-600 font-medium">✍️ Writing</p>
              <p className="text-3xl font-bold text-green-800 mt-1">
                {mockResult.writingBand !== null ? mockResult.writingBand.toFixed(1) : writingBand.toFixed(1)}
              </p>
              <p className="text-xs text-green-500 mt-1">
                {mockResult.writingBand !== null ? "✓ Graded" : "Pending"}
              </p>
            </div>
            <div className={`rounded-xl p-4 text-center ${currentPhase === "speaking" ? "bg-orange-100 ring-2 ring-orange-400" : "bg-orange-50"}`}>
              <p className="text-sm text-orange-600 font-medium">🗣️ Speaking</p>
              <p className="text-3xl font-bold text-orange-800 mt-1">
                {mockResult.speakingBand !== null ? mockResult.speakingBand.toFixed(1) : speakingBand.toFixed(1)}
              </p>
              <p className="text-xs text-orange-500 mt-1">
                {mockResult.speakingBand !== null ? "✓ Graded" : "Pending"}
              </p>
            </div>
          </div>

          {/* Phase Indicator */}
          <div className="flex gap-3 mt-6">
            <button
              onClick={() => setCurrentPhase("writing")}
              className={`flex-1 py-3 rounded-xl font-bold text-sm transition ${
                currentPhase === "writing"
                  ? "bg-green-600 text-white shadow-lg"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              Phase 1: ✍️ Writing Evaluation
              {mockResult.writingBand !== null && " ✓"}
            </button>
            <button
              onClick={() => setCurrentPhase("speaking")}
              className={`flex-1 py-3 rounded-xl font-bold text-sm transition ${
                currentPhase === "speaking"
                  ? "bg-orange-600 text-white shadow-lg"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              Phase 2: 🗣️ Speaking Evaluation
              {mockResult.speakingBand !== null && " ✓"}
            </button>
          </div>
        </div>

        {/* ============================================ */}
        {/* PHASE 1: WRITING EVALUATION */}
        {/* ============================================ */}
        {currentPhase === "writing" && (
          <>
            {/* Student's Writing Content */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
              <h3 className="text-xl font-bold text-gray-800 mb-4">
                📄 Student's Writing Submission
              </h3>

              {writingContent && writingContent.length > 0 ? (
                <div className="space-y-6">
                  {writingContent.map((answerObj, idx) => (
                    <div key={answerObj._id || answerObj.questionId || idx} className="border border-gray-200 rounded-xl overflow-hidden">
                      <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
                        <h4 className="font-bold text-gray-700">
                          {idx === 0 ? "📝 Task 1" : "📝 Task 2"}
                        </h4>
                      </div>
                      <div className="p-4">
                        <p className="text-gray-800 whitespace-pre-wrap leading-relaxed text-sm">
                          {answerObj.userAnswer || <span className="text-red-400 italic">No response submitted</span>}
                        </p>
                        {answerObj.userAnswer && (
                          <div className="mt-3 pt-3 border-t border-gray-100">
                            <span className="text-xs text-gray-500 font-semibold">
                              Word count: {typeof answerObj.userAnswer === 'string' ? answerObj.userAnswer.trim().split(/\s+/).filter(w => w.length > 0).length : 0}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 text-sm text-yellow-700">
                  ⚠️ Writing submission data is not available. The student may not have completed the writing section, or the data could not be loaded.
                </div>
              )}
            </div>

            {/* Writing Rubric */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
              <h3 className="text-xl font-bold text-gray-800 mb-2">✍️ Writing Evaluation</h3>
              <p className="text-gray-500 text-sm mb-4">
                Grade the student based on their Writing Task 1 and Task 2 essays above.
              </p>

              <RubricSlider
                criterion="Task Response / Achievement"
                value={writingScores.taskResponse}
                onChange={(val) =>
                  setWritingScores({ ...writingScores, taskResponse: val })
                }
                description="Did the student address all parts of the prompt?"
              />
              <RubricSlider
                criterion="Coherence & Cohesion"
                value={writingScores.coherenceCohesion}
                onChange={(val) =>
                  setWritingScores({ ...writingScores, coherenceCohesion: val })
                }
                description="Clarity of expression and logical organization of ideas"
              />
              <RubricSlider
                criterion="Lexical Resource"
                value={writingScores.lexicalResource}
                onChange={(val) =>
                  setWritingScores({ ...writingScores, lexicalResource: val })
                }
                description="Range and accuracy of vocabulary used"
              />
              <RubricSlider
                criterion="Grammatical Range & Accuracy"
                value={writingScores.grammaticalRange}
                onChange={(val) =>
                  setWritingScores({ ...writingScores, grammaticalRange: val })
                }
                description="Variety and correct use of grammatical structures"
              />

              <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-200">
                <p className="text-gray-600 font-medium">
                  Calculated Writing Band: <span className="text-2xl font-bold text-green-600">{writingBand.toFixed(1)}</span>
                </p>
                <button
                  onClick={handleSubmitWriting}
                  disabled={submitting}
                  className="px-8 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl hover:from-green-700 hover:to-emerald-700 font-semibold transition shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? "Saving..." : mockResult.writingBand !== null ? "Update Writing Band" : "✓ Submit Writing Band"}
                </button>
              </div>
            </div>
          </>
        )}

        {/* ============================================ */}
        {/* PHASE 2: SPEAKING EVALUATION */}
        {/* ============================================ */}
        {currentPhase === "speaking" && (
          <>
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
              <h3 className="text-xl font-bold text-gray-800 mb-2">🗣️ Speaking Evaluation</h3>
              <p className="text-gray-500 text-sm mb-4">
                Grade the student based on their face-to-face speaking interview.
              </p>

              <RubricSlider
                criterion="Fluency & Coherence"
                value={speakingScores.fluencyCoherence}
                onChange={(val) =>
                  setSpeakingScores({ ...speakingScores, fluencyCoherence: val })
                }
                description="How smoothly and logically does the student speak?"
              />
              <RubricSlider
                criterion="Lexical Resource"
                value={speakingScores.lexicalResource}
                onChange={(val) =>
                  setSpeakingScores({ ...speakingScores, lexicalResource: val })
                }
                description="Range and accuracy of vocabulary in spoken context"
              />
              <RubricSlider
                criterion="Grammatical Range & Accuracy"
                value={speakingScores.grammaticalRange}
                onChange={(val) =>
                  setSpeakingScores({ ...speakingScores, grammaticalRange: val })
                }
                description="Variety and accuracy of grammar in speech"
              />
              <RubricSlider
                criterion="Pronunciation"
                value={speakingScores.pronunciation}
                onChange={(val) =>
                  setSpeakingScores({ ...speakingScores, pronunciation: val })
                }
                description="Clarity, intonation, and accent control"
              />
            </div>

            {/* Speaking Notes (Optional) */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
              <h3 className="text-xl font-bold text-gray-800 mb-2">📝 Speaking Notes</h3>
              <p className="text-gray-400 text-xs mb-3">Optional — provide feedback if desired</p>
              <textarea
                value={speakingNotes}
                onChange={(e) => setSpeakingNotes(e.target.value)}
                placeholder="Optional: Provide feedback on the student's speaking performance..."
                className="w-full h-28 p-4 border-2 border-gray-300 rounded-xl focus:border-indigo-500 focus:outline-none resize-none"
              />
              {speakingNotes.length > 0 && (
                <p className="text-sm text-gray-500 mt-2">{speakingNotes.length} characters</p>
              )}
            </div>

            {/* Submit Speaking */}
            <div className="flex items-center justify-between bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <p className="text-gray-600 font-medium">
                Calculated Speaking Band: <span className="text-2xl font-bold text-orange-600">{speakingBand.toFixed(1)}</span>
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => navigate("/pending-reviews")}
                  className="px-6 py-3 bg-gray-600 text-white rounded-xl hover:bg-gray-700 font-semibold transition"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmitSpeaking}
                  disabled={submitting}
                  className="px-8 py-3 bg-gradient-to-r from-orange-600 to-amber-600 text-white rounded-xl hover:from-orange-700 hover:to-amber-700 font-semibold transition shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? "Submitting..." : "✓ Submit Speaking & Finalize"}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  );
};

export default MockResultEvaluation;
