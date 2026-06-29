"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { X, Camera, Loader2, SkipBack, SkipForward, Play, Pause } from "lucide-react";
import Hls from "hls.js";

interface ThumbnailEditorProps {
  mediaId: number;
  filepath: string;
  isOpen: boolean;
  onClose: () => void;
  onCapture: (thumbnailPath: string) => void;
}

const NATIVE_FORMATS = ["mp4", "m4v", "mov", "webm"];

function getVideoSource(mediaId: number, filepath: string): { url: string; needsHls: boolean } {
  const ext = filepath.split(".").pop()?.toLowerCase() || "";
  if (NATIVE_FORMATS.includes(ext)) {
    return { url: `/api/stream?id=${mediaId}`, needsHls: false };
  }
  // MKV, AVI, WMV etc → use HLS transcode
  return { url: `/api/hls/${mediaId}/0/0/playlist.m3u8?clientId=thumb-editor`, needsHls: true };
}

function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export default function ThumbnailEditor({
  mediaId,
  filepath,
  isOpen,
  onClose,
  onCapture,
}: ThumbnailEditorProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [capturing, setCapturing] = useState(false);
  const [videoReady, setVideoReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Setup video source on open
  useEffect(() => {
    if (!isOpen) return;

    setCurrentTime(0);
    setDuration(0);
    setIsPlaying(false);
    setCapturing(false);
    setVideoReady(false);
    setError(null);

    const video = videoRef.current;
    if (!video) return;

    const { url, needsHls } = getVideoSource(mediaId, filepath);

    // Cleanup previous HLS instance
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    if (needsHls) {
      if (Hls.isSupported()) {
        const hls = new Hls({
          maxBufferLength: 60,
          maxMaxBufferLength: 120,
        });
        hlsRef.current = hls;
        hls.loadSource(url);
        hls.attachMedia(video);
        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          setVideoReady(true);
          // Seek to 1/3 once we know the duration
          if (video.duration && isFinite(video.duration)) {
            video.currentTime = video.duration / 3;
          }
        });
        hls.on(Hls.Events.ERROR, (_event, data) => {
          if (data.fatal) {
            if (data.type === Hls.ErrorTypes.NETWORK_ERROR) {
              hls.startLoad();
            } else if (data.type === Hls.ErrorTypes.MEDIA_ERROR) {
              hls.recoverMediaError();
            } else {
              setError("Failed to load video");
            }
          }
        });
      } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
        video.src = url;
      } else {
        setError("HLS not supported in this browser");
      }
    } else {
      video.src = url;
    }

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [isOpen, mediaId, filepath]);

  // Video event handlers
  const handleLoadedMetadata = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    if (video.duration && isFinite(video.duration)) {
      setDuration(video.duration);
      // Seek to 1/3 of duration
      video.currentTime = video.duration / 3;
    }
    setVideoReady(true);
  }, []);

  const handleDurationChange = useCallback(() => {
    const video = videoRef.current;
    if (video && video.duration && isFinite(video.duration)) {
      setDuration(video.duration);
    }
  }, []);

  const handleTimeUpdate = useCallback(() => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
    }
  }, []);

  const handleSeek = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    setCurrentTime(time);
    if (videoRef.current) {
      videoRef.current.currentTime = time;
    }
  }, []);

  const skipSeconds = useCallback(
    (delta: number) => {
      if (!videoRef.current) return;
      const newTime = Math.max(0, Math.min(duration, videoRef.current.currentTime + delta));
      videoRef.current.currentTime = newTime;
      setCurrentTime(newTime);
    },
    [duration]
  );

  const togglePlay = useCallback(() => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
    } else {
      videoRef.current.play().catch(() => {});
    }
  }, [isPlaying]);

  const handleCapture = useCallback(async () => {
    if (!videoRef.current) return;
    setCapturing(true);
    setError(null);

    // Pause at the current frame
    videoRef.current.pause();
    setIsPlaying(false);

    const timestamp = videoRef.current.currentTime;

    try {
      const res = await fetch("/api/episode-thumbnail", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: mediaId, timestamp }),
      });

      const data = await res.json();
      if (!res.ok || !data.thumbnail) {
        setError(data.error || "Failed to capture thumbnail");
        setCapturing(false);
        return;
      }

      onCapture(data.thumbnail + `?t=${Date.now()}`);
      onClose();
    } catch (err: any) {
      setError(err.message || "Network error");
    } finally {
      setCapturing(false);
    }
  }, [mediaId, onCapture, onClose]);

  // Escape to close
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-md" onClick={onClose} />

      {/* Modal */}
      <div className="fixed inset-0 z-[201] flex items-center justify-center p-4">
        <div
          className="w-full max-w-3xl rounded-[20px] bg-[#0a0a0a] border border-white/[0.06] shadow-2xl overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.05]">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2.5">
                <Camera className="w-4 h-4 text-violet-400" />
                Choose Thumbnail
              </h3>
              <p className="text-xs text-white/30 mt-0.5">
                Scrub to the perfect frame and capture it
              </p>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg bg-white/[0.04] flex items-center justify-center hover:bg-white/[0.08] transition-colors"
            >
              <X className="w-4 h-4 text-white/50" />
            </button>
          </div>

          {/* Video Preview */}
          <div className="relative bg-black aspect-video">
            <video
              ref={videoRef}
              className="w-full h-full object-contain"
              onLoadedMetadata={handleLoadedMetadata}
              onDurationChange={handleDurationChange}
              onTimeUpdate={handleTimeUpdate}
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
              onCanPlay={() => setVideoReady(true)}
              preload="auto"
              playsInline
              muted
            />

            {/* Loading overlay */}
            {!videoReady && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/60">
                <div className="flex flex-col items-center gap-3">
                  <Loader2 className="w-8 h-8 text-violet-400 animate-spin" />
                  <span className="text-xs text-white/40">Loading video...</span>
                </div>
              </div>
            )}

            {error && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/60">
                <p className="text-sm text-red-400">{error}</p>
              </div>
            )}
          </div>

          {/* Controls */}
          <div className="px-6 py-4 space-y-3 border-t border-white/[0.05]">
            {/* Scrubber */}
            <div className="flex items-center gap-3">
              <span className="text-xs text-white/40 font-mono min-w-[50px]">
                {formatTime(currentTime)}
              </span>
              <input
                type="range"
                min={0}
                max={duration || 1}
                step={0.1}
                value={currentTime}
                onChange={handleSeek}
                disabled={!videoReady}
                className="flex-1 h-1.5 rounded-full appearance-none cursor-pointer disabled:opacity-30
                  [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-violet-400 [&::-webkit-slider-thumb]:shadow-[0_0_8px_rgba(139,92,246,0.5)] [&::-webkit-slider-thumb]:cursor-pointer
                  [&::-webkit-slider-runnable-track]:rounded-full [&::-webkit-slider-runnable-track]:bg-white/10"
                style={{
                  background:
                    duration > 0
                      ? `linear-gradient(to right, rgb(139, 92, 246) 0%, rgb(139, 92, 246) ${(currentTime / duration) * 100}%, rgba(255,255,255,0.1) ${(currentTime / duration) * 100}%, rgba(255,255,255,0.1) 100%)`
                      : "rgba(255,255,255,0.1)",
                }}
              />
              <span className="text-xs text-white/40 font-mono min-w-[50px] text-right">
                {formatTime(duration)}
              </span>
            </div>

            {/* Playback controls + Capture */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => skipSeconds(-10)}
                  disabled={!videoReady}
                  className="w-9 h-9 rounded-lg bg-white/[0.04] flex items-center justify-center hover:bg-white/[0.08] transition-colors text-white/50 hover:text-white disabled:opacity-30"
                  title="Back 10s"
                >
                  <SkipBack className="w-4 h-4" />
                </button>
                <button
                  onClick={togglePlay}
                  disabled={!videoReady}
                  className="w-10 h-10 rounded-xl bg-white/[0.06] flex items-center justify-center hover:bg-white/[0.1] transition-colors text-white/70 hover:text-white disabled:opacity-30"
                >
                  {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
                </button>
                <button
                  onClick={() => skipSeconds(10)}
                  disabled={!videoReady}
                  className="w-9 h-9 rounded-lg bg-white/[0.04] flex items-center justify-center hover:bg-white/[0.08] transition-colors text-white/50 hover:text-white disabled:opacity-30"
                  title="Forward 10s"
                >
                  <SkipForward className="w-4 h-4" />
                </button>
              </div>

              <button
                onClick={handleCapture}
                disabled={capturing || !videoReady}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold bg-violet-600 hover:bg-violet-500 text-white transition-all shadow-lg shadow-violet-500/20 disabled:opacity-30 disabled:cursor-not-allowed disabled:shadow-none"
              >
                {capturing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Capturing...
                  </>
                ) : (
                  <>
                    <Camera className="w-4 h-4" />
                    Use This Frame
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
