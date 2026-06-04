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
    <div className="min-h-screen pt-18 px-4 md:px-8 lg:px-14 pb-20">
      {/* Clean Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <h1 className="text-3xl md:text-4xl font-black text-white tracking-tight">
            TV Shows
          </h1>
          {!loading && (
            <span className="text-sm text-white/30 font-medium">{shows.length} series</span>
          )}
        </div>

        <div className="flex items-center gap-3">
          {!loading && shows.length > 0 && (
            <div className="flex items-center gap-2 px-3 py-2 glass-card text-sm">
              <Filter className="w-3.5 h-3.5 text-white/40" />
              {/* <SortDropdown pageKey="shows" onSortChange={setSortParam} /> */}
            </div>
          )}
          <button
            onClick={() => setShowPartyModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-[#E50914] hover:bg-[#f6121d] text-white text-sm font-semibold rounded-full transition-colors"
          >
            <Users className="w-4 h-4" />
            <span className="hidden sm:inline">Watch Party</span>
          </button>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-4 md:gap-5">
          {[...Array(14)].map((_, i) => (
            <div key={i} className="aspect-[2/3] bg-white/5 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : sortedShows.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-4 md:gap-5">
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
    <div className="flex flex-col items-center justify-center py-32 glass-card">
      <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-5">
        <Tv className="w-7 h-7 text-white/20" />
      </div>
      <h2 className="text-lg font-bold text-white mb-1">No shows yet</h2>
      <p className="text-white/40 text-sm max-w-xs text-center">
        No TV series discovered. Update your library paths in settings.
      </p>
    </div>
  );
}