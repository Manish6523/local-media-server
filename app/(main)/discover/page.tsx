"use client";

import { useEffect, useState } from "react";

import { MediaEntry } from "@/lib/db";
import MiniMoviesList from "@/components/Home/MiniMoviesList";
import SeriesRow from "@/components/Home/SeriesRow";
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

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#111] to-[#050505] pt-28 pb-32">
      <div className="px-5 md:px-10 lg:px-14 mb-12">
        <h1 className="text-4xl md:text-5xl font-black text-white tracking-tight flex items-center gap-4">
          Discover
          <Sparkles className="w-8 h-8 text-violet-400" />
        </h1>
        <p className="text-white/40 mt-3 text-lg font-medium">
          Trending movies and TV shows from around the web.
        </p>
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
