"use client";

import Image from "next/image";
import Link from "next/link";
import { Play, Info, Star, Clock, HardDrive, Pencil, AlertTriangle, ChevronRight } from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import FavoriteButton from "./FavoriteButton";
import EditTitleModal from "./EditTitleModal";

interface MediaEntry {
  id: number;
  filename: string;
  type: "movie" | "show";
  title: string;
  year: number | null;
  poster: string | null;
  overview: string | null;
  rating: string | null;
  genres: string | null;
  runtime: number | null;
  available: number;
  season: number | null;
  episode_start: number | null;
  episode_end: number | null;
  is_favorite?: number;
  watch_progress?: number;
  omdb_confirmed?: number;
}

interface PosterCardProps {
  media: MediaEntry;
  showEpisodeInfo?: boolean;
}

export default function PosterCard({ media, showEpisodeInfo = false }: PosterCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const posterSrc = media.poster || "/placeholder.jpg";
  const isUnavailable = !media.available;

  const episodeLabel =
    media.type === "show" && showEpisodeInfo && media.season !== null
      ? `S${media.season} · E${media.episode_start}`
      : null;

  const href = `/${media.type === "show" ? "shows" : "movies"}/${encodeURIComponent(
    media.title.toLowerCase().replace(/\s+/g, "-")
  )}`;

  const progressPercent = media.watch_progress && media.runtime
    ? Math.min(100, Math.max(0, (media.watch_progress / (media.runtime * 60)) * 100))
    : 0;

  return (
    <div className="group relative flex flex-col w-[160px] md:w-[190px] lg:w-[220px] transition-all duration-300 ease-out hover:-translate-y-2">
      {/* Media Container */}
      <Link href={isUnavailable ? "#" : href} className="relative aspect-[2/3] overflow-hidden rounded-xl bg-neutral-900 shadow-lg border border-white/5">
        
        {/* Poster Image */}
        <Image
          src={posterSrc}
          alt={media.title}
          fill
          className={`object-cover transition-transform duration-500 group-hover:scale-110 ${
            isUnavailable ? "grayscale opacity-40" : "opacity-90 group-hover:opacity-100"
          }`}
          sizes="(max-width: 768px) 160px, 220px"
        />

        {/* Status Badges (Top) */}
        <div className="absolute top-2 left-2 right-2 flex justify-between items-start z-30">
          <div className="flex flex-col gap-1">
            <Badge className="bg-black/60 backdrop-blur-md text-[10px] border-none text-white/90">
              {media.type === "show" ? "Series" : "Movie"}
            </Badge>
            {media.omdb_confirmed === 0 && (
              <Badge className="bg-amber-500/90 backdrop-blur-md text-[10px] border-none text-black font-bold">
                <AlertTriangle className="w-3 h-3 mr-1" /> Fix Match
              </Badge>
            )}
          </div>
          
          {episodeLabel && (
            <Badge className="bg-indigo-600 backdrop-blur-md text-[10px] border-none">
              {episodeLabel}
            </Badge>
          )}
        </div>

        {/* Offline State */}
        {isUnavailable && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/40 backdrop-grayscale-[0.5] z-10">
            <HardDrive className="w-8 h-8 text-white/50 mb-2" />
            <span className="text-[10px] uppercase tracking-widest font-bold text-white/70">Offline</span>
          </div>
        )}

        {/* Hover Action Bar (Bottom) */}
        {!isUnavailable && (
          <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-4 z-20">
            <div className="flex items-center justify-between translate-y-4 group-hover:translate-y-0 transition-transform duration-300">
               <div className="flex gap-2">
                  <div className="h-10 w-10 rounded-full bg-white flex items-center justify-center hover:bg-neutral-200 transition-colors shadow-xl">
                    <Play className="w-5 h-5 text-black fill-black ml-0.5" />
                  </div>
                  <button 
                    onClick={(e) => { e.preventDefault(); setIsEditing(true); }}
                    className="h-10 w-10 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center hover:bg-white/30 transition-colors border border-white/20"
                  >
                    <Pencil className="w-4 h-4 text-white" />
                  </button>
               </div>
               <FavoriteButton mediaId={media.id} initialIsFavorite={media.is_favorite === 1} />
            </div>
          </div>
        )}

        {/* Watch Progress Bar */}
        {progressPercent > 0 && (
          <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-white/10 z-30">
            <div 
              className="h-full bg-gradient-to-r from-red-600 to-red-400 shadow-[0_0_8px_rgba(229,9,20,0.6)]" 
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        )}
      </Link>

      {/* Info Section (Below Card) */}
      <div className="mt-3 px-1">
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-sm font-medium text-neutral-200 line-clamp-1 group-hover:text-white transition-colors">
            {media.title}
          </h3>
          {media.rating && (
            <span className="flex items-center text-[11px] font-bold text-emerald-400">
              <Star className="w-3 h-3 fill-current mr-0.5" />
              {media.rating.split('/')[0]}
            </span>
          )}
        </div>
        
        <div className="flex items-center gap-2 mt-1 text-[11px] text-neutral-500 font-medium">
          <span>{media.year}</span>
          <span className="w-1 h-1 rounded-full bg-neutral-700" />
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {media.runtime}m
          </span>
        </div>
      </div>

      {isEditing && (
        <EditTitleModal 
          media={media} 
          onClose={() => setIsEditing(false)} 
        />
      )}
    </div>
  );
}