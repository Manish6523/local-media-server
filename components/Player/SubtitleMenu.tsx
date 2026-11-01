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
      const res = await fetch(`/api/subtitles/download?url=${encodeURIComponent(url)}`, {
        method: "DELETE",
      });
      if (res.ok) {
        if (onSubtitleDownloaded) onSubtitleDownloaded();
      }
    } catch (err) {
      console.error("Failed to delete subtitle");
    } finally {
      setDeletingUrl(null);
    }
  };

  return (
    <div
      style={PLAYER_POPUP_GLASS_STYLE}
      className="fixed sm:absolute bottom-20 sm:bottom-full right-3 sm:right-0 mb-3 rounded-2xl p-3 z-50 text-white w-[290px] sm:w-[330px] max-w-[calc(100vw-1.5rem)] max-h-[min(340px,calc(100vh-140px))] animate-in fade-in zoom-in-95 origin-bottom-right duration-150 shadow-2xl flex flex-col select-none overflow-hidden"
      onClick={(e) => e.stopPropagation()}
    >
      {view === "menu" ? (
        <>
          {/* Header */}
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-white/10 px-1 text-[11px] font-bold uppercase tracking-wider text-white/50 shrink-0">
            <span className="flex items-center gap-1.5">
              <Subtitles className="w-3.5 h-3.5 text-white/70" />
              Subtitles
            </span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white/10 text-white/70">
              {tracks.length} Available
            </span>
          </div>

          <div className="space-y-2 overflow-y-auto scrollbar-thin scrollbar-thumb-white/20 pr-0.5">
            {/* Customization controls: Size & Color */}
            <div className="p-2 rounded-xl bg-white/5 border border-white/10 space-y-1.5">
              {/* Font Size */}
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-white/70 font-medium">Font Size</span>
                <div className="flex bg-white/10 rounded-lg p-0.5">
                  {(["small", "medium", "large"] as const).map((size) => {
                    const isSelected = state.subtitleSize === size;
                    return (
                      <button
                        key={size}
                        onClick={() => onSizeSelect(size)}
                        className={`px-2 py-0.5 text-[10px] uppercase font-bold rounded-md transition-all ${
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

              {/* Font Color */}
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-white/70 font-medium">Font Color</span>
                <div className="flex bg-white/10 rounded-lg p-0.5">
                  {(["white", "yellow"] as const).map((color) => {
                    const isSelected = state.subtitleColor === color;
                    return (
                      <button
                        key={color}
                        onClick={() => onColorSelect(color)}
                        className={`px-2.5 py-0.5 text-[10px] capitalize font-bold rounded-md transition-all ${
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

            {/* Track List */}
            <div className="space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-white/40 px-1 block pt-1">
                Select Track
              </span>

              {/* Off Option */}
              <button
                onClick={() => {
                  onSelect(null);
                  onClose();
                }}
                className={`w-full text-left px-3 py-2 rounded-xl flex items-center justify-between transition-all border ${
                  activeIndex === null
                    ? "bg-white/20 border-white/30 text-white shadow-sm font-semibold"
                    : "bg-transparent border-transparent text-white/70 hover:bg-white/10 hover:text-white"
                }`}
              >
                <div className="flex items-center gap-2">
                  <span
                    className={`w-2 h-2 rounded-full shrink-0 ${
                      activeIndex === null
                        ? "bg-white shadow-[0_0_8px_rgba(255,255,255,0.8)]"
                        : "bg-white/25"
                    }`}
                  />
                  <span className="text-xs">Off (No Subtitles)</span>
                </div>
                {activeIndex === null && <Check className="w-3.5 h-3.5 text-white shrink-0" />}
              </button>

              {/* Available Tracks */}
              {tracks.map((track, idx) => {
                const isSelected = activeIndex === idx;
                const isCustom = track.url.includes("/api/static/subtitles");
                const isDeleting = deletingUrl === track.url;

                return (
                  <div
                    key={track.url || idx}
                    className={`w-full px-3 py-2 rounded-xl flex items-center justify-between transition-all border ${
                      isSelected
                        ? "bg-white/20 border-white/30 text-white shadow-sm font-semibold"
                        : "bg-transparent border-transparent text-white/70 hover:bg-white/10 hover:text-white"
                    }`}
                  >
                    <button
                      onClick={() => {
                        onSelect(idx);
                        onClose();
                      }}
                      className="flex-1 flex items-center gap-2 truncate text-left mr-1"
                    >
                      <span
                        className={`w-2 h-2 rounded-full shrink-0 ${
                          isSelected
                            ? "bg-white shadow-[0_0_8px_rgba(255,255,255,0.8)]"
                            : "bg-white/25"
                        }`}
                      />
                      <span className="text-xs truncate">{track.label}</span>
                    </button>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {isCustom && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(track.url);
                          }}
                          disabled={isDeleting}
                          className="p-1 text-white/40 hover:text-red-400 hover:bg-white/10 rounded-md transition-colors"
                          title="Delete subtitle"
                        >
                          {isDeleting ? (
                            <Loader2 className="w-3 h-3 animate-spin text-red-400" />
                          ) : (
                            <Trash2 className="w-3 h-3" />
                          )}
                        </button>
                      )}
                      {isSelected && <Check className="w-3.5 h-3.5 text-white" />}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Search Online Button */}
          <div className="pt-2 mt-2 border-t border-white/10 shrink-0">
            <button
              onClick={() => {
                setView("search");
                handleSearch();
              }}
              className="w-full py-2 px-3 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-all active:scale-95"
            >
              <Search className="w-3.5 h-3.5" />
              <span>Search Online Subtitles</span>
            </button>
          </div>
        </>
      ) : (
        /* SEARCH VIEW */
        <div className="flex flex-col h-full space-y-2">
          {/* Header */}
          <div className="flex items-center gap-2 pb-2 border-b border-white/10 shrink-0">
            <button
              onClick={() => setView("menu")}
              className="p-1 hover:bg-white/10 rounded-lg text-white/60 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div className="flex-1 relative">
              <input
                type="text"
                placeholder="Search language/title..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                className="w-full bg-white/10 text-white text-xs px-2.5 py-1.5 rounded-xl border border-white/10 focus:outline-none focus:border-violet-400 placeholder-white/30"
              />
            </div>
            <button
              onClick={() => handleSearch()}
              disabled={isSearching}
              className="px-2.5 py-1.5 bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold rounded-xl transition-colors disabled:opacity-50 flex items-center gap-1"
            >
              {isSearching ? <Loader2 className="w-3 h-3 animate-spin" /> : <Search className="w-3 h-3" />}
              <span>Find</span>
            </button>
          </div>

          {/* Search Results list */}
          <div className="overflow-y-auto space-y-1.5 scrollbar-thin scrollbar-thumb-white/20 pr-0.5 max-h-[190px]">
            {isSearching ? (
              <div className="flex flex-col items-center justify-center py-6 text-white/40">
                <Loader2 className="w-5 h-5 animate-spin mb-1 text-violet-400" />
                <span className="text-xs">Searching OpenSubtitles...</span>
              </div>
            ) : searchError ? (
              <div className="p-2 text-xs text-amber-300 flex items-center gap-2 bg-amber-500/10 rounded-xl border border-amber-500/20">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>{searchError}</span>
              </div>
            ) : searchResults.length === 0 ? (
              <div className="text-center py-6 text-white/40 text-xs">
                Press Find to search subtitles online.
              </div>
            ) : (
              searchResults.map((res) => {
                const isDownloading = downloadingId === res.file_id;
                return (
                  <div
                    key={res.id || res.file_id}
                    className="p-2 bg-white/5 border border-white/10 rounded-xl flex items-center justify-between hover:bg-white/10 transition-colors"
                  >
                    <div className="flex-1 min-w-0 pr-2">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <span className="text-[10px] font-mono px-1 py-0.2 bg-violet-500/20 text-violet-300 rounded font-bold">
                          {res.language?.toUpperCase() || "SUB"}
                        </span>
                        {res.hearing_impaired && (
                          <span className="text-[9px] px-1 py-0.2 bg-white/10 text-white/60 rounded">
                            SDH
                          </span>
                        )}
                        <span className="text-[10px] text-white/40 font-mono">
                          ↓ {res.download_count}
                        </span>
                      </div>
                      <div className="text-xs text-white truncate" title={res.release || res.subName}>
                        {res.release || res.subName}
                      </div>
                    </div>

                    <button
                      onClick={() => handleDownload(res.file_id, res.language, res.subName || res.release)}
                      disabled={isDownloading}
                      className="p-1.5 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-all shrink-0 active:scale-95 disabled:opacity-50"
                      title="Download and apply"
                    >
                      {isDownloading ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-violet-300" />
                      ) : (
                        <Download className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
