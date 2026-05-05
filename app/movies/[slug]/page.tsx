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

export default function MovieDetailPage() {
  const params = useParams();
  const slug = params.slug as string;
  const [movie, setMovie] = useState<MediaEntry | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/media?type=movie")
      .then((r) => r.json())
      .then((data: MediaEntry[]) => {
        // Find the movie matching this slug
        const found = data.find(
          (m: MediaEntry) =>
            m.title.toLowerCase().replace(/\s+/g, "-") === decodeURIComponent(slug)
        );
        setMovie(found || null);
      })
      .catch(() => setMovie(null))
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

  if (!movie) {
    return (
      <div className="min-h-screen bg-[#141414] pt-24 px-4 md:px-8 lg:px-12">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-[#b3b3b3] hover:text-white mb-8 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back Home
        </Link>
        <p className="text-white/60 text-lg">Movie not found.</p>
      </div>
    );
  }

  const posterSrc = movie.poster || "/placeholder.jpg";
  const bgImage = movie.backdrop || movie.poster || "/placeholder.jpg";
  const progressPercent = movie.watch_progress && movie.runtime
    ? Math.min(100, Math.max(0, (movie.watch_progress / (movie.runtime * 60)) * 100))
    : 0;

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      {/* Backdrop */}
      <div className="absolute top-0 left-0 right-0 h-[60vh] md:h-[75vh] overflow-hidden z-0">
        <Image
          src={bgImage}
          alt={movie.title}
          fill
          className="object-cover object-top blur-sm scale-105 opacity-50"
          priority
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] via-[#0a0a0a]/60 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#0a0a0a] via-[#0a0a0a]/40 to-transparent" />
      </div>

      {/* Content */}
      <div className="relative z-10 pt-[35vh] md:pt-[45vh] px-6 md:px-10 lg:px-14 pb-20 max-w-[1920px] mx-auto">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-[#808080] hover:text-white mb-6 transition-colors font-medium"
        >
          <ArrowLeft className="w-4 h-4" />
          Back Home
        </Link>

        <div className="flex flex-col md:flex-row gap-8 lg:gap-12 items-start">
          {/* Poster */}
          <div className="flex-shrink-0 relative">
            <div className="relative w-48 md:w-64 aspect-[2/3] rounded-lg overflow-hidden shadow-2xl shadow-black">
              <Image
                src={posterSrc}
                alt={movie.title}
                fill
                className={`object-cover ${!movie.available ? "grayscale" : ""}`}
                sizes="(max-width: 768px) 192px, 256px"
                priority
              />
              
              {/* Progress Bar */}
              {progressPercent > 0 && (
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/20 z-20">
                  <div 
                    className="h-full bg-[#E50914]" 
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
              )}
            </div>
            {!movie.available && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 z-10 bg-black/60 rounded-lg">
                <HardDrive className="w-10 h-10 text-[#E50914]/80" />
                <span className="text-xs font-medium text-[#E50914] bg-black/80 px-2 py-1 rounded">
                  HDD Not Connected
                </span>
              </div>
            )}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0 pt-2">
            <Badge className="bg-transparent border border-white/20 text-white/90 mb-4 text-xs tracking-widest px-3 py-1">
              MOVIE
            </Badge>

            <h1 className="text-4xl md:text-5xl lg:text-6xl font-black text-white mb-4 tracking-tight leading-tight">
              {movie.title}
            </h1>

            <div className="flex items-center gap-4 mb-6 text-sm flex-wrap font-medium">
              {movie.rating && (
                <span className="flex items-center gap-1 text-[#00E676]">
                  <Star className="w-4 h-4 fill-current" />
                  {movie.rating.replace("/10", "")}
                </span>
              )}
              {movie.year && (
                <span className="flex items-center gap-1 text-[#808080]">
                  <Calendar className="w-4 h-4" />
                  {movie.year}
                </span>
              )}
              {movie.runtime && (
                <span className="flex items-center gap-1 text-[#808080]">
                  <Clock className="w-4 h-4" />
                  {movie.runtime} min
                </span>
              )}
              {movie.genres && (
                <span className="text-[#808080]">{movie.genres}</span>
              )}
            </div>

            {movie.overview && (
              <p className="text-[#b3b3b3] text-base md:text-lg leading-relaxed max-w-3xl mb-8">
                {movie.overview}
              </p>
            )}

            {/* Play Button */}
            <div className="flex items-center gap-4">
              {movie.available ? (
                <Link
                  href={`/player/${movie.id}`}
                  className="inline-flex items-center gap-2 bg-[#00E676] hover:bg-[#00E676]/90 text-black px-8 py-3 rounded-full font-bold text-lg transition-colors shadow-lg shadow-[#00E676]/20"
                >
                  <Play className="w-5 h-5 fill-black" />
                  Play Now
                </Link>
              ) : (
                <button
                  disabled
                  className="inline-flex items-center gap-2 bg-white/10 text-white/50 px-8 py-3 rounded-full font-bold text-lg cursor-not-allowed"
                >
                  <HardDrive className="w-5 h-5" />
                  HDD Required
                </button>
              )}
            </div>
            
            <p className="text-[#808080] text-sm font-medium mt-6">
              File: {movie.filename}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
