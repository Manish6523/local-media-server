"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Play, Download, MoreHorizontal, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useBackground } from "@/components/BackgroundContext";
import type { MediaEntry } from "@/lib/db";

export default function HeroFeatured({ items }: { items: MediaEntry[] }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const { setBgImage } = useBackground();

  useEffect(() => {
    if (items && items.length > 0) {
      setBgImage(items[currentIndex].backdrop || items[currentIndex].poster || null);
    }
  }, [currentIndex, items, setBgImage]);

  if (!items || items.length === 0) return null;

  const currentItem = items[currentIndex];

  const handleNext = () => {
    setCurrentIndex((prev) => (prev === items.length - 1 ? 0 : prev + 1));
  };

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev === 0 ? items.length - 1 : prev - 1));
  };

  return (
    <div className="relative w-full aspect-[21/9] min-h-[350px] md:min-h-[400px] rounded-3xl overflow-hidden group border border-white/10 shadow-2xl bg-black">
      {/* Background Image */}
      <img
        key={currentItem.id}
        src={currentItem.backdrop || currentItem.poster || ""}
        alt={currentItem.title}
        className="absolute inset-0 w-full h-full object-cover transition-transform duration-1000 ease-out group-hover:scale-[1.02] animate-in fade-in duration-500 opacity-90"
      />
      
      {/* Gradients */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/30 to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-r from-black/50 via-black/30 to-transparent" />

      {/* Top Left Badge */}
      {/* <div className="absolute top-6 left-8">
        <Badge variant="secondary" className="bg-black/40 hover:bg-black/40 backdrop-blur-md border-white/10 text-white gap-2 py-1.5 px-3">
          <span className="text-sm">🔥</span> Trending Now
        </Badge>
      </div> */}

      {/* Content */}
      <div className="absolute bottom-8 left-8 right-8 flex flex-col md:flex-row items-end justify-between gap-6">
        <div className="flex-1 max-w-xl animate-in fade-in slide-in-from-bottom-4 duration-700">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-3 tracking-tight drop-shadow-md">
            {currentItem.title}
          </h1>
          <p className="text-xs md:text-sm text-white/70 mb-4 font-medium flex items-center gap-2 drop-shadow-sm">
            <span>{currentItem.year || "Unknown"}</span>
            <span className="w-1 h-1 rounded-full bg-white/30" />
            <span>{currentItem.genres?.split(',')[0] || "Drama"}</span>
            <span className="w-1 h-1 rounded-full bg-white/30" />
            <span>2h 2m</span> {/* Static for now */}
          </p>
          <p className="text-sm text-white/60 line-clamp-2 md:line-clamp-3 mb-6 leading-relaxed max-w-lg drop-shadow-sm">
            {currentItem.overview || "No description available."}
          </p>
          
          <div className="flex items-center gap-3">
            <Button render={<Link href={`/player/${currentItem.id}`} />} nativeButton={false} size="lg" className="rounded-full font-semibold gap-2">
                <Play className="w-4 h-4 fill-current" />
                Watch
            </Button>
            
          </div>
        </div>

        {/* Carousel Controls */}
        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="outline"
            size="icon"
            onClick={handlePrev}
            className="rounded-full w-10 h-10 bg-black/40 backdrop-blur-md border-white/10 text-white hover:bg-black/60 hover:text-white transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={handleNext}
            className="rounded-full w-10 h-10 bg-black/40 backdrop-blur-md border-white/10 text-white hover:bg-black/60 hover:text-white transition-colors"
          >
            <ChevronRight className="w-5 h-5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
