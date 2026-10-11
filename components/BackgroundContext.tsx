"use client";

import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from "react";

export type BgMode = "dynamic" | "custom" | "dark";

interface BackgroundContextType {
  bgImage: string | null;
  setBgImage: (url: string | null) => void;
  bgMode: BgMode;
  setBgMode: (mode: BgMode) => void;
  customWallpaper: string;
  setCustomWallpaper: (url: string) => void;
  bgDim: number;
  setBgDim: (dim: number) => void;
  bgBlur: number;
  setBgBlur: (blur: number) => void;
  saveBgConfig: (opts: { bgMode?: BgMode; customWallpaper?: string; bgDim?: number; bgBlur?: number }) => Promise<void>;
}

const BackgroundContext = createContext<BackgroundContextType | undefined>(undefined);

export function BackgroundProvider({ children }: { children: ReactNode }) {
  const [bgImage, setBgImage] = useState<string | null>(null);
  const [bgMode, setBgMode] = useState<BgMode>("dynamic");
  const [customWallpaper, setCustomWallpaper] = useState<string>("");
  const [bgDim, setBgDim] = useState<number>(65);
  const [bgBlur, setBgBlur] = useState<number>(24);

  // Load saved background preferences on mount
  useEffect(() => {
    fetch("/api/config")
      .then((res) => res.json())
      .then((data) => {
        if (data.bgMode) setBgMode(data.bgMode as BgMode);
        if (data.customWallpaper) setCustomWallpaper(data.customWallpaper);
        if (typeof data.bgDim === "number") setBgDim(data.bgDim);
        if (typeof data.bgBlur === "number") setBgBlur(data.bgBlur);
      })
      .catch((err) => console.error("Failed to load background config:", err));
  }, []);

  const saveBgConfig = useCallback(
    async (opts: { bgMode?: BgMode; customWallpaper?: string; bgDim?: number; bgBlur?: number }) => {
      if (opts.bgMode !== undefined) setBgMode(opts.bgMode);
      if (opts.customWallpaper !== undefined) setCustomWallpaper(opts.customWallpaper);
      if (opts.bgDim !== undefined) setBgDim(opts.bgDim);
      if (opts.bgBlur !== undefined) setBgBlur(opts.bgBlur);

      try {
        await fetch("/api/config", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(opts),
        });
      } catch (err) {
        console.error("Failed to save background config:", err);
      }
    },
    []
  );

  return (
    <BackgroundContext.Provider
      value={{
        bgImage,
        setBgImage,
        bgMode,
        setBgMode,
        customWallpaper,
        setCustomWallpaper,
        bgDim,
        setBgDim,
        bgBlur,
        setBgBlur,
        saveBgConfig,
      }}
    >
      {children}
    </BackgroundContext.Provider>
  );
}

export function useBackground() {
  const context = useContext(BackgroundContext);
  if (context === undefined) {
    throw new Error("useBackground must be used within a BackgroundProvider");
  }
  return context;
}
