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
    <div className="min-h-screen pt-24 px-5 md:px-10 lg:px-14 pb-32 bg-[#050505] relative">
      {/* Ambient Top Gradient */}
      <div className="absolute top-0 left-0 right-0 h-[50vh] bg-gradient-to-b from-pink-500/10 via-transparent to-transparent pointer-events-none" />

      {/* Clean Header */}
      <div className="flex items-end justify-between mb-10 relative z-10">
        <div className="flex flex-col gap-1">
          <h1 className="text-3xl md:text-5xl font-black text-white tracking-tight drop-shadow-lg">
            Watchlist
          </h1>
          {!loading && (
            <span className="text-sm text-white/40 font-semibold">{favorites.length} saved</span>
          )}
        </div>

        {!loading && favorites.length > 0 && (
          <div className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-white/[0.03] border border-white/[0.05] shadow-lg text-sm backdrop-blur-md hover:bg-white/[0.06] transition-colors cursor-pointer">
            <Filter className="w-4 h-4 text-white/60" />
            <span className="text-white/60 font-medium hidden sm:inline">Filter</span>
            {/* <SortDropdown pageKey="favorites" onSortChange={setSortParam} /> */}
          </div>
        )}
      </div>

      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-5 md:gap-6 relative z-10">
          {[...Array(14)].map((_, i) => (
            <div key={i} className="aspect-[2/3] bg-white/[0.03] rounded-[20px] animate-pulse border border-white/[0.02]" />
          ))}
        </div>
      ) : sortedFavorites.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-5 md:gap-6 relative z-10">
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
    <div className="flex flex-col items-center justify-center py-32 rounded-[24px] border border-white/[0.04] bg-[#111] shadow-2xl relative overflow-hidden z-10">
      <div className="absolute inset-0 bg-gradient-to-br from-pink-500/5 to-transparent pointer-events-none" />
      <div className="w-20 h-20 rounded-full bg-white/[0.03] border border-white/[0.05] flex items-center justify-center mb-6 shadow-xl relative z-10">
        <Heart className="w-8 h-8 text-white/30" />
      </div>
      <h2 className="text-xl font-black text-white mb-2 relative z-10">Your watchlist is empty</h2>
      <p className="text-white/40 text-sm max-w-sm text-center mb-8 relative z-10">
        Start curating by hearting titles from the library.
      </p>
      <div className="flex gap-4 relative z-10">
        <Link href="/movies" className="px-6 py-2.5 bg-white text-black text-sm font-bold rounded-full hover:bg-white/90 transition-all shadow-[0_0_20px_rgba(255,255,255,0.2)]">
          Movies
        </Link>
        <Link href="/shows" className="px-6 py-2.5 bg-white/5 border border-white/10 text-white text-sm font-bold rounded-full hover:bg-white/10 transition-all backdrop-blur-sm">
          Shows
        </Link>
      </div>
    </div>
  );
}