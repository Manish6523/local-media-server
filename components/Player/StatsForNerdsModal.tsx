"use client";

import { useEffect, useState, RefObject } from "react";
import { Info, X, Activity } from "lucide-react";
import type { PlayerState, StreamMode } from "./usePlayer";

interface StatsProps {
  videoRef: RefObject<HTMLVideoElement | null>;
  state: PlayerState;
  filename: string;
  mediaId: string;
  streamMode: StreamMode;
  needsTranscode: boolean;
  formatTime: (s: number) => string;
  onClose: () => void;
}

export default function StatsForNerdsModal({
  videoRef,
  state,
  filename,
  mediaId,
  streamMode,
  needsTranscode,
  formatTime,
  onClose,
}: StatsProps) {
  const [stats, setStats] = useState({
    videoWidth: 0,
    videoHeight: 0,
    bufferedAhead: 0,
    playbackRate: 1,
    droppedFrames: 0,
  });

  useEffect(() => {
    const update = () => {
      const v = videoRef.current;
      if (!v) return;

      let ahead = 0;
      for (let i = 0; i < v.buffered.length; i++) {
        if (v.currentTime >= v.buffered.start(i) && v.currentTime <= v.buffered.end(i)) {
          ahead = Math.max(0, v.buffered.end(i) - v.currentTime);
          break;
        }
      }

      // @ts-ignore
      const quality = v.getVideoPlaybackQuality ? v.getVideoPlaybackQuality() : null;

      setStats({
        videoWidth: v.videoWidth || 0,
        videoHeight: v.videoHeight || 0,
        bufferedAhead: parseFloat(ahead.toFixed(1)),
        playbackRate: v.playbackRate || 1,
        droppedFrames: quality?.droppedVideoFrames || 0,
      });
    };

    update();
    const interval = setInterval(update, 500);
    return () => clearInterval(interval);
  }, [videoRef]);

  const activeAudio = state.audioTracks.find((t) => t.index === state.activeAudioTrack) || state.audioTracks[0];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-200"
      onClick={(e) => {
        e.stopPropagation();
        onClose();
      }}
    >
      <div
        className="w-full max-w-lg rounded-3xl glass-md p-5 md:p-6 text-white text-xs shadow-[0_24px_70px_rgba(0,0,0,0.85)] overflow-hidden animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-3 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">
              <Info className="w-4 h-4 text-white" />
            </div>
            <div>
              <span className="font-bold tracking-tight text-white text-sm">Media Stream Telemetry</span>
              <p className="text-[10px] text-white/50">Realtime Video & Audio Inspector</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/70 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Telemetry Grid */}
        <div className="space-y-2">
          <div className="flex justify-between py-1.5 border-b border-white/5">
            <span className="text-white/50">Media File</span>
            <span className="text-white font-medium truncate max-w-[280px]" title={filename}>
              {filename}
            </span>
          </div>

          <div className="flex justify-between py-1.5 border-b border-white/5">
            <span className="text-white/50">Media ID</span>
            <span className="text-white font-mono font-bold">#{mediaId}</span>
          </div>

          <div className="flex justify-between py-1.5 border-b border-white/5">
            <span className="text-white/50">Resolution</span>
            <span className="text-white font-semibold">
              {stats.videoWidth ? `${stats.videoWidth} × ${stats.videoHeight}` : "Detecting..."}
              {stats.videoWidth >= 3840 ? " (4K UHD)" : stats.videoWidth >= 1920 ? " (1080p FHD)" : ""}
            </span>
          </div>

          <div className="flex justify-between py-1.5 border-b border-white/5">
            <span className="text-white/50">Streaming Tier</span>
            <span
              className={`font-bold uppercase px-2 py-0.5 rounded-full text-[10px] ${
                streamMode === "direct"
                  ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                  : "bg-violet-500/20 text-violet-300 border border-violet-500/30"
              }`}
            >
              {streamMode === "direct" ? "Direct Play (0% CPU Lossless)" : "Direct Stream (Audio Transcode)"}
            </span>
          </div>

          <div className="flex justify-between py-1.5 border-b border-white/5">
            <span className="text-white/50">Active Audio Track</span>
            <span className="text-white font-medium truncate max-w-[260px]">
              {activeAudio?.label || "Primary Track"} ({activeAudio?.codec?.toUpperCase() || "AAC"})
            </span>
          </div>

          <div className="flex justify-between py-1.5 border-b border-white/5">
            <span className="text-white/50">Buffer Health</span>
            <span className="flex items-center gap-1.5 text-emerald-400 font-bold">
              <Activity className="w-3.5 h-3.5" />
              {stats.bufferedAhead}s buffered ahead
            </span>
          </div>

          <div className="flex justify-between py-1.5 border-b border-white/5">
            <span className="text-white/50">Position / Duration</span>
            <span className="text-white/90 tabular-nums font-mono">
              {formatTime(state.currentTime)} / {formatTime(state.duration)}
            </span>
          </div>

          <div className="flex justify-between py-1.5 border-b border-white/5">
            <span className="text-white/50">Dropped Video Frames</span>
            <span className={stats.droppedFrames > 0 ? "text-amber-400 font-mono" : "text-emerald-400 font-mono"}>
              {stats.droppedFrames} frames
            </span>
          </div>

          <div className="flex justify-between py-1.5">
            <span className="text-white/50">Playback Rate</span>
            <span className="text-white font-mono">{stats.playbackRate}x</span>
          </div>
        </div>

        <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between text-[11px] text-white/40">
          <span>VidLock Media Engine 2.0</span>
          <span className="text-white/60">● Active Stream</span>
        </div>
      </div>
    </div>
  );
}
