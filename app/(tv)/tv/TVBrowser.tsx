"use client";

import { useState, useEffect, useCallback } from "react";

interface MediaItem {
  id: number;
  type: string;
  title: string;
  year: number | null;
  season: number | null;
  episode_start: number | null;
  episode_end: number | null;
  poster: string | null;
  genres: string | null;
}

interface TVBrowserProps {
  movies: MediaItem[];
  shows: MediaItem[];
  allCount: number;
  activeFilter: string;
}

var COLS_PER_ROW = 6;

/* ---- Row layout ----
   Row 0 = nav bar (3 items: All, Movies, Shows)
   Row 1+ = content cards (movies first, then shows)
*/

function getPosterSrc(item: MediaItem): string {
  if (item.poster && item.poster.length > 0) {
    return item.poster;
  }
  return "";
}

function getTypeLabel(type: string): string {
  if (type === "movie") {
    return "Movie";
  }
  return "Show";
}

function formatEpisodeInfo(item: MediaItem): string {
  if (item.type !== "show") {
    return "";
  }
  var parts: string[] = [];
  if (item.season !== null && item.season !== undefined) {
    parts.push("S" + String(item.season).padStart(2, "0"));
  }
  if (item.episode_start !== null && item.episode_start !== undefined) {
    parts.push("E" + String(item.episode_start).padStart(2, "0"));
    if (
      item.episode_end !== null &&
      item.episode_end !== undefined &&
      item.episode_end !== item.episode_start
    ) {
      parts.push("-E" + String(item.episode_end).padStart(2, "0"));
    }
  }
  return parts.join("");
}

export default function TVBrowser(props: TVBrowserProps) {
  var movies = props.movies;
  var shows = props.shows;
  var allCount = props.allCount;
  var activeFilter = props.activeFilter;

  // Merge all cards into a single flat list for grid indexing
  var allCards: MediaItem[] = [];
  var i;
  for (i = 0; i < movies.length; i++) {
    allCards.push(movies[i]);
  }
  for (i = 0; i < shows.length; i++) {
    allCards.push(shows[i]);
  }

  // Calculate total content rows
  var totalContentRows = Math.ceil(allCards.length / COLS_PER_ROW);
  // Row 0 = nav, rows 1..N = content
  var totalRows = 1 + totalContentRows;
  var navCols = 3; // All, Movies, Shows

  var _state = useState({ row: 0, col: 0 });
  var focusPos = _state[0];
  var setFocusPos = _state[1];

  // Clamp focus position to valid range
  var clamp = useCallback(function clampFn(pos: { row: number; col: number }) {
    var r = pos.row;
    var c = pos.col;
    if (r < 0) { r = 0; }
    if (r >= totalRows) { r = totalRows - 1; }
    if (r === 0) {
      // Nav row
      if (c < 0) { c = 0; }
      if (c >= navCols) { c = navCols - 1; }
    } else {
      // Content rows
      var contentRow = r - 1;
      var startIdx = contentRow * COLS_PER_ROW;
      var endIdx = Math.min(startIdx + COLS_PER_ROW, allCards.length);
      var maxCol = endIdx - startIdx - 1;
      if (maxCol < 0) {
        // Empty row, go back up
        r = r - 1;
        if (r === 0) {
          if (c >= navCols) { c = navCols - 1; }
        }
      } else {
        if (c < 0) { c = 0; }
        if (c > maxCol) { c = maxCol; }
      }
    }
    return { row: r, col: c };
  }, [totalRows, navCols, allCards.length]);

  // Keyboard handler
  useEffect(function setupKeyboard() {
    function handleKeyDown(e: KeyboardEvent) {
      var key = e.key;
      if (key === "ArrowRight") {
        e.preventDefault();
        setFocusPos(function (prev) {
          return clamp({ row: prev.row, col: prev.col + 1 });
        });
      } else if (key === "ArrowLeft") {
        e.preventDefault();
        setFocusPos(function (prev) {
          return clamp({ row: prev.row, col: prev.col - 1 });
        });
      } else if (key === "ArrowDown") {
        e.preventDefault();
        setFocusPos(function (prev) {
          return clamp({ row: prev.row + 1, col: prev.col });
        });
      } else if (key === "ArrowUp") {
        e.preventDefault();
        setFocusPos(function (prev) {
          return clamp({ row: prev.row - 1, col: prev.col });
        });
      } else if (key === "Enter") {
        e.preventDefault();
        var el = document.querySelector(
          '[data-row="' + focusPos.row + '"][data-col="' + focusPos.col + '"]'
        );
        if (el) {
          var link = el.querySelector("a");
          if (link) {
            link.click();
          } else if (el.tagName === "A") {
            (el as HTMLAnchorElement).click();
          }
        }
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return function cleanup() {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [focusPos, clamp]);

  // Apply focused class + scrollIntoView
  useEffect(function applyFocus() {
    // Remove all existing focus classes
    var focused = document.querySelectorAll(".focused");
    var k;
    for (k = 0; k < focused.length; k++) {
      focused[k].classList.remove("focused");
    }

    // Apply focus to the current element
    var el = document.querySelector(
      '[data-row="' + focusPos.row + '"][data-col="' + focusPos.col + '"]'
    );
    if (el) {
      el.classList.add("focused");
      el.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }
  }, [focusPos]);

  // Render a card
  function renderCard(item: MediaItem, gridIndex: number) {
    var contentRow = Math.floor(gridIndex / COLS_PER_ROW) + 1; // +1 because row 0 is nav
    var contentCol = gridIndex % COLS_PER_ROW;
    var posterSrc = getPosterSrc(item);
    var episodeInfo = formatEpisodeInfo(item);

    return (
      <div
        key={item.id}
        className="card"
        data-row={contentRow}
        data-col={contentCol}
      >
        <a href={"/tv/play/" + item.id}>
          <div className="card-poster-wrap">
            {posterSrc ? (
              <img
                src={posterSrc}
                alt={item.title || "Poster"}
                loading="lazy"
              />
            ) : (
              <div className="card-no-poster">&#127910;</div>
            )}
          </div>
          <div className="card-title">{item.title || "Untitled"}</div>
          {item.year ? (
            <div className="card-year">{String(item.year)}</div>
          ) : null}
          {item.type === "show" && episodeInfo ? (
            <div className="card-year">{episodeInfo}</div>
          ) : null}
          <span className="card-type">{getTypeLabel(item.type)}</span>
        </a>
      </div>
    );
  }

  // Build a running index counter across movies + shows for grid positions
  var cardIndex = 0;

  return (
    <div className="container">
      {/* Filter tabs — row 0 */}
      <div className="tv-filters">
        <a
          href="/tv"
          className={
            "tv-filter-btn nav-link" +
            (activeFilter === "all" ? " tv-filter-btn-active" : "")
          }
          data-row="0"
          data-col="0"
        >
          All
        </a>
        <a
          href="/tv?type=movie"
          className={
            "tv-filter-btn nav-link" +
            (activeFilter === "movie" ? " tv-filter-btn-active" : "")
          }
          data-row="0"
          data-col="1"
        >
          Movies
        </a>
        <a
          href="/tv?type=show"
          className={
            "tv-filter-btn nav-link" +
            (activeFilter === "show" ? " tv-filter-btn-active" : "")
          }
          data-row="0"
          data-col="2"
        >
          Shows
        </a>
      </div>

      <div className="tv-count">
        {allCount + " title" + (allCount !== 1 ? "s" : "")}
      </div>

      {allCards.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">&#127916;</div>
          <div className="empty-state-text">No media found</div>
        </div>
      ) : null}

      {/* Movies section */}
      {movies.length > 0 ? (
        <div>
          <div className="section-title">Movies</div>
          <div className="row clearfix">
            {movies.map(function (item) {
              var idx = cardIndex;
              cardIndex = cardIndex + 1;
              return renderCard(item, idx);
            })}
          </div>
        </div>
      ) : null}

      {/* Shows section */}
      {shows.length > 0 ? (
        <div>
          <div className="section-title">TV Shows</div>
          <div className="row clearfix">
            {shows.map(function (item) {
              var idx = cardIndex;
              cardIndex = cardIndex + 1;
              return renderCard(item, idx);
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}
