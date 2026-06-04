import Link from "next/link";
import { Play } from "lucide-react";
import type { MediaEntry } from "@/lib/db";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
} from "@/components/ui/carousel";
import { Button } from "@/components/ui/button";

export default function SeriesRow({ items }: { items: MediaEntry[] }) {
  if (items.length === 0) return null;

  return (
    <div className="flex flex-col gap-4 mt-8">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-white">TV Series</h2>
        <Button variant="secondary" size="sm" render={<Link href="/shows" />} nativeButton={false} className="bg-white/10 hover:bg-white/20 text-white/70 hover:text-white rounded-full">
          See all
        </Button>
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
                href={`/player/${item.id}`}
                className="block relative w-[280px] h-[160px] rounded-2xl overflow-hidden group border border-white/10 shadow-xl"
              >
                {/* Background Image */}
                <img
                  src={item.backdrop || item.poster || ""}
                  alt={item.title}
                  className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                />
                {/* Gradient Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-80 group-hover:opacity-100 transition-opacity" />
                
                {/* Content */}
                <div className="absolute inset-x-0 bottom-0 p-4 flex items-end justify-between">
                  <div className="flex-1 min-w-0 pr-4">
                    <h3 className="text-base font-bold text-white drop-shadow-md truncate">
                      {item.title}
                    </h3>
                    <p className="text-[11px] text-white/70 drop-shadow-md mt-1 truncate">
                      {item.year || "Unknown"} • {item.genres?.split(',')[0] || "Drama"} • 5 seasons
                    </p>
                  </div>

                  {/* Play Button */}
                  <div className="w-10 h-10 shrink-0 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/20 group-hover:bg-white text-white group-hover:text-black transition-colors shadow-lg">
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
