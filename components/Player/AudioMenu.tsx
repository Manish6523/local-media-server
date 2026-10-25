"use client";

import { Check, AudioWaveform, Disc } from "lucide-react";
import type { AudioTrack } from "./usePlayer";

interface AudioMenuProps {
  tracks: AudioTrack[];
  activeIndex: number;
  onSelect: (index: number) => void;
  onClose: () => void;
}

export default function AudioMenu({ tracks, activeIndex, onSelect, onClose }: AudioMenuProps) {
  return (
    <div
      className="absolute bottom-full right-0 mb-3 glass-apple-popup rounded-3xl min-w-[220px] max-w-[290px] p-2.5 shadow-[0_20px_60px_rgba(0,0,0,0.85)] z-50 text-white animate-in fade-in zoom-in-95 duration-150"
      onClick={(e) => e.stopPropagation()}
    >
      {/* Header */}
      <div className="px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-white/50 border-b border-white/10 mb-1.5 flex items-center justify-between">
        <span className="flex items-center gap-1.5">
          <AudioWaveform className="w-3.5 h-3.5 text-white/70" />
          Audio Tracks
        </span>
        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-full bg-white/10 text-white/60">
          {tracks.length || 1}
        </span>
      </div>

      {/* Tracks list */}
      <div className="space-y-1 max-h-[260px] overflow-y-auto scrollbar-thin scrollbar-thumb-white/20">
        {tracks.length === 0 ? (
          <div className="p-3 text-center text-xs text-white/50">Primary Stereo Audio</div>
        ) : (
          tracks.map((track) => {
            const isSelected = activeIndex === track.index;
            const codec = track.codec?.toUpperCase() || "AUDIO";
            return (
              <button
                key={track.index}
                onClick={() => {
                  onSelect(track.index);
                  onClose();
                }}
                className={`w-full text-left px-3 py-2.5 rounded-2xl flex items-center justify-between transition-all border ${
                  isSelected
                    ? "bg-white/20 border-white/30 text-white shadow-sm font-semibold"
                    : "bg-transparent border-transparent text-white/70 hover:bg-white/10 hover:text-white"
                }`}
              >
                <div className="flex items-center gap-2.5 truncate mr-2">
                  <span
                    className={`w-2 h-2 rounded-full shrink-0 ${
                      isSelected ? "bg-white shadow-[0_0_8px_rgba(255,255,255,0.8)]" : "bg-white/25"
                    }`}
                  />
                  <span className="text-xs truncate">{track.label}</span>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-white/10 text-white/60">
                    {codec}
                  </span>
                  {isSelected && <Check className="w-3.5 h-3.5 text-white" />}
                </div>
              </button>
            );
          })
        )}
      </div>

      <div className="mt-2 pt-1.5 border-t border-white/10 px-2 text-[10px] text-white/40 text-center">
        Select language / surround channel
      </div>
    </div>
  );
}
