import Link from "next/link";
import PosterCard from "../PosterCard";
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
        {items.slice(0, 10).map((item) => (
          <div key={item.id} className="w-[150px] sm:w-[170px] md:w-[190px] lg:w-[200px] shrink-0">
            <PosterCard media={item} />
          </div>
        ))}
      </div>
    </div>
  );
}
