import Link from "next/link";
import { Play } from "lucide-react";
import type { MediaEntry } from "@/lib/db";

export default function MiniMoviesList({ items, title = "Movies" }: { items: MediaEntry[], title?: string }) {
  if (!items || items.length === 0) return null;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-end justify-between px-1">
        <h2 className="text-xl md:text-2xl font-black text-white tracking-tight">
          {title}
        </h2>
        <Link href="/movies" className="text-sm text-white/40 hover:text-white transition-colors font-semibold">
          See All
        </Link>
      </div>

      <div className="flex gap-4 md:gap-5 overflow-x-auto scrollbar-hide pb-6 pt-2 px-1">
        {items.slice(0, 10).map((item) => {
          const slug = encodeURIComponent((item.title || "Unknown").toLowerCase().replace(/\s+/g, "-"));
          const href = item.source === "online" 
            ? `/movies/${slug}?imdb=${item.omdb_id}` 
            : `/player/${item.id}`;
            
          return (
          <Link
            key={item.id}
            href={href}
            className="group relative w-[140px] sm:w-[160px] md:w-[180px] shrink-0"
          >
            {/* Poster Card */}
            <div className="relative aspect-[2/3] rounded-[20px] overflow-hidden bg-[#111] border border-white/[0.04] shadow-xl transition-all duration-500 group-hover:shadow-[0_20px_40px_-15px_rgba(139,92,246,0.25)] group-hover:border-violet-500/30 group-hover:-translate-y-2">
              <img
                src={item.poster || item.backdrop || undefined}
                alt={item.title}
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105 opacity-90 group-hover:opacity-100"
              />
              
              {/* Hover overlay with gradient */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              
              {/* Play Button Overlay */}
              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 transform scale-75 group-hover:scale-100">
                <div className="w-12 h-12 rounded-full bg-violet-500/90 backdrop-blur-md flex items-center justify-center shadow-[0_0_20px_rgba(139,92,246,0.5)]">
                  <Play className="w-5 h-5 text-white fill-white ml-0.5" />
                </div>
              </div>
            </div>
            
            {/* Info Below Poster */}
            <div className="mt-3 px-1">
              <h3 className="text-sm font-bold text-white/90 truncate group-hover:text-violet-300 transition-colors">
                {item.title}
              </h3>
              <p className="text-[11px] text-white/40 mt-1 truncate font-medium">
                {item.year || "Unknown"} • {item.genres?.split(',')[0] || "Movie"}
              </p>
            </div>
          </Link>
          );
        })}
      </div>
    </div>
  );
}
