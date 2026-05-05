"use client";

import { useEffect, useState, useMemo } from "react";
import PosterCard from "@/components/PosterCard";
import { Heart } from "lucide-react";
import SortDropdown, { SortOption } from "@/components/SortDropdown";
import Link from "next/link";

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

export default function FavoritesPage() {
  const [favorites, setFavorites] = useState<MediaEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortParam, setSortParam] = useState<SortOption>("rating_desc");

  useEffect(() => {
    fetch("/api/favorites")
      .then((r) => r.json())
      .then((data) => setFavorites(Array.isArray(data) ? data : []))
      .catch(() => setFavorites([]))
      .finally(() => setLoading(false));
  }, []);

  const sortedFavorites = useMemo(() => {
    const list = [...favorites];
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
  }, [favorites, sortParam]);

  return (
    <div className="min-h-screen bg-[#0a0a0a] pt-24 px-6 md:px-10 lg:px-14 pb-16">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div className="flex items-center gap-3">
          <Heart className="w-7 h-7 text-[#E50914] fill-[#E50914]" />
          <h1 className="text-3xl font-bold text-white tracking-tight">My Favorites</h1>
          <span className="text-[#808080] font-medium text-sm mt-1 bg-white/5 px-2 py-0.5 rounded-md">
            {favorites.length}
          </span>
        </div>
        
        {!loading && favorites.length > 0 && (
          <div className="self-end sm:self-auto">
            <SortDropdown pageKey="favorites" onSortChange={setSortParam} />
          </div>
        )}
      </div>

      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-4 md:gap-5">
          {[...Array(12)].map((_, i) => (
            <div key={i} className="aspect-[2/3] skeleton rounded-md" />
          ))}
        </div>
      ) : sortedFavorites.length === 0 ? (
        <div className="text-center py-32 bg-[#111] rounded-2xl border border-white/5">
          <Heart className="w-16 h-16 text-[#333] mx-auto mb-5" />
          <h2 className="text-2xl font-semibold text-white/90 mb-2">No favorites yet</h2>
          <p className="text-[#808080] max-w-sm mx-auto mb-6">
            Click the heart icon on any movie or TV show to add it to your favorites list.
          </p>
          <div className="flex justify-center gap-4">
            <Link href="/movies" className="px-6 py-2 bg-white/10 hover:bg-white/20 text-white rounded font-medium transition-colors">
              Browse Movies
            </Link>
            <Link href="/shows" className="px-6 py-2 bg-[#E50914] hover:bg-[#f6121d] text-white rounded font-medium transition-colors">
              Browse Shows
            </Link>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-4 md:gap-5">
          {sortedFavorites.map((item) => (
            <PosterCard key={item.id} media={item} />
          ))}
        </div>
      )}
    </div>
  );
}
