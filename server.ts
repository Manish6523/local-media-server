import { createServer } from "http";
import { parse } from "url";
import next from "next";
import { Server as SocketIOServer, Socket } from "socket.io";
import { spawn } from "child_process";
import fs from "fs";

const dev = process.env.NODE_ENV !== "production";
const app = next({ dev });
const handle = app.getRequestHandler();

// ─── VAAPI Startup Probe ─────────────────────────────────────────
// Probe once at boot, cache forever. The transcode route reads this.
const VAAPI_DEVICE = "/dev/dri/renderD128";

// Exported via globalThis so the API route can read it
declare global {
  // eslint-disable-next-line no-var
  var __vaapiAvailable: boolean;
}
globalThis.__vaapiAvailable = false;

async function probeVaapiAtStartup(): Promise<void> {
  if (!fs.existsSync(VAAPI_DEVICE)) {
    console.log("[Server] VAAPI device not found, GPU encoding disabled");
    globalThis.__vaapiAvailable = false;
    return;
  }

  return new Promise((resolve) => {
    const probe = spawn("ffmpeg", [
      "-hide_banner", "-loglevel", "error",
      "-hwaccel", "vaapi",
      "-hwaccel_device", VAAPI_DEVICE,
      "-f", "lavfi", "-i", "nullsrc=s=320x240:d=0.1",
      "-t", "1",
      "-f", "null", "-",
    ], { stdio: ["pipe", "pipe", "pipe"] });

    let stderr = "";
    probe.stderr?.on("data", (d: Buffer) => { stderr += d.toString(); });

    probe.on("close", (code) => {
      globalThis.__vaapiAvailable = code === 0;
      if (globalThis.__vaapiAvailable) {
        console.log("[Server] AMD Vega 10 VAAPI: ✓ ready");
      } else {
        console.log(`[Server] VAAPI probe failed (code ${code}): ${stderr.slice(0, 200)}`);
      }
      resolve();
    });

    probe.on("error", (err) => {
      console.log(`[Server] VAAPI probe error: ${err.message}`);
      globalThis.__vaapiAvailable = false;
      resolve();
    });

    setTimeout(() => {
      probe.kill("SIGKILL");
      console.log("[Server] VAAPI probe timed out");
      globalThis.__vaapiAvailable = false;
      resolve();
    }, 5000);
  });
}
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

    const projected = projectedTime(r.state);

    io.to(roomCode).emit("sync-tick", {
      isPlaying: r.state.isPlaying,
      currentTime: projected,
      serverTime: Date.now(),
    });
  }, 3000); // Every 3 seconds
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

  // Mark all members as not ready
  room.waitingForReady = true;
  for (const m of room.members) m.ready = false;

  // Pause playback while waiting
  room.state.isPlaying = false;
  room.state.updatedAt = Date.now();

  io.to(roomCode).emit("waiting-for-ready", {
    members: publicMembers(room.members),
  });

  // Timeout: resume anyway after 8 seconds
  if (room.readyTimeout) clearTimeout(room.readyTimeout);
  room.readyTimeout = setTimeout(() => {
    const r = rooms.get(roomCode);
    if (!r || !r.waitingForReady) return;

    console.log(`[WatchParty] Ready timeout in ${roomCode}, resuming anyway`);
    completeReadyCheck(io, roomCode);
  }, 8000);
}

function handleMemberReady(io: SocketIOServer, roomCode: string, socketId: string) {
  const room = rooms.get(roomCode);
  if (!room) return;

  const member = room.members.find((m) => m.id === socketId);
  if (member) member.ready = true;

  io.to(roomCode).emit("member-ready-update", {
    members: publicMembers(room.members),
  });

  // Check if all members are ready
  if (room.waitingForReady && room.members.every((m) => m.ready)) {
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
  // Probe VAAPI before anything else
  await probeVaapiAtStartup();

  const httpServer = createServer((req, res) => {
    const parsedUrl = parse(req.url!, true);
    handle(req, res, parsedUrl);
  });

  const io = new SocketIOServer(httpServer, {
    cors: { origin: "*", methods: ["GET", "POST"] },
    transports: ["websocket", "polling"],
  });

  io.on("connection", (socket: Socket) => {
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

      console.log(`[WatchParty] ${guestName} joined room ${roomCode}`);
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
      handleMemberReady(io, roomCode, socket.id);
    });

    // ── HOST playback event ──────────────────────────────────────
    socket.on("playback-event", ({ roomCode, type, currentTime }) => {
      const room = rooms.get(roomCode);
      if (!room) return;
      if (room.hostId !== socket.id) return; // only host

      const now = Date.now();

      if (type === "play") {
        room.state = { isPlaying: true, currentTime, updatedAt: now };
        socket.to(roomCode).emit("playback-sync", { type: "play", currentTime, serverTime: now });
      } else if (type === "pause") {
        room.state = { isPlaying: false, currentTime, updatedAt: now };
        socket.to(roomCode).emit("playback-sync", { type: "pause", currentTime, serverTime: now });
      } else if (type === "seek") {
        room.state = { ...room.state, currentTime, updatedAt: now };
        // Broadcast seek to all (including host for confirmation)
        io.to(roomCode).emit("playback-sync", { type: "seek", currentTime, serverTime: now });
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
