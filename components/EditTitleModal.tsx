"use client";

import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { 
  X, 
  Loader2, 
  Sparkles, 
  UploadCloud, 
  Search, 
  Image as ImageIcon, 
  Check, 
  ThumbsUp, 
  FolderOpen,
  ClipboardPaste,
  Film
} from "lucide-react";

interface MediaEntry {
  id: number;
  filename: string;
  title: string;
  type: string;
  poster?: string | null;
  backdrop?: string | null;
}

interface EditTitleModalProps {
  media: MediaEntry;
  onClose: () => void;
}

interface ArtworkOption {
  url: string;
  source: "omdb" | "fanart";
  likes?: number;
}

interface ImageUploaderProps {
  label: string;
  value: string;
  onChange: (val: string) => void;
  aspectRatioText?: string;
  isBackdrop?: boolean;
}

function ImageUploader({ label, value, onChange, aspectRatioText, isBackdrop }: ImageUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = (file: File) => {
    if (!file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      if (e.target?.result) {
        onChange(e.target.result as string);
      }
    };
    reader.readAsDataURL(file);
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (items) {
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.startsWith("image/")) {
          e.preventDefault();
          const file = items[i].getAsFile();
          if (file) handleFile(file);
          return;
        }
      }
    }
  };

  return (
    <div className="space-y-2 flex flex-col items-center w-full" onPaste={handlePaste}>
      <div className="flex items-center justify-between w-full px-0.5">
        <label className="text-xs font-semibold text-white/80 flex items-center gap-1.5">
          <ImageIcon className="w-3.5 h-3.5 text-violet-400" />
          {label}
        </label>
        {aspectRatioText && (
          <span className="text-[10px] text-white/40 font-mono">{aspectRatioText}</span>
        )}
      </div>

      <input 
        type="file" 
        ref={fileInputRef} 
        accept="image/*" 
        className="hidden" 
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
        }}
      />

      {value ? (
        <div 
          className={`relative group rounded-2xl overflow-hidden border border-white/10 glass bg-black/60 shadow-xl transition-all duration-300 ${
            isBackdrop 
              ? 'w-full aspect-video max-h-52' 
              : 'w-44 h-64 aspect-[2/3] shadow-[0_10px_30px_-10px_rgba(139,92,246,0.3)]'
          } flex items-center justify-center`}
        >
          <img 
            src={value} 
            alt={label} 
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" 
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2 p-3">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="px-3.5 py-1.5 rounded-xl bg-white/20 hover:bg-white/30 text-white text-xs font-medium backdrop-blur-md transition-all flex items-center gap-1.5 shadow-lg border border-white/10"
            >
              <FolderOpen className="w-3.5 h-3.5" />
              Change
            </button>
            <button
              type="button"
              onClick={() => onChange("")}
              className="px-3 py-1.5 rounded-xl bg-red-500/30 hover:bg-red-500/50 text-red-200 text-xs font-medium backdrop-blur-md transition-all flex items-center gap-1.5 shadow-lg border border-red-500/20"
              title="Remove image"
            >
              <X className="w-3.5 h-3.5" />
              Remove
            </button>
          </div>
          <div className="absolute bottom-2 left-2 px-2.5 py-1 rounded-lg bg-black/75 backdrop-blur-md text-[10px] text-emerald-400 font-semibold flex items-center gap-1.5 border border-white/10 shadow-md">
            <Check className="w-3 h-3 stroke-[2.5]" /> Selected
          </div>
        </div>
      ) : (
        <div
          tabIndex={0}
          onClick={() => fileInputRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setIsDragging(false);
            const file = e.dataTransfer.files?.[0];
            if (file) handleFile(file);
          }}
          className={`relative border-2 border-dashed rounded-2xl p-4 text-center cursor-pointer transition-all outline-none ${
            isDragging 
              ? 'border-violet-500 bg-violet-500/10 scale-[0.99]' 
              : 'border-white/10 hover:border-violet-500/40 bg-white/[0.02] hover:bg-white/[0.04]'
          } ${
            isBackdrop 
              ? 'w-full aspect-video max-h-52' 
              : 'w-44 h-64 aspect-[2/3]'
          } flex flex-col items-center justify-center gap-2.5`}
        >
          <div className="w-10 h-10 rounded-full bg-violet-500/10 text-violet-400 flex items-center justify-center border border-violet-500/20 shadow-inner">
            <UploadCloud className="w-5 h-5" />
          </div>
          <div className="space-y-1">
            <p className="text-xs font-medium text-white/80">
              Browse or drop
            </p>
            <p className="text-[10px] text-white/40 flex items-center justify-center gap-1">
              <ClipboardPaste className="w-3 h-3" /> or Ctrl+V
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

export default function EditTitleModal({ media, onClose }: EditTitleModalProps) {
  const [customTitle, setCustomTitle] = useState(media.title);
  const [customPoster, setCustomPoster] = useState(media.poster || "");
  const [customBackdrop, setCustomBackdrop] = useState(media.backdrop || "");
  const [isSaving, setIsSaving] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Artwork Search State
  const [searchQuery, setSearchQuery] = useState(media.title);
  const [isSearchingArtwork, setIsSearchingArtwork] = useState(false);
  const [searched, setSearched] = useState(false);
  const [artworkPosters, setArtworkPosters] = useState<ArtworkOption[]>([]);
  const [artworkBackdrops, setArtworkBackdrops] = useState<ArtworkOption[]>([]);
  const [activeTab, setActiveTab] = useState<"upload" | "search">("upload");

  useEffect(() => {
    setMounted(true);
  }, []);

  // Extract a clean title from filename as a suggestion
  const parsedSuggestion = media.filename
    .replace(/\.\w{2,4}$/, "")
    .replace(/[._]/g, " ")
    .replace(/S\d{1,2}E\d{1,2}.*/i, "")
    .replace(/\[.*?\]/g, "")
    .trim();

  const handleSearchArtwork = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const query = searchQuery.trim();
    if (!query) return;

    setIsSearchingArtwork(true);
    setSearched(true);
    try {
      const res = await fetch(
        `/api/artwork/search?query=${encodeURIComponent(query)}&type=${encodeURIComponent(media.type || "movie")}`
      );
      if (res.ok) {
        const data = await res.json();
        setArtworkPosters(data.posters || []);
        setArtworkBackdrops(data.backdrops || []);
      } else {
        setArtworkPosters([]);
        setArtworkBackdrops([]);
      }
    } catch (err) {
      console.error("Failed to search artwork:", err);
      setArtworkPosters([]);
      setArtworkBackdrops([]);
    } finally {
      setIsSearchingArtwork(false);
    }
  };

  const handleSave = async () => {
    if (!customTitle.trim()) return;
    
    setIsSaving(true);
    try {
      const res = await fetch(`/api/media/${media.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          title: customTitle.trim(),
          customPoster: customPoster.trim() || undefined,
          customBackdrop: customBackdrop.trim() || undefined
        })
      });
      
      if (res.ok) {
        window.location.reload();
      } else {
        alert("Failed to update media info");
        setIsSaving(false);
      }
    } catch (err) {
      console.error(err);
      alert("Error saving media info");
      setIsSaving(false);
    }
  };

  if (!mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 cursor-default animate-in fade-in duration-200">
      <div 
        className="glass-heavy w-full max-w-2xl max-h-[92vh] flex flex-col rounded-2xl overflow-hidden shadow-2xl relative border border-white/10 animate-in zoom-in-95 duration-200"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.08] shrink-0 bg-white/[0.02]">
          <h2 className="text-base font-semibold text-white flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-violet-400" />
            Edit Media Info & Artwork
          </h2>
          <button 
            onClick={(e) => { e.preventDefault(); onClose(); }}
            className="text-white/40 hover:text-white transition-colors p-1.5 rounded-lg hover:bg-white/[0.06]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="p-6 space-y-5 overflow-y-auto">
          {/* Filename info */}
          <div className="space-y-1">
            <p className="text-[11px] text-white/40 font-medium">Filename</p>
            <p className="text-xs text-white/70 font-mono break-all glass rounded-lg px-3 py-2 bg-black/20 border border-white/5">
              {media.filename}
            </p>
          </div>

          {/* Title Suggestions */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-medium text-white/50 block">
              Title Suggestions
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button 
                type="button"
                onClick={() => {
                  setCustomTitle(parsedSuggestion);
                  setSearchQuery(parsedSuggestion);
                }}
                className="text-left px-3.5 py-2.5 rounded-xl glass hover:border-violet-500/30 text-white text-xs transition-all border border-white/5"
              >
                <span className="text-violet-400 text-[10px] font-semibold uppercase block mb-0.5">Parsed from Filename</span>
                <span className="text-white/80 truncate block">{parsedSuggestion || "N/A"}</span>
              </button>
              
              <button 
                type="button"
                onClick={() => {
                  setCustomTitle(media.title);
                  setSearchQuery(media.title);
                }}
                className="text-left px-3.5 py-2.5 rounded-xl glass hover:border-violet-500/30 text-white text-xs transition-all border border-white/5"
              >
                <span className="text-white/40 text-[10px] font-semibold uppercase block mb-0.5">Original Title</span>
                <span className="text-white/80 truncate block">{media.title}</span>
              </button>
            </div>
          </div>

          {/* Custom Title Input */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-white/70 block">
              Title
            </label>
            <input 
              type="text" 
              value={customTitle}
              onChange={(e) => setCustomTitle(e.target.value)}
              className="w-full glass rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-violet-500/40 border border-white/10 transition-colors bg-black/20"
              placeholder="Type media title..."
            />
          </div>

          {/* Artwork Section with Tabs */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-2">
              <span className="text-sm font-semibold text-white/90">Artwork</span>
              <div className="flex gap-1 bg-white/[0.04] p-1 rounded-xl border border-white/10">
                <button
                  type="button"
                  onClick={() => setActiveTab("upload")}
                  className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                    activeTab === "upload" 
                      ? "bg-violet-600 text-white shadow-sm" 
                      : "text-white/60 hover:text-white"
                  }`}
                >
                  Upload & Paste
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab("search");
                    if (!searched) handleSearchArtwork();
                  }}
                  className={`px-3 py-1 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${
                    activeTab === "search" 
                      ? "bg-violet-600 text-white shadow-sm" 
                      : "text-white/60 hover:text-white"
                  }`}
                >
                  <Search className="w-3 h-3" />
                  Search Online
                </button>
              </div>
            </div>

            {/* TAB 1: Upload / Drag & Drop / Paste */}
            {activeTab === "upload" && (
              <div className="grid grid-cols-1 md:grid-cols-[180px_1fr] gap-6 items-start justify-items-center md:justify-items-stretch animate-in fade-in duration-200 p-2">
                <ImageUploader
                  label="Poster"
                  aspectRatioText="2:3 vertical"
                  value={customPoster}
                  onChange={setCustomPoster}
                />
                <ImageUploader
                  label="Backdrop"
                  aspectRatioText="16:9 widescreen"
                  value={customBackdrop}
                  onChange={setCustomBackdrop}
                  isBackdrop
                />
              </div>
            )}

            {/* TAB 2: Search from Fanart.tv & OMDB */}
            {activeTab === "search" && (
              <div className="space-y-5 animate-in fade-in duration-200">
                {/* Search Bar */}
                <form onSubmit={handleSearchArtwork} className="flex gap-2">
                  <div className="relative flex-1">
                    <Search className="w-4 h-4 text-white/40 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input 
                      type="text" 
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search keyword (e.g. Inception, Breaking Bad)..."
                      className="w-full glass rounded-xl pl-10 pr-4 py-2.5 text-white text-sm focus:outline-none focus:border-violet-500/40 border border-white/10 bg-black/20"
                    />
                  </div>
                  <button 
                    type="submit" 
                    disabled={isSearchingArtwork || !searchQuery.trim()}
                    className="flex items-center gap-1.5 px-4 py-2.5 bg-violet-600 hover:bg-violet-500 text-white text-xs font-medium rounded-xl transition-all disabled:opacity-50 shrink-0"
                  >
                    {isSearchingArtwork ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
                    Search
                  </button>
                </form>

                {isSearchingArtwork && (
                  <div className="py-12 flex flex-col items-center justify-center gap-2 text-white/50">
                    <Loader2 className="w-6 h-6 animate-spin text-violet-400" />
                    <span className="text-xs">Fetching artwork from Fanart.tv & OMDb...</span>
                  </div>
                )}

                {!isSearchingArtwork && searched && (
                  <div className="space-y-6">
                    {/* Poster Results */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-white/80 uppercase tracking-wider">
                          Posters ({artworkPosters.length})
                        </span>
                        <span className="text-[11px] text-white/40">Click any image to select as Poster</span>
                      </div>

                      {artworkPosters.length === 0 ? (
                        <p className="text-xs text-white/40 italic p-4 glass rounded-xl text-center">
                          No posters found for this query.
                        </p>
                      ) : (
                        <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 max-h-56 overflow-y-auto pr-1">
                          {artworkPosters.map((img, idx) => {
                            const isSelected = customPoster === img.url;
                            return (
                              <button
                                key={`poster-${idx}-${img.url}`}
                                type="button"
                                onClick={() => setCustomPoster(img.url)}
                                className={`group relative rounded-xl overflow-hidden aspect-[2/3] border-2 transition-all cursor-pointer text-left ${
                                  isSelected 
                                    ? "border-violet-500 ring-2 ring-violet-500/50 shadow-lg scale-[0.98]" 
                                    : "border-white/10 hover:border-violet-500/40 opacity-80 hover:opacity-100"
                                }`}
                              >
                                <img 
                                  src={img.url} 
                                  alt={`Poster ${idx}`} 
                                  className="w-full h-full object-cover" 
                                  loading="lazy"
                                />
                                {isSelected && (
                                  <div className="absolute top-1.5 right-1.5 bg-violet-600 text-white p-1 rounded-full shadow-md">
                                    <Check className="w-3 h-3" />
                                  </div>
                                )}
                                <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent p-1.5 flex items-center justify-between text-[10px] text-white/90">
                                  <span className="font-semibold uppercase tracking-wider">
                                    {img.source === "omdb" ? "OMDb" : "Fanart"}
                                  </span>
                                  {img.likes !== undefined && img.likes > 0 && (
                                    <span className="flex items-center gap-0.5 text-white/70">
                                      <ThumbsUp className="w-2.5 h-2.5" />
                                      {img.likes}
                                    </span>
                                  )}
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {/* Backdrop Results */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-white/80 uppercase tracking-wider">
                          Backdrops ({artworkBackdrops.length})
                        </span>
                        <span className="text-[11px] text-white/40">Click any image to select as Backdrop</span>
                      </div>

                      {artworkBackdrops.length === 0 ? (
                        <p className="text-xs text-white/40 italic p-4 glass rounded-xl text-center">
                          No backdrops found for this query on Fanart.tv.
                        </p>
                      ) : (
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-56 overflow-y-auto pr-1">
                          {artworkBackdrops.map((img, idx) => {
                            const isSelected = customBackdrop === img.url;
                            return (
                              <button
                                key={`backdrop-${idx}-${img.url}`}
                                type="button"
                                onClick={() => setCustomBackdrop(img.url)}
                                className={`group relative rounded-xl overflow-hidden aspect-video border-2 transition-all cursor-pointer text-left ${
                                  isSelected 
                                    ? "border-violet-500 ring-2 ring-violet-500/50 shadow-lg scale-[0.98]" 
                                    : "border-white/10 hover:border-violet-500/40 opacity-80 hover:opacity-100"
                                }`}
                              >
                                <img 
                                  src={img.url} 
                                  alt={`Backdrop ${idx}`} 
                                  className="w-full h-full object-cover" 
                                  loading="lazy"
                                />
                                {isSelected && (
                                  <div className="absolute top-1.5 right-1.5 bg-violet-600 text-white p-1 rounded-full shadow-md">
                                    <Check className="w-3 h-3" />
                                  </div>
                                )}
                                <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent p-1.5 flex items-center justify-between text-[10px] text-white/90">
                                  <span className="font-semibold uppercase tracking-wider">Fanart</span>
                                  {img.likes !== undefined && img.likes > 0 && (
                                    <span className="flex items-center gap-0.5 text-white/70">
                                      <ThumbsUp className="w-2.5 h-2.5" />
                                      {img.likes}
                                    </span>
                                  )}
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-white/[0.08] flex items-center justify-between shrink-0 bg-white/[0.02]">
          <div className="flex items-center gap-3">
            {customPoster && (
              <span className="text-[11px] text-emerald-400 font-medium flex items-center gap-1">
                <Check className="w-3.5 h-3.5" /> Poster ready
              </span>
            )}
            {customBackdrop && (
              <span className="text-[11px] text-emerald-400 font-medium flex items-center gap-1">
                <Check className="w-3.5 h-3.5" /> Backdrop ready
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button 
              type="button"
              onClick={(e) => { e.preventDefault(); onClose(); }}
              className="px-4 py-2 text-xs font-medium text-white/60 hover:text-white transition-colors rounded-xl hover:bg-white/[0.06]"
              disabled={isSaving}
            >
              Cancel
            </button>
            <button 
              type="button"
              onClick={(e) => { e.preventDefault(); handleSave(); }}
              disabled={isSaving || !customTitle.trim()}
              className="flex items-center gap-2 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white px-5 py-2 rounded-xl font-medium text-xs transition-all disabled:opacity-50 shadow-lg shadow-violet-500/20"
            >
              {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
              Save Changes
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
