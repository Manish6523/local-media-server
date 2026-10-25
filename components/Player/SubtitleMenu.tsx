"use client";

import { useState } from "react";
import {
  Check,
  Search,
  Download,
  Loader2,
  AlertCircle,
  ArrowLeft,
  Trash2,
  Subtitles,
  Sparkles,
} from "lucide-react";
import type { SubtitleTrack, PlayerState } from "./usePlayer";
import { PLAYER_POPUP_GLASS_STYLE } from "./playerStyles";

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

export default function SubtitleMenu({
  tracks,
  activeIndex,
  state,
  onSelect,
  onSizeSelect,
  onColorSelect,
  onClose,
  mediaId,
  onSubtitleDownloaded,
}: SubtitleMenuProps) {
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
      const url = q.trim()
        ? `/api/subtitles/search?id=${mediaId}&q=${encodeURIComponent(q)}`
        : `/api/subtitles/search?id=${mediaId}`;
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
      if (onSubtitleDownloaded) onSubtitleDownloaded();
    } catch (err) {
      console.error("Failed to delete subtitle");
    } finally {
      setDeletingUrl(null);
    }
  };

  return (
    <div
      style={PLAYER_POPUP_GLASS_STYLE}
      className="absolute bottom-full right-0 mb-3 rounded-3xl min-w-[280px] md:min-w-[320px] max-w-[calc(100vw-2rem)] sm:max-w-[360px] max-h-[75vh] p-3.5 z-50 text-white animate-in fade-in zoom-in-95 origin-bottom-right duration-150 flex flex-col overflow-hidden"
      onClick={(e) => e.stopPropagation()}
    >
      {view === "menu" ? (
        <>
          {/* Header */}
          <div className="px-1 py-1 text-[11px] font-bold uppercase tracking-wider text-white/50 border-b border-white/10 pb-2 mb-2 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Subtitles className="w-3.5 h-3.5 text-white/70" />
              Subtitle Options
            </span>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-full bg-white/10 text-white/60">
              {tracks.length} Tracks
            </span>
          </div>

          {/* Scrollable Content */}
          <div className="space-y-3 overflow-y-auto scrollbar-thin scrollbar-thumb-white/20 pr-1 max-h-[50vh]">
            {/* Appearance Section */}
            <div className="p-2.5 rounded-2xl bg-white/5 border border-white/10 space-y-2">
              {/* Size */}
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-medium text-white/70">Font Size</span>
                <div className="flex bg-white/10 rounded-xl p-0.5">
                  {(["small", "medium", "large"] as const).map((size) => {
                    const isSelected = state.subtitleSize === size;
                    return (
                      <button
                        key={size}
                        onClick={() => onSizeSelect(size)}
                        className={`px-2.5 py-0.5 text-[10px] uppercase font-bold rounded-lg transition-all ${
                          isSelected
                            ? "bg-white text-black shadow-sm font-extrabold"
                            : "text-white/60 hover:text-white"
                        }`}
                      >
                        {size[0]}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Color */}
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-medium text-white/70">Font Color</span>
                <div className="flex bg-white/10 rounded-xl p-0.5">
                  {(["white", "yellow"] as const).map((color) => {
                    const isSelected = state.subtitleColor === color;
                    return (
                      <button
                        key={color}
                        onClick={() => onColorSelect(color)}
                        className={`px-2.5 py-0.5 text-[10px] capitalize font-bold rounded-lg transition-all ${
                          isSelected
                            ? "bg-white text-black shadow-sm font-extrabold"
                            : "text-white/60 hover:text-white"
                        }`}
                      >
                        {color}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Tracks List */}
            <div className="space-y-1">
              <div className="text-[10px] font-bold uppercase tracking-wider text-white/40 px-1 mb-1">
                Select Track
              </div>

              {/* Subtitles Off */}
              <button
                onClick={() => {
                  onSelect(null);
                  onClose();
                }}
                className={`w-full text-left px-3 py-2 rounded-2xl flex items-center justify-between transition-all border ${
                  activeIndex === null
                    ? "bg-white/20 border-white/30 text-white font-semibold shadow-sm"
                    : "bg-transparent border-transparent text-white/70 hover:bg-white/10 hover:text-white"
                }`}
              >
                <div className="flex items-center gap-2">
                  <span
                    className={`w-2 h-2 rounded-full ${
                      activeIndex === null ? "bg-white shadow-[0_0_8px_rgba(255,255,255,0.8)]" : "bg-white/25"
                    }`}
                  />
                  <span className="text-xs">Off (No Subtitles)</span>
                </div>
                {activeIndex === null && <Check className="w-3.5 h-3.5 text-white" />}
              </button>

              {/* Available Tracks */}
              {tracks.map((track, idx) => {
                const isSelected = activeIndex === idx;
                const isExternal = track.url?.startsWith("/api/subtitle-file");
                return (
                  <div key={idx} className="flex items-center w-full group">
                    <button
                      onClick={() => {
                        onSelect(idx);
                        onClose();
                      }}
                      className={`flex-1 min-w-0 text-left px-3 py-2 rounded-2xl flex items-center justify-between transition-all border ${
                        isSelected
                          ? "bg-white/20 border-white/30 text-white font-semibold shadow-sm"
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
                        {isExternal && (
                          <span className="text-[9px] uppercase px-1.5 py-0.5 rounded bg-violet-500/20 text-violet-300 font-mono">
                            Ext
                          </span>
                        )}
                        {isSelected && <Check className="w-3.5 h-3.5 text-white" />}
                      </div>
                    </button>

                    {/* External subtitle delete button */}
                    {isExternal && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(track.url);
                        }}
                        disabled={deletingUrl === track.url}
                        className="p-2 ml-1 text-white/40 hover:text-red-400 hover:bg-white/10 rounded-xl transition-colors disabled:opacity-50"
                        title="Delete external subtitle"
                      >
                        {deletingUrl === track.url ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Trash2 className="w-3.5 h-3.5" />
                        )}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* OpenSubtitles Search Trigger */}
          {mediaId && (
            <div className="pt-2 border-t border-white/10 mt-2">
              <button
                onClick={() => {
                  setView("search");
                  if (searchResults.length === 0) handleSearch();
                }}
                className="w-full py-2 px-3 rounded-2xl glass-md hover:bg-white/15 flex items-center justify-center gap-2 text-xs font-semibold text-white/90 hover:text-white transition-all shadow-sm"
              >
                <Search className="w-3.5 h-3.5" />
                Search Online Subtitles
              </button>
            </div>
          )}
        </>
      ) : (
        /* SEARCH VIEW */
        <div className="flex flex-col h-full space-y-2">
          {/* Header */}
          <div className="flex items-center gap-2 pb-2 border-b border-white/10">
            <button
              onClick={() => setView("menu")}
              className="p-1.5 rounded-full hover:bg-white/10 text-white/60 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <span className="text-xs font-bold text-white tracking-wide">
              Search OpenSubtitles
            </span>
          </div>

          {/* Search Form */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSearch();
            }}
            className="flex items-center gap-1.5"
          >
            <input
              type="text"
              placeholder="Search title..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 bg-white/10 border border-white/15 rounded-xl px-3 py-1.5 text-xs text-white placeholder:text-white/40 focus:outline-none focus:border-white/30 transition-colors"
            />
            <button
              type="submit"
              disabled={isSearching}
              className="p-2 rounded-xl bg-white/20 hover:bg-white/30 text-white transition-colors disabled:opacity-50"
            >
              <Search className="w-3.5 h-3.5" />
            </button>
          </form>

          {/* Results List */}
          <div className="flex-1 overflow-y-auto min-h-[160px] max-h-[45vh] space-y-1.5 scrollbar-thin scrollbar-thumb-white/20 pr-1">
            {isSearching && (
              <div className="py-8 flex flex-col items-center justify-center gap-2 text-xs text-white/50">
                <Loader2 className="w-5 h-5 animate-spin text-white/70" />
                Searching OpenSubtitles...
              </div>
            )}

            {!isSearching && searchError && (
              <div className="p-3 text-xs text-red-300 flex items-center gap-2 bg-red-500/10 rounded-2xl border border-red-500/20">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{searchError}</span>
              </div>
            )}

            {!isSearching && searchResults.length > 0 && (
              <div className="space-y-1 pt-1">
                {searchResults.map((sub) => (
                  <div
                    key={sub.id}
                    className="p-2.5 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/5 flex items-center justify-between gap-2 transition-all"
                  >
                    <div className="flex-1 min-w-0 pr-1">
                      <p className="text-xs font-semibold text-white truncate" title={sub.name}>
                        {sub.name}
                      </p>
                      <p className="text-[10px] text-white/50 flex items-center gap-2 mt-0.5">
                        <span className="uppercase text-violet-300 font-bold font-mono">
                          {sub.language}
                        </span>
                        <span>•</span>
                        <span>{sub.downloads.toLocaleString()} downloads</span>
                      </p>
                    </div>

                    <button
                      onClick={() => handleDownload(sub.file_id, sub.language, sub.name)}
                      disabled={downloadingId === sub.file_id}
                      className="p-2 rounded-xl bg-white/20 hover:bg-white/30 text-white active:scale-95 transition-all shrink-0 disabled:opacity-50"
                      title="Download subtitle"
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
