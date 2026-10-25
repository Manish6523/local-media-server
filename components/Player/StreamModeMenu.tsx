"use client";

import { Check, Zap, Cpu } from "lucide-react";
import type { StreamMode } from "./usePlayer";

interface StreamModeMenuProps {
  currentMode: StreamMode;
  onSelect: (mode: StreamMode) => void;
  onClose: () => void;
}

export default function StreamModeMenu({
  currentMode,
  onSelect,
  onClose,
}: StreamModeMenuProps) {
  return (
    <div
      className="absolute bottom-full left-0 mb-3 glass-md rounded-3xl min-w-[260px] sm:min-w-[300px] max-w-[calc(100vw-2rem)] p-3 shadow-[0_20px_60px_rgba(0,0,0,0.85)] z-50 text-white animate-in fade-in zoom-in-95 origin-bottom-left duration-150"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-white/50 border-b border-white/10 mb-2 flex items-center justify-between">
        <span className="flex items-center gap-1.5">
          <Zap className="w-3.5 h-3.5 text-white/70" />
          Stream Engine
        </span>
        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-full bg-white/10 text-white/60">
          Playback
        </span>
      </div>

      <div className="space-y-1.5">
        {/* Direct Play Option */}
        <button
          onClick={() => {
            onSelect("direct");
            onClose();
          }}
          className={`w-full text-left p-3 rounded-2xl flex items-start gap-3 transition-all border ${
            currentMode === "direct"
              ? "bg-emerald-500/20 text-white border-emerald-500/40 shadow-sm"
              : "bg-white/5 text-white/70 hover:bg-white/10 hover:text-white border-transparent"
          }`}
        >
          <div
            className={`p-2 rounded-xl mt-0.5 shrink-0 ${
              currentMode === "direct"
                ? "bg-emerald-500/30 text-emerald-300"
                : "bg-white/10 text-white/50"
            }`}
          >
            <Zap className="w-4 h-4 fill-current" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-white">Direct Play</span>
              {currentMode === "direct" && (
                <Check className="w-3.5 h-3.5 text-emerald-400" />
              )}
            </div>
            <p className="text-[11px] text-white/50 leading-tight mt-0.5">
              Raw file stream. 0% CPU overhead, fastest seeking. (Ideal for Smart TVs).
            </p>
          </div>
        </button>

        {/* Direct Stream (Audio Transcode) Option */}
        <button
          onClick={() => {
            onSelect("hls");
            onClose();
          }}
          className={`w-full text-left p-3 rounded-2xl flex items-start gap-3 transition-all border ${
            currentMode === "hls"
              ? "bg-violet-500/20 text-white border-violet-500/40 shadow-sm"
              : "bg-white/5 text-white/70 hover:bg-white/10 hover:text-white border-transparent"
          }`}
        >
          <div
            className={`p-2 rounded-xl mt-0.5 shrink-0 ${
              currentMode === "hls"
                ? "bg-violet-500/30 text-violet-300"
                : "bg-white/10 text-white/50"
            }`}
          >
            <Cpu className="w-4 h-4" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-white">Direct Stream (HLS)</span>
              {currentMode === "hls" && (
                <Check className="w-3.5 h-3.5 text-violet-400" />
              )}
            </div>
            <p className="text-[11px] text-violet-200/70 leading-tight mt-0.5">
              Video is copied as-is (-c:v copy) — 0% CPU usage, audio downmixed to stereo AAC.
            </p>
          </div>
        </button>
      </div>

      <div className="mt-2.5 pt-1.5 border-t border-white/10 px-2 text-[10px] text-white/40 text-center">
        Retains playback position when toggling
      </div>
    </div>
  );
}
