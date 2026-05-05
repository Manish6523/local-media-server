"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { Play, Star } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import FavoriteButton from "./FavoriteButton";

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
  season?: number | null;
  is_favorite?: number;
  backdrop?: string | null;
}

interface HeroSectionProps {
  items: MediaEntry[];
}

export default function HeroSection({ items }: HeroSectionProps) {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (items.length <= 1) return;
    
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % items.length);
    }, 10000); // 10 seconds
    
    return () => clearInterval(timer);
  }, [items.length]);

  if (items.length === 0) {
    return (
      <div className="relative w-full h-[100vh] bg-[#0a0a0a] flex items-center justify-center">
        <div className="text-center px-8">
          <h1 className="text-4xl md:text-6xl font-black text-white mb-4">
            Welcome to <span className="text-[#00E676]">VidLock</span>
          </h1>
          <p className="text-lg text-[#808080] max-w-xl mx-auto mb-8">
            Your personal offline media library. Scan your media files to get started.
          </p>
          <Link
            href="/settings"
            className="inline-flex items-center gap-2 bg-[#00E676] hover:bg-[#00c565] text-black px-8 py-3 rounded-full font-bold transition-colors"
          >
            <Play className="w-5 h-5 fill-black" />
            Get Started
          </Link>
        </div>
      </div>
    );
  }

  const renderStars = (ratingStr: string | null) => {
    if (!ratingStr) return null;
    const match = ratingStr.match(/(\d+\.?\d*)/);
    if (!match) return null;
    let score = parseFloat(match[1]);
    if (ratingStr.includes("/10") || score > 5) {
      score = score / 2; // Convert 10 scale to 5 scale
    }
    const stars = Math.round(score);
    return (
      <div className="flex gap-1.5 text-[#00E676] my-4">
        {[1, 2, 3, 4, 5].map((s) => (
          <Star key={s} className={`w-6 h-6 ${s <= stars ? "fill-current" : "fill-transparent opacity-30"}`} />
        ))}
      </div>
    );
  };

  const activeMedia = items[currentIndex];

  return (
    <div className="relative w-full h-[100vh] overflow-hidden bg-[#0a0a0a]">
      {items.map((media, index) => {
        const localBgImage = media.backdrop || media.poster || "/placeholder.jpg";
        const isActive = index === currentIndex;

        return (
          <div
            key={media.id}
            className={`absolute inset-0 transition-opacity duration-1000 ${
              isActive ? "opacity-100 z-10" : "opacity-0 z-0"
            }`}
          >
            {/* Main Background */}
            <div className="absolute inset-0 z-0">
              <Image
                src={localBgImage}
                alt={media.title}
                fill
                className="object-cover object-center"
                priority={index === 0}
                sizes="100vw"
              />
            </div>

            {/* Heavy Dark Gradients for Readability */}
            {/* <div className="absolute inset-0 bg-gradient-to-r from-[#0a0a0a] via-[#0a0a0a]/80 to-transparent w-[80%]" /> */}
            {/* <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] via-[#0a0a0a]/50 to-transparent" /> */}
            <div className="absolute inset-0 bg-[#0a0a0a]/20" />
             {/* Slight overall darkening */}

            {/* Content positioned on left */}
            <div className="relative h-full flex flex-col justify-center px-6 md:px-12 lg:px-20 w-full md:w-[60%] lg:w-[50%] pb-32">
              <h1 
                className="text-5xl md:text-7xl lg:text-8xl font-black text-white leading-none mb-2 tracking-tight"
                style={{ textShadow: "0 4px 24px rgba(0,0,0,0.5)" }}
              >
                {media.title.toUpperCase()}
              </h1>
              
              {media.type === "show" && media.season && (
                <p className="text-2xl text-white/90 font-medium mt-2">
                  Season {media.season}
                </p>
              )}

              {/* Stars */}
              {renderStars(media.rating)}

              {/* Genres joined by | */}
              {media.genres && (
                <div className="text-white/80 font-medium tracking-wide flex gap-2 items-center flex-wrap">
                  {media.genres.split(",").map(g => g.trim()).join(" | ")}
                </div>
              )}

              {/* Overview */}
              {media.overview && (
                <p className="text-base md:text-lg text-white/90 mt-6 line-clamp-3 leading-relaxed max-w-xl font-medium">
                  {media.overview}
                </p>
              )}

              {/* Action buttons */}
              <div className="flex items-center gap-4 mt-8">
                {media.available && (
                  <Link
                    href={
                      media.type === "show"
                        ? `/shows/${encodeURIComponent(media.title.toLowerCase().replace(/\s+/g, "-"))}`
                        : `/movies/${encodeURIComponent(media.title.toLowerCase().replace(/\s+/g, "-"))}`
                    }
                    className="inline-flex items-center gap-2 bg-[#00E676] hover:bg-[#00c565] text-black px-8 py-3 rounded-full font-bold text-lg transition-colors shadow-lg shadow-[#00E676]/20"
                  >
                    <Play className="w-5 h-5 fill-black" />
                    Play Now
                  </Link>
                )}
                
                <button className="inline-flex items-center gap-2 bg-transparent border border-white hover:bg-white/10 text-white px-8 py-3 rounded-full font-bold text-lg transition-colors">
                  Trailer
                </button>
              </div>
            </div>
          </div>
        );
      })}

      {/* Interactive Poster Carousel at bottom */}
      <div className="absolute bottom-6 left-0 right-0 z-30 px-6 md:px-12 lg:px-20">
        <div className="flex items-end gap-3 md:gap-4 overflow-x-auto pb-4 pt-2 scrollbar-hide" style={{ scrollbarWidth: "none" }}>
          {items.map((media, index) => {
            const isActive = index === currentIndex;
            return (
              <button
                key={`carousel-${media.id}`}
                onClick={() => setCurrentIndex(index)}
                className={`relative flex-shrink-0 transition-all duration-300 rounded-lg overflow-hidden ${
                  isActive 
                    ? "w-32 md:w-40 aspect-[2/3] border-2 border-[#00E676] shadow-xl shadow-[#00E676]/20 -translate-y-2" 
                    : "w-28 md:w-32 aspect-[2/3] border border-white/20 opacity-60 hover:opacity-100"
                }`}
              >
                <Image
                  src={media.poster || "/placeholder.jpg"}
                  alt={media.title}
                  fill
                  className="object-cover"
                  sizes="160px"
                />
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
