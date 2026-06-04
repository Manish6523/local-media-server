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
      <div className="w-full h-full flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-white/20 border-t-white rounded-full animate-spin" />
      </div>
    );
  }

  if (searchQuery) {
    return (
      <div className="pb-16">
        <h1 className="text-2xl font-bold text-white mb-6">
          Search results for &quot;{searchQuery}&quot;
          <span className="text-white/50 text-lg font-normal ml-3">
            ({media.length} result{media.length !== 1 ? "s" : ""})
          </span>
        </h1>
        {media.length === 0 ? (
          <p className="text-white/50">No results found.</p>
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
    <div className="grid grid-cols-1 md:grid-cols-12 gap-8 md:gap-6 lg:gap-8 h-full">
      {/* Left Column - Should be below Hero on mobile */}
      <div className="md:col-span-4 lg:col-span-3 flex flex-col gap-8 order-2 md:order-1">
        <ContinueWatchingList items={continueWatching.length > 0 ? continueWatching : movies} />
        
        {/* Replacing New Trailer with Movies */}
        <div className="bg-white/5 border border-white/5 rounded-3xl p-5 shadow-xl">
          <MiniMoviesList items={movies} />
        </div>
      </div>

      {/* Right Column - Should be at the top on mobile */}
      <div className="md:col-span-8 lg:col-span-9 flex flex-col min-w-0 order-1 md:order-2 gap-0">
        <HeroFeatured items={carouselItems} />
        <SeriesRow items={uniqueShows} />
      </div>

      {/* Commented out as requested */}
      {/* <BentoGrid continueWatching={continueWatching} recentlyAdded={recentlyAdded} /> */}
    </div>
  );
}
