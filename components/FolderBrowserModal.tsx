"use client";

import { useState, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import {
  X, Folder, ChevronRight, CornerLeftUp, Loader2, HardDrive,
  Home, Film, File, Search, CheckCircle2, FolderCheck, Sparkles, Filter
} from "lucide-react";

export interface FolderItem {
  name: string;
  path: string;
  isHidden: boolean;
}

export interface FileItem {
  name: string;
  path: string;
  isHidden: boolean;
  isVideo: boolean;
  extension: string;
  sizeBytes: number;
}

interface BrowseResponse {
  path: string;
  parentPath: string | null;
  items: FolderItem[];
  files?: FileItem[];
  videoCount?: number;
  totalFiles?: number;
  folderCount?: number;
  platform: string;
  error?: string;
}

interface FolderBrowserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (path: string) => void;
  initialPath?: string;
}

function formatBytes(bytes: number): string {
  if (!bytes || bytes <= 0) return "";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  return `${(bytes / Math.pow(1024, i)).toFixed(i >= 2 ? 1 : 0)} ${units[i]}`;
}

export default function FolderBrowserModal({ isOpen, onClose, onSelect, initialPath }: FolderBrowserModalProps) {
  const [currentPath, setCurrentPath] = useState<string>("");
  const [parentPath, setParentPath] = useState<string | null>(null);
  const [folders, setFolders] = useState<FolderItem[]>([]);
  const [files, setFiles] = useState<FileItem[]>([]);
  const [videoCount, setVideoCount] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [platform, setPlatform] = useState<string>("win32");
  const [mounted, setMounted] = useState(false);
  const [filterQuery, setFilterQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<"all" | "videos" | "folders">("all");

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (isOpen) {
      setFilterQuery("");
      fetchDirectory(initialPath || "");
    }
  }, [isOpen, initialPath]);

  const fetchDirectory = async (targetPath: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/browse-fs?path=${encodeURIComponent(targetPath)}`);
      const data: BrowseResponse = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to load directory");
      }

      setCurrentPath(data.path);
      setParentPath(data.parentPath);
      setFolders(data.items || []);
      setFiles(data.files || []);
      setVideoCount(data.videoCount ?? (data.files?.filter(f => f.isVideo).length || 0));
      setPlatform(data.platform || "win32");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  const filteredFolders = useMemo(() => {
    if (activeFilter === "videos") return [];
    if (!filterQuery.trim()) return folders;
    return folders.filter(f => f.name.toLowerCase().includes(filterQuery.toLowerCase()));
  }, [folders, filterQuery, activeFilter]);

  const filteredFiles = useMemo(() => {
    if (activeFilter === "folders") return [];
    let list = files;
    if (activeFilter === "videos") {
      list = list.filter(f => f.isVideo);
    }
    if (filterQuery.trim()) {
      list = list.filter(f => f.name.toLowerCase().includes(filterQuery.toLowerCase()));
    }
    return list;
  }, [files, filterQuery, activeFilter]);

  if (!isOpen || !mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-3 sm:p-5 backdrop-blur-xl bg-black/60 animate-in fade-in duration-200">
      <div
        className="w-full max-w-3xl rounded-2xl flex flex-col max-h-[88vh] overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200"
        style={{
          background: "linear-gradient(135deg, rgba(28, 25, 45, 0.95), rgba(16, 14, 28, 0.98))",
          border: "1px solid rgba(255, 255, 255, 0.12)",
          boxShadow: "0 25px 60px -15px rgba(0, 0, 0, 0.7), 0 0 30px rgba(139, 92, 246, 0.15)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 bg-white/[0.02]">
          <div className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{
                background: "linear-gradient(135deg, rgba(139,92,246,0.25), rgba(6,182,212,0.25))",
                border: "1px solid rgba(139,92,246,0.35)",
              }}
            >
              <FolderCheck className="w-5 h-5 text-violet-300" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white tracking-wide flex items-center gap-2">
                Select Storage Folder
              </h2>
              <p className="text-xs text-white/50">
                Browse and verify video files inside before selecting
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-white/50 hover:text-white hover:bg-white/10 rounded-xl transition-all cursor-pointer"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Path Bar & Quick Jumps */}
        <div className="px-5 py-3.5 bg-black/40 border-b border-white/5 space-y-2.5">
          {/* Current Path */}
          <div className="flex items-center gap-2 text-xs sm:text-sm text-white/90 font-mono bg-white/[0.04] px-3 py-2 rounded-xl border border-white/10 overflow-x-auto whitespace-nowrap scrollbar-thin">
            <span className="text-violet-400 font-bold shrink-0">Path:</span>
            <span className="truncate">{currentPath || "Loading directory..."}</span>
          </div>

          {/* Quick jump drives & search bar */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[11px] uppercase tracking-wider text-white/40 font-semibold mr-1">Quick:</span>
              {platform === "win32" ? (
                <>
                  <button
                    onClick={() => fetchDirectory("C:\\")}
                    className="text-xs bg-white/5 hover:bg-violet-500/20 hover:border-violet-500/40 text-white/80 px-2.5 py-1 rounded-lg border border-white/10 transition-all font-mono"
                  >
                    C:\
                  </button>
                  <button
                    onClick={() => fetchDirectory("D:\\")}
                    className="text-xs bg-white/5 hover:bg-violet-500/20 hover:border-violet-500/40 text-white/80 px-2.5 py-1 rounded-lg border border-white/10 transition-all font-mono"
                  >
                    D:\
                  </button>
                  <button
                    onClick={() => fetchDirectory("")}
                    className="text-xs flex items-center gap-1 bg-white/5 hover:bg-violet-500/20 hover:border-violet-500/40 text-white/80 px-2.5 py-1 rounded-lg border border-white/10 transition-all"
                  >
                    <Home className="w-3 h-3 text-violet-400" /> Home
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => fetchDirectory("/")}
                    className="text-xs flex items-center gap-1 bg-white/5 hover:bg-violet-500/20 text-white/80 px-2.5 py-1 rounded-lg border border-white/10 transition-all"
                  >
                    <HardDrive className="w-3 h-3" /> Root (/)
                  </button>
                  <button
                    onClick={() => fetchDirectory("")}
                    className="text-xs flex items-center gap-1 bg-white/5 hover:bg-violet-500/20 text-white/80 px-2.5 py-1 rounded-lg border border-white/10 transition-all"
                  >
                    <Home className="w-3 h-3 text-violet-400" /> Home
                  </button>
                  <button
                    onClick={() => fetchDirectory("/run/media")}
                    className="text-xs flex items-center gap-1 bg-white/5 hover:bg-violet-500/20 text-white/80 px-2.5 py-1 rounded-lg border border-white/10 transition-all"
                  >
                    <HardDrive className="w-3 h-3" /> Media
                  </button>
                </>
              )}
            </div>

            {/* Filter / Search input */}
            <div className="relative min-w-[160px] sm:w-48">
              <Search className="w-3.5 h-3.5 text-white/30 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Filter current folder..."
                value={filterQuery}
                onChange={(e) => setFilterQuery(e.target.value)}
                className="w-full bg-white/[0.04] border border-white/10 rounded-lg pl-8 pr-2.5 py-1 text-xs text-white placeholder:text-white/30 focus:outline-none focus:border-violet-400/50"
              />
            </div>
          </div>
        </div>

        {/* Content Status Bar */}
        <div className="px-5 py-2.5 bg-white/[0.015] border-b border-white/5 flex flex-wrap items-center justify-between gap-2">
          {/* Stats counts */}
          <div className="flex items-center gap-3 text-xs">
            <span className="text-white/60 flex items-center gap-1.5">
              <Folder className="w-3.5 h-3.5 text-violet-400" />
              <strong className="text-white">{folders.length}</strong> folders
            </span>
            <span className="text-white/30">•</span>
            <span className="text-white/60 flex items-center gap-1.5">
              <Film className="w-3.5 h-3.5 text-emerald-400" />
              <strong className="text-emerald-400">{videoCount}</strong> video files
            </span>
            {files.length > 0 && (
              <>
                <span className="text-white/30">•</span>
                <span className="text-white/40 text-[11px]">
                  {files.length} total files
                </span>
              </>
            )}
          </div>

          {/* Filter tabs */}
          <div className="flex items-center gap-1 bg-white/[0.04] p-0.5 rounded-lg border border-white/5">
            <button
              onClick={() => setActiveFilter("all")}
              className={`text-[11px] px-2 py-0.5 rounded-md font-medium transition-all ${
                activeFilter === "all"
                  ? "bg-violet-600 text-white shadow-sm"
                  : "text-white/50 hover:text-white"
              }`}
            >
              All ({folders.length + files.length})
            </button>
            <button
              onClick={() => setActiveFilter("videos")}
              className={`text-[11px] px-2 py-0.5 rounded-md font-medium transition-all ${
                activeFilter === "videos"
                  ? "bg-emerald-600 text-white shadow-sm"
                  : "text-white/50 hover:text-white"
              }`}
            >
              Videos ({videoCount})
            </button>
            <button
              onClick={() => setActiveFilter("folders")}
              className={`text-[11px] px-2 py-0.5 rounded-md font-medium transition-all ${
                activeFilter === "folders"
                  ? "bg-violet-600 text-white shadow-sm"
                  : "text-white/50 hover:text-white"
              }`}
            >
              Folders ({folders.length})
            </button>
          </div>
        </div>

        {/* Video Detected Confirmation Notice */}
        {videoCount > 0 && (
          <div className="px-5 py-2 bg-emerald-500/10 border-b border-emerald-500/20 flex items-center gap-2 text-xs text-emerald-300">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>
              <strong>{videoCount} video files</strong> found inside this directory. This folder is ready for your media library.
            </span>
          </div>
        )}

        {/* Browser Body */}
        <div className="flex-1 overflow-y-auto scrollbar-thin p-3 sm:p-4 min-h-[300px] max-h-[420px] space-y-4">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 text-white/50 gap-3">
              <Loader2 className="w-8 h-8 animate-spin text-violet-400" />
              <span className="text-sm">Reading directory contents...</span>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-16 text-red-400 gap-2 text-center p-6">
              <p className="font-semibold text-sm">Error accessing directory</p>
              <p className="text-xs text-white/50 max-w-md">{error}</p>
              <button
                onClick={() => (parentPath ? fetchDirectory(parentPath) : fetchDirectory(""))}
                className="mt-4 bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-xl text-xs font-semibold transition-all"
              >
                Go Back
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Parent Directory Link */}
              {parentPath && (
                <button
                  onClick={() => fetchDirectory(parentPath)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 bg-white/[0.02] hover:bg-white/[0.08] rounded-xl text-left transition-all group border border-white/5 hover:border-white/10"
                >
                  <CornerLeftUp className="w-4 h-4 text-violet-400 group-hover:text-white transition-colors" />
                  <span className="text-xs sm:text-sm text-white/70 font-medium group-hover:text-white">
                    .. (Parent Directory)
                  </span>
                </button>
              )}

              {/* Subfolders List */}
              {filteredFolders.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-2 px-1">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-white/40">
                      Folders ({filteredFolders.length})
                    </span>
                    <span className="text-[10px] text-white/30">— Click to enter</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                    {filteredFolders.map((item) => (
                      <button
                        key={item.path}
                        onClick={() => fetchDirectory(item.path)}
                        className="flex items-center justify-between p-2.5 bg-white/[0.025] hover:bg-violet-500/15 border border-white/5 hover:border-violet-500/30 rounded-xl text-left transition-all group cursor-pointer"
                      >
                        <div className="flex items-center gap-2.5 overflow-hidden">
                          <div className="w-7 h-7 rounded-lg bg-violet-500/10 flex items-center justify-center shrink-0 group-hover:bg-violet-500/20">
                            <Folder
                              className={`w-4 h-4 ${
                                item.isHidden ? "text-white/25" : "text-violet-400"
                              }`}
                              fill="currentColor"
                              fillOpacity={0.25}
                            />
                          </div>
                          <span
                            className={`text-xs sm:text-sm truncate font-medium ${
                              item.isHidden ? "text-white/40" : "text-white/80"
                            } group-hover:text-white`}
                          >
                            {item.name}
                          </span>
                        </div>
                        <ChevronRight className="w-4 h-4 text-white/20 group-hover:text-violet-300 transition-colors shrink-0 ml-1" />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Files in this folder (Crucial user request!) */}
              {filteredFiles.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-2 px-1">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-white/40">
                      Files Inside This Folder ({filteredFiles.length})
                    </span>
                    <span className="text-[10px] text-white/30">
                      {videoCount} playable media detected
                    </span>
                  </div>
                  <div className="space-y-1">
                    {filteredFiles.map((file) => (
                      <div
                        key={file.path}
                        className={`flex items-center justify-between p-2 rounded-lg border text-left transition-all ${
                          file.isVideo
                            ? "bg-emerald-500/[0.04] border-emerald-500/20 hover:border-emerald-500/40"
                            : "bg-white/[0.015] border-white/5 hover:border-white/10"
                        }`}
                      >
                        <div className="flex items-center gap-2.5 overflow-hidden min-w-0">
                          <div
                            className={`w-6 h-6 rounded-md flex items-center justify-center shrink-0 ${
                              file.isVideo
                                ? "bg-emerald-500/20 text-emerald-400"
                                : "bg-white/5 text-white/30"
                            }`}
                          >
                            {file.isVideo ? (
                              <Film className="w-3.5 h-3.5" />
                            ) : (
                              <File className="w-3.5 h-3.5" />
                            )}
                          </div>
                          <span
                            className={`text-xs truncate font-mono ${
                              file.isVideo ? "text-white/95 font-medium" : "text-white/60"
                            }`}
                            title={file.name}
                          >
                            {file.name}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0 ml-2">
                          {file.isVideo && (
                            <span className="text-[9px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                              {file.extension.replace(".", "") || "VIDEO"}
                            </span>
                          )}
                          {file.sizeBytes > 0 && (
                            <span className="text-[10px] text-white/40 font-mono">
                              {formatBytes(file.sizeBytes)}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Empty state */}
              {filteredFolders.length === 0 && filteredFiles.length === 0 && (
                <div className="text-center py-12 text-white/30 text-xs">
                  {filterQuery
                    ? `No folders or files matching "${filterQuery}"`
                    : "This folder contains no subfolders or files."}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 sm:p-5 border-t border-white/10 bg-white/[0.02] flex flex-col sm:flex-row items-center justify-between gap-3 rounded-b-2xl">
          <div className="text-xs text-white/50 text-center sm:text-left truncate max-w-full sm:max-w-[360px]">
            Selected Folder:{" "}
            <span className="text-white font-mono font-medium block sm:inline truncate">
              {currentPath || "None"}
            </span>
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
            <button
              onClick={onClose}
              className="flex-1 sm:flex-initial px-4 py-2 rounded-xl text-xs font-semibold text-white/60 hover:text-white hover:bg-white/10 transition-all cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={() => onSelect(currentPath)}
              disabled={loading || !!error || !currentPath}
              className="flex-1 sm:flex-initial px-5 py-2.5 rounded-xl text-xs font-bold bg-violet-600 hover:bg-violet-500 text-white shadow-[0_0_20px_rgba(139,92,246,0.35)] hover:shadow-[0_0_25px_rgba(139,92,246,0.5)] transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Select This Folder</span>
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
