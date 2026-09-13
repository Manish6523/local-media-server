"use client";

import { useState, useEffect, useRef } from "react";
import { ChevronDown, Check, ArrowDown, ArrowUp, Filter } from "lucide-react";

export type SortOption = "rating_desc" | "rating_asc" | "year_desc" | "year_asc" | "added_desc" | "added_asc" | "title_desc" | "title_asc";

interface SortDropdownProps {
  pageKey: string;
  onSortChange: (sort: SortOption) => void;
}

const CATEGORIES = [
  { id: "rating", label: "Rating" },
  { id: "year", label: "Year" },
  { id: "added", label: "Recently Added" },
  { id: "title", label: "Alphabetical" }
];

const getSortLabel = (sort: SortOption) => {
  switch (sort) {
    case "rating_desc": return "↓ Rating (highest first)";
    case "rating_asc": return "↑ Rating (lowest first)";
    case "year_desc": return "↓ Year (newest first)";
    case "year_asc": return "↑ Year (oldest first)";
    case "added_desc": return "↓ Added (newest first)";
    case "added_asc": return "↑ Added (oldest first)";
    case "title_asc": return "↓ A-Z (Alphabetical)";
    case "title_desc": return "↑ Z-A (Alphabetical)";
    default: return "Sort";
  }
}

const getNextSort = (currentSort: SortOption, category: string): SortOption => {
  if (currentSort.startsWith(category)) {
    // Reverse it
    return currentSort.endsWith("_desc") ? `${category}_asc` as SortOption : `${category}_desc` as SortOption;
  }
  // Default for new category
  if (category === "title") return "title_asc";
  return `${category}_desc` as SortOption; // Default to desc for rating, year, added
}

export default function SortDropdown({ pageKey, onSortChange }: SortDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [currentSort, setCurrentSort] = useState<SortOption>("rating_desc");
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Load initial from localStorage
  useEffect(() => {
    const saved = localStorage.getItem(`vidlock_sort_${pageKey}`) as SortOption;
    if (saved) {
      setCurrentSort(saved);
      onSortChange(saved);
    } else {
      onSortChange("rating_desc");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageKey]);

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = (category: string) => {
    const nextSort = getNextSort(currentSort, category);
    setCurrentSort(nextSort);
    localStorage.setItem(`vidlock_sort_${pageKey}`, nextSort);
    onSortChange(nextSort);
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-center w-[42px] h-[42px] rounded-lg transition-all text-white/60 hover:text-white/90 hover:bg-white/[0.06] bg-white/[0.03] border border-white/[0.05] shadow-lg glass"
        aria-label="Sort"
      >
        <Filter className="w-4 h-4" />
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-56 bg-black/60 backdrop-blur-2xl border glass-md shadow-2xl shadow-black/40 p-2 rounded-xl z-50 animate-in fade-in slide-in-from-top-2 duration-200 ">
          <div className="flex flex-col gap-1">
            {CATEGORIES.map((cat) => {
              const isActive = currentSort.startsWith(cat.id);
              return (
                <button
                  key={cat.id}
                  onClick={() => handleSelect(cat.id)}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium text-left transition-all cursor-pointer ${
                    isActive
                      ? "text-white bg-white/[0.08]"
                      : "text-white/70 hover:text-white hover:bg-white/[0.08]"
                  }`}
                >
                  <span className="flex items-center gap-2">
                    {cat.label}
                    {isActive && (
                      currentSort.endsWith("_desc") ? <ArrowDown className="w-3.5 h-3.5 text-white/50" /> : <ArrowUp className="w-3.5 h-3.5 text-white/50" />
                    )}
                  </span>
                  {isActive && <Check className="w-4 h-4 text-violet-400" />}
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  );
}
