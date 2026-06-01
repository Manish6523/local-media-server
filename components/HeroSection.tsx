"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { Play, Users, Star } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { AnimatePresence, motion } from "framer-motion";

import type { MediaEntry } from "@/lib/db";

interface HeroSectionProps {
  items: MediaEntry[];
}

export default function HeroSection({ items }: HeroSectionProps) {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (items.length <= 1) return;
    
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % items.length);
    }, 10000); // 10 seconds
    
    return () => clearInterval(timer);
  }, [items.length]);

  if (items.length === 0) {
    return (
      <div className="relative w-full h-[70vh] bg-background flex items-center justify-center">
        <div className="text-center px-8">
          <h1 className="text-4xl md:text-6xl font-black text-foreground mb-4">
            Welcome to <span className="text-primary">Filmaro</span>
          </h1>
          <p className="text-lg text-muted-foreground max-w-xl mx-auto mb-8">
            Your personal offline media library. Scan your media files to get started.
          </p>
          <Link href="/settings" className={buttonVariants({ size: "lg" })}>
            <Play className="w-5 h-5 mr-2 fill-current" />
            Get Started
          </Link>
        </div>
      </div>
    );
  }

  const renderStars = (ratingStr: string | null) => {
    if (!ratingStr) return null;
    const match = ratingStr.match(/(\d+\.?\d*)/);
    if (!match) return null;
    let score = parseFloat(match[1]);
    if (ratingStr.includes("/10") || score > 5) {
      score = score / 2; // Convert 10 scale to 5 scale
    }
    const stars = Math.round(score);
    return (
      <div className="flex gap-1.5 text-primary my-4">
        {[1, 2, 3, 4, 5].map((s) => (
          <Star key={s} className={`w-5 h-5 ${s <= stars ? "fill-current" : "fill-transparent opacity-30"}`} />
        ))}
      </div>
    );
  };

  const activeMedia = items[currentIndex];

  return (
    <div className="relative w-full h-[70vh] overflow-hidden bg-background">
      <AnimatePresence mode="popLayout">
        <motion.div
          key={activeMedia.id}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1 }}
          className="absolute inset-0 z-0"
        >
          {/* Main Background */}
          <div className="absolute inset-0 z-0">
            <Image
              src={activeMedia.backdrop || activeMedia.poster || "/placeholder.jpg"}
              alt={activeMedia.title}
              fill
              className="object-cover object-center"
              priority
              sizes="100vw"
            />
          </div>

          {/* Complex CSS gradient vignette */}
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/20 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-r from-background via-background/50 to-transparent w-[80%]" />
        </motion.div>
      </AnimatePresence>

      <div className="relative z-10 h-full flex flex-col justify-end px-6 md:px-12 lg:px-20 w-full md:w-[70%] lg:w-[60%] pb-12">
        <AnimatePresence mode="popLayout">
          <motion.div
            key={`content-${activeMedia.id}`}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <h1 
              className="text-5xl md:text-7xl lg:text-8xl font-black text-foreground leading-none mb-2 tracking-tight drop-shadow-2xl"
            >
              {activeMedia.title.toUpperCase()}
            </h1>
            
            {activeMedia.type === "show" && activeMedia.season && (
              <p className="text-xl text-foreground/90 font-medium mt-2">
                Season {activeMedia.season}
              </p>
            )}

            {/* Stars */}
            {renderStars(activeMedia.rating)}

            {/* Genres */}
            {activeMedia.genres && (
              <div className="text-muted-foreground font-medium tracking-wide flex gap-2 items-center flex-wrap">
                {activeMedia.genres.split(",").map(g => g.trim()).join(" • ")}
              </div>
            )}

            {/* Overview */}
            {activeMedia.overview && (
              <p className="text-base md:text-lg text-foreground/80 mt-4 line-clamp-3 leading-relaxed max-w-xl font-medium">
                {activeMedia.overview}
              </p>
            )}

            {/* Action buttons */}
            <div className="flex items-center gap-4 mt-8">
              {activeMedia.available === 1 && (
                <Link
                  className={cn(buttonVariants({ size: "lg" }), "rounded-full px-8 text-base font-bold shadow-lg")}
                  href={
                    activeMedia.type === "show"
                      ? `/shows/${encodeURIComponent(activeMedia.title.toLowerCase().replace(/\s+/g, "-"))}`
                      : `/movies/${encodeURIComponent(activeMedia.title.toLowerCase().replace(/\s+/g, "-"))}`
                  }
                >
                  <Play className="w-5 h-5 mr-2 fill-current" />
                  Play Now
                </Link>
              )}
              
              <Link
                href="#"
                className={cn(buttonVariants({ size: "lg", variant: "outline" }), "rounded-full px-8 text-base font-bold backdrop-blur-md bg-background/20")}
              >
                <Users className="w-5 h-5 mr-2" />
                Host Watch Party
              </Link>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
