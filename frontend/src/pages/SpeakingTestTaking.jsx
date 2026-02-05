import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import DashboardLayout from "../components/Layout/DashboardLayout";
import AudioRecorder from "../components/AudioRecorder";
import { toast } from "react-toastify";
import axios from "axios";

const API_URL = "http://localhost:5000/api";

const SpeakingTestTaking = () => {
  const { testId } = useParams();
  const navigate = useNavigate();

  const [test, setTest] = useState(null);
  const [sections, setSections] = useState([]);
  const [session, setSession] = useState(null);
  const [currentSectionIndex, setCurrentSectionIndex] = useState(0);
  const [recordings, setRecordings] = useState({});
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const currentSection = sections[currentSectionIndex] || null;

  useEffect(() => {
    fetchTestData();
  }, [testId]);

  const fetchTestData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");

      // Get test details
      const testResponse = await axios.get(`${API_URL}/tests/${testId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const testData = testResponse.data.test;
      const sectionsData = testResponse.data.sections;

      setTest(testData);
      setSections(sectionsData);

      // Start session
      await startSession(testData);
    } catch (error) {
      console.error("Fetch test data error:", error);
      toast.error("Failed to load test");
      navigate("/tests");
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
  // Run diagnostics only once on component mount
  const runDiagnostics = async () => {
    console.log("🔍 SPEAKING TEST DIAGNOSTICS");
    console.log("Page:", window.location.href);
    console.log("Secure context:", window.isSecureContext);
    console.log("Has MediaRecorder:", typeof MediaRecorder !== "undefined");
    
    // Test microphone access
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      console.log("✅ Microphone test: SUCCESS");
      stream.getTracks().forEach(track => track.stop());
    } catch (error) {
      console.error("❌ Microphone test:", error.name, error.message);
    }
  };
  
  runDiagnostics();
}, []);

  const startSession = async (testData) => {
    try {
      const token = localStorage.getItem("token");

      const response = await axios.post(
        `${API_URL}/sessions/start`,
        { testId },
        { headers: { Authorization: `Bearer ${token}` } },
      );

      setSession(response.data.session);
      toast.success("Speaking test started!");
    } catch (error) {
      console.error("Start session error:", error);
      toast.error("Failed to start test");
      navigate("/tests");
    }
  };

  const handleRecordingComplete = async (audioBlob) => {
    setUploading(true);

    try {
      const token = localStorage.getItem("token");

      // Upload to Cloudinary
      const formData = new FormData();
      formData.append(
        "audio",
        audioBlob,
        `speaking-${currentSection._id}.webm`,
      );

      const uploadResponse = await axios.post(
        `${API_URL}/upload/audio`,
        formData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "multipart/form-data",
          },
        },
      );

      const audioUrl = uploadResponse.data.url;

      // Save speaking answer with audio URL
      await axios.post(
        `${API_URL}/sessions/save-speaking-answer`,
        {
          sessionId: session._id,
          sectionId: currentSection._id, // Use section ID for speaking
          audioUrl: audioUrl,
        },
        { headers: { Authorization: `Bearer ${token}` } },
      );

      // Store locally
      setRecordings((prev) => ({
        ...prev,
        [currentSection._id]: audioUrl,
      }));

      toast.success("✅ Recording uploaded successfully!");

      // Auto-advance to next section
      if (currentSectionIndex < sections.length - 1) {
        setTimeout(() => {
          setCurrentSectionIndex((prev) => prev + 1);
        }, 1000);
      }
    } catch (error) {
      console.error("Upload recording error:", error);
      console.error("Error response:", error.response?.data);
      console.error("Error status:", error.response?.status);
      toast.error(
        `Failed to upload: ${error.response?.data?.error || error.message}`,
      );
    } finally {
      setUploading(false);
    }
  };

  const handleNextSection = () => {
    if (!recordings[currentSection._id]) {
      toast.error("Please complete the recording for this section first.");
      return;
    }

    if (currentSectionIndex < sections.length - 1) {
      setCurrentSectionIndex((prev) => prev + 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const handlePreviousSection = () => {
    if (currentSectionIndex > 0) {
      setCurrentSectionIndex((prev) => prev - 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const handleSubmitTest = async () => {
    // Check all sections have recordings
    const missingRecordings = sections.filter((s) => !recordings[s._id]);
    if (missingRecordings.length > 0) {
      toast.error(
        `Please complete all sections. Missing: ${missingRecordings.length} section(s)`,
      );
      return;
    }

    const confirmed = window.confirm(
      "Are you sure you want to submit? You cannot change your recordings after submission.",
    );

    if (!confirmed) return;

    setSubmitting(true);

    try {
      const token = localStorage.getItem("token");

      // Submit session
      await axios.post(
        `${API_URL}/sessions/submit`,
        { sessionId: session._id },
        { headers: { Authorization: `Bearer ${token}` } },
      );

      // Create result (will be manually graded)
      const resultResponse = await axios.post(
        `${API_URL}/results/create-manual`,
        {
          sessionId: session._id,
          testId: test._id,
          module: "speaking",
        },
        { headers: { Authorization: `Bearer ${token}` } },
      );

      toast.success("✅ Speaking test submitted! Waiting for teacher review.");

      setTimeout(() => {
        navigate("/dashboard");
      }, 2000);
    } catch (error) {
      console.error("Submit test error:", error);
      toast.error("Failed to submit test");
      setSubmitting(false);
    }
  };

  const getPartTitle = (partNumber) => {
    switch (partNumber) {
      case 1:
        return "Interview";
      case 2:
        return "Long Turn (Cue Card)";
      case 3:
        return "Discussion";
      default:
        return "Speaking Part";
    }
  };

  const getPartIcon = (partNumber) => {
    switch (partNumber) {
      case 1:
        return "💬";
      case 2:
        return "📋";
      case 3:
        return "🗣️";
      default:
        return "🎤";
    }
  };

  if (loading) {
    return (
      <DashboardLayout title="Loading Test...">
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-orange-600"></div>
        </div>
      </DashboardLayout>
    );
  }
  
  async function diagnoseSpeakingTest() {
    console.log("🔍 SPEAKING TEST DIAGNOSTICS\n");

    // Check 1: Page location
    console.log("1️⃣ PAGE LOCATION:");
    console.log("URL:", window.location.href);
    console.log(
      "Is localhost?",
      window.location.hostname === "localhost" ? "✅ YES" : "❌ NO",
    );
    console.log("");

    // Check 2: React state (if you can access it)
    console.log("2️⃣ LOOKING FOR ERRORS:");
    const errors = document.querySelectorAll('.error, [class*="error"]');
    console.log("Error elements found:", errors.length);
    console.log("");

    // Check 3: AudioRecorder component
    console.log("3️⃣ AUDIO RECORDER:");
    const audioRecorder = document.querySelector('[class*="orange"]'); // Your recorder has orange bg
    console.log("AudioRecorder rendered?", audioRecorder ? "✅ YES" : "❌ NO");
    console.log("");

    // Check 4: Browser support
    console.log("4️⃣ BROWSER SUPPORT:");
    console.log(
      "MediaRecorder:",
      typeof MediaRecorder !== "undefined" ? "✅" : "❌",
    );
    console.log(
      "getUserMedia:",
      !navigator.mediaDevices?.getUserMedia ? "✅" : "❌",
    );
    console.log("Secure context:", window.isSecureContext ? "✅" : "❌");
    console.log("");

    // Check 5: Try microphone
    console.log("5️⃣ MICROPHONE ACCESS:");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      console.log("✅ SUCCESS! Microphone works");
      stream.getTracks().forEach((track) => track.stop());
    } catch (error) {
      console.error("❌ FAILED:", error.name, "-", error.message);
    }

    console.log("\n✅ Diagnostics complete!");
  }

  // diagnoseSpeakingTest();
  

  return (
    <DashboardLayout title="Speaking Test">
      {/* Header */}
      <div className="bg-gradient-to-r from-orange-600 to-red-600 rounded-lg shadow-lg p-6 mb-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className="text-4xl">🎤</span>
              <h1 className="text-3xl font-bold">{test?.title}</h1>
            </div>
            <p className="text-orange-100">
              Part {currentSection?.speakingPartNumber} of 3 •{" "}
              {getPartTitle(currentSection?.speakingPartNumber)}
            </p>
          </div>

          <div className="text-right">
            <p className="text-sm text-orange-100 mb-1">Completed</p>
            <p className="text-4xl font-bold bg-white text-orange-600 px-4 py-2 rounded-lg">
              {Object.keys(recordings).length} / {sections.length}
            </p>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mt-4">
          <div className="h-2 bg-orange-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-yellow-400 transition-all duration-300"
              style={{
                width: `${(Object.keys(recordings).length / sections.length) * 100}%`,
              }}
            />
          </div>
        </div>
      </div>

      {/* Section Content */}
      {currentSection && (
        <div className="space-y-6">
          {/* Part Information */}
          <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-orange-500">
            <div className="flex items-center gap-3 mb-4">
              <span className="text-5xl">
                {getPartIcon(currentSection.speakingPartNumber)}
              </span>
              <div>
                <h2 className="text-2xl font-bold text-gray-800">
                  Part {currentSection.speakingPartNumber}:{" "}
                  {getPartTitle(currentSection.speakingPartNumber)}
                </h2>
                <p className="text-gray-600">{currentSection.title}</p>
              </div>
            </div>

            {currentSection.instructions && (
              <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mb-4">
                <p className="text-blue-800">
                  <span className="font-bold">Instructions:</span>{" "}
                  {currentSection.instructions}
                </p>
              </div>
            )}
          </div>

          {/* Cue Card (Part 2) */}
          {currentSection.cueCard && (
            <div className="bg-gradient-to-br from-yellow-50 to-orange-50 rounded-lg shadow-md p-8 border-2 border-yellow-300">
              <h3 className="text-2xl font-bold text-gray-800 mb-4">
                📋 Cue Card
              </h3>

              <div className="bg-white rounded-lg p-6 shadow-inner mb-6">
                <h4 className="text-xl font-bold text-orange-600 mb-4">
                  {currentSection.cueCard.topic}
                </h4>

                {currentSection.cueCard.bulletPoints &&
                  currentSection.cueCard.bulletPoints.length > 0 && (
                    <div className="space-y-2">
                      <p className="font-semibold text-gray-700 mb-2">
                        You should say:
                      </p>
                      {currentSection.cueCard.bulletPoints.map(
                        (point, index) => (
                          <div key={index} className="flex items-start gap-2">
                            <span className="text-orange-500">•</span>
                            <p className="text-gray-700">{point}</p>
                          </div>
                        ),
                      )}
                    </div>
                  )}
              </div>

              <div className="flex items-center gap-6 text-sm text-gray-600 bg-white rounded-lg p-4">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">⏱️</span>
                  <div>
                    <p className="font-semibold">Preparation Time</p>
                    <p>
                      {currentSection.cueCard.preparationTime || 10} seconds
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-2xl">🎤</span>
                  <div>
                    <p className="font-semibold">Speaking Time</p>
                    <p>{currentSection.cueCard.speakingTime || 120} seconds</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Audio Recorder */}
          {!recordings[currentSection._id] ? (
            <AudioRecorder
              onRecordingComplete={handleRecordingComplete}
              maxDuration={currentSection.cueCard?.speakingTime || 120}
              preparationTime={currentSection.cueCard?.preparationTime || 60}
            />
          ) : (
            <div className="bg-green-50 border-2 border-green-500 rounded-lg p-8 text-center">
              <div className="w-24 h-24 bg-green-200 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-6xl">✅</span>
              </div>
              <h3 className="text-2xl font-bold text-green-800 mb-2">
                Recording Complete!
              </h3>
              <p className="text-green-700 mb-4">
                Your recording has been saved and uploaded.
              </p>
              <audio controls className="mx-auto max-w-md w-full">
                <source
                  src={recordings[currentSection._id]}
                  type="audio/webm"
                />
              </audio>
            </div>
          )}

          {/* Uploading State */}
          {uploading && (
            <div className="bg-blue-50 border-2 border-blue-500 rounded-lg p-6 text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-blue-800 font-semibold">
                Uploading your recording...
              </p>
            </div>
          )}
        </div>
      )}

      {/* Navigation */}
      <div className="flex items-center justify-between gap-4 mt-8 sticky bottom-0 bg-white p-4 border-t-2 border-gray-200 shadow-lg">
        <button
          onClick={handlePreviousSection}
          disabled={currentSectionIndex === 0}
          className="px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
        >
          ← Previous Part
        </button>

        <div className="text-center">
          <p className="text-sm text-gray-600">
            Part {currentSectionIndex + 1} of {sections.length}
          </p>
        </div>
        {currentSectionIndex < sections.length - 1 ? (
          <button
            onClick={handleNextSection}
            disabled={!recordings[currentSection._id]}
            className="px-6 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Next Part →
          </button>
        ) : (
          <button
            onClick={handleSubmitTest}
            disabled={
              submitting || Object.keys(recordings).length < sections.length
            }
            className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? "Submitting..." : "✓ Submit Test"}
          </button>
        )}
      </div>
    </DashboardLayout>
  );
};

export default SpeakingTestTaking;
