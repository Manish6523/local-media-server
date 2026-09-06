"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Play, ChevronLeft, ChevronRight, Star, Clock, FolderPlus, Scan, Film } from "lucide-react";
import { useBackground } from "@/components/BackgroundContext";
import type { MediaEntry } from "@/lib/db";

export default function HeroFeatured({ items }: { items: MediaEntry[] }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const { setBgImage } = useBackground();

  useEffect(() => {
    if (items && items.length > 0) {
      setBgImage(
        items[currentIndex].backdrop || items[currentIndex].poster || null,
      );
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
      <div className="relative w-full min-h-[85vh] flex items-center justify-center p-6 overflow-hidden">
        {/* Background ambient glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-violet-600/10 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute top-1/2 left-1/4 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-cyan-600/10 rounded-full blur-[100px] pointer-events-none" />

        <div className="relative z-10 text-center max-w-5xl w-full mt-10">
          <div className="inline-flex items-center justify-center p-5 rounded-3xl bg-white/5 border border-white/10 shadow-2xl mb-8 backdrop-blur-xl animate-in fade-in zoom-in duration-700">
            <Film className="w-12 h-12 text-violet-400 drop-shadow-[0_0_15px_rgba(139,92,246,0.5)]" />
          </div>
          
          <h1 className="text-4xl md:text-5xl font-black text-white mb-6 tracking-tight animate-in fade-in slide-in-from-bottom-4 duration-700 delay-100">
            Welcome to{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 via-fuchsia-400 to-cyan-400 drop-shadow-sm">
              VidLock
            </span>
          </h1>
          
          <p className="text-white/50 mb-16 text-xl md:text-2xl max-w-2xl mx-auto font-medium animate-in fade-in slide-in-from-bottom-4 duration-700 delay-200">
            Your media universe is waiting. Let's bring it to life.
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-300">
            {/* Step 1 */}
            <div className="group relative bg-white/[0.02] hover:bg-white/[0.04] border border-white/5 hover:border-violet-500/30 rounded-3xl p-6 transition-all duration-500 overflow-hidden text-left shadow-2xl">
              <div className="absolute inset-0 bg-gradient-to-br from-violet-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <div className="w-12 h-12 rounded-xl bg-violet-500/10 text-violet-400 flex items-center justify-center mb-4 shadow-inner group-hover:scale-110 transition-transform duration-500">
                <FolderPlus className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">1. Add Folders</h3>
              <p className="text-white/40 leading-relaxed text-sm">Tell VidLock where your movies and TV shows are stored on your computer or external drives.</p>
            </div>

            {/* Step 2 */}
            <div className="group relative bg-white/[0.02] hover:bg-white/[0.04] border border-white/5 hover:border-cyan-500/30 rounded-3xl p-6 transition-all duration-500 overflow-hidden text-left shadow-2xl">
              <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <div className="w-12 h-12 rounded-xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center mb-4 shadow-inner group-hover:scale-110 transition-transform duration-500">
                <Scan className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">2. Scan Library</h3>
              <p className="text-white/40 leading-relaxed text-sm">Our scanner will magically pull in beautiful posters, backdrops, and metadata for your files.</p>
            </div>

            {/* Step 3 */}
            <div className="group relative bg-white/[0.02] hover:bg-white/[0.04] border border-white/5 hover:border-[#46d369]/30 rounded-3xl p-6 transition-all duration-500 overflow-hidden text-left shadow-2xl">
              <div className="absolute inset-0 bg-gradient-to-br from-[#46d369]/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <div className="w-12 h-12 rounded-xl bg-[#46d369]/10 text-[#46d369] flex items-center justify-center mb-4 shadow-inner group-hover:scale-110 transition-transform duration-500">
                <Play className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">3. Enjoy</h3>
              <p className="text-white/40 leading-relaxed text-sm">Sit back and experience your personal streaming service, completely offline and private.</p>
            </div>
          </div>

          <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 delay-500">
            <Link
              href="/settings"
              className="group relative inline-flex items-center gap-3 px-10 py-5 rounded-full bg-white text-black font-bold text-lg hover:scale-105 transition-all duration-300"
            >
              <span className="absolute inset-0 rounded-full bg-gradient-to-r from-violet-500 to-cyan-500 opacity-0 group-hover:opacity-30 blur-xl transition-opacity duration-500" />
              <span className="relative z-10 flex items-center gap-2">
                Get Started <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </span>
            </Link>
          </div>
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
                  {currentItem.rating.split("/")[0]}
                </span>
              </>
            )}
            {currentItem.genres && (
              <>
                <span className="w-1 h-1 rounded-full bg-white/20" />
                <span>
                  {currentItem.genres
                    .split(",")
                    .slice(0, 2)
                    .map((g) => g.trim())
                    .join(" / ")}
                </span>
              </>
            )}
            {currentItem.runtime && (
              <>
                <span className="w-1 h-1 rounded-full bg-white/20" />
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {Math.floor(currentItem.runtime / 60)}h{" "}
                  {currentItem.runtime % 60}m
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
                className="inline-flex items-center gap-2.5 sm:px-7 px-4 py-3 rounded-full bg-gradient-to-r from-violet-500 to-violet-600 text-white font-semibold text-sm hover:from-violet-400 hover:to-violet-500 transition-all shadow-lg shadow-violet-500/25 hover:shadow-violet-500/40 hover:scale-[1.02] active:scale-[0.98]"
              >
                <Play className="w-4 h-4 fill-current" />
                <span className="block sm:hidden">Watch</span>
                <span className="hidden sm:block">Watch Now</span>
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
            <div className="hidden sm:flex items-center gap-1.5 mr-2">
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
              className="w-10 h-10 rounded-full cursor-pointer glass flex items-center justify-center text-white/50 hover:text-white hover:bg-white/[0.08] transition-all"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={handleNext}
              className="w-10 h-10 rounded-full cursor-pointer glass flex items-center justify-center text-white/50 hover:text-white hover:bg-white/[0.08] transition-all"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
