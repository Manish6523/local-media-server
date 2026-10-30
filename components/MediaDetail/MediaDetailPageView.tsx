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
  Layers,
  ChevronDown,
} from "lucide-react";
import { useBackground } from "@/components/BackgroundContext";
import dynamic from "next/dynamic";
import AutoTrailerInline from "@/components/AutoTrailerInline";
import EpisodeThumbnail from "@/components/EpisodeThumbnail";
import HoverPreview from "@/components/HoverPreview";
import type { MediaEntry } from "@/lib/db";
import {
  GLASS_BUTTON_STYLE,
  GLASS_CARD_STYLE,
  GLASS_PANEL_STYLE,
  PLAYER_PILL_GLASS_STYLE,
} from "@/components/Player/playerStyles";

const WatchPartyModal = dynamic(
  () => import("@/components/WatchParty/WatchPartyModal"),
  { ssr: false }
);

const EditTitleModal = dynamic(
  () => import("@/components/EditTitleModal"),
  { ssr: false }
);

function splitTitle(title: string): [string, string] {
  const words = title.trim().split(/\s+/);
  if (words.length <= 1) return [title, ""];
  if (words.length === 2) return [words[0], " " + words[1]];
  const mid = Math.ceil(words.length / 2);
  return [words.slice(0, mid).join(" "), " " + words.slice(mid).join(" ")];
}

function formatRuntime(minutes: number | null): string {
  if (!minutes) return "";
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

interface MediaDetailPageViewProps {
  mediaType: "movie" | "show";
}

export default function MediaDetailPageView({ mediaType }: MediaDetailPageViewProps) {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const imdbId = searchParams.get("imdb");
  const slug = params.slug as string;

  // Movie or Single Media item
  const [movie, setMovie] = useState<MediaEntry | null>(null);

  // Show-specific state
  const [episodes, setEpisodes] = useState<MediaEntry[]>([]);
  const [tvmazeEpisodes, setTvmazeEpisodes] = useState<any[]>([]);
  const [activeSeason, setActiveSeason] = useState<number>(1);
  const [hoveredEp, setHoveredEp] = useState<number | null>(null);
  const [selectedEpisodeForParty, setSelectedEpisodeForParty] = useState<MediaEntry | null>(null);
  const [drawerTab, setDrawerTab] = useState<"episodes" | "details">(
    mediaType === "show" ? "episodes" : "details"
  );

  // Common UI State
  const [loading, setLoading] = useState(true);
  const [showPartyModal, setShowPartyModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [showPlayOnPcMenu, setShowPlayOnPcMenu] = useState(false);
  const [showVlcSubmenu, setShowVlcSubmenu] = useState(false);
  const [activePcMenuEpId, setActivePcMenuEpId] = useState<number | null>(null);
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

  // Load Data
  const loadData = () => {
    setLoading(true);

    if (mediaType === "movie") {
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
    } else {
      // Show / Series
      if (imdbId) {
        fetch(`/api/online-details?imdb=${imdbId}&type=show`)
          .then((r) => r.json())
          .then((data) => {
            if (!data.error) {
              setEpisodes([data]);
              setMovie(data);
              setIsFavorite(Boolean(data.is_favorite));
              setBgImage(data.backdrop || data.poster || null);

              // Fetch TVMaze episodes for online shows
              fetch(`/api/shows/${imdbId}/episodes`)
                .then((r) => r.json())
                .then((epData) => {
                  if (Array.isArray(epData) && epData.length > 0) {
                    setTvmazeEpisodes(epData);
                    const sea = [
                      ...new Set(epData.map((e: any) => e.season).filter(Boolean)),
                    ].sort((a: any, b: any) => a - b);
                    if (sea.length > 0) setActiveSeason(sea[0]);
                  }
                })
                .catch(() => {});
            } else {
              setEpisodes([]);
              setMovie(null);
            }
          })
          .catch(() => {
            setEpisodes([]);
            setMovie(null);
          })
          .finally(() => setLoading(false));
      } else {
        fetch("/api/media?type=show")
          .then((r) => r.json())
          .then((data: MediaEntry[]) => {
            const filtered = data.filter(
              (m: MediaEntry) =>
                m.title.toLowerCase().replace(/\s+/g, "-") === decodeURIComponent(slug)
            );
            setEpisodes(filtered);
            if (filtered.length > 0) {
              setMovie(filtered[0]);
              setIsFavorite(Boolean(filtered[0].is_favorite));
              setBgImage(filtered[0].backdrop || filtered[0].poster || null);
              const sea = [
                ...new Set(filtered.map((e: MediaEntry) => e.season).filter(Boolean)),
              ].sort((a, b) => (a ?? 0) - (b ?? 0));
              if (sea.length > 0) setActiveSeason(sea[0] ?? 1);
            }
          })
          .catch(() => {
            setEpisodes([]);
            setMovie(null);
          })
          .finally(() => setLoading(false));
      }
    }
  };

  useEffect(() => {
    loadData();
  }, [slug, setBgImage, imdbId, mediaType]);

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
    if (isTogglingFav || !primaryItem) return;
    setIsTogglingFav(true);
    const newStatus = !isFavorite;
    setIsFavorite(newStatus);

    try {
      await fetch("/api/favorite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mediaId: primaryItem.id,
          isFavorite: newStatus,
        }),
      });
    } catch {
      setIsFavorite(!newStatus);
    } finally {
      setIsTogglingFav(false);
    }
  };

  const handleCopyPath = () => {
    const path = primaryItem?.filepath || (episodes[0]?.filepath ?? "");
    if (!path) return;
    navigator.clipboard.writeText(path);
    setCopiedPath(true);
    setTimeout(() => setCopiedPath(false), 2000);
  };

  if (loading) return <LoadingSkeleton isShow={mediaType === "show"} />;
  if (mediaType === "movie" && !movie) return <NotFound isShow={false} />;
  if (mediaType === "show" && episodes.length === 0) return <NotFound isShow={true} />;

  const primaryItem = mediaType === "movie" ? movie! : episodes[0]!;
  const isOnline = primaryItem.source === "online";
  const posterSrc = primaryItem.poster || "/placeholder.jpg";
  const bgImage = primaryItem.backdrop || primaryItem.poster || "/placeholder.jpg";

  // Seasons & Episodes calculation for Shows
  const seasons =
    mediaType === "show"
      ? isOnline
        ? [...new Set(tvmazeEpisodes.map((e) => e.season).filter(Boolean))].sort(
            (a, b) => a - b
          )
        : [...new Set(episodes.map((e) => e.season).filter(Boolean))].sort(
            (a, b) => (a ?? 0) - (b ?? 0)
          )
      : [];

  const seasonEpisodes =
    mediaType === "show"
      ? isOnline
        ? tvmazeEpisodes
            .filter((e) => e.season === activeSeason)
            .sort((a, b) => (a.number ?? 0) - (b.number ?? 0))
        : episodes
            .filter((e) => e.season === activeSeason)
            .sort((a, b) => (a.episode_start ?? 0) - (b.episode_start ?? 0))
      : [];

  // Resume or First available episode for show
  const inProgressEp =
    mediaType === "show"
      ? episodes.find(
          (e) => (e.watch_progress || 0) > 0 && !(e.is_watched || false) && e.available
        )
      : null;
  const firstAvailableEp =
    mediaType === "show"
      ? inProgressEp || episodes.find((e) => e.available) || episodes[0]
      : null;

  // Watch progress for movie or active show episode
  const progressPercent =
    mediaType === "movie"
      ? primaryItem.watch_progress && primaryItem.runtime
        ? Math.min(
            100,
            (primaryItem.watch_progress / (primaryItem.runtime * 60)) * 100
          )
        : 0
      : inProgressEp && inProgressEp.runtime
      ? Math.min(
          100,
          ((inProgressEp.watch_progress || 0) / (inProgressEp.runtime * 60)) * 100
        )
      : 0;

  const runtimeFormatted = formatRuntime(primaryItem.runtime);
  const [titleA, titleB] = splitTitle(primaryItem.title);
  const rawRating = primaryItem.rating ? primaryItem.rating.split("/")[0].trim() : null;
  const youtubeUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(
    primaryItem.title + " trailer"
  )}`;

  return (
    <div className="relative h-[100dvh] -mb-24 lg:mb-0 flex flex-col overflow-hidden bg-black text-white select-none">
      {/* ─── Immersive Full-Screen Background ──────────────────────────── */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <Image
          src={bgImage}
          alt={primaryItem.title}
          fill
          className="object-cover object-top opacity-60 scale-105 transition-transform duration-1000"
          sizes="100vw"
          priority
        />

        {/* Inline Auto-Trailer (Movies) */}
        {mediaType === "movie" && enableAutoTrailerBg && (
          <AutoTrailerInline
            mediaId={primaryItem.id}
            exactDuration={
              primaryItem.exactDuration || (primaryItem.runtime ? primaryItem.runtime * 60 : 0)
            }
            isOnline={primaryItem.source === "online"}
            isVideoHidden={isTrailerHidden}
            onToggleVideoHidden={setIsTrailerHidden}
            hideToggle={true}
          />
        )}
      </div>

      {/* ─── Foreground Zero-Scroll Stage ──────────────────────────────── */}
      <div className="relative z-10 flex-1 flex flex-col justify-between pointer-events-none min-h-0">
        {/* ─── Top Bar (glass-md Pills) ─────────────────────────────────── */}
        <header className="flex items-center justify-between px-4 sm:px-8 md:px-10 lg:px-14 pt-4 sm:pt-6 md:pt-9 pointer-events-auto gap-2">
          {/* Left: Back Pill + Fast Navigation Icons (Home, Series/Movies) */}
          <div
            className="glass-md flex items-center rounded-full p-1.5 gap-1 shadow-lg flex-shrink-0"
            style={PLAYER_PILL_GLASS_STYLE}
          >
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

            {/* Alternate Media Navigation (Series for movies, Movies for shows) */}
            <Link
              href={mediaType === "movie" ? "/shows" : "/movies"}
              title={mediaType === "movie" ? "Series" : "Movies"}
              className="flex items-center justify-center w-8 h-8 rounded-full text-white/80 hover:text-white hover:bg-white/15 hover:scale-105 active:scale-95 transition-all cursor-pointer"
            >
              {mediaType === "movie" ? (
                <Tv className="w-4 h-4 text-white" />
              ) : (
                <Film className="w-4 h-4 text-white" />
              )}
            </Link>

            {/* Media Title Breadcrumb (hidden on mobile to prevent overlapping) */}
            <span className="hidden md:inline-block w-[1px] h-4 bg-white/15" />
            <span className="hidden md:inline-block text-white/80 text-[11px] font-semibold tracking-[0.22em] uppercase truncate max-w-[120px] lg:max-w-xs px-2.5">
              {primaryItem.title}
            </span>
          </div>

          {/* Center: Details Trigger Pill (shown when space permits, md+) */}
          <button
            onClick={() => {
              if (mediaType === "show") setDrawerTab("episodes");
              setMenuOpen(true);
            }}
            title={mediaType === "movie" ? "About This Movie" : "Episodes & Details"}
            className="glass-md hidden md:flex absolute left-1/2 -translate-x-1/2 px-5 h-10 items-center justify-center gap-2.5 rounded-full hover:bg-white/15 hover:scale-105 active:scale-95 transition-all cursor-pointer shadow-lg"
            style={PLAYER_PILL_GLASS_STYLE}
          >
            <div className="flex flex-col gap-[4px] items-center">
              <span className="block w-4 h-[1.5px] rounded-full bg-white/80" />
              <span className="block w-2.5 h-[1.5px] rounded-full bg-white/60" />
            </div>
            <span className="text-[10px] font-semibold tracking-[0.2em] uppercase text-white/75">
              {mediaType === "movie" ? "Details" : "Episodes & Info"}
            </span>
          </button>

          {/* Right: Unified Utility Capsule (matches Left Nav Pill) */}
          <div
            className="glass-md flex items-center rounded-full p-1.5 gap-1 shadow-lg flex-shrink-0"
            style={PLAYER_PILL_GLASS_STYLE}
          >
            {mediaType === "movie" && enableAutoTrailerBg && primaryItem.source !== "online" && (
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

            {primaryItem.source !== "online" && (
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

            {primaryItem.available ? (
              <>
                <span className="w-[1px] h-4 bg-white/15" />
                <button
                  onClick={() => {
                    if (mediaType === "show" && firstAvailableEp) {
                      setSelectedEpisodeForParty(firstAvailableEp);
                    }
                    setShowPartyModal(true);
                  }}
                  title="Watch Party"
                  className="flex items-center justify-center w-8 h-8 rounded-full text-white/80 hover:text-white hover:bg-white/15 hover:scale-105 active:scale-95 transition-all cursor-pointer"
                >
                  <Users className="w-4 h-4 text-white" />
                </button>
              </>
            ) : null}

            {enableEditMode && primaryItem.source !== "online" && (
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
        <div className="flex-1 flex flex-col lg:flex-row items-stretch px-4 sm:px-8 md:px-10 lg:px-14 pb-16 sm:pb-20 lg:pb-12 gap-6 lg:gap-12 min-h-0">
          {/* ── Left Column: Mini Frame + Two-Tone Title + Actions ────── */}
          <div className="flex-1 flex flex-col justify-end min-w-0 pointer-events-auto">
            {/* Mobile Poster & Metadata Pill Row */}
            <div className="lg:hidden mb-2.5 sm:mb-4">
              <div
                className="glass-md inline-flex items-center gap-2.5 px-3 py-1 sm:px-3.5 sm:py-1.5 rounded-full text-[11px] sm:text-xs font-medium text-white/85"
                style={PLAYER_PILL_GLASS_STYLE}
              >
                <span
                  className={`w-2 h-2 rounded-full ${
                    primaryItem.available ? "bg-emerald-400" : "bg-rose-400"
                  }`}
                />
                <span className="tracking-wider uppercase text-[10px] sm:text-[11px] font-semibold">
                  {primaryItem.available
                    ? mediaType === "show"
                      ? "Series Ready"
                      : "Ready to Watch"
                    : "Offline"}
                </span>
                {primaryItem.year && (
                  <span className="text-white/40">• {primaryItem.year}</span>
                )}
                {mediaType === "movie" && runtimeFormatted && (
                  <span className="text-white/40">• {runtimeFormatted}</span>
                )}
                {mediaType === "show" && seasons.length > 0 && (
                  <span className="text-white/40">
                    • {seasons.length} {seasons.length === 1 ? "Season" : "Seasons"}
                  </span>
                )}
              </div>
            </div>

            {/* Desktop Format / Status Badge */}
            <div className="hidden lg:flex items-center gap-3 mb-4">
              <div
                className="glass px-3.5 py-1 rounded-full text-[10px] font-bold tracking-[0.25em] uppercase text-white/75 flex items-center gap-2"
                style={PLAYER_PILL_GLASS_STYLE}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    primaryItem.available
                      ? "bg-emerald-400 shadow-[0_0_8px_#34d399]"
                      : "bg-rose-400 shadow-[0_0_8px_#f43f5e]"
                  }`}
                />
                {primaryItem.available
                  ? mediaType === "show"
                    ? "SERIES COLLECTION"
                    : "4K ULTRA HD • HDR"
                  : "DRIVE OFFLINE"}
              </div>

              {primaryItem.source !== "online" && (
                <div
                  className="glass px-3 py-1 rounded-full text-[10px] font-semibold tracking-widest uppercase text-white/50"
                  style={PLAYER_PILL_GLASS_STYLE}
                >
                  {primaryItem.source === "hdd" ? "External HDD" : "Local Storage"}
                </div>
              )}
            </div>

            {/* Grand Bold Title */}
            <h1 className="text-3xl sm:text-5xl md:text-6xl lg:text-7xl xl:text-8xl font-black tracking-tight leading-[0.96] uppercase mb-2 sm:mb-3.5 text-white drop-shadow-[0_4px_24px_rgba(0,0,0,0.85)]">
              {primaryItem.title}
            </h1>

            {/* Metadata Bar */}
            <div className="flex items-center gap-2.5 sm:gap-4 text-xs md:text-sm text-white/60 mb-2.5 sm:mb-4 flex-wrap font-medium">
              {rawRating && (
                <div className="flex items-center gap-1.5 text-amber-300 font-semibold">
                  <Star className="w-3.5 h-3.5 sm:w-4 sm:h-4 fill-amber-400 text-amber-400" />
                  <span>{rawRating}</span>
                </div>
              )}

              {primaryItem.year && (
                <>
                  {rawRating && <span>•</span>}
                  <span>{primaryItem.year}</span>
                </>
              )}

              {mediaType === "movie" && runtimeFormatted && (
                <>
                  {(rawRating || primaryItem.year) && <span>•</span>}
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-white/40" />
                    <span>{runtimeFormatted}</span>
                  </div>
                </>
              )}

              {mediaType === "show" && seasons.length > 0 && (
                <>
                  {(rawRating || primaryItem.year) && <span>•</span>}
                  <div className="flex items-center gap-1.5">
                    <Tv className="w-3.5 h-3.5 text-white/40" />
                    <span>
                      {seasons.length} {seasons.length === 1 ? "Season" : "Seasons"}
                    </span>
                  </div>
                </>
              )}

              {primaryItem.genres && (
                <>
                  {(rawRating || primaryItem.year || runtimeFormatted || seasons.length > 0) && (
                    <span>•</span>
                  )}
                  <span className="text-white/50 truncate max-w-[240px] sm:max-w-none">
                    {primaryItem.genres
                      .split(",")
                      .slice(0, 3)
                      .map((g) => g.trim())
                      .join(" · ")}
                  </span>
                </>
              )}
            </div>

            {/* Tagline or Synopsis Teaser */}
            {primaryItem.overview && (
              <p className="text-xs sm:text-sm text-white/70 max-w-xl line-clamp-2 md:line-clamp-3 leading-relaxed mb-3.5 sm:mb-6 font-normal">
                {primaryItem.overview}
              </p>
            )}

            {/* ─── Hero Action Buttons ─────────────────────────────────── */}
            <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
              {/* Primary Play Button */}
              {mediaType === "movie" ? (
                // Movie Play
                primaryItem.source === "online" ? (
                  <Link
                    href={`/player/online?imdb=${primaryItem.omdb_id}&type=movie`}
                    className="px-5 sm:px-7 py-2.5 sm:py-3.5 rounded-full flex items-center gap-2.5 sm:gap-3 bg-white text-black hover:bg-white/90 hover:scale-105 active:scale-95 transition-all text-xs md:text-sm font-extrabold tracking-wider uppercase cursor-pointer shadow-[0_0_25px_rgba(255,255,255,0.4)]"
                  >
                    <Play className="w-4 h-4 fill-black text-black" />
                    <span className="text-black font-extrabold">Stream Online</span>
                  </Link>
                ) : primaryItem.available ? (
                  <Link
                    href={`/player/${primaryItem.id}`}
                    className="px-5 sm:px-7 py-2.5 sm:py-3.5 rounded-full flex items-center gap-2.5 sm:gap-3 bg-white text-black hover:bg-white/90 hover:scale-105 active:scale-95 transition-all text-xs md:text-sm font-extrabold tracking-wider uppercase cursor-pointer shadow-[0_0_25px_rgba(255,255,255,0.4)]"
                  >
                    <Play className="w-4 h-4 fill-black text-black" />
                    <span className="text-black font-extrabold">{progressPercent > 0 ? "Resume Movie" : "Play Movie"}</span>
                  </Link>
                ) : (
                  <div
                    className="glass px-5 sm:px-6 py-2.5 sm:py-3.5 rounded-full flex items-center gap-2.5 text-white/40 cursor-not-allowed text-xs font-semibold uppercase tracking-wider"
                    style={PLAYER_PILL_GLASS_STYLE}
                  >
                    <HardDrive className="w-4 h-4" />
                    <span>Drive Offline</span>
                  </div>
                )
              ) : (
                // Series Play (Resume / Next Episode)
                isOnline ? (
                  <Link
                    href={
                      tvmazeEpisodes.length > 0
                        ? `/player/online?imdb=${primaryItem.omdb_id}&type=show&s=${tvmazeEpisodes[0].season}&e=${tvmazeEpisodes[0].number}`
                        : `/player/online?imdb=${primaryItem.omdb_id}&type=show&s=1&e=1`
                    }
                    className="px-5 sm:px-7 py-2.5 sm:py-3.5 rounded-full flex items-center gap-2.5 sm:gap-3 bg-white text-black hover:bg-white/90 hover:scale-105 active:scale-95 transition-all text-xs md:text-sm font-extrabold tracking-wider uppercase cursor-pointer shadow-[0_0_25px_rgba(255,255,255,0.4)]"
                  >
                    <Play className="w-4 h-4 fill-black text-black" />
                    <span className="text-black font-extrabold">
                      {tvmazeEpisodes.length > 0
                        ? `Watch S${tvmazeEpisodes[0].season} E${tvmazeEpisodes[0].number}`
                        : "Watch Online (S1 E1)"}
                    </span>
                  </Link>
                ) : firstAvailableEp?.available ? (
                  <Link
                    href={`/player/${firstAvailableEp.id}`}
                    className="px-5 sm:px-7 py-2.5 sm:py-3.5 rounded-full flex items-center gap-2.5 sm:gap-3 bg-white text-black hover:bg-white/90 hover:scale-105 active:scale-95 transition-all text-xs md:text-sm font-extrabold tracking-wider uppercase cursor-pointer shadow-[0_0_25px_rgba(255,255,255,0.4)]"
                  >
                    <Play className="w-4 h-4 fill-black text-black" />
                    <span className="text-black font-extrabold">
                      {inProgressEp
                        ? `Resume S${inProgressEp.season}:E${inProgressEp.episode_start}`
                        : `Play S${firstAvailableEp.season}:E${firstAvailableEp.episode_start}`}
                    </span>
                  </Link>
                ) : (
                  <div
                    className="glass px-5 sm:px-6 py-2.5 sm:py-3.5 rounded-full flex items-center gap-2.5 text-white/40 cursor-not-allowed text-xs font-semibold uppercase tracking-wider"
                    style={PLAYER_PILL_GLASS_STYLE}
                  >
                    <HardDrive className="w-4 h-4" />
                    <span>Drive Offline</span>
                  </div>
                )
              )}

              {/* Show-Specific: Episodes & Seasons Drawer Trigger */}
              {mediaType === "show" && (
                <button
                  onClick={() => {
                    setDrawerTab("episodes");
                    setMenuOpen(true);
                  }}
                  className="glass-md px-3.5 sm:px-5 py-2.5 sm:py-3.5 rounded-full flex items-center gap-2 sm:gap-2.5 text-white hover:text-white hover:bg-white/15 hover:scale-105 active:scale-95 transition-all text-xs font-semibold tracking-wide uppercase cursor-pointer"
                  style={PLAYER_PILL_GLASS_STYLE}
                >
                  <Layers className="w-4 h-4 text-white" />
                  <span>
                    Episodes ({seasonEpisodes.length})
                  </span>
                </button>
              )}

              {/* Trailer Button (YouTube) */}
              <a
                href={youtubeUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="glass-md px-3.5 sm:px-5 py-2.5 sm:py-3.5 rounded-full flex items-center gap-2 sm:gap-2.5 text-white hover:text-white hover:bg-white/15 hover:scale-105 active:scale-95 transition-all text-xs font-semibold tracking-wide uppercase cursor-pointer"
                style={PLAYER_PILL_GLASS_STYLE}
              >
                <Film className="w-4 h-4 text-white" />
                <span>Trailer</span>
              </a>

              {/* Play on PC Button (with Dropdown) */}
              {primaryItem.source !== "online" &&
                showPlayOnPc &&
                (mediaType === "movie" ? primaryItem.available : firstAvailableEp?.available) && (
                  <div className="relative" ref={playOnPcRef}>
                    <button
                      onClick={() => setShowPlayOnPcMenu(!showPlayOnPcMenu)}
                      className="glass-md px-3.5 sm:px-4 py-2.5 sm:py-3.5 rounded-full flex items-center gap-2 text-white/90 hover:text-white hover:bg-white/15 hover:scale-105 active:scale-95 transition-all text-xs font-semibold tracking-wide uppercase cursor-pointer"
                      style={PLAYER_PILL_GLASS_STYLE}
                      title="Play with external PC media player"
                    >
                      <MonitorPlay className="w-4 h-4 text-white" />
                      <span className="hidden sm:inline">Play on PC</span>
                      <ChevronDown
                        className={`w-3.5 h-3.5 transition-transform duration-200 ${
                          showPlayOnPcMenu ? "rotate-180" : ""
                        }`}
                      />
                    </button>

                    {/* Glass Popover Menu */}
                    {showPlayOnPcMenu && (
                      <div
                        className="glass-heavy absolute bottom-full left-0 mb-2 w-56 p-1.5 rounded-2xl shadow-2xl z-50 animate-in fade-in zoom-in-95 duration-150"
                        style={GLASS_PANEL_STYLE}
                      >
                        <button
                          onClick={async () => {
                            setShowPlayOnPcMenu(false);
                            const idToPlay =
                              mediaType === "movie" ? primaryItem.id : firstAvailableEp!.id;
                            await fetch("/api/play-local", {
                              method: "POST",
                              body: JSON.stringify({ mediaId: idToPlay, player: "default" }),
                            });
                          }}
                          className="w-full px-3 py-2.5 text-xs text-left text-white/85 hover:text-white hover:bg-white/10 rounded-xl transition-colors flex items-center gap-3 cursor-pointer"
                        >
                          <MonitorPlay className="w-4 h-4 text-white" />
                          <span className="font-medium">Default Player</span>
                        </button>

                        <div className="h-[1px] w-full bg-white/10 my-1" />

                        {/* VLC Options */}
                        <div
                          className="relative"
                          onMouseEnter={() => setShowVlcSubmenu(true)}
                          onMouseLeave={() => setShowVlcSubmenu(false)}
                        >
                          <button className="w-full px-3 py-2.5 text-xs text-left text-white/85 hover:text-white hover:bg-white/10 rounded-xl transition-colors flex items-center justify-between cursor-pointer">
                            <div className="flex items-center gap-3">
                              <Monitor className="w-4 h-4 text-white" />
                              <span className="font-medium">VLC Media Player</span>
                            </div>
                            <ChevronRight className="w-3.5 h-3.5 text-white/40" />
                          </button>

                          {showVlcSubmenu && (
                            <div className="glass-heavy absolute left-full bottom-0 ml-1.5 w-44 p-1.5 rounded-2xl shadow-2xl z-50">
                              {progressPercent > 0 && (
                                <button
                                  onClick={async () => {
                                    setShowPlayOnPcMenu(false);
                                    setShowVlcSubmenu(false);
                                    const ep =
                                      mediaType === "movie" ? primaryItem : firstAvailableEp!;
                                    await fetch("/api/play-local", {
                                      method: "POST",
                                      body: JSON.stringify({
                                        mediaId: ep.id,
                                        player: "vlc",
                                        startTime: ep.watch_progress,
                                      }),
                                    });
                                  }}
                                  className="w-full px-3 py-2 text-xs text-left text-white/85 hover:text-white hover:bg-white/10 rounded-xl transition-colors cursor-pointer"
                                >
                                  Resume (
                                  {Math.floor(
                                    ((mediaType === "movie"
                                      ? primaryItem.watch_progress
                                      : firstAvailableEp?.watch_progress) || 0) / 60
                                  )}
                                  m)
                                </button>
                              )}
                              <button
                                onClick={async () => {
                                  setShowPlayOnPcMenu(false);
                                  setShowVlcSubmenu(false);
                                  const idToPlay =
                                    mediaType === "movie" ? primaryItem.id : firstAvailableEp!.id;
                                  await fetch("/api/play-local", {
                                    method: "POST",
                                    body: JSON.stringify({
                                      mediaId: idToPlay,
                                      player: "vlc",
                                    }),
                                  });
                                }}
                                className="w-full px-3 py-2 text-xs text-left text-white/85 hover:text-white hover:bg-white/10 rounded-xl transition-colors cursor-pointer"
                              >
                                Play from Start
                              </button>
                            </div>
                          )}
                        </div>

                        {customVideoPlayers.length > 0 && (
                          <div className="h-[1px] w-full bg-white/10 my-1" />
                        )}
                        {customVideoPlayers.map((cp) => (
                          <button
                            key={`custom-${cp.id}`}
                            onClick={async () => {
                              setShowPlayOnPcMenu(false);
                              const idToPlay =
                                mediaType === "movie" ? primaryItem.id : firstAvailableEp!.id;
                              await fetch("/api/play-local", {
                                method: "POST",
                                body: JSON.stringify({
                                  mediaId: idToPlay,
                                  player: cp.id,
                                }),
                              });
                            }}
                            className="w-full px-3 py-2.5 text-xs text-left text-white/85 hover:text-white hover:bg-white/10 rounded-xl transition-colors flex items-center gap-3 cursor-pointer"
                          >
                            <MonitorPlay className="w-4 h-4 text-white" />
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
            {/* Backdrop View / Play Trailer Pill (Movies with Trailer) */}
            {mediaType === "movie" && enableAutoTrailerBg && primaryItem.source !== "online" && (
              <button
                onClick={() => setIsTrailerHidden(!isTrailerHidden)}
                title={isTrailerHidden ? "Show Background Trailer" : "Show Static Backdrop"}
                className="glass-md flex items-center gap-2 px-3.5 py-1.5 rounded-full text-white/85 hover:text-white hover:bg-white/15 hover:scale-105 active:scale-95 transition-all text-xs font-semibold cursor-pointer shadow-xl mb-1"
                style={PLAYER_PILL_GLASS_STYLE}
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

            {/* Poster Card Widget */}
            <div
              onClick={() => {
                if (mediaType === "show") setDrawerTab("episodes");
                setMenuOpen(true);
              }}
              title="Click for full synopsis & details"
              className="glass-surface w-full group p-4 rounded-[28px] flex flex-col gap-4 transition-all duration-300 hover:scale-[1.02] hover:bg-white/[0.09] cursor-pointer"
              style={GLASS_CARD_STYLE}
            >
              <div className="flex items-center gap-5">
                {/* Poster Thumbnail */}
                <div className="relative w-28 h-40 rounded-2xl overflow-hidden border border-white/15 shadow-2xl flex-shrink-0">
                  <Image
                    src={posterSrc}
                    alt={primaryItem.title}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-500"
                    sizes="112px"
                  />
                </div>

                {/* Compact Info Lockup */}
                <div className="min-w-0 flex-1 space-y-1.5">
                  <div
                    className="glass inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-semibold tracking-wider uppercase text-white/75"
                    style={PLAYER_PILL_GLASS_STYLE}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        primaryItem.available ? "bg-emerald-400" : "bg-rose-400"
                      }`}
                    />
                    {primaryItem.available
                      ? mediaType === "show"
                        ? "Series Ready"
                        : "Ready"
                      : "Offline"}
                  </div>

                  <p className="text-white font-bold text-2xl leading-tight truncate">
                    {primaryItem.title}
                  </p>

                  <div className="flex items-center gap-2 text-xs text-white/55 flex-wrap font-medium">
                    {rawRating && (
                      <span className="flex items-center gap-1 text-amber-300 font-semibold">
                        <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                        {rawRating}
                      </span>
                    )}
                    {primaryItem.year && <span>• {primaryItem.year}</span>}
                    {mediaType === "movie" && runtimeFormatted && (
                      <span>• {runtimeFormatted}</span>
                    )}
                    {mediaType === "show" && seasons.length > 0 && (
                      <span>
                        • {seasons.length} {seasons.length === 1 ? "Season" : "Seasons"}
                      </span>
                    )}
                  </div>

                  <p className="text-[11px] text-white/40 truncate pt-0.5">
                    {primaryItem.genres
                      ?.split(",")
                      .slice(0, 3)
                      .map((g) => g.trim())
                      .join(" · ")}
                  </p>
                </div>
              </div>

              {/* Progress Scrubber */}
              {progressPercent > 0 && (
                <div className="pt-1 border-t border-white/10">
                  <div className="flex justify-between text-[10px] text-white/55 mb-1.5 font-medium">
                    <span>
                      {mediaType === "show" && inProgressEp
                        ? `Continue S${inProgressEp.season}:E${inProgressEp.episode_start}`
                        : "Continue Watching"}
                    </span>
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
        className={`fixed inset-0 bg-black/65 backdrop-blur-md z-[100] transition-opacity duration-500 ${
          menuOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
        onClick={() => setMenuOpen(false)}
      />

      <aside
        className={`glass-heavy fixed inset-x-0 bottom-0 top-14 sm:top-3 sm:right-3 sm:bottom-3 sm:left-auto sm:w-[580px] md:w-[740px] lg:w-[840px] xl:w-[920px] rounded-t-[32px] sm:rounded-[32px] z-[110] transform transition-all duration-500 cubic-bezier(0.16, 1, 0.3, 1) flex flex-col overflow-hidden shadow-2xl border border-white/10 ${
          menuOpen
            ? "translate-y-0 sm:translate-y-0 sm:translate-x-0 opacity-100"
            : "translate-y-full sm:translate-y-0 sm:translate-x-[calc(100%+2rem)] opacity-0 sm:opacity-100 pointer-events-none"
        }`}
        style={GLASS_PANEL_STYLE}
      >
        {/* Drawer Atmospheric Header with Backdrop */}
        <div className="relative border-b border-white/[0.08] flex-shrink-0 overflow-hidden bg-zinc-950">
          {/* Mini Backdrop Image with dark gradient */}
          <div className="absolute inset-0 pointer-events-none">
            <Image
              src={bgImage}
              alt={primaryItem.title}
              fill
              className="object-cover opacity-25 filter blur-[2px] scale-105"
              sizes="640px"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-black/85 to-[#0b0c10]/95" />
          </div>

          {/* Header Top Controls */}
          <div className="relative z-10 flex items-center justify-between px-4 sm:px-6 pt-4 sm:pt-5 pb-2.5 sm:pb-3">
            {mediaType === "show" ? (
              <div className="flex items-center gap-1.5 bg-black/50 backdrop-blur-md p-1 rounded-full border border-white/10 shadow-lg">
                <button
                  onClick={() => setDrawerTab("episodes")}
                  className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold tracking-wider uppercase transition-all cursor-pointer ${
                    drawerTab === "episodes"
                      ? "bg-white text-black shadow-lg shadow-white/20"
                      : "text-white/60 hover:text-white"
                  }`}
                >
                  <Layers className="w-3.5 h-3.5" />
                  <span>Episodes</span>
                </button>
                <button
                  onClick={() => setDrawerTab("details")}
                  className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold tracking-wider uppercase transition-all cursor-pointer ${
                    drawerTab === "details"
                      ? "bg-white text-black shadow-lg shadow-white/20"
                      : "text-white/60 hover:text-white"
                  }`}
                >
                  <Info className="w-3.5 h-3.5" />
                  <span>About Series</span>
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-black/50 backdrop-blur-md border border-white/10 shadow-lg">
                <Film className="w-3.5 h-3.5 text-white/70" />
                <span className="text-xs font-bold tracking-wider uppercase text-white/80">
                  Movie Details
                </span>
              </div>
            )}

            {/* Close Button */}
            <button
              onClick={() => setMenuOpen(false)}
              className="w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center bg-white/10 hover:bg-white/20 text-white/80 hover:text-white hover:rotate-90 active:scale-95 transition-all duration-300 cursor-pointer border border-white/10 shadow-lg"
              style={PLAYER_PILL_GLASS_STYLE}
              title="Close Drawer"
            >
              <X className="w-4 h-4 text-white" />
            </button>
          </div>

          {/* Header Media Quick Summary Bar */}
          <div className="relative z-10 px-4 sm:px-6 pb-3 sm:pb-5 pt-1.5 sm:pt-2 flex items-center gap-3.5 sm:gap-4">
            <div className="relative w-12 h-16 rounded-xl overflow-hidden border border-white/15 shadow-xl flex-shrink-0 bg-zinc-900">
              <Image
                src={posterSrc}
                alt={primaryItem.title}
                fill
                className="object-cover"
                sizes="48px"
              />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="text-base sm:text-lg font-black text-white truncate tracking-tight">
                {primaryItem.title}
              </h2>
              <div className="flex items-center gap-2 text-xs text-white/60 mt-0.5 flex-wrap font-medium">
                {rawRating && (
                  <span className="flex items-center gap-1 text-amber-300 font-semibold">
                    <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                    {rawRating}
                  </span>
                )}
                {primaryItem.year && <span>• {primaryItem.year}</span>}
                {mediaType === "show" && seasons.length > 0 && (
                  <span>
                    • {seasons.length} {seasons.length === 1 ? "Season" : "Seasons"}
                  </span>
                )}
                {mediaType === "movie" && runtimeFormatted && <span>• {runtimeFormatted}</span>}
                <span className="text-white/40">
                  • {primaryItem.source === "online" ? "Web Stream" : "Local Storage"}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Drawer Scrollable Body */}
        <div className="flex-1 overflow-y-auto no-scrollbar px-3.5 py-4 sm:p-6 space-y-4 sm:space-y-6 select-text">
          {/* ── SHOW EPISODES VIEW ────────────────────────────────────── */}
          {mediaType === "show" && drawerTab === "episodes" && (
            <div className="space-y-5">
              {/* Season Pills Selector */}
              {seasons.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
                    {seasons.map((season) => {
                      const count = (
                        isOnline
                          ? tvmazeEpisodes.filter((e) => e.season === season)
                          : episodes.filter((e) => e.season === season)
                      ).length;
                      const isSelected = activeSeason === season;
                      return (
                        <button
                          key={season}
                          onClick={() => setActiveSeason(season ?? 1)}
                          className={`px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wider whitespace-nowrap transition-all duration-200 cursor-pointer flex items-center gap-2 ${
                            isSelected
                              ? "bg-white text-black shadow-lg shadow-white/20 scale-[1.02]"
                              : "glass text-white/70 hover:text-white hover:bg-white/15"
                          }`}
                          style={!isSelected ? PLAYER_PILL_GLASS_STYLE : undefined}
                        >
                          <span>Season {season}</span>
                          <span
                            className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                              isSelected
                                ? "bg-black/15 text-black"
                                : "bg-white/10 text-white/70"
                            }`}
                          >
                            {count}
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Season Headline Bar */}
                  <div className="flex items-center justify-between px-1 text-[11px] font-bold tracking-widest uppercase text-white/40">
                    <span>
                      Season {activeSeason} • {seasonEpisodes.length} Episodes
                    </span>
                    <span>
                      ~{seasonEpisodes.reduce((a, b) => a + (b.runtime || 0), 0)} min total
                    </span>
                  </div>
                </div>
              )}

              {/* Episodes List */}
              {isOnline && tvmazeEpisodes.length === 0 ? (
                <div className="py-16 text-center text-white/40 flex flex-col items-center gap-3">
                  <div className="w-10 h-10 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                  <p className="text-xs uppercase tracking-widest font-semibold">
                    Loading Episodes...
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 sm:gap-4">
                  {seasonEpisodes.map((ep) => {
                    if (isOnline) {
                      // TVMaze Online Episode
                      return (
                        <div
                          key={`tvm-${ep.id}`}
                          className="glass group p-3 sm:p-3.5 rounded-2xl flex flex-col gap-2.5 sm:gap-3 hover:bg-white/[0.08] border border-white/[0.08] hover:border-white/20 transition-all duration-300"
                          style={GLASS_CARD_STYLE}
                        >
                          <div className="relative w-full aspect-video rounded-xl overflow-hidden bg-zinc-950 border border-white/10 shadow-md group-hover:scale-[1.01] transition-transform duration-300">
                            <Image
                              src={
                                ep.image?.original ||
                                ep.image?.medium ||
                                primaryItem.backdrop ||
                                primaryItem.poster ||
                                "/placeholder.jpg"
                              }
                              alt={ep.name || `Episode ${ep.number}`}
                              fill
                              className="object-cover"
                              sizes="(max-width: 768px) 100vw, 600px"
                            />
                            {/* Episode Tag */}
                            <div className="absolute top-2.5 left-2.5 px-2 py-0.5 rounded-md bg-black/75 backdrop-blur-md border border-white/10 text-[11px] font-bold text-white shadow-md">
                              EP {ep.number}
                            </div>
                            {ep.runtime ? (
                              <div className="absolute bottom-2.5 right-2.5 px-2 py-0.5 rounded-md bg-black/75 backdrop-blur-md border border-white/10 text-[11px] font-medium text-white/80 shadow-md">
                                {ep.runtime}m
                              </div>
                            ) : null}
                            <Link
                              href={`/player/online?imdb=${primaryItem.omdb_id}&type=show&s=${ep.season}&e=${ep.number}`}
                              className="absolute inset-0 flex items-center justify-center bg-black/40 group-hover:bg-black/20 transition-colors"
                            >
                              <div
                                className="glass-md w-11 h-11 sm:w-12 sm:h-12 rounded-full text-white flex items-center justify-center group-hover:scale-110 group-hover:bg-white/25 transition-all shadow-xl border border-white/20"
                                style={GLASS_BUTTON_STYLE}
                              >
                                <Play className="w-5 h-5 fill-white text-white ml-0.5 drop-shadow-md" />
                              </div>
                            </Link>
                          </div>

                          <div className="flex items-start justify-between gap-3 pt-0.5">
                            <div className="min-w-0 flex-1">
                              <h4 className="text-base font-bold text-white group-hover:text-amber-200 transition-colors truncate">
                                {ep.number}. {ep.name}
                              </h4>
                              <p className="text-xs text-white/50 mt-0.5">
                                Season {ep.season} • Episode {ep.number}
                                {ep.runtime ? ` • ${ep.runtime}m` : ""}
                              </p>
                            </div>
                            <Link
                              href={`/player/online?imdb=${primaryItem.omdb_id}&type=show&s=${ep.season}&e=${ep.number}`}
                              className="glass-md px-3.5 sm:px-4 py-1.5 rounded-full text-white hover:text-white hover:bg-white/20 hover:scale-105 active:scale-95 transition-all text-xs font-extrabold flex items-center gap-1.5 shadow-md flex-shrink-0 border border-white/20"
                              style={GLASS_BUTTON_STYLE}
                            >
                              <Play className="w-3.5 h-3.5 fill-white text-white" />
                              <span className="text-white font-extrabold">Play</span>
                            </Link>
                          </div>
                        </div>
                      );
                    }

                    // Local Episode
                    const epProgress =
                      ep.watch_progress && ep.runtime
                        ? Math.min(100, (ep.watch_progress / (ep.runtime * 60)) * 100)
                        : 0;

                    return (
                      <div
                        key={ep.id}
                        className={`glass group p-3 sm:p-3.5 rounded-2xl flex flex-col gap-2.5 sm:gap-3 transition-all duration-300 border border-white/[0.08] hover:border-white/20 ${
                          !ep.available
                            ? "opacity-40 grayscale pointer-events-none"
                            : "hover:bg-white/[0.08]"
                        }`}
                        style={GLASS_CARD_STYLE}
                        onMouseEnter={() => setHoveredEp(ep.id)}
                        onMouseLeave={() => setHoveredEp(null)}
                      >
                        {/* 1. TOP: Full-width 16:9 Thumbnail Image */}
                        <div className="relative w-full aspect-video rounded-xl overflow-hidden bg-zinc-950 border border-white/10 shadow-md group-hover:scale-[1.01] transition-transform duration-300">
                          <EpisodeThumbnail
                            mediaAssetId={ep.id}
                            fallbackSrc={
                              ep.backdrop || primaryItem.backdrop || "/placeholder.jpg"
                            }
                            alt={`Episode ${ep.episode_start}`}
                            sizes="(max-width: 768px) 100vw, 600px"
                            className="object-cover"
                            filepath={ep.filepath}
                            isAvailable={!!ep.available}
                          />
                          {ep.available && (
                            <HoverPreview
                              mediaId={ep.id}
                              runtime={ep.runtime}
                              exactDuration={ep.exactDuration}
                              isHovered={hoveredEp === ep.id}
                            />
                          )}

                          {/* Episode Tag */}
                          <div className="absolute top-2.5 left-2.5 px-2 py-0.5 rounded-md bg-black/75 backdrop-blur-md border border-white/10 text-[11px] font-bold text-white z-10 shadow-md">
                            EP {ep.episode_start}
                          </div>
                          {ep.runtime ? (
                            <div className="absolute bottom-2.5 right-2.5 px-2 py-0.5 rounded-md bg-black/75 backdrop-blur-md border border-white/10 text-[11px] font-medium text-white/80 z-10 shadow-md">
                              {ep.runtime}m
                            </div>
                          ) : null}

                          {ep.available ? (
                            <Link
                              href={`/player/${ep.id}`}
                              className="absolute inset-0 flex items-center justify-center bg-black/40 group-hover:bg-black/20 transition-colors z-10"
                            >
                              <div
                                className="glass-md w-11 h-11 sm:w-12 sm:h-12 rounded-full text-white flex items-center justify-center group-hover:scale-110 group-hover:bg-white/25 transition-all shadow-xl border border-white/20"
                                style={GLASS_BUTTON_STYLE}
                              >
                                <Play className="w-5 h-5 fill-white text-white ml-0.5 drop-shadow-md" />
                              </div>
                            </Link>
                          ) : (
                            <div className="absolute inset-0 flex items-center justify-center bg-black/50 z-10">
                              <HardDrive className="w-6 h-6 text-rose-400" />
                            </div>
                          )}

                          {/* Integrated thumbnail progress bar */}
                          {epProgress > 0 && (
                            <div className="absolute bottom-0 inset-x-0 h-1.5 bg-white/20 z-20">
                              <div
                                className="h-full bg-white shadow-[0_0_8px_#fff]"
                                style={{ width: `${epProgress}%` }}
                              />
                            </div>
                          )}
                        </div>

                        {/* 2. BOTTOM: Episode Details & Action Buttons */}
                        <div className="flex flex-col gap-2 pt-0.5">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0 flex-1">
                              <h4 className="text-base font-bold text-white group-hover:text-amber-200 transition-colors truncate">
                                {ep.title && ep.title !== primaryItem.title
                                  ? ep.title
                                  : `Episode ${ep.episode_start}`}
                              </h4>
                              <p className="text-xs text-white/50 mt-0.5">
                                Episode #{ep.episode_start}
                                {ep.episode_end && ep.episode_end !== ep.episode_start
                                  ? `-${ep.episode_end}`
                                  : ""}{" "}
                                {ep.runtime ? `• ${ep.runtime}m` : ""}
                              </p>
                            </div>

                            {/* Primary Action Button (Play / Resume) */}
                            {ep.available && (
                              <Link
                                href={`/player/${ep.id}`}
                                className="glass-md px-3.5 sm:px-4 py-1.5 rounded-full text-white hover:text-white hover:bg-white/20 hover:scale-105 active:scale-95 transition-all text-xs font-extrabold flex items-center gap-1.5 shadow-md flex-shrink-0 border border-white/20"
                                style={GLASS_BUTTON_STYLE}
                              >
                                <Play className="w-3.5 h-3.5 fill-white text-white" />
                                <span className="text-white font-extrabold">
                                  {epProgress > 0 ? "Resume" : "Play"}
                                </span>
                              </Link>
                            )}
                          </div>

                          {/* Secondary Actions: Play on PC & Watch Party */}
                          <div className="flex items-center gap-2 pt-1 flex-wrap">
                            {ep.available && showPlayOnPc && (
                              <div className="relative">
                                <button
                                  onClick={(e) => {
                                    e.preventDefault();
                                    setActivePcMenuEpId(
                                      activePcMenuEpId === ep.id ? null : ep.id
                                    );
                                  }}
                                  className="px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/20 text-xs font-medium text-white/80 hover:text-white flex items-center gap-1.5 transition-colors cursor-pointer border border-white/10"
                                  title="Play episode on PC"
                                >
                                  <MonitorPlay className="w-3.5 h-3.5 text-white" />
                                  <span>PC</span>
                                </button>

                                {activePcMenuEpId === ep.id && (
                                  <div
                                    className="glass-heavy absolute left-0 bottom-full mb-1.5 w-44 p-1.5 rounded-2xl shadow-2xl z-50 border border-white/10"
                                    style={GLASS_PANEL_STYLE}
                                  >
                                    <button
                                      onClick={async () => {
                                        setActivePcMenuEpId(null);
                                        await fetch("/api/play-local", {
                                          method: "POST",
                                          body: JSON.stringify({
                                            mediaId: ep.id,
                                            player: "default",
                                          }),
                                        });
                                      }}
                                      className="w-full px-2.5 py-1.5 text-xs text-left text-white/85 hover:text-white hover:bg-white/10 rounded-xl transition-colors cursor-pointer"
                                    >
                                      Default Player
                                    </button>
                                    <button
                                      onClick={async () => {
                                        setActivePcMenuEpId(null);
                                        await fetch("/api/play-local", {
                                          method: "POST",
                                          body: JSON.stringify({
                                            mediaId: ep.id,
                                            player: "vlc",
                                          }),
                                        });
                                      }}
                                      className="w-full px-2.5 py-1.5 text-xs text-left text-white/85 hover:text-white hover:bg-white/10 rounded-xl transition-colors cursor-pointer"
                                    >
                                      VLC Player
                                    </button>
                                  </div>
                                )}
                              </div>
                            )}

                            {ep.available && (
                              <button
                                onClick={() => {
                                  setSelectedEpisodeForParty(ep);
                                  setShowPartyModal(true);
                                }}
                                className="px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/20 text-xs font-medium text-white/80 hover:text-white flex items-center gap-1.5 transition-colors cursor-pointer border border-white/10"
                                title="Watch Party for this episode"
                              >
                                <Users className="w-3.5 h-3.5 text-white" />
                                <span>Party</span>
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Season Overview Glass Card (Gracefully fills empty space) */}
              <div
                className="glass p-4 sm:p-5 rounded-2xl border border-white/10 space-y-3 sm:space-y-3.5 mt-4"
                style={GLASS_CARD_STYLE}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Layers className="w-4 h-4 text-white/50" />
                    <h4 className="text-xs font-bold tracking-widest uppercase text-white/60">
                      Season {activeSeason} Overview
                    </h4>
                  </div>
                  <span className="glass px-2.5 py-0.5 rounded-full text-[10px] font-semibold text-emerald-400">
                    {seasonEpisodes.filter((e) => e.available).length} of {seasonEpisodes.length} Ready
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2.5 text-center">
                  <div className="bg-white/[0.04] p-2.5 rounded-xl border border-white/[0.06]">
                    <span className="text-sm font-bold text-white">{seasonEpisodes.length}</span>
                    <p className="text-[9px] uppercase tracking-wider text-white/40 mt-0.5">Episodes</p>
                  </div>
                  <div className="bg-white/[0.04] p-2.5 rounded-xl border border-white/[0.06]">
                    <span className="text-sm font-bold text-white">
                      ~{seasonEpisodes.reduce((a, b) => a + (b.runtime || 0), 0)}m
                    </span>
                    <p className="text-[9px] uppercase tracking-wider text-white/40 mt-0.5">Runtime</p>
                  </div>
                  <div className="bg-white/[0.04] p-2.5 rounded-xl border border-white/[0.06]">
                    <span className="text-sm font-bold text-white">
                      {primaryItem.source === "online" ? "Web" : "Local HD"}
                    </span>
                    <p className="text-[9px] uppercase tracking-wider text-white/40 mt-0.5">Format</p>
                  </div>
                </div>

                {primaryItem.overview && (
                  <p className="text-xs text-white/60 leading-relaxed font-normal line-clamp-3">
                    {primaryItem.overview}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* ── DETAILS VIEW (Common for Movies & Series About Tab) ───── */}
          {(mediaType === "movie" || drawerTab === "details") && (
            <div className="space-y-6">
              {/* Poster + Title Lockup */}
              <div className="flex gap-5 items-center">
                <div className="relative w-24 h-36 rounded-2xl overflow-hidden border border-white/15 shadow-2xl flex-shrink-0 bg-zinc-900">
                  <Image
                    src={posterSrc}
                    alt={primaryItem.title}
                    fill
                    className="object-cover"
                    sizes="96px"
                  />
                </div>
                <div className="min-w-0 flex-1 flex flex-col justify-center">
                  <h3 className="text-xl font-bold text-white leading-tight mb-1.5">
                    {primaryItem.title}
                  </h3>
                  <div className="flex items-center gap-2 text-xs text-white/50 flex-wrap font-medium">
                    {rawRating && (
                      <span className="flex items-center gap-1 text-amber-300 font-semibold">
                        <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                        {rawRating}
                      </span>
                    )}
                    {primaryItem.year && <span>• {primaryItem.year}</span>}
                    {mediaType === "movie" && runtimeFormatted && (
                      <span>• {runtimeFormatted}</span>
                    )}
                    {mediaType === "show" && seasons.length > 0 && (
                      <span>
                        • {seasons.length} {seasons.length === 1 ? "Season" : "Seasons"}
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-1.5 mt-3">
                    {primaryItem.genres?.split(",").map((g, i) => (
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
              {primaryItem.overview && (
                <div>
                  <h4 className="text-[10px] font-bold tracking-[0.25em] uppercase text-white/40 mb-2.5">
                    Synopsis
                  </h4>
                  <p className="text-sm text-white/75 leading-relaxed font-normal">
                    {primaryItem.overview}
                  </p>
                </div>
              )}

              {/* Key Stats Cards */}
              <div className="grid grid-cols-2 gap-3">
                <div
                  className="glass p-4 text-center rounded-2xl border border-white/[0.08]"
                  style={GLASS_CARD_STYLE}
                >
                  {mediaType === "movie" ? (
                    <>
                      <Clock className="w-4 h-4 text-white/40 mx-auto mb-1.5" />
                      <span className="text-base font-bold text-white">
                        {runtimeFormatted || "—"}
                      </span>
                      <p className="text-[9px] text-white/35 mt-0.5 uppercase tracking-widest">
                        Runtime
                      </p>
                    </>
                  ) : (
                    <>
                      <Tv className="w-4 h-4 text-white/40 mx-auto mb-1.5" />
                      <span className="text-base font-bold text-white">
                        {seasons.length} {seasons.length === 1 ? "Season" : "Seasons"}
                      </span>
                      <p className="text-[9px] text-white/35 mt-0.5 uppercase tracking-widest">
                        Total Seasons
                      </p>
                    </>
                  )}
                </div>

                <div
                  className="glass p-4 text-center rounded-2xl border border-white/[0.08]"
                  style={GLASS_CARD_STYLE}
                >
                  <Calendar className="w-4 h-4 text-white/40 mx-auto mb-1.5" />
                  <span className="text-base font-bold text-white">
                    {primaryItem.year || "—"}
                  </span>
                  <p className="text-[9px] text-white/35 mt-0.5 uppercase tracking-widest">
                    Release Year
                  </p>
                </div>
              </div>

              {/* Availability & Source File */}
              <div className="space-y-4">
                <div>
                  <h4 className="text-[10px] font-bold tracking-[0.25em] uppercase text-white/40 mb-2.5">
                    Availability
                  </h4>
                  <div
                    className="glass flex items-center gap-3.5 p-4 rounded-2xl border border-white/[0.08]"
                    style={GLASS_CARD_STYLE}
                  >
                    <div
                      className={`w-2.5 h-2.5 rounded-full ${
                        primaryItem.available
                          ? "bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.6)]"
                          : "bg-rose-400 shadow-[0_0_10px_rgba(244,63,94,0.5)]"
                      }`}
                    />
                    <div>
                      <p className="text-sm font-semibold text-white/90">
                        {primaryItem.available ? "Ready to watch" : "Drive offline"}
                      </p>
                      <p className="text-[11px] text-white/40 mt-0.5">
                        Source:{" "}
                        {primaryItem.source === "online"
                          ? "Web Stream"
                          : primaryItem.source === "hdd"
                          ? "External Drive"
                          : "Local Storage"}
                      </p>
                    </div>
                  </div>
                </div>

                {(primaryItem.filepath || episodes[0]?.filepath) && (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-[10px] font-bold tracking-[0.25em] uppercase text-white/40">
                        Source File
                      </h4>
                      <button
                        onClick={handleCopyPath}
                        className="text-[11px] text-white/60 hover:text-white flex items-center gap-1 cursor-pointer transition-colors"
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
                    <div
                      className="glass p-3.5 rounded-2xl border border-white/[0.08]"
                      style={GLASS_CARD_STYLE}
                    >
                      <p className="text-[11px] font-mono text-white/50 break-all select-all">
                        {primaryItem.filepath || episodes[0]?.filepath}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </aside>

      {/* ─── Watch Party Modal ────────────────────────────────────────── */}
      <WatchPartyModal
        isOpen={showPartyModal}
        onClose={() => setShowPartyModal(false)}
        initialMedia={
          mediaType === "movie"
            ? (primaryItem as any)
            : ((selectedEpisodeForParty || firstAvailableEp || primaryItem) as any)
        }
      />

      {/* ─── Edit Metadata Modal ──────────────────────────────────────── */}
      {showEditModal && (
        <EditTitleModal
          media={{
            id: primaryItem.id,
            filename: primaryItem.filename || primaryItem.filepath || "",
            title: primaryItem.title,
            type: mediaType,
            poster: primaryItem.poster,
            backdrop: primaryItem.backdrop,
          }}
          onClose={() => {
            setShowEditModal(false);
            loadData();
          }}
        />
      )}
    </div>
  );
}

function LoadingSkeleton({ isShow }: { isShow: boolean }) {
  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center gap-4">
      <div className="relative">
        <div className="w-14 h-14 rounded-full border-2 border-white/10 border-t-white animate-spin" />
        {isShow ? (
          <Tv className="w-6 h-6 text-white/30 absolute inset-0 m-auto" />
        ) : (
          <Film className="w-6 h-6 text-white/30 absolute inset-0 m-auto" />
        )}
      </div>
      <p className="text-xs font-semibold tracking-widest text-white/40 uppercase animate-pulse">
        {isShow ? "Loading Series..." : "Loading Movie..."}
      </p>
    </div>
  );
}

function NotFound({ isShow }: { isShow: boolean }) {
  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center px-6 text-center">
      <div className="glass-surface max-w-md w-full p-8 sm:p-10 rounded-[32px] space-y-6 text-center">
        <div className="w-16 h-16 rounded-full glass flex items-center justify-center mx-auto text-white/40">
          {isShow ? <Tv className="w-8 h-8" /> : <Film className="w-8 h-8" />}
        </div>
        <div>
          <h2 className="text-2xl font-bold text-white mb-2">
            {isShow ? "Series Not Found" : "Movie Not Found"}
          </h2>
          <p className="text-xs text-white/50 leading-relaxed">
            The requested title could not be found in your local collection or online databases.
          </p>
        </div>
        <Link
          href={isShow ? "/shows" : "/movies"}
          className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-white text-black font-bold text-xs uppercase tracking-wider hover:bg-white/90 transition-all cursor-pointer shadow-lg"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>{isShow ? "Back to Series" : "Back to Movies"}</span>
        </Link>
      </div>
    </div>
  );
}
