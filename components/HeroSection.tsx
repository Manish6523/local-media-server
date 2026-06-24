"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import { Play, ChevronLeft, ChevronRight, MoreHorizontal, Shuffle } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/Toast";

import type { MediaEntry } from "@/lib/db";

interface HeroSectionProps {
  items: MediaEntry[];
  allMedia?: MediaEntry[];
}

export default function HeroSection({ items, allMedia = [] }: HeroSectionProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [shuffleLoading, setShuffleLoading] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  const handleShuffle = useCallback(async () => {
    setShuffleLoading(true);
    try {
      const res = await fetch("/api/shuffle?type=both");
      const data = await res.json();
      if (data.found) {
        await new Promise(r => setTimeout(r, 300));
        router.push(data.href);
      } else {
        toast("You've watched everything! Mark some as unwatched to shuffle again \ud83c\udf89", "success");
      }
    } catch {
      toast("Shuffle failed \u2014 please try again", "error");
    } finally {
      setShuffleLoading(false);
    }
  }, [router, toast]);

  // Build trending list from allMedia or items
  const trendingItems = (allMedia.length > 0 ? allMedia : items)
    .filter((m) => m.poster && m.available)
    .slice(0, 4);

  useEffect(() => {
    if (items.length <= 1) return;

    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % items.length);
    }, 10000);

    return () => clearInterval(timer);
  }, [items.length]);

  const goNext = useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % items.length);
  }, [items.length]);

  const goPrev = useCallback(() => {
    setCurrentIndex((prev) => (prev - 1 + items.length) % items.length);
  }, [items.length]);

  if (items.length === 0) {
    return (
      <div className="relative w-full h-[70vh] bg-background flex items-center justify-center">
        <div className="text-center px-8">
          <h1 className="text-4xl md:text-6xl font-black text-foreground mb-4">
            Welcome to <span className="text-primary">Filmaro</span>
          </h1>
          <p className="text-lg text-muted-foreground max-w-xl mx-auto mb-8">
            Your personal offline media library. Scan your media files to get started.
          </p>
          <Link href="/settings" className="inline-flex items-center gap-2 bg-white text-black px-8 py-3 rounded-full font-bold hover:bg-white/90 transition-all">
            <Play className="w-5 h-5 fill-current" />
            Get Started
          </Link>
        </div>
      </div>
    );
  }

  const activeMedia = items[currentIndex];
  const hrefLink =
    activeMedia.type === "show"
      ? `/shows/${encodeURIComponent(activeMedia.title.toLowerCase().replace(/\s+/g, "-"))}`
      : `/movies/${encodeURIComponent(activeMedia.title.toLowerCase().replace(/\s+/g, "-"))}`;

  return (
    <div className="relative w-full min-h-[75vh] md:min-h-[85vh] bg-background overflow-hidden">
      {/* Main Layout: Sidebar + Hero */}
      <div className="relative z-10 h-full flex flex-col md:flex-row px-4 md:px-8 lg:px-14 pt-6 md:pt-10 gap-6 md:gap-8">

        {/* ── LEFT SIDEBAR: Trending Now ── */}
        <div className="hidden lg:flex flex-col w-[320px] shrink-0 z-20">
          <div className="glass-card p-5 flex-1 flex flex-col">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <span className="text-lg">🔥</span> Trending Now
              </h3>
              <Link href="/movies" className="text-[11px] text-white/50 hover:text-white transition-colors font-medium">
                See all
              </Link>
            </div>

            <div className="flex flex-col gap-3 flex-1">
              {trendingItems.map((item, idx) => {
                const itemHref =
                  item.type === "show"
                    ? `/shows/${encodeURIComponent(item.title.toLowerCase().replace(/\s+/g, "-"))}`
                    : `/movies/${encodeURIComponent(item.title.toLowerCase().replace(/\s+/g, "-"))}`;
                return (
                  <Link
                    key={`trending-${item.id}-${idx}`}
                    href={itemHref}
                    className="trending-card group flex gap-3 p-2 rounded-xl items-center"
                  >
                    <div className="relative w-[90px] h-[120px] rounded-lg overflow-hidden shrink-0 border border-white/10">
                      <Image
                        src={item.poster || "/placeholder.jpg"}
                        alt={item.title}
                        fill
                        className="object-cover transition-transform duration-500 group-hover:scale-110"
                        sizes="90px"
                      />
                      {/* Play icon overlay */}
                      <div className="absolute bottom-2 right-2 w-7 h-7 rounded-full bg-white/90 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-lg">
                        <Play className="w-3.5 h-3.5 text-black fill-black ml-0.5" />
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-semibold text-white truncate">{item.title}</h4>
                      <p className="text-[11px] text-white/40 mt-1">
                        {item.year || ""}{item.year && item.genres ? " · " : ""}{item.genres?.split(",")[0]?.trim() || (item.type === "show" ? "Series" : "Movie")}
                      </p>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>

        {/* ── RIGHT: Hero Carousel ── */}
        <div className="flex-1 relative z-10 min-h-[400px] md:min-h-[500px]">
          <div className="relative w-full h-full rounded-2xl md:rounded-3xl overflow-hidden glass-card">
            {/* Background Image */}
            <AnimatePresence mode="popLayout">
              <motion.div
                key={activeMedia.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.8 }}
                className="absolute inset-0 z-0"
              >
                <Image
                  src={activeMedia.backdrop || activeMedia.poster || "/placeholder.jpg"}
                  alt={activeMedia.title}
                  fill
                  className="object-cover object-center"
                  priority
                  sizes="(max-width: 1024px) 100vw, 70vw"
                />
              </motion.div>
            </AnimatePresence>

            {/* Gradient overlays */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent z-[1]" />
            <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-transparent to-transparent z-[1]" />

            {/* Trending badge */}
            <div className="absolute top-5 left-5 z-10">
              <span className="inline-flex items-center gap-1.5 bg-white/10 backdrop-blur-md border border-white/10 text-white text-[11px] font-semibold px-3 py-1.5 rounded-full">
                <span>🔥</span> Trending Now
              </span>
            </div>

            {/* Content overlay */}
            <AnimatePresence mode="popLayout">
              <motion.div
                key={`content-${activeMedia.id}`}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.5, delay: 0.15 }}
                className="absolute bottom-0 left-0 right-0 p-6 md:p-10 z-10"
              >
                {/* Title */}
                <h1 className="text-4xl md:text-6xl lg:text-7xl font-black text-white leading-[0.95] tracking-tight drop-shadow-2xl mb-3">
                  {activeMedia.title}
                </h1>

                {/* Metadata */}
                <div className="flex items-center gap-2 text-white/60 text-sm font-medium mb-3 flex-wrap">
                  {activeMedia.year && <span>{activeMedia.year}</span>}
                  {activeMedia.genres && (
                    <>
                      <span className="w-1 h-1 rounded-full bg-white/30" />
                      <span>{activeMedia.genres.split(",").slice(0, 2).map(g => g.trim()).join("/")}</span>
                    </>
                  )}
                  {activeMedia.runtime && (
                    <>
                      <span className="w-1 h-1 rounded-full bg-white/30" />
                      <span>{Math.floor(activeMedia.runtime / 60)}h {activeMedia.runtime % 60}m</span>
                    </>
                  )}
                </div>

                {/* Overview */}
                {activeMedia.overview && (
                  <p className="text-sm text-white/50 line-clamp-2 max-w-lg leading-relaxed mb-5">
                    {activeMedia.overview}
                  </p>
                )}

                {/* Action buttons */}
                <div className="flex items-center gap-3">
                  {activeMedia.available === 1 && (
                    <Link
                      href={hrefLink}
                      className="inline-flex items-center gap-2 bg-white text-black px-7 py-3 rounded-full font-bold text-sm hover:bg-white/90 transition-all shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98]"
                    >
                      <Play className="w-4 h-4 fill-current" />
                      Watch
                    </Link>
                  )}
                  <button className="w-11 h-11 rounded-full bg-white/10 backdrop-blur-md border border-white/15 flex items-center justify-center text-white/70 hover:text-white hover:bg-white/20 transition-all">
                    <MoreHorizontal className="w-5 h-5" />
                  </button>
                  <button
                    onClick={handleShuffle}
                    disabled={shuffleLoading}
                    className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-md border border-white/15 text-white/70 px-5 py-2.5 rounded-full font-semibold text-sm hover:bg-white/20 hover:text-white transition-all disabled:opacity-50"
                  >
                    <Shuffle className={`w-4 h-4 ${shuffleLoading ? "animate-spin" : ""}`} />
                    Shuffle
                  </button>
                </div>
              </motion.div>
            </AnimatePresence>

            {/* Carousel navigation arrows */}
            {items.length > 1 && (
              <div className="absolute bottom-6 right-6 z-20 flex items-center gap-2">
                {/* Dots */}
                <div className="flex items-center gap-1.5 mr-3">
                  {items.map((_, idx) => (
                    <button
                      key={idx}
                      onClick={() => setCurrentIndex(idx)}
                      className={`hero-dot ${idx === currentIndex ? "active" : ""}`}
                    />
                  ))}
                </div>
                <button
                  onClick={goPrev}
                  className="w-9 h-9 rounded-full bg-white/10 backdrop-blur-md border border-white/10 flex items-center justify-center text-white/70 hover:text-white hover:bg-white/20 transition-all"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={goNext}
                  className="w-9 h-9 rounded-full bg-white/10 backdrop-blur-md border border-white/10 flex items-center justify-center text-white/70 hover:text-white hover:bg-white/20 transition-all"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
