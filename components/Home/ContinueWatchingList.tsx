import Link from "next/link";
import { Flame, Play } from "lucide-react";
import type { MediaEntry } from "@/lib/db";

export default function ContinueWatchingList({ items }: { items: MediaEntry[] }) {
  if (!items || items.length === 0) return null;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-white/90 flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center shadow-lg shadow-orange-500/20">
            <Flame className="w-3.5 h-3.5 text-white" />
          </div>
          Continue Watching
        </h2>
        <Link href="/" className="text-xs text-white/30 hover:text-white/60 transition-colors font-medium">
          See all
        </Link>
      </div>

      <div className="flex gap-4 overflow-x-auto scrollbar-hide pb-2">
        {items.slice(0, 6).map((item) => {
          const progressPercent = item.watch_progress && item.runtime
            ? Math.min(100, Math.max(0, (item.watch_progress / (item.runtime * 60)) * 100))
            : 0;

          return (
            <Link
              key={item.id}
              href={`/player/${item.id}`}
              className="relative w-[280px] md:w-[320px] aspect-video rounded-2xl overflow-hidden group shrink-0 glass border border-white/[0.06] hover:border-violet-500/20 transition-all duration-300"
            >
              {/* Background Image */}
              <img
                src={item.backdrop || item.poster || ""}
                alt={item.title}
                className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105 opacity-80"
              />
              {/* Gradient Overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
              
              {/* Content */}
              <div className="absolute inset-x-0 bottom-0 p-4 flex items-end justify-between">
                <div className="flex-1 min-w-0 pr-3">
                  <h3 className="text-sm font-semibold text-white truncate">{item.title}</h3>
                  <p className="text-[11px] text-white/40 mt-0.5 truncate">
                    {item.year || "Unknown"} • {item.genres?.split(',')[0] || "Action"}
                  </p>
                </div>
                <div className="w-9 h-9 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/10 group-hover:bg-violet-500 group-hover:border-violet-400 text-white transition-all duration-300 shrink-0 shadow-lg">
                  <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
                </div>
              </div>

              {/* Progress Bar */}
              {progressPercent > 0 && (
                <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-white/[0.06]">
                  <div
                    className="h-full bg-gradient-to-r from-violet-500 to-cyan-400 shadow-[0_0_8px_rgba(139,92,246,0.4)]"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
