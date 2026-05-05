"use client";

import { useEffect, useState, useMemo } from "react";
import PosterCard from "@/components/PosterCard";
import { Film } from "lucide-react";
import SortDropdown, { SortOption } from "@/components/SortDropdown";

interface MediaEntry {
  id: number;
  filename: string;
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
  created_at: string;
  is_favorite: number;
  watch_progress: number;
}

export default function MoviesPage() {
  const [movies, setMovies] = useState<MediaEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortParam, setSortParam] = useState<SortOption>("rating_desc");

  useEffect(() => {
    fetch("/api/media?type=movie")
      .then((r) => r.json())
      .then((data) => setMovies(Array.isArray(data) ? data : []))
      .catch(() => setMovies([]))
      .finally(() => setLoading(false));
  }, []);

  const sortedMovies = useMemo(() => {
    const list = [...movies];
    switch (sortParam) {
      case "rating_desc":
        return list.sort((a, b) => {
          const rA = a.rating ? parseFloat(a.rating) : 0;
          const rB = b.rating ? parseFloat(b.rating) : 0;
          return rB - rA;
        });
      case "year_desc":
        return list.sort((a, b) => (b.year || 0) - (a.year || 0));
      case "year_asc":
        return list.sort((a, b) => {
          const yA = a.year || 9999;
          const yB = b.year || 9999;
          return yA - yB;
        });
      case "added_desc":
        return list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      case "title_asc":
        return list.sort((a, b) => a.title.localeCompare(b.title));
      default:
        return list;
    }
  }, [movies, sortParam]);

  return (
    <div className="min-h-screen bg-[#0a0a0a] pt-24 px-6 md:px-10 lg:px-14 pb-16">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div className="flex items-center gap-3">
          <Film className="w-7 h-7 text-[#E50914]" />
          <h1 className="text-3xl font-bold text-white tracking-tight">Movies</h1>
          <span className="text-[#808080] font-medium text-sm mt-1 bg-white/5 px-2 py-0.5 rounded-md">
            {movies.length}
          </span>
        </div>
        
        {!loading && movies.length > 0 && (
          <div className="self-end sm:self-auto">
            <SortDropdown pageKey="movies" onSortChange={setSortParam} />
          </div>
        )}
      </div>

      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-4 md:gap-5">
          {[...Array(12)].map((_, i) => (
            <div key={i} className="aspect-[2/3] skeleton rounded-md" />
          ))}
        </div>
      ) : sortedMovies.length === 0 ? (
        <div className="text-center py-32 bg-[#111] rounded-2xl border border-white/5">
          <Film className="w-16 h-16 text-[#333] mx-auto mb-5" />
          <h2 className="text-2xl font-semibold text-white/90 mb-2">No movies found</h2>
          <p className="text-[#808080] max-w-sm mx-auto">
            Scan your media library from the Settings page to discover movies.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-4 md:gap-5">
          {sortedMovies.map((movie) => (
            <PosterCard key={movie.id} media={movie} />
          ))}
        </div>
      )}
    </div>
  );
}
