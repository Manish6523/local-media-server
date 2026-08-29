"use client";

import { useEffect, useRef, useState } from "react";
import { X, Play, Loader2 } from "lucide-react";
import Hls from "hls.js";

interface AutoTrailerModalProps {
  isOpen: boolean;
  onClose: () => void;
  mediaId: number;
  exactDuration: number;
}

export default function AutoTrailerModal({
  isOpen,
  onClose,
  mediaId,
  exactDuration,
}: AutoTrailerModalProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [clips, setClips] = useState<number[]>([]);
  const [currentClipIndex, setCurrentClipIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  // Using requestAnimationFrame to smoothly update progress
  const [progress, setProgress] = useState(0);
  const rafRef = useRef<number | null>(null);

  // Constants
  const numClips = 5;
  const clipDuration = 30; // seconds

  useEffect(() => {
    if (!isOpen) {
      setClips([]);
      setCurrentClipIndex(0);
      setIsPlaying(false);
      setLoading(true);
      setError(false);
      setProgress(0);
      
      if (videoRef.current) {
        videoRef.current.pause();
        videoRef.current.src = "";
      }
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      return;
    }

    // Generate random timestamps
    const generateClips = () => {
      // If movie is very short, just start from 0 and don't skip
      if (exactDuration < clipDuration * numClips) {
        setClips([0]);
        return;
      }

      // Avoid first 5% (logos) and last 10% (credits)
      const minTime = exactDuration * 0.05;
      const maxTime = exactDuration * 0.90;
      const validDuration = maxTime - minTime;

      const newClips: number[] = [];
      // Divide the valid duration into 'numClips' segments to spread them out
      const segmentSize = validDuration / numClips;

      for (let i = 0; i < numClips; i++) {
        const segmentStart = minTime + i * segmentSize;
        const maxOffset = Math.max(0, segmentSize - clipDuration);
        const randomOffset = Math.random() * maxOffset;
        newClips.push(segmentStart + randomOffset);
      }

      setClips(newClips);
      setCurrentClipIndex(0);
    };

    generateClips();

  }, [isOpen, exactDuration]);

  // Load video source
  useEffect(() => {
    if (!isOpen || clips.length === 0 || !videoRef.current) return;

    const video = videoRef.current;
    const streamUrl = `/api/stream?id=${mediaId}`;

    const handleCanPlay = () => {
      setLoading(false);
      video.play().catch((e) => {
        console.error("Auto-play failed:", e);
      });
    };

    video.addEventListener("canplay", handleCanPlay);

    // Use HLS.js for Safari/iOS compatibility if needed, though direct stream usually works for local mp4
    video.src = streamUrl;
    
    // Jump to the first clip
    video.currentTime = clips[0];

    return () => {
      video.removeEventListener("canplay", handleCanPlay);
    };
  }, [isOpen, clips, mediaId]);

  // Time update listener for auto-skipping
  useEffect(() => {
    if (!isOpen || clips.length === 0 || !videoRef.current) return;

    const video = videoRef.current;

    const handleTimeUpdate = () => {
      const currentClipStart = clips[currentClipIndex];
      const elapsedInClip = video.currentTime - currentClipStart;

      // Update progress bar
      setProgress(Math.min(100, Math.max(0, (elapsedInClip / clipDuration) * 100)));

      // If we've played 30 seconds of this clip (or somehow jumped way ahead)
      if (elapsedInClip >= clipDuration || elapsedInClip < 0) {
        const nextIndex = currentClipIndex + 1;
        
        if (nextIndex < clips.length) {
          // Jump to next clip
          setLoading(true);
          setCurrentClipIndex(nextIndex);
          video.currentTime = clips[nextIndex];
        } else {
          // Trailer finished
          onClose();
        }
      }
    };

    // Use requestAnimationFrame for smoother progress bar updates than timeupdate event
    const updateProgressLoop = () => {
      handleTimeUpdate();
      rafRef.current = requestAnimationFrame(updateProgressLoop);
    };
    
    video.addEventListener("play", () => {
      setIsPlaying(true);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(updateProgressLoop);
    });
    
    video.addEventListener("pause", () => {
      setIsPlaying(false);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    });
    
    video.addEventListener("error", () => setError(true));

    return () => {
      video.removeEventListener("play", () => setIsPlaying(true));
      video.removeEventListener("pause", () => setIsPlaying(false));
      video.removeEventListener("error", () => setError(true));
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [isOpen, clips, currentClipIndex, onClose]);


  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-md">
      <div className="relative w-full max-w-6xl aspect-video bg-black shadow-2xl overflow-hidden rounded-2xl border border-white/10 mx-4">
        
        {/* Loading Overlay */}
        {loading && !error && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50 z-20">
            <Loader2 className="w-8 h-8 text-white/50 animate-spin" />
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black z-20">
            <p className="text-white/50 mb-4">Error loading video stream.</p>
            <button onClick={onClose} className="px-6 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors">
              Close
            </button>
          </div>
        )}

        <video
          ref={videoRef}
          className="w-full h-full object-contain"
          playsInline
          autoPlay
          controls={false}
          muted // Muted to ensure autoplay works on most browsers
        />

        {/* UI Overlay */}
        <div className="absolute inset-x-0 top-0 p-6 flex items-center justify-between z-30 bg-gradient-to-b from-black/80 to-transparent pointer-events-none">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-violet-500/20 text-violet-400">
              <Play className="w-4 h-4 ml-0.5 fill-current" />
            </div>
            <div>
              <h3 className="text-white font-bold tracking-widest text-sm uppercase drop-shadow-md">Auto-Trailer</h3>
              <p className="text-white/40 text-[10px] tracking-wider uppercase mt-0.5 drop-shadow-md">
                Clip {Math.min(currentClipIndex + 1, clips.length)} of {clips.length}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-md border border-white/10 flex items-center justify-center text-white/50 hover:text-white hover:bg-white/20 transition-all pointer-events-auto"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Unmute Button */}
        <div className="absolute bottom-6 right-6 z-30 pointer-events-auto">
           <button 
             onClick={() => {
               if (videoRef.current) {
                 videoRef.current.muted = !videoRef.current.muted;
               }
             }}
             className="px-4 py-2 rounded-full bg-black/40 backdrop-blur-md border border-white/10 text-xs text-white/70 hover:text-white hover:bg-white/20 transition-all uppercase tracking-wider"
           >
             Toggle Sound
           </button>
        </div>

        {/* Progress Bar for current clip */}
        <div className="absolute inset-x-0 bottom-0 h-1.5 bg-white/10 z-30">
          <div 
            className="h-full bg-violet-500 transition-none"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </div>
  );
}
