"use client";

import { useState, useRef, useEffect } from "react";
import {
  Send,
  X,
  MessageCircle,
  Mic,
  MicOff,
  Phone,
  PhoneOff,
  Copy,
  Check,
  Crown,
  Users,
  Radio,
  Sparkles,
} from "lucide-react";
import MembersList from "./MembersList";
import type { PublicMember, ChatMessage } from "@/hooks/useWatchParty";
import type { VoicePeer } from "@/hooks/useVoiceChat";

interface ChatPanelProps {
  isOpen: boolean;
  onClose: () => void;
  members: PublicMember[];
  messages: ChatMessage[];
  onSendMessage: (text: string) => void;
  isConnected: boolean;
  roomCode?: string | null;
  isHost?: boolean;
  // Voice chat props
  isVoiceEnabled?: boolean;
  isMuted?: boolean;
  isSpeaking?: boolean;
  micPermission?: "unknown" | "granted" | "denied";
  voicePeers?: VoicePeer[];
  onJoinVoice?: () => void;
  onLeaveVoice?: () => void;
  onToggleMute?: () => void;
  myName?: string;
}

const AVATAR_COLORS = [
  "from-violet-500 to-indigo-600",
  "from-cyan-500 to-blue-600",
  "from-fuchsia-500 to-pink-600",
  "from-emerald-500 to-teal-600",
  "from-amber-500 to-orange-600",
  "from-purple-500 to-rose-600",
];

const QUICK_REACTIONS = ["🔥", "😂", "🍿", "❤️", "😱", "👏"];

function timeAgo(ts: number): string {
  const diff = Math.floor((Date.now() - ts) / 1000);
  if (diff < 10) return "now";
  if (diff < 60) return `${diff}s`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  return `${Math.floor(diff / 3600)}h`;
}

export default function ChatPanel({
  isOpen,
  onClose,
  members,
  messages,
  onSendMessage,
  isConnected,
  roomCode,
  isHost = false,
  isVoiceEnabled = false,
  isMuted = false,
  isSpeaking = false,
  micPermission = "unknown",
  voicePeers = [],
  onJoinVoice,
  onLeaveVoice,
  onToggleMute,
  myName,
}: ChatPanelProps) {
  const [text, setText] = useState("");
  const [copied, setCopied] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages.length, isOpen]);

  const handleSend = () => {
    if (!text.trim() || !isConnected) return;
    onSendMessage(text.trim());
    setText("");
  };

  const handleReaction = (emoji: string) => {
    if (!isConnected) return;
    onSendMessage(emoji);
  };

  const handleCopyCode = async () => {
    if (!roomCode) return;
    try {
      await navigator.clipboard.writeText(roomCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      console.warn("Failed to copy room code:", e);
    }
  };

  if (!isOpen) return null;

  const voiceCount = voicePeers.length + (isVoiceEnabled ? 1 : 0);

  return (
    <aside
      className="fixed inset-x-0 bottom-0 md:relative md:inset-auto w-full md:w-80 lg:w-96 h-[80vh] md:h-full max-h-[85vh] md:max-h-none shrink-0 z-50 glass-md md:border-l md:border-white/15 flex flex-col shadow-2xl rounded-t-3xl md:rounded-none animate-in slide-in-from-bottom-6 md:slide-in-from-right-8 duration-300 select-none overflow-hidden"
      onClick={(e) => e.stopPropagation()}
    >
      {/* Mobile drag handle */}
      <div className="md:hidden flex justify-center pt-2.5 pb-1">
        <div className="w-10 h-1 rounded-full bg-white/20" />
      </div>

      {/* ── HEADER ── */}
      <div className="p-4 border-b border-white/10 flex items-center justify-between bg-white/[0.03]">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-full glass-md flex items-center justify-center shrink-0">
            <Users className="w-4 h-4 text-violet-300" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="text-white font-bold text-sm tracking-tight truncate">
                Watch Party
              </h3>
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
            </div>
            <p className="text-white/50 text-[11px] font-medium truncate">
              {members.length} {members.length === 1 ? "person" : "people"} in room
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {/* Room Code Pill */}
          {roomCode && (
            <button
              onClick={handleCopyCode}
              className="glass-md rounded-full px-2.5 py-1 text-[11px] font-mono font-bold text-white/80 hover:text-white hover:bg-white/15 flex items-center gap-1.5 transition-all"
              title="Click to copy Room Code"
            >
              <span>{roomCode}</span>
              {copied ? (
                <Check className="w-3 h-3 text-emerald-400" />
              ) : (
                <Copy className="w-3 h-3 text-white/50" />
              )}
            </button>
          )}

          {/* Voice Join Pill (when not connected) */}
          {!isVoiceEnabled && onJoinVoice && (
            <button
              onClick={onJoinVoice}
              className="glass-md rounded-full px-2.5 py-1 text-emerald-300 hover:text-emerald-200 hover:bg-white/15 text-xs font-semibold flex items-center gap-1.5 transition-all"
              title="Join Voice Chat"
            >
              <Phone className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Voice</span>
            </button>
          )}

          {/* Close Panel Button */}
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full glass-md flex items-center justify-center text-white/70 hover:text-white hover:bg-white/15 transition-all"
            title="Close Watch Party"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Host Status Bar */}
      {!isHost && (
        <div className="px-4 py-1.5 bg-violet-500/10 border-b border-violet-500/20 flex items-center justify-between text-[11px]">
          <span className="text-violet-300 flex items-center gap-1.5 font-medium">
            <Radio className="w-3 h-3 animate-pulse" />
            Host controls playback & syncing
          </span>
          <span className="text-white/40 font-mono text-[10px]">Guest</span>
        </div>
      )}

      {/* ── VOICE CHAT ACTIVE SECTION ── */}
      {isVoiceEnabled && (
        <div className="border-b border-white/10 bg-gradient-to-b from-emerald-500/10 via-emerald-500/5 to-transparent p-3 space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              <span className="text-emerald-300 text-xs font-bold uppercase tracking-wider">
                Voice Room ({voiceCount})
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={onToggleMute}
                className={`glass-md rounded-full px-3 py-1 text-xs font-semibold flex items-center gap-1.5 transition-all ${
                  isMuted ? "bg-red-500/20 text-red-300 border-red-500/40" : "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                }`}
                title={isMuted ? "Unmute Mic" : "Mute Mic"}
              >
                {isMuted ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
                <span>{isMuted ? "Unmute" : "Muted"}</span>
              </button>

              <button
                onClick={onLeaveVoice}
                className="glass-md rounded-full px-2.5 py-1 text-xs text-red-400 hover:text-red-300 hover:bg-white/15 transition-all flex items-center gap-1"
                title="Leave Voice Chat"
              >
                <PhoneOff className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Voice Avatars Row */}
          <div className="flex items-center gap-3 overflow-x-auto scrollbar-hide py-1">
            {/* Myself */}
            <div className="flex flex-col items-center gap-1 shrink-0">
              <div
                className={`w-9 h-9 rounded-full bg-gradient-to-br ${AVATAR_COLORS[0]} flex items-center justify-center text-xs font-bold text-white shadow-md relative transition-transform ${
                  isSpeaking && !isMuted ? "scale-105 ring-2 ring-emerald-400" : ""
                }`}
              >
                {(myName || "You").slice(0, 2).toUpperCase()}
                {isMuted && (
                  <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-red-600 flex items-center justify-center">
                    <MicOff className="w-2.5 h-2.5 text-white" />
                  </div>
                )}
              </div>
              <span className="text-white/60 text-[10px] font-medium">You</span>
            </div>

            {/* Remote Peers */}
            {voicePeers.map((peer, i) => (
              <div key={peer.socketId} className="flex flex-col items-center gap-1 shrink-0">
                <div
                  className={`w-9 h-9 rounded-full bg-gradient-to-br ${
                    AVATAR_COLORS[(i + 1) % AVATAR_COLORS.length]
                  } flex items-center justify-center text-xs font-bold text-white shadow-md relative transition-transform ${
                    peer.isSpeaking && !peer.isMuted ? "scale-105 ring-2 ring-emerald-400" : ""
                  }`}
                >
                  {peer.name.slice(0, 2).toUpperCase()}
                  {peer.isMuted && (
                    <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-red-600 flex items-center justify-center">
                      <MicOff className="w-2.5 h-2.5 text-white" />
                    </div>
                  )}
                </div>
                <span className="text-white/60 text-[10px] font-medium truncate max-w-[48px]">
                  {peer.name}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Mic Warning */}
      {micPermission === "denied" && (
        <div className="px-4 py-2 bg-red-500/10 border-b border-red-500/20 text-red-300 text-xs">
          Microphone permission denied. Enable mic in browser settings.
        </div>
      )}

      {/* ── MEMBERS AVATARS ROW (when voice is inactive) ── */}
      {!isVoiceEnabled && (
        <div className="p-3 border-b border-white/10 bg-white/[0.02]">
          <MembersList members={members} compact />
        </div>
      )}

      {/* ── CHAT MESSAGES STREAM ── */}
      <div
        ref={containerRef}
        className="flex-1 overflow-y-auto p-4 space-y-3.5 scrollbar-thin scrollbar-thumb-white/15"
      >
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center space-y-2 opacity-60">
            <div className="w-12 h-12 rounded-full glass-md flex items-center justify-center mb-1">
              <Sparkles className="w-6 h-6 text-violet-300" />
            </div>
            <p className="text-white font-semibold text-sm">Room is ready!</p>
            <p className="text-white/50 text-xs max-w-[200px]">
              Chat, react, or jump on voice together with friends.
            </p>
          </div>
        ) : (
          messages.map((msg) => {
            if (msg.isSystem) {
              return (
                <div key={msg.id} className="flex justify-center my-2">
                  <span className="glass-md rounded-full px-3 py-0.5 text-[10px] font-medium text-white/60 tracking-wider">
                    {msg.text}
                  </span>
                </div>
              );
            }

            const isMine = msg.name === myName;

            return (
              <div
                key={msg.id}
                className={`flex flex-col ${isMine ? "items-end" : "items-start"} space-y-1`}
              >
                {!isMine && (
                  <span className="text-[11px] font-bold text-violet-300 px-1">
                    {msg.name}
                  </span>
                )}
                <div
                  className={`max-w-[85%] px-3.5 py-2 text-sm leading-relaxed break-words shadow-lg ${
                    isMine
                      ? "bg-gradient-to-br from-violet-600/90 to-purple-600/90 text-white rounded-2xl rounded-br-sm"
                      : "glass-md text-white/95 rounded-2xl rounded-bl-sm border border-white/15"
                  }`}
                >
                  {msg.text}
                </div>
                <span className="text-[10px] font-mono text-white/40 px-1">
                  {timeAgo(msg.timestamp)}
                </span>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* ── QUICK EMOJI BAR ── */}
      <div className="px-3 pt-2 pb-1 border-t border-white/10 flex items-center justify-between bg-white/[0.02]">
        {QUICK_REACTIONS.map((emoji) => (
          <button
            key={emoji}
            onClick={() => handleReaction(emoji)}
            className="w-8 h-8 rounded-full hover:bg-white/15 active:scale-125 transition-all text-base flex items-center justify-center"
            title={`React ${emoji}`}
          >
            {emoji}
          </button>
        ))}
      </div>

      {/* ── INPUT BAR ── */}
      <div className="p-3 bg-white/[0.03]">
        <div className="glass-md rounded-full px-3 py-1 flex items-center gap-2 border border-white/15 focus-within:border-violet-400/60 transition-all">
          <input
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value.slice(0, 200))}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            placeholder={isConnected ? "Say something..." : "Connecting..."}
            disabled={!isConnected}
            className="flex-1 bg-transparent border-none py-1.5 text-xs md:text-sm text-white placeholder-white/40 focus:outline-none focus:ring-0 disabled:opacity-50"
          />
          <button
            onClick={handleSend}
            disabled={!text.trim() || !isConnected}
            className={`w-7 h-7 rounded-full flex items-center justify-center transition-all ${
              text.trim() && isConnected
                ? "bg-violet-500 text-white shadow-md hover:scale-105 active:scale-95"
                : "text-white/30 cursor-not-allowed"
            }`}
          >
            <Send className="w-3.5 h-3.5 ml-0.5" />
          </button>
        </div>
      </div>
    </aside>
  );
}
