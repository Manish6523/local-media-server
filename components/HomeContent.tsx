"use client";

import { useEffect, useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import HeroSection from "@/components/HeroSection";
import MediaRow from "@/components/MediaRow";
import PosterCard from "@/components/PosterCard";

interface MediaEntry {
  id: number;
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
}

export default function HomeContent() {
  const searchParams = useSearchParams();
  const searchQuery = searchParams.get("search") || "";
  const [media, setMedia] = useState<MediaEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchMedia = useCallback(async () => {
    try {
      const url = searchQuery
        ? `/api/media?search=${encodeURIComponent(searchQuery)}`
        : "/api/media";
      const res = await fetch(url);
      const data = await res.json();
      setMedia(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to fetch media:", err);
      setMedia([]);
    } finally {
      setLoading(false);
    }
  }, [searchQuery]);

  useEffect(() => {
    fetchMedia();
  }, [fetchMedia]);

  const movies = media.filter((m) => m.type === "movie");
  const shows = media.filter((m) => m.type === "show");

  const uniqueShows = Object.values(
    shows.reduce((acc, show) => {
      if (!acc[show.title]) acc[show.title] = show;
      return acc;
    }, {} as Record<string, MediaEntry>)
  ) as MediaEntry[];

  const featuredItems = media.filter((m) => m.poster && m.overview && m.available);
  const heroMedia = featuredItems.length > 0
    ? featuredItems[Math.floor(Math.random() * featuredItems.length)]
    : media.length > 0 ? media[0] : null;

  if (loading) {
    return (
      <div className="min-h-screen bg-[#141414]">
        <div className="w-full h-[85vh] skeleton" />
        <div className="px-4 md:px-8 lg:px-12 py-8 space-y-8">
          {[1, 2].map((i) => (
            <div key={i}>
              <div className="h-6 w-32 skeleton rounded mb-4" />
              <div className="flex gap-3">
                {[1, 2, 3, 4, 5, 6].map((j) => (
                  <div key={j} className="w-[200px] aspect-[2/3] skeleton rounded-md flex-shrink-0" />
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
      <div className="min-h-screen bg-[#141414] pt-24 px-4 md:px-8 lg:px-12">
        <h1 className="text-2xl font-bold text-white mb-6">
          Search results for &quot;{searchQuery}&quot;
          <span className="text-[#b3b3b3] text-lg font-normal ml-3">
            ({media.length} result{media.length !== 1 ? "s" : ""})
          </span>
        </h1>
        {media.length === 0 ? (
          <p className="text-[#b3b3b3]">No results found.</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-3 md:gap-4">
            {media.map((item) => (
              <PosterCard key={item.id} media={item} showEpisodeInfo />
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#141414]">
      <HeroSection media={heroMedia} />
      <div className="-mt-16 relative z-10 pb-16">
        <MediaRow title="Movies" items={movies} />
        <MediaRow title="TV Shows" items={uniqueShows} />
        {media.length > 0 && (
          <MediaRow title="Recently Added" items={[...media].reverse().slice(0, 20)} showEpisodeInfo />
        )}
      </div>
    </div>
  );
}
