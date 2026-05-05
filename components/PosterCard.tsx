"use client";

import Image from "next/image";
import Link from "next/link";
import { Play, Info, Star, Clock, HardDrive } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface MediaEntry {
  id: number;
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
}

interface PosterCardProps {
  media: MediaEntry;
  showEpisodeInfo?: boolean;
}

export default function PosterCard({ media, showEpisodeInfo = false }: PosterCardProps) {
  const posterSrc = media.poster || "/placeholder.jpg";
  const isUnavailable = !media.available;

  const episodeLabel =
    media.type === "show" && showEpisodeInfo && media.season !== null
      ? media.episode_start === media.episode_end
        ? `S${String(media.season).padStart(2, "0")}E${String(media.episode_start).padStart(2, "0")}`
        : `S${String(media.season).padStart(2, "0")}E${String(media.episode_start).padStart(2, "0")}–E${String(media.episode_end).padStart(2, "0")}`
      : null;

  const href =
    media.type === "show"
      ? `/shows/${encodeURIComponent(media.title.toLowerCase().replace(/\s+/g, "-"))}`
      : `/player/${media.id}`;

  return (
    <div className="poster-card relative flex-shrink-0 w-[160px] md:w-[180px] lg:w-[200px] rounded-md overflow-hidden cursor-pointer group">
      <Link href={isUnavailable ? "#" : href} className="block">
        <div className="relative aspect-[2/3]">
          {/* Poster Image */}
          <Image
            src={posterSrc}
            alt={media.title}
            fill
            className={`object-cover ${isUnavailable ? "grayscale opacity-50" : ""}`}
            sizes="200px"
          />

          {/* Unavailable overlay */}
          {isUnavailable && (
            <div className="absolute inset-0 unavailable-overlay flex flex-col items-center justify-center gap-2">
              <HardDrive className="w-8 h-8 text-[#E50914]/80" />
              <span className="text-xs font-medium text-[#E50914] bg-black/60 px-2 py-1 rounded">
                HDD Not Connected
              </span>
            </div>
          )}

          {/* Hover overlay */}
          {!isUnavailable && (
            <div className="poster-overlay absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent flex flex-col justify-end p-3">
              <div className="flex items-center gap-2 mb-2">
                <div className="bg-[#E50914] rounded-full p-1.5">
                  <Play className="w-3.5 h-3.5 text-white fill-white" />
                </div>
                <span className="text-white/80 hover:text-white transition-colors">
                  <Info className="w-4 h-4" />
                </span>
              </div>

              <h3 className="text-sm font-semibold text-white leading-tight line-clamp-2">
                {media.title}
              </h3>

              <div className="flex items-center gap-2 mt-1 flex-wrap">
                {media.year && (
                  <span className="text-[11px] text-white/60">{media.year}</span>
                )}
                {media.rating && (
                  <span className="flex items-center gap-0.5 text-[11px] text-[#46d369]">
                    <Star className="w-3 h-3 fill-current" />
                    {media.rating.replace("/10", "")}
                  </span>
                )}
                {media.runtime && (
                  <span className="flex items-center gap-0.5 text-[11px] text-white/50">
                    <Clock className="w-3 h-3" />
                    {media.runtime}m
                  </span>
                )}
              </div>

              {media.genres && (
                <p className="text-[10px] text-white/40 mt-1 line-clamp-1">
                  {media.genres}
                </p>
              )}
            </div>
          )}

          {/* Type badge */}
          <Badge
            variant="secondary"
            className="absolute top-2 left-2 text-[10px] px-1.5 py-0.5 bg-black/70 text-white/90 border-none"
          >
            {media.type === "show" ? "Series" : "Movie"}
          </Badge>

          {/* Episode badge */}
          {episodeLabel && (
            <Badge
              variant="secondary"
              className="absolute top-2 right-2 text-[10px] px-1.5 py-0.5 bg-[#E50914]/90 text-white border-none"
            >
              {episodeLabel}
            </Badge>
          )}
        </div>
      </Link>
    </div>
  );
}
