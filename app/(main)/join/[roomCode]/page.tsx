"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { Users, Loader2, AlertCircle, LogOut, WifiOff, RefreshCw } from "lucide-react";
import { useWatchParty, PublicMember } from "@/hooks/useWatchParty";
import MembersList from "@/components/WatchParty/MembersList";

export default function JoinRoomPage() {
  const params = useParams();
  const router = useRouter();
  const roomCode = (params.roomCode as string).toUpperCase();
  const {
    getRoomInfo,
    joinRoom: wpJoinRoom,
    isConnected,
    members: liveMembers,
    socket,
  } = useWatchParty(true);

  const [name, setName] = useState("");
  const [showNameInput, setShowNameInput] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [roomInfo, setRoomInfo] = useState<{
    mediaId: number;
    hostName: string;
    members: PublicMember[];
  } | null>(null);
  const [mediaTitle, setMediaTitle] = useState("");
  const [mediaPoster, setMediaPoster] = useState("");
  const [loading, setLoading] = useState(true);
  const [autoJoining, setAutoJoining] = useState(false);
  const [joined, setJoined] = useState(false);
  const [disconnected, setDisconnected] = useState(false);
  const hasAutoJoined = useRef(false);
  const hasNavigated = useRef(false);

  // Fetch room info on mount (read-only, no join)
  useEffect(() => {
    if (!isConnected) return;
    (async () => {
      const info = await getRoomInfo(roomCode);
      if (!info.success) {
        setError(info.error || "Room not found");
        setLoading(false);
        return;
      }
      setRoomInfo({
        mediaId: info.mediaId!,
        hostName: info.hostName!,
        members: info.members!,
      });

      try {
        const res = await fetch(`/api/media?id=${info.mediaId}`);
        if (res.ok) {
          const data = await res.json();
          setMediaTitle(data.title || "Unknown");
          setMediaPoster(data.poster || "");
        }
      } catch {}
      setLoading(false);
    })();
  }, [isConnected, roomCode]);

  // Auto-join if name exists in sessionStorage
  useEffect(() => {
    if (loading || !roomInfo || hasAutoJoined.current) return;
    const savedName = sessionStorage.getItem("wp_name");
    if (savedName) {
      hasAutoJoined.current = true;
      setName(savedName);
      setAutoJoining(true);
      // Small delay so user sees the "Joining as..." state
      setTimeout(() => {
        doJoin(savedName);
      }, 600);
    } else {
      setShowNameInput(true);
    }
  }, [loading, roomInfo]);

  // Listen for party-started event to navigate to player
  useEffect(() => {
    if (!joined) return;
    if (!socket) return;

    const handlePartyStarted = () => {
      console.log('[Guest] Party started! Navigating to player...');
      if (hasNavigated.current) return;
      hasNavigated.current = true;
      router.push(`/watch/${roomCode}`);
    };

    console.log('[Guest] Registering party-started listener on socket', socket.id);
    socket.on('party-started', handlePartyStarted);
    return () => {
      socket.off('party-started', handlePartyStarted);
    };
  }, [joined, socket, roomCode, router]);

  // Track disconnection while in lobby
  useEffect(() => {
    if (joined && !isConnected) {
      setDisconnected(true);
    }
    if (joined && isConnected && disconnected) {
      setDisconnected(false);
    }
  }, [joined, isConnected, disconnected]);

  const doJoin = useCallback(async (joinName: string) => {
    if (!joinName.trim()) return;
    sessionStorage.setItem("wp_name", joinName.trim());
    sessionStorage.setItem("wp_isHost", "false");

    const result = await wpJoinRoom(roomCode, joinName.trim());
    if (result.success) {
      setJoined(true);
      setAutoJoining(false);
      setShowNameInput(false);
      sessionStorage.setItem("wp_already_joined", "true");
      sessionStorage.setItem("wp_roomCode", roomCode);
    } else {
      setError(result.error || "Failed to join room");
      setAutoJoining(false);
      setShowNameInput(true);
    }
  }, [roomCode, wpJoinRoom]);

  const handleJoin = () => {
    doJoin(name);
  };

  const handleChangeName = () => {
    hasAutoJoined.current = true;
    setAutoJoining(false);
    setShowNameInput(true);
  };

  const handleLeave = () => {
    router.push("/");
  };

  const handleRetry = () => {
    setDisconnected(false);
    window.location.reload();
  };

  const displayMembers = liveMembers.length > 0 ? liveMembers : roomInfo?.members || [];

  return (
    <div className="min-h-screen bg-[#141414] flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <h1 className="text-[#E50914] font-bold text-3xl tracking-tight">VidLock</h1>
          <p className="text-white/40 text-sm mt-1">Watch Party</p>
        </div>

        {loading ? (
          <div className="bg-[#1a1a1a] border border-white/10 rounded-xl p-8 flex flex-col items-center gap-3">
            <Loader2 className="w-8 h-8 text-white/50 animate-spin" />
            <p className="text-white/50 text-sm">Loading room...</p>
          </div>
        ) : error && !roomInfo ? (
          <div className="bg-[#1a1a1a] border border-white/10 rounded-xl p-8 text-center space-y-4">
            <AlertCircle className="w-12 h-12 text-[#E50914] mx-auto" />
            <p className="text-white font-medium">Room Not Found</p>
            <p className="text-white/50 text-sm">The room code &quot;{roomCode}&quot; doesn&apos;t exist or has expired.</p>
            <button
              onClick={() => router.push("/")}
              className="text-[#E50914] hover:text-[#f6121d] text-sm transition-colors"
            >
              ← Go to home
            </button>
          </div>
        ) : joined ? (
          /* ═══ STATE B — WAITING ROOM (LOBBY) ═══ */
          <div className="bg-[#1a1a1a] border border-white/10 rounded-xl overflow-hidden">
            {/* Media header */}
            {mediaPoster ? (
              <div className="relative h-44 overflow-hidden">
                <img src={mediaPoster} alt="" className="w-full h-full object-cover opacity-30" />
                <div className="absolute inset-0 bg-gradient-to-t from-[#1a1a1a] via-[#1a1a1a]/60 to-transparent" />
                <div className="absolute bottom-4 left-5 right-5">
                  <p className="text-white font-semibold text-lg">{mediaTitle}</p>
                  <p className="text-white/40 text-xs mt-0.5">Hosted by {roomInfo?.hostName}</p>
                </div>
              </div>
            ) : (
              <div className="p-5 border-b border-white/10">
                <p className="text-white font-semibold">{mediaTitle || "Watch Party"}</p>
                <p className="text-white/40 text-xs">Hosted by {roomInfo?.hostName}</p>
              </div>
            )}

            <div className="p-5 space-y-5">
              {/* Room code */}
              <div className="bg-white/5 rounded-lg p-3 text-center">
                <p className="text-white/40 text-[10px] uppercase tracking-wider">Room Code</p>
                <p className="text-white text-2xl font-mono font-bold tracking-[0.2em]">{roomCode}</p>
              </div>

              {/* Disconnection warning */}
              {disconnected ? (
                <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 text-center space-y-3">
                  <WifiOff className="w-8 h-8 text-red-400 mx-auto" />
                  <p className="text-red-300 text-sm font-medium">Connection lost</p>
                  <button
                    onClick={handleRetry}
                    className="inline-flex items-center gap-2 text-red-400 hover:text-red-300 text-xs font-medium transition-colors"
                  >
                    <RefreshCw className="w-3.5 h-3.5" /> Retry
                  </button>
                </div>
              ) : (
                /* Waiting message */
                <div className="text-center py-4 space-y-2">
                  <div className="flex justify-center">
                    <Loader2 className="w-6 h-6 text-white/30 animate-[spin_3s_linear_infinite]" />
                  </div>
                  <p className="text-white text-sm font-medium">Waiting for host to start...</p>
                  <p className="text-white/30 text-xs">You&apos;ll be taken to the player automatically</p>
                </div>
              )}

              {/* Members list — live updating */}
              <div>
                <p className="text-white/40 text-xs mb-2 font-medium">
                  {displayMembers.length} {displayMembers.length === 1 ? "member" : "members"} in room
                </p>
                <MembersList members={displayMembers} />
              </div>

              {/* Leave button */}
              <button
                onClick={handleLeave}
                className="w-full bg-white/5 hover:bg-white/10 border border-white/10 text-white/50 hover:text-white/80 font-medium py-3 rounded-lg transition-all flex items-center justify-center gap-2 text-sm"
              >
                <LogOut className="w-4 h-4" /> Leave
              </button>
            </div>
          </div>
        ) : (
          /* ═══ STATE A — NAME ENTRY ═══ */
          <div className="bg-[#1a1a1a] border border-white/10 rounded-xl overflow-hidden">
            {mediaPoster && (
              <div className="relative h-40 overflow-hidden">
                <img src={mediaPoster} alt="" className="w-full h-full object-cover opacity-40" />
                <div className="absolute inset-0 bg-gradient-to-t from-[#1a1a1a] to-transparent" />
                <div className="absolute bottom-4 left-4">
                  <p className="text-white font-semibold text-lg">{mediaTitle}</p>
                  <p className="text-white/40 text-xs">Hosted by {roomInfo?.hostName}</p>
                </div>
              </div>
            )}
            {!mediaPoster && (
              <div className="p-5 border-b border-white/10">
                <p className="text-white font-semibold">{mediaTitle || "Watch Party"}</p>
                <p className="text-white/40 text-xs">Hosted by {roomInfo?.hostName}</p>
              </div>
            )}

            <div className="p-5 space-y-5">
              <div className="bg-white/5 rounded-lg p-3 text-center">
                <p className="text-white/40 text-[10px] uppercase tracking-wider">Room Code</p>
                <p className="text-white text-2xl font-mono font-bold tracking-[0.2em]">{roomCode}</p>
              </div>

              <div>
                <p className="text-white/40 text-xs mb-2">{displayMembers.length} already watching</p>
                <MembersList members={displayMembers} />
              </div>

              {autoJoining ? (
                /* Auto-joining state */
                <div className="space-y-3 text-center">
                  <div className="flex items-center justify-center gap-3 py-3">
                    <Loader2 className="w-5 h-5 text-white/50 animate-spin" />
                    <p className="text-white/70 text-sm font-medium">
                      Joining as <span className="text-white font-bold">{name}</span>...
                    </p>
                  </div>
                  <button
                    onClick={handleChangeName}
                    className="text-white/30 hover:text-white/60 text-xs transition-colors"
                  >
                    Not you? Change name
                  </button>
                </div>
              ) : showNameInput ? (
                /* Name input */
                <div className="space-y-3">
                  <p className="text-white/70 text-sm font-medium">Enter your name to join</p>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value.slice(0, 20))}
                    onKeyDown={(e) => e.key === "Enter" && handleJoin()}
                    placeholder="Your name"
                    autoFocus
                    className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-4 py-3 text-white text-sm focus:outline-none focus:border-white/50"
                  />
                  {error && (
                    <p className="text-[#E50914] text-xs flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5" /> {error}
                    </p>
                  )}
                  <button
                    onClick={handleJoin}
                    disabled={!name.trim() || !isConnected}
                    className="w-full bg-[#E50914] hover:bg-[#f6121d] disabled:opacity-50 text-white font-medium py-3 rounded-lg transition-colors flex items-center justify-center gap-2"
                  >
                    <Users className="w-4 h-4" /> Join Watch Party
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
