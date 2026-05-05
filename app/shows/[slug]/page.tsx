"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { Play, Star, Clock, Calendar, ArrowLeft, HardDrive } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface MediaEntry {
  id: number;
  type: "movie" | "show";
  title: string;
  year: number | null;
  season: number | null;
  episode_start: number | null;
  episode_end: number | null;
  poster: string | null;
  overview: string | null;
  rating: string | null;
  genres: string | null;
  runtime: number | null;
  available: number;
  backdrop: string | null;
  backdrop_url: string | null;
  filename: string;
  watch_progress?: number;
  is_favorite?: number;
}

export default function ShowDetailPage() {
  const params = useParams();
  const slug = params.slug as string;
  const [episodes, setEpisodes] = useState<MediaEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeSeason, setActiveSeason] = useState<number>(1);

  useEffect(() => {
    fetch("/api/media?type=show")
      .then((r) => r.json())
      .then((data: MediaEntry[]) => {
        // Find all episodes matching this show's slug
        const filtered = data.filter(
          (m: MediaEntry) =>
            m.title.toLowerCase().replace(/\s+/g, "-") === decodeURIComponent(slug)
        );
        setEpisodes(filtered);

        // Set active season to the first available
        if (filtered.length > 0) {
          const seasons = [...new Set(filtered.map((e: MediaEntry) => e.season).filter(Boolean))].sort(
            (a, b) => (a ?? 0) - (b ?? 0)
          );
          if (seasons.length > 0) setActiveSeason(seasons[0] ?? 1);
        }
      })
      .catch(() => setEpisodes([]))
      .finally(() => setLoading(false));
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#141414] pt-20 px-4 md:px-8 lg:px-12">
        <div className="flex gap-8 animate-pulse">
          <div className="w-64 aspect-[2/3] skeleton rounded-lg flex-shrink-0" />
          <div className="flex-1 space-y-4">
            <div className="h-10 w-96 skeleton rounded" />
            <div className="h-4 w-48 skeleton rounded" />
            <div className="h-24 w-full skeleton rounded" />
          </div>
        </div>
      </div>
    );
  }

  if (episodes.length === 0) {
    return (
      <div className="min-h-screen bg-[#141414] pt-24 px-4 md:px-8 lg:px-12">
        <Link
          href="/shows"
          className="inline-flex items-center gap-2 text-[#b3b3b3] hover:text-white mb-8 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Shows
        </Link>
        <p className="text-white/60 text-lg">Show not found.</p>
      </div>
    );
  }

  // Use the first episode's metadata as the show info
  const show = episodes[0];
  const posterSrc = show.poster || "/placeholder.jpg";
  const bgImage = show.backdrop || show.poster || "/placeholder.jpg";

  // Group episodes by season
  const seasons = [...new Set(episodes.map((e) => e.season).filter(Boolean))].sort(
    (a, b) => (a ?? 0) - (b ?? 0)
  );

  const seasonEpisodes = episodes
    .filter((e) => e.season === activeSeason)
    .sort((a, b) => (a.episode_start ?? 0) - (b.episode_start ?? 0));

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      {/* Backdrop */}
      <div className="absolute top-0 left-0 right-0 h-[60vh] md:h-[75vh] overflow-hidden z-0">
        <Image
          src={bgImage}
          alt={show.title}
          fill
          className="object-cover object-top"
          priority
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] via-[#0a0a0a]/10 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#0a0a0a] via-[#0a0a0a]/10 to-transparent" />
      </div>

      {/* Content */}
      <div className="relative z-10 pt-[35vh] md:pt-[45vh] px-6 md:px-10 lg:px-14 pb-20 max-w-[1920px] mx-auto">
        <Link
          href="/shows"
          className="inline-flex items-center gap-2 text-[#808080] hover:text-white mb-6 transition-colors font-medium"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Shows
        </Link>

        <div className="flex flex-col md:flex-row gap-8 lg:gap-12 items-start">
          {/* Poster */}
          <div className="flex-shrink-0">
            <div className="relative w-48 md:w-64 aspect-[2/3] rounded-lg overflow-hidden shadow-2xl shadow-black">
              <Image
                src={posterSrc}
                alt={show.title}
                fill
                className="object-cover"
                sizes="(max-width: 768px) 192px, 256px"
                priority
              />
            </div>
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0 pt-2">
            <Badge className="bg-transparent border border-white/20 text-white/90 mb-4 text-xs tracking-widest px-3 py-1">
              TV SERIES
            </Badge>

            <h1 className="text-4xl md:text-5xl lg:text-6xl font-black text-white mb-4 tracking-tight leading-tight">
              {show.title}
            </h1>

            <div className="flex items-center gap-4 mb-6 text-sm flex-wrap font-medium">
              {show.rating && (
                <span className="flex items-center gap-1 text-[#E50914]">
                  <Star className="w-4 h-4 fill-current" />
                  {show.rating.replace("/10", "")}
                </span>
              )}
              {show.year && (
                <span className="flex items-center gap-1 text-[#808080]">
                  <Calendar className="w-4 h-4" />
                  {show.year}
                </span>
              )}
              {show.runtime && (
                <span className="flex items-center gap-1 text-[#808080]">
                  <Clock className="w-4 h-4" />
                  {show.runtime} min/ep
                </span>
              )}
              {show.genres && (
                <span className="text-[#808080]">{show.genres}</span>
              )}
            </div>

            {show.overview && (
              <p className="text-[#b3b3b3] text-base md:text-lg leading-relaxed max-w-3xl mb-8">
                {show.overview}
              </p>
            )}

            <p className="text-[#808080] text-sm font-medium">
              {seasons.length} Season{seasons.length !== 1 ? "s" : ""} · {episodes.length} File
              {episodes.length !== 1 ? "s" : ""}
            </p>
          </div>
        </div>

        {/* Season tabs */}
        <div className="mt-16 md:mt-24">
          <div className="flex items-center gap-6 mb-8 border-b border-white/10 overflow-x-auto pb-0" style={{ scrollbarWidth: "none" }}>
            {seasons.map((season) => (
              <button
                key={season}
                onClick={() => setActiveSeason(season ?? 1)}
                className={`pb-4 text-lg font-medium transition-all whitespace-nowrap relative ${
                  activeSeason === season
                    ? "text-white"
                    : "text-[#808080] hover:text-[#b3b3b3]"
                }`}
              >
                Season {season}
                {activeSeason === season && (
                  <span className="absolute bottom-0 left-0 right-0 h-1 bg-[#E50914] rounded-t-md" />
                )}
              </button>
            ))}
          </div>

          {/* Episode list */}
          <div className="flex flex-col">
            {seasonEpisodes.map((ep) => {
              const epLabel =
                ep.episode_start === ep.episode_end
                  ? `Episode ${ep.episode_start}`
                  : `Episodes ${ep.episode_start}–${ep.episode_end}`;

              return (
                <div
                  key={ep.id}
                  className={`flex flex-col sm:flex-row items-start sm:items-center gap-4 py-6 border-b border-white/5 last:border-0 transition-colors group ${
                    ep.available ? "hover:bg-white/[0.02]" : "opacity-50"
                  }`}
                >
                  {/* Episode number */}
                  <div className="hidden sm:flex flex-shrink-0 w-16 justify-center">
                    <span className="text-3xl font-bold text-white/20 group-hover:text-white/40 transition-colors">
                      {ep.episode_start}
                    </span>
                  </div>

                  {/* Episode thumbnail (clickable if available) */}
                  <div className="relative w-full sm:w-48 aspect-video rounded-md overflow-hidden flex-shrink-0 bg-[#111]">
                    <Image
                      src={ep.poster || "/placeholder.jpg"}
                      alt={epLabel}
                      fill
                      className={`object-cover ${!ep.available ? "grayscale" : ""}`}
                      sizes="(max-width: 640px) 100vw, 192px"
                    />
                    
                    {ep.available ? (
                      <Link
                        href={`/player/${ep.id}`}
                        className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/50 transition-colors"
                      >
                        <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-full p-3 opacity-0 group-hover:opacity-100 transition-opacity transform scale-90 group-hover:scale-100">
                          <Play className="w-5 h-5 text-white fill-white" />
                        </div>
                      </Link>
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                        <HardDrive className="w-6 h-6 text-[#E50914]/80" />
                      </div>
                    )}

                    {/* Progress Bar */}
                    {ep.watch_progress && ep.runtime && ep.watch_progress > 0 && (
                      <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/20 z-20">
                        <div 
                          className="h-full bg-[#E50914]" 
                          style={{ width: `${Math.min(100, Math.max(0, (ep.watch_progress / (ep.runtime * 60)) * 100))}%` }}
                        />
                      </div>
                    )}
                  </div>

                  {/* Episode info */}
                  <div className="flex-1 min-w-0 pr-4 mt-3 sm:mt-0">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-base sm:text-lg font-semibold text-white/90 group-hover:text-white transition-colors">{epLabel}</h3>
                      {!ep.available && (
                        <Badge className="text-[10px] bg-[#E50914]/20 text-[#E50914] border-none px-2 py-0.5">
                          HDD Disconnected
                        </Badge>
                      )}
                    </div>
                    
                    <p className="text-sm text-[#808080] truncate mb-2">{ep.filename}</p>
                    
                    {ep.runtime && (
                      <p className="text-xs font-medium text-[#666]">{ep.runtime}m</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
