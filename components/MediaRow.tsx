"use client";

import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import PosterCard from "./PosterCard";

import type { MediaEntry } from "@/lib/db";

interface MediaRowProps {
  title: string;
  items: MediaEntry[];
  showEpisodeInfo?: boolean;
}

export default function MediaRow({ title, items, showEpisodeInfo = false }: MediaRowProps) {
  if (items.length === 0) return null;

  return (
    <div className="relative group/row py-0 first:pt-4 px-6 md:px-12 lg:px-20">
      {/* Editorial Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="h-6 w-1 bg-primary rounded-full shadow-[0_0_8px_hsl(var(--primary))]" />
        <h2 className="text-lg md:text-xl font-black italic tracking-tighter uppercase text-foreground/90">
          {title}
        </h2>
      </div>

      <Carousel
        opts={{
          align: "start",
          loop: false,
          dragFree: true,
        }}
        className="w-full relative"
      >
        <CarouselContent className="-ml-2 md:-ml-4">
          {items.map((item) => (
            <CarouselItem
              key={`${item.id}-${item.title}`}
              className="pl-2 md:pl-4 basis-1/2 sm:basis-1/3 md:basis-1/4 lg:basis-1/5 xl:basis-1/6"
            >
              <PosterCard media={item} showEpisodeInfo={showEpisodeInfo} />
            </CarouselItem>
          ))}
        </CarouselContent>
        <div className="opacity-0 group-hover/row:opacity-100 transition-opacity">
          <CarouselPrevious className="absolute -left-4 md:-left-8 bg-background/50 backdrop-blur-md border-white/10 hover:bg-white/20 hover:text-white" />
          <CarouselNext className="absolute -right-4 md:-right-8 bg-background/50 backdrop-blur-md border-white/10 hover:bg-white/20 hover:text-white" />
        </div>
      </Carousel>
    </div>
  );
}