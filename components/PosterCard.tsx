"use client";

import Image from "next/image";
import Link from "next/link";
import { Play, Star, Pencil, Users, Check, MonitorPlay, Monitor, ChevronRight, Globe } from "lucide-react";
import { useState, useEffect } from "react";
import FavoriteButton from "./FavoriteButton";
import EditTitleModal from "./EditTitleModal";
import AdminPinGate from "./AdminPinGate";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import HoverPreview from "./HoverPreview";

const CreateRoomModal = dynamic(() => import("./WatchParty/CreateRoomModal"), { ssr: false });

let adminStatusPromise: Promise<boolean> | null = null;

function useAdminUnlocked() {
  const [isUnlocked, setIsUnlocked] = useState(false);

  useEffect(() => {
    const checkStatus = async () => {
      if (sessionStorage.getItem('admin_unlocked') === 'true') {
        setIsUnlocked(true);
        return;
      }

      if (!adminStatusPromise) {
        adminStatusPromise = fetch('/api/admin/pin-status')
          .then(r => r.json())
          .then(data => !data.enabled)
          .catch(() => false);
      }

      const unlocked = await adminStatusPromise;
      setIsUnlocked(unlocked);
    };

    checkStatus();
  }, []);

  return isUnlocked;
}

let configPromise: Promise<{ customVideoPlayers: any[], showPlayOnPc: boolean }> | null = null;

function useConfig() {
  const [config, setConfig] = useState<{ customVideoPlayers: any[], showPlayOnPc: boolean }>({ customVideoPlayers: [], showPlayOnPc: true });

  useEffect(() => {
    const fetchConfig = async () => {
      if (!configPromise) {
        configPromise = fetch(`/api/config?t=${Date.now()}`, { cache: "no-store" })
          .then(r => r.json())
          .then(data => ({
            customVideoPlayers: data.customVideoPlayers || [],
            showPlayOnPc: data.showPlayOnPc !== false
          }))
          .catch(() => ({ customVideoPlayers: [], showPlayOnPc: true }));
      }
      const loaded = await configPromise;
      setConfig(loaded);
    };

    fetchConfig();
  }, []);

  return config;
}

import type { MediaEntry } from "@/lib/db";

interface PosterCardProps {
  media: MediaEntry;
  showEpisodeInfo?: boolean;
  variant?: "poster" | "landscape";
  selectionMode?: boolean;
  isSelected?: boolean;
  onToggleSelect?: (id: number) => void;
}

export default function PosterCard({ media, showEpisodeInfo = false, variant = "poster", selectionMode = false, isSelected = false, onToggleSelect }: PosterCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [showWatchParty, setShowWatchParty] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const router = useRouter();
  const isUnlocked = useAdminUnlocked();
  const { customVideoPlayers, showPlayOnPc } = useConfig();

  const posterSrc = media.poster || "/placeholder.jpg";
  const isUnavailable = !media.available;

  const progressPercent = media.watch_progress && media.runtime
    ? Math.min(100, Math.max(0, (media.watch_progress / (media.runtime * 60)) * 100))
    : 0;

  const slug = encodeURIComponent(media.title.toLowerCase().replace(/\s+/g, "-"));
  const href = `/${media.type === "movie" ? "movies" : "shows"}/${slug}${media.source === "online" ? `?imdb=${media.omdb_id}` : ""
    }`;

  // ─── Landscape Card Variant ──────────────────────────────────
  if (variant === "landscape") {
    return (
      <div
        className="group/card relative landscape-hover"
        onMouseEnter={() => !selectionMode && setIsHovered(true)}
        onMouseLeave={() => !selectionMode && setIsHovered(false)}
        onContextMenu={(e) => {
          if (typeof window !== 'undefined' && window.matchMedia('(hover: none)').matches) {
            e.preventDefault();
          }
        }}
        style={{ WebkitTouchCallout: 'none' }}
      >
        <Link
          href={isUnavailable ? "#" : href}
          className="relative block aspect-[16/9] w-full rounded-2xl overflow-hidden border border-white/[0.06] bg-white/[0.02] backdrop-blur-md hover:border-violet-500/20 transition-all duration-300 shadow-lg shadow-black/20"
        >
          <Image
            src={media.backdrop || media.poster || "/placeholder.jpg"}
            alt={media.title}
            fill
            className={`object-cover transition-transform duration-500 group-hover/card:scale-105 ${isUnavailable ? "grayscale opacity-40" : ""
              }`}
            sizes="(max-width: 768px) 50vw, 33vw"
          />

          {/* Hover Preview Video (Only for non-selection mode) */}
          {!selectionMode && !isUnavailable && media.source !== "online" && (
            <HoverPreview
              mediaId={media.id}
              runtime={media.runtime}
              exactDuration={media.exactDuration}
              isHovered={isHovered}
              clipDuration={10}
              randomStart={true}
            />
          )}

          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent z-10" />

          {/* Bottom info */}
          <div className="absolute bottom-0 left-0 right-0 p-4 z-20">
            <h3 className="text-base font-semibold text-white truncate">{media.title}</h3>
            <div className="flex items-center gap-2 mt-1 text-[11px] text-white/40 font-medium">
              {media.year && <span>{media.year}</span>}
              {media.genres && (
                <>
                  {media.year && <span className="w-1 h-1 rounded-full bg-white/20" />}
                  <span>{media.genres.split(",")[0]?.trim()}</span>
                </>
              )}
              {media.type === "show" && (
                <>
                  {(media.year || media.genres) && <span className="w-1 h-1 rounded-full bg-white/20" />}
                  <span>{media.season ? `${media.season} seasons` : "Series"}</span>
                </>
              )}
            </div>
          </div>

          {/* Play icon */}
          {!isUnavailable && (
            <div className="absolute bottom-4 right-4 w-10 h-10 rounded-full bg-violet-500/80 backdrop-blur-sm flex items-center justify-center opacity-0 group-hover/card:opacity-100 transition-all shadow-lg shadow-violet-500/25 z-20">
              <Play className="w-4 h-4 text-white fill-white ml-0.5" />
            </div>
          )}

          {/* Progress bar */}
          {progressPercent > 0 && (
            <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-white/[0.06]">
              <div className="h-full bg-gradient-to-r from-violet-500 to-cyan-400 shadow-[0_0_6px_rgba(139,92,246,0.4)]" style={{ width: `${progressPercent}%` }} />
            </div>
          )}
        </Link>

        {isEditing && (
          <AdminPinGate>
            <EditTitleModal media={media} onClose={() => setIsEditing(false)} />
          </AdminPinGate>
        )}
        {showWatchParty && (
          <CreateRoomModal
            isOpen={showWatchParty}
            onClose={() => setShowWatchParty(false)}
            mediaId={media.id}
            mediaTitle={media.title}
            mediaPoster={media.poster}
            onStartWatching={(roomCode) => {
              router.push(`/watch/${roomCode}`);
            }}
          />
        )}
      </div>
    );
  }

  // ─── Default Poster Card ──────────────────────────────────────

  const handleSelectionClick = (e: React.MouseEvent) => {
    if (selectionMode && onToggleSelect) {
      e.preventDefault();
      e.stopPropagation();
      onToggleSelect(media.id);
    }
  };

  const CardWrapper = selectionMode ? "div" : Link;
  const cardWrapperProps = selectionMode
    ? { onClick: handleSelectionClick, role: "button", tabIndex: 0 }
    : { href: isUnavailable ? "#" : href };

  return (
    <div
      className={`group/card relative flex flex-col w-full ${selectionMode ? "cursor-pointer" : ""}`}
      onMouseEnter={() => !selectionMode && setIsHovered(true)}
      onMouseLeave={() => !selectionMode && setIsHovered(false)}
      onContextMenu={(e) => {
        if (typeof window !== 'undefined' && window.matchMedia('(hover: none)').matches) {
          e.preventDefault();
        }
      }}
      style={{ WebkitTouchCallout: 'none' }}
    >
      <CardWrapper
        {...(cardWrapperProps as any)}
        className={`relative aspect-[2/3] overflow-hidden rounded-[20px] bg-[#111] border shadow-xl transition-all duration-500 ${selectionMode
            ? isSelected
              ? "border-violet-500 shadow-[0_0_25px_-5px_rgba(139,92,246,0.4)] ring-2 ring-violet-500/50"
              : "border-white/[0.04] hover:border-white/[0.1]"
            : "border-white/[0.04] group-hover/card:-translate-y-2 group-hover/card:shadow-[0_20px_40px_-15px_rgba(139,92,246,0.25)] group-hover/card:border-violet-500/30"
          }`}
      >

        {/* Poster Image */}
        <Image
          src={posterSrc}
          alt={media.title}
          fill
          className={`object-cover transition-transform duration-700 group-hover/card:scale-105 opacity-90 group-hover/card:opacity-100 ${isUnavailable ? "grayscale opacity-40 group-hover/card:opacity-40" : ""
            }`}
          sizes="(max-width: 768px) 45vw, (max-width: 1024px) 30vw, 200px"
        />

        {/* Online Source Indicator */}
        {media.source === "online" && (
          <div className="absolute top-3 right-3 z-30 bg-black/60 backdrop-blur-md border border-white/10 text-emerald-400 p-1.5 rounded-full shadow-lg">
            <Globe className="w-3.5 h-3.5" />
          </div>
        )}

        {/* Hover Preview Video (Only for non-selection mode) */}
        {!selectionMode && !isUnavailable && media.source !== "online" && (
          <HoverPreview
            mediaId={media.id}
            runtime={media.runtime}
            exactDuration={media.exactDuration}
            isHovered={isHovered}
            clipDuration={10}
            randomStart={true}
          />
        )}

        {/* Selection Mode Checkbox Overlay */}
        {selectionMode && (
          <div className="absolute top-3 left-3 z-40">
            <div
              className={`w-7 h-7 rounded-full flex items-center justify-center transition-all duration-200 ${isSelected
                  ? "bg-violet-500 shadow-lg shadow-violet-500/40"
                  : "bg-black/40 backdrop-blur-md border border-white/20"
                }`}
            >
              {isSelected && <Check className="w-4 h-4 text-white" strokeWidth={3} />}
            </div>
          </div>
        )}

        {/* Hover Action Overlay */}
        {!isUnavailable && !selectionMode && (
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-0 group-hover/card:opacity-100 transition-opacity duration-300 z-20">

            {/* Top Actions moved outside to prevent clipping */}

            {/* Bottom Left Play Button */}
            <div className="absolute bottom-4 left-3 transform translate-y-4 group-hover/card:translate-y-0 opacity-0 group-hover/card:opacity-100 transition-all duration-300 pointer-events-none z-40">
              <div className="w-10 h-10 rounded-full bg-violet-500/90 backdrop-blur-md flex items-center justify-center shadow-[0_0_15px_rgba(139,92,246,0.5)] pointer-events-auto border border-white/20 hover:scale-110 hover:bg-violet-400 transition-transform cursor-pointer">
                <Play className="w-4 h-4 text-white fill-white ml-0.5" />
              </div>
            </div>
          </div>
        )}

        {/* Status Badges */}
        <div className={`absolute ${selectionMode ? "top-12" : "top-3"} left-3 flex flex-col gap-1.5 z-30`}>
          <span className="inline-flex items-center bg-black/50 backdrop-blur-md text-[9px] uppercase tracking-wider border border-white/[0.08] text-white/80 px-2 py-0.5 rounded-md font-bold">
            {media.type === "show" ? "Series" : "Movie"}
          </span>
          {isUnavailable && (
            <span className="inline-flex items-center bg-red-500/80 backdrop-blur-md text-[9px] uppercase tracking-wider text-white px-2 py-0.5 rounded-md font-bold">
              Offline
            </span>
          )}
        </div>

        {/* Progress Bar */}
        {progressPercent > 0 && (
          <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-white/[0.08] z-30 backdrop-blur-sm">
            <div className="h-full bg-gradient-to-r from-violet-500 to-cyan-400 relative" style={{ width: `${progressPercent}%` }}>
              <div className="absolute right-0 top-0 bottom-0 w-4 bg-white/50 blur-[2px]" />
            </div>
          </div>
        )}
      </CardWrapper>

      {/* Top Actions (Moved outside CardWrapper to avoid overflow clipping) */}
      {!isUnavailable && !selectionMode && media.source !== "online" && (
        <div className="absolute top-3 right-3 flex flex-col gap-2 translate-y-2 group-hover/card:translate-y-0 opacity-0 group-hover/card:opacity-100 transition-all duration-300 z-50">
          <FavoriteButton mediaId={media.id} initialIsFavorite={media.is_favorite === 1} />
          {/* Play on PC Dropdown */}
          {showPlayOnPc && media.type === "movie" && (
            <div className="relative group/play">
              <button
                onClick={(e) => e.preventDefault()}
                className="h-8 w-8 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center hover:bg-white/20 transition-colors border border-white/10 shadow-lg cursor-pointer"
                title="Play on PC"
              >
                <MonitorPlay className="w-3.5 h-3.5 text-white" />
              </button>

              {/* Sub-menu appearing to the left (with invisible bridge padding) */}
              <div className="absolute right-full top-0 pr-2 opacity-0 group-hover/play:opacity-100 pointer-events-none group-hover/play:pointer-events-auto transition-all duration-200 z-50">
                <div className="flex flex-col gap-1 bg-[#1a1a1a] border border-white/10 rounded-lg p-1 shadow-xl whitespace-nowrap origin-right scale-95 group-hover/play:scale-100 transition-all duration-200">
                  <button onClick={async (e) => { e.preventDefault(); await fetch("/api/play-local", { method: "POST", body: JSON.stringify({ mediaId: media.id, player: "default" }) }); }} className="px-3 py-1.5 text-xs text-left text-white/80 hover:text-white hover:bg-blue-500/20 rounded transition-colors flex items-center gap-2 cursor-pointer">
                    <MonitorPlay className="w-3.5 h-3.5 text-blue-400" /> Default Player
                  </button>

                  {media.watch_progress > 0 ? (
                    <div className="relative group/vlc">
                      <button className="w-full px-3 py-1.5 text-xs text-left text-white/80 hover:text-white hover:bg-orange-500/20 rounded transition-colors flex items-center justify-between gap-4 cursor-pointer">
                        <div className="flex items-center gap-2">
                          <Monitor className="w-3.5 h-3.5 text-orange-400" /> VLC Media Player
                        </div>
                        <ChevronRight className="w-3 h-3 text-white/40" />
                      </button>
                      {/* Nested Sub-menu for VLC (with invisible bridge padding to prevent closing on gap) */}
                      <div className="absolute right-full top-0 -mt-1 pr-1 py-1 opacity-0 group-hover/vlc:opacity-100 pointer-events-none group-hover/vlc:pointer-events-auto transition-all duration-200 z-50">
                        <div className="flex flex-col gap-1 bg-[#1a1a1a] border border-white/10 rounded-lg p-1 shadow-xl whitespace-nowrap origin-right scale-95 group-hover/vlc:scale-100 transition-all duration-200">
                          <button onClick={async (e) => { e.preventDefault(); await fetch("/api/play-local", { method: "POST", body: JSON.stringify({ mediaId: media.id, player: "vlc", startTime: media.watch_progress }) }); }} className="px-3 py-1.5 text-xs text-left text-white/80 hover:text-white hover:bg-orange-500/20 rounded transition-colors flex items-center gap-2 cursor-pointer">
                            Resume ({Math.floor(media.watch_progress / 60)}m)
                          </button>
                          <button onClick={async (e) => { e.preventDefault(); await fetch("/api/play-local", { method: "POST", body: JSON.stringify({ mediaId: media.id, player: "vlc" }) }); }} className="px-3 py-1.5 text-xs text-left text-white/80 hover:text-white hover:bg-orange-500/20 rounded transition-colors flex items-center gap-2 cursor-pointer">
                            Start Over
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <button onClick={async (e) => { e.preventDefault(); await fetch("/api/play-local", { method: "POST", body: JSON.stringify({ mediaId: media.id, player: "vlc" }) }); }} className="px-3 py-1.5 text-xs text-left text-white/80 hover:text-white hover:bg-orange-500/20 rounded transition-colors flex items-center gap-2 cursor-pointer">
                      <Monitor className="w-3.5 h-3.5 text-orange-400" /> VLC Media Player
                    </button>
                  )}

                  {customVideoPlayers.length > 0 && <div className="h-[1px] w-full bg-white/10 my-1"></div>}
                  {customVideoPlayers.map((cp: any) => (
                    <button key={`custom-${cp.id}`} onClick={async (e) => { e.preventDefault(); await fetch("/api/play-local", { method: "POST", body: JSON.stringify({ mediaId: media.id, player: cp.id }) }); }} className="px-3 py-1.5 text-xs text-left text-white/80 hover:text-white hover:bg-emerald-500/20 rounded transition-colors flex items-center gap-2 cursor-pointer">
                      <MonitorPlay className="w-3.5 h-3.5 text-emerald-400" /> {cp.name}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
          {isUnlocked && (
            <button
              onClick={(e) => { e.preventDefault(); setIsEditing(true); }}
              className="h-8 w-8 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center hover:bg-white/20 transition-colors border border-white/10 shadow-lg cursor-pointer"
            >
              <Pencil className="w-3.5 h-3.5 text-white" />
            </button>
          )}
          <button
            onClick={(e) => { e.preventDefault(); setShowWatchParty(true); }}
            className="h-8 w-8 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center hover:bg-white/20 transition-colors border border-white/10 shadow-lg cursor-pointer"
            title="Watch Party"
          >
            <Users className="w-3.5 h-3.5 text-white" />
          </button>
        </div>
      )}

      {/* Info Section Below Poster */}
      <div className="mt-3 px-1">
        <h3 className="text-sm font-bold text-white/90 line-clamp-1 group-hover/card:text-violet-300 transition-colors">
          {media.title}
        </h3>
        <div className="flex items-center gap-1.5 mt-1 text-[11px] text-white/40 font-medium">
          {media.year && <span>{media.year}</span>}
          {media.rating && (
            <>
              {media.year && <span className="w-1 h-1 rounded-full bg-white/15" />}
              <span className="flex items-center gap-0.5 text-amber-400">
                <Star className="w-3 h-3 fill-current" />
                {!isNaN(parseFloat(media.rating)) ? parseFloat(media.rating.split('/')[0]).toFixed(1) : media.rating.split('/')[0]}
              </span>
            </>
          )}
          {media.genres && (
            <>
              {(media.year || media.rating) && <span className="w-1 h-1 rounded-full bg-white/15" />}
              <span className="truncate">{media.genres.split(",")[0]?.trim()}</span>
            </>
          )}
        </div>
      </div>

      {isEditing && (
        <AdminPinGate>
          <EditTitleModal media={media} onClose={() => setIsEditing(false)} />
        </AdminPinGate>
      )}

      {showWatchParty && (
        <CreateRoomModal
          isOpen={showWatchParty}
          onClose={() => setShowWatchParty(false)}
          mediaId={media.id}
          mediaTitle={media.title}
          mediaPoster={media.poster}
          onStartWatching={(roomCode) => {
            router.push(`/watch/${roomCode}`);
          }}
        />
      )}
    </div>
  );
}