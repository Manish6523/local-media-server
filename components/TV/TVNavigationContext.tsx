"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";

interface TVNavigationContextType {
  activeRow: number;
  activeCol: number;
  setActiveCoords: (row: number, col: number) => void;
  isFocused: (row: number, col: number) => boolean;
  registerRow: (row: number, colCount: number) => void;
  unregisterRow: (row: number) => void;
}

const TVNavigationContext = createContext<TVNavigationContextType | null>(null);

export function TVNavigationProvider({ children }: { children: React.ReactNode }) {
  const [activeRow, setActiveRow] = useState<number>(0);
  const [activeCol, setActiveCol] = useState<number>(0);
  const rowLimitsRef = useRef<Map<number, number>>(new Map());
  const router = useRouter();

  const registerRow = useCallback((row: number, colCount: number) => {
    rowLimitsRef.current.set(row, colCount);
  }, []);

  const unregisterRow = useCallback((row: number) => {
    rowLimitsRef.current.delete(row);
  }, []);

  const setActiveCoords = useCallback((row: number, col: number) => {
    setActiveRow(row);
    setActiveCol(col);
  }, []);

  const isFocused = useCallback(
    (row: number, col: number) => activeRow === row && activeCol === col,
    [activeRow, activeCol]
  );

  // Keyboard and TV Remote D-pad Listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key;
      const keyCode = e.keyCode;

      // TV Back Keys (Escape, Backspace, webOS Back keyCode 461, XF86Back)
      if (key === "Escape" || key === "Backspace" || key === "XF86Back" || keyCode === 461) {
        // If not on row 0, first jump back to top navigation
        if (activeRow > 0) {
          e.preventDefault();
          setActiveRow(0);
          setActiveCol(0);
          return;
        }
        // If already on top row or on a subpage, go back
        if (typeof window !== "undefined" && window.location.pathname !== "/tv") {
          e.preventDefault();
          router.back();
          return;
        }
      }

      // Arrow Down
      if (key === "ArrowDown") {
        e.preventDefault();
        const availableRows = Array.from(rowLimitsRef.current.keys()).sort((a, b) => a - b);
        const nextRows = availableRows.filter((r) => r > activeRow);
        if (nextRows.length > 0) {
          const nextRow = nextRows[0];
          const maxCols = rowLimitsRef.current.get(nextRow) || 1;
          const nextCol = Math.min(activeCol, maxCols - 1);
          setActiveRow(nextRow);
          setActiveCol(Math.max(0, nextCol));
        }
        return;
      }

      // Arrow Up
      if (key === "ArrowUp") {
        e.preventDefault();
        const availableRows = Array.from(rowLimitsRef.current.keys()).sort((a, b) => a - b);
        const prevRows = availableRows.filter((r) => r < activeRow);
        if (prevRows.length > 0) {
          const prevRow = prevRows[prevRows.length - 1];
          const maxCols = rowLimitsRef.current.get(prevRow) || 1;
          const nextCol = Math.min(activeCol, maxCols - 1);
          setActiveRow(prevRow);
          setActiveCol(Math.max(0, nextCol));
        }
        return;
      }

      // Arrow Left
      if (key === "ArrowLeft") {
        e.preventDefault();
        if (activeCol > 0) {
          setActiveCol((prev) => prev - 1);
        }
        return;
      }

      // Arrow Right
      if (key === "ArrowRight") {
        e.preventDefault();
        const maxCols = rowLimitsRef.current.get(activeRow) || 1;
        if (activeCol < maxCols - 1) {
          setActiveCol((prev) => prev + 1);
        }
        return;
      }

      // Select / Enter / OK
      if (key === "Enter" || key === " " || keyCode === 13) {
        const activeEl = document.querySelector<HTMLElement>(
          `[data-tv-row="${activeRow}"][data-tv-col="${activeCol}"]`
        );
        if (activeEl) {
          e.preventDefault();
          activeEl.click();
        }
        return;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeRow, activeCol, router]);

  // Smooth auto-scroll focused item into view
  useEffect(() => {
    const activeEl = document.querySelector<HTMLElement>(
      `[data-tv-row="${activeRow}"][data-tv-col="${activeCol}"]`
    );
    if (activeEl) {
      activeEl.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
        inline: "center",
      });
    }
  }, [activeRow, activeCol]);

  return (
    <TVNavigationContext.Provider
      value={{
        activeRow,
        activeCol,
        setActiveCoords,
        isFocused,
        registerRow,
        unregisterRow,
      }}
    >
      {children}
    </TVNavigationContext.Provider>
  );
}

export function useTVNavigation() {
  const context = useContext(TVNavigationContext);
  if (!context) {
    throw new Error("useTVNavigation must be used within a TVNavigationProvider");
  }
  return context;
}

