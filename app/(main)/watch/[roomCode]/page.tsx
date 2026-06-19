"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import NetflixPlayer from "@/components/Player/NetflixPlayer";
import ChatPanel from "@/components/WatchParty/ChatPanel";
import SyncOverlay from "@/components/WatchParty/SyncOverlay";
import { useWatchParty } from "@/hooks/useWatchParty";

import type { MediaEntry } from "@/lib/db";

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
    getServerTime,
    isProcessingServerEvent,
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

  // Host never has an initial load guard.
  // Guest: immediately block all outbound events until initial sync completes.
  // This MUST be synchronous (not in a useEffect) to prevent race conditions
  // where the video element mounts and fires native events before the guard is set.
  if (effectiveIsHost) {
    isInitialLoad.current = false;
  } else {
    isProcessingServerEvent.current = true;
  }

  // ── Sync Execution Lockout (Echo prevention) ───────────────
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !effectiveIsHost) return;

    const onSeeking = () => {
      if (isProcessingServerEvent.current) return;
      emitPlayback("seek", video.currentTime);
    };

    const onSeeked = () => {
      setTimeout(() => {
        isProcessingServerEvent.current = false;
      }, 400);
    };

    video.addEventListener("seeking", onSeeking);
    video.addEventListener("seeked", onSeeked);

    return () => {
      video.removeEventListener("seeking", onSeeking);
      video.removeEventListener("seeked", onSeeked);
    };
  }, [effectiveIsHost, emitPlayback, isProcessingServerEvent, videoRef.current]);

  // ── Join / Rejoin logic ────────────────────────────────────────
  useEffect(() => {
    if (!isConnected) return;
    if (joined || joinAttempted.current) return;

    const wpIsHost = sessionStorage.getItem("wp_isHost");
    const wpName = sessionStorage.getItem("wp_name");
    const wpRoomCode = sessionStorage.getItem("wp_roomCode");
    const alreadyJoined = sessionStorage.getItem("wp_already_joined");

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

    if (alreadyJoined === "true" && wpRoomCode === roomCode) {
      // Guest: already joined in lobby, just rejoin to update socket ID
      joinAttempted.current = true;
      (async () => {
        const result = await rejoinRoom(roomCode, wpName);
        if (result.success) {
          setJoined(true);
          sessionStorage.removeItem("wp_already_joined");
        } else {
          setError(result.error || "Failed to rejoin room");
        }
      })();
      return;
    }

    // Guest — normal join room (only once!)
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

  // ── Playback sync (play/pause/seek events) ──────────
  useEffect(() => {

    onPlaybackSync((data) => {
      const { type, currentTime, playAtServerTime } = data;
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
      const executePlayback = () => {
        // Convert absolute sync time to relative video time
        const offset = transcodeStartTimeRef.current;
        const relativeTime = currentTime - offset;
        const myAbsoluteTime = offset + (video.currentTime || 0);
        const diff = Math.abs(myAbsoluteTime - currentTime);
        console.log(
          `[Sync] Executing: ${type} @ ${currentTime.toFixed(2)} (abs), relative=${relativeTime.toFixed(2)}, myAbs=${myAbsoluteTime.toFixed(2)}, diff=${diff.toFixed(2)}, offset=${offset.toFixed(2)}`,
        );

        // Block outbound events while we manipulate the video element
        isProcessingServerEvent.current = true;

        if (type === "seek") {
          setSyncing(true);
          // Full seek = new transcode from this absolute position
          video.pause();
          // Don't set transcodeStartTimeRef directly — let playerSeekRef
          // trigger usePlayer.seek() → setTranscodeStartTime → registerTranscodeStart
          if (playerSeekRef.current) {
            playerSeekRef.current(currentTime);
          } else {
            video.currentTime = 0; // Will restart from new transcode
          }
          // Wait for canplay or seeked event before reporting ready
          // If video src changes (full transcode), seeked won't fire, but canplay will.
          const onReady = () => {
            console.log(`[Guest] Seek/Load complete, calling emitReady`);
            emitReady();
            setSyncing(false);
            video.removeEventListener("seeked", onReady);
            video.removeEventListener("canplay", onReady);
          };
          video.addEventListener("seeked", onReady, { once: true });
          video.addEventListener("canplay", onReady, { once: true });
          // Fallback: report ready after 10s even if neither fires
          setTimeout(() => {
            video.removeEventListener("seeked", onReady);
            video.removeEventListener("canplay", onReady);
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
            if (playerSeekRef.current) playerSeekRef.current(currentTime);
          }
          video.play().catch(() => {});
        } else if (type === "pause") {
          // Pause only — NEVER trigger a transcode restart.
          // Only adjust currentTime if the relative position is within the current buffer.
          if (relativeTime >= 0 && relativeTime < (video.duration || Infinity)) {
            video.currentTime = relativeTime;
          }
          // If relativeTime is out of range, just pause at current position.
          // Do NOT call playerSeekRef — that would kill the active transcode.
          video.pause();
        }

        // Release guard after video events have settled
        setTimeout(() => {
          isProcessingServerEvent.current = false;
        }, 1500);
      };

      if (playAtServerTime) {
        const delay = playAtServerTime - getServerTime();
        if (delay > 0) {
          console.log(`[Guest] Scheduling ${type} in ${delay}ms`);
          setTimeout(executePlayback, delay);
        } else {
          executePlayback();
        }
      } else {
        executePlayback();
      }
    });

    return () => offPlaybackSync();
  }, [effectiveIsHost, onPlaybackSync, offPlaybackSync, emitReady, getServerTime]);

  // ── Sync tick: drift correction for guests (every 10s) ──────────
  useEffect(() => {
    onSyncTick(({ isPlaying, currentTime }) => {
      if (effectiveIsHost) {
        // Host fallback: if sync-tick arrives, we are active, drop any stuck spinner
        setSyncing(false);
        return;
      }

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

      // Block outbound events during drift correction
      isProcessingServerEvent.current = true;

      if (absDrift > 15) {
        // Very large drift: need full transcode restart at new position
        console.log(`[Sync] LARGE drift=${drift.toFixed(2)}s — full transcode seek to ${currentTime.toFixed(2)}`);
        if (playerSeekRef.current) {
          playerSeekRef.current(currentTime);
        }
      } else if (absDrift > 2.0) {
        // Hard Snap for HLS chunk boundaries
        console.log(`[Guest] Correcting ${absDrift.toFixed(2)}s drift. Snapping to ${currentTime}`);
        const relativeTarget = currentTime - offset;
        
        if (relativeTarget >= 0 && relativeTarget < (video.duration || Infinity)) {
          video.currentTime = relativeTarget;
        } else {
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

      setTimeout(() => {
        isProcessingServerEvent.current = false;
      }, 1500);
    });

    return () => offSyncTick();
  }, [effectiveIsHost, onSyncTick, offSyncTick, isProcessingServerEvent]);

  // ── Handle all-ready: resume playback ──────────────────────────
  useEffect(() => {
    onAllReady(({ state }) => {
      const video = videoRef.current;
      if (!video) return;

      // Don't process during initial load
      if (isInitialLoad.current) return;

      // Block outbound events while applying all-ready state
      isProcessingServerEvent.current = true;

      if (isValidTimestamp(state.currentTime, video)) {
        // Convert absolute time to relative for in-place adjustment
        const offset = transcodeStartTimeRef.current;
        const relativeTime = state.currentTime - offset;
        console.log(`[Guest] all-ready: abs=${state.currentTime.toFixed(2)}, relative=${relativeTime.toFixed(2)}, offset=${offset.toFixed(2)}`);
        if (relativeTime >= 0 && relativeTime < (video.duration || Infinity)) {
          video.currentTime = relativeTime;
        } else {
          // Need full transcode seek — go through player seek
          if (playerSeekRef.current) playerSeekRef.current(state.currentTime);
        }
      }
      if (state.isPlaying) {
        video.play().catch(() => {});
      }
      setSyncing(false);

      setTimeout(() => {
        isProcessingServerEvent.current = false;
      }, 1500);
    });

    return () => offAllReady();
  }, [onAllReady, offAllReady, isProcessingServerEvent]);

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
      isProcessingServerEvent.current = false;
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

      const onReady = () => {
        if (!isInitialLoad.current) return
        console.log(`[Guest] Seeked/Load complete, unblocking sync, calling emitReady`)
        isInitialLoad.current = false
        isProcessingServerEvent.current = false
        emitReady()
        if (playbackState.isPlaying) vid.play().catch(() => {})
      }
      vid.addEventListener('seeked', onReady, { once: true })
      vid.addEventListener('canplay', onReady, { once: true })

      // Fallback if seeked never fires within 15 seconds
      setTimeout(() => {
        if (isInitialLoad.current) {
          console.log(`[Guest] Seek timeout fallback, unblocking`)
          isInitialLoad.current = false
          isProcessingServerEvent.current = false
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
  }, [effectiveIsHost, playbackState, emitReady, isProcessingServerEvent]);

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
              if (isProcessingServerEvent.current) return;
              if (typeof time === "number" && isFinite(time) && time > 1) emitPlayback("play", time);
            },
            onPause: (time) => {
              if (isProcessingServerEvent.current) return;
              if (typeof time === "number" && isFinite(time) && time > 1) emitPlayback("pause", time);
            },
            onSeek: (time) => {
              if (isProcessingServerEvent.current) return;
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
        {/* Both Host and Guest see brief 'Syncing...' overlay during seek. */}
        <SyncOverlay 
          visible={syncing || waitingForReady} 
          waitingMembers={members.filter(m => !m.ready).map(m => m.name)}
        />

        {!effectiveIsHost && (
          <div className="absolute top-4 right-4 z-30 bg-black/60 backdrop-blur-sm px-3 py-1.5 rounded-full text-white/60 text-xs flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            Host controls playback
          </div>
        )}

        <ChatPanel
          members={members}
          messages={messages}
          onSendMessage={sendMessage}
          isConnected={isConnected}
        />
      </div>
    </div>
  );
}
