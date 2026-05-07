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
    playbackState, joinRoom, emitPlayback, sendMessage,
    onPlaybackSync, offPlaybackSync,
  } = useWatchParty(true);

  const [media, setMedia] = useState<MediaEntry | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [joined, setJoined] = useState(false);
  const [resolvedIsHost, setResolvedIsHost] = useState(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const joinAttempted = useRef(false);

  const registerVideoRef = useCallback((ref: HTMLVideoElement | null) => {
    videoRef.current = ref;
  }, []);

  // Resolve mediaId: from hook state OR sessionStorage fallback
  const resolvedMediaId = hookMediaId || (() => {
    if (typeof window === "undefined") return null;
    const stored = sessionStorage.getItem("wp_mediaId");
    return stored ? parseInt(stored) : null;
  })();

  // Determine if host from sessionStorage
  useEffect(() => {
    const wpIsHost = sessionStorage.getItem("wp_isHost");
    if (wpIsHost === "true") {
      setResolvedIsHost(true);
    }
  }, []);

  // The actual isHost: from hook (updated via host-changed) or resolved
  const effectiveIsHost = isHost || resolvedIsHost;

  // Join logic — only for guests, only once
  useEffect(() => {
    if (!isConnected) return;
    if (joined || joinAttempted.current) return;

    const wpIsHost = sessionStorage.getItem("wp_isHost");
    if (wpIsHost === "true") {
      // Host — already joined via CreateRoomModal, don't re-join
      setJoined(true);
      return;
    }

    const wpName = sessionStorage.getItem("wp_name");
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
  }, [isConnected, joined, roomCode]);

  // Fetch media when we have a mediaId
  useEffect(() => {
    if (!resolvedMediaId) return;
    if (media) return; // already loaded

    fetch(`/api/media?id=${resolvedMediaId}`)
      .then((r) => {
        if (!r.ok) throw new Error("Media not found");
        return r.json();
      })
      .then((data) => setMedia(data))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [resolvedMediaId, media]);

  // Playback sync for guests
  useEffect(() => {
    if (effectiveIsHost) return;

    onPlaybackSync(({ type, currentTime }) => {
      const video = videoRef.current;
      if (!video) return;

      if (type === "sync-check") {
        const drift = Math.abs(video.currentTime - currentTime);
        if (drift > 3) video.currentTime = currentTime;
        return;
      }

      if (type === "seek") {
        setSyncing(true);
        video.currentTime = currentTime;
        setTimeout(() => setSyncing(false), 500);
      } else if (type === "play") {
        video.currentTime = currentTime;
        video.play().catch(() => {});
      } else if (type === "pause") {
        video.pause();
        video.currentTime = currentTime;
      }
    });

    return () => offPlaybackSync();
  }, [effectiveIsHost, onPlaybackSync, offPlaybackSync]);

  // Drift correction — host every 30s
  useEffect(() => {
    if (!effectiveIsHost) return;
    const interval = setInterval(() => {
      if (videoRef.current) {
        emitPlayback("sync-check", videoRef.current.currentTime);
      }
    }, 30000);
    return () => clearInterval(interval);
  }, [effectiveIsHost, emitPlayback]);

  // Initial sync for guests
  useEffect(() => {
    if (effectiveIsHost || !playbackState || !videoRef.current) return;
    const video = videoRef.current;
    video.currentTime = playbackState.currentTime;
    if (playbackState.isPlaying) {
      video.play().catch(() => {});
    }
  }, [effectiveIsHost, playbackState]);

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
            isHost: effectiveIsHost,
            onPlay: (time) => emitPlayback("play", time),
            onPause: (time) => emitPlayback("pause", time),
            onSeek: (time) => emitPlayback("seek", time),
            registerVideoRef,
          }}
        />
        <SyncOverlay visible={syncing} />

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
