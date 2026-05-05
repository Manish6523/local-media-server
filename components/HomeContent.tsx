"use client";

import { useEffect, useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import HeroSection from "@/components/HeroSection";
import MediaRow from "@/components/MediaRow";
import PosterCard from "@/components/PosterCard";

interface MediaEntry {
  id: number;
  filename: string;
  type: "movie" | "show";
  title: string;
  year: number | null;
  season: number | null;
  episode_start: number | null;
  episode_end: number | null;
  poster: string | null;
  overview: string | null;
  rating: string | null;
  genres: string | null;
  runtime: number | null;
  available: number;
  is_favorite?: number;
  watch_progress?: number;
}

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

  const uniqueShows = Object.values(
    shows.reduce((acc, show) => {
      if (!acc[show.title]) acc[show.title] = show;
      return acc;
    }, {} as Record<string, MediaEntry>)
  ) as MediaEntry[];

  const featuredItems = media.filter((m) => m.poster && m.overview && m.available);
  const uniqueFeaturedItems = Object.values(
    featuredItems.reduce((acc, item) => {
      if (!acc[item.title]) acc[item.title] = item;
      return acc;
    }, {} as Record<string, MediaEntry>)
  ) as MediaEntry[];

  // Pick top 5 featured items for the carousel
  const carouselItems = uniqueFeaturedItems.length > 0
    ? [...uniqueFeaturedItems].sort(() => 0.5 - Math.random()).slice(0, 5)
    : Object.values(
        media.reduce((acc, item) => {
          if (!acc[item.title]) acc[item.title] = item;
          return acc;
        }, {} as Record<string, MediaEntry>)
      ).slice(0, 5) as MediaEntry[];

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a]">
        <div className="w-full h-[85vh] skeleton" />
        <div className="px-6 md:px-10 lg:px-14 py-8 space-y-12">
          {[1, 2, 3].map((i) => (
            <div key={i}>
              <div className="h-6 w-48 skeleton rounded mb-4" />
              <div className="flex gap-4">
                {[1, 2, 3, 4, 5, 6].map((j) => (
                  <div key={j} className="w-[180px] aspect-[2/3] skeleton rounded-md flex-shrink-0" />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (searchQuery) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] pt-24 px-6 md:px-10 lg:px-14 pb-16">
        <h1 className="text-2xl font-bold text-white mb-6">
          Search results for &quot;{searchQuery}&quot;
          <span className="text-[#808080] text-lg font-normal ml-3">
            ({media.length} result{media.length !== 1 ? "s" : ""})
          </span>
        </h1>
        {media.length === 0 ? (
          <p className="text-[#808080]">No results found.</p>
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
    <div className="min-h-screen bg-[#0a0a0a]">
      <HeroSection items={carouselItems} />
      <div className="relative z-10 py-16 space-y-12">
        {continueWatching.length > 0 && (
          <MediaRow title="Continue Watching" items={continueWatching} showEpisodeInfo />
        )}
        {recentlyAdded.length > 0 && (
          <MediaRow title="Recently Added" items={recentlyAdded} showEpisodeInfo />
        )}
        {favorites.length > 0 && (
          <MediaRow title="My Favorites" items={favorites} />
        )}
        <MediaRow title="Movies" items={movies.slice(0, 15)} />
        <MediaRow title="TV Shows" items={uniqueShows.slice(0, 15)} />
      </div>
    </div>
  );
}
