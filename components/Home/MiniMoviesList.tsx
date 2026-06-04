import Link from "next/link";
import { Play } from "lucide-react";
import type { MediaEntry } from "@/lib/db";
import { Button } from "@/components/ui/button";

export default function MiniMoviesList({ items, title = "Movies" }: { items: MediaEntry[], title?: string }) {
  if (!items || items.length === 0) return null;

  return (
    <div className="flex flex-col gap-4 mt-6">
      <div className="flex items-center justify-between px-2">
        <h2 className="text-lg font-bold text-white">{title}</h2>
        <Button variant="link" size="sm" render={<Link href="/movies" />} nativeButton={false} className="text-white/50 hover:text-white px-0 h-auto">
          See all
        </Button>
      </div>

      <div className="flex flex-col gap-2">
        {items.slice(0, 4).map((item) => (
          <Link
            key={item.id}
            href={`/player/${item.id}`}
            className="flex items-center gap-4 p-2 rounded-2xl hover:bg-white/5 transition-colors group"
          >
            {/* Thumbnail */}
            <div className="w-14 h-14 rounded-xl overflow-hidden shrink-0 relative border border-white/5 shadow-md">
              <img
                src={item.backdrop || item.poster || ""}
                alt={item.title}
                className="w-full h-full object-cover"
              />
            </div>
            
            {/* Info */}
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-semibold text-white/90 truncate group-hover:text-white transition-colors">
                {item.title}
              </h3>
              <p className="text-[11px] text-white/50 truncate mt-0.5">
                {item.year || "Unknown"} • {item.genres?.split(',')[0] || "Movie"}
              </p>
            </div>

            {/* Play Button - Only visible on hover or mobile */}
            <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center border border-white/10 group-hover:bg-white group-hover:text-black text-white transition-all shrink-0">
              <Play className="w-3 h-3 fill-current ml-0.5" />
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
