import { createServer } from "http";
import { parse } from "url";
import next from "next";
import { Server as SocketIOServer } from "socket.io";

const dev = process.env.NODE_ENV !== "production";
const app = next({ dev });
const handle = app.getRequestHandler();

// ─── Types ───────────────────────────────────────────────────────

interface Member {
  id: string;
  name: string;
  isHost: boolean;
  joinedAt: number;
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
  updatedAt: number;
}

interface Room {
  mediaId: number;
  hostId: string;
  hostName: string;
  members: Member[];
  messages: ChatMessage[];
  state: PlaybackState;
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
  return members.map((m) => ({ name: m.name, isHost: m.isHost }));
}

// ─── Boot ────────────────────────────────────────────────────────

app.prepare().then(() => {
  const httpServer = createServer((req, res) => {
    const parsedUrl = parse(req.url!, true);
    handle(req, res, parsedUrl);
  });

  const io = new SocketIOServer(httpServer, {
    cors: { origin: "*", methods: ["GET", "POST"] },
    transports: ["websocket", "polling"],
  });

  io.on("connection", (socket) => {
    // ── HOST creates a room ──────────────────────────────────────
    socket.on("create-room", ({ mediaId, hostName }, callback) => {
      const roomCode = generateRoomCode();
      const room: Room = {
        mediaId,
        hostId: socket.id,
        hostName,
        members: [
          { id: socket.id, name: hostName, isHost: true, joinedAt: Date.now() },
        ],
        messages: [],
        state: { isPlaying: false, currentTime: 0, updatedAt: Date.now() },
      };
      rooms.set(roomCode, room);
      socket.join(roomCode);
      socket.data.roomCode = roomCode;
      socket.data.name = hostName;
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

      console.log(`[WatchParty] ${guestName} joined room ${roomCode}`);
      callback({
        success: true,
        mediaId: room.mediaId,
        state: room.state,
        members: publicMembers(room.members),
        messages: room.messages.slice(-50),
        isHost: false,
      });
    });

    // ── HOST playback event ──────────────────────────────────────
    socket.on("playback-event", ({ roomCode, type, currentTime }) => {
      const room = rooms.get(roomCode);
      if (!room) return;
      if (room.hostId !== socket.id) return; // only host

      if (type === "play" || type === "pause") {
        room.state = { isPlaying: type === "play", currentTime, updatedAt: Date.now() };
      } else if (type === "seek") {
        room.state = { ...room.state, currentTime, updatedAt: Date.now() };
      } else if (type === "sync-check") {
        room.state = { ...room.state, currentTime, updatedAt: Date.now() };
      }

      socket.to(roomCode).emit("playback-sync", { type, currentTime });
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
        rooms.delete(roomCode);
        console.log(`[WatchParty] Room ${roomCode} deleted (empty)`);
        return;
      }

      if (room.hostId === socket.id) {
        // Transfer host
        room.hostId = room.members[0].id;
        room.members[0].isHost = true;

        const sysMsg: ChatMessage = {
          id: Date.now(),
          name: room.members[0].name,
          text: `${room.members[0].name} is now the host`,
          timestamp: Date.now(),
          isSystem: true,
        };
        room.messages.push(sysMsg);

        io.to(roomCode).emit("host-changed", {
          newHostName: room.members[0].name,
          members: publicMembers(room.members),
        });
        io.to(roomCode).emit("new-message", sysMsg);
        console.log(`[WatchParty] Host transferred to ${room.members[0].name} in ${roomCode}`);
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
    });
  });

  const PORT = process.env.PORT || 3000;
  httpServer.listen(PORT, () => {
    console.log(`> VidLock ready on http://localhost:${PORT}`);
  });
});
