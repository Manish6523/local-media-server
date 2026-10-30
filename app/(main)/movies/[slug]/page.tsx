"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import {
  Play,
  Star,
  Clock,
  Calendar,
  ArrowLeft,
  HardDrive,
  Users,
  ExternalLink,
  MonitorPlay,
  Monitor,
  ChevronRight,
  Heart,
  Pencil,
  Copy,
  Check,
  X,
  Sparkles,
  Info,
  Home,
  Tv,
  Film,
  Image as ImageIcon,
} from "lucide-react";
import { useBackground } from "@/components/BackgroundContext";
import dynamic from "next/dynamic";
import AutoTrailerInline from "@/components/AutoTrailerInline";
import type { MediaEntry } from "@/lib/db";

const WatchPartyModal = dynamic(
  () => import("@/components/WatchParty/WatchPartyModal"),
  { ssr: false }
);
const EditTitleModal = dynamic(
  () => import("@/components/EditTitleModal"),
  { ssr: false }
);

/* Split title into two parts for the signature two-tone effect */
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
  const [showEditModal, setShowEditModal] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [showPlayOnPcMenu, setShowPlayOnPcMenu] = useState(false);
  const [showVlcSubmenu, setShowVlcSubmenu] = useState(false);
  const [copiedPath, setCopiedPath] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);
  const [isTogglingFav, setIsTogglingFav] = useState(false);
  const [isTrailerHidden, setIsTrailerHidden] = useState(false);

  const { setBgImage } = useBackground();
  const playOnPcRef = useRef<HTMLDivElement>(null);

  // Custom Video Players & display config
  const [customVideoPlayers, setCustomVideoPlayers] = useState<any[]>([]);
  const [showPlayOnPc, setShowPlayOnPc] = useState(true);
  const [enableAutoTrailerBg, setEnableAutoTrailerBg] = useState(true);
  const [enableEditMode, setEnableEditMode] = useState(false);

  useEffect(() => {
    fetch(`/api/config?t=${Date.now()}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((data) => {
        if (data.customVideoPlayers) setCustomVideoPlayers(data.customVideoPlayers);
        if (data.showPlayOnPc !== undefined) setShowPlayOnPc(data.showPlayOnPc);
        if (data.enableAutoTrailerBg !== undefined)
          setEnableAutoTrailerBg(data.enableAutoTrailerBg);
        if (data.enableEditMode !== undefined) setEnableEditMode(data.enableEditMode);
      })
      .catch(() => {});
  }, []);

  // Close Play on PC menu on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (playOnPcRef.current && !playOnPcRef.current.contains(e.target as Node)) {
        setShowPlayOnPcMenu(false);
        setShowVlcSubmenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const loadMovie = () => {
    if (imdbId) {
      fetch(`/api/online-details?imdb=${imdbId}&type=movie`)
        .then((r) => r.json())
        .then((data) => {
          if (!data.error) {
            setMovie(data);
            setIsFavorite(Boolean(data.is_favorite));
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
            setIsFavorite(Boolean(found.is_favorite));
            setBgImage(found.backdrop || found.poster || null);
          }
        })
        .catch(() => setMovie(null))
        .finally(() => setLoading(false));
    }
  };

  useEffect(() => {
    loadMovie();
  }, [slug, setBgImage, imdbId]);

  // Lock scroll when drawer is open
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

  const handleToggleFavorite = async () => {
    if (!movie || isTogglingFav) return;
    const nextState = !isFavorite;
    setIsFavorite(nextState);
    setIsTogglingFav(true);

    try {
      await fetch("/api/toggle-favorite", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: movie.id, isFavorite: nextState }),
      });
    } catch {
      setIsFavorite(!nextState);
    } finally {
      setIsTogglingFav(false);
    }
  };

  const handleCopyPath = () => {
    if (!movie?.filepath) return;
    navigator.clipboard.writeText(movie.filepath);
    setCopiedPath(true);
    setTimeout(() => setCopiedPath(false), 2000);
  };

  if (loading) return <LoadingSkeleton />;
  if (!movie) return <NotFound />;

  const posterSrc = movie.poster || "/placeholder.jpg";
  const bgImage = movie.backdrop || movie.poster || "/placeholder.jpg";
  const progressPercent =
    movie.watch_progress && movie.runtime
      ? Math.min(100, Math.max(0, (movie.watch_progress / (movie.runtime * 60)) * 100))
      : 0;

  const runtimeFormatted = movie.runtime
    ? `${Math.floor(movie.runtime / 60)}h ${movie.runtime % 60}m`
    : null;

  const [titleA, titleB] = splitTitle(movie.title);
  const rawRating = movie.rating ? movie.rating.split("/")[0].trim() : null;
  const youtubeUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(
    movie.title + " trailer"
  )}`;

  return (
    <div className="relative h-[calc(100dvh+2rem)] lg:h-[100dvh] flex flex-col overflow-hidden bg-black text-white select-none">
      {/* ─── Immersive Full-Screen Background ──────────────────────────── */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <Image
          src={bgImage}
          alt={movie.title}
          fill
          className="object-cover object-top opacity-60 scale-105 transition-transform duration-1000"
          sizes="100vw"
          priority
        />

        {/* Inline Auto-Trailer */}
        {enableAutoTrailerBg && (
          <AutoTrailerInline
            mediaId={movie.id}
            exactDuration={
              movie.exactDuration || (movie.runtime ? movie.runtime * 60 : 0)
            }
            isOnline={movie.source === "online"}
            isVideoHidden={isTrailerHidden}
            onToggleVideoHidden={setIsTrailerHidden}
            hideToggle={true}
          />
        )}

        {/* Cinematic Vignette Gradients */}
        {/* <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/20 to-black/55 z-[1]" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/15 to-black/35 z-[1]" /> */}
      </div>

      {/* ─── Foreground Zero-Scroll Stage ──────────────────────────────── */}
      <div className="relative z-10 flex-1 flex flex-col justify-between pointer-events-none">
        {/* ─── Top Bar (glass-md Pills) ─────────────────────────────────── */}
        <header className="flex items-center justify-between px-5 md:px-10 lg:px-14 pt-6 md:pt-9 pointer-events-auto">
          {/* Left: Back Pill + Fast Navigation Icons (Home, Series) + Breadcrumb Title */}
          <div className="glass-md flex items-center rounded-full p-1.5 gap-1 shadow-lg">
            {/* Back Button */}
            <button
              onClick={() => router.back()}
              title="Go back"
              className="flex items-center justify-center w-8 h-8 rounded-full text-white/80 hover:text-white hover:bg-white/15 hover:scale-105 active:scale-95 transition-all cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4 text-white" />
            </button>

            <span className="w-[1px] h-4 bg-white/15" />

            {/* Home Navigation (Icon Only, White) */}
            <Link
              href="/"
              title="Home"
              className="flex items-center justify-center w-8 h-8 rounded-full text-white/80 hover:text-white hover:bg-white/15 hover:scale-105 active:scale-95 transition-all cursor-pointer"
            >
              <Home className="w-4 h-4 text-white" />
            </Link>

            {/* Series Navigation (Icon Only, White) */}
            <Link
              href="/shows"
              title="Series"
              className="flex items-center justify-center w-8 h-8 rounded-full text-white/80 hover:text-white hover:bg-white/15 hover:scale-105 active:scale-95 transition-all cursor-pointer"
            >
              <Tv className="w-4 h-4 text-white" />
            </Link>

            <span className="w-[1px] h-4 bg-white/15" />

            {/* Movie Title Breadcrumb */}
            <span className="text-white/80 text-[11px] font-semibold tracking-[0.22em] uppercase truncate max-w-[120px] sm:max-w-[200px] md:max-w-xs px-2.5">
              {movie.title}
            </span>
          </div>

          {/* Center: Details Trigger Pill */}
          <button
            onClick={() => setMenuOpen(true)}
            title="About This Movie"
            className="glass-md absolute left-1/2 -translate-x-1/2 px-5 h-10 flex items-center justify-center gap-2.5 rounded-full hover:bg-white/15 hover:scale-105 active:scale-95 transition-all cursor-pointer"
          >
            <div className="flex flex-col gap-[4px] items-center">
              <span className="block w-4 h-[1.5px] rounded-full bg-white/80" />
              <span className="block w-2.5 h-[1.5px] rounded-full bg-white/60" />
            </div>
            <span className="hidden sm:inline text-[10px] font-semibold tracking-[0.2em] uppercase text-white/75">
              Details
            </span>
          </button>

          {/* Right: Unified Utility Capsule (matches Left Nav Pill) */}
          <div className="glass-md flex items-center rounded-full p-1.5 gap-1 shadow-lg">
            {enableAutoTrailerBg && movie.source !== "online" && (
              <>
                <button
                  onClick={() => setIsTrailerHidden(!isTrailerHidden)}
                  title={isTrailerHidden ? "Show Background Trailer" : "Show Static Backdrop"}
                  className="flex items-center justify-center w-8 h-8 rounded-full text-white/80 hover:text-white hover:bg-white/15 hover:scale-105 active:scale-95 transition-all cursor-pointer"
                >
                  {isTrailerHidden ? (
                    <Film className="w-4 h-4 text-white" />
                  ) : (
                    <ImageIcon className="w-4 h-4 text-white" />
                  )}
                </button>
                <span className="w-[1px] h-4 bg-white/15" />
              </>
            )}

            {movie.source !== "online" && (
              <>
                <button
                  onClick={handleToggleFavorite}
                  title={isFavorite ? "Remove from Favorites" : "Add to Favorites"}
                  className="flex items-center justify-center w-8 h-8 rounded-full text-white/80 hover:text-white hover:bg-white/15 hover:scale-105 active:scale-95 transition-all cursor-pointer"
                >
                  <Heart className={`w-4 h-4 text-white ${isFavorite ? "fill-white" : ""}`} />
                </button>
              </>
            )}

            {movie.available ? (
              <>
                <span className="w-[1px] h-4 bg-white/15" />
                <button
                  onClick={() => setShowPartyModal(true)}
                  title="Watch Party"
                  className="flex items-center justify-center w-8 h-8 rounded-full text-white/80 hover:text-white hover:bg-white/15 hover:scale-105 active:scale-95 transition-all cursor-pointer"
                >
                  <Users className="w-4 h-4 text-white" />
                </button>
              </>
            ) : null}

            {enableEditMode && movie.source !== "online" && (
              <>
                <span className="w-[1px] h-4 bg-white/15" />
                <button
                  onClick={() => setShowEditModal(true)}
                  title="Edit Metadata"
                  className="flex items-center justify-center w-8 h-8 rounded-full text-white/80 hover:text-white hover:bg-white/15 hover:scale-105 active:scale-95 transition-all cursor-pointer"
                >
                  <Pencil className="w-4 h-4 text-white" />
                </button>
              </>
            )}
          </div>
        </header>

        {/* ─── Bottom Stage: Left Title/Actions + Right Poster Card ────── */}
        <div className="flex-1 flex flex-col lg:flex-row items-stretch px-5 md:px-10 lg:px-14 pb-8 lg:pb-12 gap-8 lg:gap-12">
          {/* ── Left Column: Mini Frame + Two-Tone Title + Actions ────── */}
          <div className="flex-1 flex flex-col justify-end min-w-0 pointer-events-auto">
            {/* Mobile Poster & Metadata Pill Row */}
            <div className="lg:hidden mb-5">
              <div
                onClick={() => setMenuOpen(true)}
                className="glass-card relative w-24 h-36 rounded-2xl p-1 overflow-hidden mb-4 cursor-pointer"
              >
                <div className="relative w-full h-full rounded-xl overflow-hidden">
                  <Image
                    src={posterSrc}
                    alt={movie.title}
                    fill
                    className="object-cover"
                    sizes="96px"
                  />
                </div>
              </div>
              <div className="flex items-center gap-2 text-xs text-white/60 flex-wrap font-medium">
                {rawRating && (
                  <span className="flex items-center gap-1 text-amber-300 font-semibold">
                    <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                    {rawRating}
                  </span>
                )}
                {movie.year && <span>• {movie.year}</span>}
                {runtimeFormatted && <span>• {runtimeFormatted}</span>}
                {movie.genres && (
                  <span className="glass px-2.5 py-0.5 rounded-full text-white/80 text-[10px] uppercase tracking-wider ml-1">
                    {movie.genres.split(",")[0].trim()}
                  </span>
                )}
              </div>
            </div>

            {/* Desktop Mini Trailer / Backdrop Frame */}
            <div className="hidden lg:block mb-5 w-64 md:w-72 xl:w-80 pointer-events-auto">
              <div className="glass-card p-1.5 rounded-2xl overflow-hidden transition-transform duration-500 hover:scale-[1.02]">
                <div className="relative w-full aspect-video rounded-xl overflow-hidden bg-black/50">
                  {!enableAutoTrailerBg ? (
                    <AutoTrailerInline
                      mediaId={movie.id}
                      exactDuration={
                        movie.exactDuration ||
                        (movie.runtime ? movie.runtime * 60 : 0)
                      }
                      isMini={true}
                      isOnline={movie.source === "online"}
                    />
                  ) : (
                    <Image
                      src={bgImage}
                      alt={movie.title}
                      fill
                      className="object-cover"
                      sizes="(max-width: 768px) 256px, (max-width: 1280px) 320px, 384px"
                    />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-tr from-black/30 via-transparent to-white/10 pointer-events-none" />
                </div>
              </div>
            </div>

            {/* Signature Massive Two-Tone Title */}
            <h1 className="text-[11vw] sm:text-7xl lg:text-[6.2rem] font-black tracking-tighter leading-[0.86] uppercase mb-7 -ml-1 select-text">
              <span className="text-white drop-shadow-[0_12px_30px_rgba(0,0,0,0.7)]">
                {titleA}
              </span>
              <span className="text-white/35">{titleB}</span>
            </h1>

            {/* Action Row */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3.5 relative z-20">
              {movie.source === "online" ? (
                <Link
                  href={`/player/online?imdb=${movie.omdb_id}&type=movie`}
                  className="group w-full sm:w-fit inline-flex justify-center items-center gap-3 px-8 py-4 rounded-full bg-emerald-500 text-white font-bold text-xs tracking-[0.15em] uppercase hover:bg-emerald-400 hover:scale-105 active:scale-95 transition-all shadow-[0_10px_30px_rgba(16,185,129,0.35)]"
                >
                  <Play className="w-4 h-4 fill-current" />
                  Watch Online
                </Link>
              ) : movie.available ? (
                <Link
                  href={`/player/${movie.id}`}
                  className="group w-full sm:w-fit inline-flex justify-center items-center gap-3 px-8 py-4 rounded-full bg-white text-black font-bold text-xs tracking-[0.15em] uppercase hover:bg-white/90 hover:scale-105 active:scale-95 transition-all shadow-[0_10px_35px_rgba(255,255,255,0.3)]"
                >
                  <Play className="w-4 h-4 fill-current" />
                  {progressPercent > 0 ? "Resume" : "Watch Now"}
                </Link>
              ) : (
                <div className="glass-md inline-flex items-center justify-center gap-3 px-8 py-4 rounded-full text-white/45 font-bold text-xs tracking-[0.15em] uppercase cursor-not-allowed">
                  <HardDrive className="w-4 h-4" />
                  Drive Offline
                </div>
              )}

              {/* Trailer Glass Pill */}
              <a
                href={youtubeUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="glass-md group w-full sm:w-fit inline-flex justify-center items-center gap-3 px-7 py-4 rounded-full text-white/90 hover:text-white font-bold text-xs tracking-[0.15em] uppercase hover:bg-white/15 hover:scale-105 active:scale-95 transition-all"
              >
                <Sparkles className="w-4 h-4 text-white/70 transition-transform group-hover:rotate-12" />
                Watch the Trailer
              </a>

              {/* Play on PC Glass Pill + Popover */}
              {showPlayOnPc && movie.source !== "online" && (
                <div className="relative" ref={playOnPcRef}>
                  <button
                    onClick={() => setShowPlayOnPcMenu((v) => !v)}
                    title="Play on PC"
                    className="glass-md w-full sm:w-13 h-13 rounded-full inline-flex justify-center items-center text-white/90 hover:text-white hover:bg-white/20 hover:scale-105 active:scale-95 transition-all cursor-pointer"
                  >
                    <MonitorPlay className="w-4 h-4 text-sky-300" />
                  </button>

                  {showPlayOnPcMenu && (
                    <div className="glass-heavy absolute bottom-full left-1/2 -translate-x-1/2 mb-3 w-56 rounded-2xl p-1.5 z-50 animate-in fade-in zoom-in-95 duration-200">
                      <button
                        onClick={async () => {
                          setShowPlayOnPcMenu(false);
                          await fetch("/api/play-local", {
                            method: "POST",
                            body: JSON.stringify({
                              mediaId: movie.id,
                              player: "default",
                            }),
                          });
                        }}
                        className="w-full px-3 py-2.5 text-xs text-left text-white/85 hover:text-white hover:bg-white/10 rounded-xl transition-colors flex items-center gap-3 cursor-pointer"
                      >
                        <MonitorPlay className="w-4 h-4 text-sky-400" />
                        <span className="font-medium">Default Player</span>
                      </button>

                      {(movie.watch_progress || 0) > 0 ? (
                        <div className="relative">
                          <button
                            onClick={() => setShowVlcSubmenu((v) => !v)}
                            className="w-full px-3 py-2.5 text-xs text-left text-white/85 hover:text-white hover:bg-white/10 rounded-xl transition-colors flex items-center justify-between gap-3 cursor-pointer"
                          >
                            <div className="flex items-center gap-3">
                              <Monitor className="w-4 h-4 text-orange-400" />
                              <span className="font-medium">VLC Media Player</span>
                            </div>
                            <ChevronRight className="w-3.5 h-3.5 text-white/40" />
                          </button>

                          {showVlcSubmenu && (
                            <div className="glass-heavy absolute left-full top-0 ml-2 w-44 rounded-2xl p-1.5 z-50">
                              <button
                                onClick={async () => {
                                  setShowPlayOnPcMenu(false);
                                  await fetch("/api/play-local", {
                                    method: "POST",
                                    body: JSON.stringify({
                                      mediaId: movie.id,
                                      player: "vlc",
                                      startTime: movie.watch_progress,
                                    }),
                                  });
                                }}
                                className="w-full px-3 py-2 text-xs text-left text-white/90 hover:bg-white/10 rounded-xl transition-colors cursor-pointer"
                              >
                                Resume ({Math.floor((movie.watch_progress || 0) / 60)}m)
                              </button>
                              <button
                                onClick={async () => {
                                  setShowPlayOnPcMenu(false);
                                  await fetch("/api/play-local", {
                                    method: "POST",
                                    body: JSON.stringify({
                                      mediaId: movie.id,
                                      player: "vlc",
                                    }),
                                  });
                                }}
                                className="w-full px-3 py-2 text-xs text-left text-white/90 hover:bg-white/10 rounded-xl transition-colors cursor-pointer"
                              >
                                Start Over
                              </button>
                            </div>
                          )}
                        </div>
                      ) : (
                        <button
                          onClick={async () => {
                            setShowPlayOnPcMenu(false);
                            await fetch("/api/play-local", {
                              method: "POST",
                              body: JSON.stringify({
                                mediaId: movie.id,
                                player: "vlc",
                              }),
                            });
                          }}
                          className="w-full px-3 py-2.5 text-xs text-left text-white/85 hover:text-white hover:bg-white/10 rounded-xl transition-colors flex items-center gap-3 cursor-pointer"
                        >
                          <Monitor className="w-4 h-4 text-orange-400" />
                          <span className="font-medium">VLC Media Player</span>
                        </button>
                      )}

                      {customVideoPlayers.length > 0 && (
                        <div className="h-[1px] w-full bg-white/10 my-1" />
                      )}
                      {customVideoPlayers.map((cp) => (
                        <button
                          key={`custom-${cp.id}`}
                          onClick={async () => {
                            setShowPlayOnPcMenu(false);
                            await fetch("/api/play-local", {
                              method: "POST",
                              body: JSON.stringify({
                                mediaId: movie.id,
                                player: cp.id,
                              }),
                            });
                          }}
                          className="w-full px-3 py-2.5 text-xs text-left text-white/85 hover:text-white hover:bg-white/10 rounded-xl transition-colors flex items-center gap-3 cursor-pointer"
                        >
                          <MonitorPlay className="w-4 h-4 text-emerald-400" />
                          <span className="font-medium">{cp.name}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* ── Right Column: Floating Poster Widget (glass-surface) ────── */}
          <div className="hidden lg:flex w-[370px] xl:w-[410px] flex-col justify-end items-end flex-shrink-0 pointer-events-auto gap-2.5">
            {enableAutoTrailerBg && movie.source !== "online" && (
              <button
                onClick={() => setIsTrailerHidden(!isTrailerHidden)}
                title={isTrailerHidden ? "Show Background Trailer" : "Show Static Backdrop"}
                className="glass-md flex items-center gap-2 px-3.5 py-1.5 rounded-full text-white/85 hover:text-white hover:bg-white/15 hover:scale-105 active:scale-95 transition-all text-xs font-semibold cursor-pointer shadow-xl mb-1"
              >
                {isTrailerHidden ? (
                  <>
                    <Film className="w-3.5 h-3.5 text-white" />
                    <span>Play Trailer</span>
                  </>
                ) : (
                  <>
                    <ImageIcon className="w-3.5 h-3.5 text-white" />
                    <span>Backdrop View</span>
                  </>
                )}
              </button> 
            )}

            <div
              onClick={() => setMenuOpen(true)}
              title="Click for full synopsis & details"
              className="glass-surface w-full group p-4 rounded-[28px] flex flex-col gap-4 transition-all duration-300 hover:scale-[1.02] hover:bg-white/[0.09] cursor-pointer"
            >
              <div className="flex items-center gap-5">
                {/* Poster Thumbnail */}
                <div className="relative w-28 h-40 rounded-2xl overflow-hidden border border-white/15 shadow-2xl flex-shrink-0">
                  <Image
                    src={posterSrc}
                    alt={movie.title}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-500"
                    sizes="112px"
                  />
                </div>

                {/* Compact Info Lockup */}
                <div className="min-w-0 flex-1 space-y-1.5">
                  <div className="glass inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-semibold tracking-wider uppercase text-white/75">
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        movie.available ? "bg-emerald-400" : "bg-rose-400"
                      }`}
                    />
                    {movie.available ? "Ready" : "Offline"}
                  </div>

                  <p className="text-white font-bold text-2xl leading-tight truncate">
                    {movie.title}
                  </p>

                  <div className="flex items-center gap-2 text-xs text-white/55 flex-wrap font-medium">
                    {rawRating && (
                      <span className="flex items-center gap-1 text-amber-300 font-semibold">
                        <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                        {rawRating}
                      </span>
                    )}
                    {movie.year && <span>• {movie.year}</span>}
                    {runtimeFormatted && <span>• {runtimeFormatted}</span>}
                  </div>

                  <p className="text-[11px] text-white/40 truncate pt-0.5">
                    {movie.genres
                      ?.split(",")
                      .slice(0, 3)
                      .map((g) => g.trim())
                      .join(" · ")}
                  </p>
                </div>
              </div>

              {/* Progress Scrubber if in progress */}
              {progressPercent > 0 && (
                <div className="pt-1 border-t border-white/10">
                  <div className="flex justify-between text-[10px] text-white/55 mb-1.5 font-medium">
                    <span>Continue Watching</span>
                    <span>{Math.round(progressPercent)}%</span>
                  </div>
                  <div className="h-1 w-full bg-white/15 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-white rounded-full shadow-[0_0_8px_#fff]"
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ─── Floating Glass Slide Drawer (glass-heavy) ────────────────── */}
      <div
        className={`fixed inset-0 bg-black/60 backdrop-blur-md z-[100] transition-opacity duration-500 ${
          menuOpen
            ? "opacity-100 pointer-events-auto"
            : "opacity-0 pointer-events-none"
        }`}
        onClick={() => setMenuOpen(false)}
      />

      <aside
        className={`glass-heavy fixed top-3 right-3 bottom-3 w-[calc(100%-1.5rem)] md:w-[420px] rounded-[32px] z-[110] transform transition-transform duration-500 cubic-bezier(0.16, 1, 0.3, 1) flex flex-col overflow-hidden ${
          menuOpen ? "translate-x-0" : "translate-x-[calc(100%+2rem)]"
        }`}
      >
        {/* Drawer Header */}
        <div className="flex items-center justify-between px-7 py-6 border-b border-white/[0.08]">
          <span className="text-[10px] font-bold tracking-[0.28em] uppercase text-white/45">
            About This Movie
          </span>
          <button
            onClick={() => setMenuOpen(false)}
            className="glass-md w-9 h-9 rounded-full flex items-center justify-center text-white/70 hover:text-white hover:scale-105 active:scale-95 transition-all cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Drawer Scrollable Body */}
        <div className="flex-1 overflow-y-auto no-scrollbar p-7 space-y-7 select-text">
          {/* Poster + Title Header */}
          <div className="flex gap-5">
            <div className="relative w-24 h-36 rounded-2xl overflow-hidden border border-white/15 shadow-2xl flex-shrink-0">
              <Image
                src={posterSrc}
                alt={movie.title}
                fill
                className="object-cover"
              />
            </div>
            <div className="min-w-0 flex-1 flex flex-col justify-center">
              <h3 className="text-xl font-bold text-white leading-tight mb-1.5">
                {movie.title}
              </h3>
              <div className="flex items-center gap-2 text-xs text-white/50 flex-wrap font-medium">
                {rawRating && (
                  <span className="flex items-center gap-1 text-amber-300 font-semibold">
                    <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                    {rawRating}
                  </span>
                )}
                {movie.year && <span>• {movie.year}</span>}
                {runtimeFormatted && <span>• {runtimeFormatted}</span>}
              </div>
              <div className="flex flex-wrap gap-1.5 mt-3">
                {movie.genres?.split(",").map((g, i) => (
                  <span
                    key={i}
                    className="glass px-2.5 py-0.5 rounded-full text-[10px] text-white/70 font-medium"
                  >
                    {g.trim()}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Synopsis */}
          {movie.overview && (
            <div>
              <h4 className="text-[10px] font-bold tracking-[0.25em] uppercase text-white/35 mb-2.5">
                Synopsis
              </h4>
              <p className="text-sm text-white/75 leading-relaxed font-normal">
                {movie.overview}
              </p>
            </div>
          )}

          {/* Runtime & Year Glass Cards */}
          <div className="grid grid-cols-2 gap-3">
            <div className="glass p-4 text-center rounded-2xl">
              <Clock className="w-4 h-4 text-white/40 mx-auto mb-1.5" />
              <span className="text-base font-bold text-white">
                {runtimeFormatted || "—"}
              </span>
              <p className="text-[9px] text-white/35 mt-0.5 uppercase tracking-widest">
                Runtime
              </p>
            </div>
            <div className="glass p-4 text-center rounded-2xl">
              <Calendar className="w-4 h-4 text-white/40 mx-auto mb-1.5" />
              <span className="text-base font-bold text-white">
                {movie.year || "—"}
              </span>
              <p className="text-[9px] text-white/35 mt-0.5 uppercase tracking-widest">
                Release Year
              </p>
            </div>
          </div>

          {/* Availability & Source File */}
          <div className="space-y-4">
            <div>
              <h4 className="text-[10px] font-bold tracking-[0.25em] uppercase text-white/35 mb-2.5">
                Availability
              </h4>
              <div className="glass flex items-center gap-3.5 p-4 rounded-2xl">
                <div
                  className={`w-2.5 h-2.5 rounded-full ${
                    movie.available
                      ? "bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.6)]"
                      : "bg-rose-400 shadow-[0_0_10px_rgba(244,63,94,0.5)]"
                  }`}
                />
                <div>
                  <p className="text-sm font-semibold text-white/90">
                    {movie.available ? "Ready to watch" : "Drive offline"}
                  </p>
                  <p className="text-[11px] text-white/40 mt-0.5">
                    Source:{" "}
                    {movie.source === "online"
                      ? "Web Stream"
                      : movie.source === "hdd"
                      ? "External Drive"
                      : "Local Storage"}
                  </p>
                </div>
              </div>
            </div>

            {movie.filepath && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-[10px] font-bold tracking-[0.25em] uppercase text-white/35">
                    Source File
                  </h4>
                  <button
                    onClick={handleCopyPath}
                    className="text-[11px] text-white/60 hover:text-white flex items-center gap-1 cursor-pointer"
                  >
                    {copiedPath ? (
                      <>
                        <Check className="w-3 h-3 text-emerald-400" />
                        <span className="text-emerald-400">Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" />
                        <span>Copy</span>
                      </>
                    )}
                  </button>
                </div>
                <div className="bg-black/40 border border-white/[0.08] rounded-2xl p-3.5">
                  <p className="text-[11px] font-mono text-white/50 break-all select-all">
                    {movie.filepath}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Quick Actions */}
          <div className="pt-2 space-y-2.5">
            {movie.omdb_id && (
              <a
                href={`https://www.imdb.com/title/${movie.omdb_id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="glass flex items-center justify-between w-full p-3.5 rounded-2xl text-white/75 hover:text-white hover:bg-white/[0.08] transition-all text-xs font-semibold"
              >
                <span>View IMDb Profile</span>
                <ExternalLink className="w-4 h-4 text-white/40" />
              </a>
            )}

            {movie.available && (
              <button
                onClick={() => {
                  setShowPartyModal(true);
                  setMenuOpen(false);
                }}
                className="glass flex items-center justify-between w-full p-3.5 rounded-2xl text-white/75 hover:text-white hover:bg-white/[0.08] transition-all text-xs font-semibold cursor-pointer"
              >
                <span>Start Watch Party</span>
                <Users className="w-4 h-4 text-violet-300" />
              </button>
            )}
          </div>
        </div>
      </aside>

      {/* ─── Modals ────────────────────────────────────────────────────── */}
      <WatchPartyModal
        isOpen={showPartyModal}
        onClose={() => setShowPartyModal(false)}
        initialMedia={movie as any}
      />

      {showEditModal && (
        <EditTitleModal
          media={{
            id: movie.id,
            filename: movie.filename,
            title: movie.title,
            type: "movie",
            poster: movie.poster,
            backdrop: movie.backdrop,
          }}
          onClose={() => {
            setShowEditModal(false);
            loadMovie();
          }}
        />
      )}
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <div className="glass-md px-6 py-4 rounded-full flex items-center gap-3.5">
        <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
        <span className="text-xs text-white/70 font-semibold tracking-[0.2em] uppercase">
          Loading Movie...
        </span>
      </div>
    </div>
  );
}

function NotFound() {
  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center px-8 text-center">
      <div className="glass-surface max-w-sm w-full p-10 rounded-[32px] space-y-6">
        <h1 className="text-7xl font-black text-white/15 leading-none">404</h1>
        <p className="text-white/55 text-sm">
          This movie couldn&apos;t be found in your library.
        </p>
        <Link
          href="/movies"
          className="inline-flex items-center gap-2 px-7 py-3.5 rounded-full bg-white text-black font-bold text-xs tracking-[0.15em] uppercase hover:bg-white/90 hover:scale-105 transition-all"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Movies</span>
        </Link>
      </div>
    </div>
  );
}