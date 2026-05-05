"use client";

import { useEffect, useState } from "react";
import PosterCard from "@/components/PosterCard";
import { Tv } from "lucide-react";

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
  season: number | null;
  episode_start: number | null;
  episode_end: number | null;
}

export default function ShowsPage() {
  const [shows, setShows] = useState<MediaEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/media?type=show")
      .then((r) => r.json())
      .then((data) => {
        const all = Array.isArray(data) ? data : [];
        // Group by title — one card per unique show
        const unique = Object.values(
          all.reduce((acc: Record<string, MediaEntry>, s: MediaEntry) => {
            if (!acc[s.title]) acc[s.title] = s;
            return acc;
          }, {} as Record<string, MediaEntry>)
        ) as MediaEntry[];
        setShows(unique);
      })
      .catch(() => setShows([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-[#141414] pt-24 px-4 md:px-8 lg:px-12 pb-16">
      <div className="flex items-center gap-3 mb-8">
        <Tv className="w-7 h-7 text-[#E50914]" />
        <h1 className="text-3xl font-bold text-white">TV Shows</h1>
        <span className="text-[#b3b3b3] text-sm mt-1">({shows.length})</span>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-3 md:gap-4">
          {[...Array(12)].map((_, i) => (
            <div key={i} className="aspect-[2/3] skeleton rounded-md" />
          ))}
        </div>
      ) : shows.length === 0 ? (
        <div className="text-center py-24">
          <Tv className="w-16 h-16 text-[#333] mx-auto mb-4" />
          <h2 className="text-xl text-white/60 mb-2">No TV shows found</h2>
          <p className="text-[#666]">
            Scan your media library from the Settings page to discover shows.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-3 md:gap-4">
          {shows.map((show) => (
            <PosterCard key={show.id} media={show} />
          ))}
        </div>
      )}
    </div>
  );
}
