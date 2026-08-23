"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Image from "next/image";
import { Pencil } from "lucide-react";
import dynamic from "next/dynamic";

const ThumbnailEditor = dynamic(() => import("./ThumbnailEditor"), { ssr: false });

/**
 * EpisodeThumbnail — lazy-loads a unique per-episode thumbnail.
 *
 * Shows the fallback image while loading, then swaps in the unique thumbnail.
 * Includes a pencil edit button (visible on parent group hover) to manually choose a frame.
 */
export default function EpisodeThumbnail({
  mediaAssetId,
  fallbackSrc,
  alt,
  sizes,
  className,
  filepath,
  isAvailable,
}: {
  mediaAssetId: number;
  fallbackSrc: string;
  alt: string;
  sizes?: string;
  className?: string;
  filepath?: string;
  isAvailable?: boolean;
}) {
  const [thumbnailSrc, setThumbnailSrc] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [showEditor, setShowEditor] = useState(false);
  const fetchedRef = useRef(false);

  useEffect(() => {
    if (fetchedRef.current) return;
    fetchedRef.current = true;

    fetch(`/api/episode-thumbnail?id=${mediaAssetId}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.thumbnail) {
          setThumbnailSrc(data.thumbnail);
        }
      })
      .catch(() => {});
  }, [mediaAssetId]);

  const handleCapture = useCallback((newPath: string) => {
    setThumbnailSrc(newPath);
    setLoaded(false);
  }, []);

  const src = thumbnailSrc || fallbackSrc;

  return (
    <>
      {/* Thumbnail image */}
      <Image
        src={src}
        alt={alt}
        fill
        className={`${className || "object-cover"} transition-opacity duration-500 ${
          thumbnailSrc && !loaded ? "opacity-0" : "opacity-100"
        }`}
        sizes={sizes || "400px"}
        onLoad={() => setLoaded(true)}
        unoptimized={!!thumbnailSrc}
      />

      {/* Edit button — uses parent's `group` hover, sits above all overlays */}
      {isAvailable !== false && (
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setShowEditor(true);
          }}
          className="absolute top-2 left-2 z-[50] w-7 h-7 rounded-full bg-black/60 backdrop-blur-md border border-white/15 flex items-center justify-center text-white/50 hover:text-white hover:bg-violet-500/70 hover:border-violet-400/40 transition-all duration-200 opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto cursor-pointer"
          title="Change thumbnail"
        >
          <Pencil className="w-3 h-3" />
        </button>
      )}

      {/* Thumbnail Editor Modal */}
      <ThumbnailEditor
        mediaId={mediaAssetId}
        filepath={filepath || ""}
        isOpen={showEditor}
        onClose={() => setShowEditor(false)}
        onCapture={handleCapture}
      />
    </>
  );
}
