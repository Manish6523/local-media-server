"use client";

import { useEffect, useState, useMemo } from "react";
import PosterCard from "@/components/PosterCard";
import { Heart, Filter, PlusCircle } from "lucide-react";
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
    <div className="min-h-screen bg-background pt-32 px-6 md:px-12 lg:px-20 pb-20 selection:bg-primary/30">
      {/* Editorial Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-16">
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <div className="h-px w-12 bg-primary" />
            <span className="text-[10px] font-black uppercase tracking-[0.4em] text-primary text-glow-sm">Personal Collection</span>
          </div>
          <div className="flex items-baseline gap-6">
            <h1 className="text-6xl md:text-8xl font-black italic tracking-tighter uppercase leading-[0.8] text-foreground">
              Watchlist
            </h1>
            <div className="flex flex-col">
              <span className="text-2xl font-black text-foreground/10 leading-none">{favorites.length}</span>
              <span className="text-[10px] font-bold text-foreground/10 uppercase tracking-widest">Saved</span>
            </div>
          </div>
        </div>
        
        {!loading && favorites.length > 0 && (
          <div className="flex items-center gap-4 self-start md:self-auto">
            <div className="flex items-center gap-2 px-4 py-2 bg-muted rounded-full border border-border backdrop-blur-md">
              <Filter className="w-3.5 h-3.5 text-muted-foreground" />
              <SortDropdown pageKey="favorites" onSortChange={setSortParam} />
            </div>
          </div>
        )}
      </div>

      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-6">
          {[...Array(14)].map((_, i) => (
            <div key={i} className="aspect-[2/3] bg-muted rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : sortedFavorites.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-x-6 gap-y-12">
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
    <div className="flex flex-col items-center justify-center py-40 bg-muted/10 rounded-[3rem] border border-border border-dashed relative overflow-hidden group">
      {/* Background Decorative Element */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-primary/5 blur-[100px] rounded-full" />
      
      <div className="relative z-10 flex flex-col items-center text-center">
        <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-8 border border-primary/20 group-hover:scale-110 transition-transform duration-500">
          <Heart className="w-8 h-8 text-primary/60 fill-primary/10" />
        </div>
        <h2 className="text-2xl font-black uppercase tracking-widest text-foreground mb-3">Your Vault is Empty</h2>
        <p className="text-muted-foreground text-sm max-w-xs leading-relaxed font-medium mb-10">
          Start curating your personal cinema library by hearting titles from the home or gallery pages.
        </p>
        
        <div className="flex flex-wrap justify-center gap-4">
          <Link href="/movies" className="flex items-center gap-2 px-8 py-3 bg-foreground text-background font-black uppercase tracking-tighter hover:bg-primary hover:text-primary-foreground transition-all rounded-full text-xs">
            Explore Movies
          </Link>
          <Link href="/shows" className="flex items-center gap-2 px-8 py-3 bg-white/5 border border-white/10 text-foreground font-black uppercase tracking-tighter hover:bg-white/10 transition-all rounded-full text-xs">
            Browse Shows
          </Link>
        </div>
      </div>
    </div>
  );
}