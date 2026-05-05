"use client";

import { Check, Settings as SettingsIcon } from "lucide-react";
import type { SubtitleTrack, PlayerState } from "./usePlayer";

interface SubtitleMenuProps {
  tracks: SubtitleTrack[];
  activeIndex: number | null;
  state: PlayerState;
  onSelect: (index: number | null) => void;
  onSizeSelect: (size: "small" | "medium" | "large") => void;
  onColorSelect: (color: "white" | "yellow") => void;
  onClose: () => void;
}

export default function SubtitleMenu({ tracks, activeIndex, state, onSelect, onSizeSelect, onColorSelect, onClose }: SubtitleMenuProps) {
  return (
    <div
      className="absolute bottom-full right-0 mb-2 bg-[#1a1a1a] border border-white/10 rounded-lg shadow-2xl min-w-[220px] max-h-[70vh] overflow-y-auto py-1 z-50 scrollbar-thin scrollbar-thumb-white/20 scrollbar-track-transparent"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="px-4 py-2 text-[10px] uppercase tracking-wider text-white/40 font-semibold border-b border-white/5 flex items-center gap-2">
        <SettingsIcon className="w-3 h-3" /> Subtitle Appearance
      </div>
      
      {/* Size Selection */}
      <div className="px-4 py-2 border-b border-white/5 flex items-center justify-between">
        <span className="text-xs text-white/70">Size</span>
        <div className="flex bg-white/10 rounded overflow-hidden">
          {(["small", "medium", "large"] as const).map(size => (
            <button
              key={size}
              onClick={() => onSizeSelect(size)}
              className={`px-2 py-1 text-[10px] uppercase font-bold transition-colors ${state.subtitleSize === size ? 'bg-[#E50914] text-white' : 'text-white/50 hover:bg-white/20'}`}
            >
              {size[0]}
            </button>
          ))}
        </div>
      </div>

      {/* Color Selection */}
      <div className="px-4 py-2 border-b border-white/10 flex items-center justify-between">
        <span className="text-xs text-white/70">Color</span>
        <div className="flex bg-white/10 rounded overflow-hidden">
          {(["white", "yellow"] as const).map(color => (
            <button
              key={color}
              onClick={() => onColorSelect(color)}
              className={`px-2 py-1 text-[10px] uppercase font-bold transition-colors ${state.subtitleColor === color ? 'bg-[#E50914] text-white' : 'text-white/50 hover:bg-white/20'}`}
            >
              {color}
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 py-2 text-[10px] uppercase tracking-wider text-white/40 font-semibold border-b border-white/5 mt-1">
        Tracks
      </div>

      <button
        onClick={() => { onSelect(null); onClose(); }}
        className={`w-full text-left px-4 py-2.5 text-sm flex items-center gap-3 transition-colors ${
          activeIndex === null
            ? "text-[#E50914]"
            : "text-white/70 hover:text-white hover:bg-white/10"
        }`}
      >
        {activeIndex === null && <Check className="w-3.5 h-3.5" />}
        {activeIndex !== null && <span className="w-3.5" />}
        Off
      </button>

      {tracks.map((track, idx) => (
        <button
          key={idx}
          onClick={() => { onSelect(idx); onClose(); }}
          className={`w-full text-left px-4 py-2.5 text-sm flex items-center gap-3 transition-colors ${
            activeIndex === idx
              ? "text-[#E50914]"
              : "text-white/70 hover:text-white hover:bg-white/10"
          }`}
        >
          {activeIndex === idx && <Check className="w-3.5 h-3.5" />}
          {activeIndex !== idx && <span className="w-3.5" />}
          {track.label}
        </button>
      ))}
    </div>
  );
}
