"use client";

import Image from "next/image";
import Link from "next/link";
import { Play, Star, Clock, Pencil, HardDrive, AlertTriangle, Users } from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import FavoriteButton from "./FavoriteButton";
import EditTitleModal from "./EditTitleModal";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";


const CreateRoomModal = dynamic(() => import("./WatchParty/CreateRoomModal"), { ssr: false });

import type { MediaEntry } from "@/lib/db";

interface PosterCardProps {
  media: MediaEntry;
  showEpisodeInfo?: boolean;
}

export default function PosterCard({ media, showEpisodeInfo = false }: PosterCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [showWatchParty, setShowWatchParty] = useState(false);
  const router = useRouter();

  const posterSrc = media.poster || "/placeholder.jpg";
  const isUnavailable = !media.available;

  const progressPercent = media.watch_progress && media.runtime
    ? Math.min(100, Math.max(0, (media.watch_progress / (media.runtime * 60)) * 100))
    : 0;

  const href = `/${media.type === "show" ? "shows" : "movies"}/${encodeURIComponent(
    media.title.toLowerCase().replace(/\s+/g, "-")
  )}`;

  return (
    <div className="group/card relative flex flex-col w-[160px] md:w-[190px] lg:w-[220px] transition-all duration-300 ease-out hover:-translate-y-2">
      <Link href={isUnavailable ? "#" : href} className="relative aspect-[2/3] overflow-hidden rounded-xl bg-neutral-900 border border-white/5">
        
        {/* Poster Image */}
        <Image
          src={posterSrc}
          alt={media.title}
          fill
          className={`object-cover transition-transform duration-500 group-hover/card:scale-110 ${
            isUnavailable ? "grayscale opacity-40" : "opacity-90 group-hover/card:opacity-100"
          }`}
          sizes="(max-width: 768px) 160px, 220px"
        />

        {/* Hover Action Overlay - Triggered ONLY by card hover */}
        {!isUnavailable && (
          <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-0 group-hover/card:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-4 z-20">
            <div className="flex items-center justify-between translate-y-4 group-hover/card:translate-y-0 transition-transform duration-300">
               <div className="flex gap-2">
                  <div className="h-10 w-10 rounded-full bg-white flex items-center justify-center shadow-xl">
                    <Play className="w-5 h-5 text-black fill-black ml-0.5" />
                  </div>
                  <button 
                    onClick={(e) => { e.preventDefault(); setIsEditing(true); }}
                    className="h-10 w-10 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center hover:bg-white/30 transition-colors border border-white/20"
                  >
                    <Pencil className="w-4 h-4 text-white" />
                  </button>
                  <button 
                    onClick={(e) => { e.preventDefault(); setShowWatchParty(true); }}
                    className="h-10 w-10 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center hover:bg-white/30 transition-colors border border-white/20"
                    title="Watch Party"
                  >
                    <Users className="w-4 h-4 text-white" />
                  </button>
               </div>
               <FavoriteButton mediaId={media.id} initialIsFavorite={media.is_favorite === 1} />
            </div>
          </div>
        )}

        {/* Status Badges */}
        <div className="absolute top-2 left-2 flex flex-col gap-1 z-30">
          <Badge className="bg-black/60 backdrop-blur-md text-[10px] border-none text-white/90">
            {media.type === "show" ? "Series" : "Movie"}
          </Badge>
          {isUnavailable && (
            <Badge className="bg-red-600/90 text-[10px] border-none text-white">
              OFFLINE
            </Badge>
          )}
        </div>

        {/* Progress Bar */}
        {progressPercent > 0 && (
          <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-white/10 z-30">
            <div className="h-full bg-red-600 shadow-[0_0_8px_rgba(229,9,20,0.6)]" style={{ width: `${progressPercent}%` }} />
          </div>
        )}
      </Link>

      {/* Info Section (Below) */}
      <div className="mt-3 px-1">
        <HoverCard>
          <HoverCardTrigger>
            <h3 className="text-sm font-medium text-foreground line-clamp-1 group-hover/card:text-primary transition-colors cursor-default">
              {media.title}
            </h3>
          </HoverCardTrigger>
          <HoverCardContent side="top" align="start" className="w-80 p-0 border-white/10 bg-black/90 backdrop-blur-xl rounded-xl shadow-2xl overflow-hidden z-50 animate-in fade-in zoom-in-95">
            <div className="relative aspect-video w-full bg-neutral-900 border-b border-white/10">
              <Image
                src={media.poster || "/placeholder.jpg"} // In a real app we'd use media.backdrop
                alt={media.title}
                fill
                className="object-cover opacity-60"
                sizes="320px"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
              <div className="absolute bottom-3 left-4 right-4">
                <h4 className="text-lg font-bold text-white leading-tight drop-shadow-md">
                  {media.title}
                </h4>
                <div className="flex items-center gap-2 mt-1 text-[11px] text-white/80 font-medium">
                  <span>{media.year}</span>
                  <span className="w-1 h-1 rounded-full bg-white/40" />
                  <span className="flex items-center gap-1 text-primary">
                    <Star className="w-3 h-3 fill-current" />
                    {media.rating?.split('/')[0]}
                  </span>
                  {media.runtime && (
                    <>
                      <span className="w-1 h-1 rounded-full bg-white/40" />
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {media.runtime}m
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>
            <div className="p-4">
              <p className="text-xs text-white/70 line-clamp-3 leading-relaxed mb-3">
                {media.overview || "No overview available."}
              </p>
              {media.genres && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {media.genres.split(",").slice(0, 3).map((g) => (
                    <span key={g} className="px-2 py-0.5 rounded-full bg-white/10 text-[10px] text-white/80 font-medium">
                      {g.trim()}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </HoverCardContent>
        </HoverCard>
        <div className="flex items-center gap-2 mt-1 text-[11px] text-muted-foreground font-medium">
          <span>{media.year}</span>
          <span className="w-1 h-1 rounded-full bg-border" />
          <span className="flex items-center gap-1">
            <Star className="w-3 h-3 fill-primary text-primary" />
            {media.rating?.split('/')[0]}
          </span>
        </div>
      </div>

      {isEditing && (
        <EditTitleModal media={media} onClose={() => setIsEditing(false)} />
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