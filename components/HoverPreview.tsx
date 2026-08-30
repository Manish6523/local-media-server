"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";

interface HoverPreviewProps {
  mediaId: number;
  runtime: number | null; // in minutes
  exactDuration?: number; // in seconds
  isHovered: boolean;
  clipDuration?: number; // in seconds, default 15
  randomStart?: boolean; // default false (uses 10m in)
  isOnline?: boolean;
}

export default function HoverPreview({ mediaId, runtime, exactDuration, isHovered, clipDuration = 15, randomStart = false, isOnline = false }: HoverPreviewProps) {
  const [shouldLoad, setShouldLoad] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [computedStartTime, setComputedStartTime] = useState(600);

  
  // Fixed starting point fallback
  const fallbackStartTime = 600;
  
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    
    if (isHovered) {
      // 500ms delay to prevent accidental loading on fast mouse swipes
      timeoutId = setTimeout(() => {
        const totalSeconds = exactDuration || (runtime ? runtime * 60 : 0);
        if (randomStart) {
          if (totalSeconds > clipDuration) {
            // Pick from the middle third of the video for more interesting content
            const middleStart = totalSeconds * 0.3;
            const middleEnd = totalSeconds * 0.7 - clipDuration;
            if (middleEnd > middleStart) {
              setComputedStartTime(middleStart + Math.random() * (middleEnd - middleStart));
            } else {
              setComputedStartTime(Math.random() * (totalSeconds - clipDuration));
            }
          } else {
             setComputedStartTime(0);
          }
        } else {
          if (totalSeconds > 0) {
            setComputedStartTime(Math.max(0, (totalSeconds / 3) - 1));
          } else {
            setComputedStartTime(fallbackStartTime);
          }
        }
        setShouldLoad(true);
      }, 500);
    } else {
      setShouldLoad(false);
      // We don't reset isPlaying here so that if they hover back, it resumes smoothly
    }
    
    return () => clearTimeout(timeoutId);
  }, [isHovered]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (shouldLoad) {
      // If the video hasn't been loaded yet (first hover), set the source
      if (!video.src || video.src === "") {
        video.src = `/api/stream?id=${mediaId}`;
      }
      
      // Play and resume from wherever it was paused
      const playPromise = video.play();
      if (playPromise !== undefined) {
        playPromise.catch(() => {
          // Ignore auto-play errors or abort errors
        });
      }
    } else {
      // Just pause the video. Do NOT clear the src!
      // This "stores" the downloaded buffer locally in the browser.
      // Next time they hover, it resumes instantly from this exact spot.
      video.pause();
    }
  }, [shouldLoad, mediaId]);

  // 15-second loop logic
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleTimeUpdate = () => {
      // If we've passed the clip duration, loop back to the start!
      if (video.currentTime >= computedStartTime + clipDuration) {
        video.currentTime = computedStartTime;
      }
      const pct = Math.max(0, Math.min(100, ((video.currentTime - computedStartTime) / clipDuration) * 100));
      setProgress(pct);
    };

    video.addEventListener("timeupdate", handleTimeUpdate);
    return () => video.removeEventListener("timeupdate", handleTimeUpdate);
  }, [shouldLoad, computedStartTime, clipDuration]);

  // If it's never been hovered, don't render anything to save DOM nodes
  if (isOnline || (!shouldLoad && (!videoRef.current || !videoRef.current.src))) return null;

  return (
    <div className={`absolute inset-0 z-10 overflow-hidden pointer-events-none rounded-[20px] transition-opacity duration-300 ${shouldLoad ? 'opacity-100 bg-[#111]' : 'opacity-0'}`}>
      {/* Loading Spinner */}
      {!isPlaying && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50 z-20">
          <Loader2 className="w-6 h-6 text-white/50 animate-spin" />
        </div>
      )}
      
      <video
        ref={videoRef}
        className={`w-full h-full object-cover transition-opacity duration-300 ${isPlaying ? 'opacity-100' : 'opacity-0'}`}
        autoPlay
        muted
        playsInline
        loop
        onPlay={() => setIsPlaying(true)}
        onLoadedMetadata={(e) => {
          const video = e.currentTarget;
          const totalSeconds = exactDuration || (runtime ? runtime * 60 : 0);
          if (totalSeconds === 0 && !randomStart && isFinite(video.duration) && video.duration > 0) {
            const exactStart = Math.max(0, (video.duration / 3) - 1);
            setComputedStartTime(exactStart);
            video.currentTime = exactStart;
          } else {
            video.currentTime = computedStartTime;
          }
        }}
      />

      {/* 15s Timeline */}
      {isPlaying && (
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/20 z-30">
          <div 
            className="h-full bg-violet-500 transition-all duration-100" 
            style={{ width: `${progress}%` }} 
          />
        </div>
      )}
    </div>
  );
}
