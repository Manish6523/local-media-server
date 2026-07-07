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
        bg-black/85 backdrop-blur-xl border border-white/15
        rounded-xl shadow-2xl shadow-black/50
        transition-all duration-300 ease-out
        ${visible ? "translate-x-0 opacity-100" : "translate-x-full opacity-0"}
      `}
      style={{ width: 300 }}
    >
      {/* Content */}
      <div className="p-3.5">
        <div className="flex items-start gap-3">
          {/* Avatar */}
          <div className="w-9 h-9 rounded-full bg-[#E50914]/20 flex items-center justify-center flex-shrink-0 mt-0.5">
            <UserPlus className="w-4 h-4 text-[#E50914]" />
          </div>

          <div className="flex-1 min-w-0">
            <p className="text-white text-sm font-medium truncate">
              {request.guestName}
            </p>
            <p className="text-white/40 text-xs mt-0.5">
              wants to join the party
            </p>

            {/* Action buttons */}
            <div className="flex gap-2 mt-2.5">
              <button
                onClick={() => onApprove(request.requestId)}
                className="flex-1 flex items-center justify-center gap-1.5 bg-[#E50914] hover:bg-[#f6121d] text-white text-xs font-medium py-1.5 px-3 rounded-lg transition-colors"
              >
                <Check className="w-3.5 h-3.5" />
                Let in
              </button>
              <button
                onClick={() => onDecline(request.requestId)}
                className="flex-1 flex items-center justify-center gap-1.5 bg-white/10 hover:bg-white/20 text-white/70 hover:text-white text-xs font-medium py-1.5 px-3 rounded-lg transition-colors"
              >
                <X className="w-3.5 h-3.5" />
                Decline
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Countdown progress bar */}
      <div className="h-0.5 bg-white/5">
        <div
          className="h-full bg-[#E50914]/60 transition-none"
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
    <div className="absolute top-4 right-4 z-50 flex flex-col gap-2.5 pointer-events-auto">
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
