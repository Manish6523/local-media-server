"use client";

import React, { useState } from "react";
import TVHeader from "./TVHeader";
import TVHeroBanner from "./TVHeroBanner";
import TVMediaRow from "./TVMediaRow";
import type { MediaEntry } from "@/lib/db";

interface TVHomeViewProps {
  continueWatching: MediaEntry[];
  movies: MediaEntry[];
  shows: MediaEntry[];
  featured: MediaEntry | null;
  activeFilter?: string;
}

export default function TVHomeView({
  continueWatching,
  movies,
  shows,
  featured,
  activeFilter,
}: TVHomeViewProps) {
  const [activeMedia, setActiveMedia] = useState<MediaEntry | null>(
    continueWatching[0] || featured || movies[0] || shows[0] || null
  );

  let nextRow = 2;
  const continueWatchingRow = continueWatching.length > 0 ? nextRow++ : -1;
  const moviesRow = (!activeFilter || activeFilter === "movie" || activeFilter === "all") && movies.length > 0 ? nextRow++ : -1;
  const showsRow = (!activeFilter || activeFilter === "show" || activeFilter === "all") && shows.length > 0 ? nextRow++ : -1;

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#0a0a0c", color: "#ffffff", paddingBottom: 60, overflowX: "hidden" }}>
      {/* Top TV Nav Header (Row 0) */}
      <TVHeader />

      {/* Atmospheric Hero Stage (Row 1) */}
      <TVHeroBanner media={activeMedia} row={1} />

      {/* Content Rails */}
      <div style={{ position: "relative", zIndex: 30, marginTop: -20 }}>
        {continueWatchingRow !== -1 && (
          <TVMediaRow
            title="Continue Watching"
            items={continueWatching}
            row={continueWatchingRow}
            variant="landscape"
            onFocusItem={setActiveMedia}
          />
        )}

        {moviesRow !== -1 && (
          <TVMediaRow
            title="Movies"
            items={movies}
            row={moviesRow}
            variant="poster"
            onFocusItem={setActiveMedia}
          />
        )}

        {showsRow !== -1 && (
          <TVMediaRow
            title="TV Series"
            items={shows}
            row={showsRow}
            variant="poster"
            onFocusItem={setActiveMedia}
          />
        )}
      </div>
    </div>
  );
}
