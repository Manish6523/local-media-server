"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { X, Folder, ChevronRight, CornerLeftUp, Loader2, HardDrive, Home } from "lucide-react";

interface FolderItem {
  name: string;
  path: string;
  isHidden: boolean;
}

interface BrowseResponse {
  path: string;
  parentPath: string | null;
  items: FolderItem[];
  platform: string;
  error?: string;
}

interface FolderBrowserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (path: string) => void;
  initialPath?: string;
}

export default function FolderBrowserModal({ isOpen, onClose, onSelect, initialPath }: FolderBrowserModalProps) {
  const [currentPath, setCurrentPath] = useState<string>("");
  const [parentPath, setParentPath] = useState<string | null>(null);
  const [items, setItems] = useState<FolderItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [platform, setPlatform] = useState<string>("linux");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (isOpen) {
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
      setItems(data.items);
      setPlatform(data.platform);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="bg-[#1a1a1a] border border-white/10 w-full max-w-2xl rounded-xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/10 bg-[#141414]">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <HardDrive className="w-5 h-5 text-zinc-400" />
            Select Folder
          </h2>
          <button 
            onClick={onClose}
            className="p-1 text-zinc-400 hover:text-white hover:bg-white/10 rounded transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Path Breadcrumbs / Input */}
        <div className="p-4 bg-zinc-900 border-b border-white/5">
          <div className="flex items-center gap-2 text-sm text-zinc-400 font-mono bg-black/40 p-2 rounded border border-white/10 overflow-x-auto whitespace-nowrap scrollbar-thin">
            {currentPath || "Loading..."}
          </div>
          
          {/* Quick jump buttons */}
          <div className="flex items-center gap-2 mt-3 flex-wrap">
            {platform === "win32" ? (
              <>
                <button onClick={() => fetchDirectory("C:\\")} className="text-xs bg-white/5 hover:bg-white/10 text-white/70 px-2.5 py-1 rounded border border-white/10 transition-colors">C:\</button>
                <button onClick={() => fetchDirectory("D:\\")} className="text-xs bg-white/5 hover:bg-white/10 text-white/70 px-2.5 py-1 rounded border border-white/10 transition-colors">D:\</button>
                <button onClick={() => fetchDirectory("")} className="text-xs flex items-center gap-1 bg-white/5 hover:bg-white/10 text-white/70 px-2.5 py-1 rounded border border-white/10 transition-colors"><Home className="w-3 h-3" /> Home</button>
              </>
            ) : (
              <>
                <button onClick={() => fetchDirectory("/")} className="text-xs flex items-center gap-1 bg-white/5 hover:bg-white/10 text-white/70 px-2.5 py-1 rounded border border-white/10 transition-colors"><HardDrive className="w-3 h-3" /> Root (/)</button>
                <button onClick={() => fetchDirectory("")} className="text-xs flex items-center gap-1 bg-white/5 hover:bg-white/10 text-white/70 px-2.5 py-1 rounded border border-white/10 transition-colors"><Home className="w-3 h-3" /> Home</button>
                <button onClick={() => fetchDirectory("/run/media")} className="text-xs flex items-center gap-1 bg-white/5 hover:bg-white/10 text-white/70 px-2.5 py-1 rounded border border-white/10 transition-colors"><HardDrive className="w-3 h-3" /> Media</button>
              </>
            )}
          </div>
        </div>

        {/* Browser Body */}
        <div className="h-96 overflow-y-auto scrollbar-thin p-2">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-full text-zinc-500 gap-3">
              <Loader2 className="w-8 h-8 animate-spin" />
              <span>Loading directory...</span>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center h-full text-red-400 gap-2 text-center p-6">
              <p className="font-medium">Error accessing directory</p>
              <p className="text-sm opacity-80">{error}</p>
              <button 
                onClick={() => parentPath ? fetchDirectory(parentPath) : fetchDirectory("")}
                className="mt-4 bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded text-sm transition-colors"
              >
                Go Back
              </button>
            </div>
          ) : (
            <div className="space-y-0.5">
              {/* Up button */}
              {parentPath && (
                <button
                  onClick={() => fetchDirectory(parentPath)}
                  className="w-full flex items-center gap-3 p-2.5 hover:bg-white/5 rounded text-left transition-colors group"
                >
                  <CornerLeftUp className="w-5 h-5 text-zinc-500 group-hover:text-white" />
                  <span className="text-zinc-300 font-medium group-hover:text-white">.. (Parent Directory)</span>
                </button>
              )}
              
              {/* Folders */}
              {items.length === 0 ? (
                <div className="text-center text-zinc-500 py-8 text-sm">
                  This folder is empty.
                </div>
              ) : (
                items.map((item) => (
                  <button
                    key={item.path}
                    onClick={() => fetchDirectory(item.path)}
                    className="w-full flex items-center justify-between p-2.5 hover:bg-white/5 rounded text-left transition-colors group"
                  >
                    <div className="flex items-center gap-3 overflow-hidden">
                      <Folder className={`w-5 h-5 shrink-0 ${item.isHidden ? "text-zinc-600" : "text-[#E50914]"}`} fill="currentColor" fillOpacity={0.2} />
                      <span className={`truncate ${item.isHidden ? "text-zinc-500" : "text-zinc-200"} group-hover:text-white`}>
                        {item.name}
                      </span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-zinc-600 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                  </button>
                ))
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-white/10 bg-[#141414] flex justify-end gap-3">
          <button 
            onClick={onClose}
            className="px-5 py-2.5 rounded-lg text-sm font-medium text-white/70 hover:text-white hover:bg-white/10 transition-colors"
          >
            Cancel
          </button>
          <button 
            onClick={() => onSelect(currentPath)}
            disabled={loading || !!error}
            className="px-5 py-2.5 rounded-lg text-sm font-medium bg-[#E50914] text-white hover:bg-[#f6121d] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Select This Folder
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
