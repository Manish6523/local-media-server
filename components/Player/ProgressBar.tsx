"use client";

interface ProgressBarProps {
  currentTime: number;
  duration: number;
  bufferedEnd: number;
  onSeek: (time: number) => void;
  videoSrc?: string | null;
  mediaId?: string;
}

import { useRef, useState, useCallback, useEffect } from "react";

export default function ProgressBar({ currentTime, duration, bufferedEnd, onSeek, videoSrc, mediaId }: ProgressBarProps) {
  const barRef = useRef<HTMLDivElement>(null);
  const [hovering, setHovering] = useState(false);
  const [hoverX, setHoverX] = useState(0);
  const [debouncedHoverTime, setDebouncedHoverTime] = useState(0);
  const [dragging, setDragging] = useState(false);

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;
  const buffered = duration > 0 ? (bufferedEnd / duration) * 100 : 0;
  const hoverTime = duration > 0 && barRef.current
    ? (hoverX / barRef.current.clientWidth) * duration
    : 0;

  useEffect(() => {
    if (hovering) {
      const timer = setTimeout(() => setDebouncedHoverTime(hoverTime), 200);
      return () => clearTimeout(timer);
    }
  }, [hoverTime, hovering]);

  const formatTime = (s: number) => {
    if (!isFinite(s) || s < 0) return "0:00";
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = Math.floor(s % 60);
    return h > 0
      ? `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`
      : `${m}:${String(sec).padStart(2, "0")}`;
  };

  const handleSeekFromEvent = useCallback(
    (clientX: number) => {
      if (!barRef.current || !duration) return;
      const rect = barRef.current.getBoundingClientRect();
      const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
      const time = (x / rect.width) * duration;
      onSeek(time);
    },
    [duration, onSeek]
  );

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      setDragging(true);
      handleSeekFromEvent(e.clientX);

      const onMove = (ev: MouseEvent) => handleSeekFromEvent(ev.clientX);
      const onUp = () => {
        setDragging(false);
        window.removeEventListener("mousemove", onMove);
        window.removeEventListener("mouseup", onUp);
      };
      window.addEventListener("mousemove", onMove);
      window.addEventListener("mouseup", onUp);
    },
    [handleSeekFromEvent]
  );

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!barRef.current) return;
    const rect = barRef.current.getBoundingClientRect();
    setHoverX(Math.max(0, Math.min(e.clientX - rect.left, rect.width)));
  }, []);
  
  return (
    <div className="w-full mb-2 group/progress">
      <div
        ref={barRef}
        className="relative w-full h-[5px] hover:h-[7px] transition-all cursor-pointer rounded-full"
        onMouseDown={handleMouseDown}
        onMouseEnter={() => setHovering(true)}
        onMouseLeave={() => { setHovering(false); }}
        onMouseMove={handleMouseMove}
      >
        {/* Background */}
        <div className="absolute inset-0 bg-white/20 rounded-full" />

        {/* Buffered */}
        <div
          className="absolute inset-y-0 left-0 bg-white/40 rounded-full"
          style={{ width: `${buffered}%` }}
        />

        {/* Played */}
        <div
          className="absolute inset-y-0 left-0 bg-[#E50914] rounded-full"
          style={{ width: `${progress}%` }}
        />

        {/* Thumb */}
        <div
          className={`absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-[14px] h-[14px] bg-[#E50914] rounded-full shadow-md transition-opacity ${
            hovering || dragging ? "opacity-100 scale-100" : "opacity-0 scale-75"
          }`}
          style={{ left: `${progress}%` }}
        />

        {/* Hover timestamp tooltip */}
        {hovering && barRef.current && (
          <div
            className="absolute bottom-6 -translate-x-1/2 flex flex-col items-center gap-1.5 pointer-events-none z-50"
            style={{ left: `${hoverX}px` }}
          >
            {mediaId && (
              <div className="w-32 md:w-40 aspect-video bg-black rounded overflow-hidden border border-white/20 shadow-xl shadow-black/50">
                <img
                  src={`/api/thumbnail?id=${mediaId}&time=${debouncedHoverTime}`}
                  className="w-full h-full object-cover"
                  alt="preview"
                />
              </div>
            )}
            <div className="bg-[#1a1a1a] text-white text-[11px] font-bold px-2 py-1 rounded shadow-md border border-white/10">
              {formatTime(hoverTime)}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
