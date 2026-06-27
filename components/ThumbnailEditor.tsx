"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { X, Camera, Loader2, ChevronLeft, ChevronRight, Image as ImageIcon } from "lucide-react";

interface ThumbnailEditorProps {
  mediaId: number;
  filepath: string;
  isOpen: boolean;
  onClose: () => void;
  onCapture: (thumbnailPath: string) => void;
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
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [previewSrc, setPreviewSrc] = useState<string | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [capturing, setCapturing] = useState(false);
  const [loadingDuration, setLoadingDuration] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Fetch duration on open
  useEffect(() => {
    if (!isOpen) return;
    setLoadingDuration(true);
    setPreviewSrc(null);
    setError(null);
    setCapturing(false);

    fetch(`/api/episode-thumbnail?id=${mediaId}&info=true`)
      .then((r) => r.json())
      .then((data) => {
        const dur = data.duration || 0;
        setDuration(dur);
        const initialTime = Math.floor(dur / 3);
        setCurrentTime(initialTime);
        setLoadingDuration(false);
        // Auto-fetch preview at 1/3
        fetchPreview(initialTime);
      })
      .catch(() => {
        setLoadingDuration(false);
        setError("Failed to load video info");
      });
  }, [isOpen, mediaId]);

  // Fetch a preview frame at a given timestamp
  const fetchPreview = useCallback(
    async (timestamp: number) => {
      setLoadingPreview(true);
      setError(null);
      try {
        const res = await fetch("/api/episode-thumbnail", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: mediaId, timestamp, preview: true }),
        });
        const data = await res.json();
        if (data.thumbnail) {
          setPreviewSrc(data.thumbnail + `?t=${Date.now()}`);
        } else {
          setError("Could not generate preview");
        }
      } catch {
        setError("Network error");
      } finally {
        setLoadingPreview(false);
      }
    },
    [mediaId]
  );

  // Debounced seek — generates preview 500ms after user stops dragging
  const handleSeek = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const time = parseFloat(e.target.value);
      setCurrentTime(time);

      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        fetchPreview(time);
      }, 500);
    },
    [fetchPreview]
  );

  // Skip buttons
  const skipSeconds = useCallback(
    (delta: number) => {
      const newTime = Math.max(0, Math.min(duration, currentTime + delta));
      setCurrentTime(newTime);
      fetchPreview(newTime);
    },
    [duration, currentTime, fetchPreview]
  );

  // Confirm this frame as the final thumbnail
  const handleCapture = useCallback(async () => {
    setCapturing(true);
    setError(null);

    try {
      const res = await fetch("/api/episode-thumbnail", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: mediaId, timestamp: currentTime }),
      });

      const data = await res.json();
      if (!res.ok || !data.thumbnail) {
        setError(data.error || "Failed to save thumbnail");
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
  }, [mediaId, currentTime, onCapture, onClose]);

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
                Scrub to find the perfect frame
              </p>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg bg-white/[0.04] flex items-center justify-center hover:bg-white/[0.08] transition-colors"
            >
              <X className="w-4 h-4 text-white/50" />
            </button>
          </div>

          {/* Preview Area */}
          <div className="relative bg-black aspect-video flex items-center justify-center">
            {loadingDuration ? (
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="w-8 h-8 text-violet-400 animate-spin" />
                <span className="text-xs text-white/40">Loading video info...</span>
              </div>
            ) : previewSrc ? (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={previewSrc}
                  alt="Preview frame"
                  className="w-full h-full object-contain"
                />
                {loadingPreview && (
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                    <Loader2 className="w-6 h-6 text-violet-400 animate-spin" />
                  </div>
                )}
              </>
            ) : loadingPreview ? (
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="w-8 h-8 text-violet-400 animate-spin" />
                <span className="text-xs text-white/40">Generating preview...</span>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-3 text-white/20">
                <ImageIcon className="w-10 h-10" />
                <span className="text-xs">Move the slider to preview frames</span>
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
                step={1}
                value={currentTime}
                onChange={handleSeek}
                disabled={loadingDuration}
                className="flex-1 h-1.5 rounded-full appearance-none cursor-pointer disabled:opacity-30
                  [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-violet-400 [&::-webkit-slider-thumb]:shadow-[0_0_8px_rgba(139,92,246,0.5)] [&::-webkit-slider-thumb]:cursor-pointer"
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

            {/* Skip buttons + Capture */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => skipSeconds(-30)}
                  disabled={loadingDuration}
                  className="h-9 px-3 rounded-lg bg-white/[0.04] flex items-center justify-center gap-1 hover:bg-white/[0.08] transition-colors text-white/50 hover:text-white text-xs font-medium disabled:opacity-30"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  30s
                </button>
                <button
                  onClick={() => skipSeconds(-10)}
                  disabled={loadingDuration}
                  className="h-9 px-3 rounded-lg bg-white/[0.04] flex items-center justify-center gap-1 hover:bg-white/[0.08] transition-colors text-white/50 hover:text-white text-xs font-medium disabled:opacity-30"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  10s
                </button>
                <button
                  onClick={() => skipSeconds(10)}
                  disabled={loadingDuration}
                  className="h-9 px-3 rounded-lg bg-white/[0.04] flex items-center justify-center gap-1 hover:bg-white/[0.08] transition-colors text-white/50 hover:text-white text-xs font-medium disabled:opacity-30"
                >
                  10s
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => skipSeconds(30)}
                  disabled={loadingDuration}
                  className="h-9 px-3 rounded-lg bg-white/[0.04] flex items-center justify-center gap-1 hover:bg-white/[0.08] transition-colors text-white/50 hover:text-white text-xs font-medium disabled:opacity-30"
                >
                  30s
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {error && (
                <p className="text-xs text-red-400 mx-4 truncate max-w-[180px]">{error}</p>
              )}

              <button
                onClick={handleCapture}
                disabled={capturing || loadingDuration || !previewSrc}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold bg-violet-600 hover:bg-violet-500 text-white transition-all shadow-lg shadow-violet-500/20 disabled:opacity-30 disabled:cursor-not-allowed disabled:shadow-none"
              >
                {capturing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Saving...
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
