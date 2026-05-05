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
      className={`p-1.5 rounded-full backdrop-blur-sm transition-all duration-300 ${
        isFavorite 
          ? "bg-black/50 text-[#E50914] hover:bg-black/70 hover:scale-110" 
          : "bg-black/20 text-white hover:bg-black/50 hover:scale-110 hover:text-[#E50914]"
      } ${isAnimating ? "scale-125" : ""} ${className}`}
      title={isFavorite ? "Remove from Favorites" : "Add to Favorites"}
    >
      <Heart
        className="w-5 h-5 transition-all duration-300"
        fill={isFavorite ? "currentColor" : "none"}
      />
    </button>
  );
}
