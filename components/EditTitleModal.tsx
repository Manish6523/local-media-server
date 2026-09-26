"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { X, Loader2, Sparkles, UploadCloud } from "lucide-react";

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

interface ImageInputProps {
  label: string;
  value: string;
  onChange: (val: string) => void;
  placeholder: string;
}

function ImageInput({ label, value, onChange, placeholder }: ImageInputProps) {
  const [isDragging, setIsDragging] = useState(false);
  const isBase64 = value.startsWith('data:image/');

  return (
    <div className="space-y-2 pt-2">
      <label className="text-xs font-medium text-white/50 block">{label}</label>
      <div 
        className={`relative w-full glass rounded-xl overflow-hidden transition-all border ${isDragging ? 'border-violet-500 bg-violet-500/10' : 'border-transparent focus-within:border-violet-500/30'}`}
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragging(false);
          const file = e.dataTransfer.files?.[0];
          if (file && file.type.startsWith("image/")) {
            const reader = new FileReader();
            reader.onload = (event) => {
              if (event.target?.result) {
                onChange(event.target.result as string);
              }
            };
            reader.readAsDataURL(file);
          }
        }}
      >
        <div className="flex items-center">
          <input 
            type="text" 
            onPaste={(e) => {
              const items = e.clipboardData?.items;
              if (items) {
                for (let i = 0; i < items.length; i++) {
                  if (items[i].type.indexOf("image") !== -1) {
                    e.preventDefault();
                    const file = items[i].getAsFile();
                    if (file) {
                      const reader = new FileReader();
                      reader.onload = (event) => {
                        if (event.target?.result) {
                          onChange(event.target.result as string);
                        }
                      };
                      reader.readAsDataURL(file);
                    }
                    return;
                  }
                }
              }
            }}
            value={isBase64 ? 'Local image selected' : value}
            onChange={(e) => {
              if (e.target.value === '') {
                onChange("");
              } else if (!isBase64) {
                onChange(e.target.value);
              }
            }}
            className={`w-full bg-transparent px-4 py-3 text-white text-sm focus:outline-none transition-colors ${isBase64 ? 'text-violet-400 font-medium cursor-default' : ''}`}
            placeholder={placeholder}
            readOnly={isBase64}
          />
          {isBase64 ? (
            <button
              onClick={(e) => { e.preventDefault(); onChange(""); }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white p-1 rounded-lg hover:bg-white/10"
              title="Remove image"
            >
              <X className="w-4 h-4" />
            </button>
          ) : (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 pointer-events-none flex items-center gap-1.5">
              <UploadCloud className="w-4 h-4" />
              <span className="text-[10px] uppercase font-bold tracking-wider">Drop</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function EditTitleModal({ media, onClose }: EditTitleModalProps) {
  const [customTitle, setCustomTitle] = useState(media.title);
  const [customPoster, setCustomPoster] = useState("");
  const [customBackdrop, setCustomBackdrop] = useState("");
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
        body: JSON.stringify({ 
          title: customTitle.trim(),
          customPoster: customPoster.trim() || undefined,
          customBackdrop: customBackdrop.trim() || undefined
        })
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
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 cursor-default animate-in fade-in duration-200">
      <div 
        className="glass-heavy w-full max-w-md max-h-[90vh] flex flex-col overflow-hidden shadow-2xl relative animate-in zoom-in-95 duration-200"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-5 border-b border-white/[0.06] shrink-0">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-violet-400" />
            Edit Media Info
          </h2>
          <button 
            onClick={(e) => { e.preventDefault(); onClose(); }}
            className="text-white/40 hover:text-white transition-colors p-1.5 rounded-lg hover:bg-white/[0.06]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-5 overflow-y-auto">
          <div className="space-y-1.5">
            <p className="text-xs text-white/40 font-medium">Filename</p>
            <p className="text-xs text-white/60 font-mono break-all glass rounded-lg p-3">
              {media.filename}
            </p>
          </div>

          <div className="space-y-3">
            <label className="text-xs font-medium text-white/50 block">
              Title Suggestions
            </label>
            <div className="grid gap-2">
              <button 
                onClick={(e) => { e.preventDefault(); setCustomTitle(parsedSuggestion); }}
                className="text-left px-4 py-3 rounded-xl glass hover:border-violet-500/20 text-white text-sm transition-all"
              >
                <span className="text-violet-400 text-[10px] font-semibold uppercase block mb-1">Parsed from Filename</span>
                <span className="text-white/80">{parsedSuggestion || "N/A"}</span>
              </button>
              
              <button 
                onClick={(e) => { e.preventDefault(); setCustomTitle(media.title); }}
                className="text-left px-4 py-3 rounded-xl glass hover:border-violet-500/20 text-white text-sm transition-all"
              >
                <span className="text-white/30 text-[10px] font-semibold uppercase block mb-1">Current (OMDB)</span>
                <span className="text-white/80">{media.title}</span>
              </button>
            </div>
          </div>

          <div className="space-y-2 pt-2">
            <label className="text-xs font-medium text-white/50 block">
              Custom Title
            </label>
            <input 
              type="text" 
              value={customTitle}
              onChange={(e) => setCustomTitle(e.target.value)}
              className="w-full glass rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-violet-500/30 transition-colors"
              placeholder="Type correct title..."
            />
          </div>

          <ImageInput
            label="Custom Poster URL or Drop Image"
            value={customPoster}
            onChange={setCustomPoster}
            placeholder="URL or drag & drop image here"
          />

          <ImageInput
            label="Custom Backdrop URL or Drop Image"
            value={customBackdrop}
            onChange={setCustomBackdrop}
            placeholder="URL or drag & drop image here"
          />
        </div>

        <div className="p-5 border-t border-white/[0.06] flex justify-end gap-3 shrink-0">
          <button 
            onClick={(e) => { e.preventDefault(); onClose(); }}
            className="px-4 py-2.5 text-sm font-medium text-white/50 hover:text-white transition-colors rounded-lg hover:bg-white/[0.04]"
            disabled={isSaving}
          >
            Cancel
          </button>
          <button 
            onClick={(e) => { e.preventDefault(); handleSave(); }}
            disabled={isSaving || !customTitle.trim()}
            className="flex items-center gap-2 bg-gradient-to-r from-violet-500 to-violet-600 hover:from-violet-400 hover:to-violet-500 text-white px-6 py-2.5 rounded-xl font-medium text-sm transition-all disabled:opacity-50 shadow-lg shadow-violet-500/20"
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
