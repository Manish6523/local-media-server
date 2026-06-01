"use client";

import { useEffect, useState, useMemo } from "react";
import PosterCard from "@/components/PosterCard";
import { Film, Filter, LayoutGrid } from "lucide-react";
import SortDropdown, { SortOption } from "@/components/SortDropdown";

import type { MediaEntry } from "@/lib/db";

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
        return list.sort((a, b) => (a.year || 9999) - (b.year || 9999));
      case "added_desc":
        return list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      case "title_asc":
        return list.sort((a, b) => a.title.localeCompare(b.title));
      default:
        return list;
    }
  }, [movies, sortParam]);

  return (
    <div className="min-h-screen bg-background pt-32 px-6 md:px-12 lg:px-20 pb-20">
      {/* Editorial Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-16">
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <div className="h-px w-12 bg-primary" />
            <span className="text-[10px] font-black uppercase tracking-[0.4em] text-primary">Cinema Gallery</span>
          </div>
          <div className="flex items-baseline gap-6">
            <h1 className="text-6xl md:text-8xl font-black italic tracking-tighter uppercase leading-[0.8] text-foreground">
              Movies
            </h1>
            <div className="flex flex-col">
              <span className="text-2xl font-black text-foreground/10 leading-none">{movies.length}</span>
              <span className="text-[10px] font-bold text-foreground/10 uppercase tracking-widest">Titles</span>
            </div>
          </div>
        </div>
        
        {!loading && movies.length > 0 && (
          <div className="flex items-center gap-4 self-start md:self-auto">
            <div className="flex items-center gap-2 px-4 py-2 bg-muted rounded-full border border-border">
              <Filter className="w-3.5 h-3.5 text-muted-foreground" />
              <SortDropdown pageKey="movies" onSortChange={setSortParam} />
            </div>
          </div>
        )}
      </div>

      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-6">
          {[...Array(14)].map((_, i) => (
            <div key={i} className="aspect-[2/3] bg-muted rounded-xl animate-pulse" />
          ))}
        </div>
      ) : sortedMovies.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-x-6 gap-y-10">
          {sortedMovies.map((movie) => (
            <PosterCard key={movie.id} media={movie} />
          ))}
        </div>
      )}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-40 bg-muted/20 rounded-3xl border border-border border-dashed">
      <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mb-6">
        <Film className="w-8 h-8 text-muted-foreground" />
      </div>
      <h2 className="text-xl font-black uppercase tracking-widest text-foreground mb-2">Vault Empty</h2>
      <p className="text-muted-foreground text-sm max-w-xs text-center leading-relaxed font-medium">
        Your cinematic library is currently empty. Connect your drive or check your scan settings.
      </p>
    </div>
  );
}