import Link from "next/link";
import { Play, Film } from "lucide-react";
import type { MediaEntry } from "@/lib/db";

export default function MiniMoviesList({ items, title = "Movies" }: { items: MediaEntry[], title?: string }) {
  if (!items || items.length === 0) return null;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-white/90 flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-violet-500/20">
            <Film className="w-3.5 h-3.5 text-white" />
          </div>
          {title}
        </h2>
        <Link href="/movies" className="text-xs text-white/30 hover:text-white/60 transition-colors font-medium">
          See all
        </Link>
      </div>

      <div className="flex gap-4 overflow-x-auto scrollbar-hide pb-2">
        {items.slice(0, 10).map((item) => (
          <Link
            key={item.id}
            href={`/player/${item.id}`}
            className="group relative w-[150px] shrink-0"
          >
            {/* Poster */}
            <div className="relative aspect-[2/3] rounded-xl overflow-hidden border border-white/[0.06] hover:border-violet-500/20 transition-all duration-300 shadow-lg shadow-black/30">
              <img
                src={item.poster || item.backdrop || ""}
                alt={item.title}
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
              />
              {/* Hover overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                <div className="w-10 h-10 rounded-full bg-violet-500/80 backdrop-blur-sm flex items-center justify-center shadow-lg shadow-violet-500/30 translate-y-2 group-hover:translate-y-0 transition-transform duration-300">
                  <Play className="w-4 h-4 text-white fill-current ml-0.5" />
                </div>
              </div>
            </div>
            
            {/* Info */}
            <div className="mt-2 px-0.5">
              <h3 className="text-xs font-medium text-white/70 truncate group-hover:text-white transition-colors">
                {item.title}
              </h3>
              <p className="text-[10px] text-white/30 mt-0.5 truncate">
                {item.year || "Unknown"} • {item.genres?.split(',')[0] || "Movie"}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
