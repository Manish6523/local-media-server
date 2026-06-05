import Link from "next/link";
import { Play, Tv } from "lucide-react";
import type { MediaEntry } from "@/lib/db";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
} from "@/components/ui/carousel";

export default function SeriesRow({ items }: { items: MediaEntry[] }) {
  if (items.length === 0) return null;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-white/90 flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20">
            <Tv className="w-3.5 h-3.5 text-white" />
          </div>
          TV Series
        </h2>
        <Link href="/shows" className="text-xs text-white/30 hover:text-white/60 transition-colors font-medium px-3 py-1.5 rounded-full glass hover:border-white/10 transition-all">
          See all
        </Link>
      </div>

      <Carousel
        opts={{
          align: "start",
          dragFree: true,
        }}
        className="w-full"
      >
        <CarouselContent className="-ml-4">
          {items.map((item) => (
            <CarouselItem key={item.id} className="pl-4 basis-auto">
              <Link
                href={`/shows/${encodeURIComponent(item.title.toLowerCase().replace(/\s+/g, "-"))}`}
                className="block relative w-[280px] md:w-[320px] aspect-video rounded-2xl overflow-hidden group border border-white/[0.06] hover:border-violet-500/20 transition-all duration-300 shadow-lg shadow-black/20"
              >
                {/* Background Image */}
                <img
                  src={item.backdrop || item.poster || undefined}
                  alt={item.title}
                  className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                />
                {/* Gradient Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent opacity-80 group-hover:opacity-100 transition-opacity" />
                
                {/* Content */}
                <div className="absolute inset-x-0 bottom-0 p-4 flex items-end justify-between">
                  <div className="flex-1 min-w-0 pr-4">
                    <h3 className="text-base font-semibold text-white truncate">{item.title}</h3>
                    <p className="text-[11px] text-white/40 mt-1 truncate">
                      {item.year || "Unknown"} • {item.genres?.split(',')[0] || "Drama"} • {item.season ? `${item.season} seasons` : "Series"}
                    </p>
                  </div>

                  {/* Play Button */}
                  <div className="w-10 h-10 shrink-0 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/10 group-hover:bg-violet-500 group-hover:border-violet-400 text-white transition-all duration-300 shadow-lg">
                    <Play className="w-4 h-4 fill-current ml-0.5" />
                  </div>
                </div>
              </Link>
            </CarouselItem>
          ))}
        </CarouselContent>
      </Carousel>
    </div>
  );
}
