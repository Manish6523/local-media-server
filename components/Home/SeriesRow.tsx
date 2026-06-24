import Link from "next/link";
import { Play } from "lucide-react";
import type { MediaEntry } from "@/lib/db";

export default function SeriesRow({ items }: { items: MediaEntry[] }) {
  if (items.length === 0) return null;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-end justify-between px-1">
        <h2 className="text-xl md:text-2xl font-black text-white tracking-tight">
          TV Series
        </h2>
        <Link href="/shows" className="text-sm text-white/40 hover:text-white transition-colors font-semibold">
          See All
        </Link>
      </div>

      <div className="flex gap-4 md:gap-6 overflow-x-auto scrollbar-hide pb-6 pt-2 px-1">
        {items.map((item) => (
          <Link
            key={item.id}
            href={`/shows/${encodeURIComponent(item.title.toLowerCase().replace(/\s+/g, "-"))}`}
            className="group relative w-[260px] md:w-[320px] lg:w-[380px] shrink-0 aspect-video rounded-2xl md:rounded-[24px] overflow-hidden bg-[#111] border border-white/[0.04] shadow-2xl transition-all duration-500 hover:shadow-[0_20px_40px_-15px_rgba(56,189,248,0.25)] hover:border-cyan-500/30"
          >
            {/* Background Image */}
            <img
              src={item.backdrop || item.poster || undefined}
              alt={item.title}
              className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105 opacity-90"
            />
            
            {/* Gradient Overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-black/40 to-transparent opacity-90 group-hover:opacity-100 transition-opacity duration-500" />
            
            {/* Play Button Overlay */}
            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 transform scale-90 group-hover:scale-100">
              <div className="w-14 h-14 rounded-full bg-white/20 backdrop-blur-md border border-white/30 flex items-center justify-center shadow-[0_0_30px_rgba(255,255,255,0.2)]">
                <Play className="w-6 h-6 text-white fill-white ml-1" />
              </div>
            </div>

            {/* Content */}
            <div className="absolute inset-x-0 bottom-0 p-5 md:p-6 flex flex-col justify-end">
              <h3 className="text-base md:text-lg font-bold text-white truncate drop-shadow-md group-hover:text-cyan-200 transition-colors">
                {item.title}
              </h3>
              <div className="flex items-center gap-2 text-xs text-white/50 mt-1 font-medium">
                <span>{item.year || "Unknown"}</span>
                {item.season && (
                  <>
                    <span className="w-1 h-1 rounded-full bg-white/20" />
                    <span>{item.season} Seasons</span>
                  </>
                )}
                <span className="w-1 h-1 rounded-full bg-white/20" />
                <span>{item.genres?.split(',')[0] || "Drama"}</span>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
