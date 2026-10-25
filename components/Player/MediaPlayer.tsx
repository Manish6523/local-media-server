"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import {
  X,
  Play,
  Pause,
  Maximize,
  Minimize,
  Volume1,
  Volume2,
  VolumeX,
  Subtitles,
  AudioWaveform,
  Gauge,
  Info,
  Zap,
  Check,
  Tv,
  Users,
} from "lucide-react";
import { usePlayer } from "./usePlayer";
import SkipOverlay from "./SkipOverlay";
import CastButton from "./CastButton";
import SubtitleMenu from "./SubtitleMenu";
import AudioMenu from "./AudioMenu";
import StreamModeMenu from "./StreamModeMenu";
import StatsForNerdsModal from "./StatsForNerdsModal";

interface WatchPartyMode {
  roomCode?: string | null;
  isHost: boolean;
  onPlay: (time: number) => void;
  onPause: (time: number) => void;
  onSeek: (time: number) => void;
  registerVideoRef: (ref: HTMLVideoElement | null) => void;
  registerSeek?: (seekFn: (time: number) => void) => void;
  registerTranscodeStart?: (startTime: number) => void;
  memberCount?: number;
  unreadCount?: number;
  isChatOpen?: boolean;
  onToggleChat?: () => void;
}

interface MediaPlayerProps {
  mediaId: string;
  title: string;
  type: "movie" | "show";
  season?: number | null;
  episodeStart?: number | null;
  episodeEnd?: number | null;
  filename: string;
  exactDuration: number;
  initialWatchProgress?: number;
  watchPartyMode?: WatchPartyMode;
}

export default function MediaPlayer({
  mediaId,
  title,
  type,
  season,
  episodeStart,
  episodeEnd,
  filename,
  exactDuration,
  initialWatchProgress = 0,
  watchPartyMode,
}: MediaPlayerProps) {
  const router = useRouter();

  const {
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
    forceHideControls,
    fetchSubtitles,
    streamMode,
    switchStreamMode,
    streamToast,
  } = usePlayer(
    mediaId,
    false,
    exactDuration,
    initialWatchProgress,
    watchPartyMode?.roomCode,
  );

  // Popovers state
  const [showStats, setShowStats] = useState(false);
  const [showSubMenu, setShowSubMenu] = useState(false);
  const [showAudioMenu, setShowAudioMenu] = useState(false);
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);
  const [showStreamMenu, setShowStreamMenu] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [switchingAudio, setSwitchingAudio] = useState(false);

  // Keep controls visible whenever any modal/popup is open or hovering controls
  const isAnyMenuOpen =
    showStats ||
    showSubMenu ||
    showAudioMenu ||
    showSpeedMenu ||
    showStreamMenu;

  const [isHoveringControls, setIsHoveringControls] = useState(false);
  const controlsVisible = state.showControls || isAnyMenuOpen || isHoveringControls;

  // Volume HUD on keyboard change
  const [showVolumeHud, setShowVolumeHud] = useState(false);
  const volumeHudTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const triggerVolumeHud = useCallback(() => {
    setShowVolumeHud(true);
    if (volumeHudTimer.current) clearTimeout(volumeHudTimer.current);
    volumeHudTimer.current = setTimeout(() => {
      setShowVolumeHud(false);
    }, 2000);
  }, []);

  useEffect(() => {
    return () => {
      if (volumeHudTimer.current) clearTimeout(volumeHudTimer.current);
    };
  }, []);

  // Scrubber drag / hover state
  const scrubberRef = useRef<HTMLDivElement>(null);
  const [isHoveringScrubber, setIsHoveringScrubber] = useState(false);
  const [hoverX, setHoverX] = useState(0);
  const [isDraggingScrubber, setIsDraggingScrubber] = useState(false);

  // Volume drag state
  const volumeBarRef = useRef<HTMLDivElement>(null);
  const [isDraggingVolume, setIsDraggingVolume] = useState(false);
  const [isHoveredVolume, setIsHoveredVolume] = useState(false);

  const lastClickTime = useRef(0);
  const lastClickSide = useRef<"left" | "right" | null>(null);

  // Bind video events
  useEffect(() => {
    const cleanup = bindVideoEvents();
    return cleanup;
  }, [bindVideoEvents]);

  // Close menus on outside click
  useEffect(() => {
    const handleOutside = () => {
      setShowSpeedMenu(false);
      setShowAudioMenu(false);
      setShowSubMenu(false);
      setShowStreamMenu(false);
    };
    window.addEventListener("click", handleOutside);
    return () => window.removeEventListener("click", handleOutside);
  }, []);

  // Format negative remaining time e.g. -38:15
  const formatRemainingTime = (current: number, total: number) => {
    if (!isFinite(total) || total <= 0) return "-0:00";
    const remaining = Math.max(0, total - current);
    const h = Math.floor(remaining / 3600);
    const m = Math.floor((remaining % 3600) / 60);
    const s = Math.floor(remaining % 60);
    const formatted =
      h > 0
        ? `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
        : `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
    return `-${formatted}`;
  };

  const formatTime = (s: number) => {
    if (!isFinite(s) || s < 0) return "0:00";
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = Math.floor(s % 60);
    return h > 0
      ? `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`
      : `${m}:${String(sec).padStart(2, "0")}`;
  };

  // Picture in Picture
  const togglePiP = async () => {
    if (!videoRef.current) return;
    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
      } else if (document.pictureInPictureEnabled) {
        await videoRef.current.requestPictureInPicture();
      }
    } catch (err) {
      console.warn("PiP error:", err);
    }
  };

  // Playback speed
  const handleSpeedSelect = (s: number) => {
    if (videoRef.current) {
      videoRef.current.playbackRate = s;
      setSpeed(s);
    }
    setShowSpeedMenu(false);
  };

  // Watch party wrappers
  const wpTogglePlay = useCallback(() => {
    if (watchPartyMode && !watchPartyMode.isHost) return;
    if (watchPartyMode?.isHost && videoRef.current) {
      const v = videoRef.current;
      const absoluteTime = needsTranscode
        ? transcodeStartTime + v.currentTime
        : v.currentTime;
      if (!v.paused) {
        watchPartyMode.onPause(absoluteTime);
      } else {
        watchPartyMode.onPlay(absoluteTime);
      }
    } else {
      togglePlay();
    }
  }, [togglePlay, watchPartyMode, needsTranscode, transcodeStartTime, videoRef]);

  const wpSeek = useCallback(
    (time: number) => {
      if (watchPartyMode && !watchPartyMode.isHost) return;
      if (watchPartyMode?.isHost) {
        watchPartyMode.onSeek(time);
      } else {
        seek(time);
      }
    },
    [seek, watchPartyMode],
  );

  useEffect(() => {
    if (watchPartyMode?.registerSeek) {
      watchPartyMode.registerSeek(seek);
    }
  }, [watchPartyMode, seek]);

  useEffect(() => {
    if (watchPartyMode?.registerTranscodeStart) {
      watchPartyMode.registerTranscodeStart(transcodeStartTime);
    }
  }, [watchPartyMode, transcodeStartTime]);

  const wpSkipBack = useCallback(() => {
    if (watchPartyMode && !watchPartyMode.isHost) return;
    if (watchPartyMode?.isHost && videoRef.current) {
      const absoluteTime = needsTranscode
        ? transcodeStartTime + videoRef.current.currentTime
        : videoRef.current.currentTime;
      watchPartyMode.onSeek(absoluteTime - 10);
    } else {
      skipBack();
    }
  }, [skipBack, watchPartyMode, needsTranscode, transcodeStartTime, videoRef]);

  const wpSkipForward = useCallback(() => {
    if (watchPartyMode && !watchPartyMode.isHost) return;
    if (watchPartyMode?.isHost && videoRef.current) {
      const absoluteTime = needsTranscode
        ? transcodeStartTime + videoRef.current.currentTime
        : videoRef.current.currentTime;
      watchPartyMode.onSeek(absoluteTime + 10);
    } else {
      skipForward();
    }
  }, [skipForward, watchPartyMode, needsTranscode, transcodeStartTime, videoRef]);

  // Controls auto-hide
  useEffect(() => {
    if (isAnyMenuOpen) {
      resetControlsTimer();
      return;
    }
    const handler = (e: MouseEvent | TouchEvent) => {
      if (
        e instanceof MouseEvent &&
        e.clientX <= 25 &&
        e.clientY >= 85 &&
        e.clientY <= window.innerHeight - 120
      ) {
        setIsHoveringControls(false);
        forceHideControls();
        return;
      }

      if (e instanceof MouseEvent) {
        const target = e.target as HTMLElement | null;
        const overControl = !!target?.closest('button, [data-controls], [role="button"], input, a');
        setIsHoveringControls(overControl);
        if (overControl) {
          resetControlsTimer();
          return;
        }
      }

      resetControlsTimer();
    };
    document.addEventListener("mousemove", handler);
    document.addEventListener("touchstart", handler);
    resetControlsTimer();
    return () => {
      document.removeEventListener("mousemove", handler);
      document.removeEventListener("touchstart", handler);
    };
  }, [isAnyMenuOpen, resetControlsTimer, forceHideControls]);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      switch (e.key) {
        case " ":
        case "k":
          e.preventDefault();
          wpTogglePlay();
          break;
        case "ArrowLeft":
          e.preventDefault();
          wpSkipBack();
          break;
        case "ArrowRight":
          e.preventDefault();
          wpSkipForward();
          break;
        case "ArrowUp":
          e.preventDefault();
          setVolume(Math.min(1, state.volume + 0.05));
          triggerVolumeHud();
          break;
        case "ArrowDown":
          e.preventDefault();
          setVolume(Math.max(0, state.volume - 0.05));
          triggerVolumeHud();
          break;
        case "m":
        case "M":
          e.preventDefault();
          toggleMute();
          triggerVolumeHud();
          break;
        case "f":
          e.preventDefault();
          toggleFullscreen();
          break;
        case "c":
          e.preventDefault();
          if (state.subtitleTracks.length > 0) {
            setActiveSubtitle(state.activeSubtitle !== null ? null : 0);
          }
          break;
        case "Escape":
          e.preventDefault();
          if (document.fullscreenElement) {
            document.exitFullscreen().catch(() => {});
          } else {
            router.back();
          }
          break;
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [
    wpTogglePlay,
    wpSkipBack,
    wpSkipForward,
    setVolume,
    toggleMute,
    toggleFullscreen,
    setActiveSubtitle,
    state.volume,
    state.subtitleTracks,
    state.activeSubtitle,
    router,
  ]);

  // Subtitle track management
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;

    const existing = v.querySelectorAll("track");
    existing.forEach((t) => t.remove());

    if (state.subtitleTracks.length === 0) return;

    state.subtitleTracks.forEach((sub, idx) => {
      const track = document.createElement("track");
      track.kind = "subtitles";
      track.label = sub.label;
      track.srclang = sub.language;

      let trackUrl = sub.url;
      if (needsTranscode && transcodeStartTime > 0) {
        trackUrl += (trackUrl.includes("?") ? "&" : "?") + `start=${transcodeStartTime}`;
      }
      track.src = trackUrl;
      v.appendChild(track);

      if (v.textTracks[idx]) {
        v.textTracks[idx].mode = state.activeSubtitle === idx ? "hidden" : "disabled";
      }
    });

    const handleCueChange = (e: Event) => {
      const track = e.target as TextTrack;
      if (track.activeCues && track.activeCues.length > 0) {
        const cue = track.activeCues[0] as VTTCue;
        setCueText(cue.text);
      } else {
        setCueText("");
      }
    };

    for (let i = 0; i < v.textTracks.length; i++) {
      if (state.activeSubtitle === i) {
        v.textTracks[i].mode = "hidden";
        v.textTracks[i].addEventListener("cuechange", handleCueChange);
      } else {
        v.textTracks[i].mode = "disabled";
      }
    }

    return () => {
      for (let i = 0; i < v.textTracks.length; i++) {
        v.textTracks[i].removeEventListener("cuechange", handleCueChange);
      }
    };
  }, [
    videoRef,
    state.subtitleTracks,
    state.activeSubtitle,
    setCueText,
    state.activeAudioTrack,
    needsTranscode,
    transcodeStartTime,
  ]);

  // Handle click to play/pause and double-click to skip
  const handleVideoClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if ((e.target as HTMLElement).closest("[data-controls]")) return;

      const now = Date.now();
      const rect = containerRef.current?.getBoundingClientRect();
      const clickSide: "left" | "right" =
        rect && e.clientX < rect.left + rect.width / 2 ? "left" : "right";

      if (now - lastClickTime.current < 300 && lastClickSide.current === clickSide) {
        if (clickSide === "left") wpSkipBack();
        else wpSkipForward();
        lastClickTime.current = 0;
      } else {
        lastClickTime.current = now;
        lastClickSide.current = clickSide;
        setTimeout(() => {
          if (Date.now() - lastClickTime.current >= 280) {
            const isTouch = window.matchMedia("(pointer: coarse)").matches;
            if (!isTouch) {
              wpTogglePlay();
            }
          }
        }, 300);
      }
    },
    [containerRef, wpSkipBack, wpSkipForward, wpTogglePlay],
  );

  // Audio track switch with feedback
  const handleAudioSwitch = useCallback(
    (index: number) => {
      if (index === state.activeAudioTrack) return;
      setSwitchingAudio(true);
      setActiveAudioTrack(index);
      setTimeout(() => setSwitchingAudio(false), 2000);
    },
    [state.activeAudioTrack, setActiveAudioTrack],
  );

  // Scrubber seeking handlers
  const handleScrubberSeek = useCallback(
    (clientX: number) => {
      if (!scrubberRef.current || !state.duration) return;
      const rect = scrubberRef.current.getBoundingClientRect();
      const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
      const targetTime = (x / rect.width) * state.duration;
      wpSeek(targetTime);
    },
    [state.duration, wpSeek]
  );

  const handleScrubberMouseDown = useCallback(
    (e: React.MouseEvent) => {
      setIsDraggingScrubber(true);
      handleScrubberSeek(e.clientX);

      const onMove = (ev: MouseEvent) => handleScrubberSeek(ev.clientX);
      const onUp = () => {
        setIsDraggingScrubber(false);
        window.removeEventListener("mousemove", onMove);
        window.removeEventListener("mouseup", onUp);
      };
      window.addEventListener("mousemove", onMove);
      window.addEventListener("mouseup", onUp);
    },
    [handleScrubberSeek]
  );

  const handleScrubberTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if (!e.touches[0]) return;
      setIsDraggingScrubber(true);
      handleScrubberSeek(e.touches[0].clientX);

      const onTouchMove = (ev: TouchEvent) => {
        if (ev.touches[0]) handleScrubberSeek(ev.touches[0].clientX);
      };
      const onTouchEnd = () => {
        setIsDraggingScrubber(false);
        window.removeEventListener("touchmove", onTouchMove);
        window.removeEventListener("touchend", onTouchEnd);
      };
      window.addEventListener("touchmove", onTouchMove, { passive: true });
      window.addEventListener("touchend", onTouchEnd);
    },
    [handleScrubberSeek]
  );

  const handleScrubberMouseMove = useCallback((e: React.MouseEvent) => {
    if (!scrubberRef.current) return;
    const rect = scrubberRef.current.getBoundingClientRect();
    setHoverX(Math.max(0, Math.min(e.clientX - rect.left, rect.width)));
  }, []);

  // Volume slider handlers (horizontal slider)
  const handleVolumeSeek = useCallback(
    (clientX: number) => {
      if (!volumeBarRef.current) return;
      const innerTrack = (volumeBarRef.current.firstElementChild as HTMLElement) || volumeBarRef.current;
      const rect = innerTrack.getBoundingClientRect();
      if (rect.width <= 0) return;
      const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
      const newVol = Math.max(0, Math.min(1, x / rect.width));
      setVolume(newVol);
    },
    [setVolume]
  );

  const handleVolumeMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      setIsDraggingVolume(true);
      handleVolumeSeek(e.clientX);

      const onMove = (ev: MouseEvent) => handleVolumeSeek(ev.clientX);
      const onUp = () => {
        setIsDraggingVolume(false);
        window.removeEventListener("mousemove", onMove);
        window.removeEventListener("mouseup", onUp);
      };
      window.addEventListener("mousemove", onMove);
      window.addEventListener("mouseup", onUp);
    },
    [handleVolumeSeek]
  );

  const handleVolumeTouchStart = useCallback(
    (e: React.TouchEvent) => {
      e.stopPropagation();
      if (!e.touches[0]) return;
      setIsDraggingVolume(true);
      handleVolumeSeek(e.touches[0].clientX);

      const onTouchMove = (ev: TouchEvent) => {
        if (ev.touches[0]) {
          handleVolumeSeek(ev.touches[0].clientX);
        }
      };
      const onTouchEnd = () => {
        setIsDraggingVolume(false);
        window.removeEventListener("touchmove", onTouchMove);
        window.removeEventListener("touchend", onTouchEnd);
      };
      window.addEventListener("touchmove", onTouchMove, { passive: true });
      window.addEventListener("touchend", onTouchEnd);
    },
    [handleVolumeSeek]
  );

  const progressPercent =
    state.duration > 0 ? (state.currentTime / state.duration) * 100 : 0;
  const bufferedPercent =
    state.duration > 0 ? (state.bufferedEnd / state.duration) * 100 : 0;
  const hoverTime =
    state.duration > 0 && scrubberRef.current
      ? (hoverX / scrubberRef.current.clientWidth) * state.duration
      : 0;

  const eyebrowLabel =
    type === "show" && season
      ? `S${String(season).padStart(2, "0")} • ${
          episodeStart === episodeEnd
            ? `E${String(episodeStart).padStart(2, "0")}`
            : `E${String(episodeStart).padStart(2, "0")}–E${String(episodeEnd).padStart(2, "0")}`
        }`
      : "Now Playing";

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 bg-black select-none overflow-hidden"
      style={{ cursor: controlsVisible ? "default" : "none" }}
      onClick={handleVideoClick}
    >
      {/* Video */}
      <video
        x-webkit-airplay="allow"
        ref={(el) => {
          // @ts-ignore
          videoRef.current = el;
          if (watchPartyMode?.registerVideoRef) {
            watchPartyMode.registerVideoRef(el);
          }
        }}
        key={`${mediaId}-${state.activeAudioTrack}-${streamMode}-${needsTranscode}`}
        src={needsTranscode ? undefined : videoSrc}
        className="w-full h-full object-contain"
        autoPlay
        playsInline
        crossOrigin="anonymous"
      />

      {/* Desktop-only: left-side bar (below cross button for testing as requested) */}
      <div
        data-controls
        className="hidden md:block absolute top-[85px] bottom-[120px] left-0 w-[25px] z-[999] bg-red-500/20 border-r-2 border-red-500 pointer-events-auto"
        onMouseEnter={() => {
          if (!isAnyMenuOpen) {
            forceHideControls();
          }
        }}
        title="Left side auto-hide test bar (25px)"
      />

      {/* Buffering spinner */}
      {state.isBuffering && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
          <div className="w-14 h-14 border-[3px] border-white/20 border-t-white rounded-full animate-spin shadow-2xl" />
        </div>
      )}

      {/* Resume toast */}
      {showResumeToast && initialWatchProgress > 0 && (
        <div className="absolute top-24 left-1/2 -translate-x-1/2 glass-md px-6 py-3 rounded-full text-sm font-medium animate-in fade-in slide-in-from-top-4 duration-500 z-40 pointer-events-none shadow-2xl text-white">
          Resuming from {formatTime(initialWatchProgress)}
        </div>
      )}

      {/* Stream Mode Toast */}
      {streamToast && (
        <div className="absolute top-24 left-1/2 -translate-x-1/2 glass-md px-5 py-2.5 rounded-full text-xs md:text-sm font-medium animate-in fade-in slide-in-from-top-4 duration-300 z-50 shadow-2xl flex items-center gap-2 text-white">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          {streamToast}
        </div>
      )}

      {/* Skip overlay animation */}
      <SkipOverlay direction={state.skipAnimation} />

      {/* Switching audio overlay */}
      {switchingAudio && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
          <div className="glass-md px-6 py-3 rounded-2xl flex items-center gap-3 shadow-2xl text-white">
            <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
            <span className="text-sm font-medium">Switching audio stream...</span>
          </div>
        </div>
      )}

      {/* Custom subtitle rendering */}
      {state.currentCueText && (
        <div
          className={`absolute left-0 right-0 flex justify-center pointer-events-none px-8 z-20 ${
            state.subtitleSize === "small"
              ? "bottom-12 md:bottom-12"
              : state.subtitleSize === "large"
                ? "bottom-32 md:bottom-28"
                : "bottom-28 md:bottom-24"
          }`}
        >
          <div className="bg-black/75 px-5 py-2 rounded-xl backdrop-blur-sm text-center max-w-[80%] shadow-lg border border-white/5">
            <span
              className={`font-medium leading-relaxed drop-shadow-md ${
                state.subtitleSize === "small"
                  ? "text-[0.85rem] md:text-[1rem]"
                  : state.subtitleSize === "large"
                    ? "text-[1.4rem] md:text-[2rem]"
                    : "text-[1.1rem] md:text-[1.4rem]"
              } ${
                state.subtitleColor === "yellow" ? "text-[#f3f315]" : "text-white"
              }`}
              dangerouslySetInnerHTML={{ __html: state.currentCueText }}
            />
          </div>
        </div>
      )}

      {/* ── TOP BAR ── */}
      <div
        data-controls
        className="absolute top-0 left-0 right-0 p-3.5 sm:p-5 md:p-8 flex items-start justify-between z-40 pointer-events-none"
      >
        {/* Top Left: Close [X] + Capsule Controls */}
        <div
          className={`flex items-center gap-2 sm:gap-3 transition-all duration-300 ${
            controlsVisible
              ? "opacity-100 translate-y-0 pointer-events-auto"
              : "opacity-0 -translate-y-4 pointer-events-none"
          }`}
        >
          <button
            onClick={(e) => {
              e.stopPropagation();
              router.back();
            }}
            className="w-9 h-9 sm:w-10 sm:h-10 glass-md !rounded-full flex items-center justify-center text-white hover:bg-white/15 hover:scale-105 active:scale-95 transition-all shadow-lg shrink-0"
            title="Close Player"
          >
            <X className="w-4 h-4 sm:w-5 sm:h-5 stroke-[2.5]" />
          </button>

          {/* Picture-in-Picture & Cast Pill [ Always Horizontal ] */}
          <div className="glass-md !rounded-full px-3 py-1.5 flex items-center gap-3 md:gap-3.5 shadow-lg shrink-0">
            <button
              onClick={togglePiP}
              className="text-white/80 hover:text-white transition-colors"
              title="Picture in Picture"
            >
              <Tv className="w-4 h-4" />
            </button>

            <CastButton
              videoRef={videoRef}
              videoSrc={videoSrc}
              title={title}
              className="text-white/80 hover:text-white transition-colors p-0 hover:bg-transparent"
              iconClassName="w-4 h-4"
            />
          </div>

          {/* Watch Party Panel Toggle Button */}
          {watchPartyMode && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                watchPartyMode.onToggleChat?.();
              }}
              className={`glass-md !rounded-full px-3 py-1.5 flex items-center gap-2 transition-all shadow-lg text-xs font-semibold shrink-0 ${
                watchPartyMode.isChatOpen
                  ? "bg-white/30 text-white border-white/40 shadow-[0_0_20px_rgba(255,255,255,0.35)]"
                  : "text-white/80 hover:text-white hover:bg-white/15"
              }`}
              title={watchPartyMode.isChatOpen ? "Hide Watch Party Panel" : "Open Watch Party Panel"}
            >
              <Users className="w-4 h-4 text-violet-300" />
              <span className="hidden sm:inline font-medium">Party</span>
              {watchPartyMode.memberCount !== undefined && (
                <span className="px-1.5 py-0.2 rounded-full bg-violet-500/30 text-violet-200 text-[10px] font-mono font-bold">
                  {watchPartyMode.memberCount}
                </span>
              )}
              {(watchPartyMode.unreadCount ?? 0) > 0 && !watchPartyMode.isChatOpen && (
                <span className="w-2 h-2 rounded-full bg-pink-500 animate-pulse" />
              )}
            </button>
          )}
        </div>

        {/* Top Right: Volume Capsule [ Collapsed: Icon + %, Hover/Drag/HUD: Extends Slider Track ] */}
        <div
          onMouseEnter={() => setIsHoveredVolume(true)}
          onMouseLeave={() => setIsHoveredVolume(false)}
          onClick={(e) => {
            e.stopPropagation();
            if (typeof window !== "undefined" && window.matchMedia("(pointer: coarse)").matches) {
              setIsHoveredVolume((prev) => !prev);
            }
          }}
          className={`glass-md !rounded-full px-3 py-1.5 md:py-2 flex items-center shadow-lg select-none shrink-0 transition-all duration-300 ease-out group/volume cursor-pointer ${
            controlsVisible || showVolumeHud
              ? "opacity-100 translate-y-0 pointer-events-auto"
              : "opacity-0 -translate-y-4 pointer-events-none"
          }`}
        >
          <button
            onClick={(e) => {
              e.stopPropagation();
              toggleMute();
            }}
            className="text-white/80 hover:text-white transition-colors p-0.5 shrink-0"
            title={state.isMuted ? "Unmute" : "Mute"}
          >
            {state.isMuted || state.volume === 0 ? (
              <VolumeX className="w-4 h-4" />
            ) : state.volume < 0.5 ? (
              <Volume1 className="w-4 h-4" />
            ) : (
              <Volume2 className="w-4 h-4" />
            )}
          </button>

          {/* Expandable Slider Track with smooth animation */}
          <div
            className={`overflow-hidden transition-all duration-300 ease-out flex items-center ${
              isHoveredVolume || isDraggingVolume || showVolumeHud
                ? "w-20 sm:w-24 md:w-28 opacity-100 mx-2 md:mx-2.5 pointer-events-auto"
                : "w-0 opacity-0 pointer-events-none mx-0"
            }`}
          >
            <div
              ref={volumeBarRef}
              onMouseDown={handleVolumeMouseDown}
              onTouchStart={handleVolumeTouchStart}
              className="w-full py-2 px-1.5 cursor-pointer flex items-center relative group/voltrack"
            >
              <div className="w-full h-1 bg-white/30 group-hover/voltrack:bg-white/40 group-hover/voltrack:h-1.5 transition-all rounded-full relative">
                <div
                  className="absolute inset-y-0 left-0 bg-white rounded-full pointer-events-none"
                  style={{ width: `${state.isMuted ? 0 : state.volume * 100}%` }}
                />
                <div
                  className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-2.5 h-2.5 rounded-full bg-white shadow-sm pointer-events-none"
                  style={{ left: `${state.isMuted ? 0 : state.volume * 100}%` }}
                />
              </div>
            </div>
          </div>

          {/* Volume % Display */}
          <span className="text-xs font-semibold text-white/90 font-mono tracking-tight select-none shrink-0 min-w-[2.2rem] text-right">
            {state.isMuted ? 0 : Math.round(state.volume * 100)}%
          </span>
        </div>
      </div>

      {/* ── DEAD-CENTER PLAYBACK CONTROLS (Apple TV+ Cluster) ── */}
      <div
        data-controls
        className={`absolute inset-0 flex items-center justify-center pointer-events-none z-30 transition-all duration-300 ${
          controlsVisible ? "opacity-100 scale-100" : "opacity-0 scale-95 pointer-events-none"
        }`}
      >
        <div className="flex items-center gap-4 sm:gap-6 md:gap-10 pointer-events-auto" onClick={(e) => e.stopPropagation()}>
          {/* Rewind 10s */}
          <button
            onClick={wpSkipBack}
            className="w-11 h-11 sm:w-13 sm:h-13 md:w-16 md:h-16 glass-md !rounded-full flex items-center justify-center text-white hover:bg-white/15 hover:scale-105 active:scale-95 transition-all shadow-2xl"
            title="Rewind 10 seconds"
          >
            <svg
              className="w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
              <path d="M3 3v5h5" />
              <text
                x="12"
                y="14.5"
                textAnchor="middle"
                fontSize="6.5"
                fontWeight="bold"
                fill="currentColor"
                stroke="none"
              >
                10
              </text>
            </svg>
          </button>

          {/* Center Play / Pause */}
          <button
            onClick={wpTogglePlay}
            className="w-15 h-15 sm:w-18 sm:h-18 md:w-22 md:h-22 glass-heavy !rounded-full flex items-center justify-center text-white hover:bg-white/15 hover:scale-105 active:scale-95 transition-all shadow-[0_10px_40px_rgba(0,0,0,0.5)]"
            title={state.isPlaying ? "Pause (Space)" : "Play (Space)"}
          >
            {state.isPlaying ? (
              <Pause className="w-7 h-7 sm:w-8 sm:h-8 md:w-10 md:h-10 fill-current" />
            ) : (
              <Play className="w-7 h-7 sm:w-8 sm:h-8 md:w-10 md:h-10 fill-current ml-1" />
            )}
          </button>

          {/* Forward 10s */}
          <button
            onClick={wpSkipForward}
            className="w-11 h-11 sm:w-13 sm:h-13 md:w-16 md:h-16 glass-md !rounded-full flex items-center justify-center text-white hover:bg-white/15 hover:scale-105 active:scale-95 transition-all shadow-2xl"
            title="Forward 10 seconds"
          >
            <svg
              className="w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M21 12a9 9 0 1 1-9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
              <path d="M21 3v5h-5" />
              <text
                x="12"
                y="14.5"
                textAnchor="middle"
                fontSize="6.5"
                fontWeight="bold"
                fill="currentColor"
                stroke="none"
              >
                10
              </text>
            </svg>
          </button>
        </div>
      </div>

      {/* ── BOTTOM AREA ── */}
      <div
        data-controls
        className={`absolute bottom-0 left-0 right-0 p-3.5 sm:p-5 md:p-8 pt-12 md:pt-16 bg-gradient-to-t from-black/90 via-black/45 to-transparent z-40 transition-all duration-300 ${
          controlsVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6 pointer-events-none"
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="max-w-7xl mx-auto space-y-2.5 sm:space-y-3">
          {/* Row Above Scrubber: Title Info on Left, Audio/Subtitle Capsule on Right */}
          <div className="flex items-end justify-between gap-3 sm:gap-4">
            <div className="flex flex-col min-w-0 pr-2">
              <span className="text-white/60 text-[11px] sm:text-xs md:text-sm font-medium tracking-wide truncate">
                {eyebrowLabel}
              </span>
              <h2 className="text-white text-base sm:text-xl md:text-2xl font-bold tracking-tight drop-shadow-md truncate">
                {title}
              </h2>
            </div>

            {/* Apple TV+ Control Pill [ ⏱ Speed | ıll Audio | 💬 Subtitles ] */}
            <div className="relative shrink-0">
              <div className="glass-md !rounded-full p-1 sm:p-1.5 flex items-center gap-1 sm:gap-1.5 shadow-lg">
                {/* Playback Speed Button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowSpeedMenu(!showSpeedMenu);
                    setShowAudioMenu(false);
                    setShowSubMenu(false);
                    setShowStreamMenu(false);
                  }}
                  className={`h-7 px-2 flex items-center gap-1 rounded-full text-xs font-semibold transition-all ${
                    speed !== 1 || showSpeedMenu
                      ? "bg-white/20 text-violet-300 shadow-sm"
                      : "text-white/80 hover:text-white hover:bg-white/10"
                  }`}
                  title="Playback Speed"
                >
                  <Gauge className="w-4 h-4" />
                  <span className="text-[11px] font-medium">{speed}x</span>
                </button>

                {/* Audio Tracks Button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowAudioMenu(!showAudioMenu);
                    setShowSubMenu(false);
                    setShowSpeedMenu(false);
                    setShowStreamMenu(false);
                  }}
                  className={`w-7 h-7 flex items-center justify-center rounded-full transition-all ${
                    (state.activeAudioTrack !== null && state.activeAudioTrack > 0) || showAudioMenu
                      ? "bg-white/20 text-violet-300 shadow-sm"
                      : "text-white/80 hover:text-white hover:bg-white/10"
                  }`}
                  title="Audio Options"
                >
                  <AudioWaveform className="w-4 h-4" />
                </button>

                {/* Subtitles Button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowSubMenu(!showSubMenu);
                    setShowAudioMenu(false);
                    setShowSpeedMenu(false);
                    setShowStreamMenu(false);
                  }}
                  className={`w-7 h-7 flex items-center justify-center rounded-full transition-all ${
                    state.activeSubtitle !== null || showSubMenu
                      ? "bg-white/20 text-violet-300 shadow-sm"
                      : "text-white/80 hover:text-white hover:bg-white/10"
                  }`}
                  title="Subtitles"
                >
                  <Subtitles className="w-4 h-4" />
                </button>
              </div>

              {/* Popovers rendered outside the glass-md pill, eliminating nested backdrop-filter clipping */}
              {showSpeedMenu && (
                <div className="absolute bottom-full right-0 mb-3 w-36 glass-md rounded-2xl p-1 shadow-2xl z-50">
                  <div className="px-2.5 py-1 text-[10px] uppercase font-bold tracking-wider text-white/40 border-b border-white/10">
                    Speed
                  </div>
                  {[0.5, 0.75, 1, 1.25, 1.5, 2].map((s) => (
                    <button
                      key={s}
                      onClick={() => handleSpeedSelect(s)}
                      className={`w-full text-left px-2.5 py-1.5 text-xs font-medium rounded-xl flex items-center justify-between transition-colors ${
                        speed === s ? "bg-white/20 text-white font-bold" : "text-white/70 hover:bg-white/10"
                      }`}
                    >
                      <span>{s === 1 ? "1x (Normal)" : `${s}x`}</span>
                      {speed === s && <Check className="w-3.5 h-3.5 text-white" />}
                    </button>
                  ))}
                </div>
              )}

              {showAudioMenu && (
                <AudioMenu
                  tracks={state.audioTracks}
                  activeIndex={state.activeAudioTrack}
                  onSelect={(idx) => {
                    handleAudioSwitch(idx);
                    setShowAudioMenu(false);
                  }}
                  onClose={() => setShowAudioMenu(false)}
                />
              )}

              {showSubMenu && (
                <SubtitleMenu
                  tracks={state.subtitleTracks}
                  activeIndex={state.activeSubtitle}
                  state={state}
                  mediaId={mediaId}
                  onSubtitleDownloaded={fetchSubtitles}
                  onSelect={setActiveSubtitle}
                  onSizeSelect={setSubtitleSize}
                  onColorSelect={setSubtitleColor}
                  onClose={() => setShowSubMenu(false)}
                />
              )}
            </div>
          </div>

          {/* Full-Width Apple Scrubber */}
          <div className="w-full flex items-center gap-2.5 sm:gap-3 select-none">
            <span className="text-white/80 text-[11px] sm:text-xs font-mono font-medium tracking-tight tabular-nums w-11 sm:w-12 text-left shrink-0">
              {formatTime(state.currentTime)}
            </span>

            <div
              ref={scrubberRef}
              onMouseDown={handleScrubberMouseDown}
              onTouchStart={handleScrubberTouchStart}
              onMouseEnter={() => setIsHoveringScrubber(true)}
              onMouseLeave={() => setIsHoveringScrubber(false)}
              onMouseMove={handleScrubberMouseMove}
              className="flex-1 relative h-1 hover:h-2 py-2 transition-all duration-150 cursor-pointer group/scrub flex items-center"
            >
              <div className="w-full h-1 group-hover/scrub:h-1.5 rounded-full bg-white/20 transition-all overflow-hidden relative">
                <div
                  className="absolute inset-y-0 left-0 bg-white/40 rounded-full transition-all duration-150"
                  style={{ width: `${Math.min(100, Math.max(0, bufferedPercent))}%` }}
                />
                <div
                  className="absolute inset-y-0 left-0 bg-white rounded-full shadow-[0_0_8px_rgba(255,255,255,0.7)]"
                  style={{ width: `${Math.min(100, Math.max(0, progressPercent))}%` }}
                />
              </div>

              <div
                className={`absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-3.5 h-3.5 rounded-full bg-white shadow-md pointer-events-none transition-transform duration-100 ${
                  isHoveringScrubber || isDraggingScrubber ? "scale-100" : "scale-0"
                }`}
                style={{ left: `${Math.min(100, Math.max(0, progressPercent))}%` }}
              />

              {isHoveringScrubber && state.duration > 0 && (
                <div
                  className="absolute -top-7 -translate-x-1/2 px-2 py-0.5 rounded-md glass-md text-white text-[11px] font-mono shadow-xl pointer-events-none"
                  style={{ left: `${hoverX}px` }}
                >
                  {formatTime(hoverTime)}
                </div>
              )}
            </div>

            <span className="text-white/80 text-[11px] sm:text-xs font-mono font-medium tracking-tight tabular-nums w-13 sm:w-14 text-right shrink-0">
              {formatRemainingTime(state.currentTime, state.duration)}
            </span>
          </div>

          {/* Bottom Action Pills: [ Info ] [ Stream Mode ] [ Fullscreen ] */}
          <div className="flex items-center gap-2 pt-1">
            <button
              onClick={() => setShowStats(true)}
              className="glass-md !rounded-full px-3 sm:px-4 py-1.5 text-xs font-semibold text-white/90 hover:text-white hover:bg-white/15 transition-all flex items-center gap-1.5 shrink-0"
            >
              <Info className="w-3.5 h-3.5" />
              Info
            </button>

            <div className="relative shrink-0">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowStreamMenu(!showStreamMenu);
                  setShowAudioMenu(false);
                  setShowSubMenu(false);
                  setShowSpeedMenu(false);
                }}
                className={`glass-md !rounded-full px-3 sm:px-4 py-1.5 text-xs font-semibold hover:bg-white/15 transition-all flex items-center gap-1.5 whitespace-nowrap ${
                  streamMode === "direct" ? "text-emerald-300" : "text-violet-300"
                }`}
              >
                <Zap className="w-3.5 h-3.5 fill-current" />
                <span className="hidden sm:inline">
                  {streamMode === "direct" ? "Direct Play" : "Direct Stream (HLS)"}
                </span>
                <span className="inline sm:hidden">
                  {streamMode === "direct" ? "Direct" : "HLS Stream"}
                </span>
              </button>

              {showStreamMenu && (
                <StreamModeMenu
                  currentMode={streamMode}
                  onSelect={(mode) => {
                    switchStreamMode(mode);
                    setShowStreamMenu(false);
                  }}
                  onClose={() => setShowStreamMenu(false)}
                />
              )}
            </div>

            <button
              onClick={toggleFullscreen}
              className="glass-md !rounded-full px-3 sm:px-4 py-1.5 text-xs font-semibold text-white/90 hover:text-white hover:bg-white/15 transition-all ml-auto flex items-center gap-1.5 shrink-0"
              title={state.isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
            >
              {state.isFullscreen ? <Minimize className="w-3.5 h-3.5" /> : <Maximize className="w-3.5 h-3.5" />}
              <span className="hidden sm:inline">{state.isFullscreen ? "Windowed" : "Fullscreen"}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Stats For Nerds Modal */}
      {showStats && (
        <StatsForNerdsModal
          videoRef={videoRef}
          state={state}
          filename={filename}
          mediaId={mediaId}
          streamMode={streamMode}
          needsTranscode={needsTranscode}
          formatTime={formatTime}
          onClose={() => setShowStats(false)}
        />
      )}
    </div>
  );
}
