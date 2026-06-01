"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft, Play, Pause, SkipBack, SkipForward,
  Maximize, Minimize, Subtitles, Volume2,
} from "lucide-react";
import { usePlayer } from "./usePlayer";
import ProgressBar from "./ProgressBar";
import VolumeControl from "./VolumeControl";
import SubtitleMenu from "./SubtitleMenu";
import AudioMenu from "./AudioMenu";
import SkipOverlay from "./SkipOverlay";

interface WatchPartyMode {
  roomCode?: string | null;
  isHost: boolean;
  onPlay: (time: number) => void;
  onPause: (time: number) => void;
  onSeek: (time: number) => void;
  registerVideoRef: (ref: HTMLVideoElement | null) => void;
  registerSeek?: (seekFn: (time: number) => void) => void;
}

interface NetflixPlayerProps {
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

export default function NetflixPlayer({
  mediaId, title, type, season, episodeStart, episodeEnd, filename, exactDuration, initialWatchProgress = 0,
  watchPartyMode,
}: NetflixPlayerProps) {
  const router = useRouter();
  
  const ext = filename.split(".").pop()?.toLowerCase();
  const baseNeedsTranscode = ext === "mkv" || ext === "avi" || ext === "wmv";

  const {
    videoRef, containerRef, state, videoSrc, needsTranscode, transcodeStartTime,
    bindVideoEvents, resetControlsTimer,
    togglePlay, seek, skipBack, skipForward,
    setVolume, toggleMute, toggleFullscreen,
    setActiveSubtitle, setActiveAudioTrack, setCueText,
    setSubtitleSize, setSubtitleColor, showResumeToast,
  } = usePlayer(mediaId, baseNeedsTranscode, exactDuration, initialWatchProgress, watchPartyMode?.roomCode);

  const [showSubMenu, setShowSubMenu] = useState(false);
  const [showAudioMenu, setShowAudioMenu] = useState(false);
  const [switchingAudio, setSwitchingAudio] = useState(false);
  const lastClickTime = useRef(0);
  const lastClickSide = useRef<"left" | "right" | null>(null);

  // Bind video events
  useEffect(() => {
    const cleanup = bindVideoEvents();
    return cleanup;
  }, [bindVideoEvents]);


  // Watch party wrappers — emit socket events on host actions
  const wpTogglePlay = useCallback(() => {
    if (watchPartyMode && !watchPartyMode.isHost) return; // Guest can't control
    togglePlay();
    if (watchPartyMode?.isHost && videoRef.current) {
      const v = videoRef.current;
      // togglePlay will flip the state, so if currently playing, it will pause
      setTimeout(() => {
        if (v.paused) {
          watchPartyMode.onPause(v.currentTime);
        } else {
          watchPartyMode.onPlay(v.currentTime);
        }
      }, 50);
    }
  }, [togglePlay, watchPartyMode]);

  const wpSeek = useCallback((time: number) => {
    if (watchPartyMode && !watchPartyMode.isHost) return;
    seek(time);
    if (watchPartyMode?.isHost) {
      watchPartyMode.onSeek(time);
    }
  }, [seek, watchPartyMode]);

  // Expose the seek callback to the WatchParty container page so seek events
  // correctly trigger player-level seeks with proper start time updates.
  useEffect(() => {
    if (watchPartyMode?.registerSeek) {
      watchPartyMode.registerSeek(wpSeek);
    }
  }, [watchPartyMode, wpSeek]);

  const wpSkipBack = useCallback(() => {
    if (watchPartyMode && !watchPartyMode.isHost) return;
    skipBack();
    if (watchPartyMode?.isHost && videoRef.current) {
      setTimeout(() => watchPartyMode.onSeek(videoRef.current!.currentTime), 50);
    }
  }, [skipBack, watchPartyMode]);

  const wpSkipForward = useCallback(() => {
    if (watchPartyMode && !watchPartyMode.isHost) return;
    skipForward();
    if (watchPartyMode?.isHost && videoRef.current) {
      setTimeout(() => watchPartyMode.onSeek(videoRef.current!.currentTime), 50);
    }
  }, [skipForward, watchPartyMode]);

  const isGuest = watchPartyMode && !watchPartyMode.isHost;

  // Controls auto-hide via mouse movement
  useEffect(() => {
    const handler = () => resetControlsTimer();
    document.addEventListener("mousemove", handler);
    document.addEventListener("touchstart", handler);
    resetControlsTimer();
    return () => {
      document.removeEventListener("mousemove", handler);
      document.removeEventListener("touchstart", handler);
    };
  }, [resetControlsTimer]);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Don't capture if typing in an input
      if (e.target instanceof HTMLInputElement) return;

      switch (e.key) {
        case " ": case "k": e.preventDefault(); wpTogglePlay(); break;
        case "ArrowLeft": e.preventDefault(); wpSkipBack(); break;
        case "ArrowRight": e.preventDefault(); wpSkipForward(); break;
        case "ArrowUp":
          e.preventDefault();
          setVolume(state.volume + 0.1);
          break;
        case "ArrowDown":
          e.preventDefault();
          setVolume(state.volume - 0.1);
          break;
        case "m": e.preventDefault(); toggleMute(); break;
        case "f": e.preventDefault(); toggleFullscreen(); break;
        case "c":
          e.preventDefault();
          if (state.subtitleTracks.length > 0) {
            setActiveSubtitle(state.activeSubtitle !== null ? null : 0);
          }
          break;
        case "Escape":
          e.preventDefault();
          if (showSubMenu) setShowSubMenu(false);
          else if (showAudioMenu) setShowAudioMenu(false);
          else router.back();
          break;
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [
    wpTogglePlay, wpSkipBack, wpSkipForward, setVolume, toggleMute,
    toggleFullscreen, setActiveSubtitle, state.volume,
    state.subtitleTracks, state.activeSubtitle, showSubMenu,
    showAudioMenu, router,
  ]);

  // Subtitle track management — use hidden mode + cuechange
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;

    // Remove existing tracks
    const existing = v.querySelectorAll("track");
    existing.forEach((t) => t.remove());

    if (state.subtitleTracks.length === 0) return;

    // Add tracks
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

      // Set mode
      if (v.textTracks[idx]) {
        v.textTracks[idx].mode = state.activeSubtitle === idx ? "hidden" : "disabled";
      }
    });

    // Listen for cue changes on active track
    const handleCueChange = (e: Event) => {
      const track = e.target as TextTrack;
      if (track.activeCues && track.activeCues.length > 0) {
        const cue = track.activeCues[0] as VTTCue;
        setCueText(cue.text);
      } else {
        setCueText("");
      }
    };

    // Attach cuechange listener to active track
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
  }, [videoRef, state.subtitleTracks, state.activeSubtitle, setCueText, state.activeAudioTrack, needsTranscode, transcodeStartTime]);

  // Handle click to play/pause and double-click to skip
  const handleVideoClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      // Don't toggle on control clicks
      if ((e.target as HTMLElement).closest("[data-controls]")) return;

      const now = Date.now();
      const rect = containerRef.current?.getBoundingClientRect();
      const clickSide: "left" | "right" = rect && e.clientX < rect.left + rect.width / 2 ? "left" : "right";

      if (now - lastClickTime.current < 300 && lastClickSide.current === clickSide) {
        // Double click
        if (clickSide === "left") skipBack();
        else skipForward();
        lastClickTime.current = 0;
      } else {
        // Single click — delay to check for double
        lastClickTime.current = now;
        lastClickSide.current = clickSide;
        setTimeout(() => {
          if (Date.now() - lastClickTime.current >= 280) {
            wpTogglePlay();
          }
        }, 300);
      }
    },
    [containerRef, skipBack, skipForward, togglePlay]
  );

  // Close menus on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (!(e.target as HTMLElement).closest("[data-menu]")) {
        setShowSubMenu(false);
        setShowAudioMenu(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Handle audio track switch
  const handleAudioSwitch = useCallback(
    (index: number) => {
      if (index === state.activeAudioTrack) return;
      setSwitchingAudio(true);
      setActiveAudioTrack(index);
      setTimeout(() => setSwitchingAudio(false), 3000);
    },
    [state.activeAudioTrack, setActiveAudioTrack]
  );

  const formatTime = (s: number) => {
    if (!isFinite(s) || s < 0) return "0:00:00";
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = Math.floor(s % 60);
    return h > 0
      ? `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`
      : `${m}:${String(sec).padStart(2, "0")}`;
  };

  const titleLabel = type === "show" && season
    ? `${title} — S${String(season).padStart(2, "0")}${
        episodeStart === episodeEnd
          ? `E${String(episodeStart).padStart(2, "0")}`
          : `E${String(episodeStart).padStart(2, "0")}–E${String(episodeEnd).padStart(2, "0")}`
      }`
    : title;

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 bg-black select-none"
      style={{ cursor: state.showControls ? "default" : "none" }}
      onClick={handleVideoClick}
    >
      {/* Video */}
      <video
        ref={(el) => {
          // @ts-ignore
          videoRef.current = el;
          if (watchPartyMode?.registerVideoRef) {
            watchPartyMode.registerVideoRef(el);
          }
        }}
        key={`${mediaId}-${state.activeAudioTrack}-${needsTranscode}`}
        src={videoSrc}
        className="w-full h-full object-contain"
        autoPlay
        playsInline
        crossOrigin="anonymous"
      />

      {/* Buffering spinner */}
      {state.isBuffering && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-14 h-14 border-[3px] border-white/30 border-t-white rounded-full animate-spin" />
        </div>
      )}

      {/* Resume toast */}
      {showResumeToast && initialWatchProgress > 0 && (
        <div className="absolute top-24 left-1/2 -translate-x-1/2 bg-black/80 text-white px-6 py-3 rounded-full text-sm font-medium backdrop-blur-md border border-white/10 animate-in fade-in slide-in-from-top-4 duration-500 z-40 pointer-events-none shadow-xl">
          Resuming from {formatTime(initialWatchProgress)}
        </div>
      )}

      {/* Skip overlay animation */}
      <SkipOverlay direction={state.skipAnimation} />

      {/* Switching audio overlay */}
      {switchingAudio && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="bg-black/70 backdrop-blur-sm px-6 py-3 rounded-lg flex items-center gap-3">
            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            <span className="text-white text-sm font-medium">Switching audio...</span>
          </div>
        </div>
      )}

      {/* Custom subtitle rendering */}
      {state.currentCueText && (
        <div className={`absolute left-0 right-0 flex justify-center pointer-events-none px-8 ${
          state.subtitleSize === "small" ? "bottom-16" :
          state.subtitleSize === "large" ? "bottom-28" : "bottom-24"
        }`}>
          <div className="bg-black/70 px-5 py-2 rounded text-center max-w-[80%]">
            <span
              className={`font-medium leading-relaxed drop-shadow-md ${
                state.subtitleSize === "small" ? "text-[1rem]" :
                state.subtitleSize === "large" ? "text-[2rem]" : "text-[1.4rem]"
              } ${
                state.subtitleColor === "yellow" ? "text-[#f3f315]" : "text-white"
              }`}
              dangerouslySetInnerHTML={{ __html: state.currentCueText }}
            />
          </div>
        </div>
      )}

      {/* Top bar */}
      <div
        data-controls
        className={`absolute top-0 left-0 right-0 px-6 pt-5 pb-16 bg-gradient-to-b from-black/80 to-transparent transition-opacity duration-300 ${
          state.showControls ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
      >
        <div className="flex items-center gap-4">
          <button
            onClick={(e) => { e.stopPropagation(); router.back(); }}
            className="p-1 text-white/70 hover:text-white transition-all"
          >
            <ArrowLeft className="w-7 h-7" />
          </button>
          <h1 className="text-white font-semibold text-base md:text-lg truncate">
            {titleLabel}
          </h1>
        </div>
      </div>

      {/* Bottom controls */}
      <div
        data-controls
        className={`absolute bottom-0 left-0 right-0 px-6 md:px-8 pb-5 md:pb-6 pt-20 bg-gradient-to-t from-black/80 to-transparent transition-opacity duration-300 ${
          state.showControls ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Progress bar */}
        <ProgressBar
          currentTime={state.currentTime}
          duration={state.duration}
          bufferedEnd={state.bufferedEnd}
          onSeek={wpSeek}
        />

        {/* Controls row */}
        <div className="flex items-center justify-between mt-1">
          {/* Left group */}
          <div className="flex items-center gap-1 md:gap-2">
            <button
              onClick={wpTogglePlay}
              className="p-1.5 text-white/70 hover:text-white transition-all"
              title={state.isPlaying ? "Pause" : "Play"}
            >
              {state.isPlaying ? (
                <Pause className="w-7 h-7" />
              ) : (
                <Play className="w-7 h-7 fill-white" />
              )}
            </button>

            <button
              onClick={wpSkipBack}
              className="p-1.5 text-white/70 hover:text-white transition-all relative"
              title="Rewind 10s"
            >
              <SkipBack className="w-5 h-5" />
              <span className="absolute inset-0 flex items-center justify-center text-[8px] font-bold mt-0.5">10</span>
            </button>

            <button
              onClick={wpSkipForward}
              className="p-1.5 text-white/70 hover:text-white transition-all relative"
              title="Skip 10s"
            >
              <SkipForward className="w-5 h-5" />
              <span className="absolute inset-0 flex items-center justify-center text-[8px] font-bold mt-0.5">10</span>
            </button>

            <VolumeControl
              volume={state.volume}
              isMuted={state.isMuted}
              onVolumeChange={setVolume}
              onToggleMute={toggleMute}
            />

            <span className="text-white/60 text-xs md:text-sm font-mono ml-2 tabular-nums">
              {formatTime(state.currentTime)} / {formatTime(state.duration)}
            </span>
          </div>

          {/* Right group */}
          <div className="flex items-center gap-1">
            {/* Subtitles */}
            {state.subtitleTracks.length > 0 && (
              <div className="relative" data-menu>
                <button
                  onClick={() => { setShowSubMenu(!showSubMenu); setShowAudioMenu(false); }}
                  className={`p-1.5 transition-all ${
                    state.activeSubtitle !== null ? "text-[#E50914]" : "text-white/70 hover:text-white"
                  }`}
                  title="Subtitles"
                >
                  <Subtitles className="w-5 h-5" />
                </button>
                {showSubMenu && (
                  <SubtitleMenu
                    tracks={state.subtitleTracks}
                    activeIndex={state.activeSubtitle}
                    state={state}
                    onSelect={setActiveSubtitle}
                    onSizeSelect={setSubtitleSize}
                    onColorSelect={setSubtitleColor}
                    onClose={() => setShowSubMenu(false)}
                  />
                )}
              </div>
            )}

            {/* Audio tracks */}
            {state.audioTracks.length > 1 && (
              <div className="relative" data-menu>
                <button
                  onClick={() => { setShowAudioMenu(!showAudioMenu); setShowSubMenu(false); }}
                  className="flex items-center gap-1 p-1.5 text-white/70 hover:text-white transition-all text-xs"
                  title="Audio Track"
                >
                  <Volume2 className="w-5 h-5" />
                  <span className="hidden md:inline text-[11px] font-medium uppercase tracking-wide">
                    {state.audioTracks[state.activeAudioTrack]?.label?.slice(0, 8) || "Audio"}
                  </span>
                </button>
                {showAudioMenu && (
                  <AudioMenu
                    tracks={state.audioTracks}
                    activeIndex={state.activeAudioTrack}
                    onSelect={handleAudioSwitch}
                    onClose={() => setShowAudioMenu(false)}
                  />
                )}
              </div>
            )}

            {/* Fullscreen */}
            <button
              onClick={toggleFullscreen}
              className="p-1.5 text-white/70 hover:text-white transition-all"
              title={state.isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
            >
              {state.isFullscreen ? (
                <Minimize className="w-5 h-5" />
              ) : (
                <Maximize className="w-5 h-5" />
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
