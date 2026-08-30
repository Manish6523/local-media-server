"use client";

import { useEffect, useState } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { Play, Star, Clock, Calendar, ArrowLeft, HardDrive, Tag, Users, ExternalLink, MonitorPlay, Monitor, ChevronRight } from "lucide-react";
import { useBackground } from "@/components/BackgroundContext";
import dynamic from "next/dynamic";

const WatchPartyModal = dynamic(() => import("@/components/WatchParty/WatchPartyModal"), { ssr: false });
import AutoTrailerInline from "@/components/AutoTrailerInline";

import type { MediaEntry } from "@/lib/db";

/* Split title into two parts for the two-tone effect */
function splitTitle(title: string): [string, string] {
  const words = title.split(/\s+/);
  if (words.length === 1) return [title, ""];
  if (words.length === 2) return [words[0], " " + words[1]];
  const mid = Math.ceil(words.length / 2);
  return [words.slice(0, mid).join(" "), " " + words.slice(mid).join(" ")];
}

export default function MovieDetailPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const imdbId = searchParams.get("imdb");
  const slug = params.slug as string;
  const [movie, setMovie] = useState<MediaEntry | null>(null);
  const [loading, setLoading] = useState(true);
  const [showPartyModal, setShowPartyModal] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const { setBgImage } = useBackground();

  // Custom Video Players logic
  const [customVideoPlayers, setCustomVideoPlayers] = useState<any[]>([]);
  const [showPlayOnPc, setShowPlayOnPc] = useState(true);
  const [enableAutoTrailerBg, setEnableAutoTrailerBg] = useState(true);
  useEffect(() => {
    fetch(`/api/config?t=${Date.now()}`, { cache: "no-store" })
      .then(r => r.json())
      .then(data => {
        if (data.customVideoPlayers) setCustomVideoPlayers(data.customVideoPlayers);
        if (data.showPlayOnPc !== undefined) setShowPlayOnPc(data.showPlayOnPc);
        if (data.enableAutoTrailerBg !== undefined) setEnableAutoTrailerBg(data.enableAutoTrailerBg);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (imdbId) {
      fetch(`/api/online-details?imdb=${imdbId}&type=movie`)
        .then(r => r.json())
        .then(data => {
          if (!data.error) {
            setMovie(data);
            setBgImage(data.backdrop || data.poster || null);
          } else {
            setMovie(null);
          }
        })
        .catch(() => setMovie(null))
        .finally(() => setLoading(false));
    } else {
      fetch("/api/media?type=movie")
        .then((r) => r.json())
        .then((data: MediaEntry[]) => {
          const found = data.find(
            (m: MediaEntry) =>
              m.title.toLowerCase().replace(/\s+/g, "-") === decodeURIComponent(slug)
          );
          setMovie(found || null);
          if (found) {
            setBgImage(found.backdrop || found.poster || null);
          }
        })
        .catch(() => setMovie(null))
        .finally(() => setLoading(false));
    }
  }, [slug, setBgImage, imdbId]);

  // Lock scroll when menu is open
  useEffect(() => {
    if (menuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [menuOpen]);

  if (loading) return <LoadingSkeleton />;
  if (!movie) return <NotFound />;

  const posterSrc = movie.poster || "/placeholder.jpg";
  const bgImage = movie.backdrop || movie.poster || "/placeholder.jpg";
  const progressPercent = movie.watch_progress && movie.runtime
    ? Math.min(100, Math.max(0, (movie.watch_progress / (movie.runtime * 60)) * 100))
    : 0;

  const runtimeFormatted = movie.runtime
    ? `${Math.floor(movie.runtime / 60)}h ${movie.runtime % 60}m`
    : null;

  const [titleA, titleB] = splitTitle(movie.title);

  const youtubeUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(movie.title + " trailer")}`;

  return (
    <div className="relative h-[calc(100dvh+2rem)] lg:h-[100dvh] flex flex-col overflow-hidden">
      {/* ─── Immersive Background ────────────────────────────── */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <Image
          src={bgImage}
          alt={movie.title}
          fill
          className="object-cover object-top opacity-60 scale-105"
          sizes="100vw"
          priority
        />
        
        {/* Inline Auto-Trailer */}
        {enableAutoTrailerBg && (
          <AutoTrailerInline 
            mediaId={movie.id} 
            exactDuration={movie.exactDuration || (movie.runtime ? movie.runtime * 60 : 0)} 
            isOnline={movie.source === "online"}
          />
        )}

        {/* Cinematic gradients matching shows page */}
        <div className="absolute inset-0 bg-gradient-to-r from-black/45 via-black/10 to-black/40 z-[1] pointer-events-none" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/5 to-black/20 z-[1] pointer-events-none" />
      </div>

      {/* ─── Content Layer ───────────────────────────────────── */}
      <div className="relative z-10 flex-1 flex flex-col pointer-events-none">
        {/* ─── Top Bar ───────────────────────────────────────── */}
        <div className="flex items-center justify-between px-5 md:px-10 lg:px-14 pt-8 md:pt-10 pointer-events-auto">
          {/* Left: Back + Movie Title */}
          <button onClick={() => router.back()} className="group flex items-center gap-3 bg-transparent border-0 p-0 cursor-pointer">
            <ArrowLeft className="w-4 h-4 text-white/30 group-hover:-translate-x-1 transition-transform shrink-0" />
            <span className="text-white/40 text-[11px] font-semibold tracking-[0.25em] uppercase truncate max-w-[120px] sm:max-w-[200px] md:max-w-xs">
              {movie.title}
            </span>
          </button>

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
        <div className="flex-1 flex flex-col lg:flex-row items-stretch px-5 md:px-10 lg:px-14 pb-0 lg:pb-12 gap-8 lg:gap-14">
          {/* ── Left Column: Title + Actions ──────────────────── */}
          <div className="flex-1 flex flex-col justify-end min-w-0 pointer-events-auto">
            {/* Mobile Poster & Metadata */}
            <div className="lg:hidden mb-5">
              <div className="relative w-24 h-36 rounded-xl overflow-hidden border border-white/10 shadow-2xl shadow-black/50 mb-4">
                <Image
                  src={posterSrc}
                  alt={movie.title}
                  fill
                  className="object-cover"
                  sizes="96px"
                />
              </div>
              <div className="flex items-center gap-2.5 text-xs text-white/50 flex-wrap font-medium">
                {movie.rating && (
                  <span className="flex items-center gap-1 text-violet-300">
                    <Star className="w-3.5 h-3.5 fill-current" />
                    {movie.rating.split("/")[0]}
                  </span>
                )}
                {movie.year && <span>• {movie.year}</span>}
                {runtimeFormatted && <span>• {runtimeFormatted}</span>}
                {movie.genres && (
                  <span className="px-2 py-0.5 rounded bg-white/10 text-white/70 text-[10px] uppercase tracking-wider ml-1">
                    {movie.genres.split(",")[0].trim()}
                  </span>
                )}
              </div>
            </div>

            {/* Title & Mini Trailer / Backdrop Image */}
            <div className="hidden lg:block mb-4 w-64 md:w-80 xl:w-96 pointer-events-auto">
              {!enableAutoTrailerBg ? (
                <AutoTrailerInline 
                  mediaId={movie.id} 
                  exactDuration={movie.exactDuration || (movie.runtime ? movie.runtime * 60 : 0)} 
                  isMini={true} 
                  isOnline={movie.source === "online"}
                />
              ) : (
                <div className="relative w-full aspect-video rounded-xl overflow-hidden border border-white/10 shadow-xl shadow-black/50">
                  <Image
                    src={bgImage}
                    alt={movie.title}
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 256px, (max-width: 1280px) 320px, 384px"
                  />
                </div>
              )}
            </div>
            
            <h1 className="text-[12vw] sm:text-8xl lg:text-[6.5rem] font-black tracking-tighter leading-[0.85] uppercase mb-8 -ml-1 text-white">
              <span className="text-white drop-shadow-2xl">{titleA}</span>
              <span className="text-white/30">{titleB}</span>
            </h1>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 relative z-20">
              {movie.source === "online" ? (
                <Link
                  href={`/player/online?imdb=${movie.omdb_id}&type=movie`}
                  className="group w-full sm:w-fit inline-flex justify-center sm:justify-start items-center gap-3 px-8 py-4 bg-emerald-500 text-white font-bold text-xs tracking-[0.15em] uppercase hover:bg-emerald-400 transition-all shadow-[0_0_20px_rgba(16,185,129,0.3)]"
                >
                  <Play className="w-4 h-4 fill-current transition-transform group-hover:scale-110" />
                  Watch Online
                </Link>
              ) : movie.available ? (
                <Link
                  href={`/player/${movie.id}`}
                  className="group w-full sm:w-fit inline-flex justify-center sm:justify-start items-center gap-3 px-8 py-4 bg-white text-black font-bold text-xs tracking-[0.15em] uppercase hover:bg-white/90 transition-all"
                >
                  <Play className="w-4 h-4 fill-current transition-transform group-hover:scale-110" />
                  {progressPercent > 0 ? "Resume" : "Watch Now"}
                </Link>
              ) : (
                <div className="inline-flex items-center justify-center sm:justify-start gap-3 px-8 py-4 bg-white/10 text-white/50 font-bold text-xs tracking-[0.15em] uppercase cursor-not-allowed">
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

              {/* Play on PC Dropdown */}
              {showPlayOnPc && movie.source !== "online" && (
                <div className="relative group/play">
                  <button
                  onClick={(e) => e.preventDefault()}
                  title="Play on PC"
                  className="group w-full sm:w-fit inline-flex justify-center items-center px-6 py-3.5 bg-[#1a1a1a]/80 backdrop-blur-md border border-white/20 text-white hover:bg-white/10 transition-all cursor-pointer"
                >
                  <MonitorPlay className="w-5 h-5 transition-transform group-hover/play:scale-110" />
                </button>
                
                {/* Sub-menu appearing above */}
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 pb-2 opacity-0 group-hover/play:opacity-100 pointer-events-none group-hover/play:pointer-events-auto transition-all duration-200 z-50 min-w-max">
                  <div className="flex flex-col gap-1 bg-[#1a1a1a] border border-white/10 rounded-lg p-1 shadow-xl whitespace-nowrap origin-bottom scale-95 group-hover/play:scale-100 transition-all duration-200">
                    <button onClick={async (e) => { e.preventDefault(); await fetch("/api/play-local", { method: "POST", body: JSON.stringify({ mediaId: movie.id, player: "default" }) }); }} className="px-3 py-2 text-xs text-left text-white/80 hover:text-white hover:bg-blue-500/20 rounded transition-colors flex items-center gap-3 cursor-pointer">
                      <MonitorPlay className="w-4 h-4 text-blue-400" /> Default Player
                    </button>
                    
                    {(movie.watch_progress || 0) > 0 ? (
                      <div className="relative group/vlc">
                        <button className="w-full px-3 py-2 text-xs text-left text-white/80 hover:text-white hover:bg-orange-500/20 rounded transition-colors flex items-center justify-between gap-4 cursor-pointer">
                          <div className="flex items-center gap-3">
                            <Monitor className="w-4 h-4 text-orange-400" /> VLC Media Player
                          </div>
                          <ChevronRight className="w-3 h-3 text-white/40" />
                        </button>
                        {/* Nested Sub-menu for VLC */}
                        <div className="absolute left-full top-0 -mt-1 pl-1 py-1 opacity-0 group-hover/vlc:opacity-100 pointer-events-none group-hover/vlc:pointer-events-auto transition-all duration-200 z-50">
                          <div className="flex flex-col gap-1 bg-[#1a1a1a] border border-white/10 rounded-lg p-1 shadow-xl whitespace-nowrap origin-left scale-95 group-hover/vlc:scale-100 transition-all duration-200">
                            <button onClick={async (e) => { e.preventDefault(); await fetch("/api/play-local", { method: "POST", body: JSON.stringify({ mediaId: movie.id, player: "vlc", startTime: movie.watch_progress }) }); }} className="px-3 py-2 text-xs text-left text-white/80 hover:text-white hover:bg-orange-500/20 rounded transition-colors flex items-center gap-2 cursor-pointer">
                              Resume ({Math.floor((movie.watch_progress || 0) / 60)}m)
                            </button>
                            <button onClick={async (e) => { e.preventDefault(); await fetch("/api/play-local", { method: "POST", body: JSON.stringify({ mediaId: movie.id, player: "vlc" }) }); }} className="px-3 py-2 text-xs text-left text-white/80 hover:text-white hover:bg-orange-500/20 rounded transition-colors flex items-center gap-2 cursor-pointer">
                              Start Over
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <button onClick={async (e) => { e.preventDefault(); await fetch("/api/play-local", { method: "POST", body: JSON.stringify({ mediaId: movie.id, player: "vlc" }) }); }} className="px-3 py-2 text-xs text-left text-white/80 hover:text-white hover:bg-orange-500/20 rounded transition-colors flex items-center gap-3 cursor-pointer">
                        <Monitor className="w-4 h-4 text-orange-400" /> VLC Media Player
                      </button>
                    )}
                    
                    {customVideoPlayers.length > 0 && <div className="h-[1px] w-full bg-white/10 my-1"></div>}
                    {customVideoPlayers.map((cp) => (
                      <button key={`custom-${cp.id}`} onClick={async (e) => { e.preventDefault(); await fetch("/api/play-local", { method: "POST", body: JSON.stringify({ mediaId: movie.id, player: cp.id }) }); }} className="px-3 py-2 text-xs text-left text-white/80 hover:text-white hover:bg-emerald-500/20 rounded transition-colors flex items-center gap-3 cursor-pointer">
                        <MonitorPlay className="w-4 h-4 text-emerald-400" /> {cp.name}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}


            </div>
          </div>

          {/* ── Right Column: Poster Card ───── */}
          <div className="hidden lg:flex w-[360px] xl:w-[400px] flex-col gap-4 flex-shrink-0 justify-end pointer-events-auto">
            <div className="flex items-center gap-5">
              <div className="relative w-34 h-44 rounded-xl overflow-hidden border border-white/10 shadow-xl shadow-black/50 flex-shrink-0">
                <Image
                  src={posterSrc}
                  alt={movie.title}
                  fill
                  className="object-cover"
                  sizes="64px"
                />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-white font-bold text-3xl leading-tight truncate">
                  {movie.title}
                </p>
                <div className="flex items-center gap-2 mt-1.5 text-md text-white/40 flex-wrap">
                  {movie.rating && (
                    <span className="flex items-center gap-1 text-violet-300">
                      <Star className="w-3 h-3 fill-current" />
                      {movie.rating.split("/")[0]}
                    </span>
                  )}
                  {movie.year && <span>• {movie.year}</span>}
                  {runtimeFormatted && <span>• {runtimeFormatted}</span>}
                </div>
                <p className="text-[11px] text-white/25 mt-1.5 truncate">
                  {movie.genres
                    ?.split(",")
                    .slice(0, 2)
                    .map((g) => g.trim())
                    .join(" · ")}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ─── Mobile Details Section ──────────────────────────── */}
      <div className="lg:hidden relative z-10 px-5 pb-28 mt-4">
        {/* Progress Bar for Mobile */}
        {progressPercent > 0 && (
          <div className="mb-6 bg-white/[0.03] border border-white/[0.06] rounded-xl p-4">
            <div className="flex justify-between text-xs text-white/50 mb-2 font-medium">
              <span>Resume Playing</span>
              <span>{Math.round(progressPercent)}%</span>
            </div>
            <div className="h-1.5 w-full bg-white/[0.06] rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-violet-500 to-cyan-400" 
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* ─── Hamburger Slide Menu ──────────────────────────── */}
      {/* Backdrop overlay */}
      <div
        className={`fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] transition-opacity duration-300 ${
          menuOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
        onClick={() => setMenuOpen(false)}
      />

      {/* Right Panel */}
      <div
        className={`fixed top-0 right-0 bottom-0 w-full md:w-[400px] z-[110] transform transition-transform duration-500 cubic-bezier(0.16, 1, 0.3, 1) ${
          menuOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="h-full bg-black/90 backdrop-blur-2xl border-l border-white/[0.06] flex flex-col">
          {/* Panel Header */}
          <div className="flex items-center justify-between p-6 md:p-8 border-b border-white/[0.06]">
            <span className="text-[10px] font-bold tracking-[0.3em] uppercase text-white/25">
              About This Movie
            </span>
            <button
              onClick={() => setMenuOpen(false)}
              className="w-9 h-9 rounded-full bg-white/[0.04] border border-white/[0.06] flex items-center justify-center hover:bg-white/[0.08] transition-all"
            >
              <ArrowLeft className="w-4 h-4 text-white/50 rotate-180" />
            </button>
          </div>

          {/* Panel Content Scrollable */}
          <div className="flex-1 overflow-y-auto no-scrollbar p-6 md:p-8">
            {/* Poster + Title */}
            <div className="flex gap-5 mb-8">
              <div className="relative w-24 h-36 rounded-xl overflow-hidden border border-white/[0.06] shadow-xl shadow-black/40 flex-shrink-0">
                <Image
                  src={posterSrc}
                  alt={movie.title}
                  fill
                  className="object-cover"
                />
              </div>
              <div className="min-w-0">
                <h3 className="text-lg font-bold text-white leading-tight mb-2">
                  {movie.title}
                </h3>
                <div className="flex items-center gap-2 text-xs text-white/35 flex-wrap">
                  {movie.rating && (
                    <span className="flex items-center gap-1 text-violet-300">
                      <Star className="w-3 h-3 fill-current" />
                      {movie.rating.split("/")[0]}
                    </span>
                  )}
                  {movie.year && <span>• {movie.year}</span>}
                </div>
                <div className="flex flex-wrap gap-1.5 mt-3">
                  {movie.genres?.split(",").map((g, i) => (
                    <span
                      key={i}
                      className="px-2 py-1 rounded-md bg-white/[0.04] border border-white/[0.06] text-[10px] text-white/40"
                    >
                      {g.trim()}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Synopsis */}
            {movie.overview && (
              <div className="mb-8">
                <h4 className="text-[10px] font-bold tracking-[0.3em] uppercase text-white/20 mb-3">
                  Synopsis
                </h4>
                <p className="text-sm text-white/45 leading-relaxed">
                  {movie.overview}
                </p>
              </div>
            )}

            {/* Stats Grid */}
            <div className="grid grid-cols-2 gap-2 mb-8">
              <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4 text-center">
                <Clock className="w-4 h-4 text-white/20 mx-auto mb-1.5" />
                <span className="text-lg font-bold text-white">
                  {runtimeFormatted || "—"}
                </span>
                <p className="text-[9px] text-white/25 mt-0.5 uppercase tracking-wider">
                  Runtime
                </p>
              </div>
              <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4 text-center">
                <Calendar className="w-4 h-4 text-white/20 mx-auto mb-1.5" />
                <span className="text-lg font-bold text-white">
                  {movie.year || "—"}
                </span>
                <p className="text-[9px] text-white/25 mt-0.5 uppercase tracking-wider">
                  Year
                </p>
              </div>
            </div>

            {/* Availability & Technical Info */}
            <div className="space-y-6">
              <div>
                <h4 className="text-[10px] font-bold tracking-[0.3em] uppercase text-white/20 mb-3">
                  Availability
                </h4>
                <div className="flex items-center gap-3 bg-white/[0.03] border border-white/[0.06] rounded-xl p-4">
                  <div
                    className={`w-2.5 h-2.5 rounded-full ${movie.available ? "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.4)]" : "bg-red-400 shadow-[0_0_8px_rgba(248,113,113,0.3)]"}`}
                  />
                  <div>
                    <p className="text-sm font-medium text-white/70">
                      {movie.available ? "Ready to watch" : "Drive offline"}
                    </p>
                    <p className="text-[11px] text-white/25 mt-0.5">
                      Source:{" "}
                      {movie.source === "online" ? "2embed (Web)" : movie.source === "hdd" ? "External Drive" : "Local Storage"}
                    </p>
                  </div>
                </div>
              </div>

              {movie.filepath && (
                <div>
                  <h4 className="text-[10px] font-bold tracking-[0.3em] uppercase text-white/20 mb-2">
                    Source File
                  </h4>
                  <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-3">
                    <p className="text-[10px] font-mono text-white/30 truncate select-all">
                      {movie.filepath}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Quick Actions */}
            <div className="mt-8">
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
                  Find Trailer on YouTube
                </a>
                {movie.available && (
                  <button
                    onClick={() => {
                      setShowPartyModal(true);
                      setMenuOpen(false);
                    }}
                    className="flex items-center gap-3 w-full p-3 rounded-xl bg-white/[0.03] border border-white/[0.06] text-white/50 hover:text-white/70 hover:bg-white/[0.06] transition-all text-sm"
                  >
                    <Users className="w-4 h-4" />
                    Start Watch Party
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Watch Party Modal */}
      <WatchPartyModal
        isOpen={showPartyModal}
        onClose={() => setShowPartyModal(false)}
        initialMedia={movie as any}
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
          Loading movie...
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
          This movie couldn&apos;t be found in your library.
        </p>
        <Link
          href="/movies"
          className="inline-flex items-center gap-2 px-6 py-3 bg-white text-black font-bold text-xs tracking-[0.15em] uppercase hover:bg-white/90 transition-all"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Movies
        </Link>
      </div>
    </div>
  );
}