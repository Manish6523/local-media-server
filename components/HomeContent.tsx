"use client";

import { useEffect, useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import PosterCard from "@/components/PosterCard";

import ContinueWatchingList from "./Home/ContinueWatchingList";
import MiniMoviesList from "./Home/MiniMoviesList";
import HeroFeatured from "./Home/HeroFeatured";
import SeriesRow from "./Home/SeriesRow";

import type { MediaEntry } from "@/lib/db";

export default function HomeContent() {
  const searchParams = useSearchParams();
  const searchQuery = searchParams.get("search") || "";
  
  const [media, setMedia] = useState<MediaEntry[]>([]);
  const [continueWatching, setContinueWatching] = useState<MediaEntry[]>([]);
  const [recentlyAdded, setRecentlyAdded] = useState<MediaEntry[]>([]);
  const [favorites, setFavorites] = useState<MediaEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAllData = useCallback(async () => {
    try {
      if (searchQuery) {
        const res = await fetch(`/api/media?search=${encodeURIComponent(searchQuery)}`);
        const data = await res.json();
        setMedia(Array.isArray(data) ? data : []);
      } else {
        const [mediaRes, cwRes, raRes, favRes] = await Promise.all([
          fetch("/api/media"),
          fetch("/api/continue-watching"),
          fetch("/api/recently-added"),
          fetch("/api/favorites?limit=8")
        ]);

        const [mediaData, cwData, raData, favData] = await Promise.all([
          mediaRes.json(),
          cwRes.json(),
          raRes.json(),
          favRes.json()
        ]);

        setMedia(Array.isArray(mediaData) ? mediaData : []);
        setContinueWatching(Array.isArray(cwData) ? cwData : []);
        setRecentlyAdded(Array.isArray(raData) ? raData : []);
        setFavorites(Array.isArray(favData) ? favData : []);
      }
    } catch (err) {
      console.error("Failed to fetch data:", err);
      setMedia([]);
    } finally {
      setLoading(false);
    }
  }, [searchQuery]);

  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  const movies = media.filter((m) => m.type === "movie");
  const shows = media.filter((m) => m.type === "show");

  const featuredItems = media.filter((m) => m.backdrop && m.overview && m.available);
  const uniqueFeaturedItems = Object.values(
    featuredItems.reduce((acc, item) => {
      if (!acc[item.title]) acc[item.title] = item;
      return acc;
    }, {} as Record<string, MediaEntry>)
  ) as MediaEntry[];

  const carouselItems = uniqueFeaturedItems.length > 0
    ? [...uniqueFeaturedItems].sort(() => 0.5 - Math.random()).slice(0, 5)
    : movies.slice(0, 5);

  const uniqueShows = Object.values(
    shows.reduce((acc, show) => {
      if (!acc[show.title]) acc[show.title] = show;
      return acc;
    }, {} as Record<string, MediaEntry>)
  ) as MediaEntry[];

  if (loading) {
    return (
      <div className="w-full min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-2 border-violet-500/20 border-t-violet-400 rounded-full animate-spin" />
          <span className="text-sm text-white/30 font-medium">Loading your library...</span>
        </div>
      </div>
    );
  }

  if (searchQuery) {
    return (
      <div className="pt-24 md:pt-28 px-4 md:px-8 lg:px-12 pb-28">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-white mb-1">
            Search results for &quot;{searchQuery}&quot;
          </h1>
          <span className="text-sm text-white/30">
            {media.length} result{media.length !== 1 ? "s" : ""} found
          </span>
        </div>
        {media.length === 0 ? (
          <div className="glass rounded-2xl p-16 text-center">
            <p className="text-white/40">No results found.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-4 md:gap-5">
            {media.map((item) => (
              <PosterCard key={item.id} media={item} showEpisodeInfo />
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      {/* Hero — full width, no padding */}
      <HeroFeatured items={carouselItems} />

      {/* Content sections */}
      <div className="relative z-10 w-full px-5 md:px-10 lg:px-14 pb-32 pt-16 -mt-20 bg-gradient-to-b from-transparent via-[#050505]/95 to-[#050505] space-y-16">
        {/* Continue Watching */}
        <ContinueWatchingList items={continueWatching.length > 0 ? continueWatching : movies} />

        {/* Movies */}
        <MiniMoviesList items={movies} />

        {/* Series */}
        <SeriesRow items={uniqueShows} />
      </div>
    </div>
  );
}
