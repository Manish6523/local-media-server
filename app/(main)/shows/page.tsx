"use client";

import { useEffect, useState, useMemo } from "react";
import PosterCard from "@/components/PosterCard";
import { Tv, Filter, Users } from "lucide-react";
import SortDropdown, { SortOption } from "@/components/SortDropdown";
import dynamic from "next/dynamic";

const WatchPartyModal = dynamic(() => import("@/components/WatchParty/WatchPartyModal"), { ssr: false });

import type { MediaEntry } from "@/lib/db";

export default function ShowsPage() {
  const [shows, setShows] = useState<MediaEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortParam, setSortParam] = useState<SortOption>("rating_desc");
  const [showPartyModal, setShowPartyModal] = useState(false);

  useEffect(() => {
    fetch("/api/media?type=show")
      .then((r) => r.json())
      .then((data) => {
        if (!Array.isArray(data)) return;
        
        // Group by title to show series covers rather than individual episodes
        const groupedMap = new Map<string, MediaEntry>();
        for (const item of data) {
          if (!groupedMap.has(item.title)) {
            groupedMap.set(item.title, item);
          }
        }
        setShows(Array.from(groupedMap.values()));
      })
      .catch(() => setShows([]))
      .finally(() => setLoading(false));
  }, []);

  const sortedShows = useMemo(() => {
    const list = [...shows];
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
  }, [shows, sortParam]);

  return (
    <div className="min-h-screen pt-24 px-5 md:px-10 lg:px-14 pb-32 bg-[#050505] relative">
      {/* Ambient Top Gradient */}
      <div className="absolute top-0 left-0 right-0 h-[50vh] bg-gradient-to-b from-cyan-500/10 via-transparent to-transparent pointer-events-none" />

      {/* Clean Header */}
      <div className="flex items-end justify-between mb-10 relative z-10">
        <div className="flex flex-col gap-1">
          <h1 className="text-3xl md:text-5xl font-black text-white tracking-tight drop-shadow-lg">
            TV Shows
          </h1>
          {!loading && (
            <span className="text-sm text-white/40 font-semibold">{shows.length} series available</span>
          )}
        </div>

        <div className="flex items-center gap-3">
          {!loading && shows.length > 0 && (
            <div className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-white/[0.03] border border-white/[0.05] shadow-lg text-sm backdrop-blur-md hover:bg-white/[0.06] transition-colors cursor-pointer">
              <Filter className="w-4 h-4 text-white/60" />
              <span className="text-white/60 font-medium hidden sm:inline">Filter</span>
              {/* <SortDropdown pageKey="shows" onSortChange={setSortParam} /> */}
            </div>
          )}
          <button
            onClick={() => setShowPartyModal(true)}
            className="flex items-center gap-2 px-5 py-2.5 bg-violet-600 hover:bg-violet-500 text-white text-sm font-bold rounded-full transition-colors shadow-[0_0_20px_rgba(139,92,246,0.3)]"
          >
            <Users className="w-4 h-4" />
            <span className="hidden sm:inline">Watch Party</span>
          </button>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-5 md:gap-6 relative z-10">
          {[...Array(14)].map((_, i) => (
            <div key={i} className="aspect-[2/3] bg-white/[0.03] rounded-[20px] animate-pulse border border-white/[0.02]" />
          ))}
        </div>
      ) : sortedShows.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-5 md:gap-6 relative z-10">
          {sortedShows.map((show) => (
            <PosterCard key={show.id} media={show} />
          ))}
        </div>
      )}

      <WatchPartyModal isOpen={showPartyModal} onClose={() => setShowPartyModal(false)} />
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-32 rounded-[24px] border border-white/[0.04] bg-[#111] shadow-2xl relative overflow-hidden z-10">
      <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 to-transparent pointer-events-none" />
      <div className="w-20 h-20 rounded-full bg-white/[0.03] border border-white/[0.05] flex items-center justify-center mb-6 shadow-xl relative z-10">
        <Tv className="w-8 h-8 text-white/30" />
      </div>
      <h2 className="text-xl font-black text-white mb-2 relative z-10">No shows found</h2>
      <p className="text-white/40 text-sm max-w-sm text-center relative z-10">
        No TV series discovered. Update your library paths in settings.
      </p>
    </div>
  );
}