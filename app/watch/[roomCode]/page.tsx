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
    isConnected, members, messages, isHost, mediaId: hookMediaId,
    playbackState, waitingForReady,
    joinRoom, rejoinRoom, emitPlayback, emitReady, sendMessage,
    onPlaybackSync, offPlaybackSync,
    onSyncTick, offSyncTick,
    onAllReady, offAllReady,
  } = useWatchParty(true);

  const [media, setMedia] = useState<MediaEntry | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [joined, setJoined] = useState(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const joinAttempted = useRef(false);
  const playerSeekRef = useRef<((time: number) => void) | null>(null);

  const registerVideoRef = useCallback((ref: HTMLVideoElement | null) => {
    videoRef.current = ref;
  }, []);

  // Resolve mediaId: from hook state OR sessionStorage fallback
  const resolvedMediaId = hookMediaId || (() => {
    if (typeof window === "undefined") return null;
    const stored = sessionStorage.getItem("wp_mediaId");
    return stored ? parseInt(stored) : null;
  })();

  // Determine if host from sessionStorage (initial load before socket connects)
  const effectiveIsHost = isHost || (() => {
    if (typeof window === "undefined") return false;
    return sessionStorage.getItem("wp_isHost") === "true";
  })();

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

  // ── Playback sync for guests (play/pause/seek events) ──────────
  useEffect(() => {
    if (effectiveIsHost) return;

    onPlaybackSync(({ type, currentTime }) => {
      const video = videoRef.current;
      if (!video) return;

      if (type === "seek") {
        setSyncing(true);
        if (playerSeekRef.current) {
          playerSeekRef.current(currentTime);
        } else {
          video.currentTime = currentTime;
        }
        // Report ready when buffered
        const onCanPlay = () => {
          emitReady();
          setSyncing(false);
          video.removeEventListener("canplay", onCanPlay);
        };
        video.addEventListener("canplay", onCanPlay);
        // Fallback: report ready after 5s even if not canplay
        setTimeout(() => {
          video.removeEventListener("canplay", onCanPlay);
          emitReady();
          setSyncing(false);
        }, 5000);
      } else if (type === "play") {
        if (playerSeekRef.current) {
          playerSeekRef.current(currentTime);
        } else {
          video.currentTime = currentTime;
        }
        video.play().catch(() => {});
      } else if (type === "pause") {
        video.pause();
        if (playerSeekRef.current) {
          playerSeekRef.current(currentTime);
        } else {
          video.currentTime = currentTime;
        }
      }
    });

    return () => offPlaybackSync();
  }, [effectiveIsHost, onPlaybackSync, offPlaybackSync, emitReady]);

  // ── Sync tick: gradual drift correction for guests ─────────────
  useEffect(() => {
    if (effectiveIsHost) return;

    onSyncTick(({ isPlaying, currentTime }) => {
      const video = videoRef.current;
      if (!video) return;

      const drift = video.currentTime - currentTime;
      const absDrift = Math.abs(drift);

      if (absDrift > 3) {
        // Large drift: hard seek
        if (playerSeekRef.current) {
          playerSeekRef.current(currentTime);
        } else {
          video.currentTime = currentTime;
        }
      } else if (absDrift > 0.5) {
        // Medium drift: adjust playback rate to catch up/slow down
        video.playbackRate = drift > 0 ? 0.95 : 1.05;
        // Reset rate after 2 seconds
        setTimeout(() => {
          if (videoRef.current) videoRef.current.playbackRate = 1.0;
        }, 2000);
      }
      // Small drift (<0.5s): acceptable, do nothing

      // Sync play/pause state
      if (isPlaying && video.paused) {
        video.play().catch(() => {});
      } else if (!isPlaying && !video.paused) {
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

      if (playerSeekRef.current) {
        playerSeekRef.current(state.currentTime);
      } else {
        video.currentTime = state.currentTime;
      }
      if (state.isPlaying) {
        video.play().catch(() => {});
      }
      setSyncing(false);
    });

    return () => offAllReady();
  }, [onAllReady, offAllReady]);

  // ── Initial sync for guests ────────────────────────────────────
  useEffect(() => {
    if (effectiveIsHost || !playbackState || !videoRef.current) return;
    const video = videoRef.current;
    if (playerSeekRef.current) {
      playerSeekRef.current(playbackState.currentTime);
    } else {
      video.currentTime = playbackState.currentTime;
    }
    if (playbackState.isPlaying) {
      video.play().catch(() => {});
    }
    // Report ready after initial load
    const onCanPlay = () => {
      emitReady();
      video.removeEventListener("canplay", onCanPlay);
    };
    video.addEventListener("canplay", onCanPlay);
  }, [effectiveIsHost, playbackState, emitReady]);

  // ── Host auto-reports ready on seek ────────────────────────────
  useEffect(() => {
    if (!effectiveIsHost) return;

    onPlaybackSync(({ type }) => {
      if (type === "seek") {
        const video = videoRef.current;
        if (!video) return;
        const onCanPlay = () => {
          emitReady();
          video.removeEventListener("canplay", onCanPlay);
        };
        video.addEventListener("canplay", onCanPlay);
        setTimeout(() => {
          video.removeEventListener("canplay", onCanPlay);
          emitReady();
        }, 3000);
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
          <Link href="/" className="text-[#E50914] hover:text-[#f6121d] transition-colors">
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
            onPlay: (time) => emitPlayback("play", time),
            onPause: (time) => emitPlayback("pause", time),
            onSeek: (time) => emitPlayback("seek", time),
            registerVideoRef,
            registerSeek: (seekFn) => {
              playerSeekRef.current = seekFn;
            },
          }}
        />
        <SyncOverlay
          visible={syncing || waitingForReady}
          waitingMembers={waitingForReady ? members.filter((m) => !m.ready).map((m) => m.name) : undefined}
        />

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
