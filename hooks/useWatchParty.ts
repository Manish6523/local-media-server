"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { getSocket } from "@/lib/socket";
import type { Socket } from "socket.io-client";

export interface PublicMember {
  name: string;
  isHost: boolean;
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
  connect: () => void;
  createRoom: (mediaId: number, hostName: string) => Promise<{ success: boolean; roomCode?: string }>;
  joinRoom: (roomCode: string, guestName: string) => Promise<{ success: boolean; mediaId?: number; state?: PlaybackState; error?: string }>;
  getRoomInfo: (roomCode: string) => Promise<{ success: boolean; mediaId?: number; hostName?: string; members?: PublicMember[]; error?: string }>;
  listRooms: () => Promise<RoomListItem[]>;
  emitPlayback: (type: "play" | "pause" | "seek" | "sync-check", currentTime: number) => void;
  sendMessage: (text: string) => void;
  onPlaybackSync: (handler: (data: { type: string; currentTime: number }) => void) => void;
  offPlaybackSync: () => void;
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
  const playbackHandlerRef = useRef<((data: { type: string; currentTime: number }) => void) | null>(null);

  const attachListeners = useCallback((socket: Socket) => {
    // Remove any existing listeners first to prevent duplicates
    socket.off("connect");
    socket.off("disconnect");
    socket.off("member-joined");
    socket.off("member-left");
    socket.off("host-changed");
    socket.off("new-message");

    socket.on("connect", () => setIsConnected(true));
    socket.on("disconnect", () => setIsConnected(false));
    socket.on("member-joined", ({ members }: { members: PublicMember[] }) => setMembers(members));
    socket.on("member-left", ({ members }: { members: PublicMember[] }) => setMembers(members));
    socket.on("host-changed", ({ members }: { newHostName: string; members: PublicMember[] }) => {
      setMembers(members);
      setIsHost(true); // if I receive this, I might be the new host — server decides
    });
    socket.on("new-message", (msg: ChatMessage) => setMessages((prev) => [...prev, msg]));

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

  // Wait for socket to connect, then execute callback
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
              // Persist for page navigation
              sessionStorage.setItem("wp_mediaId", String(response.mediaId));
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
    (type: "play" | "pause" | "seek" | "sync-check", currentTime: number) => {
      const code = roomCode || sessionStorage.getItem("wp_roomCode");
      const actualIsHost = isHost || sessionStorage.getItem("wp_isHost") === "true";
      if (!actualIsHost || !code) return;
      socketRef.current?.emit("playback-event", { roomCode: code, type, currentTime });
    },
    [isHost, roomCode]
  );

  const sendMessage = useCallback(
    (text: string) => {
      const code = roomCode || sessionStorage.getItem("wp_roomCode");
      if (!code) return;
      socketRef.current?.emit("chat-message", { roomCode: code, text });
    },
    [roomCode]
  );

  const onPlaybackSync = useCallback((handler: (data: { type: string; currentTime: number }) => void) => {
    const socket = socketRef.current;
    if (!socket) return;
    if (playbackHandlerRef.current) {
      socket.off("playback-sync", playbackHandlerRef.current);
    }
    playbackHandlerRef.current = handler;
    socket.on("playback-sync", handler);
  }, []);

  const offPlaybackSync = useCallback(() => {
    const socket = socketRef.current;
    if (!socket || !playbackHandlerRef.current) return;
    socket.off("playback-sync", playbackHandlerRef.current);
    playbackHandlerRef.current = null;
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
    connect,
    createRoom,
    joinRoom,
    getRoomInfo,
    listRooms,
    emitPlayback,
    sendMessage,
    onPlaybackSync,
    offPlaybackSync,
  };
}
