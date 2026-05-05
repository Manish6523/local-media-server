"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { X, Loader2 } from "lucide-react";

interface MediaEntry {
  id: number;
  filename: string;
  title: string;
  type: string;
}

interface EditTitleModalProps {
  media: MediaEntry;
  onClose: () => void;
}

export default function EditTitleModal({ media, onClose }: EditTitleModalProps) {
  const [customTitle, setCustomTitle] = useState(media.title);
  const [isSaving, setIsSaving] = useState(false);
  const [mounted, setMounted] = useState(false);

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

  const handleSave = async () => {
    if (!customTitle.trim()) return;
    
    setIsSaving(true);
    try {
      const res = await fetch(`/api/media/${media.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: customTitle.trim() })
      });
      
      if (res.ok) {
        // Reload to show updated data
        window.location.reload();
      } else {
        alert("Failed to update title");
        setIsSaving(false);
      }
    } catch (err) {
      console.error(err);
      alert("Error saving title");
      setIsSaving(false);
    }
  };

  if (!mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 cursor-default">
      <div 
        className="bg-[#141414] border border-white/10 rounded-xl w-full max-w-md overflow-hidden shadow-2xl relative"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-5 border-b border-white/10">
          <h2 className="text-xl font-bold text-white">Edit Title</h2>
          <button 
            onClick={(e) => { e.preventDefault(); onClose(); }}
            className="text-white/50 hover:text-white transition-colors p-1"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-5">
          <div className="space-y-1">
            <p className="text-sm text-white/50">Filename</p>
            <p className="text-sm text-white font-mono break-all bg-black/50 p-2 rounded border border-white/5">
              {media.filename}
            </p>
          </div>

          <div className="space-y-3">
            <label className="text-sm font-medium text-white/80 block">
              Title Suggestions
            </label>
            <div className="grid gap-2">
              <button 
                onClick={(e) => { e.preventDefault(); setCustomTitle(parsedSuggestion); }}
                className="text-left px-4 py-2 rounded border border-white/10 hover:border-[#00E676] bg-white/5 hover:bg-[#00E676]/10 text-white text-sm transition-all"
              >
                <span className="text-[#00E676] text-xs font-bold uppercase block mb-0.5">Parsed from Filename</span>
                {parsedSuggestion || "N/A"}
              </button>
              
              <button 
                onClick={(e) => { e.preventDefault(); setCustomTitle(media.title); }}
                className="text-left px-4 py-2 rounded border border-white/10 hover:border-[#00E676] bg-white/5 hover:bg-[#00E676]/10 text-white text-sm transition-all"
              >
                <span className="text-white/50 text-xs font-bold uppercase block mb-0.5">Current (OMDB)</span>
                {media.title}
              </button>
            </div>
          </div>

          <div className="space-y-2 pt-2">
            <label className="text-sm font-medium text-white/80 block">
              Custom Title
            </label>
            <input 
              type="text" 
              value={customTitle}
              onChange={(e) => setCustomTitle(e.target.value)}
              className="w-full bg-black/50 border border-white/10 rounded px-4 py-2 text-white focus:outline-none focus:border-[#00E676]"
              placeholder="Type correct title..."
            />
          </div>
        </div>

        <div className="p-5 border-t border-white/10 flex justify-end gap-3 bg-black/20">
          <button 
            onClick={(e) => { e.preventDefault(); onClose(); }}
            className="px-4 py-2 text-sm font-medium text-white/70 hover:text-white transition-colors"
            disabled={isSaving}
          >
            Cancel
          </button>
          <button 
            onClick={(e) => { e.preventDefault(); handleSave(); }}
            disabled={isSaving || !customTitle.trim()}
            className="flex items-center gap-2 bg-[#00E676] hover:bg-[#00E676]/80 text-black px-6 py-2 rounded font-bold text-sm transition-colors disabled:opacity-50"
          >
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            Save & Refetch
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
