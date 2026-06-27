"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import PosterCard from "@/components/PosterCard";
import { Film, Filter, CheckSquare, X, Layers } from "lucide-react";
import SortDropdown, { SortOption } from "@/components/SortDropdown";
import GroupAsSeriesModal from "@/components/GroupAsSeriesModal";
import { useToast } from "@/components/Toast";
import { useRouter } from "next/navigation";

import type { MediaEntry } from "@/lib/db";

export default function MoviesPage() {
  const [movies, setMovies] = useState<MediaEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortParam, setSortParam] = useState<SortOption>("rating_desc");

  // Selection mode
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [showGroupModal, setShowGroupModal] = useState(false);

  const { toast } = useToast();
  const router = useRouter();

  const fetchMovies = useCallback(() => {
    setLoading(true);
    fetch("/api/media?type=movie")
      .then((r) => r.json())
      .then((data) => setMovies(Array.isArray(data) ? data : []))
      .catch(() => setMovies([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchMovies();
  }, [fetchMovies]);

  // Exit selection on Escape
  useEffect(() => {
    if (!selectionMode) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setSelectionMode(false);
        setSelectedIds(new Set());
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [selectionMode]);

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
        return list.sort(
          (a, b) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
      case "title_asc":
        return list.sort((a, b) => a.title.localeCompare(b.title));
      default:
        return list;
    }
  }, [movies, sortParam]);

  const toggleSelect = useCallback((id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const toggleSelectionMode = useCallback(() => {
    if (selectionMode) {
      setSelectionMode(false);
      setSelectedIds(new Set());
    } else {
      setSelectionMode(true);
    }
  }, [selectionMode]);

  const selectedMedia = useMemo(
    () => movies.filter((m) => selectedIds.has(m.id)),
    [movies, selectedIds]
  );

  const handleGroupComplete = useCallback(
    (result: { seriesTitle: string; seriesSlug: string; updated: number; seasonCount: number }) => {
      setShowGroupModal(false);
      setSelectionMode(false);
      setSelectedIds(new Set());

      toast(
        `✓ Created series '${result.seriesTitle}' with ${result.updated} episodes across ${result.seasonCount} season${result.seasonCount !== 1 ? "s" : ""}`,
        "success"
      );

      // Refetch movies (grouped items will be gone)
      fetchMovies();

      // Navigate to the new show after a short delay
      setTimeout(() => {
        router.push(`/shows/${result.seriesSlug}`);
      }, 2000);
    },
    [toast, fetchMovies, router]
  );

  return (
    <div className="min-h-screen pt-24 px-5 md:px-10 lg:px-14 pb-32 bg-[#050505] relative">
      {/* Ambient Top Gradient */}
      <div className="absolute top-0 left-0 right-0 h-[50vh] bg-gradient-to-b from-violet-500/10 via-transparent to-transparent pointer-events-none" />

      {/* Clean Header */}
      <div className="flex items-end justify-between mb-10 relative z-10">
        <div className="flex flex-col gap-1">
          <h1 className="text-3xl md:text-5xl font-black text-white tracking-tight drop-shadow-lg">
            Movies
          </h1>
          {!loading && (
            <span className="text-sm text-white/40 font-semibold">
              {movies.length} titles available
            </span>
          )}
        </div>

        <div className="flex items-center gap-3">
          {!loading && movies.length > 0 && (
            <>
              {/* Filter Button */}
              <div className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-white/[0.03] border border-white/[0.05] shadow-lg text-sm backdrop-blur-md hover:bg-white/[0.06] transition-colors cursor-pointer">
                <Filter className="w-4 h-4 text-white/60" />
                <span className="text-white/60 font-medium hidden sm:inline">Filter</span>
                {/* <SortDropdown pageKey="movies" onSortChange={setSortParam} /> */}
              </div>

              {/* Select Toggle */}
              <button
                onClick={toggleSelectionMode}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-bold transition-all shadow-lg backdrop-blur-md border ${
                  selectionMode
                    ? "bg-violet-500/20 border-violet-500/30 text-violet-300 shadow-violet-500/10"
                    : "bg-white/[0.03] border-white/[0.05] text-white/60 hover:bg-white/[0.06] hover:text-white/80"
                }`}
              >
                <CheckSquare className="w-4 h-4" />
                <span className="hidden sm:inline">{selectionMode ? "Selecting" : "Select"}</span>
              </button>
            </>
          )}
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-5 md:gap-6 relative z-10">
          {[...Array(14)].map((_, i) => (
            <div
              key={i}
              className="aspect-[2/3] bg-white/[0.03] rounded-[20px] animate-pulse border border-white/[0.02]"
            />
          ))}
        </div>
      ) : sortedMovies.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-5 md:gap-6 relative z-10">
          {sortedMovies.map((movie) => (
            <PosterCard
              key={movie.id}
              media={movie}
              selectionMode={selectionMode}
              isSelected={selectedIds.has(movie.id)}
              onToggleSelect={toggleSelect}
            />
          ))}
        </div>
      )}

      {/* ─── Floating Selection Action Bar ─────────────────────── */}
      {selectionMode && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 flex items-center gap-4 px-6 py-3.5 rounded-2xl bg-[#111]/95 backdrop-blur-xl border border-white/[0.08] shadow-2xl shadow-black/50">
          <span className="text-sm font-bold text-white/80 tabular-nums min-w-[80px]">
            {selectedIds.size} selected
          </span>

          <div className="w-px h-6 bg-white/10" />

          <button
            onClick={() => setShowGroupModal(true)}
            disabled={selectedIds.size < 2}
            title={selectedIds.size < 2 ? "Select at least 2 episodes to group as a series" : undefined}
            className="flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-bold transition-all disabled:opacity-30 disabled:cursor-not-allowed bg-violet-600 hover:bg-violet-500 text-white shadow-lg shadow-violet-500/20 disabled:shadow-none"
          >
            <Layers className="w-4 h-4" />
            Group as Series
          </button>

          <button
            onClick={() => {
              setSelectionMode(false);
              setSelectedIds(new Set());
            }}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium text-white/50 hover:text-white hover:bg-white/[0.06] transition-all"
          >
            <X className="w-4 h-4" />
            Cancel
          </button>
        </div>
      )}

      {/* ─── Group as Series Modal ─────────────────────────────── */}
      <GroupAsSeriesModal
        selectedMedia={selectedMedia}
        isOpen={showGroupModal}
        onClose={() => setShowGroupModal(false)}
        onComplete={handleGroupComplete}
      />
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-32 rounded-[24px] border border-white/[0.04] bg-[#111] shadow-2xl relative overflow-hidden z-10">
      <div className="absolute inset-0 bg-gradient-to-br from-violet-500/5 to-transparent pointer-events-none" />
      <div className="w-20 h-20 rounded-full bg-white/[0.03] border border-white/[0.05] flex items-center justify-center mb-6 shadow-xl relative z-10">
        <Film className="w-8 h-8 text-white/30" />
      </div>
      <h2 className="text-xl font-black text-white mb-2 relative z-10">
        No movies found
      </h2>
      <p className="text-white/40 text-sm max-w-sm text-center relative z-10">
        Connect your drive or check your scan settings to discover movies on
        your local network.
      </p>
    </div>
  );
}