"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Film, Play } from "lucide-react";
import HoverPreview from "./HoverPreview";

export interface PreviewFile { id: number; mediaId: number | null; filename: string }

export function ReviewPreviewButton({ file }: { file: PreviewFile }) {
  const anchor = useRef<HTMLButtonElement>(null);
  const [position, setPosition] = useState<{ left: number; top: number; width: number } | null>(null);

  function open() {
    const rect = anchor.current?.getBoundingClientRect();
    if (!rect) return;
    const width = Math.max(160, Math.min(520, window.innerWidth - 32, (window.innerHeight - 96) * 16 / 9));
    const height = width * 9 / 16 + 48;
    setPosition({ width,
      left: Math.max(16, Math.min(rect.left, window.innerWidth - width - 16)),
      top: Math.max(16, Math.min(rect.top - (height - rect.height) / 2, window.innerHeight - height - 16)),
    });
  }

  useEffect(() => {
    if (!position) return;
    const close = () => setPosition(null);
    const escape = (event: KeyboardEvent) => { if (event.key === "Escape") close(); };
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    window.addEventListener("keydown", escape);
    return () => {
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
      window.removeEventListener("keydown", escape);
    };
  }, [position]);

  return <>
    <button ref={anchor} type="button" onMouseEnter={() => { if (window.matchMedia("(hover: hover)").matches) open(); }} onMouseLeave={() => setPosition(null)} onFocus={event => { if (event.currentTarget.matches(":focus-visible")) open(); }} onBlur={() => setPosition(null)}
      onClick={() => { if (!position) open(); else if (window.matchMedia("(hover: none)").matches) setPosition(null); }}
      aria-label={`Preview ${file.filename}`} aria-expanded={position !== null}
      className="group relative flex h-16 w-28 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-white/10 bg-black/40 transition hover:border-red-400/60 focus-visible:outline-2 focus-visible:outline-red-400">
      <Film className="text-white/20" size={28} />
      <Play size={20} className="absolute fill-white text-white drop-shadow-lg" />
      <span className="absolute bottom-1 right-2 text-[10px] font-bold text-white/70">Preview</span>
    </button>
    {position && createPortal(
      <div style={position} className="pointer-events-none fixed z-[250] overflow-hidden rounded-2xl border border-white/20 bg-[#111114] shadow-[0_24px_80px_rgba(0,0,0,0.8)] animate-in fade-in zoom-in-95 duration-200 motion-reduce:animate-none">
        <div className="relative flex aspect-video items-center justify-center overflow-hidden bg-black">
          <Film size={48} className="text-white/20" />
          {file.mediaId !== null ? <HoverPreview mediaId={file.mediaId} runtime={null} isHovered /> : <span className="absolute bottom-5 text-sm text-white/50">Scan this file to enable preview.</span>}
          <span className="absolute left-3 top-3 z-30 rounded-full bg-black/60 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-white/70">File preview · muted</span>
        </div>
        <div className="flex h-12 items-center gap-3 px-4"><Play size={14} className="shrink-0 text-red-400" /><p className="truncate text-sm text-white/80">{file.filename}</p></div>
      </div>, document.body,
    )}
  </>;
}
