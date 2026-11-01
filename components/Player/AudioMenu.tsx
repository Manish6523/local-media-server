"use client";

import { Check, AudioWaveform } from "lucide-react";
import type { AudioTrack } from "./usePlayer";
import { PLAYER_POPUP_GLASS_STYLE } from "./playerStyles";

interface AudioMenuProps {
  tracks: AudioTrack[];
  activeIndex: number;
  onSelect: (index: number) => void;
  onClose: () => void;
}

export default function AudioMenu({
  tracks,
  activeIndex,
  onSelect,
  onClose,
}: AudioMenuProps) {
  return (
    <div
      style={PLAYER_POPUP_GLASS_STYLE}
      className="fixed sm:absolute bottom-20 sm:bottom-full right-3 sm:right-0 mb-3 rounded-2xl p-3 z-50 text-white w-[260px] sm:w-[290px] max-w-[calc(100vw-1.5rem)] max-h-[min(300px,calc(100vh-140px))] animate-in fade-in zoom-in-95 origin-bottom-right duration-150 shadow-2xl flex flex-col select-none overflow-hidden"
      onClick={(e) => e.stopPropagation()}
    >
      {/* Header */}
      <div className="flex items-center justify-between pb-2 mb-2 border-b border-white/10 px-1 text-[11px] font-bold uppercase tracking-wider text-white/50 shrink-0">
        <span className="flex items-center gap-1.5">
          <AudioWaveform className="w-3.5 h-3.5 text-white/70" />
          Audio Tracks
        </span>
        <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white/10 text-white/70 font-bold">
          {tracks.length || 1}
        </span>
      </div>

      {/* Tracks list - vertically scrollable if many tracks */}
      <div className="space-y-1 overflow-y-auto scrollbar-thin scrollbar-thumb-white/20 pr-0.5 max-h-[190px]">
        {tracks.length === 0 ? (
          <div className="py-4 text-center text-xs text-white/50">Primary Stereo Audio</div>
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
                className={`w-full text-left px-3 py-2 rounded-xl flex items-center justify-between transition-all border ${
                  isSelected
                    ? "bg-white/20 border-white/30 text-white shadow-sm font-semibold"
                    : "bg-transparent border-transparent text-white/70 hover:bg-white/10 hover:text-white"
                }`}
              >
                <div className="flex items-center gap-2 truncate mr-2">
                  <span
                    className={`w-2 h-2 rounded-full shrink-0 ${
                      isSelected ? "bg-white shadow-[0_0_8px_rgba(255,255,255,0.8)]" : "bg-white/25"
                    }`}
                  />
                  <span className="text-xs truncate">{track.label}</span>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
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

      <div className="mt-2 pt-1.5 border-t border-white/10 px-1 text-[10px] text-white/40 text-center shrink-0">
        Select language / surround channel
      </div>
    </div>
  );
}
