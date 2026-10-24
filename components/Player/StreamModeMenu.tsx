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
      className="absolute bottom-full right-0 mb-2 bg-[#141519]/95 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl min-w-[260px] p-2 z-50 text-white animate-in fade-in zoom-in-95 duration-150"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="px-3 py-1.5 text-[10px] uppercase tracking-wider text-white/40 font-semibold border-b border-white/5 mb-1 flex items-center justify-between">
        <span>Streaming Mode</span>
        <span className="text-[9px] text-white/30 lowercase font-mono">playback</span>
      </div>

      {/* Direct Play Option */}
      <button
        onClick={() => {
          onSelect("direct");
          onClose();
        }}
        className={`w-full text-left px-3 py-2.5 rounded-lg flex items-start gap-3 transition-all ${
          currentMode === "direct"
            ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30"
            : "text-white/80 hover:text-white hover:bg-white/10 border border-transparent"
        }`}
      >
        <div
          className={`p-1.5 rounded-md mt-0.5 shrink-0 ${
            currentMode === "direct"
              ? "bg-emerald-500/20 text-emerald-400"
              : "bg-white/5 text-white/50"
          }`}
        >
          <Zap className="w-4 h-4 fill-current" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold">Direct Stream</span>
            {currentMode === "direct" && (
              <Check className="w-3.5 h-3.5 text-emerald-400" />
            )}
          </div>
          <p className="text-[11px] text-white/50 leading-tight mt-0.5">
            Original file. 0% server transcode, fastest load.
          </p>
        </div>
      </button>

      {/* HLS Transcode Option */}
      <button
        onClick={() => {
          onSelect("hls");
          onClose();
        }}
        className={`w-full text-left px-3 py-2.5 rounded-lg flex items-start gap-3 transition-all mt-1 ${
          currentMode === "hls"
            ? "bg-violet-500/15 text-violet-300 border border-violet-500/30"
            : "text-white/80 hover:text-white hover:bg-white/10 border border-transparent"
        }`}
      >
        <div
          className={`p-1.5 rounded-md mt-0.5 shrink-0 ${
            currentMode === "hls"
              ? "bg-violet-500/20 text-violet-400"
              : "bg-white/5 text-white/50"
          }`}
        >
          <Cpu className="w-4 h-4" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold">HLS Transcode</span>
            {currentMode === "hls" && (
              <Check className="w-3.5 h-3.5 text-violet-400" />
            )}
          </div>
          <p className="text-[11px] text-white/50 leading-tight mt-0.5">
            Server FFmpeg transcode. Maximum compatibility.
          </p>
        </div>
      </button>

      <div className="mt-2 pt-1.5 border-t border-white/5 px-2 text-[10px] text-white/35">
        Seamlessly retains your current playback position.
      </div>
    </div>
  );
}
