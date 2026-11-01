"use client";

import React, { useEffect, useRef } from "react";
import TVPosterCard from "./TVPosterCard";
import { useTVNavigation } from "./TVNavigationContext";
import type { MediaEntry } from "@/lib/db";

interface TVMediaRowProps {
  title: string;
  items: MediaEntry[];
  row: number;
  variant?: "poster" | "landscape";
  onFocusItem?: (item: MediaEntry) => void;
}

export default function TVMediaRow({
  title,
  items,
  row,
  variant = "poster",
  onFocusItem,
}: TVMediaRowProps) {
  const { registerRow, unregisterRow } = useTVNavigation();
  const trackRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    registerRow(row, items.length);
    return () => unregisterRow(row);
  }, [row, items.length, registerRow, unregisterRow]);

  if (items.length === 0) return null;

  return (
    <div className="tv-rail">
      {/* Row Header */}
      <div className="tv-rail-header">
        <h2 className="tv-rail-title">{title}</h2>
        <span className="tv-rail-count">{items.length}</span>
      </div>

      {/* Horizontal Rail Track */}
      <div ref={trackRef} className="tv-card-track">
        {items.map((item, colIdx) => (
          <TVPosterCard
            key={`${item.id}-${colIdx}`}
            media={item}
            row={row}
            col={colIdx}
            variant={variant}
            onFocus={() => onFocusItem && onFocusItem(item)}
          />
        ))}
      </div>
    </div>
  );
}
