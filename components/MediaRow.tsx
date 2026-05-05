"use client";

import { useRef, useState } from "react";
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
    const scrollAmount = scrollRef.current.clientWidth * 0.8;
    scrollRef.current.scrollBy({
      left: direction === "left" ? -scrollAmount : scrollAmount,
      behavior: "smooth",
    });
  };

  const handleScroll = () => {
    if (!scrollRef.current) return;
    const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
    setShowLeftArrow(scrollLeft > 10);
    setShowRightArrow(scrollLeft + clientWidth < scrollWidth - 10);
  };

  if (items.length === 0) return null;

  return (
    <div className="relative group/row">
      <h2 className="text-xl md:text-2xl font-bold text-white/90 mb-4 tracking-tight px-6 md:px-10 lg:px-14">
        {title}
      </h2>

      <div className="relative">
        {/* Left arrow */}
        {showLeftArrow && (
          <button
            onClick={() => scroll("left")}
            className="absolute left-0 top-0 bottom-0 z-20 w-14 bg-gradient-to-r from-[#0a0a0a] via-[#0a0a0a]/80 to-transparent 
                       flex items-center justify-center opacity-0 group-hover/row:opacity-100 transition-opacity"
          >
            <ChevronLeft className="w-8 h-8 text-white" />
          </button>
        )}

        {/* Scroll container */}
        <div
          ref={scrollRef}
          onScroll={handleScroll}
          className="flex gap-3 md:gap-4 overflow-x-auto scrollbar-hide px-6 md:px-10 lg:px-14 pb-4"
          style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
        >
          {items.map((item) => (
            <PosterCard
              key={`${item.id}-${item.title}`}
              media={item}
              showEpisodeInfo={showEpisodeInfo}
            />
          ))}
        </div>

        {/* Right arrow */}
        {showRightArrow && (
          <button
            onClick={() => scroll("right")}
            className="absolute right-0 top-0 bottom-0 z-20 w-14 bg-gradient-to-l from-[#0a0a0a] via-[#0a0a0a]/80 to-transparent 
                       flex items-center justify-center opacity-0 group-hover/row:opacity-100 transition-opacity"
          >
            <ChevronRight className="w-8 h-8 text-white" />
          </button>
        )}
      </div>
    </div>
  );
}
