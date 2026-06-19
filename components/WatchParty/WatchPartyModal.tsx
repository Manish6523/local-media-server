"use client";

import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { X, Users, Copy, Check, Loader2, Search, Play, Tv, ChevronLeft, Film, Sparkles } from "lucide-react";
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
  episode_end: number | null;
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
type CreateStep = "browse" | "episodes" | "name" | "ready";

export default function WatchPartyModal({ 
  isOpen, 
  onClose,
  initialMedia 
}: { 
  isOpen: boolean; 
  onClose: () => void;
  initialMedia?: MediaItem | null;
}) {
  const router = useRouter();
  const { createRoom, listRooms, members, isConnected, emitPartyStart } = useWatchParty(isOpen);

  const [tab, setTab] = useState<Tab>("create");
  const [createStep, setCreateStep] = useState<CreateStep>("browse");

  // Create tab state
  const [mediaList, setMediaList] = useState<MediaItem[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedMedia, setSelectedMedia] = useState<MediaItem | null>(null);
  const [selectedSeries, setSelectedSeries] = useState<string | null>(null);
  const [hostName, setHostName] = useState("");
  const [roomCode, setRoomCode] = useState("");
  const [creating, setCreating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [browseTab, setBrowseTab] = useState<"movies" | "series">("movies");

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
      if (initialMedia) {
        setSelectedMedia(initialMedia);
        setCreateStep("name");
      } else {
        setCreateStep("browse");
        setSelectedMedia(null);
      }
      setSelectedSeries(null);
      // Pre-fill name from previous session
      const savedName = typeof window !== "undefined" ? sessionStorage.getItem("wp_name") || "" : "";
      setHostName(savedName);
      setRoomCode("");
      setJoinCode("");
      setJoinName(savedName);
      setSearchQuery("");
      setBrowseTab("movies");
    }
  }, [isOpen, initialMedia]);

  if (!isOpen || !mounted) return null;

  // Split media into movies and series
  const movies = mediaList.filter((m) => m.type === "movie");
  const allShows = mediaList.filter((m) => m.type === "show");

  // Group shows by title for the browse view
  const seriesGrouped = Object.values(
    allShows.reduce((acc, item) => {
      if (!acc[item.title]) acc[item.title] = [];
      acc[item.title].push(item);
      return acc;
    }, {} as Record<string, MediaItem[]>)
  );

  const seriesCovers = seriesGrouped.map((episodes) => ({
    title: episodes[0].title,
    poster: episodes[0].poster,
    episodeCount: episodes.length,
    episodes,
  }));

  // Filter by search
  const filteredMovies = movies.filter((m) =>
    m.title.toLowerCase().includes(searchQuery.toLowerCase())
  );
  const filteredSeries = seriesCovers.filter((s) =>
    s.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Get episodes for selected series
  const selectedSeriesEpisodes = selectedSeries
    ? allShows
        .filter((m) => m.title === selectedSeries)
        .sort((a, b) => {
          if ((a.season || 0) !== (b.season || 0)) return (a.season || 0) - (b.season || 0);
          return (a.episode_start || 0) - (b.episode_start || 0);
        })
    : [];

  // Group episodes by season
  const seasonGroups = selectedSeriesEpisodes.reduce((acc, ep) => {
    const season = ep.season || 1;
    if (!acc[season]) acc[season] = [];
    acc[season].push(ep);
    return acc;
  }, {} as Record<number, MediaItem[]>);

  const shareLink = typeof window !== "undefined" ? `${window.location.origin}/join/${roomCode}` : "";

  const handleSelectMovie = (media: MediaItem) => {
    setSelectedMedia(media);
    setCreateStep("name");
  };

  const handleSelectSeries = (title: string) => {
    setSelectedSeries(title);
    setCreateStep("episodes");
  };

  const handleSelectEpisode = (episode: MediaItem) => {
    setSelectedMedia(episode);
    setCreateStep("name");
  };

  const handleCreate = async () => {
    if (!selectedMedia || !hostName.trim()) return;
    setCreating(true);
    const result = await createRoom(selectedMedia.id, hostName.trim());
    if (result.success && result.roomCode) {
      setRoomCode(result.roomCode);
      setCreateStep("ready");
      sessionStorage.setItem("wp_name", hostName.trim());
      sessionStorage.setItem("wp_isHost", "true");
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
      className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center sm:p-4 bg-black/70 backdrop-blur-md animate-in fade-in duration-200"
      onClick={(e) => { e.stopPropagation(); onClose(); }}
    >
      <div
        className="glass-heavy w-full sm:max-w-lg rounded-t-[2rem] sm:rounded-[2rem] overflow-hidden max-h-[90vh] sm:max-h-[85vh] flex flex-col animate-in slide-in-from-bottom-4 sm:zoom-in-95 duration-300 shadow-[0_-10px_60px_rgba(0,0,0,0.5)]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-white/[0.06] shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-cyan-400 flex items-center justify-center shadow-lg shadow-violet-500/20">
              <Users className="w-4.5 h-4.5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-black text-white tracking-tight">Watch Party</h2>
              <p className="text-[11px] text-white/30 font-medium">Watch together in sync</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 bg-white/5 rounded-full text-white/40 hover:text-white hover:bg-white/10 transition-all">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex mx-5 mt-4 mb-1 p-1 gap-1 rounded-xl bg-white/[0.04] border border-white/[0.06] shrink-0">
          <button
            onClick={() => setTab("create")}
            className={`flex-1 py-2.5 rounded-lg text-xs font-bold tracking-wider transition-all duration-200 ${
              tab === "create"
                ? "bg-white text-black shadow-lg shadow-white/10"
                : "text-white/35 hover:text-white/60"
            }`}
          >
            CREATE
          </button>
          <button
            onClick={() => setTab("join")}
            className={`flex-1 py-2.5 rounded-lg text-xs font-bold tracking-wider transition-all duration-200 ${
              tab === "join"
                ? "bg-white text-black shadow-lg shadow-white/10"
                : "text-white/35 hover:text-white/60"
            }`}
          >
            JOIN
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto no-scrollbar px-5 py-4">
          {tab === "create" ? (
            <>
              {/* ─── STEP: BROWSE ─── */}
              {createStep === "browse" && (
                <div className="space-y-4">
                  <p className="text-white/40 text-xs font-medium uppercase tracking-wider">Choose what to watch</p>

                  {/* Search */}
                  <div className="relative">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/25" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search movies & shows..."
                      className="w-full glass-card pl-10 pr-4 py-3 text-white text-sm placeholder:text-white/25 focus:outline-none focus:border-white/20 transition-colors"
                    />
                  </div>

                  {/* Movies / Series tabs */}
                  <div className="flex gap-2">
                    <button
                      onClick={() => setBrowseTab("movies")}
                      className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold tracking-wide transition-all duration-200 ${
                        browseTab === "movies"
                          ? "bg-white text-black shadow-md shadow-white/10"
                          : "glass-card text-white/40 hover:text-white/70"
                      }`}
                    >
                      <Film className="w-3.5 h-3.5" /> Movies
                      <span className="opacity-50">({filteredMovies.length})</span>
                    </button>
                    <button
                      onClick={() => setBrowseTab("series")}
                      className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold tracking-wide transition-all duration-200 ${
                        browseTab === "series"
                          ? "bg-white text-black shadow-md shadow-white/10"
                          : "glass-card text-white/40 hover:text-white/70"
                      }`}
                    >
                      <Tv className="w-3.5 h-3.5" /> Series
                      <span className="opacity-50">({filteredSeries.length})</span>
                    </button>
                  </div>

                  {/* Content grid */}
                  <div className="max-h-[300px] overflow-y-auto no-scrollbar">
                    {browseTab === "movies" ? (
                      <div className="grid grid-cols-3 gap-2.5">
                        {filteredMovies.slice(0, 30).map((m) => (
                          <button
                            key={m.id}
                            onClick={() => handleSelectMovie(m)}
                            className="relative rounded-xl overflow-hidden aspect-[2/3] border border-white/[0.06] hover:border-white/30 hover:shadow-lg hover:shadow-violet-500/5 hover:-translate-y-1 transition-all duration-300 group"
                          >
                            {m.poster ? (
                              <img src={m.poster} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full bg-white/5 flex items-center justify-center">
                                <Film className="w-6 h-6 text-white/15" />
                              </div>
                            )}
                            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black via-black/60 to-transparent p-2.5 pt-8">
                              <p className="text-white text-[10px] font-bold tracking-wide line-clamp-2 leading-tight">{m.title}</p>
                            </div>
                            {/* Play overlay */}
                            <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300">
                              <div className="w-10 h-10 rounded-full bg-white/90 flex items-center justify-center shadow-lg backdrop-blur-sm scale-90 group-hover:scale-100 transition-transform">
                                <Play className="w-4 h-4 text-black fill-black ml-0.5" />
                              </div>
                            </div>
                          </button>
                        ))}
                      </div>
                    ) : (
                      /* Series — show one card per series */
                      <div className="space-y-2">
                        {filteredSeries.map((series) => (
                          <button
                            key={series.title}
                            onClick={() => handleSelectSeries(series.title)}
                            className="w-full flex items-center gap-3.5 p-3 rounded-xl glass-card hover:bg-white/[0.06] hover:border-white/15 transition-all text-left group"
                          >
                            {series.poster ? (
                              <img src={series.poster} alt="" className="w-12 h-16 rounded-lg object-cover shrink-0 border border-white/[0.06]" />
                            ) : (
                              <div className="w-12 h-16 bg-white/5 rounded-lg flex items-center justify-center shrink-0 border border-white/[0.06]">
                                <Tv className="w-5 h-5 text-white/15" />
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <p className="text-white text-sm font-semibold truncate">{series.title}</p>
                              <p className="text-white/30 text-xs mt-0.5 font-medium">{series.episodeCount} episode{series.episodeCount !== 1 ? "s" : ""}</p>
                            </div>
                            <ChevronLeft className="w-4 h-4 text-white/20 rotate-180 shrink-0 group-hover:text-white/50 group-hover:translate-x-0.5 transition-all" />
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ─── STEP: EPISODES (Series only) ─── */}
              {createStep === "episodes" && selectedSeries && (
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => { setCreateStep("browse"); setSelectedSeries(null); }}
                      className="p-2 rounded-full glass-card hover:bg-white/10 transition-all"
                    >
                      <ChevronLeft className="w-4 h-4 text-white/50" />
                    </button>
                    <div>
                      <h3 className="text-white font-bold text-sm tracking-tight">{selectedSeries}</h3>
                      <p className="text-white/30 text-[11px] font-medium">Select an episode</p>
                    </div>
                  </div>

                  <div className="max-h-[340px] overflow-y-auto no-scrollbar space-y-5">
                    {Object.entries(seasonGroups).map(([season, episodes]) => (
                      <div key={season}>
                        <h4 className="text-[11px] font-black text-white/30 uppercase tracking-widest mb-2.5 flex items-center gap-2">
                          <span className="w-5 h-[1px] bg-white/10" />
                          Season {season}
                        </h4>
                        <div className="space-y-1.5">
                          {episodes.map((ep) => (
                            <button
                              key={ep.id}
                              onClick={() => handleSelectEpisode(ep)}
                              className="w-full flex items-center justify-between p-3 rounded-xl glass-card hover:bg-white/[0.06] hover:border-white/15 transition-all text-left group"
                            >
                              <div className="flex items-center gap-3">
                                <span className="text-white/20 text-[11px] font-mono font-bold w-14 shrink-0">
                                  S{String(ep.season || 1).padStart(2, "0")}E{String(ep.episode_start || 1).padStart(2, "0")}
                                  {ep.episode_end && ep.episode_end !== ep.episode_start && (
                                    <span>-E{String(ep.episode_end).padStart(2, "0")}</span>
                                  )}
                                </span>
                                <span className="text-white text-sm font-medium">{ep.title}</span>
                              </div>
                              <Play className="w-4 h-4 text-white/15 group-hover:text-white/50 transition-colors shrink-0" />
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ─── STEP: NAME ─── */}
              {createStep === "name" && (
                <div className="space-y-5">
                  <div className="flex items-center gap-3.5">
                    <button
                      onClick={() => {
                        if (selectedSeries) setCreateStep("episodes");
                        else setCreateStep("browse");
                      }}
                      className="p-2 rounded-full glass-card hover:bg-white/10 transition-all"
                    >
                      <ChevronLeft className="w-4 h-4 text-white/50" />
                    </button>
                    {selectedMedia?.poster && (
                      <img src={selectedMedia.poster} alt="" className="w-11 h-16 rounded-lg object-cover border border-white/[0.06]" />
                    )}
                    <div>
                      <p className="text-white font-bold text-sm tracking-tight">{selectedMedia?.title}</p>
                      {selectedMedia?.season && (
                        <p className="text-white/30 text-xs font-medium mt-0.5">
                          Season {selectedMedia.season} · Episode {selectedMedia.episode_start || 1}
                        </p>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="text-white/40 text-xs font-bold uppercase tracking-wider block mb-2">Your name</label>
                    <input
                      type="text"
                      value={hostName}
                      onChange={(e) => setHostName(e.target.value.slice(0, 20))}
                      onKeyDown={(e) => e.key === "Enter" && handleCreate()}
                      placeholder="Enter your name..."
                      autoFocus
                      className="w-full glass-card px-4 py-3.5 text-white text-sm placeholder:text-white/20 focus:outline-none focus:border-white/20 transition-colors"
                    />
                  </div>

                  <button
                    onClick={handleCreate}
                    disabled={!hostName.trim() || creating}
                    className="w-full bg-white hover:bg-white/90 disabled:opacity-40 disabled:hover:bg-white text-black font-bold py-3.5 rounded-full transition-all flex items-center justify-center gap-2.5 shadow-[0_0_30px_rgba(255,255,255,0.1)] hover:shadow-[0_0_40px_rgba(255,255,255,0.2)]"
                  >
                    {creating ? (
                      <><Loader2 className="w-4 h-4 animate-spin" /> Creating...</>
                    ) : (
                      <><Sparkles className="w-4 h-4" /> Create Room</>
                    )}
                  </button>
                </div>
              )}

              {/* ─── STEP: READY ─── */}
              {createStep === "ready" && (
                <div className="space-y-5">
                  {/* Room code card */}
                  <div className="relative overflow-hidden rounded-2xl glass-card p-6 text-center">
                    {/* Subtle gradient glow behind the code */}
                    <div className="absolute inset-0 bg-gradient-to-br from-violet-500/[0.06] via-transparent to-cyan-500/[0.06]" />
                    <p className="text-white/30 text-[11px] font-bold uppercase tracking-widest mb-3 relative">Room Code</p>
                    <p className="text-white text-4xl font-black tracking-[0.3em] select-all relative bg-gradient-to-r from-white via-white to-white/70 bg-clip-text">{roomCode}</p>
                  </div>

                  {/* Share link */}
                  <div className="flex items-center gap-2">
                    <input type="text" value={shareLink} readOnly
                      className="flex-1 glass-card px-3.5 py-3 text-white/50 text-xs font-mono truncate focus:outline-none"
                    />
                    <button onClick={handleCopy}
                      className="glass-card hover:bg-white/10 text-white px-4 py-3 text-xs font-bold flex items-center gap-1.5 transition-all shrink-0"
                    >
                      {copied ? <><Check className="w-3.5 h-3.5 text-emerald-400" /> Copied</> : <><Copy className="w-3.5 h-3.5" /> Copy</>}
                    </button>
                  </div>

                  {/* Members */}
                  <div className="glass-card p-4 rounded-xl">
                    <p className="text-white/30 text-[11px] font-bold uppercase tracking-widest mb-3">
                      {members.length <= 1 ? "Waiting for friends..." : `${members.length} in room`}
                    </p>
                    <MembersList members={members} />
                  </div>

                  <button
                    onClick={() => { emitPartyStart(roomCode); onClose(); router.push(`/watch/${roomCode}`); }}
                    className="w-full bg-white hover:bg-white/90 text-black font-bold py-3.5 rounded-full transition-all shadow-[0_0_30px_rgba(255,255,255,0.1)] hover:shadow-[0_0_40px_rgba(255,255,255,0.2)] flex items-center justify-center gap-2.5"
                  >
                    <Play className="w-4 h-4 fill-black" /> Start Watching
                  </button>
                </div>
              )}
            </>
          ) : (
            /* JOIN TAB */
            <div className="space-y-5">
              {/* Manual code entry */}
              <div className="space-y-3">
                <label className="text-white/40 text-xs font-bold uppercase tracking-wider">Room Code</label>
                <input
                  type="text"
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value.toUpperCase().slice(0, 6))}
                  placeholder="ABC123"
                  className="w-full glass-card px-4 py-3.5 text-white text-lg font-mono font-bold tracking-[0.3em] text-center placeholder:text-white/15 focus:outline-none focus:border-white/20 transition-colors"
                />
                <label className="text-white/40 text-xs font-bold uppercase tracking-wider block mt-1">Your Name</label>
                <input
                  type="text"
                  value={joinName}
                  onChange={(e) => setJoinName(e.target.value.slice(0, 20))}
                  placeholder="Enter your name..."
                  className="w-full glass-card px-4 py-3.5 text-white text-sm placeholder:text-white/20 focus:outline-none focus:border-white/20 transition-colors"
                />
                <button
                  onClick={handleJoin}
                  disabled={!joinCode.trim() || !joinName.trim()}
                  className="w-full bg-white hover:bg-white/90 disabled:opacity-40 disabled:hover:bg-white text-black font-bold py-3.5 rounded-full transition-all flex items-center justify-center gap-2.5 shadow-[0_0_30px_rgba(255,255,255,0.1)] hover:shadow-[0_0_40px_rgba(255,255,255,0.2)]"
                >
                  <Users className="w-4 h-4" /> Join Room
                </button>
              </div>

              {/* Active rooms */}
              <div className="pt-2">
                <p className="text-white/30 text-[11px] font-black uppercase tracking-widest mb-3 flex items-center gap-2">
                  <span className="w-4 h-[1px] bg-white/10" />
                  Active Rooms
                  <span className="flex-1 h-[1px] bg-white/10" />
                </p>
                {loadingRooms ? (
                  <div className="flex flex-col items-center justify-center py-8 gap-3">
                    <Loader2 className="w-6 h-6 text-white/20 animate-spin" />
                    <p className="text-white/20 text-xs">Scanning for rooms...</p>
                  </div>
                ) : activeRooms.length === 0 ? (
                  <div className="glass-card p-6 text-center rounded-xl">
                    <Users className="w-8 h-8 text-white/10 mx-auto mb-2" />
                    <p className="text-white/20 text-sm font-medium">No active rooms right now</p>
                    <p className="text-white/10 text-xs mt-1">Create one or enter a code above</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {activeRooms.map((room) => (
                      <button
                        key={room.roomCode}
                        onClick={() => handleJoinRoom(room.roomCode)}
                        className={`w-full flex items-center gap-3.5 p-3.5 rounded-xl transition-all duration-200 ${
                          joinCode === room.roomCode
                            ? "glass-glow bg-white/[0.06]"
                            : "glass-card hover:bg-white/[0.06]"
                        }`}
                      >
                        {room.mediaPoster ? (
                          <img src={room.mediaPoster} alt="" className="w-10 h-14 rounded-lg object-cover shrink-0 border border-white/[0.06]" />
                        ) : (
                          <div className="w-10 h-14 bg-white/5 rounded-lg flex items-center justify-center shrink-0 border border-white/[0.06]">
                            <Play className="w-4 h-4 text-white/15" />
                          </div>
                        )}
                        <div className="flex-1 text-left min-w-0">
                          <p className="text-white text-sm font-semibold truncate">{room.mediaTitle}</p>
                          <p className="text-white/30 text-xs font-medium mt-0.5">Hosted by {room.hostName} · {room.memberCount} watching</p>
                        </div>
                        <span className="text-white/20 text-[11px] font-mono font-bold shrink-0 glass-card px-2 py-1 rounded-md">{room.roomCode}</span>
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
