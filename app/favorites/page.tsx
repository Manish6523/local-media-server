"use client";

import { useEffect, useState, useMemo } from "react";
import PosterCard from "@/components/PosterCard";
import { Heart, Filter } from "lucide-react";
import SortDropdown, { SortOption } from "@/components/SortDropdown";
import Link from "next/link";

import type { MediaEntry } from "@/lib/db";

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
        return list.sort((a, b) => (a.year || 9999) - (b.year || 9999));
      case "added_desc":
        return list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      case "title_asc":
        return list.sort((a, b) => a.title.localeCompare(b.title));
      default:
        return list;
    }
  }, [favorites, sortParam]);

  return (
    <div className="min-h-screen bg-background pt-28 px-4 md:px-8 lg:px-14 pb-20">
      {/* Clean Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <h1 className="text-3xl md:text-4xl font-black text-white tracking-tight">
            Watchlist
          </h1>
          {!loading && (
            <span className="text-sm text-white/30 font-medium">{favorites.length} saved</span>
          )}
        </div>

        {!loading && favorites.length > 0 && (
          <div className="flex items-center gap-2 px-3 py-2 glass-card text-sm">
            <Filter className="w-3.5 h-3.5 text-white/40" />
            <SortDropdown pageKey="favorites" onSortChange={setSortParam} />
          </div>
        )}
      </div>

      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-4 md:gap-5">
          {[...Array(14)].map((_, i) => (
            <div key={i} className="aspect-[2/3] bg-white/5 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : sortedFavorites.length === 0 ? (
        <EmptyState />
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

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-32 glass-card">
      <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-5">
        <Heart className="w-7 h-7 text-white/20" />
      </div>
      <h2 className="text-lg font-bold text-white mb-1">Your watchlist is empty</h2>
      <p className="text-white/40 text-sm max-w-xs text-center mb-6">
        Start curating by hearting titles from the library.
      </p>
      <div className="flex gap-3">
        <Link href="/movies" className="px-5 py-2 bg-white text-black text-sm font-bold rounded-full hover:bg-white/90 transition-all">
          Movies
        </Link>
        <Link href="/shows" className="px-5 py-2 bg-white/10 border border-white/10 text-white text-sm font-bold rounded-full hover:bg-white/15 transition-all">
          Shows
        </Link>
      </div>
    </div>
  );
}