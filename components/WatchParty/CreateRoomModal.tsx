"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { X, Copy, Check, Users, Loader2 } from "lucide-react";
import MembersList from "./MembersList";
import { useWatchParty } from "@/hooks/useWatchParty";

interface CreateRoomModalProps {
  isOpen: boolean;
  onClose: () => void;
  mediaId: number;
  mediaTitle: string;
  mediaPoster?: string | null;
  onStartWatching: (roomCode: string) => void;
}

export default function CreateRoomModal({
  isOpen, onClose, mediaId, mediaTitle, mediaPoster, onStartWatching,
}: CreateRoomModalProps) {
  const { createRoom, members, isConnected } = useWatchParty(isOpen); // connect only when modal opens
  const [step, setStep] = useState<1 | 2>(1);
  const [name, setName] = useState("");
  const [roomCode, setRoomCode] = useState("");
  const [creating, setCreating] = useState(false);
  const [copied, setCopied] = useState(false);

  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setStep(1);
      setName("");
      setRoomCode("");
      setCreating(false);
    }
  }, [isOpen]);

  if (!isOpen || !mounted) return null;

  const shareLink = typeof window !== "undefined"
    ? `${window.location.origin}/join/${roomCode}`
    : "";

  const handleCreate = async () => {
    if (!name.trim()) return;
    setCreating(true);
    const result = await createRoom(mediaId, name.trim());
    if (result.success && result.roomCode) {
      setRoomCode(result.roomCode);
      setStep(2);
      // Store name for the watch page
      sessionStorage.setItem("wp_name", name.trim());
      sessionStorage.setItem("wp_isHost", "true");
    }
    setCreating(false);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(shareLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const modal = (
    <div 
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
      onClick={(e) => { e.stopPropagation(); e.preventDefault(); onClose(); }}
    >
      <div 
        className="bg-black/60 backdrop-blur-2xl border border-white/10 w-full max-w-md rounded-2xl shadow-[0_0_80px_rgba(0,0,0,0.8)] overflow-hidden ring-1 ring-white/5 animate-in zoom-in-95 duration-200"
        onClick={(e) => { e.stopPropagation(); e.preventDefault(); }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-white/10">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <Users className="w-5 h-5 text-[#E50914]" />
            {step === 1 ? "Start a Watch Party" : "Room Ready! 🎉"}
          </h2>
          <button onClick={onClose} className="p-1 text-zinc-400 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-5">
          {step === 1 ? (
            <>
              <p className="text-white/50 text-sm">Enter your name so friends know who's hosting</p>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value.slice(0, 20))}
                onKeyDown={(e) => e.key === "Enter" && handleCreate()}
                placeholder="Your name"
                autoFocus
                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white text-sm focus:outline-none focus:border-white/30 transition-colors"
              />
              <button
                onClick={handleCreate}
                disabled={!name.trim() || creating}
                className="w-full bg-[#E50914] hover:bg-[#f6121d] disabled:opacity-50 text-white font-medium py-3 rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                {creating ? <><Loader2 className="w-4 h-4 animate-spin" /> Creating...</> : "Create Room"}
              </button>
            </>
          ) : (
            <>
              {/* Movie info */}
              <div className="flex items-center gap-3">
                {mediaPoster && (
                  <img src={mediaPoster} alt="" className="w-12 h-16 rounded object-cover" />
                )}
                <div>
                  <p className="text-white font-medium text-sm">{mediaTitle}</p>
                  <p className="text-white/40 text-xs">Watch Party</p>
                </div>
              </div>

              {/* Room code */}
              <div className="text-center py-4">
                <p className="text-white/50 text-xs uppercase tracking-wider mb-2">Room Code</p>
                <p className="text-white text-4xl font-mono font-bold tracking-[0.3em] select-all">{roomCode}</p>
              </div>

              {/* Share link */}
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={shareLink}
                  readOnly
                  className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-white/70 text-xs font-mono truncate"
                />
                <button
                  onClick={handleCopy}
                  className="bg-white/10 hover:bg-white/20 border border-white/10 text-white px-3 py-2.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors shrink-0"
                >
                  {copied ? <><Check className="w-3.5 h-3.5" /> Copied</> : <><Copy className="w-3.5 h-3.5" /> Copy</>}
                </button>
              </div>

              {/* Members */}
              <div>
                <p className="text-white/40 text-xs mb-2">
                  {members.length === 1 ? "Waiting for friends..." : `${members.length} in room`}
                </p>
                <MembersList members={members} />
              </div>

              {/* Start */}
              <button
                onClick={() => onStartWatching(roomCode)}
                className="w-full bg-[#E50914] hover:bg-[#f6121d] text-white font-medium py-3 rounded-lg transition-colors"
              >
                Start Watching
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );

  return createPortal(modal, document.body);
}
