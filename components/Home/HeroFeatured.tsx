"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Play, ChevronLeft, ChevronRight, Star, Clock } from "lucide-react";
import { useBackground } from "@/components/BackgroundContext";
import type { MediaEntry } from "@/lib/db";

export default function HeroFeatured({ items }: { items: MediaEntry[] }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const { setBgImage } = useBackground();

  useEffect(() => {
    if (items && items.length > 0) {
      setBgImage(items[currentIndex].backdrop || items[currentIndex].poster || null);
    }
  }, [currentIndex, items, setBgImage]);

  useEffect(() => {
    if (items.length <= 1) return;
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % items.length);
    }, 8000);
    return () => clearInterval(timer);
  }, [items.length]);

  const handleNext = useCallback(() => {
    setCurrentIndex((prev) => (prev === items.length - 1 ? 0 : prev + 1));
  }, [items.length]);

  const handlePrev = useCallback(() => {
    setCurrentIndex((prev) => (prev === 0 ? items.length - 1 : prev - 1));
  }, [items.length]);

  if (!items || items.length === 0) {
    return (
      <div className="relative w-full min-h-[60vh] flex items-center justify-center">
        <div className="text-center px-8 glass rounded-3xl p-12 max-w-lg">
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-3">
            Welcome to <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-cyan-400">VidLock</span>
          </h1>
          <p className="text-white/40 mb-6">
            Your personal offline media library. Scan your files to get started.
          </p>
          <Link href="/settings" className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-gradient-to-r from-violet-500 to-cyan-500 text-white font-semibold hover:opacity-90 transition-opacity shadow-lg shadow-violet-500/20">
            <Play className="w-4 h-4 fill-current" />
            Get Started
          </Link>
        </div>
      </div>
    );
  }

  const currentItem = items[currentIndex];

  return (
    <div className="relative w-full min-h-[75vh] md:min-h-[85vh] overflow-hidden">
      {/* Background image with crossfade */}
      {items.map((item, idx) => (
        <div
          key={item.id}
          className="absolute inset-0 transition-opacity duration-1000 ease-in-out"
          style={{ opacity: idx === currentIndex ? 1 : 0 }}
        >
          <img
            src={item.backdrop || item.poster || undefined}
            alt={item.title}
            className="w-full h-full object-cover object-center scale-105"
          />
        </div>
      ))}

      {/* Gradient overlays */}
      <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-background/20 z-[1]" />
      {/* <div className="absolute inset-0 bg-gradient-to-r from-background/80 via-background/30 to-transparent z-[1]" /> */}
      {/* <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-background to-transparent z-[1]" /> */}

      {/* Content */}
      <div className="relative z-10 flex items-end min-h-[75vh] md:min-h-[85vh] px-4 md:px-8 lg:px-12 pb-20 md:pb-28">
        <div className="max-w-2xl">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 glass rounded-full px-3 py-1.5 mb-5 text-xs font-medium text-white/60">
            <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-pulse" />
            Featured
          </div>

          {/* Title */}
          <h1
            key={`title-${currentItem.id}`}
            className="text-4xl md:text-6xl lg:text-7xl font-bold text-white leading-[0.95] tracking-tight mb-4 animate-in fade-in slide-in-from-bottom-4 duration-700"
          >
            {currentItem.title}
          </h1>

          {/* Metadata */}
          <div className="flex items-center gap-3 text-sm text-white/40 font-medium mb-4 flex-wrap animate-in fade-in slide-in-from-bottom-3 duration-700 delay-100">
            {currentItem.year && <span>{currentItem.year}</span>}
            {currentItem.rating && (
              <>
                <span className="w-1 h-1 rounded-full bg-white/20" />
                <span className="flex items-center gap-1 text-violet-300">
                  <Star className="w-3.5 h-3.5 fill-current" />
                  {currentItem.rating.split('/')[0]}
                </span>
              </>
            )}
            {currentItem.genres && (
              <>
                <span className="w-1 h-1 rounded-full bg-white/20" />
                <span>{currentItem.genres.split(",").slice(0, 2).map(g => g.trim()).join(" / ")}</span>
              </>
            )}
            {currentItem.runtime && (
              <>
                <span className="w-1 h-1 rounded-full bg-white/20" />
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {Math.floor(currentItem.runtime / 60)}h {currentItem.runtime % 60}m
                </span>
              </>
            )}
          </div>

          {/* Overview */}
          {currentItem.overview && (
            <p className="text-sm text-white/35 line-clamp-2 max-w-lg leading-relaxed mb-6 animate-in fade-in slide-in-from-bottom-2 duration-700 delay-200">
              {currentItem.overview}
            </p>
          )}

          {/* Actions */}
          <div className="flex items-center gap-3 animate-in fade-in slide-in-from-bottom-2 duration-700 delay-300">
            {currentItem.available === 1 && (
              <Link
                href={`/player/${currentItem.id}`}
                className="inline-flex items-center gap-2.5 px-7 py-3 rounded-full bg-gradient-to-r from-violet-500 to-violet-600 text-white font-semibold text-sm hover:from-violet-400 hover:to-violet-500 transition-all shadow-lg shadow-violet-500/25 hover:shadow-violet-500/40 hover:scale-[1.02] active:scale-[0.98]"
              >
                <Play className="w-4 h-4 fill-current" />
                Watch Now
              </Link>
            )}
            <Link
              href={`/${currentItem.type === "show" ? "shows" : "movies"}/${encodeURIComponent(currentItem.title.toLowerCase().replace(/\s+/g, "-"))}`}
              className="inline-flex items-center gap-2 px-5 py-3 rounded-full glass text-white/70 text-sm font-medium hover:text-white hover:bg-white/[0.08] transition-all"
            >
              Details
            </Link>
          </div>
        </div>

        {/* Carousel controls */}
        {items.length > 1 && (
          <div className="absolute bottom-20 md:bottom-28 right-4 md:right-8 lg:right-12 flex items-center gap-3 z-20">
            {/* Dots */}
            <div className="flex items-center gap-1.5 mr-2">
              {items.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setCurrentIndex(idx)}
                  className={`hero-dot ${idx === currentIndex ? "active" : ""}`}
                />
              ))}
            </div>

            <button
              onClick={handlePrev}
              className="w-10 h-10 rounded-full glass flex items-center justify-center text-white/50 hover:text-white hover:bg-white/[0.08] transition-all"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={handleNext}
              className="w-10 h-10 rounded-full glass flex items-center justify-center text-white/50 hover:text-white hover:bg-white/[0.08] transition-all"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
