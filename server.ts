import { createServer } from "http";
import { parse } from "url";
import next from "next";
import { Server as SocketIOServer, Socket } from "socket.io";
import { spawn } from "child_process";
import fs from "fs";

const dev = process.env.NODE_ENV !== "production";
const app = next({ dev });
const handle = app.getRequestHandler();

// ─── GPU Detection ───────────────────────────────────────────────
// Probe once at boot via lib/gpu-detect.ts — supports NVENC, VAAPI, QSV, CPU fallback.
import { detectBestEncoder } from "./lib/gpu-detect";
// ─── Types ───────────────────────────────────────────────────────

interface Member {
  id: string;
  name: string;
  isHost: boolean;
  joinedAt: number;
  ready: boolean; // Whether this member's video is buffered and ready
}

interface ChatMessage {
  id: number;
  name: string;
  text: string;
  timestamp: number;
  isSystem?: boolean;
}

interface PlaybackState {
  isPlaying: boolean;
  currentTime: number;
  updatedAt: number; // Server timestamp when state was last updated
}

interface Room {
  mediaId: number;
  hostId: string;
  hostName: string;
  members: Member[];
  messages: ChatMessage[];
  state: PlaybackState;
  syncInterval: ReturnType<typeof setInterval> | null;
  waitingForReady: boolean; // True when waiting for all members to buffer after seek
  readyTimeout: ReturnType<typeof setTimeout> | null;
}

// ─── Room Storage ────────────────────────────────────────────────

const rooms = new Map<string, Room>();

function generateRoomCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code: string;
  do {
    code = Array.from({ length: 6 }, () =>
      chars[Math.floor(Math.random() * chars.length)]
    ).join("");
  } while (rooms.has(code));
  return code;
}

function publicMembers(members: Member[]) {
  return members.map((m) => ({ name: m.name, isHost: m.isHost, ready: m.ready }));
}

/** Compute where playback should be right now based on last known state */
function projectedTime(state: PlaybackState): number {
  if (!state.isPlaying) return state.currentTime;
  const elapsed = (Date.now() - state.updatedAt) / 1000;
  return state.currentTime + elapsed;
}

// ─── Sync Heartbeat ──────────────────────────────────────────────

function startSyncHeartbeat(io: SocketIOServer, roomCode: string) {
  const room = rooms.get(roomCode);
  if (!room) return;

  // Clear existing interval
  if (room.syncInterval) clearInterval(room.syncInterval);

  room.syncInterval = setInterval(() => {
    const r = rooms.get(roomCode);
    if (!r || r.members.length === 0) {
      clearInterval(room.syncInterval!);
      room.syncInterval = null;
      return;
    }

    // Don't send sync ticks while waiting for ready
    if (r.waitingForReady) return;

    // Skip broadcast when no guests or paused
    const guestCount = r.members.filter(m => !m.isHost).length;
    if (guestCount === 0) return;
    if (!r.state.isPlaying) return;

    const projected = projectedTime(r.state);

    console.log(`[Server] Broadcasting sync-tick @ ${projected.toFixed(2)} (playing=${r.state.isPlaying}) to ${guestCount} guests in ${roomCode}`);

    io.to(roomCode).emit("sync-tick", {
      isPlaying: r.state.isPlaying,
      currentTime: projected,
      serverTime: Date.now(),
    });
  }, 10000); // Every 10 seconds — matches drift correction window
}

function stopSyncHeartbeat(room: Room) {
  if (room.syncInterval) {
    clearInterval(room.syncInterval);
    room.syncInterval = null;
  }
  if (room.readyTimeout) {
    clearTimeout(room.readyTimeout);
    room.readyTimeout = null;
  }
}

// ─── Ready-Check Protocol ────────────────────────────────────────

function startReadyCheck(io: SocketIOServer, roomCode: string) {
  const room = rooms.get(roomCode);
  if (!room) return;

  // Mark all members as not ready, EXCEPT the host
  // Host initiated the seek so they're already at the right position
  room.waitingForReady = true;
  for (const m of room.members) {
    m.ready = m.isHost; // Host is auto-ready
  }

  // Pause playback while waiting
  room.state.isPlaying = false;
  room.state.updatedAt = Date.now();

  // If host is the only member, skip the ready check entirely
  if (room.members.every((m) => m.ready)) {
    completeReadyCheck(io, roomCode);
    return;
  }

  io.to(roomCode).emit("waiting-for-ready", {
    members: publicMembers(room.members),
  });

  // Timeout: resume anyway after 15 seconds (VAAPI takes 2-3s to init encoder)
  if (room.readyTimeout) clearTimeout(room.readyTimeout);
  room.readyTimeout = setTimeout(() => {
    const r = rooms.get(roomCode);
    if (!r || !r.waitingForReady) return;

    console.log(`[WatchParty] Ready timeout in ${roomCode}, resuming anyway`);
    completeReadyCheck(io, roomCode);
  }, 15000);
}

function handleMemberReady(io: SocketIOServer, roomCode: string, socketId: string) {
  const room = rooms.get(roomCode);
  if (!room) return;

  const member = room.members.find((m) => m.id === socketId);
  if (member) {
    member.ready = true;
    console.log(`[Server] Got ready from ${socketId} (${member.name}) in ${roomCode} | waiting=${room.waitingForReady}`);
  } else {
    console.warn(`[Server] Got ready from unknown socket ${socketId} in ${roomCode}`);
  }

  io.to(roomCode).emit("member-ready-update", {
    members: publicMembers(room.members),
  });

  // Check if all members are ready
  if (room.waitingForReady && room.members.every((m) => m.ready)) {
    console.log(`[Server] All members ready in ${roomCode}, completing ready check`);
    completeReadyCheck(io, roomCode);
  }
}

function completeReadyCheck(io: SocketIOServer, roomCode: string) {
  const room = rooms.get(roomCode);
  if (!room) return;

  room.waitingForReady = false;
  if (room.readyTimeout) {
    clearTimeout(room.readyTimeout);
    room.readyTimeout = null;
  }

  // Mark all as ready
  for (const m of room.members) m.ready = true;

  // Resume playback
  room.state.isPlaying = true;
  room.state.updatedAt = Date.now();

  io.to(roomCode).emit("all-ready", {
    state: room.state,
    members: publicMembers(room.members),
  });
}

// ─── Boot ────────────────────────────────────────────────────────

app.prepare().then(async () => {
  // Detect best GPU encoder (NVENC → VAAPI → QSV → CPU)
  await detectBestEncoder();

  const CACHE_BASE = "/tmp/filmaro-cache";

  // Cleanup HLS cache on startup
  if (fs.existsSync(CACHE_BASE)) {
    try {
      fs.rmSync(CACHE_BASE, { recursive: true, force: true });
    } catch (e) {
      console.error("[Server] Error cleaning HLS cache on startup:", e);
    }
  }

  // Also clean up on exit
  const cleanupAndExit = () => {
    if (fs.existsSync(CACHE_BASE)) {
      try {
        fs.rmSync(CACHE_BASE, { recursive: true, force: true });
      } catch {}
    }
    process.exit(0);
  };
  process.on("SIGINT", cleanupAndExit);
  process.on("SIGTERM", cleanupAndExit);

  const path = await import("path");
  const MIME_TYPES: Record<string, string> = {
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".webp": "image/webp",
    ".gif": "image/gif",
    ".avif": "image/avif",
  };

  const httpServer = createServer((req, res) => {
    const parsedUrl = parse(req.url!, true);
    const pathname = parsedUrl.pathname || "";

    // Serve runtime-created images directly from public/ (posters & backdrops)
    // Next.js production only serves public/ files baked in at build time,
    // so images downloaded after `next build` need to be served manually.
    if (pathname.startsWith("/posters/") || pathname.startsWith("/backdrops/")) {
      const safePath = path.normalize(pathname).replace(/^(\.\.[/\\])+/, "");
      const filePath = path.join(process.cwd(), "public", safePath);

      if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
        const ext = path.extname(filePath).toLowerCase();
        const contentType = MIME_TYPES[ext] || "application/octet-stream";
        
        res.writeHead(200, {
          "Content-Type": contentType,
          "Cache-Control": "public, max-age=31536000, immutable",
        });
        fs.createReadStream(filePath).pipe(res);
        return;
      }
    }

    handle(req, res, parsedUrl);
  });

  const io = new SocketIOServer(httpServer, {
    cors: { origin: "*", methods: ["GET", "POST"] },
    transports: ["websocket", "polling"],
  });

  io.on("connection", (socket: Socket) => {
    socket.on("ping", () => {
      socket.emit("pong", Date.now());
    });

    // ── HOST creates a room ──────────────────────────────────────
    socket.on("create-room", ({ mediaId, hostName }, callback) => {
      const roomCode = generateRoomCode();
      const room: Room = {
        mediaId,
        hostId: socket.id,
        hostName,
        members: [
          { id: socket.id, name: hostName, isHost: true, joinedAt: Date.now(), ready: true },
        ],
        messages: [],
        state: { isPlaying: false, currentTime: 0, updatedAt: Date.now() },
        syncInterval: null,
        waitingForReady: false,
        readyTimeout: null,
      };
      rooms.set(roomCode, room);
      socket.join(roomCode);
      socket.data.roomCode = roomCode;
      socket.data.name = hostName;
      startSyncHeartbeat(io, roomCode);
      console.log(`[WatchParty] Room ${roomCode} created by ${hostName}`);
      callback({ success: true, roomCode, room: { mediaId, members: publicMembers(room.members) } });
    });

    // ── Get room info (pre-join) ─────────────────────────────────
    socket.on("get-room-info", ({ roomCode }, callback) => {
      const room = rooms.get(roomCode);
      if (!room) return callback({ success: false, error: "Room not found" });
      callback({
        success: true,
        mediaId: room.mediaId,
        hostName: room.hostName,
        memberCount: room.members.length,
        members: publicMembers(room.members),
      });
    });

    // ── List all active rooms ────────────────────────────────────
    socket.on("list-rooms", ({}, callback) => {
      const list: { roomCode: string; mediaId: number; hostName: string; memberCount: number }[] = [];
      rooms.forEach((room, code) => {
        list.push({
          roomCode: code,
          mediaId: room.mediaId,
          hostName: room.hostName,
          memberCount: room.members.length,
        });
      });
      callback(list);
    });

    // ── GUEST joins a room ───────────────────────────────────────
    socket.on("join-room", ({ roomCode, guestName }, callback) => {
      const room = rooms.get(roomCode);
      if (!room) return callback({ success: false, error: "Room not found or expired" });

      room.members.push({
        id: socket.id,
        name: guestName,
        isHost: false,
        joinedAt: Date.now(),
        ready: false, // Not ready until video loads
      });
      socket.join(roomCode);
      socket.data.roomCode = roomCode;
      socket.data.name = guestName;

      // System message
      const sysMsg: ChatMessage = {
        id: Date.now(),
        name: guestName,
        text: `${guestName} joined the room`,
        timestamp: Date.now(),
        isSystem: true,
      };
      room.messages.push(sysMsg);
      io.to(roomCode).emit("new-message", sysMsg);

      // Notify others
      socket.to(roomCode).emit("member-joined", {
        name: guestName,
        members: publicMembers(room.members),
      });

      // Compute projected state for the joiner
      const currentProjected = projectedTime(room.state);

      console.log(`[WatchParty] ${guestName} joined room ${roomCode} | hostTime=${currentProjected.toFixed(2)} playing=${room.state.isPlaying}`);

      // Immediately emit current playback state to the new guest
      // so they don't have to wait for the next sync-tick (fix: guest joining mid-playback)
      socket.emit("playback-sync", {
        type: room.state.isPlaying ? "play" : "pause",
        currentTime: currentProjected,
        serverTime: Date.now(),
      });

      callback({
        success: true,
        mediaId: room.mediaId,
        state: {
          ...room.state,
          currentTime: currentProjected,
        },
        members: publicMembers(room.members),
        messages: room.messages.slice(-50),
        isHost: false,
      });
    });

    // ── Rejoin after reconnect ───────────────────────────────────
    socket.on("rejoin-room", ({ roomCode, name }, callback) => {
      const room = rooms.get(roomCode);
      if (!room) return callback({ success: false, error: "Room not found" });

      // Check if member already exists (by name) and update socket id
      const existingIdx = room.members.findIndex((m) => m.name === name);
      if (existingIdx >= 0) {
        const wasHost = room.members[existingIdx].isHost;
        room.members[existingIdx].id = socket.id;
        room.members[existingIdx].ready = false;
        socket.join(roomCode);
        socket.data.roomCode = roomCode;
        socket.data.name = name;

        if (wasHost) {
          room.hostId = socket.id;
        }

        callback({
          success: true,
          mediaId: room.mediaId,
          state: { ...room.state, currentTime: projectedTime(room.state) },
          members: publicMembers(room.members),
          messages: room.messages.slice(-50),
          isHost: wasHost,
        });
      } else {
        // Treat as new join
        room.members.push({
          id: socket.id,
          name,
          isHost: false,
          joinedAt: Date.now(),
          ready: false,
        });
        socket.join(roomCode);
        socket.data.roomCode = roomCode;
        socket.data.name = name;

        // System message
        const sysMsg: ChatMessage = {
          id: Date.now(),
          name,
          text: `${name} joined the room`,
          timestamp: Date.now(),
          isSystem: true,
        };
        room.messages.push(sysMsg);
        io.to(roomCode).emit("new-message", sysMsg);

        // Notify others
        socket.to(roomCode).emit("member-joined", {
          name,
          members: publicMembers(room.members),
        });

        callback({
          success: true,
          mediaId: room.mediaId,
          state: { ...room.state, currentTime: projectedTime(room.state) },
          members: publicMembers(room.members),
          messages: room.messages.slice(-50),
          isHost: false,
        });
      }
    });

    // ── Member reports ready (buffered) ──────────────────────────
    socket.on("member-ready", ({ roomCode }) => {
      console.log(`[Server] Received member-ready from ${socket.id} (${socket.data.name}) for room ${roomCode}`);
      handleMemberReady(io, roomCode, socket.id);
    });

    // ── HOST playback event ──────────────────────────────────────
    socket.on("playback-event", ({ roomCode, type, currentTime }) => {
      const room = rooms.get(roomCode);
      if (!room) return;
      if (room.hostId !== socket.id) return; // only host

      // Server-side timestamp validation: reject garbage values
      if (typeof currentTime !== "number" || !isFinite(currentTime) || currentTime < 0 || currentTime > 86400) {
        console.warn(`[WatchParty] Rejected invalid timestamp: ${currentTime} from ${socket.data.name}`);
        return;
      }

      const now = Date.now();
      const playAtServerTime = now + 300;

      const guestCount = room.members.filter(m => !m.isHost).length;

      if (type === "play") {
        room.state = { isPlaying: true, currentTime, updatedAt: now };
        console.log(`[Server] Broadcasting play @ ${currentTime.toFixed(2)} to ${guestCount} guests in ${roomCode}`);
        io.to(roomCode).emit("playback-sync", { type: "play", currentTime, serverTime: now, playAtServerTime });
      } else if (type === "pause") {
        room.state = { isPlaying: false, currentTime, updatedAt: now };
        console.log(`[Server] Broadcasting pause @ ${currentTime.toFixed(2)} to ${guestCount} guests in ${roomCode}`);
        io.to(roomCode).emit("playback-sync", { type: "pause", currentTime, serverTime: now, playAtServerTime });
      } else if (type === "seek") {
        room.state = { ...room.state, currentTime, updatedAt: now };
        console.log(`[Server] Broadcasting seek @ ${currentTime.toFixed(2)} to ${guestCount} guests in ${roomCode}`);
        // Broadcast seek to all (including host for confirmation)
        io.to(roomCode).emit("playback-sync", { type: "seek", currentTime, serverTime: now, playAtServerTime });
        // Start ready-check: wait for all members to buffer
        startReadyCheck(io, roomCode);
      }
    });

    // ── Chat message ─────────────────────────────────────────────
    socket.on("chat-message", ({ roomCode, text }) => {
      const room = rooms.get(roomCode);
      if (!room) return;
      if (!text || text.trim().length === 0 || text.length > 200) return;

      const message: ChatMessage = {
        id: Date.now() + Math.random(),
        name: socket.data.name,
        text: text.trim(),
        timestamp: Date.now(),
      };
      room.messages.push(message);
      if (room.messages.length > 200) room.messages.shift();

      io.to(roomCode).emit("new-message", message);
    });

    // ── HOST signals party start (lobby → player) ────────────────
    socket.on("party-started", ({ roomCode }) => {
      console.log(`[Server] party-started received from: ${socket.id}`);
      console.log(`[Server] Room exists: ${rooms.has(roomCode)}`);
      const room = rooms.get(roomCode);
      if (!room) return;
      console.log(`[Server] Is host: ${room.hostId === socket.id} (hostId=${room.hostId}, socketId=${socket.id})`);
      if (room.hostId !== socket.id) return; // only host can start

      console.log(`[Server] Broadcasting party-started to room ${roomCode} (${room.members.length} members)`);
      io.to(roomCode).emit("party-started", { roomCode });
    });

    // ── Disconnect ───────────────────────────────────────────────
    socket.on("disconnect", () => {
      const roomCode = socket.data.roomCode;
      if (!roomCode) return;
      const room = rooms.get(roomCode);
      if (!room) return;

      const leavingName = socket.data.name;
      room.members = room.members.filter((m) => m.id !== socket.id);

      if (room.members.length === 0) {
        stopSyncHeartbeat(room);
        rooms.delete(roomCode);
        console.log(`[WatchParty] Room ${roomCode} deleted (empty)`);
        return;
      }

      if (room.hostId === socket.id) {
        // Transfer host to the longest-standing member
        const newHost = room.members[0];
        room.hostId = newHost.id;
        newHost.isHost = true;

        const sysMsg: ChatMessage = {
          id: Date.now(),
          name: newHost.name,
          text: `${newHost.name} is now the host`,
          timestamp: Date.now(),
          isSystem: true,
        };
        room.messages.push(sysMsg);

        // Tell the NEW host specifically that they are host
        io.to(newHost.id).emit("you-are-host", {
          members: publicMembers(room.members),
        });

        // Tell everyone else about the change (they are NOT host)
        socket.to(roomCode).emit("host-changed", {
          newHostName: newHost.name,
          members: publicMembers(room.members),
        });

        io.to(roomCode).emit("new-message", sysMsg);
        console.log(`[WatchParty] Host transferred to ${newHost.name} in ${roomCode}`);
      } else {
        const sysMsg: ChatMessage = {
          id: Date.now(),
          name: leavingName,
          text: `${leavingName} left the room`,
          timestamp: Date.now(),
          isSystem: true,
        };
        room.messages.push(sysMsg);

        io.to(roomCode).emit("member-left", {
          name: leavingName,
          members: publicMembers(room.members),
        });
        io.to(roomCode).emit("new-message", sysMsg);
      }

      // If we were in a ready-check and the leaving member was the blocker, re-evaluate
      if (room.waitingForReady && room.members.every((m) => m.ready)) {
        completeReadyCheck(io, roomCode);
      }
    });
  });

  const PORT = process.env.PORT || 3000;
  httpServer.listen(PORT, () => {
    console.log(`> VidLock ready on http://localhost:${PORT}`);
  });
});
