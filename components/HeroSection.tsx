"use client";

import Image from "next/image";
import Link from "next/link";
import { Play, Info, Star } from "lucide-react";
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
}

interface HeroSectionProps {
  media: MediaEntry | null;
}

export default function HeroSection({ media }: HeroSectionProps) {
  if (!media) {
    return (
      <div className="relative w-full h-[70vh] md:h-[85vh] bg-gradient-to-b from-[#1a1a2e] to-[#141414] flex items-center justify-center">
        <div className="text-center px-8">
          <h1 className="text-4xl md:text-6xl font-bold text-white mb-4">
            Welcome to <span className="text-[#E50914]">VidLock</span>
          </h1>
          <p className="text-lg text-[#b3b3b3] max-w-xl mx-auto mb-8">
            Your personal offline media library. Scan your media files to get started.
          </p>
          <Link
            href="/settings"
            className="inline-flex items-center gap-2 bg-[#E50914] hover:bg-[#f6121d] text-white px-6 py-3 rounded-md font-semibold transition-colors"
          >
            <Play className="w-5 h-5 fill-white" />
            Get Started
          </Link>
        </div>
      </div>
    );
  }

  const posterSrc = media.poster || "/placeholder.jpg";

  return (
    <div className="relative w-full h-[70vh] md:h-[85vh] overflow-hidden">
      {/* Background poster */}
      <div className="absolute inset-0">
        <Image
          src={posterSrc}
          alt={media.title}
          fill
          className="object-cover object-top blur-sm scale-105"
          priority
          sizes="100vw"
        />
      </div>

      {/* Left gradient overlay */}
      <div className="absolute inset-0 hero-gradient" />

      {/* Bottom gradient overlay */}
      <div className="absolute inset-0 hero-gradient-bottom" />

      {/* Content */}
      <div className="relative h-full flex items-end pb-16 md:pb-24 px-4 md:px-8 lg:px-12">
        <div className="max-w-2xl">
          {/* Type badge */}
          <Badge className="bg-[#E50914] text-white border-none mb-4 text-xs">
            {media.type === "show" ? "TV Series" : "Movie"}
          </Badge>

          {/* Title */}
          <h1 className="text-3xl md:text-5xl lg:text-6xl font-black text-white mb-3 leading-tight drop-shadow-lg">
            {media.title}
          </h1>

          {/* Meta info */}
          <div className="flex items-center gap-3 mb-4 text-sm flex-wrap">
            {media.rating && (
              <span className="flex items-center gap-1 text-[#46d369] font-semibold">
                <Star className="w-4 h-4 fill-current" />
                {media.rating}
              </span>
            )}
            {media.year && (
              <span className="text-white/70">{media.year}</span>
            )}
            {media.runtime && (
              <span className="text-white/70">{media.runtime} min</span>
            )}
            {media.genres && (
              <span className="text-white/50">{media.genres}</span>
            )}
          </div>

          {/* Overview */}
          {media.overview && (
            <p className="text-sm md:text-base text-white/80 mb-6 line-clamp-3 max-w-lg leading-relaxed">
              {media.overview}
            </p>
          )}

          {/* Action buttons */}
          <div className="flex items-center gap-3">
            {media.available ? (
              <Link
                href={
                  media.type === "show"
                    ? `/shows/${encodeURIComponent(media.title.toLowerCase().replace(/\s+/g, "-"))}`
                    : `/player/${media.id}`
                }
                className="inline-flex items-center gap-2 bg-white hover:bg-white/80 text-black px-6 md:px-8 py-2.5 md:py-3 rounded-md font-bold text-sm md:text-base transition-colors"
              >
                <Play className="w-5 h-5 fill-black" />
                {media.type === "show" ? "View Show" : "Play"}
              </Link>
            ) : null}
            <Link
              href={
                media.type === "show"
                  ? `/shows/${encodeURIComponent(media.title.toLowerCase().replace(/\s+/g, "-"))}`
                  : `/player/${media.id}`
              }
              className="inline-flex items-center gap-2 bg-white/20 hover:bg-white/30 text-white px-6 md:px-8 py-2.5 md:py-3 rounded-md font-semibold text-sm md:text-base transition-colors backdrop-blur-sm"
            >
              <Info className="w-5 h-5" />
              More Info
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
