"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { getSocket } from "@/lib/socket";
import type { Socket } from "socket.io-client";

export interface PublicMember {
  name: string;
  isHost: boolean;
  ready: boolean;
}

export interface ChatMessage {
  id: number;
  name: string;
  text: string;
  timestamp: number;
  isSystem?: boolean;
}

interface PlaybackState {
  isPlaying: boolean;
  currentTime: number;
  updatedAt: number;
}

interface SyncTick {
  isPlaying: boolean;
  currentTime: number;
  serverTime: number;
}

interface RoomListItem {
  roomCode: string;
  mediaId: number;
  hostName: string;
  memberCount: number;
}

interface UseWatchPartyReturn {
  socket: Socket | null;
  isConnected: boolean;
  members: PublicMember[];
  messages: ChatMessage[];
  isHost: boolean;
  roomCode: string | null;
  mediaId: number | null;
  playbackState: PlaybackState | null;
  waitingForReady: boolean;
  connect: () => void;
  createRoom: (mediaId: number, hostName: string) => Promise<{ success: boolean; roomCode?: string }>;
  joinRoom: (roomCode: string, guestName: string) => Promise<{ success: boolean; mediaId?: number; state?: PlaybackState; error?: string }>;
  rejoinRoom: (roomCode: string, name: string) => Promise<{ success: boolean; mediaId?: number; state?: PlaybackState; isHost?: boolean; error?: string }>;
  getRoomInfo: (roomCode: string) => Promise<{ success: boolean; mediaId?: number; hostName?: string; members?: PublicMember[]; error?: string }>;
  listRooms: () => Promise<RoomListItem[]>;
  emitPlayback: (type: "play" | "pause" | "seek", currentTime: number) => void;
  emitReady: () => void;
  sendMessage: (text: string) => void;
  onSyncTick: (handler: (data: SyncTick) => void) => void;
  offSyncTick: () => void;
  onPlaybackSync: (handler: (data: { type: string; currentTime: number; serverTime: number }) => void) => void;
  offPlaybackSync: () => void;
  onWaitingForReady: (handler: (data: { members: PublicMember[] }) => void) => void;
  offWaitingForReady: () => void;
  onAllReady: (handler: (data: { state: PlaybackState; members: PublicMember[] }) => void) => void;
  offAllReady: () => void;
}

export function useWatchParty(autoConnect: boolean = false): UseWatchPartyReturn {
  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [members, setMembers] = useState<PublicMember[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isHost, setIsHost] = useState(false);
  const [roomCode, setRoomCode] = useState<string | null>(null);
  const [mediaId, setMediaId] = useState<number | null>(null);
  const [playbackState, setPlaybackState] = useState<PlaybackState | null>(null);
  const [waitingForReady, setWaitingForReady] = useState(false);

  const syncTickHandlerRef = useRef<((data: SyncTick) => void) | null>(null);
  const playbackHandlerRef = useRef<((data: { type: string; currentTime: number; serverTime: number }) => void) | null>(null);
  const waitingHandlerRef = useRef<((data: { members: PublicMember[] }) => void) | null>(null);
  const allReadyHandlerRef = useRef<((data: { state: PlaybackState; members: PublicMember[] }) => void) | null>(null);

  const attachListeners = useCallback((socket: Socket) => {
    // Remove existing listeners to prevent duplicates
    socket.off("connect");
    socket.off("disconnect");
    socket.off("member-joined");
    socket.off("member-left");
    socket.off("host-changed");
    socket.off("you-are-host");
    socket.off("new-message");
    socket.off("member-ready-update");
    socket.off("waiting-for-ready");
    socket.off("all-ready");

    socket.on("connect", () => setIsConnected(true));
    socket.on("disconnect", () => setIsConnected(false));

    socket.on("member-joined", ({ members }: { members: PublicMember[] }) => setMembers(members));
    socket.on("member-left", ({ members }: { members: PublicMember[] }) => setMembers(members));

    // Only the NEW host receives "you-are-host"
    socket.on("you-are-host", ({ members }: { members: PublicMember[] }) => {
      setIsHost(true);
      setMembers(members);
      console.log("[WatchParty] You are now the host");
    });

    // Everyone else receives "host-changed" — they are NOT host
    socket.on("host-changed", ({ members }: { members: PublicMember[] }) => {
      setIsHost(false);
      setMembers(members);
    });

    socket.on("new-message", (msg: ChatMessage) => setMessages((prev) => [...prev, msg]));

    socket.on("member-ready-update", ({ members }: { members: PublicMember[] }) => {
      setMembers(members);
    });

    socket.on("waiting-for-ready", ({ members }: { members: PublicMember[] }) => {
      setWaitingForReady(true);
      setMembers(members);
    });

    socket.on("all-ready", ({ state, members }: { state: PlaybackState; members: PublicMember[] }) => {
      setWaitingForReady(false);
      setPlaybackState(state);
      setMembers(members);
    });

    if (socket.connected) setIsConnected(true);
  }, []);

  const connect = useCallback(() => {
    if (socketRef.current) return;
    const socket = getSocket();
    socketRef.current = socket;
    attachListeners(socket);
  }, [attachListeners]);

  useEffect(() => {
    if (autoConnect) connect();
  }, [autoConnect, connect]);

  const ensureSocket = useCallback((): Socket => {
    if (!socketRef.current) {
      const socket = getSocket();
      socketRef.current = socket;
      attachListeners(socket);
    }
    return socketRef.current;
  }, [attachListeners]);

  const whenConnected = useCallback((socket: Socket, fn: () => void) => {
    if (socket.connected) {
      fn();
    } else {
      socket.once("connect", fn);
    }
  }, []);

  const createRoom = useCallback(
    (mediaId: number, hostName: string): Promise<{ success: boolean; roomCode?: string }> => {
      return new Promise((resolve) => {
        const socket = ensureSocket();
        whenConnected(socket, () => {
          socket.emit("create-room", { mediaId, hostName }, (response: any) => {
            if (response.success) {
              setRoomCode(response.roomCode);
              setMediaId(mediaId);
              setIsHost(true);
              setMembers(response.room.members);
              // Persist for page navigation
              sessionStorage.setItem("wp_name", hostName);
              sessionStorage.setItem("wp_isHost", "true");
              sessionStorage.setItem("wp_mediaId", String(mediaId));
              sessionStorage.setItem("wp_roomCode", response.roomCode);
              resolve({ success: true, roomCode: response.roomCode });
            } else {
              resolve({ success: false });
            }
          });
        });
      });
    },
    [ensureSocket, whenConnected]
  );

  const joinRoom = useCallback(
    (roomCode: string, guestName: string): Promise<{ success: boolean; mediaId?: number; state?: PlaybackState; error?: string }> => {
      return new Promise((resolve) => {
        const socket = ensureSocket();
        whenConnected(socket, () => {
          socket.emit("join-room", { roomCode, guestName }, (response: any) => {
            if (response.success) {
              setRoomCode(roomCode);
              setMediaId(response.mediaId);
              setIsHost(false);
              setMembers(response.members);
              setMessages(response.messages || []);
              setPlaybackState(response.state);
              // Persist for reconnection
              sessionStorage.setItem("wp_name", guestName);
              sessionStorage.setItem("wp_mediaId", String(response.mediaId));
              sessionStorage.setItem("wp_roomCode", roomCode);
              sessionStorage.setItem("wp_isHost", "false");
              resolve({ success: true, mediaId: response.mediaId, state: response.state });
            } else {
              resolve({ success: false, error: response.error });
            }
          });
        });
      });
    },
    [ensureSocket, whenConnected]
  );

  const rejoinRoom = useCallback(
    (roomCode: string, name: string): Promise<{ success: boolean; mediaId?: number; state?: PlaybackState; isHost?: boolean; error?: string }> => {
      return new Promise((resolve) => {
        const socket = ensureSocket();
        whenConnected(socket, () => {
          socket.emit("rejoin-room", { roomCode, name }, (response: any) => {
            if (response.success) {
              setRoomCode(roomCode);
              setMediaId(response.mediaId);
              setIsHost(response.isHost || false);
              setMembers(response.members);
              setMessages(response.messages || []);
              setPlaybackState(response.state);
              // Update session storage
              sessionStorage.setItem("wp_isHost", String(response.isHost || false));
              resolve({ success: true, mediaId: response.mediaId, state: response.state, isHost: response.isHost });
            } else {
              resolve({ success: false, error: response.error });
            }
          });
        });
      });
    },
    [ensureSocket, whenConnected]
  );

  const getRoomInfo = useCallback(
    (roomCode: string): Promise<{ success: boolean; mediaId?: number; hostName?: string; members?: PublicMember[]; error?: string }> => {
      return new Promise((resolve) => {
        const socket = ensureSocket();
        whenConnected(socket, () => {
          socket.emit("get-room-info", { roomCode }, (response: any) => {
            resolve(response);
          });
        });
      });
    },
    [ensureSocket, whenConnected]
  );

  const listRooms = useCallback((): Promise<RoomListItem[]> => {
    return new Promise((resolve) => {
      const socket = ensureSocket();
      whenConnected(socket, () => {
        socket.emit("list-rooms", {}, (response: RoomListItem[]) => {
          resolve(response);
        });
      });
    });
  }, [ensureSocket, whenConnected]);

  const emitPlayback = useCallback(
    (type: "play" | "pause" | "seek", currentTime: number) => {
      if (typeof currentTime !== "number" || !isFinite(currentTime) || currentTime <= 1) return;
      const code = roomCode || sessionStorage.getItem("wp_roomCode");
      if (!code) return;
      // Only host can emit playback events
      const actualIsHost = isHost || sessionStorage.getItem("wp_isHost") === "true";
      if (!actualIsHost) return;
      socketRef.current?.emit("playback-event", { roomCode: code, type, currentTime });
    },
    [isHost, roomCode]
  );

  const emitReady = useCallback(() => {
    const code = roomCode || sessionStorage.getItem("wp_roomCode");
    if (!code) {
      console.warn(`[Guest] emitReady called but no roomCode available`);
      return;
    }
    console.log(`[Guest] Calling emitReady for room ${code} (socket connected: ${socketRef.current?.connected})`);
    socketRef.current?.emit("member-ready", { roomCode: code });
  }, [roomCode]);

  const sendMessage = useCallback(
    (text: string) => {
      const code = roomCode || sessionStorage.getItem("wp_roomCode");
      if (!code) return;
      socketRef.current?.emit("chat-message", { roomCode: code, text });
    },
    [roomCode]
  );

  // ── Event Registration ──────────────────────────────────────────

  const onSyncTick = useCallback((handler: (data: SyncTick) => void) => {
    const socket = socketRef.current;
    if (!socket) return;
    if (syncTickHandlerRef.current) socket.off("sync-tick", syncTickHandlerRef.current);
    syncTickHandlerRef.current = handler;
    socket.on("sync-tick", handler);
  }, []);

  const offSyncTick = useCallback(() => {
    const socket = socketRef.current;
    if (!socket || !syncTickHandlerRef.current) return;
    socket.off("sync-tick", syncTickHandlerRef.current);
    syncTickHandlerRef.current = null;
  }, []);

  const onPlaybackSync = useCallback((handler: (data: { type: string; currentTime: number; serverTime: number }) => void) => {
    const socket = socketRef.current;
    if (!socket) return;
    if (playbackHandlerRef.current) socket.off("playback-sync", playbackHandlerRef.current);
    playbackHandlerRef.current = handler;
    socket.on("playback-sync", handler);
  }, []);

  const offPlaybackSync = useCallback(() => {
    const socket = socketRef.current;
    if (!socket || !playbackHandlerRef.current) return;
    socket.off("playback-sync", playbackHandlerRef.current);
    playbackHandlerRef.current = null;
  }, []);

  const onWaitingForReady = useCallback((handler: (data: { members: PublicMember[] }) => void) => {
    const socket = socketRef.current;
    if (!socket) return;
    if (waitingHandlerRef.current) socket.off("waiting-for-ready", waitingHandlerRef.current);
    waitingHandlerRef.current = handler;
    socket.on("waiting-for-ready", handler);
  }, []);

  const offWaitingForReady = useCallback(() => {
    const socket = socketRef.current;
    if (!socket || !waitingHandlerRef.current) return;
    socket.off("waiting-for-ready", waitingHandlerRef.current);
    waitingHandlerRef.current = null;
  }, []);

  const onAllReady = useCallback((handler: (data: { state: PlaybackState; members: PublicMember[] }) => void) => {
    const socket = socketRef.current;
    if (!socket) return;
    if (allReadyHandlerRef.current) socket.off("all-ready", allReadyHandlerRef.current);
    allReadyHandlerRef.current = handler;
    socket.on("all-ready", handler);
  }, []);

  const offAllReady = useCallback(() => {
    const socket = socketRef.current;
    if (!socket || !allReadyHandlerRef.current) return;
    socket.off("all-ready", allReadyHandlerRef.current);
    allReadyHandlerRef.current = null;
  }, []);

  return {
    socket: socketRef.current,
    isConnected,
    members,
    messages,
    isHost,
    roomCode,
    mediaId,
    playbackState,
    waitingForReady,
    connect,
    createRoom,
    joinRoom,
    rejoinRoom,
    getRoomInfo,
    listRooms,
    emitPlayback,
    emitReady,
    sendMessage,
    onSyncTick,
    offSyncTick,
    onPlaybackSync,
    offPlaybackSync,
    onWaitingForReady,
    offWaitingForReady,
    onAllReady,
    offAllReady,
  };
}
