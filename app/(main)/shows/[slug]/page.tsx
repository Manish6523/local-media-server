"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useSearchParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import {
  Play,
  Star,
  Clock,
  Menu,
  X,
  ExternalLink,
  Users,
  HardDrive,
  ArrowLeft,
  Tag,
  Tv,
  Film,
  Calendar,
  MonitorPlay,
  Monitor,
  ChevronRight,
} from "lucide-react";
import { useBackground } from "@/components/BackgroundContext";
import dynamic from "next/dynamic";

import EpisodeThumbnail from "@/components/EpisodeThumbnail";
import HoverPreview from "@/components/HoverPreview";

const WatchPartyModal = dynamic(
  () => import("@/components/WatchParty/WatchPartyModal"),
  { ssr: false },
);

import type { MediaEntry } from "@/lib/db";

/* Split title into two parts for the two-tone effect */
function splitTitle(title: string): [string, string] {
  const words = title.split(/\s+/);
  if (words.length === 1) return [title, ""];
  if (words.length === 2) return [words[0], " " + words[1]];
  const mid = Math.ceil(words.length / 2);
  return [words.slice(0, mid).join(" "), " " + words.slice(mid).join(" ")];
}

export default function ShowDetailPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const imdbId = searchParams.get("imdb");
  const slug = params.slug as string;
  const [episodes, setEpisodes] = useState<MediaEntry[]>([]);
  const [tvmazeEpisodes, setTvmazeEpisodes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeSeason, setActiveSeason] = useState<number>(1);
  const [showPartyModal, setShowPartyModal] = useState(false);
  const [selectedEpisodeForParty, setSelectedEpisodeForParty] =
    useState<MediaEntry | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [hoveredEp, setHoveredEp] = useState<number | null>(null);
  const { setBgImage } = useBackground();
  const seasonScrollRef = useRef<HTMLDivElement>(null);

  // Custom Video Players logic
  const [customVideoPlayers, setCustomVideoPlayers] = useState<any[]>([]);
  const [showPlayOnPc, setShowPlayOnPc] = useState(true);
  useEffect(() => {
    fetch(`/api/config?t=${Date.now()}`, { cache: "no-store" })
      .then(r => r.json())
      .then(data => {
        if (data.customVideoPlayers) setCustomVideoPlayers(data.customVideoPlayers);
        if (data.showPlayOnPc !== undefined) setShowPlayOnPc(data.showPlayOnPc);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (imdbId) {
      fetch(`/api/online-details?imdb=${imdbId}&type=show`)
        .then(r => r.json())
        .then(data => {
          if (!data.error) {
            setEpisodes([data]);
            setBgImage(data.backdrop || data.poster || null);
            
            // Fetch TVMaze episodes for online shows
            fetch(`/api/shows/${imdbId}/episodes`)
              .then(r => r.json())
              .then(epData => {
                if (Array.isArray(epData) && epData.length > 0) {
                  setTvmazeEpisodes(epData);
                  const seasons = [...new Set(epData.map((e: any) => e.season).filter(Boolean))].sort((a, b) => a - b);
                  if (seasons.length > 0) setActiveSeason(seasons[0]);
                }
              })
              .catch(() => {});
          } else {
            setEpisodes([]);
          }
        })
        .catch(() => setEpisodes([]))
        .finally(() => setLoading(false));
    } else {
      fetch("/api/media?type=show")
        .then((r) => r.json())
        .then((data: MediaEntry[]) => {
          const filtered = data.filter(
            (m: MediaEntry) =>
              m.title.toLowerCase().replace(/\s+/g, "-") ===
              decodeURIComponent(slug),
          );
          setEpisodes(filtered);
          if (filtered.length > 0) {
            setBgImage(filtered[0].backdrop || filtered[0].poster || null);
            const seasons = [
              ...new Set(
                filtered.map((e: MediaEntry) => e.season).filter(Boolean),
              ),
            ].sort((a, b) => (a ?? 0) - (b ?? 0));
            if (seasons.length > 0) setActiveSeason(seasons[0] ?? 1);
          }
        })
        .catch(() => setEpisodes([]))
        .finally(() => setLoading(false));
    }
  }, [slug, setBgImage, imdbId]);

  // Lock body scroll when menu is open
  useEffect(() => {
    if (menuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [menuOpen]);

  if (loading) return <LoadingSkeleton />;
  if (episodes.length === 0) return <NotFound />;

  const show = episodes[0];
  const posterSrc = show.poster || "/placeholder.jpg";
  const bgImage = show.backdrop || show.poster || "/placeholder.jpg";

  const isOnline = show.source === "online";

  const seasons = isOnline
    ? [...new Set(tvmazeEpisodes.map((e) => e.season).filter(Boolean))].sort((a, b) => a - b)
    : [...new Set(episodes.map((e) => e.season).filter(Boolean))].sort((a, b) => (a ?? 0) - (b ?? 0));

  const seasonEpisodes = isOnline
    ? tvmazeEpisodes.filter((e) => e.season === activeSeason).sort((a, b) => (a.number ?? 0) - (b.number ?? 0))
    : episodes.filter((e) => e.season === activeSeason).sort((a, b) => (a.episode_start ?? 0) - (b.episode_start ?? 0));

  const [titleA, titleB] = splitTitle(show.title);
  const firstAvailable = seasonEpisodes.find((ep) => ep.available);
  const youtubeUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(show.title + " trailer")}`;

  return (
    <div className="relative flex flex-col overflow-x-hidden lg:h-screen lg:overflow-hidden bg-black">
      {/* ─── Immersive Background ────────────────────────────── */}
      <div className="fixed inset-0 z-0">
        {/* Desktop Backdrop */}
        <div className="hidden md:block absolute inset-0">
          <Image
            src={bgImage}
            alt={show.title}
            fill
            className="object-cover object-top opacity-60 scale-105"
            sizes="100vw"
            priority
          />
        </div>
        {/* Mobile Poster */}
        <div className="md:hidden absolute inset-0">
          <Image
            src={posterSrc}
            alt={show.title}
            fill
            className="object-cover object-top opacity-60 scale-105"
            sizes="100vw"
            priority
          />
        </div>
        {/* Cinematic gradients matching shows page */}
        <div className="absolute inset-0 bg-gradient-to-r from-black/45 via-black/10 to-black/40 z-[1]" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/5 to-black/20 z-[1]" />
      </div>

      {/* ─── Content Layer ───────────────────────────────────── */}
      <div className="relative z-10 flex flex-col lg:h-screen">
        {/* ─── Hero Section (Snaps to 100dvh on mobile) ──────── */}
        <div className="h-[100dvh] -mb-24 lg:mb-0 lg:flex-1 flex flex-col pointer-events-none min-h-0">
          {/* ─── Top Bar ───────────────────────────────────────── */}
          <div className="flex items-center justify-between px-5 md:px-10 lg:px-14 pt-8 md:pt-10 pointer-events-auto">
          {/* Left: Back + Show Title */}
          <Link href="/shows" className="group flex items-center gap-3">
            <ArrowLeft className="w-4 h-4 text-white/30 group-hover:-translate-x-1 transition-transform" />
            <span className="text-white/40 text-[11px] font-semibold tracking-[0.25em] uppercase">
              {show.title}
            </span>
          </Link>

          {/* Center: Hamburger */}
          <button
            onClick={() => setMenuOpen(true)}
            className="absolute left-1/2 -translate-x-1/2 w-10 h-10 flex items-center justify-center rounded-full hover:bg-white/[0.06] transition-all"
          >
            <div className="flex flex-col gap-[5px] items-center">
              <span className="block w-5 h-[1.5px] bg-white/50" />
              <span className="block w-3.5 h-[1.5px] bg-white/50" />
            </div>
          </button>

          {/* Spacer to keep top bar balanced */}
          <div className="hidden lg:block w-[360px] xl:w-[400px]" />
        </div>

        {/* ─── Main Content ──────────────────────────────────── */}
        <div className="flex-1 flex flex-col lg:flex-row items-stretch px-5 md:px-10 lg:px-14 pb-0 lg:pb-12 gap-8 lg:gap-14 min-h-0">
          {/* ── Left Column: Title + Actions ──────────────────── */}
          <div className="flex-1 flex flex-col justify-end min-w-0 pb-24 lg:pb-0 pointer-events-auto">
            {/* Mobile Poster & Metadata */}
            <div className="lg:hidden mb-5">
              <div className="relative w-24 h-36 rounded-xl overflow-hidden border border-white/10 shadow-2xl shadow-black/50 mb-4">
                <Image
                  src={posterSrc}
                  alt={show.title}
                  fill
                  className="object-cover"
                  sizes="96px"
                />
              </div>
              <div className="flex items-center gap-2.5 text-xs text-white/50 flex-wrap font-medium">
                {show.rating && (
                  <span className="flex items-center gap-1 text-violet-300">
                    <Star className="w-3.5 h-3.5 fill-current" />
                    {show.rating.split("/")[0]}
                  </span>
                )}
                {show.year && <span>• {show.year}</span>}
                {show.runtime && <span>• {show.runtime}m/ep</span>}
                {show.genres && (
                  <span className="px-2 py-0.5 rounded bg-white/10 text-white/70 text-[10px] uppercase tracking-wider ml-1">
                    {show.genres.split(",")[0].trim()}
                  </span>
                )}
              </div>
            </div>

            {/* Large Two-Tone Title */}
            <h1 className="text-[12vw] sm:text-8xl lg:text-[6.5rem] font-black tracking-tighter leading-[0.85] uppercase mb-8 -ml-1">
              <span className="text-white drop-shadow-2xl">{titleA}</span>
              <span className="text-white/30">{titleB}</span>
            </h1>

            {/* Action Buttons */}
            <div className="flex items-center gap-4 flex-wrap">
              {show.source === "online" ? (
                <Link
                  href={tvmazeEpisodes.length > 0 ? `/player/online?imdb=${show.omdb_id}&type=show&s=${tvmazeEpisodes[0].season}&e=${tvmazeEpisodes[0].number}` : `/player/online?imdb=${show.omdb_id}&type=show&s=1&e=1`}
                  className="group w-full sm:w-fit inline-flex justify-center sm:justify-start items-center gap-3 px-8 py-4 bg-emerald-500 text-white font-bold text-xs tracking-[0.15em] uppercase hover:bg-emerald-400 transition-all shadow-[0_0_20px_rgba(16,185,129,0.3)]"
                >
                  <Play className="w-4 h-4 fill-current transition-transform group-hover:scale-110" />
                  {tvmazeEpisodes.length > 0 ? `Watch S${tvmazeEpisodes[0].season} E${tvmazeEpisodes[0].number}` : "Watch Online (S1 E1)"}
                </Link>
              ) : firstAvailable ? (
                <Link
                  href={`/player/${firstAvailable.id}`}
                  className="group w-full sm:w-fit inline-flex justify-center sm:justify-start items-center gap-3 px-8 py-4 bg-white text-black font-bold text-xs tracking-[0.15em] uppercase hover:bg-white/90 transition-all"
                >
                  <Play className="w-4 h-4 fill-current transition-transform group-hover:scale-110" />
                  Watch Now
                </Link>
              ) : (
                <div className="inline-flex items-center gap-3 px-8 py-4 bg-white/10 text-white/30 font-bold text-xs tracking-[0.15em] uppercase cursor-not-allowed border border-white/10">
                  <HardDrive className="w-4 h-4" />
                  Drive Offline
                </div>
              )}

              <a
                href={youtubeUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="group w-full sm:w-fit inline-flex justify-center sm:justify-start items-center gap-3 px-8 py-4 border border-white/30 text-white font-bold text-xs tracking-[0.15em] uppercase hover:border-white/60 hover:bg-white/[0.04] transition-all"
              >
                <ExternalLink className="w-4 h-4 transition-transform group-hover:rotate-12" />
                Watch the Trailer
              </a>
            </div>
          </div>

          {/* ── Right Column: Poster Card + Episodes + Season Selector ───── */}
          <div className="hidden lg:flex w-[360px] xl:w-[400px] flex-col gap-4 flex-shrink-0 pointer-events-auto min-h-0">
            {/* Poster + Details Card */}
            <div className="flex items-center gap-5">
              <div className="relative w-34 h-44 rounded-xl overflow-hidden border border-white/10 shadow-xl shadow-black/50 flex-shrink-0">
                <Image
                  src={posterSrc}
                  alt={show.title}
                  fill
                  className="object-cover"
                  sizes="64px"
                />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-white font-bold text-3xl leading-tight truncate">
                  {show.title}
                </p>
                <div className="flex items-center gap-2 mt-1.5 text-md text-white/40 flex-wrap">
                  {show.rating && (
                    <span className="flex items-center gap-1 text-violet-300">
                      <Star className="w-3 h-3 fill-current" />
                      {show.rating.split("/")[0]}
                    </span>
                  )}
                  {show.year && <span>• {show.year}</span>}
                  {show.runtime && <span>• {show.runtime}m/ep</span>}
                </div>
                <p className="text-[11px] text-white/25 mt-1.5 truncate">
                  {show.genres
                    ?.split(",")
                    .slice(0, 2)
                    .map((g) => g.trim())
                    .join(" · ")}
                </p>
              </div>
            </div>

            {/* Right Column Content */}
            {isOnline && tvmazeEpisodes.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-white/[0.02] rounded-xl border border-white/5 mt-4">
                <Tv className="w-12 h-12 text-emerald-500/40 mb-4 animate-pulse" />
                <p className="text-white/60 font-medium mb-2">Loading Episodes...</p>
              </div>
            ) : (
              <>
                {/* Episodes header */}
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold tracking-[0.3em] uppercase text-white/25">
                    // {seasonEpisodes.length} Episode
                    {seasonEpisodes.length !== 1 ? "s" : ""}
                  </span>
                </div>

                {/* Episode Cards */}
                <div className="space-y-3 flex-1 overflow-y-auto no-scrollbar pr-1 min-h-0 pb-4">
                  {/* ... Render episode cards ... */}
                  {seasonEpisodes.map((ep) => {
                    if (isOnline) {
                      // TVMaze Episode Rendering
                      return (
                        <div key={`tvm-${ep.id}`} className="group relative rounded-xl overflow-hidden transition-all duration-300 hover:ring-1 hover:ring-white/10" onMouseEnter={() => setHoveredEp(ep.id)} onMouseLeave={() => setHoveredEp(null)}>
                          <div className="relative aspect-video">
                            <Image
                              src={ep.image?.original || ep.image?.medium || show.backdrop || show.poster || "/placeholder.jpg"}
                              alt={ep.name || `Episode ${ep.number}`}
                              fill
                              className="object-cover transition-transform duration-700 group-hover:scale-105"
                              sizes="400px"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
                            <Link href={`/player/online?imdb=${show.omdb_id}&type=show&s=${ep.season}&e=${ep.number}`} className="absolute inset-0 flex items-center justify-center">
                              <div className="w-12 h-12 rounded-full border-2 border-white/30 flex items-center justify-center bg-black/20 backdrop-blur-sm group-hover:border-white/60 group-hover:bg-black/40 transition-all duration-300 group-hover:scale-110">
                                <Play className="w-5 h-5 text-emerald-400 fill-emerald-400 ml-0.5" />
                              </div>
                            </Link>
                            <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between">
                              <span className="text-[11px] font-bold text-white/70 tracking-wider uppercase truncate pr-2">
                                {ep.number}. {ep.name}
                              </span>
                              {ep.runtime && <span className="text-[10px] text-white/30 font-medium shrink-0">{ep.runtime}m</span>}
                            </div>
                          </div>
                        </div>
                      );
                    }

                    // Local Episode Rendering
                    const epProgress = ep.watch_progress && ep.runtime ? Math.min(100, (ep.watch_progress / (ep.runtime * 60)) * 100) : 0;
                    return (
                      <div key={ep.id} className={`group relative rounded-xl overflow-hidden transition-all duration-300 ${!ep.available ? "opacity-35 grayscale pointer-events-none" : "hover:ring-1 hover:ring-white/10"}`} onMouseEnter={() => setHoveredEp(ep.id)} onMouseLeave={() => setHoveredEp(null)}>
                        <div className="relative aspect-video">
                          <EpisodeThumbnail mediaAssetId={ep.id} fallbackSrc={ep.backdrop || show.backdrop || "/placeholder.jpg"} alt={`Episode ${ep.episode_start}`} sizes="400px" className="object-cover transition-transform duration-700 group-hover:scale-105" filepath={ep.filepath} isAvailable={!!ep.available} />
                          {ep.available && <HoverPreview mediaId={ep.id} runtime={ep.runtime} exactDuration={ep.exactDuration} isHovered={hoveredEp === ep.id} />}
                          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
                          {ep.available && (
                            <Link href={`/player/${ep.id}`} className="absolute inset-0 flex items-center justify-center">
                              <div className="w-12 h-12 rounded-full border-2 border-white/30 flex items-center justify-center bg-black/20 backdrop-blur-sm group-hover:border-white/60 group-hover:bg-black/40 transition-all duration-300 group-hover:scale-110">
                                <Play className="w-5 h-5 text-white fill-white ml-0.5" />
                              </div>
                            </Link>
                          )}
                          {!ep.available && (
                            <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                              <HardDrive className="w-6 h-6 text-red-400/60" />
                            </div>
                          )}
                          <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between z-30 pointer-events-none">
                            <span className="text-[11px] font-bold text-white/70 tracking-wider uppercase">Episode #{ep.episode_start}{ep.episode_end && ep.episode_end !== ep.episode_start ? `-${ep.episode_end}` : ""}</span>
                            <div className="flex items-center gap-2 pointer-events-auto">
                              {ep.available && showPlayOnPc && (
                                <div className="relative group/play">
                                  <button
                                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
                                    className="w-6 h-6 rounded-full bg-black/40 backdrop-blur-sm border border-white/10 flex items-center justify-center text-white/40 hover:text-white hover:bg-white/20 transition-all duration-200 cursor-pointer"
                                    title="Play on PC"
                                  >
                                    <MonitorPlay className="w-2.5 h-2.5" />
                                  </button>
                                  
                                  {/* Sub-menu appearing above */}
                                  <div className="absolute bottom-full right-0 pb-2 opacity-0 group-hover/play:opacity-100 pointer-events-none group-hover/play:pointer-events-auto transition-all duration-200 z-[70]">
                                    <div className="flex flex-col gap-1 bg-[#1a1a1a] border border-white/10 rounded-lg p-1 shadow-xl whitespace-nowrap origin-bottom-right scale-95 group-hover/play:scale-100 transition-all duration-200">
                                      <button onClick={async (e) => { e.preventDefault(); e.stopPropagation(); await fetch("/api/play-local", { method: "POST", body: JSON.stringify({ mediaId: ep.id, player: "default" }) }); }} className="px-3 py-1.5 text-xs text-left text-white/80 hover:text-white hover:bg-blue-500/20 rounded transition-colors flex items-center gap-2 cursor-pointer">
                                        <MonitorPlay className="w-3.5 h-3.5 text-blue-400" /> Default Player
                                      </button>
                                      
                                      {ep.watch_progress && ep.watch_progress > 0 ? (
                                        <div className="relative group/vlc">
                                          <button className="w-full px-3 py-1.5 text-xs text-left text-white/80 hover:text-white hover:bg-orange-500/20 rounded transition-colors flex items-center justify-between gap-4 cursor-pointer">
                                            <div className="flex items-center gap-2">
                                              <Monitor className="w-3.5 h-3.5 text-orange-400" /> VLC
                                            </div>
                                            <ChevronRight className="w-3 h-3 text-white/40" />
                                          </button>
                                          <div className="absolute bottom-full right-0 mb-1 pb-1 opacity-0 group-hover/vlc:opacity-100 pointer-events-none group-hover/vlc:pointer-events-auto transition-all duration-200 z-[70]">
                                            <div className="flex flex-col gap-1 bg-[#1a1a1a] border border-white/10 rounded-lg p-1 shadow-xl whitespace-nowrap origin-bottom-right scale-95 group-hover/vlc:scale-100 transition-all duration-200">
                                              <button onClick={async (e) => { e.preventDefault(); e.stopPropagation(); await fetch("/api/play-local", { method: "POST", body: JSON.stringify({ mediaId: ep.id, player: "vlc", startTime: ep.watch_progress }) }); }} className="px-3 py-1.5 text-xs text-left text-white/80 hover:text-white hover:bg-orange-500/20 rounded transition-colors flex items-center gap-2 cursor-pointer">
                                                Resume ({Math.floor(ep.watch_progress / 60)}m)
                                              </button>
                                              <button onClick={async (e) => { e.preventDefault(); e.stopPropagation(); await fetch("/api/play-local", { method: "POST", body: JSON.stringify({ mediaId: ep.id, player: "vlc" }) }); }} className="px-3 py-1.5 text-xs text-left text-white/80 hover:text-white hover:bg-orange-500/20 rounded transition-colors flex items-center gap-2 cursor-pointer">
                                                Start Over
                                              </button>
                                            </div>
                                          </div>
                                        </div>
                                      ) : (
                                        <button onClick={async (e) => { e.preventDefault(); e.stopPropagation(); await fetch("/api/play-local", { method: "POST", body: JSON.stringify({ mediaId: ep.id, player: "vlc" }) }); }} className="px-3 py-1.5 text-xs text-left text-white/80 hover:text-white hover:bg-orange-500/20 rounded transition-colors flex items-center gap-2 cursor-pointer">
                                          <Monitor className="w-3.5 h-3.5 text-orange-400" /> VLC Media Player
                                        </button>
                                      )}

                                      {customVideoPlayers.length > 0 && <div className="h-[1px] w-full bg-white/10 my-1"></div>}
                                      {customVideoPlayers.map((cp) => (
                                        <button key={cp.id} onClick={async (e) => { e.preventDefault(); e.stopPropagation(); await fetch("/api/play-local", { method: "POST", body: JSON.stringify({ mediaId: ep.id, player: cp.id }) }); }} className="px-3 py-1.5 text-xs text-left text-white/80 hover:text-white hover:bg-emerald-500/20 rounded transition-colors flex items-center gap-2 cursor-pointer">
                                          <MonitorPlay className="w-3.5 h-3.5 text-emerald-400" /> {cp.name}
                                        </button>
                                      ))}
                                    </div>
                                  </div>
                                </div>
                              )}
                              {ep.runtime && <span className="text-[10px] text-white/30 font-medium shrink-0">{ep.runtime}m</span>}
                            </div>
                          </div>
                          {epProgress > 0 && (
                            <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-white/[0.06]"><div className="h-full bg-gradient-to-r from-violet-500 to-cyan-400 shadow-[0_0_6px_rgba(139,92,246,0.4)]" style={{ width: `${epProgress}%` }} /></div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Season Selector (bottom right) */}
                {seasons.length > 0 && (
                  <div ref={seasonScrollRef} className="flex items-center gap-1 mt-2 overflow-x-auto no-scrollbar ml-auto max-w-full">
                    {seasons.map((season) => (
                      <button key={season} onClick={() => setActiveSeason(season ?? 1)} className={`px-4 py-2 text-[11px] font-bold tracking-[0.15em] uppercase whitespace-nowrap transition-all duration-200 ${activeSeason === season ? "text-white bg-white/10 border-b-2 border-white" : "text-white/25 hover:text-white/50"}`}>S{season}</button>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* ─── Hamburger Side Panel ────────────────────────────── */}
      {/* Backdrop overlay */}
      <div
        className={`fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] transition-opacity duration-300 ${
          menuOpen
            ? "opacity-100 pointer-events-auto"
            : "opacity-0 pointer-events-none"
        }`}
        onClick={() => setMenuOpen(false)}
      />
      {/* Panel */}
      <div
        className={`fixed top-0 right-0 h-full w-full max-w-md z-[101] transition-transform duration-300 ease-out ${
          menuOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="h-full bg-black/90 backdrop-blur-2xl border-l border-white/[0.06] flex flex-col">
          {/* Panel Header */}
          <div className="flex items-center justify-between p-6 md:p-8 border-b border-white/[0.06]">
            <span className="text-[10px] font-bold tracking-[0.3em] uppercase text-white/25">
              About This Show
            </span>
            <button
              onClick={() => setMenuOpen(false)}
              className="w-9 h-9 rounded-full bg-white/[0.04] border border-white/[0.06] flex items-center justify-center hover:bg-white/[0.08] transition-all"
            >
              <X className="w-4 h-4 text-white/50" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-8 no-scrollbar">
            {/* Poster + Title */}
            <div className="flex gap-5">
              <div className="relative w-24 h-36 rounded-xl overflow-hidden border border-white/[0.06] shadow-xl shadow-black/40 flex-shrink-0">
                <Image
                  src={posterSrc}
                  alt={show.title}
                  fill
                  className="object-cover"
                />
              </div>
              <div className="min-w-0">
                <h3 className="text-lg font-bold text-white leading-tight mb-2">
                  {show.title}
                </h3>
                <div className="flex items-center gap-2 text-xs text-white/35 flex-wrap">
                  {show.rating && (
                    <span className="flex items-center gap-1 text-violet-300">
                      <Star className="w-3 h-3 fill-current" />
                      {show.rating.split("/")[0]}
                    </span>
                  )}
                  {show.year && <span>• {show.year}</span>}
                  {show.runtime && (
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {show.runtime}m/ep
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap gap-1.5 mt-3">
                  {show.genres?.split(",").map((g) => (
                    <span
                      key={g}
                      className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-medium text-white/35 bg-white/[0.04] border border-white/[0.06] rounded-full"
                    >
                      <Tag className="w-2.5 h-2.5" />
                      {g.trim()}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Synopsis */}
            {show.overview && (
              <div>
                <h4 className="text-[10px] font-bold tracking-[0.3em] uppercase text-white/20 mb-3">
                  Synopsis
                </h4>
                <p className="text-sm text-white/45 leading-relaxed">
                  {show.overview}
                </p>
              </div>
            )}

            {/* Stats Grid */}
            <div className="grid grid-cols-3 gap-2">
              <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4 text-center">
                <Tv className="w-4 h-4 text-white/20 mx-auto mb-1.5" />
                <span className="text-lg font-bold text-white">
                  {seasons.length}
                </span>
                <p className="text-[9px] text-white/25 mt-0.5 uppercase tracking-wider">
                  Seasons
                </p>
              </div>
              <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4 text-center">
                <Film className="w-4 h-4 text-white/20 mx-auto mb-1.5" />
                <span className="text-lg font-bold text-white">
                  {episodes.length}
                </span>
                <p className="text-[9px] text-white/25 mt-0.5 uppercase tracking-wider">
                  Episodes
                </p>
              </div>
              <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4 text-center">
                <Clock className="w-4 h-4 text-white/20 mx-auto mb-1.5" />
                <span className="text-lg font-bold text-white">
                  {show.runtime || "—"}
                  <span className="text-xs text-white/30">m</span>
                </span>
                <p className="text-[9px] text-white/25 mt-0.5 uppercase tracking-wider">
                  Per Ep
                </p>
              </div>
            </div>

            {/* Availability */}
            <div>
              <h4 className="text-[10px] font-bold tracking-[0.3em] uppercase text-white/20 mb-3">
                Availability
              </h4>
              <div className="flex items-center gap-3 bg-white/[0.03] border border-white/[0.06] rounded-xl p-4">
                <div
                  className={`w-2.5 h-2.5 rounded-full ${episodes.some((e) => e.available) ? "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.4)]" : "bg-red-400 shadow-[0_0_8px_rgba(248,113,113,0.3)]"}`}
                />
                <div>
                  <p className="text-sm font-medium text-white/70">
                    {episodes.filter((e) => e.available).length} of{" "}
                    {episodes.length} episodes available
                  </p>
                  <p className="text-[11px] text-white/25 mt-0.5">
                    Source:{" "}
                    {show.source === "online" ? "2embed (Web)" : show.source === "hdd" ? "External Drive" : "Local Storage"}
                  </p>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div>
              <h4 className="text-[10px] font-bold tracking-[0.3em] uppercase text-white/20 mb-3">
                Quick Actions
              </h4>
              <div className="space-y-2">
                <a
                  href={youtubeUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 w-full p-3 rounded-xl bg-white/[0.03] border border-white/[0.06] text-white/50 hover:text-white/70 hover:bg-white/[0.06] transition-all text-sm"
                >
                  <ExternalLink className="w-4 h-4" />
                  Search Trailer on YouTube
                </a>
                {firstAvailable && (
                  <button
                    onClick={() => {
                      setSelectedEpisodeForParty(firstAvailable);
                      setShowPartyModal(true);
                      setMenuOpen(false);
                    }}
                    className="flex items-center gap-3 w-full p-3 rounded-xl bg-white/[0.03] border border-white/[0.06] text-white/50 hover:text-white/70 hover:bg-white/[0.06] transition-all text-sm"
                  >
                    <Users className="w-4 h-4" />
                    Start a Watch Party
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Panel Footer */}
          <div className="p-6 md:p-8 border-t border-white/[0.06] pointer-events-auto">
            <p className="text-[10px] font-mono text-white/15 truncate">
              {show.filepath || show.filename}
            </p>
          </div>
        </div>
        </div> {/* <-- Closes Hero Section Wrapper */}
      </div>

      {/* ─── Mobile Episode Section ──────────────────────────── */}
      <div className="lg:hidden relative z-10 px-5 pb-28 mt-4">
        <div className="flex items-center justify-between mb-4">
          <span className="text-[10px] font-bold tracking-[0.3em] uppercase text-white/25">
            // Episodes
          </span>
        </div>

        {/* Mobile Season Selector */}
        {seasons.length > 0 && (
          <div className="flex items-center gap-2 mb-5 overflow-x-auto no-scrollbar pb-1">
            {seasons.map((season) => (
              <button
                key={season}
                onClick={() => setActiveSeason(season ?? 1)}
                className={`px-5 py-2.5 text-[11px] font-bold tracking-[0.15em] uppercase whitespace-nowrap transition-all rounded-full ${
                  activeSeason === season
                    ? "bg-white text-black shadow-[0_0_15px_rgba(255,255,255,0.3)]"
                    : "bg-white/5 text-white/50 hover:bg-white/10 hover:text-white"
                }`}
              >
                Season {season}
              </button>
            ))}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {seasonEpisodes.map((ep) => {
            if (isOnline) {
              return (
                <div key={`mobile-tvm-${ep.id}`} className="group relative rounded-xl overflow-hidden">
                  <div className="relative aspect-video" onMouseEnter={() => setHoveredEp(ep.id)} onMouseLeave={() => setHoveredEp(null)}>
                    <Image
                      src={ep.image?.original || ep.image?.medium || show.backdrop || show.poster || "/placeholder.jpg"}
                      alt={ep.name || `Episode ${ep.number}`}
                      fill
                      className="object-cover"
                      sizes="(min-width: 640px) 50vw, 100vw"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent z-20 pointer-events-none" />
                    <Link href={`/player/online?imdb=${show.omdb_id}&type=show&s=${ep.season}&e=${ep.number}`} className="absolute inset-0 flex items-center justify-center z-30">
                      <div className="w-11 h-11 rounded-full border-2 border-white/30 flex items-center justify-center bg-black/20 backdrop-blur-sm">
                        <Play className="w-4 h-4 text-emerald-400 fill-emerald-400 ml-0.5" />
                      </div>
                    </Link>
                    <div className="absolute bottom-2.5 left-2.5 right-2.5 flex items-end justify-between z-30 pointer-events-none">
                      <span className="text-[10px] font-bold text-white/70 tracking-wider uppercase truncate pr-2">
                        {ep.number}. {ep.name}
                      </span>
                      {ep.runtime && <span className="text-[9px] text-white/30 font-medium shrink-0">{ep.runtime}m</span>}
                    </div>
                  </div>
                </div>
              );
            }

            const epProgress =
              ep.watch_progress && ep.runtime
                ? Math.min(100, (ep.watch_progress / (ep.runtime * 60)) * 100)
                : 0;

            return (
              <div
                key={`mobile-${ep.id}`}
                className={`group relative rounded-xl overflow-hidden ${
                  !ep.available
                    ? "opacity-35 grayscale pointer-events-none"
                    : ""
                }`}
              >
                <div 
                  className="relative aspect-video"
                  onMouseEnter={() => setHoveredEp(ep.id)}
                  onMouseLeave={() => setHoveredEp(null)}
                  onContextMenu={(e) => {
                    if (typeof window !== 'undefined' && window.matchMedia('(hover: none)').matches) {
                      e.preventDefault();
                    }
                  }}
                  style={{ WebkitTouchCallout: 'none' }}
                >
                  <EpisodeThumbnail
                    mediaAssetId={ep.id}
                    fallbackSrc={ep.backdrop || show.backdrop || "/placeholder.jpg"}
                    alt={`Episode ${ep.episode_start}`}
                    sizes="(min-width: 640px) 50vw, 100vw"
                    className="object-cover"
                    filepath={ep.filepath}
                    isAvailable={!!ep.available}
                  />
                  {/* Hover Preview Video */}
                  {ep.available && (
                    <HoverPreview 
                      mediaId={ep.id} 
                      runtime={ep.runtime} 
                      exactDuration={ep.exactDuration} 
                      isHovered={hoveredEp === ep.id} 
                      isOnline={ep.source === "online"}
                    />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent z-20 pointer-events-none" />

                  {ep.available && (
                    <Link
                      href={`/player/${ep.id}`}
                      className="absolute inset-0 flex items-center justify-center z-30"
                    >
                      <div className="w-11 h-11 rounded-full border-2 border-white/30 flex items-center justify-center bg-black/20 backdrop-blur-sm">
                        <Play className="w-4 h-4 text-white fill-white ml-0.5" />
                      </div>
                    </Link>
                  )}

                  <div className="absolute bottom-2.5 left-2.5 right-2.5 flex items-end justify-between z-30 pointer-events-none">
                    <span className="text-[10px] font-bold text-white/70 tracking-wider uppercase">
                      Ep #{ep.episode_start}
                    </span>
                    <div className="flex items-center gap-1.5">
                      {ep.available && showPlayOnPc && (
                        <div className="relative group/play">
                          <button
                            onClick={(e) => e.preventDefault()}
                            className="w-6 h-6 rounded-full bg-black/40 backdrop-blur-sm border border-white/10 flex items-center justify-center text-white/40 hover:text-white hover:bg-white/20 transition-all duration-200 cursor-pointer"
                            title="Play on PC"
                          >
                            <MonitorPlay className="w-2.5 h-2.5" />
                          </button>
                          
                          {/* Sub-menu appearing above (mobile layout) */}
                          <div className="absolute bottom-full right-0 pb-2 opacity-0 group-hover/play:opacity-100 pointer-events-none group-hover/play:pointer-events-auto transition-all duration-200 z-[70]">
                            <div className="flex flex-col gap-1 bg-[#1a1a1a] border border-white/10 rounded-lg p-1 shadow-xl whitespace-nowrap origin-bottom-right scale-95 group-hover/play:scale-100 transition-all duration-200">
                              <button onClick={async (e) => { e.preventDefault(); await fetch("/api/play-local", { method: "POST", body: JSON.stringify({ mediaId: ep.id, player: "default" }) }); }} className="px-3 py-1.5 text-xs text-left text-white/80 hover:text-white hover:bg-blue-500/20 rounded transition-colors flex items-center gap-2 cursor-pointer">
                                <MonitorPlay className="w-3.5 h-3.5 text-blue-400" /> Default Player
                              </button>
                              
                              {ep.watch_progress && ep.watch_progress > 0 ? (
                                <div className="relative group/vlc">
                                  <button className="w-full px-3 py-1.5 text-xs text-left text-white/80 hover:text-white hover:bg-orange-500/20 rounded transition-colors flex items-center justify-between gap-4 cursor-pointer">
                                    <div className="flex items-center gap-2">
                                      <Monitor className="w-3.5 h-3.5 text-orange-400" /> VLC
                                    </div>
                                    <ChevronRight className="w-3 h-3 text-white/40" />
                                  </button>
                                  <div className="absolute bottom-full right-0 mb-1 pb-1 opacity-0 group-hover/vlc:opacity-100 pointer-events-none group-hover/vlc:pointer-events-auto transition-all duration-200 z-[70]">
                                    <div className="flex flex-col gap-1 bg-[#1a1a1a] border border-white/10 rounded-lg p-1 shadow-xl whitespace-nowrap origin-bottom-right scale-95 group-hover/vlc:scale-100 transition-all duration-200">
                                      <button onClick={async (e) => { e.preventDefault(); await fetch("/api/play-local", { method: "POST", body: JSON.stringify({ mediaId: ep.id, player: "vlc", startTime: ep.watch_progress }) }); }} className="px-3 py-1.5 text-xs text-left text-white/80 hover:text-white hover:bg-orange-500/20 rounded transition-colors flex items-center gap-2 cursor-pointer">
                                        Resume ({Math.floor(ep.watch_progress / 60)}m)
                                      </button>
                                      <button onClick={async (e) => { e.preventDefault(); await fetch("/api/play-local", { method: "POST", body: JSON.stringify({ mediaId: ep.id, player: "vlc" }) }); }} className="px-3 py-1.5 text-xs text-left text-white/80 hover:text-white hover:bg-orange-500/20 rounded transition-colors flex items-center gap-2 cursor-pointer">
                                        Start Over
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              ) : (
                                <button onClick={async (e) => { e.preventDefault(); await fetch("/api/play-local", { method: "POST", body: JSON.stringify({ mediaId: ep.id, player: "vlc" }) }); }} className="px-3 py-1.5 text-xs text-left text-white/80 hover:text-white hover:bg-orange-500/20 rounded transition-colors flex items-center gap-2 cursor-pointer">
                                  <Monitor className="w-3.5 h-3.5 text-orange-400" /> VLC Media Player
                                </button>
                              )}
                              
                              {customVideoPlayers.length > 0 && <div className="h-[1px] w-full bg-white/10 my-1"></div>}
                              {customVideoPlayers.map((cp) => (
                                <button key={`custom-${cp.id}`} onClick={async (e) => { e.preventDefault(); await fetch("/api/play-local", { method: "POST", body: JSON.stringify({ mediaId: ep.id, player: cp.id }) }); }} className="px-3 py-1.5 text-xs text-left text-white/80 hover:text-white hover:bg-emerald-500/20 rounded transition-colors flex items-center gap-2 cursor-pointer">
                                  <MonitorPlay className="w-3.5 h-3.5 text-emerald-400" /> {cp.name}
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}
                      
                      {ep.available && (
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            setSelectedEpisodeForParty(ep);
                            setShowPartyModal(true);
                          }}
                          className="w-6 h-6 rounded-full bg-black/40 backdrop-blur-sm border border-white/10 flex items-center justify-center text-white/40 hover:text-white hover:bg-violet-500/60 transition-colors cursor-pointer"
                        >
                          <Users className="w-2.5 h-2.5" />
                        </button>
                      )}
                      {ep.runtime && (
                        <span className="text-[9px] text-white/30 font-medium">
                          {ep.runtime}m
                        </span>
                      )}
                    </div>
                  </div>

                  {epProgress > 0 && (
                    <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-white/[0.06]">
                      <div
                        className="h-full bg-gradient-to-r from-violet-500 to-cyan-400"
                        style={{ width: `${epProgress}%` }}
                      />
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Watch Party Modal */}
      <WatchPartyModal
        isOpen={showPartyModal}
        onClose={() => {
          setShowPartyModal(false);
          setTimeout(() => setSelectedEpisodeForParty(null), 300);
        }}
        initialMedia={selectedEpisodeForParty as any}
      />
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-10 h-10 border-2 border-white/10 border-t-violet-400 rounded-full animate-spin" />
        <span className="text-xs text-white/20 font-medium tracking-wider">
          Loading show...
        </span>
      </div>
    </div>
  );
}

function NotFound() {
  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center px-8 text-center">
      <div className="max-w-sm">
        <h1 className="text-8xl font-black text-white/[0.05] mb-4 leading-none">
          404
        </h1>
        <p className="text-white/30 mb-8 text-sm">
          This show couldn&apos;t be found in your library.
        </p>
        <Link
          href="/shows"
          className="inline-flex items-center gap-2 px-6 py-3 bg-white text-black font-bold text-xs tracking-[0.15em] uppercase hover:bg-white/90 transition-all"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Shows
        </Link>
      </div>
    </div>
  );
}
