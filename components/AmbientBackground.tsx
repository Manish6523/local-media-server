"use client";

import { useBackground } from "@/components/BackgroundContext";
import { usePathname } from "next/navigation";

export default function AmbientBackground() {
  const { bgImage, bgMode, customWallpaper, bgDim, bgBlur } = useBackground();
  const pathname = usePathname();

  // If in video player, don't interfere
  if (pathname.startsWith("/player") || pathname.startsWith("/watch") || pathname.startsWith("/join")) {
    return null;
  }

  // Determine active background source
  let activeImage: string | null = null;
  if (bgMode === "custom") {
    activeImage = customWallpaper || null;
  } else if (bgMode === "dynamic") {
    activeImage = bgImage || null;
  }

  const dimRatio = Math.max(0.2, Math.min(0.95, (bgDim ?? 65) / 100));
  const blurPx = Math.max(0, Math.min(60, bgBlur ?? 24));

  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden transition-all duration-1000 ease-in-out">
      {/* Fallback deep dark canvas */}
      <div className="absolute inset-0 bg-[#08080a]" />

      {/* Ambient background wallpaper / backdrop with smooth crossfade */}
      {activeImage && (
        <div
          key={activeImage}
          className="absolute inset-0 bg-cover bg-center transition-all duration-1000 ease-in-out scale-105 animate-in fade-in duration-700"
          style={{
            backgroundImage: `url('${activeImage}')`,
            filter: `blur(${blurPx}px) saturate(130%)`,
            transform: "scale(1.08)", // Scale up slightly to prevent blur edges
          }}
        />
      )}

      {/* Dark tint overlay for crystal clear contrast & text readability */}
      <div
        className="absolute inset-0 transition-colors duration-500"
        style={{
          backgroundColor: `rgba(5, 5, 8, ${activeImage ? dimRatio : 0.98})`,
        }}
      />

      {/* Radial vignette — highlights the center and deepens the edges */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,rgba(0,0,0,0.75)_100%)]" />

      {/* Top navbar dark gradient fade */}
      <div className="absolute top-0 inset-x-0 h-40 bg-gradient-to-b from-black/80 via-black/30 to-transparent" />

      {/* Bottom fade */}
      <div className="absolute bottom-0 inset-x-0 h-32 bg-gradient-to-t from-black/90 to-transparent" />
    </div>
  );
}
