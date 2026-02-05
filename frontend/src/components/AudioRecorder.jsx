import React, { useState, useRef, useEffect } from "react";
import { toast } from "react-toastify";

const AudioRecorder = ({
  onRecordingComplete,
  maxDuration = 120,
  preparationTime = 10,
}) => {
  const [recordingState, setRecordingState] = useState("idle");
  const [preparationTimer, setPreparationTimer] = useState(preparationTime);
  const [recordingTimer, setRecordingTimer] = useState(0);
  const [audioBlob, setAudioBlob] = useState(null);
  const [audioUrl, setAudioUrl] = useState(null);
  const [volume, setVolume] = useState(0);
  const [isHeadphonesMode, setIsHeadphonesMode] = useState(true);

  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const streamRef = useRef(null);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const sourceNodeRef = useRef(null); // NEW: Track source node
  const volumeUpdateIntervalRef = useRef(null);

  useEffect(() => {
    return () => {
      console.log("🧹 Component unmounting - cleaning up...");
      
      // Stop all tracks
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => {
          track.stop();
          console.log("🛑 Track stopped on unmount");
        });
        streamRef.current = null;
      }

      // Disconnect source node first (CRITICAL!)
      if (sourceNodeRef.current) {
        try {
          sourceNodeRef.current.disconnect();
          console.log("🔌 Source node disconnected");
        } catch (error) {
          console.error("Source already disconnected");
          console.warn("Source already disconnected");
        }
        sourceNodeRef.current = null;
      }

      // Close audio context
      if (audioContextRef.current && audioContextRef.current.state !== "closed") {
        audioContextRef.current.close().then(() => {
          console.log("🔇 AudioContext closed on unmount");
        });
        audioContextRef.current = null;
      }

      // Clear volume interval
      if (volumeUpdateIntervalRef.current) {
        clearInterval(volumeUpdateIntervalRef.current);
        volumeUpdateIntervalRef.current = null;
      }

      // Revoke blob URL
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
    };
  }, []);

  // ============================================
  // PREPARATION TIMER
  // ============================================
  useEffect(() => {
    if (recordingState !== "preparing") return;

    if (preparationTimer <= 0) {
      startRecording();
      return;
    }

    const timer = setInterval(() => {
      setPreparationTimer((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [recordingState, preparationTimer]);

  // ============================================
  // RECORDING TIMER
  // ============================================
  useEffect(() => {
    if (recordingState !== "recording") return;

    const timer = setInterval(() => {
      setRecordingTimer((prev) => {
        if (prev >= maxDuration) {
          stopRecording();
          return maxDuration;
        }
        return prev + 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [recordingState, maxDuration]);

  // ============================================
  // GET SUPPORTED MIME TYPE
  // ============================================
  const getSupportedMimeType = () => {
    const types = [
      "audio/webm;codecs=opus",
      "audio/webm",
      "audio/ogg;codecs=opus",
      "audio/ogg",
      "audio/mp4",
    ];

    for (const type of types) {
      if (MediaRecorder.isTypeSupported(type)) {
        console.log("✅ Using MIME type:", type);
        return type;
      }
    }

    console.warn("⚠️ Using default MIME type");
    return "";
  };

  // ============================================
  // START PREPARATION
  // ============================================
 const startPreparation = async () => {
  console.log("🎬 Starting preparation...");
  
  try {
    // CRITICAL: Resume AudioContext if it exists and is suspended
    if (audioContextRef.current && audioContextRef.current.state === "suspended") {
      await audioContextRef.current.resume();
      console.log("✅ AudioContext resumed on user gesture");
    }
  } catch (error) {
    console.warn("AudioContext resume failed:", error);
  }
  
  setRecordingState("preparing");
  setPreparationTimer(preparationTime);
  toast.info("Preparation time started.");
};

  const cleanupPreviousRecording = () => {
    console.log("🧹 Cleaning up previous recording...");

    // Stop volume monitoring
    if (volumeUpdateIntervalRef.current) {
      clearInterval(volumeUpdateIntervalRef.current);
      volumeUpdateIntervalRef.current = null;
    }

    // Disconnect source node (CRITICAL - prevents context buildup)
    if (sourceNodeRef.current) {
      try {
        sourceNodeRef.current.disconnect();
        console.log("🔌 Previous source node disconnected");
      } catch (e) {
        // Already disconnected
      }
      sourceNodeRef.current = null;
    }

    // Stop previous stream
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        track.stop();
        console.log("🛑 Previous track stopped");
      });
      streamRef.current = null;
    }

    // Reset analyser
    analyserRef.current = null;
  };

  // ============================================
  // START RECORDING - FIXED VERSION
  // ============================================
  const startRecording = async () => {
  try {
    console.log("🎤 Starting recording process...");

    // CRITICAL: Cleanup previous recording first
    cleanupPreviousRecording();

    // Security check
    const isSecure =
      window.location.protocol === "https:" ||
      window.location.hostname === "localhost" ||
      window.location.hostname === "127.0.0.1";

    if (!isSecure) {
      toast.error(
        `Recording requires HTTPS or localhost. Current: ${window.location.protocol}//${window.location.hostname}`
      );
      setRecordingState("idle");
      return;
    }

    console.log("✅ Security check passed");

    // ============================================
    // REQUEST MICROPHONE - SIMPLIFIED
    // ============================================
    console.log("🔐 Requesting microphone...");

    let stream;
    
    // First try with simple constraints
    try {
      const constraints = {
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        }
      };
      
      stream = await navigator.mediaDevices.getUserMedia(constraints);
      console.log("✅ Microphone access granted with enhanced audio");
    } catch (err) {
      console.warn("Enhanced audio failed, trying basic:", err);
      
      // Try with minimal constraints
      try {
        stream = await navigator.mediaDevices.getUserMedia({ 
          audio: true 
        });
        console.log("✅ Microphone access granted with basic audio");
      } catch (basicErr) {
        console.error("❌ All microphone attempts failed:", basicErr);
        throw basicErr;
      }
    }

    // Verify we got audio tracks
    const audioTracks = stream.getAudioTracks();
    if (audioTracks.length === 0) {
      throw new Error("No audio tracks available");
    }

    const audioTrack = audioTracks[0];
    console.log("🎤 Audio track details:", {
      label: audioTrack.label || "Unknown",
      enabled: audioTrack.enabled,
      muted: audioTrack.muted,
      readyState: audioTrack.readyState,
      settings: audioTrack.getSettings()
    });

    streamRef.current = stream;

    // ============================================
    // SETUP AUDIO VISUALIZER - NEW APPROACH
    // ============================================
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      
      // Close previous context if exists
      if (audioContextRef.current) {
        try {
          await audioContextRef.current.close();
        } catch (e) {
          // Ignore if already closed
        }
      }
      
      // Create new context
      audioContextRef.current = new AudioContext();
      const audioContext = audioContextRef.current;
      
      console.log("🎵 New AudioContext created, state:", audioContext.state);
      
      // Resume immediately (should already be running from user gesture)
      if (audioContext.state === "suspended") {
        await audioContext.resume();
        console.log("✅ AudioContext resumed");
      }
      
      // Wait a bit for stability
      await new Promise(resolve => setTimeout(resolve, 50));
      
      // Create source node
      const source = audioContext.createMediaStreamSource(stream);
      sourceNodeRef.current = source;
      
      // Setup analyser
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.8;
      analyser.minDecibels = -60;
      analyser.maxDecibels = -10;
      
      source.connect(analyser);
      analyserRef.current = analyser;
      
      // Volume monitoring
      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      let lastVolume = 0;
      
      const updateVolume = () => {
        if (!analyserRef.current || !audioContext || audioContext.state !== "running") {
          return;
        }
        
        try {
          analyser.getByteFrequencyData(dataArray);
          
          // Calculate RMS volume
          let sum = 0;
          for (let i = 0; i < bufferLength; i++) {
            sum += dataArray[i] * dataArray[i];
          }
          
          const rms = Math.sqrt(sum / bufferLength);
          const scaledVolume = Math.min(255, rms * 2);
          
          // Smoothing
          const smoothedVolume = lastVolume * 0.7 + scaledVolume * 0.3;
          lastVolume = smoothedVolume;
          
          setVolume(Math.round(smoothedVolume));
        } catch (err) {
          console.warn("Volume update error:", err);
        }
      };
      
      // Start volume updates
      volumeUpdateIntervalRef.current = setInterval(updateVolume, 100);
      console.log("✅ Audio visualizer started");
      
    } catch (err) {
      console.warn("⚠️ Audio visualizer failed, continuing without it:", err);
    }

    // ============================================
    // CREATE MEDIA RECORDER
    // ============================================
    const mimeType = getSupportedMimeType();

    let mediaRecorder;
    try {
      const options = mimeType ? { mimeType } : {};
      mediaRecorder = new MediaRecorder(stream, options);
      console.log("✅ MediaRecorder created:", {
        mimeType: mediaRecorder.mimeType,
        state: mediaRecorder.state,
        audioBitsPerSecond: mediaRecorder.audioBitsPerSecond
      });
    } catch (error) {
      console.warn("Using default MediaRecorder:", error);
      mediaRecorder = new MediaRecorder(stream);
    }

    mediaRecorderRef.current = mediaRecorder;
    chunksRef.current = [];

    // ============================================
    // MEDIA RECORDER EVENTS - ENHANCED DEBUGGING
    // ============================================
    mediaRecorder.ondataavailable = (event) => {
      console.log("📦 Data available:", {
        size: event.data.size,
        type: event.data.type,
        timecode: event.timecode
      });
      
      if (event.data && event.data.size > 0) {
        chunksRef.current.push(event.data);
      } else {
        console.warn("⚠️ Empty data chunk received");
      }
    };

    mediaRecorder.onstop = () => {
      console.log("⏹️ Recording stopped");
      console.log("📦 Total chunks:", chunksRef.current.length);
      console.log("📦 Chunk sizes:", chunksRef.current.map(chunk => chunk.size));

      // Stop volume monitoring
      if (volumeUpdateIntervalRef.current) {
        clearInterval(volumeUpdateIntervalRef.current);
        volumeUpdateIntervalRef.current = null;
      }

      const totalSize = chunksRef.current.reduce((sum, chunk) => sum + chunk.size, 0);
      console.log("📊 Total size:", totalSize, "bytes");

      if (chunksRef.current.length === 0 || totalSize === 0) {
        console.error("❌ No audio data captured!");
        toast.error("Recording failed: No audio captured. Try again.");
        setRecordingState("idle");
        cleanupPreviousRecording();
        return;
      }

      const blob = new Blob(chunksRef.current, {
        type: mediaRecorder.mimeType || "audio/webm",
      });

      console.log("✅ Blob created:", {
        size: blob.size,
        type: blob.type
      });

      setAudioBlob(blob);

      const url = URL.createObjectURL(blob);
      setAudioUrl(url);

      // Cleanup media stream
      cleanupPreviousRecording();
      
      toast.success("✅ Recording saved! You can listen to it below.");
    };

    mediaRecorder.onerror = (error) => {
      console.error("❌ MediaRecorder error:", error);
      toast.error(`Recording error: ${error.name || 'Unknown error'}`);
    };

    mediaRecorder.onstart = () => {
      console.log("🔴 Recording started successfully");
    };

    // Start recording with a small timeslice
    mediaRecorder.start(100);
    console.log("🔴 MediaRecorder started, state:", mediaRecorder.state);

    setRecordingState("recording");
    setRecordingTimer(0);
    toast.success("🎤 Recording started! Speak now.");

  } catch (error) {
    console.error("❌ Start recording error:", error);
    console.error("Full error:", error);

    // Specific error handling
    if (error.name === "NotAllowedError" || error.name === "PermissionDeniedError") {
      toast.error("❌ Microphone permission denied. Please allow microphone access.");
    } else if (error.name === "NotFoundError" || error.name === "DevicesNotFoundError") {
      toast.error("❌ No microphone found. Please connect a microphone.");
    } else if (error.name === "NotReadableError" || error.name === "TrackStartError") {
      toast.error("❌ Microphone is in use by another application.");
    } else if (error.name === "OverconstrainedError") {
      toast.error("❌ Microphone constraints cannot be satisfied.");
    } else if (error.message?.includes("requested device")) {
      toast.error("❌ Microphone not available or disconnected.");
    } else {
      toast.error(`❌ Failed to start recording: ${error.message || 'Unknown error'}`);
    }

    setRecordingState("idle");
    cleanupPreviousRecording();
  }
};

  // ============================================
  // STOP RECORDING
  // ============================================
  const stopRecording = () => {
    console.log("🛑 Stopping...");
    
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
      setRecordingState("stopped");
    }
    
    if (volumeUpdateIntervalRef.current) {
      clearInterval(volumeUpdateIntervalRef.current);
      volumeUpdateIntervalRef.current = null;
    }
  };

  // ============================================
  // RE-RECORD - IMPROVED
  // ============================================
  const handleReRecord = () => {
    console.log("🔄 Re-recording...");
    
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
    }
    
    setAudioUrl(null);
    setAudioBlob(null);
    setRecordingState("idle");
    setPreparationTimer(preparationTime);
    setRecordingTimer(0);
    setVolume(0);
    chunksRef.current = [];
    
    // Note: We keep audioContextRef alive for reuse
    console.log("✅ Ready for next recording (context reused)");
  };

  // ============================================
  // CONTINUE
  // ============================================
  const handleContinue = () => {
    console.log("✅ Continuing");
    
    if (audioBlob && onRecordingComplete) {
      onRecordingComplete(audioBlob);
    } else {
      toast.error("No recording available");
    }
  };

  // ============================================
  // FORMAT TIME
  // ============================================
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const getRecordingPercentage = () => {
    return (recordingTimer / maxDuration) * 100;
  };

  // ============================================
  // RENDER
  // ============================================
  return (
    <div className="bg-gradient-to-br from-orange-50 to-red-50 rounded-lg shadow-lg p-8 border-2 border-orange-200">
      {/* IDLE STATE */}
      {recordingState === "idle" && (
        <div className="text-center">
          <div className="w-32 h-32 bg-orange-200 rounded-full flex items-center justify-center mx-auto mb-6">
            <span className="text-6xl">🎤</span>
          </div>
          <h3 className="text-2xl font-bold text-gray-800 mb-2">
            Ready to Record
          </h3>
          <p className="text-gray-600 mb-4">
            You'll have {preparationTime} seconds to prepare, then {maxDuration} seconds to speak.
          </p>

          {/* Mode Toggle */}
          <div className="mb-6 max-w-md mx-auto bg-white rounded-lg p-4 border-2 border-gray-200">
            <p className="text-sm font-semibold text-gray-700 mb-3">Recording Mode:</p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={() => setIsHeadphonesMode(true)}
                className={`flex-1 px-4 py-3 rounded-lg font-medium transition ${
                  isHeadphonesMode
                    ? "bg-blue-600 text-white shadow-lg"
                    : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                }`}
              >
                🎧 Headphones
              </button>
              <button
                onClick={() => setIsHeadphonesMode(false)}
                className={`flex-1 px-4 py-3 rounded-lg font-medium transition ${
                  !isHeadphonesMode
                    ? "bg-blue-600 text-white shadow-lg"
                    : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                }`}
              >
                🔊 Speakers
              </button>
            </div>
            <p className="text-xs text-gray-600 mt-3">
              {isHeadphonesMode
                ? "✅ Best quality - Use with headphones"
                : "⚠️ Use only without headphones"}
            </p>
          </div>

          <button
            onClick={startPreparation}
            className="px-8 py-4 bg-orange-600 text-white rounded-lg hover:bg-orange-700 font-bold text-lg shadow-lg transition"
          >
            Start Preparation
          </button>

          <div className="mt-4 text-xs text-gray-500">
            <p>Host: {window.location.hostname}</p>
            <p>Mode: {isHeadphonesMode ? "Headphones" : "Speakers"}</p>
          </div>
        </div>
      )}

      {/* PREPARING STATE */}
      {recordingState === "preparing" && (
        <div className="text-center">
          <div className="w-32 h-32 bg-blue-200 rounded-full flex items-center justify-center mx-auto mb-6 animate-pulse">
            <span className="text-6xl">⏱️</span>
          </div>
          <h3 className="text-2xl font-bold text-gray-800 mb-2">
            Preparation Time
          </h3>
          <p className="text-5xl font-bold text-blue-600 mb-4">
            {formatTime(preparationTimer)}
          </p>
          <p className="text-gray-600 mb-6">
            Think about what you want to say.
          </p>
          <div className="h-3 bg-gray-300 rounded-full overflow-hidden max-w-md mx-auto">
            <div
              className="h-full bg-blue-500 transition-all duration-1000"
              style={{
                width: `${((preparationTime - preparationTimer) / preparationTime) * 100}%`,
              }}
            />
          </div>
        </div>
      )}

      {/* RECORDING STATE */}
      {recordingState === "recording" && (
        <div className="text-center">
          <div className="w-32 h-32 bg-red-500 rounded-full flex items-center justify-center mx-auto mb-6 animate-pulse">
            <span className="text-6xl">🔴</span>
          </div>
          <h3 className="text-2xl font-bold text-gray-800 mb-2">
            Recording...
          </h3>
          <p className="text-5xl font-bold text-red-600 mb-4">
            {formatTime(recordingTimer)}
          </p>
          <p className="text-gray-600 mb-4">Speak clearly</p>

          {/* Volume Bar */}
          <div className="mb-6 max-w-md mx-auto">
            <div className="flex justify-between text-sm font-semibold text-gray-700 mb-2">
              <span>🎤 Voice Level</span>
              <span className={volume > 30 ? "text-green-600" : "text-gray-500"}>
                {Math.round((volume / 255) * 100)}%
              </span>
            </div>
            <div className="h-8 bg-gray-200 rounded-full overflow-hidden border-2 border-gray-300 shadow-inner">
              <div
                className={`h-full transition-all duration-100 ${
                  volume > 180
                    ? "bg-red-500"
                    : volume > 80
                      ? "bg-green-500"
                      : volume > 30
                        ? "bg-yellow-500"
                        : "bg-gray-400"
                }`}
                style={{ 
                  width: `${Math.min(100, (volume / 255) * 100)}%`,
                }}
              />
            </div>
            {volume < 30 && (
              <p className="text-sm text-red-600 mt-2 animate-pulse font-semibold">
                ⚠️ Low volume! Speak louder.
              </p>
            )}
            {volume >= 30 && (
              <p className="text-sm text-green-600 mt-2 font-semibold">
                ✅ Recording active!
              </p>
            )}
          </div>

          {/* Progress */}
          <div className="h-3 bg-gray-300 rounded-full overflow-hidden max-w-md mx-auto mb-6">
            <div
              className="h-full bg-gradient-to-r from-red-500 to-orange-500 transition-all"
              style={{ width: `${getRecordingPercentage()}%` }}
            />
          </div>

          <button
            onClick={stopRecording}
            className="px-8 py-4 bg-red-600 text-white rounded-lg hover:bg-red-700 font-bold text-lg shadow-lg transition"
          >
            ⏹️ Stop
          </button>
        </div>
      )}

      {/* STOPPED STATE */}
      {recordingState === "stopped" && audioUrl && (
        <div className="text-center">
          <div className="w-32 h-32 bg-green-200 rounded-full flex items-center justify-center mx-auto mb-6">
            <span className="text-6xl">✅</span>
          </div>
          <h3 className="text-2xl font-bold text-gray-800 mb-2">
            Complete!
          </h3>
          <p className="text-gray-600 mb-4">
            Duration: {formatTime(recordingTimer)}
          </p>

          <div className="bg-white rounded-lg p-6 mb-6 max-w-md mx-auto shadow-inner">
            <p className="text-sm text-gray-600 mb-3 font-semibold">
              Preview:
            </p>
            <audio controls className="w-full" preload="metadata">
              <source src={audioUrl} type={audioBlob?.type || "audio/webm"} />
            </audio>

            <div className="text-xs text-gray-500 mt-3">
              <p>Size: {(audioBlob?.size / 1024).toFixed(2)} KB</p>
            </div>
          </div>

          <div className="flex gap-4 justify-center">
            <button
              onClick={handleReRecord}
              className="px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 font-semibold transition"
            >
              🔄 Re-record
            </button>
            <button
              onClick={handleContinue}
              className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold transition"
            >
              ✓ Continue
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AudioRecorder;