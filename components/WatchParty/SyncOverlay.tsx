"use client";

import { Loader2 } from "lucide-react";

export default function SyncOverlay({ visible }: { visible: boolean }) {
  if (!visible) return null;
  return (
    <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/60 backdrop-blur-sm pointer-events-none animate-in fade-in duration-200">
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="w-10 h-10 text-white animate-spin" />
        <span className="text-white text-sm font-medium tracking-wide">Syncing...</span>
      </div>
    </div>
  );
}
