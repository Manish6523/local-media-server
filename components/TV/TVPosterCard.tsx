"use client";

import React from "react";
import Link from "next/link";
import { Play, HardDrive, Star } from "lucide-react";
import { useTVNavigation } from "./TVNavigationContext";
import type { MediaEntry } from "@/lib/db";

interface TVPosterCardProps {
  media: MediaEntry;
  row: number;
  col: number;
  variant?: "poster" | "landscape";
  onFocus?: () => void;
}

export default function TVPosterCard({
  media,
  row,
  col,
  variant = "poster",
  onFocus,
}: TVPosterCardProps) {
  const { isFocused } = useTVNavigation();
  const focused = isFocused(row, col);

  React.useEffect(() => {
    if (focused && onFocus) {
      onFocus();
    }
  }, [focused, onFocus]);

  const progressPercent =
    media.watch_progress && media.runtime
      ? Math.min(100, Math.max(0, (media.watch_progress / (media.runtime * 60)) * 100))
      : 0;

  const isUnavailable = !media.available;
  const imageSrc =
    variant === "landscape"
      ? media.backdrop || media.poster || "/placeholder.jpg"
      : media.poster || media.backdrop || "/placeholder.jpg";

  const href = `/tv/details/${media.id}`;

  return (
    <Link
      href={href}
      data-tv-row={row}
      data-tv-col={col}
      className={`tv-card ${variant} ${focused ? "focused" : ""}`}
      style={isUnavailable ? { opacity: 0.4, filter: "grayscale(100%)" } : {}}
    >
      {/* Poster Image */}
      <img
        src={imageSrc}
        alt={media.title}
        className="tv-card-img"
        loading="lazy"
      />

      {/* Dark Vignette Overlay */}
      <div className="tv-card-gradient" />

      {/* Offline Badge */}
      {isUnavailable && (
        <span
          className="tv-badge"
          style={{
            position: "absolute",
            top: "8px",
            left: "8px",
            background: "rgba(225, 29, 72, 0.85)",
            color: "#fff",
            zIndex: 4,
          }}
        >
          Offline
        </span>
      )}

      {/* Focused Center Play Highlight Icon */}
      {focused && !isUnavailable && (
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            width: 44,
            height: 44,
            borderRadius: "50%",
            backgroundColor: "#ffffff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 4px 16px rgba(0,0,0,0.8)",
            zIndex: 12,
          }}
        >
          <Play style={{ width: 18, height: 18, fill: "#000", color: "#000", marginLeft: 2 }} />
        </div>
      )}

      {/* Tag / Badge */}
      <div className="tv-card-tag">
        {isUnavailable ? (
          <span style={{ color: "#f87171" }}>Offline</span>
        ) : media.rating ? (
          <span style={{ color: "#fcd34d", display: "inline-flex", alignItems: "center" }}>
            <Star style={{ width: 10, height: 10, fill: "#f59e0b", color: "#f59e0b", marginRight: 3 }} />
            {media.rating.split("/")[0]}
          </span>
        ) : (
          <span>{media.year || (media.type === "show" ? "Series" : "Movie")}</span>
        )}
      </div>

      {/* Bottom Info Lockup */}
      <div className="tv-card-info">
        <p className="tv-card-title">{media.title}</p>
        <div className="tv-card-sub">
          {media.year && <span>{media.year}</span>}
          {media.type === "show" && media.season && (
            <span> • S{media.season}</span>
          )}
          {media.type === "movie" && media.runtime && (
            <span> • {media.runtime}m</span>
          )}
        </div>
      </div>

      {/* Watched Progress Bar */}
      {progressPercent > 0 && (
        <div className="tv-progress-bar">
          <div className="tv-progress-fill" style={{ width: `${progressPercent}%` }} />
        </div>
      )}
    </Link>
  );
}
