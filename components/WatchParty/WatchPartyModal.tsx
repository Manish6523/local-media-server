"use client";

import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { X, Users, Copy, Check, Loader2, Search, Play, Tv } from "lucide-react";
import { useRouter } from "next/navigation";
import { useWatchParty } from "@/hooks/useWatchParty";
import MembersList from "./MembersList";

interface MediaItem {
  id: number;
  title: string;
  type: "movie" | "show";
  poster: string | null;
  season: number | null;
  episode_start: number | null;
}

interface ActiveRoom {
  roomCode: string;
  mediaId: number;
  hostName: string;
  memberCount: number;
  mediaTitle?: string;
  mediaPoster?: string;
}

type Tab = "create" | "join";
type CreateStep = "pick" | "name" | "ready";

export default function WatchPartyModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const router = useRouter();
  const { createRoom, listRooms, members, isConnected } = useWatchParty(isOpen);

  const [tab, setTab] = useState<Tab>("create");
  const [createStep, setCreateStep] = useState<CreateStep>("pick");

  // Create tab state
  const [mediaList, setMediaList] = useState<MediaItem[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedMedia, setSelectedMedia] = useState<MediaItem | null>(null);
  const [hostName, setHostName] = useState("");
  const [roomCode, setRoomCode] = useState("");
  const [creating, setCreating] = useState(false);
  const [copied, setCopied] = useState(false);

  // Join tab state
  const [activeRooms, setActiveRooms] = useState<ActiveRoom[]>([]);
  const [joinCode, setJoinCode] = useState("");
  const [joinName, setJoinName] = useState("");
  const [loadingRooms, setLoadingRooms] = useState(false);

  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // Fetch media list when opening create tab
  useEffect(() => {
    if (!isOpen) return;
    fetch("/api/media")
      .then((r) => r.json())
      .then((data) => setMediaList(Array.isArray(data) ? data : []))
      .catch(() => {});
  }, [isOpen]);

  // Fetch active rooms when opening join tab
  useEffect(() => {
    if (!isOpen || tab !== "join" || !isConnected) return;
    setLoadingRooms(true);
    listRooms().then(async (rooms) => {
      // Enrich with media titles
      const enriched: ActiveRoom[] = await Promise.all(
        rooms.map(async (r) => {
          try {
            const res = await fetch(`/api/media?id=${r.mediaId}`);
            if (res.ok) {
              const data = await res.json();
              return { ...r, mediaTitle: data.title, mediaPoster: data.poster };
            }
          } catch {}
          return { ...r, mediaTitle: "Unknown", mediaPoster: "" };
        })
      );
      setActiveRooms(enriched);
      setLoadingRooms(false);
    });
  }, [isOpen, tab, isConnected]);

  // Reset on open
  useEffect(() => {
    if (isOpen) {
      setTab("create");
      setCreateStep("pick");
      setSelectedMedia(null);
      setHostName("");
      setRoomCode("");
      setJoinCode("");
      setJoinName("");
    }
  }, [isOpen]);

  if (!isOpen || !mounted) return null;

  const filteredMedia = mediaList.filter((m) =>
    m.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const shareLink = typeof window !== "undefined" ? `${window.location.origin}/join/${roomCode}` : "";

  const handleCreate = async () => {
    if (!selectedMedia || !hostName.trim()) return;
    setCreating(true);
    const result = await createRoom(selectedMedia.id, hostName.trim());
    if (result.success && result.roomCode) {
      setRoomCode(result.roomCode);
      setCreateStep("ready");
    }
    setCreating(false);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(shareLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleJoin = () => {
    if (!joinCode.trim() || !joinName.trim()) return;
    sessionStorage.setItem("wp_name", joinName.trim());
    sessionStorage.setItem("wp_isHost", "false");
    onClose();
    router.push(`/join/${joinCode.trim().toUpperCase()}`);
  };

  const handleJoinRoom = (code: string) => {
    setJoinCode(code);
  };

  const modal = (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={(e) => { e.stopPropagation(); onClose(); }}
    >
      <div
        className="bg-black/60 backdrop-blur-2xl border border-white/10 w-full max-w-lg rounded-2xl shadow-[0_0_80px_rgba(0,0,0,0.8)] overflow-hidden max-h-[85vh] flex flex-col ring-1 ring-white/5 animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-white/10 shrink-0">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <Users className="w-5 h-5 text-[#E50914]" />
            Watch Party
          </h2>
          <button onClick={onClose} className="p-1 text-zinc-400 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-white/10 shrink-0">
          <button
            onClick={() => setTab("create")}
            className={`flex-1 py-3 text-xs font-bold tracking-wider transition-colors ${
              tab === "create" ? "text-white border-b-2 border-[#E50914]" : "text-white/40 hover:text-white/60"
            }`}
          >
            CREATE ROOM
          </button>
          <button
            onClick={() => setTab("join")}
            className={`flex-1 py-3 text-xs font-bold tracking-wider transition-colors ${
              tab === "join" ? "text-white border-b-2 border-[#E50914]" : "text-white/40 hover:text-white/60"
            }`}
          >
            JOIN ROOM
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5">
          {tab === "create" ? (
            <>
              {createStep === "pick" && (
                <div className="space-y-4">
                  <p className="text-white/50 text-sm">Choose what to watch</p>
                  {/* Search */}
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search movies & shows..."
                      className="w-full bg-white/5 border border-white/10 rounded-lg pl-10 pr-4 py-2.5 text-white text-sm focus:outline-none focus:border-white/30"
                    />
                  </div>
                  {/* Media grid */}
                  <div className="grid grid-cols-3 gap-2 max-h-[300px] overflow-y-auto">
                    {filteredMedia.slice(0, 30).map((m) => (
                      <button
                        key={m.id}
                        onClick={() => setSelectedMedia(m)}
                        className={`relative rounded-lg overflow-hidden aspect-[2/3] border-2 transition-all ${
                          selectedMedia?.id === m.id
                            ? "border-[#E50914] ring-2 ring-[#E50914]/30"
                            : "border-transparent hover:border-white/20"
                        }`}
                      >
                        {m.poster ? (
                          <img src={m.poster} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full bg-zinc-800 flex items-center justify-center">
                            {m.type === "show" ? <Tv className="w-6 h-6 text-white/20" /> : <Play className="w-6 h-6 text-white/20" />}
                          </div>
                        )}
                        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-1.5">
                          <p className="text-white text-[10px] font-medium line-clamp-2 leading-tight">{m.title}</p>
                          {m.season && <p className="text-white/40 text-[9px]">S{m.season} E{m.episode_start}</p>}
                        </div>
                      </button>
                    ))}
                  </div>
                  {selectedMedia && (
                    <button
                      onClick={() => setCreateStep("name")}
                      className="w-full bg-[#E50914] hover:bg-[#f6121d] text-white font-medium py-3 rounded-lg transition-colors"
                    >
                      Next — {selectedMedia.title}
                    </button>
                  )}
                </div>
              )}

              {createStep === "name" && (
                <div className="space-y-5">
                  <div className="flex items-center gap-3">
                    {selectedMedia?.poster && (
                      <img src={selectedMedia.poster} alt="" className="w-12 h-16 rounded object-cover" />
                    )}
                    <div>
                      <p className="text-white font-medium text-sm">{selectedMedia?.title}</p>
                      <button onClick={() => setCreateStep("pick")} className="text-[#E50914] text-xs">Change</button>
                    </div>
                  </div>
                  <div>
                    <p className="text-white/50 text-sm mb-2">Enter your name</p>
                    <input
                      type="text"
                      value={hostName}
                      onChange={(e) => setHostName(e.target.value.slice(0, 20))}
                      onKeyDown={(e) => e.key === "Enter" && handleCreate()}
                      placeholder="Your name"
                      autoFocus
                      className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-4 py-3 text-white text-sm focus:outline-none focus:border-white/50"
                    />
                  </div>
                  <button
                    onClick={handleCreate}
                    disabled={!hostName.trim() || creating}
                    className="w-full bg-[#E50914] hover:bg-[#f6121d] disabled:opacity-50 text-white font-medium py-3 rounded-lg transition-colors flex items-center justify-center gap-2"
                  >
                    {creating ? <><Loader2 className="w-4 h-4 animate-spin" /> Creating...</> : "Create Room"}
                  </button>
                </div>
              )}

              {createStep === "ready" && (
                <div className="space-y-5">
                  <div className="text-center py-4">
                    <p className="text-white/50 text-xs uppercase tracking-wider mb-2">Room Code</p>
                    <p className="text-white text-4xl font-mono font-bold tracking-[0.3em] select-all">{roomCode}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <input type="text" value={shareLink} readOnly
                      className="flex-1 bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2.5 text-white/70 text-xs font-mono truncate"
                    />
                    <button onClick={handleCopy}
                      className="bg-zinc-800 hover:bg-zinc-700 border border-zinc-600 text-white px-3 py-2.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors shrink-0"
                    >
                      {copied ? <><Check className="w-3.5 h-3.5" /> Copied</> : <><Copy className="w-3.5 h-3.5" /> Copy</>}
                    </button>
                  </div>
                  <div>
                    <p className="text-white/40 text-xs mb-2">
                      {members.length <= 1 ? "Waiting for friends..." : `${members.length} in room`}
                    </p>
                    <MembersList members={members} />
                  </div>
                  <button
                    onClick={() => { onClose(); router.push(`/watch/${roomCode}`); }}
                    className="w-full bg-[#E50914] hover:bg-[#f6121d] text-white font-medium py-3 rounded-lg transition-colors"
                  >
                    Start Watching
                  </button>
                </div>
              )}
            </>
          ) : (
            /* JOIN TAB */
            <div className="space-y-5">
              {/* Manual code entry */}
              <div className="space-y-3">
                <p className="text-white/50 text-sm">Enter a room code</p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={joinCode}
                    onChange={(e) => setJoinCode(e.target.value.toUpperCase().slice(0, 6))}
                    placeholder="ABC123"
                    className="flex-1 bg-zinc-900 border border-zinc-700 rounded-lg px-4 py-3 text-white text-sm font-mono tracking-widest text-center focus:outline-none focus:border-white/50"
                  />
                </div>
                <input
                  type="text"
                  value={joinName}
                  onChange={(e) => setJoinName(e.target.value.slice(0, 20))}
                  placeholder="Your name"
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-4 py-3 text-white text-sm focus:outline-none focus:border-white/50"
                />
                <button
                  onClick={handleJoin}
                  disabled={!joinCode.trim() || !joinName.trim()}
                  className="w-full bg-[#E50914] hover:bg-[#f6121d] disabled:opacity-50 text-white font-medium py-3 rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  <Users className="w-4 h-4" /> Join
                </button>
              </div>

              {/* Active rooms */}
              <div className="border-t border-white/10 pt-4">
                <p className="text-white/50 text-xs uppercase tracking-wider mb-3">Active Rooms</p>
                {loadingRooms ? (
                  <div className="flex justify-center py-6">
                    <Loader2 className="w-6 h-6 text-white/30 animate-spin" />
                  </div>
                ) : activeRooms.length === 0 ? (
                  <p className="text-white/20 text-sm text-center py-6">No active rooms right now</p>
                ) : (
                  <div className="space-y-2">
                    {activeRooms.map((room) => (
                      <button
                        key={room.roomCode}
                        onClick={() => handleJoinRoom(room.roomCode)}
                        className={`w-full flex items-center gap-3 p-3 rounded-lg transition-colors border ${
                          joinCode === room.roomCode
                            ? "bg-white/10 border-[#E50914]/50"
                            : "bg-white/5 border-transparent hover:bg-white/10"
                        }`}
                      >
                        {room.mediaPoster ? (
                          <img src={room.mediaPoster} alt="" className="w-10 h-14 rounded object-cover shrink-0" />
                        ) : (
                          <div className="w-10 h-14 bg-zinc-800 rounded flex items-center justify-center shrink-0">
                            <Play className="w-4 h-4 text-white/20" />
                          </div>
                        )}
                        <div className="flex-1 text-left min-w-0">
                          <p className="text-white text-sm font-medium truncate">{room.mediaTitle}</p>
                          <p className="text-white/40 text-xs">Hosted by {room.hostName} · {room.memberCount} watching</p>
                        </div>
                        <span className="text-white/30 text-xs font-mono shrink-0">{room.roomCode}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return createPortal(modal, document.body);
}
