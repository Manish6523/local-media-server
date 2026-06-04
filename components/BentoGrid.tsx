"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { Play } from "lucide-react";
import type { MediaEntry } from "@/lib/db";

interface BentoGridProps {
  continueWatching: MediaEntry[];
  recentlyAdded: MediaEntry[];
}

export default function BentoGrid({ continueWatching, recentlyAdded }: BentoGridProps) {
  // Combine pools — deduplicate by title, prioritize continueWatching
  const seen = new Set<string>();
  const pool: MediaEntry[] = [];
  for (const item of [...continueWatching, ...recentlyAdded]) {
    if (!seen.has(item.title)) {
      seen.add(item.title);
      pool.push(item);
    }
  }

  // Need at least 3 items for a proper bento grid
  if (pool.length < 3) return null;

  const heroItem = pool[0];
  // Take up to 4 side items
  const sideItems = pool.slice(1, 5);
  // Ensure we have at least 4 side items for the grid to look balanced
  // If fewer, the grid still works gracefully

  const getHref = (item: MediaEntry) =>
    item.type === "show"
      ? `/shows/${encodeURIComponent(item.title.toLowerCase().replace(/\s+/g, "-"))}`
      : `/movies/${encodeURIComponent(item.title.toLowerCase().replace(/\s+/g, "-"))}`;

  return (
    <div className="px-4 md:px-8 lg:px-14 py-8">
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          Jump Back In
        </h2>
        <span className="text-[11px] text-white/40 font-medium">{pool.length} titles</span>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 auto-rows-[200px] md:auto-rows-[260px]">
        {/* Main large card — spans 2 cols and 2 rows */}
        <motion.div
          whileHover={{ scale: 1.01 }}
          transition={{ type: "spring", stiffness: 300, damping: 25 }}
          className="col-span-2 row-span-2 relative rounded-2xl overflow-hidden group border border-white/8 shadow-2xl cursor-pointer"
        >
          <Link href={getHref(heroItem)} className="block w-full h-full">
            <Image
              src={heroItem.backdrop || heroItem.poster || "/placeholder.jpg"}
              alt={heroItem.title}
              fill
              className="object-cover transition-transform duration-700 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent" />
            <div className="absolute bottom-0 left-0 p-6 w-full">
              <span className="inline-flex items-center gap-1 bg-white/10 backdrop-blur-md text-white text-[10px] font-semibold px-2.5 py-1 rounded-full mb-3 border border-white/10">
                Continue Watching
              </span>
              <h3 className="text-2xl md:text-3xl font-black text-white drop-shadow-lg mb-1">
                {heroItem.title}
              </h3>
              {heroItem.type === "show" && heroItem.episode_start && (
                <p className="text-white/50 font-medium text-sm mb-3">
                  S{heroItem.season} E{heroItem.episode_start}
                </p>
              )}
              <div className="flex items-center gap-2 mt-3">
                <div className="w-11 h-11 rounded-full bg-white flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                  <Play className="w-5 h-5 fill-black text-black ml-0.5" />
                </div>
              </div>
            </div>
          </Link>
        </motion.div>

        {/* Side cards — each spans 1 col, 1 row */}
        {sideItems.map((item, idx) => (
          <motion.div
            key={`bento-${item.id}-${idx}`}
            whileHover={{ scale: 1.02 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            className="col-span-1 row-span-1 relative rounded-xl overflow-hidden group border border-white/5 shadow-lg cursor-pointer"
          >
            <Link href={getHref(item)} className="block w-full h-full">
              <Image
                src={item.backdrop || item.poster || "/placeholder.jpg"}
                alt={item.title}
                fill
                className="object-cover transition-transform duration-700 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/85 to-transparent opacity-80 group-hover:opacity-100 transition-opacity" />
              <div className="absolute bottom-0 left-0 p-3 md:p-4 w-full">
                <h4 className="text-sm md:text-base font-bold text-white truncate">{item.title}</h4>
                <p className="text-[11px] text-white/40 font-medium mt-0.5">
                  {item.year || ""}{item.year && item.genres ? " · " : ""}{item.genres?.split(",")[0]?.trim() || (item.type === "show" ? "Series" : "Movie")}
                </p>
              </div>
              {/* Hover play icon */}
              <div className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/90 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-md">
                <Play className="w-3.5 h-3.5 text-black fill-black ml-0.5" />
              </div>
            </Link>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
