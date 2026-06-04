"use client";

import { useState } from "react";
import { Heart } from "lucide-react";

interface FavoriteButtonProps {
  mediaId: number;
  initialIsFavorite: boolean;
  className?: string;
  onToggle?: (newIsFavorite: boolean) => void;
}

export default function FavoriteButton({ mediaId, initialIsFavorite, className = "", onToggle }: FavoriteButtonProps) {
  const [isFavorite, setIsFavorite] = useState(initialIsFavorite);
  const [isAnimating, setIsAnimating] = useState(false);

  const handleClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const newState = !isFavorite;
    
    // Optimistic UI update
    setIsFavorite(newState);
    setIsAnimating(true);
    setTimeout(() => setIsAnimating(false), 300);

    if (onToggle) onToggle(newState);

    try {
      const res = await fetch("/api/toggle-favorite", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: mediaId, isFavorite: newState }),
      });
      if (!res.ok) throw new Error("Failed to toggle");
    } catch (error) {
      console.error("Favorite toggle failed:", error);
      // Revert on failure
      setIsFavorite(!newState);
      if (onToggle) onToggle(!newState);
    }
  };

  return (
    <button
      onClick={handleClick}
      className={`p-2 rounded-full backdrop-blur-md transition-all duration-300 ${
        isFavorite 
          ? "bg-violet-500/20 text-violet-400 border border-violet-500/30 shadow-[0_0_12px_rgba(139,92,246,0.2)] hover:bg-violet-500/30 hover:scale-110" 
          : "bg-white/10 text-white/60 border border-white/10 hover:text-violet-400 hover:bg-violet-500/10 hover:border-violet-500/20 hover:scale-110"
      } ${isAnimating ? "scale-125" : ""} ${className}`}
      title={isFavorite ? "Remove from Favorites" : "Add to Favorites"}
    >
      <Heart
        className="w-4 h-4 transition-all duration-300"
        fill={isFavorite ? "currentColor" : "none"}
      />
    </button>
  );
}
