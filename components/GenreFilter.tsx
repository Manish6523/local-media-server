"use client";

import { useEffect, useState, useCallback } from "react";

interface GenreFilterProps {
  onFilterChange: (genres: string[]) => void;
  storageKey: string; // e.g., 'genre_filter_movies'
}

export default function GenreFilter({ onFilterChange, storageKey }: GenreFilterProps) {
  const [genres, setGenres] = useState<string[]>([]);
  const [active, setActive] = useState<string[]>([]);

  // Fetch genres
  useEffect(() => {
    fetch("/api/genres")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setGenres(data);
      })
      .catch(() => {});
  }, []);

  // Load persisted filter
  useEffect(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) setActive(parsed);
      }
    } catch {}
  }, [storageKey]);

  const toggle = useCallback(
    (genre: string) => {
      setActive((prev) => {
        const next = prev.includes(genre)
          ? prev.filter((g) => g !== genre)
          : [...prev, genre];

        // Persist
        try {
          localStorage.setItem(storageKey, JSON.stringify(next));
        } catch {}

        onFilterChange(next);
        return next;
      });
    },
    [onFilterChange, storageKey]
  );

  const clearAll = useCallback(() => {
    setActive([]);
    try {
      localStorage.removeItem(storageKey);
    } catch {}
    onFilterChange([]);
  }, [onFilterChange, storageKey]);

  if (genres.length === 0) return null;

  return (
    <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide pb-2">
      <button
        onClick={clearAll}
        className={`flex-shrink-0 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border transition-all ${
          active.length === 0
            ? "bg-[#E50914] text-white border-[#E50914]"
            : "bg-white/5 text-white/40 border-white/10 hover:border-[#E50914]/50 hover:text-white/70"
        }`}
      >
        All
      </button>
      {genres.map((genre) => (
        <button
          key={genre}
          onClick={() => toggle(genre)}
          className={`flex-shrink-0 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border transition-all ${
            active.includes(genre)
              ? "bg-[#E50914] text-white border-[#E50914]"
              : "bg-white/5 text-white/40 border-white/10 hover:border-[#E50914]/50 hover:text-white/70"
          }`}
        >
          {genre}
        </button>
      ))}
    </div>
  );
}
