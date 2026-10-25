"use client";

interface SyncOverlayProps {
  visible: boolean;
  waitingMembers?: string[];
}

export default function SyncOverlay({ visible, waitingMembers }: SyncOverlayProps) {
  if (!visible) return null;

  const isWaitingForOthers = waitingMembers && waitingMembers.length > 0;

  return (
    <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/60 backdrop-blur-md pointer-events-none animate-in fade-in duration-200">
      <div className="glass-md p-6 rounded-3xl flex flex-col items-center gap-3.5 max-w-sm text-center shadow-2xl border border-white/20">
        <div className="w-10 h-10 border-[3px] border-white/20 border-t-white rounded-full animate-spin shadow-lg" />
        <div>
          <span className="text-white text-sm font-bold tracking-tight block">
            {isWaitingForOthers ? "Waiting for group to buffer..." : "Synchronizing Playback..."}
          </span>
          <p className="text-white/50 text-xs mt-0.5">
            Matching audio & video timeline across peers
          </p>
        </div>

        {isWaitingForOthers && (
          <div className="flex flex-wrap justify-center gap-1.5 mt-1">
            {waitingMembers.map((name, index) => (
              <span
                key={`${name}-${index}`}
                className="glass-md rounded-full text-white/80 text-[11px] font-medium px-2.5 py-0.5"
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
