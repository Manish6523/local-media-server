"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Play, ArrowLeft, Star, Clock, Tv, Film, HardDrive } from "lucide-react";
import { useTVNavigation } from "@/components/TV/TVNavigationContext";
import type { MediaEntry } from "@/lib/db";

interface TVDetailsClientProps {
  media: MediaEntry;
  episodes: MediaEntry[];
}

export default function TVDetailsClient({ media, episodes }: TVDetailsClientProps) {
  const router = useRouter();
  const { isFocused, registerRow, unregisterRow } = useTVNavigation();

  const isShow = media.type === "show";
  const seasons = isShow
    ? Array.from(new Set(episodes.map((e) => e.season ?? 1))).sort((a, b) => a - b)
    : [];

  const [activeSeason, setActiveSeason] = useState<number>(seasons[0] ?? 1);

  const seasonEpisodes = isShow
    ? episodes.filter((e) => (e.season ?? 1) === activeSeason)
    : [];

  const inProgressEp = isShow
    ? episodes.find((e) => (e.watch_progress ?? 0) > 0 && !(e.is_watched ?? 0) && e.available)
    : null;
  const firstEp = isShow ? inProgressEp || seasonEpisodes[0] || episodes[0] : null;

  const youtubeUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(
    `${media.title} trailer`
  )}`;

  useEffect(() => {
    registerRow(0, 1);
    registerRow(1, 2);
    if (isShow && seasons.length > 0) {
      registerRow(2, seasons.length);
    }
    if (isShow && seasonEpisodes.length > 0) {
      registerRow(3, seasonEpisodes.length);
    }

    return () => {
      unregisterRow(0);
      unregisterRow(1);
      unregisterRow(2);
      unregisterRow(3);
    };
  }, [isShow, seasons.length, seasonEpisodes.length, registerRow, unregisterRow]);

  const backFocused = isFocused(0, 0);
  const playFocused = isFocused(1, 0);
  const trailerFocused = isFocused(1, 1);

  const backdropSrc = media.backdrop || media.poster || "/placeholder.jpg";
  const targetPlayId = isShow ? firstEp?.id || media.id : media.id;

  return (
    <div className="tv-detail-page">
      {/* Background Image */}
      <div
        className="tv-hero-backdrop"
        style={{
          backgroundImage: `url("${backdropSrc}")`,
          opacity: 0.35,
          position: "fixed",
          zIndex: 0,
        }}
      />
      <div className="tv-hero-gradient" style={{ position: "fixed", zIndex: 1 }} />

      {/* Top Header Bar (Row 0) */}
      <header style={{ position: "relative", zIndex: 20, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <button
          onClick={() => router.back()}
          data-tv-row={0}
          data-tv-col={0}
          className={`tv-btn tv-btn-secondary ${backFocused ? "focused" : ""}`}
          style={{ padding: "8px 22px" }}
        >
          <ArrowLeft style={{ width: 16, height: 16, marginRight: 8 }} />
          <span>Back</span>
        </button>

        <div style={{ color: "rgba(255,255,255,0.4)", fontSize: 13, fontWeight: 700, textTransform: "uppercase", letterSpacing: 2 }}>
          <span>{isShow ? "TV Series" : "Movie"}</span>
          <span style={{ margin: "0 8px" }}>•</span>
          <span style={{ color: "rgba(255,255,255,0.8)" }}>{media.title}</span>
        </div>
      </header>

      {/* Middle Stage: Title + Metadata + Actions (Row 1) */}
      <div className="tv-detail-content">
        {/* Metadata Pill */}
        <div className="tv-hero-meta">
          <span className="tv-badge">
            {media.available ? "Ready" : "Offline"}
          </span>
          {media.rating && (
            <span style={{ color: "#fcd34d", fontWeight: "bold", marginRight: 8, display: "inline-flex", alignItems: "center" }}>
              <Star style={{ width: 14, height: 14, fill: "#f59e0b", color: "#f59e0b", marginRight: 4 }} />
              {media.rating}
            </span>
          )}
          {media.year && <span style={{ marginRight: 8 }}>• {media.year}</span>}
          {!isShow && media.runtime && (
            <span style={{ marginRight: 8, display: "inline-flex", alignItems: "center" }}>
              <Clock style={{ width: 12, height: 12, marginRight: 4, color: "rgba(255,255,255,0.4)" }} />
              {media.runtime}m
            </span>
          )}
          {isShow && seasons.length > 0 && (
            <span style={{ marginRight: 8, display: "inline-flex", alignItems: "center" }}>
              <Tv style={{ width: 12, height: 12, marginRight: 4, color: "rgba(255,255,255,0.4)" }} />
              {seasons.length} {seasons.length === 1 ? "Season" : "Seasons"}
            </span>
          )}
          {media.genres && (
            <span style={{ color: "rgba(255,255,255,0.4)" }}>
              • {media.genres.split(",").slice(0, 3).join(" · ")}
            </span>
          )}
        </div>

        {/* Grand Title */}
        <h1 className="tv-detail-title">{media.title}</h1>

        {/* Overview */}
        {media.overview && (
          <p className="tv-detail-overview">{media.overview}</p>
        )}

        {/* Actions (Row 1) */}
        <div className="tv-btn-row">
          {!media.available ? (
            <div className="tv-btn tv-btn-secondary" style={{ opacity: 0.5, cursor: "not-allowed" }}>
              <HardDrive style={{ width: 16, height: 16, marginRight: 8 }} />
              <span>Drive Offline</span>
            </div>
          ) : (
            <Link
              href={`/tv/play/${targetPlayId}`}
              data-tv-row={1}
              data-tv-col={0}
              className={`tv-btn tv-btn-primary ${playFocused ? "focused" : ""}`}
            >
              <Play style={{ width: 16, height: 16, fill: "#000", color: "#000", marginRight: 8 }} />
              <span>
                {isShow
                  ? inProgressEp
                    ? `Resume S${inProgressEp.season}:E${inProgressEp.episode_start}`
                    : `Play S${firstEp?.season || 1}:E${firstEp?.episode_start || 1}`
                  : media.watch_progress
                  ? "Resume Movie"
                  : "Play Movie"}
              </span>
            </Link>
          )}

          <a
            href={youtubeUrl}
            target="_blank"
            rel="noopener noreferrer"
            data-tv-row={1}
            data-tv-col={1}
            className={`tv-btn tv-btn-secondary ${trailerFocused ? "focused" : ""}`}
          >
            <Film style={{ width: 16, height: 16, marginRight: 8 }} />
            <span>Trailer</span>
          </a>
        </div>
      </div>

      {/* Shows Episode Browser (Row 2: Seasons, Row 3: Episodes) */}
      {isShow && (
        <div style={{ position: "relative", zIndex: 20, marginTop: 20 }}>
          {/* Season Selector (Row 2) */}
          {seasons.length > 1 && (
            <div style={{ display: "flex", gap: 10, overflowX: "auto", paddingBottom: 10 }}>
              {seasons.map((seasonNum, colIdx) => {
                const seasonFocused = isFocused(2, colIdx);
                const isSelected = activeSeason === seasonNum;
                return (
                  <button
                    key={seasonNum}
                    onClick={() => setActiveSeason(seasonNum)}
                    data-tv-row={2}
                    data-tv-col={colIdx}
                    className={`tv-nav-pill ${seasonFocused ? "focused" : ""} ${isSelected ? "active" : ""}`}
                    style={{ background: isSelected ? "#7c3aed" : "rgba(255,255,255,0.08)" }}
                  >
                    Season {seasonNum}
                  </button>
                );
              })}
            </div>
          )}

          {/* Episodes Horizontal Rail (Row 3) */}
          <div style={{ marginTop: 10 }}>
            <h3 style={{ fontSize: 13, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1.5, color: "rgba(255,255,255,0.5)", marginBottom: 12 }}>
              Season {activeSeason} Episodes ({seasonEpisodes.length})
            </h3>
            <div className="tv-card-track">
              {seasonEpisodes.map((ep, colIdx) => {
                const epFocused = isFocused(3, colIdx);
                const epProgress =
                  ep.watch_progress && ep.runtime
                    ? Math.min(100, (ep.watch_progress / (ep.runtime * 60)) * 100)
                    : 0;

                return (
                  <Link
                    key={ep.id}
                    href={`/tv/play/${ep.id}`}
                    data-tv-row={3}
                    data-tv-col={colIdx}
                    className={`tv-card landscape ${epFocused ? "focused" : ""}`}
                    style={!ep.available ? { opacity: 0.35, filter: "grayscale(100%)", pointerEvents: "none" } : {}}
                  >
                    <img
                      src={ep.backdrop || media.backdrop || media.poster || "/placeholder.jpg"}
                      alt={`Episode ${ep.episode_start}`}
                      className="tv-card-img"
                      loading="lazy"
                    />
                    <div className="tv-card-gradient" />

                    <div className="tv-card-tag">
                      <span>EP {ep.episode_start}</span>
                    </div>

                    <div className="tv-card-info">
                      <p className="tv-card-title">
                        {ep.episode_start}. {ep.title && ep.title !== media.title ? ep.title : `Episode ${ep.episode_start}`}
                      </p>
                      {ep.runtime && (
                        <p className="tv-card-sub">{ep.runtime} min</p>
                      )}
                    </div>

                    {epProgress > 0 && (
                      <div className="tv-progress-bar">
                        <div className="tv-progress-fill" style={{ width: `${epProgress}%` }} />
                      </div>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
