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
  filename: string;
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

  // Group episodes by season
  const seasons = [...new Set(episodes.map((e) => e.season).filter(Boolean))].sort(
    (a, b) => (a ?? 0) - (b ?? 0)
  );

  const seasonEpisodes = episodes
    .filter((e) => e.season === activeSeason)
    .sort((a, b) => (a.episode_start ?? 0) - (b.episode_start ?? 0));

  return (
    <div className="min-h-screen bg-[#141414]">
      {/* Backdrop */}
      <div className="relative h-[40vh] md:h-[50vh] overflow-hidden">
        <Image
          src={posterSrc}
          alt={show.title}
          fill
          className="object-cover object-top blur-md scale-110 opacity-40"
          priority
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#141414] via-[#141414]/60 to-transparent" />
      </div>

      {/* Content */}
      <div className="relative -mt-48 px-4 md:px-8 lg:px-12 pb-16">
        <Link
          href="/shows"
          className="inline-flex items-center gap-2 text-[#b3b3b3] hover:text-white mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Shows
        </Link>

        <div className="flex flex-col md:flex-row gap-8">
          {/* Poster */}
          <div className="flex-shrink-0">
            <div className="relative w-48 md:w-56 aspect-[2/3] rounded-lg overflow-hidden shadow-2xl shadow-black/50">
              <Image
                src={posterSrc}
                alt={show.title}
                fill
                className="object-cover"
                sizes="224px"
              />
            </div>
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <Badge className="bg-[#E50914] text-white border-none mb-3 text-xs">
              TV Series
            </Badge>

            <h1 className="text-3xl md:text-4xl font-black text-white mb-3">
              {show.title}
            </h1>

            <div className="flex items-center gap-4 mb-4 text-sm flex-wrap">
              {show.rating && (
                <span className="flex items-center gap-1 text-[#46d369] font-semibold">
                  <Star className="w-4 h-4 fill-current" />
                  {show.rating}
                </span>
              )}
              {show.year && (
                <span className="flex items-center gap-1 text-white/70">
                  <Calendar className="w-4 h-4" />
                  {show.year}
                </span>
              )}
              {show.runtime && (
                <span className="flex items-center gap-1 text-white/70">
                  <Clock className="w-4 h-4" />
                  {show.runtime} min/ep
                </span>
              )}
              {show.genres && (
                <span className="text-white/50">{show.genres}</span>
              )}
            </div>

            {show.overview && (
              <p className="text-white/80 text-sm leading-relaxed max-w-2xl mb-6">
                {show.overview}
              </p>
            )}

            <p className="text-[#b3b3b3] text-sm">
              {seasons.length} Season{seasons.length !== 1 ? "s" : ""} · {episodes.length} File
              {episodes.length !== 1 ? "s" : ""}
            </p>
          </div>
        </div>

        {/* Season tabs */}
        <div className="mt-10">
          <div className="flex items-center gap-1 mb-6 overflow-x-auto pb-2" style={{ scrollbarWidth: "none" }}>
            {seasons.map((season) => (
              <button
                key={season}
                onClick={() => setActiveSeason(season ?? 1)}
                className={`px-5 py-2 rounded-full text-sm font-medium transition-all whitespace-nowrap ${
                  activeSeason === season
                    ? "bg-white text-black"
                    : "bg-white/10 text-white/70 hover:bg-white/20 hover:text-white"
                }`}
              >
                Season {season}
              </button>
            ))}
          </div>

          {/* Episode list */}
          <div className="space-y-2">
            {seasonEpisodes.map((ep) => {
              const epLabel =
                ep.episode_start === ep.episode_end
                  ? `Episode ${ep.episode_start}`
                  : `Episodes ${ep.episode_start}–${ep.episode_end}`;

              const epBadge =
                ep.episode_start === ep.episode_end
                  ? `E${String(ep.episode_start).padStart(2, "0")}`
                  : `E${String(ep.episode_start).padStart(2, "0")}–E${String(ep.episode_end).padStart(2, "0")}`;

              return (
                <div
                  key={ep.id}
                  className={`flex items-center gap-4 p-4 rounded-lg transition-colors ${
                    ep.available
                      ? "bg-white/5 hover:bg-white/10"
                      : "bg-white/[0.02] opacity-50"
                  }`}
                >
                  {/* Episode number */}
                  <div className="flex-shrink-0 w-12 text-center">
                    <span className="text-2xl font-bold text-white/30">
                      {ep.episode_start}
                    </span>
                  </div>

                  {/* Episode thumbnail (use poster as fallback) */}
                  <div className="relative w-32 aspect-video rounded overflow-hidden flex-shrink-0 bg-[#1a1a2e]">
                    <Image
                      src={ep.poster || "/placeholder.jpg"}
                      alt={epLabel}
                      fill
                      className={`object-cover ${!ep.available ? "grayscale" : ""}`}
                      sizes="128px"
                    />
                    {ep.available ? (
                      <Link
                        href={`/player/${ep.id}`}
                        className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 hover:opacity-100 transition-opacity"
                      >
                        <div className="bg-white/90 rounded-full p-2">
                          <Play className="w-5 h-5 text-black fill-black" />
                        </div>
                      </Link>
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                        <HardDrive className="w-5 h-5 text-[#E50914]/70" />
                      </div>
                    )}
                  </div>

                  {/* Episode info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-sm font-semibold text-white">{epLabel}</h3>
                      <Badge
                        variant="secondary"
                        className="text-[10px] bg-white/10 text-white/70 border-none"
                      >
                        {epBadge}
                      </Badge>
                      {!ep.available && (
                        <Badge className="text-[10px] bg-[#E50914]/20 text-[#E50914] border-none">
                          HDD Disconnected
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-white/40 truncate">{ep.filename}</p>
                    {ep.runtime && (
                      <p className="text-xs text-white/30 mt-1">{ep.runtime} min</p>
                    )}
                  </div>

                  {/* Play button */}
                  {ep.available && (
                    <Link
                      href={`/player/${ep.id}`}
                      className="flex-shrink-0 bg-white hover:bg-white/80 text-black px-4 py-2 rounded text-sm font-semibold transition-colors hidden md:flex items-center gap-2"
                    >
                      <Play className="w-4 h-4 fill-black" />
                      Play
                    </Link>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
