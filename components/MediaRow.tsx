"use client";

import { useRef, useState, useEffect } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import PosterCard from "./PosterCard";

interface MediaEntry {
  id: number;
  filename: string;
  type: "movie" | "show";
  title: string;
  year: number | null;
  poster: string | null;
  overview: string | null;
  rating: string | null;
  genres: string | null;
  runtime: number | null;
  available: number;
  season: number | null;
  episode_start: number | null;
  episode_end: number | null;
}

interface MediaRowProps {
  title: string;
  items: MediaEntry[];
  showEpisodeInfo?: boolean;
}

export default function MediaRow({ title, items, showEpisodeInfo = false }: MediaRowProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [showLeftArrow, setShowLeftArrow] = useState(false);
  const [showRightArrow, setShowRightArrow] = useState(true);

  const scroll = (direction: "left" | "right") => {
    if (!scrollRef.current) return;
    const scrollAmount = scrollRef.current.clientWidth * 0.85;
    scrollRef.current.scrollBy({
      left: direction === "left" ? -scrollAmount : scrollAmount,
      behavior: "smooth",
    });
  };

  const handleScroll = () => {
    if (!scrollRef.current) return;
    const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
    setShowLeftArrow(scrollLeft > 10);
    setShowRightArrow(scrollLeft + clientWidth < scrollWidth - 20);
  };

  useEffect(() => {
    handleScroll();
    window.addEventListener('resize', handleScroll);
    return () => window.removeEventListener('resize', handleScroll);
  }, [items]);

  if (items.length === 0) return null;

  return (
    <div className="relative group/row py-0 first:pt-4">
      {/* Editorial Header */}
      <div className="flex items-center gap-3 px-6 md:px-12 lg:px-20 mb-6">
        <div className="h-6 w-1 bg-red-600 rounded-full shadow-[0_0_8px_rgba(220,38,38,0.5)]" />
        <h2 className="text-lg md:text-xl font-black italic tracking-tighter uppercase text-white/90">
          {title}
        </h2>
      </div>

      <div className="relative">
        {/* Left Arrow - Triggered ONLY by row hover */}
        {showLeftArrow && (
          <div className="absolute left-0 top-0 bottom-0 z-30 w-24 bg-gradient-to-r from-[#050505] via-[#050505]/70 to-transparent pointer-events-none flex items-center justify-start pl-6 md:pl-12">
            <button
              onClick={() => scroll("left")}
              className="pointer-events-auto h-12 w-12 flex items-center justify-center rounded-full bg-white/5 border border-white/10 backdrop-blur-md text-white hover:bg-white/20 transition-all opacity-0 group-hover/row:opacity-100 -translate-x-4 group-hover/row:translate-x-0"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
          </div>
        )}

        {/* Scroll container */}
        <div
          ref={scrollRef}
          onScroll={handleScroll}
          className="flex gap-4 md:gap-6 overflow-x-auto scrollbar-hide px-6 md:px-12 lg:px-20 pb-8"
          style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
        >
          {items.map((item) => (
            <div key={`${item.id}-${item.title}`} className="relative">
              <PosterCard
                media={item}
                showEpisodeInfo={showEpisodeInfo}
              />
            </div>
          ))}
        </div>

        {/* Right Arrow - Triggered ONLY by row hover */}
        {showRightArrow && (
          <div className="absolute right-0 top-0 bottom-0 z-30 w-24 bg-gradient-to-l from-[#050505] via-[#050505]/70 to-transparent pointer-events-none flex items-center justify-end pr-6 md:pr-12">
            <button
              onClick={() => scroll("right")}
              className="pointer-events-auto h-12 w-12 flex items-center justify-center rounded-full bg-white/5 border border-white/10 backdrop-blur-md text-white hover:bg-white/20 transition-all opacity-0 group-hover/row:opacity-100 translate-x-4 group-hover/row:translate-x-0"
            >
              <ChevronRight className="w-6 h-6" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}