"use client";

import { useState, useRef, useEffect } from "react";
import { Send, ChevronRight, MessageCircle } from "lucide-react";
import MembersList from "./MembersList";
import type { PublicMember, ChatMessage } from "@/hooks/useWatchParty";

interface ChatPanelProps {
  members: PublicMember[];
  messages: ChatMessage[];
  onSendMessage: (text: string) => void;
  isConnected: boolean;
}

function timeAgo(ts: number): string {
  const diff = Math.floor((Date.now() - ts) / 1000);
  if (diff < 10) return "now";
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  return `${Math.floor(diff / 3600)}h ago`;
}

export default function ChatPanel({ members, messages, onSendMessage, isConnected }: ChatPanelProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [text, setText] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  const handleSend = () => {
    if (!text.trim() || !isConnected) return;
    onSendMessage(text.trim());
    setText("");
  };

  if (collapsed) {
    return (
      <button
        onClick={() => setCollapsed(false)}
        className="absolute right-0 top-1/2 -translate-y-1/2 z-30 bg-[#1a1a1a] border border-white/10 rounded-l-lg p-3 text-white/70 hover:text-white transition-colors"
        title="Open chat"
      >
        <MessageCircle className="w-5 h-5" />
      </button>
    );
  }

  return (
    <div className="w-80 bg-[#1a1a1a] border-l border-white/10 flex flex-col h-full shrink-0">
      {/* Header */}
      <div className="p-3 border-b border-white/10 flex items-center justify-between">
        <div>
          <h3 className="text-white font-semibold text-sm">Watch Party</h3>
          <span className="text-white/40 text-xs">{members.length} watching</span>
        </div>
        <button
          onClick={() => setCollapsed(true)}
          className="p-1 text-white/40 hover:text-white transition-colors"
          title="Collapse"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* Members */}
      <div className="p-3 border-b border-white/5">
        <MembersList members={members} compact />
      </div>

      {/* Messages */}
      <div ref={containerRef} className="flex-1 overflow-y-auto p-3 space-y-3 scrollbar-thin">
        {messages.length === 0 && (
          <p className="text-white/30 text-xs text-center mt-8">No messages yet. Say hi! 👋</p>
        )}
        {messages.map((msg) => (
          <div key={msg.id} className={msg.isSystem ? "text-center" : ""}>
            {msg.isSystem ? (
              <span className="text-white/30 text-[11px] italic">{msg.text}</span>
            ) : (
              <div>
                <div className="flex items-baseline gap-2">
                  <span className="text-[#E50914] text-xs font-bold">{msg.name}</span>
                  <span className="text-white/20 text-[10px]">{timeAgo(msg.timestamp)}</span>
                </div>
                <p className="text-white/80 text-sm leading-relaxed break-words">{msg.text}</p>
              </div>
            )}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-3 border-t border-white/10">
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value.slice(0, 200))}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            placeholder={isConnected ? "Say something..." : "Connecting..."}
            disabled={!isConnected}
            className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-white/30 focus:outline-none focus:border-white/30 disabled:opacity-50"
          />
          <button
            onClick={handleSend}
            disabled={!text.trim() || !isConnected}
            className="p-2 text-white/50 hover:text-white disabled:opacity-30 transition-colors"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
