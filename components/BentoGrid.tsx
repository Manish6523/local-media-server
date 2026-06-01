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
  const heroItem = continueWatching[0] || recentlyAdded[0];
  const sideItems = [...continueWatching.slice(1, 3), ...recentlyAdded.slice(1, 5)].slice(0, 4);

  if (!heroItem) return null;

  return (
    <div className="px-6 md:px-12 lg:px-20 py-12">
      <h2 className="text-2xl font-bold text-foreground mb-6">Jump Back In</h2>
      <div className="grid grid-cols-1 md:grid-cols-4 grid-rows-2 gap-4 md:gap-6 h-auto md:h-[600px]">
        {/* Main large card */}
        <motion.div
          whileHover={{ scale: 1.02 }}
          transition={{ type: "spring", stiffness: 300, damping: 20 }}
          className="col-span-1 md:col-span-2 row-span-2 relative rounded-3xl overflow-hidden group border border-white/10 shadow-2xl h-[400px] md:h-full cursor-pointer"
        >
          <Link
            href={
              heroItem.type === "show"
                ? `/shows/${encodeURIComponent(heroItem.title.toLowerCase().replace(/\\s+/g, "-"))}`
                : `/movies/${encodeURIComponent(heroItem.title.toLowerCase().replace(/\\s+/g, "-"))}`
            }
            className="block w-full h-full"
          >
            <Image
              src={heroItem.backdrop || heroItem.poster || "/placeholder.jpg"}
              alt={heroItem.title}
              fill
              className="object-cover transition-transform duration-700 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-background/20 to-transparent" />
            <div className="absolute bottom-0 left-0 p-8 w-full">
              <span className="bg-primary/20 text-primary px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider mb-3 inline-block">
                Continue Watching
              </span>
              <h3 className="text-3xl font-black text-foreground drop-shadow-lg mb-2">
                {heroItem.title}
              </h3>
              {heroItem.type === "show" && heroItem.episode_start && (
                <p className="text-muted-foreground font-medium mb-4">
                  S{heroItem.season} E{heroItem.episode_start}
                </p>
              )}
              <div className="flex items-center gap-2 mt-4">
                <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center shadow-lg shadow-primary/30 group-hover:scale-110 transition-transform">
                  <Play className="w-5 h-5 fill-background text-background ml-1" />
                </div>
              </div>
            </div>
          </Link>
        </motion.div>

        {/* Smaller side cards */}
        {sideItems.map((item, idx) => (
          <motion.div
            key={`${item.id}-${idx}`}
            whileHover={{ scale: 1.02 }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
            className="col-span-1 row-span-1 relative rounded-2xl overflow-hidden group border border-white/5 shadow-lg h-[200px] md:h-auto cursor-pointer"
          >
            <Link
              href={
                item.type === "show"
                  ? `/shows/${encodeURIComponent(item.title.toLowerCase().replace(/\\s+/g, "-"))}`
                  : `/movies/${encodeURIComponent(item.title.toLowerCase().replace(/\\s+/g, "-"))}`
              }
              className="block w-full h-full"
            >
              <Image
                src={item.backdrop || item.poster || "/placeholder.jpg"}
                alt={item.title}
                fill
                className="object-cover transition-transform duration-700 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-background/90 to-transparent opacity-80 group-hover:opacity-100 transition-opacity" />
              <div className="absolute bottom-0 left-0 p-4 w-full">
                <h4 className="text-lg font-bold text-foreground truncate">{item.title}</h4>
                <p className="text-xs text-muted-foreground font-medium mt-1">
                  {item.year || (item.type === 'show' ? 'Series' : 'Movie')}
                </p>
              </div>
            </Link>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
