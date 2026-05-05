"use client";

import { useState, useEffect, useRef } from "react";
import { ChevronDown, Check } from "lucide-react";

export type SortOption = "rating_desc" | "year_desc" | "year_asc" | "added_desc" | "title_asc";

interface SortDropdownProps {
  pageKey: string;
  onSortChange: (sort: SortOption) => void;
}

const SORT_LABELS: Record<SortOption, string> = {
  "rating_desc": "↓ Rating (highest first)",
  "year_desc": "↓ Year (newest first)",
  "year_asc": "↑ Year (oldest first)",
  "added_desc": "Recently Added (newest)",
  "title_asc": "A-Z (Alphabetical)",
};

export default function SortDropdown({ pageKey, onSortChange }: SortDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [currentSort, setCurrentSort] = useState<SortOption>("rating_desc");
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Load initial from localStorage
  useEffect(() => {
    const saved = localStorage.getItem(`vidlock_sort_${pageKey}`) as SortOption;
    if (saved && Object.keys(SORT_LABELS).includes(saved)) {
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

  const handleSelect = (option: SortOption) => {
    setCurrentSort(option);
    localStorage.setItem(`vidlock_sort_${pageKey}`, option);
    onSortChange(option);
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 bg-[#111] hover:bg-[#1a1a1a] border border-white/10 px-4 py-2 rounded text-sm text-white/90 transition-colors"
      >
        <span className="text-white/50">Sort by:</span>
        <span className="font-medium min-w-[140px] text-left">{SORT_LABELS[currentSort]}</span>
        <ChevronDown className={`w-4 h-4 text-white/50 transition-transform ${isOpen ? "rotate-180" : ""}`} />
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-56 bg-[#161616] border border-white/10 rounded-lg shadow-2xl py-1 z-50 animate-in fade-in zoom-in-95 duration-150">
          {(Object.entries(SORT_LABELS) as [SortOption, string][]).map(([key, label]) => (
            <button
              key={key}
              onClick={() => handleSelect(key)}
              className="w-full flex items-center justify-between px-4 py-2.5 text-sm text-left hover:bg-white/10 transition-colors"
            >
              <span className={currentSort === key ? "text-white font-medium" : "text-white/70"}>
                {label}
              </span>
              {currentSort === key && <Check className="w-4 h-4 text-[#E50914]" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
