    "use client";

import { useState } from "react";
import { Check, Settings as SettingsIcon, Search, Download, Loader2, AlertCircle, ArrowLeft, Trash2 } from "lucide-react";
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
  const [view, setView] = useState<"menu" | "search">("menu");
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [downloadingId, setDownloadingId] = useState<number | null>(null);
  const [deletingUrl, setDeletingUrl] = useState<string | null>(null);
  const [searchError, setSearchError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  const handleSearch = async (queryOverride?: string) => {
    if (!mediaId) return;
    setIsSearching(true);
    setSearchError("");
    try {
      const q = queryOverride !== undefined ? queryOverride : searchQuery;
      const url = q.trim() ? `/api/subtitles/search?id=${mediaId}&q=${encodeURIComponent(q)}` : `/api/subtitles/search?id=${mediaId}`;
      const res = await fetch(url);
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

  const handleDownload = async (file_id: number, language: string, subName: string) => {
    if (!mediaId) return;
    setDownloadingId(file_id);
    try {
      const res = await fetch(`/api/subtitles/download`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mediaId, file_id, language, subName }),
      });
      const data = await res.json();
      if (data.success) {
        if (onSubtitleDownloaded) onSubtitleDownloaded();
        setView("menu");
        setSearchResults([]);
      } else {
        setSearchError(data.error || "Download failed");
      }
    } catch (err) {
      setSearchError("Download failed.");
    } finally {
      setDownloadingId(null);
    }
  };

  const handleDelete = async (url: string) => {
    setDeletingUrl(url);
    try {
      await fetch(url, { method: "DELETE" });
      if (onSubtitleDownloaded) onSubtitleDownloaded(); // Refresh list
    } catch (err) {
      console.error("Failed to delete subtitle");
    } finally {
      setDeletingUrl(null);
    }
  };

  return (
    <div
      className="absolute bottom-full right-0 mb-2 bg-[#1a1a1a] border border-white/10 rounded-lg shadow-2xl min-w-[260px] max-w-[320px] max-h-[70vh] overflow-y-auto py-1 z-50 scrollbar-thin scrollbar-thumb-white/20 scrollbar-track-transparent flex flex-col"
      onClick={(e) => e.stopPropagation()}
    >
      {view === "menu" ? (
        <>
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

          {tracks.map((track, idx) => {
            const isExternal = track.url?.startsWith("/api/subtitle-file");
            return (
              <div key={idx} className="flex items-center w-full group overflow-hidden">
                <button
                  onClick={() => { onSelect(idx); onClose(); }}
                  title={track.label}
                  className={`flex-1 min-w-0 text-left px-4 py-2.5 text-sm flex items-center gap-3 transition-colors ${
                    activeIndex === idx
                      ? "text-[#E50914]"
                      : "text-white/70 hover:text-white hover:bg-white/10"
                  }`}
                >
                  {activeIndex === idx && <Check className="w-3.5 h-3.5 flex-shrink-0" />}
                  {activeIndex !== idx && <span className="w-3.5 flex-shrink-0" />}
                  <span className="truncate">{track.label}</span>
                </button>
                {isExternal && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(track.url);
                    }}
                    disabled={deletingUrl === track.url}
                    className="p-2 mr-2 text-white/30 hover:text-red-500 transition-colors rounded hover:bg-white/10 disabled:opacity-50"
                  >
                    {deletingUrl === track.url ? (
                      <Loader2 className="w-4 h-4 animate-spin text-white/50" />
                    ) : (
                      <Trash2 className="w-4 h-4" />
                    )}
                  </button>
                )}
              </div>
            );
          })}

          {/* OpenSubtitles Search Integration */}
          {mediaId && (
            <>
              <div className="px-4 py-2 text-[10px] uppercase tracking-wider text-white/40 font-semibold border-b border-t border-white/5 mt-1 flex items-center justify-between">
                <span>Online Search</span>
              </div>
              
              <button
                onClick={() => {
                  setView("search");
                  if (searchResults.length === 0) handleSearch();
                }}
                className="w-full text-left px-4 py-2.5 text-sm flex items-center gap-3 text-indigo-400 hover:text-indigo-300 hover:bg-white/5 transition-colors"
              >
                <Search className="w-3.5 h-3.5" />
                Search OpenSubtitles
              </button>
            </>
          )}
        </>
      ) : (
        <div className="flex flex-col h-full">
          <div className="px-3 py-2 border-b border-white/5 flex items-center gap-2">
            <button
              onClick={() => setView("menu")}
              className="p-1.5 text-white/50 hover:text-white hover:bg-white/10 rounded-full transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <span className="text-xs uppercase tracking-wider text-white/70 font-semibold">
              OpenSubtitles
            </span>
          </div>

          <div className="px-3 py-2 border-b border-white/5">
            <form 
              onSubmit={(e) => { e.preventDefault(); handleSearch(); }}
              className="flex items-center gap-2"
            >
              <input
                type="text"
                placeholder="Search movie name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded px-2 py-1.5 text-xs text-white placeholder:text-white/30 focus:outline-none focus:border-indigo-500 transition-colors"
              />
              <button
                type="submit"
                disabled={isSearching}
                className="p-1.5 bg-indigo-500/20 text-indigo-400 hover:bg-indigo-500/30 rounded transition-colors disabled:opacity-50"
              >
                <Search className="w-4 h-4" />
              </button>
            </form>
          </div>

          <div className="flex-1 overflow-y-auto min-h-[150px]">
            {isSearching && (
              <div className="px-4 py-6 flex flex-col items-center justify-center gap-2 text-sm text-white/50">
                <Loader2 className="w-5 h-5 animate-spin" />
                Searching...
              </div>
            )}

            {!isSearching && searchError && (
              <div className="px-4 py-4 text-xs text-red-400 flex items-center gap-2 bg-red-500/5 m-2 rounded">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                {searchError}
              </div>
            )}

            {!isSearching && searchResults.length > 0 && (
              <div className="py-1">
                {searchResults.map((sub) => (
                  <div key={sub.id} className="w-full text-left px-4 py-2 flex items-center justify-between hover:bg-white/5 group border-b border-white/5 last:border-0">
                    <div className="flex flex-col overflow-hidden mr-2">
                      <span className="text-xs text-white/90 truncate">{sub.name}</span>
                      <span className="text-[10px] text-white/50 flex items-center gap-2 mt-0.5">
                        <span className="uppercase text-indigo-400 font-bold">{sub.language}</span>
                        <span>{sub.downloads.toLocaleString()} DLs</span>
                      </span>
                    </div>
                    <button
                      onClick={() => handleDownload(sub.file_id, sub.language, sub.name)}
                      disabled={downloadingId === sub.file_id}
                      className="p-1.5 rounded bg-white/10 text-white hover:bg-indigo-500 transition-colors disabled:opacity-50 flex-shrink-0"
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
          </div>
        </div>
      )}
    </div>
  );
}
