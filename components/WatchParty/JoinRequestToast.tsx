"use client";

import { useEffect, useState } from "react";
import { Check, X, UserPlus } from "lucide-react";

export interface JoinRequest {
  requestId: string;
  guestName: string;
  timestamp: number;
}

interface JoinRequestToastProps {
  requests: JoinRequest[];
  onApprove: (requestId: string) => void;
  onDecline: (requestId: string) => void;
}

const TIMEOUT_MS = 30000;

function SingleToast({
  request,
  onApprove,
  onDecline,
}: {
  request: JoinRequest;
  onApprove: (requestId: string) => void;
  onDecline: (requestId: string) => void;
}) {
  const [progress, setProgress] = useState(100);
  const [visible, setVisible] = useState(false);

  // Slide-in animation
  useEffect(() => {
    const raf = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(raf);
  }, []);

  // Countdown progress bar
  useEffect(() => {
    const elapsed = Date.now() - request.timestamp;
    const remaining = Math.max(0, TIMEOUT_MS - elapsed);
    const startPct = (remaining / TIMEOUT_MS) * 100;
    setProgress(startPct);

    let animFrame: number;
    const animate = () => {
      const now = Date.now();
      const e = now - request.timestamp;
      const pct = Math.max(0, ((TIMEOUT_MS - e) / TIMEOUT_MS) * 100);
      setProgress(pct);
      if (pct > 0) {
        animFrame = requestAnimationFrame(animate);
      }
    };
    animFrame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animFrame);
  }, [request.timestamp]);

  return (
    <div
      className={`
        relative overflow-hidden
        glass-md border border-white/20
        rounded-2xl shadow-2xl shadow-black/70
        transition-all duration-300 ease-out
        ${visible ? "translate-x-0 opacity-100" : "translate-x-full opacity-0"}
      `}
      style={{ width: 310 }}
    >
      {/* Content */}
      <div className="p-4">
        <div className="flex items-start gap-3">
          {/* Avatar */}
          <div className="w-9 h-9 rounded-full glass-md flex items-center justify-center shrink-0 mt-0.5">
            <UserPlus className="w-4 h-4 text-violet-300" />
          </div>

          <div className="flex-1 min-w-0">
            <p className="text-white text-sm font-bold truncate">
              {request.guestName}
            </p>
            <p className="text-white/50 text-xs mt-0.5">
              knocking to join watch party
            </p>

            {/* Action buttons */}
            <div className="flex gap-2 mt-3">
              <button
                onClick={() => onApprove(request.requestId)}
                className="flex-1 flex items-center justify-center gap-1.5 bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-bold py-1.5 px-3 !rounded-full transition-all shadow-md active:scale-95"
              >
                <Check className="w-3.5 h-3.5 stroke-[3]" />
                Approve
              </button>
              <button
                onClick={() => onDecline(request.requestId)}
                className="flex-1 flex items-center justify-center gap-1.5 glass-md hover:bg-white/15 text-white/70 hover:text-white text-xs font-semibold py-1.5 px-3 !rounded-full transition-all active:scale-95"
              >
                <X className="w-3.5 h-3.5" />
                Decline
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Countdown progress bar */}
      <div className="h-1 bg-white/10">
        <div
          className="h-full bg-violet-400/80 transition-none"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}

export default function JoinRequestToast({
  requests,
  onApprove,
  onDecline,
}: JoinRequestToastProps) {
  if (requests.length === 0) return null;

  return (
    <div className="absolute top-20 right-6 z-50 flex flex-col gap-2.5 pointer-events-auto">
      {requests.map((req) => (
        <SingleToast
          key={req.requestId}
          request={req}
          onApprove={onApprove}
          onDecline={onDecline}
        />
      ))}
    </div>
  );
}
