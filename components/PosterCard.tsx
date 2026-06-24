"use client";

import Image from "next/image";
import Link from "next/link";
import { Play, Star, Pencil, Users } from "lucide-react";
import { useState, useEffect } from "react";
import FavoriteButton from "./FavoriteButton";
import EditTitleModal from "./EditTitleModal";
import AdminPinGate from "./AdminPinGate";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";

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

import type { MediaEntry } from "@/lib/db";

interface PosterCardProps {
  media: MediaEntry;
  showEpisodeInfo?: boolean;
  variant?: "poster" | "landscape";
}

export default function PosterCard({ media, showEpisodeInfo = false, variant = "poster" }: PosterCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [showWatchParty, setShowWatchParty] = useState(false);
  const router = useRouter();
  const isUnlocked = useAdminUnlocked();

  const posterSrc = media.poster || "/placeholder.jpg";
  const isUnavailable = !media.available;

  const progressPercent = media.watch_progress && media.runtime
    ? Math.min(100, Math.max(0, (media.watch_progress / (media.runtime * 60)) * 100))
    : 0;

  const href = `/${media.type === "show" ? "shows" : "movies"}/${encodeURIComponent(
    media.title.toLowerCase().replace(/\s+/g, "-")
  )}`;

  // ─── Landscape Card Variant ──────────────────────────────────
  if (variant === "landscape") {
    return (
      <div className="group/card relative landscape-hover">
        <Link
          href={isUnavailable ? "#" : href}
          className="relative block aspect-[16/9] w-full rounded-2xl overflow-hidden border border-white/[0.06] bg-white/[0.02] backdrop-blur-md hover:border-violet-500/20 transition-all duration-300 shadow-lg shadow-black/20"
        >
          <Image
            src={media.backdrop || media.poster || "/placeholder.jpg"}
            alt={media.title}
            fill
            className={`object-cover transition-transform duration-500 group-hover/card:scale-105 ${
              isUnavailable ? "grayscale opacity-40" : ""
            }`}
            sizes="(max-width: 768px) 50vw, 33vw"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />

          {/* Bottom info */}
          <div className="absolute bottom-0 left-0 right-0 p-4">
            <h3 className="text-base font-semibold text-white truncate">{media.title}</h3>
            <div className="flex items-center gap-2 mt-1 text-[11px] text-white/40 font-medium">
              {media.year && <span>{media.year}</span>}
              {media.genres && (
                <>
                  <span className="w-1 h-1 rounded-full bg-white/20" />
                  <span>{media.genres.split(",")[0]?.trim()}</span>
                </>
              )}
              {media.type === "show" && (
                <>
                  <span className="w-1 h-1 rounded-full bg-white/20" />
                  <span>{media.season ? `${media.season} seasons` : "Series"}</span>
                </>
              )}
            </div>
          </div>

          {/* Play icon */}
          {!isUnavailable && (
            <div className="absolute bottom-4 right-4 w-10 h-10 rounded-full bg-violet-500/80 backdrop-blur-sm flex items-center justify-center opacity-0 group-hover/card:opacity-100 transition-all shadow-lg shadow-violet-500/25">
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
  return (
    <div className="group/card relative flex flex-col w-full transition-all duration-300 ease-out hover:-translate-y-2">
      <Link href={isUnavailable ? "#" : href} className="relative aspect-[2/3] overflow-hidden rounded-xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-md hover:border-violet-500/20 transition-all duration-300 shadow-lg shadow-black/20">
        
        {/* Poster Image */}
        <Image
          src={posterSrc}
          alt={media.title}
          fill
          className={`object-cover transition-transform duration-500 group-hover/card:scale-105 ${
            isUnavailable ? "grayscale opacity-40" : ""
          }`}
          sizes="(max-width: 768px) 45vw, (max-width: 1024px) 30vw, 200px"
        />

        {/* Hover Action Overlay */}
        {!isUnavailable && (
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover/card:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-3 z-20">
            <div className="flex items-center justify-between translate-y-3 group-hover/card:translate-y-0 transition-transform duration-300">
               <div className="flex gap-1.5">
                  <div className="h-9 w-9 rounded-full bg-violet-500 flex items-center justify-center shadow-lg shadow-violet-500/30">
                    <Play className="w-4 h-4 text-white fill-white ml-0.5" />
                  </div>
                  {isUnlocked && (
                    <button 
                      onClick={(e) => { e.preventDefault(); setIsEditing(true); }}
                      className="h-9 w-9 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center hover:bg-white/20 transition-colors border border-white/10"
                    >
                      <Pencil className="w-3.5 h-3.5 text-white" />
                    </button>
                  )}
                  <button 
                    onClick={(e) => { e.preventDefault(); setShowWatchParty(true); }}
                    className="h-9 w-9 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center hover:bg-white/20 transition-colors border border-white/10"
                    title="Watch Party"
                  >
                    <Users className="w-3.5 h-3.5 text-white" />
                  </button>
               </div>
               <FavoriteButton mediaId={media.id} initialIsFavorite={media.is_favorite === 1} />
            </div>
          </div>
        )}

        {/* Status Badges */}
        <div className="absolute top-2 left-2 flex flex-col gap-1 z-30">
          <span className="inline-flex items-center bg-black/40 backdrop-blur-md text-[10px] border border-white/[0.06] text-white/60 px-2 py-0.5 rounded-md font-medium">
            {media.type === "show" ? "Series" : "Movie"}
          </span>
          {isUnavailable && (
            <span className="inline-flex items-center bg-red-500/60 backdrop-blur-md text-[10px] text-white px-2 py-0.5 rounded-md font-medium">
              OFFLINE
            </span>
          )}
        </div>

        {/* Progress Bar */}
        {progressPercent > 0 && (
          <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-white/[0.06] z-30">
            <div className="h-full bg-gradient-to-r from-violet-500 to-cyan-400 shadow-[0_0_6px_rgba(139,92,246,0.4)]" style={{ width: `${progressPercent}%` }} />
          </div>
        )}
      </Link>

      {/* Info Section */}
      <div className="mt-2.5 px-0.5">
        <h3 className="text-[13px] font-medium text-white/70 line-clamp-1 group-hover/card:text-white transition-colors">
          {media.title}
        </h3>
        <div className="flex items-center gap-1.5 mt-1 text-[11px] text-white/30 font-medium">
          {media.year && <span>{media.year}</span>}
          {media.rating && (
            <>
              <span className="w-1 h-1 rounded-full bg-white/15" />
              <span className="flex items-center gap-0.5 text-violet-300/70">
                <Star className="w-3 h-3 fill-current" />
                {media.rating?.split('/')[0]}
              </span>
            </>
          )}
          {media.genres && (
            <>
              <span className="w-1 h-1 rounded-full bg-white/15" />
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