"use client";

import { Loader2 } from "lucide-react";

interface SyncOverlayProps {
  visible: boolean;
  waitingMembers?: string[];
}

export default function SyncOverlay({ visible, waitingMembers }: SyncOverlayProps) {
  if (!visible) return null;

  const isWaitingForOthers = waitingMembers && waitingMembers.length > 0;

  return (
    <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/60 backdrop-blur-sm pointer-events-none animate-in fade-in duration-200">
      <div className="flex flex-col items-center gap-3 max-w-xs text-center">
        <Loader2 className="w-10 h-10 text-white animate-spin" />
        <span className="text-white text-sm font-medium tracking-wide">
          {isWaitingForOthers ? "Waiting for everyone to buffer..." : "Syncing..."}
        </span>
        {isWaitingForOthers && (
          <div className="flex flex-wrap justify-center gap-2 mt-1">
            {waitingMembers.map((name, index) => (
              <span
                key={`${name}-${index}`}
                className="bg-white/10 text-white/70 text-xs px-2.5 py-1 rounded-full"
              >
                {name}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
