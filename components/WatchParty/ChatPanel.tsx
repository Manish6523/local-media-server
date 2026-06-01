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
        className="absolute right-6 top-1/2 -translate-y-1/2 z-50 bg-black/40 backdrop-blur-xl border border-white/10 rounded-full p-4 text-white/80 hover:text-white hover:bg-white/20 transition-all shadow-2xl hover:scale-110"
        title="Open chat"
      >
        <MessageCircle className="w-6 h-6" />
      </button>
    );
  }

  return (
    <div className="absolute right-6 top-6 bottom-32 w-80 bg-black/60 backdrop-blur-2xl border border-white/10 rounded-2xl flex flex-col z-50 shadow-2xl overflow-hidden animate-in slide-in-from-right-8 duration-300">
      {/* Header */}
      <div className="p-4 border-b border-white/10 flex items-center justify-between bg-white/5">
        <div>
          <h3 className="text-white font-bold text-sm tracking-wide">Watch Party</h3>
          <span className="text-white/50 text-xs font-medium">{members.length} watching</span>
        </div>
        <button
          onClick={() => setCollapsed(true)}
          className="p-1.5 rounded-full bg-white/5 text-white/60 hover:text-white hover:bg-white/20 transition-all"
          title="Collapse"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* Members */}
      <div className="p-3 border-b border-white/5 bg-black/20">
        <MembersList members={members} compact />
      </div>

      {/* Messages */}
      <div ref={containerRef} className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center space-y-3 opacity-50">
            <MessageCircle className="w-8 h-8 text-white/50" />
            <p className="text-white/70 text-xs font-medium">No messages yet.<br/>Say hi! 👋</p>
          </div>
        )}
        {messages.map((msg) => (
          <div key={msg.id} className={msg.isSystem ? "text-center my-4" : ""}>
            {msg.isSystem ? (
              <span className="bg-white/10 text-white/60 px-3 py-1 rounded-full text-[10px] font-medium uppercase tracking-wider">
                {msg.text}
              </span>
            ) : (
              <div className="bg-white/5 rounded-xl p-3 border border-white/5">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-primary text-xs font-bold">{msg.name}</span>
                  <span className="text-white/30 text-[10px] font-medium">{timeAgo(msg.timestamp)}</span>
                </div>
                <p className="text-white/90 text-sm leading-relaxed break-words">{msg.text}</p>
              </div>
            )}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-3 border-t border-white/10 bg-black/40 backdrop-blur-md">
        <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-full px-4 py-1 focus-within:border-primary/50 focus-within:bg-white/10 transition-all">
          <input
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value.slice(0, 200))}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            placeholder={isConnected ? "Message..." : "Connecting..."}
            disabled={!isConnected}
            className="flex-1 bg-transparent border-none py-2 text-sm text-white placeholder-white/40 focus:outline-none focus:ring-0 disabled:opacity-50"
          />
          <button
            onClick={handleSend}
            disabled={!text.trim() || !isConnected}
            className="p-1.5 rounded-full text-white/50 hover:text-primary hover:bg-primary/10 disabled:opacity-30 disabled:hover:text-white/50 disabled:hover:bg-transparent transition-all"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
