"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Play, Pause, ArrowLeft, RotateCcw, RotateCw, SkipForward, MessageSquare } from "lucide-react";
import type { MediaEntry } from "@/lib/db";

interface TVPlayerClientProps {
  media: MediaEntry;
  nextEpisode: MediaEntry | null;
}

interface SubtitleTrack {
  id: string;
  label: string;
  language: string;
  src?: string;
}

export default function TVPlayerClient({ media, nextEpisode }: TVPlayerClientProps) {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const hudTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const [isPlaying, setIsPlaying] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [showHUD, setShowHUD] = useState(true);
  const [seekFeedback, setSeekFeedback] = useState<string | null>(null);

  const [subtitles, setSubtitles] = useState<SubtitleTrack[]>([]);
  const [activeSubId, setActiveSubId] = useState<string>("off");

  const streamUrl = `/api/stream?id=${media.id}`;

  const formatTime = (secs: number) => {
    const total = Math.floor(secs);
    const h = Math.floor(total / 3600);
    const m = Math.floor((total % 3600) / 60);
    const s = total % 60;
    if (h > 0) {
      return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
    }
    return `${m}:${String(s).padStart(2, "0")}`;
  };

  const triggerHUD = useCallback(() => {
    setShowHUD(true);
    if (hudTimeoutRef.current) clearTimeout(hudTimeoutRef.current);
    hudTimeoutRef.current = setTimeout(() => {
      if (videoRef.current && !videoRef.current.paused) {
        setShowHUD(false);
      }
    }, 4500);
  }, []);

  useEffect(() => {
    fetch(`/api/subtitles?id=${media.id}`)
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data?.tracks)) {
          setSubtitles(data.tracks);
        }
      })
      .catch(() => {});
  }, [media.id]);

  const saveProgress = useCallback(
    async (cur: number, dur: number) => {
      if (dur <= 0) return;
      const isWatched = cur / dur >= 0.9 ? 1 : 0;
      try {
        await fetch("/api/watch-progress", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            mediaId: media.id,
            currentTime: Math.floor(cur),
            duration: Math.floor(dur),
            isWatched,
          }),
        });
      } catch {}
    },
    [media.id]
  );

  useEffect(() => {
    const interval = setInterval(() => {
      if (videoRef.current && !videoRef.current.paused) {
        saveProgress(videoRef.current.currentTime, videoRef.current.duration);
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [saveProgress]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleLoadedMetadata = () => {
      setDuration(video.duration);
      if (media.watch_progress && media.watch_progress > 10 && media.watch_progress < video.duration - 30) {
        video.currentTime = media.watch_progress;
      }
    };

    const handleTimeUpdate = () => {
      setCurrentTime(video.currentTime);
    };

    const handleEnded = () => {
      saveProgress(video.duration, video.duration);
      if (nextEpisode) {
        router.push(`/tv/play/${nextEpisode.id}`);
      } else {
        router.back();
      }
    };

    video.addEventListener("loadedmetadata", handleLoadedMetadata);
    video.addEventListener("timeupdate", handleTimeUpdate);
    video.addEventListener("ended", handleEnded);

    return () => {
      video.removeEventListener("loadedmetadata", handleLoadedMetadata);
      video.removeEventListener("timeupdate", handleTimeUpdate);
      video.removeEventListener("ended", handleEnded);
    };
  }, [media.watch_progress, nextEpisode, router, saveProgress]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key;
      const keyCode = e.keyCode;
      const video = videoRef.current;
      if (!video) return;

      if (key === "Escape" || key === "Backspace" || key === "XF86Back" || keyCode === 461) {
        e.preventDefault();
        saveProgress(video.currentTime, video.duration);
        router.back();
        return;
      }

      if (key === "Enter" || key === " " || key === "MediaPlayPause") {
        e.preventDefault();
        if (video.paused) {
          video.play();
          setIsPlaying(true);
        } else {
          video.pause();
          setIsPlaying(false);
        }
        triggerHUD();
        return;
      }

      if (key === "ArrowRight" || key === "MediaFastForward") {
        e.preventDefault();
        video.currentTime = Math.min(video.duration, video.currentTime + 10);
        setSeekFeedback("+10s");
        setTimeout(() => setSeekFeedback(null), 900);
        triggerHUD();
        return;
      }

      if (key === "ArrowLeft" || key === "MediaRewind") {
        e.preventDefault();
        video.currentTime = Math.max(0, video.currentTime - 10);
        setSeekFeedback("-10s");
        setTimeout(() => setSeekFeedback(null), 900);
        triggerHUD();
        return;
      }

      if (key === "ArrowDown") {
        e.preventDefault();
        if (subtitles.length > 0) {
          const currentIndex = subtitles.findIndex((s) => s.id === activeSubId);
          if (currentIndex === -1) {
            setActiveSubId(subtitles[0].id);
          } else if (currentIndex < subtitles.length - 1) {
            setActiveSubId(subtitles[currentIndex + 1].id);
          } else {
            setActiveSubId("off");
          }
        }
        triggerHUD();
        return;
      }

      if (key === "ArrowUp") {
        e.preventDefault();
        triggerHUD();
        return;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeSubId, router, saveProgress, subtitles, triggerHUD]);

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="tv-player-wrap" onMouseMove={triggerHUD} onClick={triggerHUD}>
      {/* HTML5 TV Video Element */}
      <video
        ref={videoRef}
        src={streamUrl}
        autoPlay
        playsInline
        className="tv-player-video"
      >
        {subtitles.map((track) => (
          <track
            key={track.id}
            kind="subtitles"
            label={track.label}
            srcLang={track.language}
            src={`/api/subtitle-file?id=${media.id}&trackId=${track.id}`}
            default={activeSubId === track.id}
          />
        ))}
      </video>

      {/* Seek Indicator Feedback */}
      {seekFeedback && (
        <div className="tv-seek-badge">
          <span style={{ display: "inline-flex", alignItems: "center", gap: 10 }}>
            {seekFeedback.startsWith("+") ? (
              <RotateCw style={{ width: 28, height: 28, color: "#a78bfa" }} />
            ) : (
              <RotateCcw style={{ width: 28, height: 28, color: "#a78bfa" }} />
            )}
            <span>{seekFeedback}</span>
          </span>
        </div>
      )}

      {/* TV HUD Overlay */}
      <div
        className="tv-player-hud"
        style={{
          opacity: showHUD ? 1 : 0,
          pointerEvents: showHUD ? "auto" : "none",
        }}
      >
        {/* Top Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <button
            onClick={() => {
              if (videoRef.current) saveProgress(videoRef.current.currentTime, videoRef.current.duration);
              router.back();
            }}
            className="tv-btn tv-btn-secondary"
            style={{ padding: "8px 20px" }}
          >
            <ArrowLeft style={{ width: 16, height: 16, marginRight: 8 }} />
            <span>Back</span>
          </button>

          <div style={{ textAlign: "right" }}>
            <h2 style={{ fontSize: 24, fontWeight: 900, textTransform: "uppercase", margin: 0, textShadow: "0 2px 10px rgba(0,0,0,0.9)" }}>
              {media.title}
            </h2>
            {media.type === "show" && (
              <p style={{ fontSize: 13, color: "rgba(255,255,255,0.6)", marginTop: 4 }}>
                Season {media.season} • Episode {media.episode_start}
              </p>
            )}
          </div>
        </div>

        {/* Bottom Playback Scrubber & Remote Pill Controls */}
        <div>
          {/* Progress Slider Track */}
          <div style={{ marginBottom: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, fontWeight: 700, color: "rgba(255,255,255,0.7)", marginBottom: 6 }}>
              <span>{formatTime(currentTime)}</span>
              <span>{formatTime(duration)}</span>
            </div>
            <div style={{ width: "100%", height: 6, backgroundColor: "rgba(255,255,255,0.2)", borderRadius: 9999, overflow: "hidden" }}>
              <div
                style={{
                  height: "100%",
                  width: `${progressPercent}%`,
                  backgroundColor: "#7c3aed",
                  boxShadow: "0 0 10px #7c3aed",
                }}
              />
            </div>
          </div>

          {/* Controls Bar */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ display: "flex", alignItems: "center" }}>
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: "50%",
                  backgroundColor: "#ffffff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  marginRight: 12,
                }}
              >
                {isPlaying ? (
                  <Pause style={{ width: 18, height: 18, fill: "#000", color: "#000" }} />
                ) : (
                  <Play style={{ width: 18, height: 18, fill: "#000", color: "#000", marginLeft: 2 }} />
                )}
              </div>
              <span style={{ fontSize: 13, fontWeight: 700, textTransform: "uppercase", color: "rgba(255,255,255,0.8)" }}>
                {isPlaying ? "Playing" : "Paused"}
              </span>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              {subtitles.length > 0 && (
                <div className="tv-nav-pill active" style={{ fontSize: 12, display: "inline-flex", alignItems: "center", gap: 6 }}>
                  <MessageSquare style={{ width: 14, height: 14, color: "#a78bfa" }} />
                  <span>
                    Subtitles: {activeSubId === "off" ? "Off" : subtitles.find((s) => s.id === activeSubId)?.label || "On"}
                  </span>
                </div>
              )}

              {nextEpisode && (
                <Link
                  href={`/tv/play/${nextEpisode.id}`}
                  className="tv-btn tv-btn-primary"
                  style={{ padding: "8px 22px", fontSize: 12 }}
                >
                  <span style={{ marginRight: 6 }}>Next: E{nextEpisode.episode_start}</span>
                  <SkipForward style={{ width: 14, height: 14 }} />
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
