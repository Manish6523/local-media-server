import Link from "next/link";
import { Flame, Play } from "lucide-react";
import type { MediaEntry } from "@/lib/db";
import { Button } from "@/components/ui/button";

export default function ContinueWatchingList({ items }: { items: MediaEntry[] }) {
  if (!items || items.length === 0) return null;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          <Flame className="text-orange-500 w-5 h-5" /> Continue Watching
        </h2>
        <Button variant="link" size="sm" render={<Link href="/" />} nativeButton={false} className="text-white/50 hover:text-white px-0 h-auto">
          See all
        </Button>
      </div>

      <div className="flex flex-col gap-3">
        {items.slice(0, 2).map((item) => (
          <Link
            key={item.id}
            href={`/player/${item.id}`}
            className="relative h-40 rounded-2xl overflow-hidden group border border-white/5 shadow-xl"
          >
            {/* Background Image */}
            <img
              src={item.backdrop || item.poster || ""}
              alt={item.title}
              className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105 opacity-80"
            />
            {/* Gradient Overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
            
            {/* Content */}
            <div className="absolute inset-x-0 bottom-0 p-3 flex flex-col justify-end">
              <h3 className="text-sm font-bold text-white drop-shadow-md truncate pr-8">
                {item.title}
              </h3>
              <p className="text-[10px] text-white/70 drop-shadow-md truncate">
                {item.year || "Unknown"} • {item.genres?.split(',')[0] || "Action"}
              </p>
            </div>

            {/* Play Button */}
            <div className="absolute bottom-3 right-3 w-8 h-8 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/20 group-hover:bg-white text-white group-hover:text-black transition-colors">
              <Play className="w-3 h-3 fill-current ml-0.5" />
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
