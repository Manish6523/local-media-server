"use client";

import { createContext, useContext, useState, ReactNode } from "react";

interface BackgroundContextType {
  bgImage: string | null;
  setBgImage: (url: string | null) => void;
}

const BackgroundContext = createContext<BackgroundContextType | undefined>(undefined);

export function BackgroundProvider({ children }: { children: ReactNode }) {
  const [bgImage, setBgImage] = useState<string | null>(null);

  return (
    <BackgroundContext.Provider value={{ bgImage, setBgImage }}>
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
