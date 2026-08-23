    "use client";

import { useState } from "react";
import { Check, Settings as SettingsIcon, Search, Download, Loader2, AlertCircle } from "lucide-react";
import type { SubtitleTrack, PlayerState } from "./usePlayer";

interface SubtitleMenuProps {
  tracks: SubtitleTrack[];
  activeIndex: number | null;
  state: PlayerState;
  onSelect: (index: number | null) => void;
  onSizeSelect: (size: "small" | "medium" | "large") => void;
  onColorSelect: (color: "white" | "yellow") => void;
  onClose: () => void;
  mediaId?: string;
  onSubtitleDownloaded?: () => void;
}

export default function SubtitleMenu({ tracks, activeIndex, state, onSelect, onSizeSelect, onColorSelect, onClose, mediaId, onSubtitleDownloaded }: SubtitleMenuProps) {
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [downloadingId, setDownloadingId] = useState<number | null>(null);
  const [searchError, setSearchError] = useState("");

  const handleSearch = async () => {
    if (!mediaId) return;
    setIsSearching(true);
    setSearchError("");
    try {
      const res = await fetch(`/api/subtitles/search?id=${mediaId}`);
      const data = await res.json();
      if (data.error) {
        setSearchError(data.error);
      } else {
        setSearchResults(data.results || []);
        if (data.results?.length === 0) {
          setSearchError("No subtitles found online.");
        }
      }
    } catch (err) {
      setSearchError("Failed to search subtitles.");
    } finally {
      setIsSearching(false);
    }
  };

  const handleDownload = async (file_id: number, language: string) => {
    if (!mediaId) return;
    setDownloadingId(file_id);
    try {
      const res = await fetch(`/api/subtitles/download`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mediaId, file_id, language }),
      });
      const data = await res.json();
      if (data.success) {
        if (onSubtitleDownloaded) onSubtitleDownloaded();
        setSearchResults([]); // close search view
      } else {
        setSearchError(data.error || "Download failed");
      }
    } catch (err) {
      setSearchError("Download failed.");
    } finally {
      setDownloadingId(null);
    }
  };

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

      {/* OpenSubtitles Search Integration */}
      {mediaId && (
        <>
          <div className="px-4 py-2 text-[10px] uppercase tracking-wider text-white/40 font-semibold border-b border-t border-white/5 mt-1 flex items-center justify-between">
            <span>Online Search</span>
          </div>
          
          {searchResults.length === 0 && !isSearching && (
            <button
              onClick={handleSearch}
              className="w-full text-left px-4 py-2.5 text-sm flex items-center gap-3 text-indigo-400 hover:text-indigo-300 hover:bg-white/5 transition-colors"
            >
              <Search className="w-3.5 h-3.5" />
              Search OpenSubtitles
            </button>
          )}

          {isSearching && (
            <div className="px-4 py-3 flex items-center justify-center gap-2 text-sm text-white/50">
              <Loader2 className="w-4 h-4 animate-spin" />
              Searching...
            </div>
          )}

          {searchError && (
            <div className="px-4 py-2 text-xs text-red-400 flex items-center gap-2 bg-red-500/10">
              <AlertCircle className="w-3 h-3" />
              {searchError}
            </div>
          )}

          {searchResults.length > 0 && (
            <div className="max-h-48 overflow-y-auto scrollbar-thin scrollbar-thumb-white/20">
              {searchResults.map((sub) => (
                <div key={sub.id} className="w-full text-left px-4 py-2 flex items-center justify-between hover:bg-white/5 group">
                  <div className="flex flex-col overflow-hidden mr-2">
                    <span className="text-sm text-white/90 truncate">{sub.name}</span>
                    <span className="text-[10px] text-white/50 flex items-center gap-2">
                      <span className="uppercase text-indigo-400 font-bold">{sub.language}</span>
                      <span>{sub.downloads.toLocaleString()} DLs</span>
                    </span>
                  </div>
                  <button
                    onClick={() => handleDownload(sub.file_id, sub.language)}
                    disabled={downloadingId === sub.file_id}
                    className="p-1.5 rounded-full bg-white/10 text-white hover:bg-indigo-500 transition-colors disabled:opacity-50"
                  >
                    {downloadingId === sub.file_id ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Download className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
