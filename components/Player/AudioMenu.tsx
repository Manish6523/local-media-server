"use client";

import { Check, Languages } from "lucide-react";
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
      className="absolute bottom-full right-0 mb-2 bg-[#1a1a1a] border border-white/10 rounded-lg shadow-2xl min-w-[180px] py-1 z-50"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="px-4 py-2 text-[10px] uppercase tracking-wider text-white/40 font-semibold border-b border-white/5">
        Audio
      </div>

      {tracks.map((track) => (
        <button
          key={track.index}
          onClick={() => { onSelect(track.index); onClose(); }}
          className={`w-full text-left px-4 py-2.5 text-sm flex items-center gap-3 transition-colors ${
            activeIndex === track.index
              ? "text-[#E50914]"
              : "text-white/70 hover:text-white hover:bg-white/10"
          }`}
        >
          {activeIndex === track.index ? (
            <Check className="w-3.5 h-3.5" />
          ) : (
            <Languages className="w-3.5 h-3.5 opacity-40" />
          )}
          {track.label}
          {activeIndex === track.index && (
            <span className="ml-auto text-[10px] text-[#E50914]">●</span>
          )}
        </button>
      ))}
    </div>
  );
}
