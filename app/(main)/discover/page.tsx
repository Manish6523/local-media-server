"use client";

import { useEffect, useState } from "react";
import { MediaEntry } from "@/lib/db";
import MiniMoviesList from "@/components/Home/MiniMoviesList";
import SeriesRow from "@/components/Home/SeriesRow";
import HeroFeatured from "@/components/Home/HeroFeatured";
import { Sparkles } from "lucide-react";

export default function DiscoverPage() {
  const [movies, setMovies] = useState<MediaEntry[]>([]);
  const [shows, setShows] = useState<MediaEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/trending?window=day");
        const data = await res.json();
        setMovies(data.movies || []);
        setShows(data.shows || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="w-full min-h-screen flex items-center justify-center bg-[#050505]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-2 border-violet-500/20 border-t-violet-400 rounded-full animate-spin" />
          <span className="text-sm text-white/30 font-medium">Discovering new content...</span>
        </div>
      </div>
    );
  }

  // Build carousel items from trending movies & shows that have backdrops
  const allTrending = [...movies, ...shows];
  const heroItems = allTrending
    .filter((m) => m.backdrop && m.overview)
    .slice(0, 7);

  return (
    <div className="min-h-screen bg-[#050505] pb-32">
      {/* Hero Carousel — same component as the home screen */}
      <HeroFeatured items={heroItems} />

      {/* Discover Header */}
      <div className="px-5 md:px-10 lg:px-14 mb-12 mt-12">
        <h2 className="text-3xl md:text-4xl font-black text-white tracking-tight flex items-center gap-3">
          Discover More
          <Sparkles className="w-6 h-6 text-violet-400" />
        </h2>
      </div>

      <div className="relative z-10 w-full px-5 md:px-10 lg:px-14 space-y-16">
        {/* Trending Movies */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-white flex items-center gap-2">
              <span className="w-1.5 h-6 bg-violet-500 rounded-full shadow-[0_0_10px_rgba(139,92,246,0.5)]" />
              Trending Movies
            </h2>
          </div>
          <MiniMoviesList items={movies} />
        </div>

        {/* Trending Shows */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-white flex items-center gap-2">
              <span className="w-1.5 h-6 bg-emerald-500 rounded-full shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
              Trending TV Shows
            </h2>
          </div>
          <SeriesRow items={shows} />
        </div>
      </div>
    </div>
  );
}
