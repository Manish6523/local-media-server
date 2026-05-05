"use client";

import Image from "next/image";
import Link from "next/link";
import { Play, Star, Clock, Pencil, HardDrive, AlertTriangle } from "lucide-react";
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
        <h3 className="text-sm font-medium text-neutral-200 line-clamp-1 group-hover/card:text-white transition-colors">
          {media.title}
        </h3>
        <div className="flex items-center gap-2 mt-1 text-[11px] text-neutral-500 font-medium">
          <span>{media.year}</span>
          <span className="w-1 h-1 rounded-full bg-neutral-700" />
          <span className="flex items-center gap-1">
            <Star className="w-3 h-3 fill-emerald-500 text-emerald-500" />
            {media.rating?.split('/')[0]}
          </span>
        </div>
      </div>

      {isEditing && (
        <EditTitleModal media={media} onClose={() => setIsEditing(false)} />
      )}
    </div>
  );
}