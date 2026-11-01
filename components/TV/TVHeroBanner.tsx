"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import { Play, Info, Star, HardDrive } from "lucide-react";
import { useTVNavigation } from "./TVNavigationContext";
import type { MediaEntry } from "@/lib/db";

interface TVHeroBannerProps {
  media: MediaEntry | null;
  row?: number;
}

export default function TVHeroBanner({ media, row = 1 }: TVHeroBannerProps) {
  const { isFocused, registerRow, unregisterRow } = useTVNavigation();

  useEffect(() => {
    if (media) {
      registerRow(row, 2);
    }
    return () => unregisterRow(row);
  }, [media, row, registerRow, unregisterRow]);

  if (!media) return null;

  const playFocused = isFocused(row, 0);
  const detailsFocused = isFocused(row, 1);
  const backdropSrc = media.backdrop || media.poster || "/placeholder.jpg";
  const isUnavailable = !media.available;

  return (
    <div className="tv-hero">
      {/* Background Poster/Backdrop Image */}
      <div
        className="tv-hero-backdrop"
        style={{ backgroundImage: `url("${backdropSrc}")` }}
      />
      <div className="tv-hero-gradient" />

      {/* Foreground Content */}
      <div className="tv-hero-content">
        {/* Metadata Badges */}
        <div className="tv-hero-meta">
          <span className="tv-badge">
            {media.type === "show" ? "Series" : "Movie"}
          </span>
          {media.rating && (
            <span style={{ color: "#fcd34d", fontWeight: "bold", marginRight: 8, display: "inline-flex", alignItems: "center" }}>
              <Star style={{ width: 14, height: 14, fill: "#f59e0b", color: "#f59e0b", marginRight: 4 }} />
              {media.rating}
            </span>
          )}
          {media.year && <span style={{ marginRight: 8 }}>• {media.year}</span>}
          {media.type === "movie" && media.runtime && <span style={{ marginRight: 8 }}>• {media.runtime}m</span>}
          {media.type === "show" && media.season && <span style={{ marginRight: 8 }}>• {media.season} Seasons</span>}
          {media.genres && (
            <span style={{ color: "rgba(255,255,255,0.4)" }}>
              • {media.genres.split(",").slice(0, 2).join(", ")}
            </span>
          )}
        </div>

        {/* Big Grand Title */}
        <h1 className="tv-hero-title">{media.title}</h1>

        {/* Synopsis */}
        {media.overview && (
          <p className="tv-hero-overview">{media.overview}</p>
        )}

        {/* Action Buttons (Row 1) */}
        <div className="tv-btn-row">
          {isUnavailable ? (
            <div className="tv-btn tv-btn-secondary" style={{ opacity: 0.5, cursor: "not-allowed" }}>
              <HardDrive style={{ width: 16, height: 16, marginRight: 8 }} />
              <span>Drive Offline</span>
            </div>
          ) : (
            <Link
              href={`/tv/play/${media.id}`}
              data-tv-row={row}
              data-tv-col={0}
              className={`tv-btn tv-btn-primary ${playFocused ? "focused" : ""}`}
            >
              <Play style={{ width: 16, height: 16, fill: "#000", color: "#000", marginRight: 8 }} />
              <span>{media.watch_progress ? "Resume" : "Play Now"}</span>
            </Link>
          )}

          <Link
            href={`/tv/details/${media.id}`}
            data-tv-row={row}
            data-tv-col={1}
            className={`tv-btn tv-btn-secondary ${detailsFocused ? "focused" : ""}`}
          >
            <Info style={{ width: 16, height: 16, marginRight: 8 }} />
            <span>Details</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
