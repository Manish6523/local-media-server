"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Maximize,
  Minimize,
  Subtitles,
  Volume2,
} from "lucide-react";
import { usePlayer } from "./usePlayer";
import ProgressBar from "./ProgressBar";
import VolumeControl from "./VolumeControl";
import SubtitleMenu from "./SubtitleMenu";
import AudioMenu from "./AudioMenu";
import SkipOverlay from "./SkipOverlay";
import CastButton from "./CastButton";

interface WatchPartyMode {
  roomCode?: string | null;
  isHost: boolean;
  onPlay: (time: number) => void;
  onPause: (time: number) => void;
  onSeek: (time: number) => void;
  registerVideoRef: (ref: HTMLVideoElement | null) => void;
  registerSeek?: (seekFn: (time: number) => void) => void;
  registerTranscodeStart?: (startTime: number) => void;
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
}: NetflixPlayerProps) {
  const router = useRouter();

  const NATIVE_FORMATS = ["mp4", "m4v", "mov", "webm"];
  const ext = filename.split(".").pop()?.toLowerCase() || "";
  const baseNeedsTranscode = !NATIVE_FORMATS.includes(ext);

  console.log('[Player] File:', filename);
  console.log('[Player] Extension:', ext);
  console.log('[Player] Needs transcode:', baseNeedsTranscode);

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
  } = usePlayer(
    mediaId,
    baseNeedsTranscode,
    exactDuration,
    initialWatchProgress,
    watchPartyMode?.roomCode,
  );

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
    if (watchPartyMode?.isHost && videoRef.current) {
      const v = videoRef.current;
      const absoluteTime = needsTranscode
        ? transcodeStartTime + v.currentTime
        : v.currentTime;
      // Emit intent ONLY; execution happens via scheduled socket event
      if (!v.paused) {
        watchPartyMode.onPause(absoluteTime);
      } else {
        watchPartyMode.onPlay(absoluteTime);
      }
    } else {
      togglePlay();
    }
  }, [togglePlay, watchPartyMode, needsTranscode, transcodeStartTime]);

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

  // Expose the seek callback to the WatchParty container page so seek events
  // correctly trigger player-level seeks with proper start time updates.
  useEffect(() => {
    if (watchPartyMode?.registerSeek) {
      watchPartyMode.registerSeek(seek);
    }
  }, [watchPartyMode, seek]);

  // Push transcodeStartTime to the watch party page so guest sync handlers
  // can convert between absolute and relative time domains.
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
  }, [skipBack, watchPartyMode, needsTranscode, transcodeStartTime]);

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
  }, [skipForward, watchPartyMode, needsTranscode, transcodeStartTime]);

  const isGuest = watchPartyMode && !watchPartyMode.isHost;

  // Controls auto-hide via mouse movement
  useEffect(() => {
    const handler = (e: MouseEvent | TouchEvent) => {
      // If mouse is within the left 50px strip, keep controls hidden immediately
      if (e instanceof MouseEvent && e.clientX <= 50) {
        forceHideControls();
        return;
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
  }, [resetControlsTimer, forceHideControls]);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Don't capture if typing in an input
      if (e.target instanceof HTMLInputElement) return;

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
          setVolume(state.volume + 0.1);
          break;
        case "ArrowDown":
          e.preventDefault();
          setVolume(state.volume - 0.1);
          break;
        case "m":
          e.preventDefault();
          toggleMute();
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
          if (showSubMenu) setShowSubMenu(false);
          else if (showAudioMenu) setShowAudioMenu(false);
          else router.back();
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
    showSubMenu,
    showAudioMenu,
    router,
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
        trackUrl +=
          (trackUrl.includes("?") ? "&" : "?") + `start=${transcodeStartTime}`;
      }
      track.src = trackUrl;

      v.appendChild(track);

      // Set mode
      if (v.textTracks[idx]) {
        v.textTracks[idx].mode =
          state.activeSubtitle === idx ? "hidden" : "disabled";
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
      // Don't toggle on control clicks
      if ((e.target as HTMLElement).closest("[data-controls]")) return;

      const now = Date.now();
      const rect = containerRef.current?.getBoundingClientRect();
      const clickSide: "left" | "right" =
        rect && e.clientX < rect.left + rect.width / 2 ? "left" : "right";

      if (
        now - lastClickTime.current < 300 &&
        lastClickSide.current === clickSide
      ) {
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
            const isTouch = window.matchMedia("(pointer: coarse)").matches;
            if (!isTouch) {
              wpTogglePlay();
            }
          }
        }, 300);
      }
    },
    [containerRef, skipBack, skipForward, togglePlay],
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
    [state.activeAudioTrack, setActiveAudioTrack],
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

  const titleLabel =
    type === "show" && season
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
        x-webkit-airplay="allow"
        ref={(el) => {
          // @ts-ignore
          videoRef.current = el;
          if (watchPartyMode?.registerVideoRef) {
            watchPartyMode.registerVideoRef(el);
          }
        }}
        key={`${mediaId}-${state.activeAudioTrack}-${needsTranscode}`}
        src={needsTranscode ? undefined : videoSrc}
        className="w-full h-full object-contain"
        autoPlay
        playsInline
        crossOrigin="anonymous"
      />

      {/* Desktop-only: transparent auto-hide overlay
          When mouse hovers and stops on this div, it triggers controls to hide.
          Mouse movement re-shows them via resetControlsTimer. */}
      <div
        data-controls
        className="hidden md:block absolute top-0 bottom-0 left-0 w-[50px] z-[999] bg-transparent"
        style={{ pointerEvents: state.showControls ? "auto" : "none" }}
        onMouseEnter={forceHideControls}
      />

      {/* Buffering spinner */}
      {state.isBuffering && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
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
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
          <div className="bg-black/70 backdrop-blur-sm px-6 py-3 rounded-lg flex items-center gap-3">
            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            <span className="text-white text-sm font-medium">
              Switching audio...
            </span>
          </div>
        </div>
      )}

      {/* Custom subtitle rendering */}
      {state.currentCueText && (
        <div
          className={`absolute left-0 right-0 flex justify-center pointer-events-none px-8 z-20 ${
            state.subtitleSize === "small"
              ? "bottom-10 md:bottom-10"
              : state.subtitleSize === "large"
                ? "bottom-28 md:bottom-24"
                : "bottom-24 md:bottom-20"
          }`}
        >
          <div className="bg-black/70 px-5 py-2 rounded text-center max-w-[80%]">
            <span
              className={`font-medium leading-relaxed drop-shadow-md ${
                state.subtitleSize === "small"
                  ? "text-[0.85rem] md:text-[1rem]"
                  : state.subtitleSize === "large"
                    ? "text-[1.4rem] md:text-[2rem]"
                    : "text-[1.1rem] md:text-[1.4rem]"
              } ${
                state.subtitleColor === "yellow"
                  ? "text-[#f3f315]"
                  : "text-white"
              }`}
              dangerouslySetInnerHTML={{ __html: state.currentCueText }}
            />
          </div>
        </div>
      )}

      {/* Top bar */}
      <div
        data-controls
        className={`absolute top-0 left-0 right-0 px-6 pt-6 pb-20 bg-gradient-to-b from-black/80 via-black/40 to-transparent transition-all duration-300 ${
          state.showControls
            ? "opacity-100 translate-y-0"
            : "opacity-0 -translate-y-4 pointer-events-none"
        }`}
      >
        <div className="flex items-center gap-4 max-w-7xl mx-auto">
          <button
            onClick={(e) => {
              e.stopPropagation();
              router.back();
            }}
            className="p-2 bg-black/40 hover:bg-white/20 backdrop-blur-md rounded-full text-white transition-all border border-white/10"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <h1 className="text-white font-bold text-lg md:text-xl truncate drop-shadow-md">
            {titleLabel}
          </h1>
        </div>
      </div>

      {/* ═══ MOBILE Bottom Controls ═══ */}
      <div
        data-controls
        className={`md:hidden absolute bottom-0 left-0 right-0 transition-all duration-300 z-30 ${
          state.showControls
            ? "opacity-100 translate-y-0"
            : "opacity-0 translate-y-4 pointer-events-none"
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── LANDSCAPE: Ultra-compact single bar ── */}
        <div className="hidden landscape:flex flex-col px-3 pb-2 pt-10 bg-gradient-to-t from-black/80 via-black/40 to-transparent">
          {/* Progress bar */}
          <ProgressBar
            currentTime={state.currentTime}
            duration={state.duration}
            bufferedEnd={state.bufferedEnd}
            onSeek={wpSeek}
          />

          {/* Single row: all controls */}
          <div className="flex items-center gap-2 mt-1.5">
            {/* Play/Pause */}
            <button
              onClick={wpTogglePlay}
              className="w-9 h-9 flex items-center justify-center rounded-full bg-white text-black active:scale-90 transition-transform shrink-0"
            >
              {state.isPlaying ? (
                <Pause className="w-4 h-4 fill-current" />
              ) : (
                <Play className="w-4 h-4 fill-current ml-0.5" />
              )}
            </button>

            {/* Skip controls */}
            <button
              onClick={wpSkipBack}
              className="p-1.5 text-white/60 active:text-white transition-all"
            >
              <SkipBack className="w-4 h-4" />
            </button>
            <button
              onClick={wpSkipForward}
              className="p-1.5 text-white/60 active:text-white transition-all"
            >
              <SkipForward className="w-4 h-4" />
            </button>

            {/* Volume */}
            <VolumeControl
              volume={state.volume}
              isMuted={state.isMuted}
              onVolumeChange={setVolume}
              onToggleMute={toggleMute}
            />

            {/* Time */}
            <span className="text-white/50 text-[11px] font-mono tabular-nums ml-auto">
              {formatTime(state.currentTime)}{" "}
              <span className="text-white/25">/</span>{" "}
              {formatTime(state.duration)}
            </span>

            {/* Subtitles (landscape) */}
            {state.subtitleTracks.length > 0 && (
              <div className="relative" data-menu>
                <button
                  onClick={() => {
                    setShowSubMenu(!showSubMenu);
                    setShowAudioMenu(false);
                  }}
                  className={`p-1.5 rounded-full transition-all ${
                    state.activeSubtitle !== null
                      ? "text-violet-400"
                      : "text-white/50 active:text-white"
                  }`}
                >
                  <Subtitles className="w-4 h-4" />
                </button>
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
            )}

            {/* Audio (landscape) */}
            {state.audioTracks.length > 1 && (
              <div className="relative" data-menu>
                <button
                  onClick={() => {
                    setShowAudioMenu(!showAudioMenu);
                    setShowSubMenu(false);
                  }}
                  className="p-1.5 rounded-full text-white/50 active:text-white transition-all"
                >
                  <Volume2 className="w-4 h-4" />
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

            <CastButton videoRef={videoRef} videoSrc={videoSrc} title={title} />
            
            {/* Fullscreen */}
            <button
              onClick={toggleFullscreen}
              className="p-1.5 text-white/50 active:text-white transition-all ml-1"
            >
              {state.isFullscreen ? (
                <Minimize className="w-4 h-4" />
              ) : (
                <Maximize className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>

        {/* ── PORTRAIT: Clean vertical layout ── */}
        <div className="flex landscape:hidden flex-col px-4 pb-5 pt-16 bg-gradient-to-t from-black/90 via-black/50 to-transparent">
          {/* Progress bar */}
          <ProgressBar
            currentTime={state.currentTime}
            duration={state.duration}
            bufferedEnd={state.bufferedEnd}
            onSeek={wpSeek}
          />

          {/* Time */}
          <div className="flex items-center justify-between mt-2 mb-3">
            <span className="text-white/60 text-xs font-mono tabular-nums">
              {formatTime(state.currentTime)}
            </span>
            <span className="text-white/40 text-xs font-mono tabular-nums">
              {formatTime(state.duration)}
            </span>
          </div>

          {/* Control buttons row */}
          <div className="flex items-center justify-between">
            {/* Left: volume */}
            <VolumeControl
              volume={state.volume}
              isMuted={state.isMuted}
              onVolumeChange={setVolume}
              onToggleMute={toggleMute}
            />

            {/* Center cluster: subs, skip back, play/pause, skip forward, audio */}
            <div className="flex items-center gap-3">
              {/* Subtitles */}
              {state.subtitleTracks.length > 0 && (
                <div className="relative" data-menu>
                  <button
                    onClick={() => {
                      setShowSubMenu(!showSubMenu);
                      setShowAudioMenu(false);
                    }}
                    className={`p-2 rounded-full transition-all ${
                      state.activeSubtitle !== null
                        ? "text-violet-400 bg-violet-500/10"
                        : "text-white/50 active:text-white"
                    }`}
                  >
                    <Subtitles className="w-5 h-5" />
                  </button>
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
              )}

              <button
                onClick={wpSkipBack}
                className="p-2 text-white/60 active:text-white transition-all"
              >
                <SkipBack className="w-5 h-5" />
              </button>

              <button
                onClick={wpTogglePlay}
                className="w-14 h-14 flex items-center justify-center rounded-full bg-white text-black active:scale-95 transition-transform"
              >
                {state.isPlaying ? (
                  <Pause className="w-7 h-7 fill-current" />
                ) : (
                  <Play className="w-7 h-7 fill-current ml-1" />
                )}
              </button>

              <button
                onClick={wpSkipForward}
                className="p-2 text-white/60 active:text-white transition-all"
              >
                <SkipForward className="w-5 h-5" />
              </button>

              {/* Audio tracks */}
              {state.audioTracks.length > 1 && (
                <div className="relative" data-menu>
                  <button
                    onClick={() => {
                      setShowAudioMenu(!showAudioMenu);
                      setShowSubMenu(false);
                    }}
                    className="p-2 rounded-full text-white/50 active:text-white transition-all"
                  >
                    <Volume2 className="w-5 h-5" />
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
            </div>

            <CastButton videoRef={videoRef} videoSrc={videoSrc} title={title} />

            {/* Right: fullscreen */}
            <button
              onClick={toggleFullscreen}
              className="p-2 text-white/60 active:text-white transition-all ml-1"
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

      {/* ═══ DESKTOP Bottom Controls - Floating Pill ═══ */}
      <div
        data-controls
        className={`hidden md:block absolute bottom-6 left-1/2 -translate-x-1/2 w-[95%] max-w-5xl px-6 py-4 rounded-3xl bg-black/60 backdrop-blur-xl border border-white/10 shadow-2xl transition-all duration-300 z-30 ${
          state.showControls
            ? "opacity-100 translate-y-0"
            : "opacity-0 translate-y-8 pointer-events-none"
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
        <div className="flex items-center justify-between mt-3">
          {/* Left group */}
          <div className="flex items-center gap-4">
            <button
              onClick={wpTogglePlay}
              className="w-12 h-12 flex items-center justify-center rounded-full bg-white text-black hover:scale-105 transition-transform"
              title={state.isPlaying ? "Pause" : "Play"}
            >
              {state.isPlaying ? (
                <Pause className="w-6 h-6 fill-current" />
              ) : (
                <Play className="w-6 h-6 fill-current ml-1" />
              )}
            </button>

            <div className="flex items-center gap-1 bg-white/5 rounded-full px-2 py-1 border border-white/10">
              <button
                onClick={wpSkipBack}
                className="p-2 text-white/70 hover:text-white transition-all relative"
                title="Rewind 10s"
              >
                <SkipBack className="w-5 h-5" />
                {/* <span className="absolute inset-0 flex items-center justify-center text-[9px] font-bold mt-0.5">10</span> */}
              </button>

              <button
                onClick={wpSkipForward}
                className="p-2 text-white/70 hover:text-white transition-all relative"
                title="Skip 10s"
              >
                <SkipForward className="w-5 h-5" />
                {/* <span className="absolute inset-0 flex items-center justify-center text-[9px] font-bold mt-0.5">10</span> */}
              </button>
            </div>

            <VolumeControl
              volume={state.volume}
              isMuted={state.isMuted}
              onVolumeChange={setVolume}
              onToggleMute={toggleMute}
            />

            <span className="text-white/80 text-sm font-medium font-mono ml-2 tabular-nums">
              {formatTime(state.currentTime)}{" "}
              <span className="text-white/40 mx-1">/</span>{" "}
              {formatTime(state.duration)}
            </span>
          </div>

          {/* Right group */}
          <div className="flex items-center gap-2">
            {/* Subtitles */}
            {state.subtitleTracks.length > 0 && (
              <div className="relative" data-menu>
                <button
                  onClick={() => {
                    setShowSubMenu(!showSubMenu);
                    setShowAudioMenu(false);
                  }}
                  className={`p-2 rounded-full transition-all border ${
                    state.activeSubtitle !== null
                      ? "bg-primary/20 text-primary border-primary/30"
                      : "bg-white/5 text-white/70 hover:text-white border-white/10 hover:bg-white/10"
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
                    mediaId={mediaId}
                    onSubtitleDownloaded={fetchSubtitles}
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
                  onClick={() => {
                    setShowAudioMenu(!showAudioMenu);
                    setShowSubMenu(false);
                  }}
                  className="flex items-center gap-2 p-2 px-3 rounded-full bg-white/5 border border-white/10 text-white/70 hover:text-white hover:bg-white/10 transition-all"
                  title="Audio Track"
                >
                  <Volume2 className="w-5 h-5" />
                  <span className="hidden md:inline text-[12px] font-bold tracking-wider">
                    {state.audioTracks[state.activeAudioTrack]?.label?.slice(
                      0,
                      8,
                    ) || "AUDIO"}
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

            <CastButton 
              videoRef={videoRef} 
              videoSrc={videoSrc} 
              title={title} 
              className="p-2 rounded-full bg-white/5 border border-white/10 text-white/70 hover:text-white hover:bg-white/10 transition-all"
              iconClassName="w-5 h-5"
            />

            {/* Fullscreen */}
            <button
              onClick={toggleFullscreen}
              className="p-2 rounded-full bg-white/5 border border-white/10 text-white/70 hover:text-white hover:bg-white/10 transition-all ml-2"
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
