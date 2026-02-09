import React, { useEffect, useRef, useState } from "react";

const AudioPlayer = ({
  audioUrl,
  title,
  onEnded,
  playOnce = false,
  disableSeeking = false,
  initialPlayed = false, // ✅ Added prop
}) => {
  const audioRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [hasPlayedOnce, setHasPlayedOnce] = useState(initialPlayed); // ✅ Initialize with prop

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    //event listeners
    const handleLoadedMetadata = () => {
      setDuration(audio.duration);
      setIsLoading(false);
    };
    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
    };
    const handleEnded = () => {
      setIsPlaying(false);
      if (playOnce) {
        setHasPlayedOnce(true); // ✅ Mark as played
      }
      if (onEnded) onEnded();
    };
    const handleError = (error) => {
      console.error("Audio Loading error: ", error);
      setIsLoading(false);
    };

    audio.addEventListener("loadedmetadata", handleLoadedMetadata);
    audio.addEventListener("timeupdate", handleTimeUpdate);
    audio.addEventListener("ended", handleEnded);
    audio.addEventListener("error", handleError);

    return () => {
      audio.removeEventListener("loadedmetadata", handleLoadedMetadata);
      audio.removeEventListener("timeupdate", handleTimeUpdate);
      audio.removeEventListener("ended", handleEnded);
      audio.removeEventListener("error", handleError);
    };
  }, [onEnded, playOnce]);

  const togglePlayPause = () => {
    if (playOnce && hasPlayedOnce) return; // ✅ Prevent replay

    const audio = audioRef.current;
    if (!isPlaying) {
      audio.play();
    } else {
      audio.pause();
    }
    setIsPlaying(!isPlaying);
  };

  const handleSeek = (e) => {
    if (disableSeeking) return; // ✅ Prevent seeking

    const audio = audioRef.current;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = x / rect.width;
    const newTime = percentage * duration;
    audio.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const handleVolumeChange = (e) => {
    const newVolume = parseFloat(e.target.value);
    audioRef.current.volume = newVolume;
    setVolume(newVolume);
  };
  const handlePlaybackRateChange = (rate) => {
    audioRef.current.playbackRate = rate;
    setPlaybackRate(rate);
  };
  const formatTime = (seconds) => {
    if (!seconds || isNaN(seconds)) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const progressPercentage = duration > 0 ? (currentTime / duration) * 100 : 0;
  if (!audioUrl) {
    return (
      <div className="bg-gray-100 rounded-lg p-6 text-center">
        <p className="text-gray-600">No audio file available.</p>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg shadow-md p-6 border border-blue-200">
      {/* hidden audio element */}
      <audio ref={audioRef} src={audioUrl} preload="metadata" />
      {/* title */}
      {title && (
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
            <span className="text-2xl">🎧</span>
            {title}
          </h3>
        </div>
      )}

      {/* Main Controls */}
      <div className="flex items-center gap-4 mb-4">
        {/* Play/Pause Button */}
        <button
          onClick={togglePlayPause}
          disabled={isLoading || (playOnce && hasPlayedOnce)}
          className={`w-14 h-14 rounded-full flex items-center justify-center transition shadow-lg ${
            isLoading || (playOnce && hasPlayedOnce)
              ? "bg-gray-400 cursor-not-allowed opacity-50"
              : "bg-blue-600 hover:bg-blue-700 text-white"
          }`}
        >
          {isLoading ? (
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
          ) : playOnce && hasPlayedOnce ? (
            <span className="text-xs font-bold">Ended</span>
          ) : isPlaying ? (
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
              <path d="M5 4h3v12H5V4zm7 0h3v12h-3V4z" />
            </svg>
          ) : (
            <svg
              className="w-6 h-6 ml-1"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" />
            </svg>
          )}
        </button>

        {/* Progress Bar */}
        <div className="flex-1">
          <div
            className={`h-3 bg-gray-300 rounded-full relative overflow-hidden ${
              disableSeeking ? "cursor-not-allowed" : "cursor-pointer"
            }`}
            onClick={disableSeeking ? undefined : handleSeek}
          >
            {/* Progress fill */}
            <div
              className={`h-full rounded-full transition-all ${
                disableSeeking
                  ? "bg-gray-500"
                  : "bg-gradient-to-r from-blue-500 to-indigo-600"
              }`}
              style={{ width: `${progressPercentage}%` }}
            />

            {/* Playhead (Hidden if seeking disabled) */}
            {!disableSeeking && (
              <div
                className="absolute top-0 w-1 h-full bg-blue-700"
                style={{ left: `${progressPercentage}%` }}
              />
            )}
          </div>

          {/* Time Display */}
          <div className="flex justify-between text-sm text-gray-600 mt-1">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>
      </div>

      {/* Secondary Controls */}
      <div className="flex items-center justify-between gap-4">
        {/* Volume Control */}
        <div className="flex items-center gap-2 flex-1">
          <span className="text-gray-600">🔊</span>
          <input
            type="range"
            min="0"
            max="1"
            step="0.1"
            value={volume}
            onChange={handleVolumeChange}
            className="flex-1 h-2 bg-gray-300 rounded-lg appearance-none cursor-pointer"
            style={{
              background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${
                volume * 100
              }%, #d1d5db ${volume * 100}%, #d1d5db 100%)`,
            }}
          />
          <span className="text-sm text-gray-600 w-10 text-right">
            {Math.round(volume * 100)}%
          </span>
        </div>

        {/* Playback Speed */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600 mr-2">Speed:</span>
          {[0.75, 1, 1.25, 1.5].map((rate) => (
            <button
              key={rate}
              onClick={() => handlePlaybackRateChange(rate)}
              className={`px-3 py-1 rounded-lg text-sm font-medium transition ${
                playbackRate === rate
                  ? "bg-blue-600 text-white"
                  : "bg-gray-200 text-gray-700 hover:bg-gray-300"
              }`}
            >
              {rate}x
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AudioPlayer;
