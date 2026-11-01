"use client";

import { useEffect, useRef, useState } from "react";
import { Image as ImageIcon, Film, Loader2 } from "lucide-react";

interface AutoTrailerInlineProps {
  mediaId: number;
  exactDuration: number;
  isMini?: boolean;
  isOnline?: boolean;
  isVideoHidden?: boolean;
  onToggleVideoHidden?: (hidden: boolean) => void;
  hideToggle?: boolean;
  toggleClassName?: string;
}

export default function AutoTrailerInline({
  mediaId,
  exactDuration,
  isMini = false,
  isOnline = false,
  isVideoHidden: controlledHidden,
  onToggleVideoHidden,
  hideToggle = false,
  toggleClassName,
}: AutoTrailerInlineProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [clips, setClips] = useState<number[]>([]);
  const [currentClipIndex, setCurrentClipIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [error, setError] = useState(false);
  const [internalHidden, setInternalHidden] = useState(false);
  const [trailerFinished, setTrailerFinished] = useState(false);

  const isVideoHidden = controlledHidden !== undefined ? controlledHidden : internalHidden;

  const toggleVideoHidden = (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    const nextHidden = !isVideoHidden;
    if (controlledHidden === undefined) {
      setInternalHidden(nextHidden);
    }
    onToggleVideoHidden?.(nextHidden);

    if (videoRef.current) {
      if (nextHidden) {
        videoRef.current.pause();
      } else {
        const p = videoRef.current.play();
        if (p !== undefined) {
          p.catch(() => {});
        }
      }
    }
  };

  // Sync video play/pause when controlled isVideoHidden changes
  useEffect(() => {
    if (!videoRef.current || loading || trailerFinished) return;
    if (isVideoHidden) {
      videoRef.current.pause();
    } else {
      const p = videoRef.current.play();
      if (p !== undefined) p.catch(() => {});
    }
  }, [isVideoHidden, loading, trailerFinished]);

  // Constants
  const numClips = 3;
  const clipDuration = 30; // seconds

  const createClipsFromDuration = (duration: number) => {
    if (!duration || duration < clipDuration * numClips) {
      return [0];
    }

    // Avoid first 8% (intros/logos) and last 10% (credits)
    const minTime = duration * 0.08;
    const maxTime = duration * 0.90;
    const validDuration = maxTime - minTime;

    const newClips: number[] = [];
    const segmentSize = validDuration / numClips;

    for (let i = 0; i < numClips; i++) {
      const segmentStart = minTime + i * segmentSize;
      const maxOffset = Math.max(0, segmentSize - clipDuration);
      const randomOffset = Math.random() * maxOffset;
      newClips.push(segmentStart + randomOffset);
    }

    return newClips;
  };

  useEffect(() => {
    // Generate initial timestamps from exactDuration or fallback
    const effectiveDuration = exactDuration > 0 ? exactDuration : 1440; // Default ~24min if unknown
    const newClips = createClipsFromDuration(effectiveDuration);
    setClips(newClips);
    setCurrentClipIndex(0);
  }, [exactDuration]);

  // Load video source
  useEffect(() => {
    if (clips.length === 0 || !videoRef.current || trailerFinished) return;

    const video = videoRef.current;
    const streamUrl = `/api/stream?id=${mediaId}`;

    const seekToInitialClip = (targetTime: number) => {
      if (targetTime > 0 && Math.abs(video.currentTime - targetTime) > 1.5) {
        try {
          video.currentTime = targetTime;
        } catch {}
      }
    };

    const handleCanPlay = () => {
      setLoading(false);
      seekToInitialClip(clips[0]);
      const playPromise = video.play();
      if (playPromise !== undefined) {
        playPromise.catch(() => {
          // Ignore auto-play errors or abort errors
        });
      }
    };

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);

    const handleLoadedMetadata = () => {
      // If native duration is discovered and differs from DB duration, recalculate clips dynamically
      if (video.duration && isFinite(video.duration) && video.duration > clipDuration * numClips) {
        if (!exactDuration || Math.abs(video.duration - exactDuration) > 120) {
          const dynamicClips = createClipsFromDuration(video.duration);
          setClips(dynamicClips);
          setCurrentClipIndex(0);
          seekToInitialClip(dynamicClips[0]);
          return;
        }
      }
      seekToInitialClip(clips[0]);
    };

    video.addEventListener("canplay", handleCanPlay);
    video.addEventListener("play", handlePlay);
    video.addEventListener("pause", handlePause);
    video.addEventListener("loadedmetadata", handleLoadedMetadata);

    video.src = `${streamUrl}#t=${clips[0]}`;

    return () => {
      video.removeEventListener("canplay", handleCanPlay);
      video.removeEventListener("play", handlePlay);
      video.removeEventListener("pause", handlePause);
      video.removeEventListener("loadedmetadata", handleLoadedMetadata);
    };
  }, [clips, mediaId, trailerFinished, exactDuration]);

  // Time update listener for auto-skipping
  useEffect(() => {
    if (clips.length === 0 || !videoRef.current || trailerFinished) return;

    const video = videoRef.current;

    const handleTimeUpdate = () => {
      const currentClipStart = clips[currentClipIndex];
      const elapsedInClip = video.currentTime - currentClipStart;

      // If we've played 30 seconds of this clip
      if (elapsedInClip >= clipDuration) {
        const nextIndex = currentClipIndex + 1;
        
        if (nextIndex < clips.length) {
          // Jump to next clip
          setLoading(true);
          setCurrentClipIndex(nextIndex);
          video.currentTime = clips[nextIndex];
        } else {
          // Trailer finished
          setTrailerFinished(true);
          video.pause();
        }
      }
    };

    video.addEventListener("timeupdate", handleTimeUpdate);
    video.addEventListener("error", () => setError(true));

    return () => {
      video.removeEventListener("timeupdate", handleTimeUpdate);
      video.removeEventListener("error", () => setError(true));
    };
  }, [clips, currentClipIndex, trailerFinished]);

  if (isOnline || error || trailerFinished) return null;

  return (
    <div className={isMini ? "relative w-full aspect-video rounded-xl overflow-hidden border border-white/10 shadow-xl shadow-black/50 bg-zinc-900 group" : "absolute inset-0 z-0 overflow-hidden"}>
      {/* Video Element */}
      <video
        ref={videoRef}
        className={`w-full h-full object-cover transition-opacity duration-1000 ${isPlaying && !isVideoHidden ? 'opacity-100' : 'opacity-0'}`}
        playsInline
        autoPlay
        muted={true}
        controls={false}
      />

      {!isMini && (
        /* We don't need additional vignette overlays for background mode since the movie page gradients are rendered on top of us */
        null
      )}

      {isMini && (
        <div className="absolute inset-x-0 bottom-0 p-4 bg-gradient-to-t from-black/80 to-transparent flex items-end justify-between opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          <div className="text-xs font-bold text-white tracking-widest uppercase">Auto-Trailer</div>
        </div>
      )}

      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50">
          <Loader2 className="w-8 h-8 text-white/50 animate-spin" />
        </div>
      )}

      {/* Visibility Toggle */}
      {!hideToggle && (
        <div
          className={
            toggleClassName ||
            (isMini
              ? "absolute bottom-3 right-3 z-[60] opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-auto"
              : "absolute top-24 right-5 md:right-10 lg:right-14 z-[60] pointer-events-auto")
          }
        >
          <button
            onClick={toggleVideoHidden}
            className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-black/60 backdrop-blur-md border border-white/15 flex items-center justify-center text-white/80 hover:text-white hover:bg-white/20 transition-all cursor-pointer shadow-lg pointer-events-auto"
            title={isVideoHidden ? "Show Trailer" : "Show Static Image"}
          >
            {isVideoHidden ? <Film className="w-4 h-4 md:w-5 md:h-5" /> : <ImageIcon className="w-4 h-4 md:w-5 md:h-5" />}
          </button>
        </div>
      )}
    </div>
  );
}
