"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import NetflixPlayer from "@/components/Player/NetflixPlayer";
import ChatPanel from "@/components/WatchParty/ChatPanel";
import SyncOverlay from "@/components/WatchParty/SyncOverlay";
import { useWatchParty } from "@/hooks/useWatchParty";

interface MediaEntry {
  id: number;
  type: "movie" | "show";
  title: string;
  season: number | null;
  episode_start: number | null;
  episode_end: number | null;
  available: number;
  filename: string;
  exactDuration?: number;
  watch_progress: number;
  poster?: string | null;
}

export default function WatchPartyPage() {
  const params = useParams();
  const router = useRouter();
  const roomCode = (params.roomCode as string).toUpperCase();

  const {
    isConnected,
    members,
    messages,
    isHost,
    mediaId: hookMediaId,
    playbackState,
    waitingForReady,
    joinRoom,
    rejoinRoom,
    emitPlayback,
    emitReady,
    sendMessage,
    onPlaybackSync,
    offPlaybackSync,
    onSyncTick,
    offSyncTick,
    onAllReady,
    offAllReady,
  } = useWatchParty(true);

  const [media, setMedia] = useState<MediaEntry | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [joined, setJoined] = useState(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const joinAttempted = useRef(false);
  const playerSeekRef = useRef<((time: number) => void) | null>(null);
  // Tracks the guest's current transcode start offset.
  // When transcoding, video.currentTime is relative to this offset.
  // Absolute time = transcodeStartTimeRef + video.currentTime
  const transcodeStartTimeRef = useRef(0);
  // Guard: blocks all sync events until guest video has loaded and initial seek is done
  const isInitialLoad = useRef(true);

  const registerVideoRef = useCallback((ref: HTMLVideoElement | null) => {
    videoRef.current = ref;
  }, []);

  // Resolve mediaId: from hook state OR sessionStorage fallback
  const resolvedMediaId =
    hookMediaId ||
    (() => {
      if (typeof window === "undefined") return null;
      const stored = sessionStorage.getItem("wp_mediaId");
      return stored ? parseInt(stored) : null;
    })();

  // Determine if host from sessionStorage (initial load before socket connects)
  const effectiveIsHost =
    isHost ||
    (() => {
      if (typeof window === "undefined") return false;
      return sessionStorage.getItem("wp_isHost") === "true";
    })();

  // Host never has an initial load guard
  useEffect(() => {
    if (effectiveIsHost) {
      isInitialLoad.current = false;
    }
  }, [effectiveIsHost]);

  // ── Join / Rejoin logic ────────────────────────────────────────
  useEffect(() => {
    if (!isConnected) return;
    if (joined || joinAttempted.current) return;

    const wpIsHost = sessionStorage.getItem("wp_isHost");
    const wpName = sessionStorage.getItem("wp_name");
    const wpRoomCode = sessionStorage.getItem("wp_roomCode");

    if (wpIsHost === "true" && wpRoomCode === roomCode) {
      // Host: rejoin to update socket ID after navigation
      joinAttempted.current = true;
      (async () => {
        const result = await rejoinRoom(roomCode, wpName || "Host");
        if (result.success) {
          setJoined(true);
        } else {
          // Room expired, create flow again
          setError("Room expired. Please create a new watch party.");
        }
      })();
      return;
    }

    if (!wpName) {
      router.push(`/join/${roomCode}`);
      return;
    }

    // Guest — join room (only once!)
    joinAttempted.current = true;
    (async () => {
      const result = await joinRoom(roomCode, wpName);
      if (result.success) {
        setJoined(true);
      } else {
        setError(result.error || "Failed to join room");
      }
    })();
  }, [isConnected, joined, roomCode, joinRoom, rejoinRoom, router]);

  // ── Fetch media when we have a mediaId ─────────────────────────
  useEffect(() => {
    if (!resolvedMediaId) return;
    if (media) return;

    fetch(`/api/media?id=${resolvedMediaId}`)
      .then((r) => {
        if (!r.ok) throw new Error("Media not found");
        return r.json();
      })
      .then((data) => setMedia(data))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [resolvedMediaId, media]);

  // ── Helper: validate timestamp before using it ─────────────────
  function isValidTimestamp(time: number, video?: HTMLVideoElement): boolean {
    if (typeof time !== "number" || !isNaN(time) === false) return false;
    if (!isFinite(time) || time < 0 || time > 86400) return false;
    return true;
  }

  function isVideoReady(video: HTMLVideoElement): boolean {
    // readyState >= 2 (HAVE_CURRENT_DATA) means metadata + some data loaded
    return video.readyState >= 2 && isFinite(video.duration);
  }

  // ── Playback sync for guests (play/pause/seek events) ──────────
  useEffect(() => {
    if (effectiveIsHost) return;

    onPlaybackSync(({ type, currentTime }) => {
      const video = videoRef.current;
      if (!video) return;

      // Block ALL sync events during initial load
      if (isInitialLoad.current) {
        console.log(
          `[Guest] Blocked sync during initial load: ${type} @ ${currentTime}`,
        );
        return;
      }

      // Validate timestamp (absolute)
      if (!isValidTimestamp(currentTime, video)) {
        console.warn(
          `[Guest] Rejected invalid sync: ${type} @ ${currentTime}`,
        );
        return;
      }

      // Convert absolute sync time to relative video time
      const offset = transcodeStartTimeRef.current;
      const relativeTime = currentTime - offset;
      const myAbsoluteTime = offset + (video.currentTime || 0);
      const diff = Math.abs(myAbsoluteTime - currentTime);
      console.log(
        `[Sync] Received: ${type} @ ${currentTime.toFixed(2)} (abs), relative=${relativeTime.toFixed(2)}, myAbs=${myAbsoluteTime.toFixed(2)}, diff=${diff.toFixed(2)}, offset=${offset.toFixed(2)}`,
      );

      if (type === "seek") {
        setSyncing(true);
        // Full seek = new transcode from this absolute position
        video.pause();
        transcodeStartTimeRef.current = currentTime; // Update offset
        if (playerSeekRef.current) {
          playerSeekRef.current(currentTime);
        } else {
          video.currentTime = 0; // Will restart from new transcode
        }
        // Wait for seeked event before reporting ready
        const onSeeked = () => {
          console.log(`[Guest] Seek complete, calling emitReady`);
          emitReady();
          setSyncing(false);
          video.removeEventListener("seeked", onSeeked);
        };
        video.addEventListener("seeked", onSeeked);
        // Fallback: report ready after 10s even if seeked never fires
        setTimeout(() => {
          video.removeEventListener("seeked", onSeeked);
          console.log(`[Guest] Seek timeout fallback, calling emitReady`);
          emitReady();
          setSyncing(false);
        }, 10000);
      } else if (type === "play") {
        // For play: adjust video.currentTime in-place if the relative time
        // is within the current buffer, otherwise do a full seek
        if (relativeTime >= 0 && relativeTime < (video.duration || Infinity)) {
          video.currentTime = relativeTime;
        } else {
          // Relative time is outside current buffer — need full transcode seek
          transcodeStartTimeRef.current = currentTime;
          if (playerSeekRef.current) playerSeekRef.current(currentTime);
        }
        video.play().catch(() => {});
      } else if (type === "pause") {
        // Set time BEFORE pausing so guest pauses at host's exact frame
        if (relativeTime >= 0 && relativeTime < (video.duration || Infinity)) {
          video.currentTime = relativeTime;
        } else {
          transcodeStartTimeRef.current = currentTime;
          if (playerSeekRef.current) playerSeekRef.current(currentTime);
        }
        video.pause();
      }
    });

    return () => offPlaybackSync();
  }, [effectiveIsHost, onPlaybackSync, offPlaybackSync, emitReady]);

  // ── Sync tick: drift correction for guests (every 10s) ──────────
  useEffect(() => {
    if (effectiveIsHost) return;

    onSyncTick(({ isPlaying, currentTime }) => {
      const video = videoRef.current;
      if (!video) return;

      // Block sync ticks during initial load
      if (isInitialLoad.current) return;

      // Don't process if video isn't ready
      if (!isVideoReady(video)) return;

      // Validate timestamp (absolute)
      if (!isValidTimestamp(currentTime, video)) return;

      // Convert to absolute guest time for comparison
      const offset = transcodeStartTimeRef.current;
      const myAbsoluteTime = offset + video.currentTime;
      const drift = myAbsoluteTime - currentTime;
      const absDrift = Math.abs(drift);

      console.log(
        `[Sync] Tick: hostAbs=${currentTime.toFixed(2)}, myAbs=${myAbsoluteTime.toFixed(2)}, drift=${drift.toFixed(2)}, offset=${offset.toFixed(2)}`,
      );

      if (absDrift > 15) {
        // Very large drift: need full transcode restart at new position
        console.log(`[Sync] LARGE drift=${drift.toFixed(2)}s — full transcode seek to ${currentTime.toFixed(2)}`);
        transcodeStartTimeRef.current = currentTime;
        if (playerSeekRef.current) {
          playerSeekRef.current(currentTime);
        }
      } else if (absDrift > 2) {
        // Medium drift: adjust video.currentTime in-place (no new transcode)
        const relativeTarget = currentTime - offset;
        if (relativeTarget >= 0 && relativeTarget < (video.duration || Infinity)) {
          console.log(`[Sync] In-place correction: drift=${drift.toFixed(2)}s, setting relative=${relativeTarget.toFixed(2)}`);
          video.currentTime = relativeTarget;
        } else {
          // Target outside buffer, need full seek
          console.log(`[Sync] Drift correction needs full seek (relative=${relativeTarget.toFixed(2)} outside buffer)`);
          transcodeStartTimeRef.current = currentTime;
          if (playerSeekRef.current) playerSeekRef.current(currentTime);
        }
      }
      // Drift < 2 seconds: normal network variance, ignore

      // Sync play/pause state
      if (isPlaying && video.paused) {
        console.log(`[Sync] Resuming playback (host is playing)`);
        video.play().catch(() => {});
      } else if (!isPlaying && !video.paused) {
        console.log(`[Sync] Pausing playback (host is paused)`);
        video.pause();
      }
    });

    return () => offSyncTick();
  }, [effectiveIsHost, onSyncTick, offSyncTick]);

  // ── Handle all-ready: resume playback ──────────────────────────
  useEffect(() => {
    onAllReady(({ state }) => {
      const video = videoRef.current;
      if (!video) return;

      // Don't process during initial load
      if (isInitialLoad.current) return;

      if (isValidTimestamp(state.currentTime, video)) {
        // Convert absolute time to relative for in-place adjustment
        const offset = transcodeStartTimeRef.current;
        const relativeTime = state.currentTime - offset;
        console.log(`[Guest] all-ready: abs=${state.currentTime.toFixed(2)}, relative=${relativeTime.toFixed(2)}, offset=${offset.toFixed(2)}`);
        if (relativeTime >= 0 && relativeTime < (video.duration || Infinity)) {
          video.currentTime = relativeTime;
        } else {
          // Need full transcode seek
          transcodeStartTimeRef.current = state.currentTime;
          if (playerSeekRef.current) playerSeekRef.current(state.currentTime);
        }
      }
      if (state.isPlaying) {
        video.play().catch(() => {});
      }
      setSyncing(false);
    });

    return () => offAllReady();
  }, [onAllReady, offAllReady]);

  // ── Initial sync for guests ────────────────────────────────────
  // Guest starts from position 0. Wait for canplay, THEN seek to host position.
  useEffect(() => {
    if (effectiveIsHost) return;
    if (!playbackState) return;
    if (!isInitialLoad.current) return;
    if (!videoRef.current) return;
    const video = videoRef.current;
    const targetTime = playbackState.currentTime;

    console.log(`[Guest] Initial sync: target=${targetTime}`);

    // If target is near 0, just start playing immediately
    if (targetTime < 5) {
      console.log(`[Guest] targetTime < 5, immediate start, calling emitReady`);
      isInitialLoad.current = false;
      emitReady();
      if (playbackState.isPlaying) video.play().catch(() => {});
      return;
    }

    const doSeek = () => {
      const vid = videoRef.current
      if (!vid) return

      console.log(`[Guest] Seeking immediately to ${targetTime}`)
      if (playerSeekRef.current) {
        playerSeekRef.current(targetTime)
      } else {
        vid.currentTime = targetTime
      }

      vid.addEventListener('seeked', () => {
        if (!isInitialLoad.current) return
        console.log(`[Guest] Seeked complete, unblocking sync, calling emitReady`)
        isInitialLoad.current = false
        emitReady()
        if (playbackState.isPlaying) vid.play().catch(() => {})
      }, { once: true })

      // Fallback if seeked never fires within 15 seconds
      setTimeout(() => {
        if (isInitialLoad.current) {
          console.log(`[Guest] Seek timeout fallback, unblocking`)
          isInitialLoad.current = false
          emitReady()
          if (playbackState.isPlaying) vid.play().catch(() => {})
        }
      }, 15000)
    }

    // If video metadata already loaded, seek immediately
    // Otherwise wait for loadedmetadata first
    const vid = videoRef.current
    if (vid && vid.readyState >= 1) {
      doSeek()
    } else if (vid) {
      vid.addEventListener('loadedmetadata', doSeek, { once: true })
    }
  }, [effectiveIsHost, playbackState, emitReady]);

  // ── Host auto-reports ready on seek ────────────────────────────
  // Host is already auto-marked as ready on the server.
  // Just listen for seek events to update local playback position.
  useEffect(() => {
    if (!effectiveIsHost) return;

    onPlaybackSync(({ type, currentTime }) => {
      if (type === "seek") {
        // Host initiated the seek — just confirm position and emit ready
        emitReady();
      }
    });

    return () => offPlaybackSync();
  }, [effectiveIsHost, onPlaybackSync, offPlaybackSync, emitReady]);

  if (loading && !media) {
    return (
      <div className="fixed inset-0 bg-black flex items-center justify-center">
        <div className="w-14 h-14 border-[3px] border-white/30 border-t-white rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !media) {
    return (
      <div className="fixed inset-0 bg-black flex items-center justify-center">
        <div className="text-center">
          <p className="text-white/60 text-lg mb-4">{error || "Not found"}</p>
          <Link
            href="/"
            className="text-[#E50914] hover:text-[#f6121d] transition-colors"
          >
            ← Go back home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black flex">
      <div className="flex-1 relative">
        <NetflixPlayer
          mediaId={String(media.id)}
          title={media.title}
          type={media.type}
          season={media.season}
          episodeStart={media.episode_start}
          episodeEnd={media.episode_end}
          filename={media.filename}
          exactDuration={media.exactDuration || 0}
          initialWatchProgress={0}
          watchPartyMode={{
            roomCode,
            isHost: effectiveIsHost,
            onPlay: (time) => {
              if (typeof time === "number" && isFinite(time) && time > 1) emitPlayback("play", time);
            },
            onPause: (time) => {
              if (typeof time === "number" && isFinite(time) && time > 1) emitPlayback("pause", time);
            },
            onSeek: (time) => {
              if (typeof time === "number" && isFinite(time) && time > 1) emitPlayback("seek", time);
            },
            registerVideoRef,
            registerSeek: (seekFn) => {
              playerSeekRef.current = seekFn;
            },
            registerTranscodeStart: (startTime: number) => {
              transcodeStartTimeRef.current = startTime;
            },
          }}
        />
        {/* Host never sees sync overlay — they always play immediately.
            Guest sees brief 'Syncing...' overlay during seek. */}
        {!effectiveIsHost && <SyncOverlay visible={syncing} />}

        {!effectiveIsHost && (
          <div className="absolute top-4 right-4 z-30 bg-black/60 backdrop-blur-sm px-3 py-1.5 rounded-full text-white/60 text-xs flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            Host controls playback
          </div>
        )}
      </div>

      <ChatPanel
        members={members}
        messages={messages}
        onSendMessage={sendMessage}
        isConnected={isConnected}
      />
    </div>
  );
}
