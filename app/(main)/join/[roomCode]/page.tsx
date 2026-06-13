"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Users, Loader2, AlertCircle } from "lucide-react";
import { useWatchParty, PublicMember } from "@/hooks/useWatchParty";
import MembersList from "@/components/WatchParty/MembersList";

export default function JoinRoomPage() {
  const params = useParams();
  const router = useRouter();
  const roomCode = (params.roomCode as string).toUpperCase();
  const { getRoomInfo, isConnected, members: liveMembers } = useWatchParty(true);

  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [roomInfo, setRoomInfo] = useState<{
    mediaId: number;
    hostName: string;
    members: PublicMember[];
  } | null>(null);
  const [mediaTitle, setMediaTitle] = useState("");
  const [mediaPoster, setMediaPoster] = useState("");
  const [loading, setLoading] = useState(true);

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

  const displayMembers = liveMembers.length > 0 ? liveMembers : roomInfo?.members || [];

  const handleJoin = () => {
    if (!name.trim()) return;
    // Store name and redirect — actual joinRoom happens on /watch page
    sessionStorage.setItem("wp_name", name.trim());
    sessionStorage.setItem("wp_isHost", "false");
    sessionStorage.setItem("wp_mediaId", String(roomInfo?.mediaId || ""));
    router.push(`/watch/${roomCode}`);
  };

  return (
    <div className="min-h-screen bg-[#141414] flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <h1 className="text-[#E50914] font-bold text-3xl tracking-tight">FILMARO</h1>
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
        ) : (
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
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
