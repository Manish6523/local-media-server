"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import Hls from "hls.js";

export interface SubtitleTrack {
  label: string;
  language: string;
  url: string;
}

export interface AudioTrack {
  index: number;
  label: string;
  language: string;
  codec: string;
}

export interface PlayerState {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  isMuted: boolean;
  isBuffering: boolean;
  bufferedEnd: number;
  isFullscreen: boolean;
  showControls: boolean;
  activeSubtitle: number | null;
  activeAudioTrack: number;
  subtitleTracks: SubtitleTrack[];
  audioTracks: AudioTrack[];
  skipAnimation: "left" | "right" | null;
  currentCueText: string;
  subtitleSize: "small" | "medium" | "large";
  subtitleColor: "white" | "yellow";
}

export function usePlayer(
  mediaId: string, 
  baseNeedsTranscode: boolean, 
  exactDuration: number, 
  initialWatchProgress: number = 0,
  roomCode?: string | null
) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const skipAnimTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const progressInterval = useRef<ReturnType<typeof setInterval> | null>(null);
  const hasResumed = useRef(false);

  const [state, setState] = useState<PlayerState>({
    isPlaying: false,
    currentTime: initialWatchProgress,
    duration: exactDuration || 0,
    volume: 1,
    isMuted: false,
    isBuffering: true,
    bufferedEnd: 0,
    isFullscreen: false,
    showControls: true,
    activeSubtitle: null,
    activeAudioTrack: 0,
    subtitleTracks: [],
    audioTracks: [],
    skipAnimation: null,
    currentCueText: "",
    subtitleSize: (typeof window !== "undefined" && localStorage.getItem("vidlock_subtitle_size")) as any || "medium",
    subtitleColor: (typeof window !== "undefined" && localStorage.getItem("vidlock_subtitle_color")) as any || "white",
  });

  const [transcodeStartTime, setTranscodeStartTime] = useState(initialWatchProgress > 0 && baseNeedsTranscode ? initialWatchProgress : 0);
  const [showResumeToast, setShowResumeToast] = useState(initialWatchProgress > 0);

  // Resume toast auto-hide
  useEffect(() => {
    if (showResumeToast) {
      const timer = setTimeout(() => setShowResumeToast(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [showResumeToast]);

  // Progress saver interval
  useEffect(() => {
    if (!state.isPlaying || state.currentTime < 5) {
      if (progressInterval.current) clearInterval(progressInterval.current);
      return;
    }

    progressInterval.current = setInterval(() => {
      fetch("/api/watch-progress", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: parseInt(mediaId, 10),
          currentTime: state.currentTime,
          duration: state.duration || exactDuration || 1
        })
      }).catch(() => {});
    }, 5000);

    return () => {
      if (progressInterval.current) clearInterval(progressInterval.current);
    };
  }, [state.isPlaying, state.currentTime, state.duration, mediaId, exactDuration]);

  // If user selects an alternate audio track on an MP4, we MUST transcode it on the server
  // because native HTML5 over HTTP doesn't easily let you select audio streams dynamically
  const needsTranscode = baseNeedsTranscode || state.activeAudioTrack > 0;

  // Stable client identifier for server-side process tracking
  // Each usePlayer instance (host / guest) gets a unique ID so the server
  // can kill old FFmpeg processes when the same viewer seeks
  const clientIdRef = useRef(Math.random().toString(36).slice(2, 8));

  // Build video source URL
  const videoSrc = needsTranscode
    ? `/api/hls/${mediaId}/${state.activeAudioTrack}/${transcodeStartTime}/playlist.m3u8?clientId=${clientIdRef.current}`
    : `/api/stream?id=${mediaId}`;

  // hls.js integration
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !needsTranscode) return;

    let hls: Hls | null = null;

    if (Hls.isSupported()) {
      hls = new Hls({
        maxBufferLength: 30,
        maxMaxBufferLength: 60,
      });
      hls.loadSource(videoSrc);
      hls.attachMedia(video);
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        // We do not auto-play here, the guest sync logic handles that
        console.log("[HLS] Manifest parsed");
      });
      hls.on(Hls.Events.ERROR, (event, data) => {
        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              hls?.startLoad();
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              hls?.recoverMediaError();
              break;
            default:
              hls?.destroy();
              break;
          }
        }
      });
    } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
      // Native Safari support
      video.src = videoSrc;
    }

    return () => {
      if (hls) {
        hls.destroy();
      }
    };
  }, [videoSrc, needsTranscode]);

  // Fetch subtitle and audio tracks
  useEffect(() => {
    fetch(`/api/subtitles?id=${mediaId}`)
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setState((s) => ({ ...s, subtitleTracks: data }));
      })
      .catch(console.error);

    fetch(`/api/audio-tracks?id=${mediaId}`)
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setState((s) => ({ ...s, audioTracks: data }));
      })
      .catch(console.error);
  }, [mediaId]);

  const ignorePauseRef = useRef(false);

  // ---- Video event bindings ----
  const bindVideoEvents = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;

    const onPlay = () => setState((s) => ({ ...s, isPlaying: true }));
    const onPause = () => {
      if (!ignorePauseRef.current) {
        setState((s) => ({ ...s, isPlaying: false }));
      }
    };
    const onTimeUpdate = () => {
      // If we are transcoding, we add the transcodeStartTime to the native currentTime
      // so the progress bar represents the global time in the movie
      const realTime = needsTranscode ? transcodeStartTime + v.currentTime : v.currentTime;
      setState((s) => ({ ...s, currentTime: realTime }));
    };
    const onDurationChange = () => {
      // Only override duration if we don't have an exact one from the server
      if (!exactDuration && v.duration && isFinite(v.duration)) {
        setState((s) => ({ ...s, duration: v.duration }));
      }
    };
    const onWaiting = () => setState((s) => ({ ...s, isBuffering: true }));
    const onCanPlay = () => setState((s) => ({ ...s, isBuffering: false }));
    const onProgress = () => {
      if (v.buffered.length > 0) {
        const end = v.buffered.end(v.buffered.length - 1);
        const realEnd = needsTranscode ? transcodeStartTime + end : end;
        setState((s) => ({ ...s, bufferedEnd: realEnd }));
      }
    };
    const onVolumeChange = () => {
      setState((s) => ({ ...s, volume: v.volume, isMuted: v.muted }));
    };

    v.addEventListener("play", onPlay);
    v.addEventListener("pause", onPause);
    v.addEventListener("timeupdate", onTimeUpdate);
    v.addEventListener("durationchange", onDurationChange);
    v.addEventListener("loadedmetadata", onDurationChange);
    v.addEventListener("waiting", onWaiting);
    v.addEventListener("canplay", onCanPlay);
    v.addEventListener("canplaythrough", onCanPlay);
    v.addEventListener("playing", onCanPlay);
    v.addEventListener("seeked", onCanPlay);
    v.addEventListener("progress", onProgress);
    v.addEventListener("volumechange", onVolumeChange);

    return () => {
      v.removeEventListener("play", onPlay);
      v.removeEventListener("pause", onPause);
      v.removeEventListener("timeupdate", onTimeUpdate);
      v.removeEventListener("durationchange", onDurationChange);
      v.removeEventListener("loadedmetadata", onDurationChange);
      v.removeEventListener("waiting", onWaiting);
      v.removeEventListener("canplay", onCanPlay);
      v.removeEventListener("canplaythrough", onCanPlay);
      v.removeEventListener("playing", onCanPlay);
      v.removeEventListener("seeked", onCanPlay);
      v.removeEventListener("progress", onProgress);
      v.removeEventListener("volumechange", onVolumeChange);
    };
  }, [exactDuration, needsTranscode, transcodeStartTime]);

  // ---- Controls auto-hide ----
  const resetControlsTimer = useCallback(() => {
    setState((s) => ({ ...s, showControls: true }));
    if (hideTimer.current) clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => {
      setState((s) => ({ ...s, showControls: false }));
    }, 3000);
  }, []);

  // ---- Player actions ----
  const togglePlay = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    v.paused ? v.play() : v.pause();
  }, []);

  const seek = useCallback((time: number) => {
    const v = videoRef.current;
    if (!v) return;
    const targetTime = Math.max(0, Math.min(time, state.duration || 0));
    
    if (needsTranscode) {
      // In HLS, check if target is within our current buffered ranges.
      // hls.js manages the native video buffer. If it's buffered, native seek works.
      // But because our HLS stream starts at transcodeStartTime and goes forward,
      // the native video element's time is relative to transcodeStartTime.
      const relativeTarget = targetTime - transcodeStartTime;
      
      let isBuffered = false;
      for (let i = 0; i < v.buffered.length; i++) {
        if (relativeTarget >= v.buffered.start(i) && relativeTarget <= v.buffered.end(i)) {
          isBuffered = true;
          break;
        }
      }

      // Allow a small forward seek (e.g. 10s) without restarting transcode if it's close to the buffered edge
      const distanceToEdge = v.buffered.length > 0 ? relativeTarget - v.buffered.end(v.buffered.length - 1) : 100;

      if (isBuffered || (relativeTarget > v.currentTime && distanceToEdge < 15)) {
        // Native seek within HLS buffer
        v.currentTime = relativeTarget;
      } else {
        // Full transcode seek
        ignorePauseRef.current = true;
        setTranscodeStartTime(targetTime);
        setState(s => ({ ...s, currentTime: targetTime, isBuffering: true, bufferedEnd: targetTime }));
        
        let bufferTimeout: ReturnType<typeof setTimeout>;
        
        const onPlaying = () => {
          clearTimeout(bufferTimeout);
          setState(s => ({ ...s, isBuffering: false }));
          ignorePauseRef.current = false;
          v.removeEventListener("playing", onPlaying);
        };
        v.addEventListener("playing", onPlaying);

        // Safety timeout
        bufferTimeout = setTimeout(() => {
          setState(s => ({ ...s, isBuffering: false }));
          ignorePauseRef.current = false;
          v.removeEventListener("playing", onPlaying);
        }, 8000);
      }
    } else {
      v.currentTime = targetTime;
    }
  }, [needsTranscode, state.duration]);

  const skipBack = useCallback(() => {
    setState((s) => {
      seek(s.currentTime - 10);
      return { ...s, skipAnimation: "left" };
    });
    if (skipAnimTimer.current) clearTimeout(skipAnimTimer.current);
    skipAnimTimer.current = setTimeout(() => {
      setState((s) => ({ ...s, skipAnimation: null }));
    }, 600);
  }, [seek]);

  const skipForward = useCallback(() => {
    setState((s) => {
      seek(s.currentTime + 10);
      return { ...s, skipAnimation: "right" };
    });
    if (skipAnimTimer.current) clearTimeout(skipAnimTimer.current);
    skipAnimTimer.current = setTimeout(() => {
      setState((s) => ({ ...s, skipAnimation: null }));
    }, 600);
  }, [seek]);

  const setVolume = useCallback((vol: number) => {
    const v = videoRef.current;
    if (!v) return;
    v.volume = Math.max(0, Math.min(1, vol));
    if (vol > 0 && v.muted) v.muted = false;
  }, []);

  const toggleMute = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    v.muted = !v.muted;
  }, []);

  const toggleFullscreen = useCallback(() => {
    const c = containerRef.current;
    if (!c) return;
    if (document.fullscreenElement) {
      document.exitFullscreen();
      setState((s) => ({ ...s, isFullscreen: false }));
    } else {
      c.requestFullscreen();
      setState((s) => ({ ...s, isFullscreen: true }));
    }
  }, []);

  const setActiveSubtitle = useCallback((index: number | null) => {
    setState((s) => ({ ...s, activeSubtitle: index }));
  }, []);

  const setActiveAudioTrack = useCallback((index: number) => {
    const v = videoRef.current;
    const currentTime = v?.currentTime || 0;
    setState((s) => ({ ...s, activeAudioTrack: index }));
    // After state update triggers source change, restore time
    setTimeout(() => {
      const v2 = videoRef.current;
      if (v2) {
        const onLoaded = () => {
          v2.currentTime = currentTime;
          v2.play().catch(() => {});
          v2.removeEventListener("loadeddata", onLoaded);
        };
        v2.addEventListener("loadeddata", onLoaded);
      }
    }, 100);
  }, []);

  const setCueText = useCallback((text: string) => {
    setState((s) => ({ ...s, currentCueText: text }));
  }, []);

  const setSubtitleSize = useCallback((size: "small" | "medium" | "large") => {
    setState((s) => ({ ...s, subtitleSize: size }));
    if (typeof window !== "undefined") localStorage.setItem("vidlock_subtitle_size", size);
  }, []);

  const setSubtitleColor = useCallback((color: "white" | "yellow") => {
    setState((s) => ({ ...s, subtitleColor: color }));
    if (typeof window !== "undefined") localStorage.setItem("vidlock_subtitle_color", color);
  }, []);

  // Fullscreen change listener
  useEffect(() => {
    const handler = () => {
      setState((s) => ({ ...s, isFullscreen: !!document.fullscreenElement }));
    };
    document.addEventListener("fullscreenchange", handler);
    return () => document.removeEventListener("fullscreenchange", handler);
  }, []);

  // Cleanup timers
  useEffect(() => {
    return () => {
      if (hideTimer.current) clearTimeout(hideTimer.current);
      if (skipAnimTimer.current) clearTimeout(skipAnimTimer.current);
    };
  }, []);

  return {
    videoRef,
    containerRef,
    state,
    videoSrc,
    needsTranscode,
    transcodeStartTime,
    bindVideoEvents,
    resetControlsTimer,
    togglePlay,
    seek,
    skipBack,
    skipForward,
    setVolume,
    toggleMute,
    toggleFullscreen,
    setActiveSubtitle,
    setActiveAudioTrack,
    setCueText,
    setSubtitleSize,
    setSubtitleColor,
    showResumeToast,
    updateTranscodeStart: setTranscodeStartTime,
  };
}
