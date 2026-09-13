"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Play, ChevronLeft, ChevronRight, Star, Clock, FolderPlus, Scan, Film, KeyRound, ShieldCheck } from "lucide-react";
import { useBackground } from "@/components/BackgroundContext";
import OnboardingModal, { shouldShowOnboarding } from "./OnboardingModal";
import type { MediaEntry } from "@/lib/db";

const HERO_GLASS_STYLE = {
  backdropFilter: "saturate(160%) blur(24px)",
  WebkitBackdropFilter: "saturate(160%) blur(24px)",
};

export default function HeroFeatured({ items, enableOnboarding = false }: { items: MediaEntry[]; enableOnboarding?: boolean }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const { setBgImage } = useBackground();

  useEffect(() => {
    if (!enableOnboarding || items.length !== 0 || !shouldShowOnboarding()) return;
    const timer = window.setTimeout(() => setShowOnboarding(true), 0);
    return () => window.clearTimeout(timer);
  }, [enableOnboarding, items.length]);

  useEffect(() => {
    if (items && items.length > 0) {
      setBgImage(
        items[currentIndex].backdrop || items[currentIndex].poster || null,
      );
    }
  }, [currentIndex, items, setBgImage]);

  useEffect(() => {
    if (items.length <= 1) return;
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % items.length);
    }, 8000);
    return () => clearInterval(timer);
  }, [items.length]);

  const handleNext = useCallback(() => {
    setCurrentIndex((prev) => (prev === items.length - 1 ? 0 : prev + 1));
  }, [items.length]);

  const handlePrev = useCallback(() => {
    setCurrentIndex((prev) => (prev === 0 ? items.length - 1 : prev - 1));
  }, [items.length]);

  if (!items || items.length === 0) {
    return (
      <div className="relative z-20 flex min-h-[85vh] w-full items-center overflow-hidden bg-[#050506] px-5 pb-12 pt-28 md:px-10 lg:px-14">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_42%,rgba(229,9,20,0.08),transparent_30%)]" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-white/[0.06]" />

        <div className="relative z-10 mx-auto grid w-full max-w-6xl items-center gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:gap-20">
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="glass mb-7 inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.18em] text-white/50 shadow-lg shadow-black/20">
              <ShieldCheck className="h-3.5 w-3.5 text-red-500" /> Private by design
            </div>
            <h1 className="max-w-xl text-4xl font-black leading-[1.05] tracking-[-0.04em] text-white sm:text-5xl md:text-6xl">
              Your collection.<br />Your screen.
            </h1>
            <p className="mt-6 max-w-lg text-base leading-relaxed text-white/45 md:text-lg">
              Turn the movies and shows you already own into a personal streaming library—stored and played from your computer.
            </p>
            {enableOnboarding && (
              <button type="button" onClick={() => setShowOnboarding(true)} className="glass-md group mt-9 inline-flex items-center gap-3 rounded-full px-7 py-3.5 text-sm font-bold text-white shadow-xl shadow-black/30 transition hover:border-red-500/30 hover:bg-red-500/15">
                <span className="pointer-events-none">Set up my library</span>
                <ChevronRight className="pointer-events-none h-4 w-4 transition-transform group-hover:translate-x-1" />
              </button>
            )}
            <p className="mt-4 text-xs text-white/25">No account required · Your files stay local</p>
          </div>

          <div className="glass-md overflow-hidden rounded-[1.75rem] shadow-2xl shadow-black/40 animate-in fade-in slide-in-from-bottom-6 duration-700 delay-150">
            <div className="flex items-center justify-between border-b border-white/[0.07] px-6 py-5">
              <div>
                <p className="text-sm font-bold text-white">Three steps to movie night</p>
                <p className="mt-1 text-xs text-white/35">Usually takes only a few minutes</p>
              </div>
              <Film className="h-5 w-5 text-white/25" />
            </div>
            {[
              { number: "01", title: "Choose your folders", copy: "Point VidLock to the folders containing your video files.", icon: FolderPlus },
              { number: "02", title: "Add metadata keys", copy: "Connect OMDB and Fanart.tv for accurate details and artwork.", icon: KeyRound },
              { number: "03", title: "Scan your library", copy: "VidLock identifies your files and organizes everything for you.", icon: Scan },
            ].map((step, index) => (
              <div key={step.number} className={`group flex gap-5 px-6 py-5 transition-colors hover:bg-white/[0.025] ${index !== 2 ? "border-b border-white/[0.06]" : ""}`}>
                <span className="pt-1 font-mono text-xs font-bold text-red-500/80">{step.number}</span>
                <div className="glass flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white/55 shadow-inner transition group-hover:text-white">
                  <step.icon className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-bold text-white/90">{step.title}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-white/35">{step.copy}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
        {enableOnboarding && <OnboardingModal open={showOnboarding} onOpenChange={setShowOnboarding} />}
      </div>
    );
  }

  const currentItem = items[currentIndex];
  const slug = encodeURIComponent(currentItem.title.toLowerCase().replace(/\s+/g, "-"));
  const detailsHref = `/${currentItem.type === "show" ? "shows" : "movies"}/${slug}${
    currentItem.source === "online" && currentItem.omdb_id
      ? `?imdb=${encodeURIComponent(currentItem.omdb_id)}`
      : ""
  }`;
  const watchHref = currentItem.source === "online" && currentItem.omdb_id
    ? `/player/online?imdb=${encodeURIComponent(currentItem.omdb_id)}&type=${currentItem.type}`
    : `/player/${currentItem.id}`;

  return (
    <div className="relative w-full min-h-[75vh] md:min-h-[85vh] overflow-hidden">
      {/* Background image with crossfade */}
      {items.map((item, idx) => (
        <div
          key={item.id}
          className="absolute inset-0 transition-opacity duration-1000 ease-in-out"
          style={{ opacity: idx === currentIndex ? 1 : 0 }}
        >
          <img
            src={item.backdrop || item.poster || undefined}
            alt={item.title}
            className="w-full h-full object-cover object-center scale-105"
          />
        </div>
      ))}

      {/* Gradient overlays */}
      <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-background/20 z-[1]" />
      {/* <div className="absolute inset-0 bg-gradient-to-r from-background/80 via-background/30 to-transparent z-[1]" /> */}
      {/* <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-background to-transparent z-[1]" /> */}

      {/* Content */}
      <div className="relative z-10 flex items-end min-h-[75vh] md:min-h-[85vh] px-4 md:px-8 lg:px-12 pb-20 md:pb-28">
        <div className="max-w-2xl">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 glass rounded-full px-3 py-1.5 mb-5 text-xs font-medium text-white/60">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
            Featured
          </div>

          {/* Title */}
          <h1
            key={`title-${currentItem.id}`}
            className="text-4xl md:text-6xl lg:text-7xl font-bold text-white leading-[0.95] tracking-tight mb-4 animate-in fade-in slide-in-from-bottom-4 duration-700"
          >
            {currentItem.title}
          </h1>

          {/* Metadata */}
          <div className="flex items-center gap-3 text-sm text-white/40 font-medium mb-4 flex-wrap animate-in fade-in slide-in-from-bottom-3 duration-700 delay-100">
            {currentItem.year && <span>{currentItem.year}</span>}
            {currentItem.rating && (
              <>
                <span className="w-1 h-1 rounded-full bg-white/20" />
                <span className="flex items-center gap-1 text-amber-300">
                  <Star className="w-3.5 h-3.5 fill-current" />
                  {currentItem.rating.split("/")[0]}
                </span>
              </>
            )}
            {currentItem.genres && (
              <>
                <span className="w-1 h-1 rounded-full bg-white/20" />
                <span>
                  {currentItem.genres
                    .split(",")
                    .slice(0, 2)
                    .map((g) => g.trim())
                    .join(" / ")}
                </span>
              </>
            )}
            {currentItem.runtime && (
              <>
                <span className="w-1 h-1 rounded-full bg-white/20" />
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {Math.floor(currentItem.runtime / 60)}h{" "}
                  {currentItem.runtime % 60}m
                </span>
              </>
            )}
          </div>

          {/* Overview */}
          {currentItem.overview && (
            <p className="text-sm text-white/35 line-clamp-2 max-w-lg leading-relaxed mb-6 animate-in fade-in slide-in-from-bottom-2 duration-700 delay-200">
              {currentItem.overview}
            </p>
          )}

          {/* Actions */}
          <div className="flex items-center gap-3 animate-in fade-in slide-in-from-bottom-2 duration-700 delay-300">
            {currentItem.available === 1 && (
              <Link
                href={watchHref}
                className="inline-flex items-center gap-2.5 sm:px-7 px-4 py-3 rounded-full bg-white text-black font-semibold text-sm hover:bg-red-500 hover:text-white transition-all shadow-lg shadow-black/25 hover:scale-[1.02] active:scale-[0.98]"
              >
                <Play className="w-4 h-4 fill-current" />
                <span className="block sm:hidden">Watch</span>
                <span className="hidden sm:block">Watch Now</span>
              </Link>
            )}
            <Link
              href={detailsHref}
              style={HERO_GLASS_STYLE}
              className="inline-flex items-center gap-2 px-5 py-3 rounded-full glass text-white/70 text-sm font-medium hover:text-white hover:bg-white/[0.08] transition-all"
            >
              Details
            </Link>
          </div>
        </div>

        {/* Carousel controls */}
        {items.length > 1 && (
          <div className="absolute bottom-20 md:bottom-28 right-4 md:right-8 lg:right-12 flex items-center gap-3 z-20">
            {/* Dots */}
            <div className="hidden sm:flex items-center gap-1.5 mr-2">
              {items.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setCurrentIndex(idx)}
                  className={`hero-dot ${idx === currentIndex ? "active" : ""}`}
                />
              ))}
            </div>

            <button
              onClick={handlePrev}
              style={HERO_GLASS_STYLE}
              className="w-10 h-10 rounded-full cursor-pointer glass flex items-center justify-center text-white/50 hover:text-white hover:bg-white/[0.08] transition-all"
              aria-label="Previous featured title"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={handleNext}
              style={HERO_GLASS_STYLE}
              className="w-10 h-10 rounded-full cursor-pointer glass flex items-center justify-center text-white/50 hover:text-white hover:bg-white/[0.08] transition-all"
              aria-label="Next featured title"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
