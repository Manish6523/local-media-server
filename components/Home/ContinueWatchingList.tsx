import Link from "next/link";
import PosterCard from "../PosterCard";
import type { MediaEntry } from "@/lib/db";

export default function ContinueWatchingList({ items }: { items: MediaEntry[] }) {
  if (!items || items.length === 0) return null;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-end justify-between px-1">
        <h2 className="text-xl md:text-2xl font-black text-white tracking-tight">
          Continue Watching
        </h2>
        <Link href="/" className="text-sm text-white/40 hover:text-white transition-colors font-semibold">
          See All
        </Link>
      </div>

      <div className="flex gap-4 md:gap-6 overflow-x-auto scrollbar-hide pb-6 pt-2 px-1">
        {items.slice(0, 6).map((item) => (
          <div key={item.id} className="w-[280px] md:w-[340px] lg:w-[400px] shrink-0">
            <PosterCard media={item} variant="landscape" />
          </div>
        ))}
      </div>
    </div>
  );
}
