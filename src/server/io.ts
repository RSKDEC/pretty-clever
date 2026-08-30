import { createServer } from "http";
import { Server } from "socket.io";
import type { ClientAction, GameState } from "../lib/game/types";
import { applyAction, createGame } from "../lib/game/engine";

export type Room = {
  code: string;
  hostId: string;
  names: Map<string, string>;
  sockets: Map<string, string>;
  game: GameState | null;
};

const rooms = new Map<string, Room>();

function code(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  let s = "";
  for (let i = 0; i < 4; i++) s += alphabet[Math.floor(Math.random() * alphabet.length)];
  return rooms.has(s) ? code() : s;
}

function snapshot(room: Room, playerId: string) {
  return {
    code: room.code,
    hostId: room.hostId,
    status: room.game ? room.game.status : ("lobby" as const),
    youId: playerId,
    game: room.game,
    lobby: [...room.names.entries()].map(([id, name]) => ({
      id,
      name,
      host: id === room.hostId,
    })),
  };
}

function emitRoom(io: Server, room: Room) {
  for (const [sid, pid] of room.sockets) {
    io.to(sid).emit("state", snapshot(room, pid));
  }
}

export function attachSocket(httpServer: ReturnType<typeof createServer>) {
  const io = new Server(httpServer, { path: "/socket.io" });

  io.on("connection", (socket) => {
    socket.on("create", ({ name }: { name: string }, cb?: (v: unknown) => void) => {
      const roomCode = code();
      const playerId = socket.id;
      const room: Room = {
        code: roomCode,
        hostId: playerId,
        names: new Map([[playerId, sanitize(name)]]),
        sockets: new Map([[socket.id, playerId]]),
        game: null,
      };
      rooms.set(roomCode, room);
      socket.join(roomCode);
      const snap = snapshot(room, playerId);
      cb?.(snap);
      emitRoom(io, room);
    });

    socket.on("join", ({ code: roomCode, name }: { code: string; name: string }, cb?: (v: unknown) => void) => {
      const room = rooms.get(roomCode.trim().toUpperCase());
      if (!room) {
        cb?.({ error: "No table with that code." });
        return;
      }
      if (room.game && room.game.status === "playing") {
        const existing = [...room.names.entries()].find(([, n]) => n === sanitize(name));
        if (existing) {
          room.sockets.set(socket.id, existing[0]);
          socket.join(room.code);
          cb?.(snapshot(room, existing[0]));
          emitRoom(io, room);
          return;
        }
        cb?.({ error: "That table already started." });
        return;
      }
      if (room.names.size >= 4) {
        cb?.({ error: "That table is full (4 players)." });
        return;
      }
      const playerId = socket.id;
      room.names.set(playerId, sanitize(name));
      room.sockets.set(socket.id, playerId);
      socket.join(room.code);
      cb?.(snapshot(room, playerId));
      emitRoom(io, room);
    });

    socket.on("start", () => {
      const room = roomOf(socket.id);
      if (!room || room.hostId !== socket.id || room.game) return;
      const players = [...room.names.entries()].map(([id, name]) => ({ id, name }));
      room.game = createGame(players);
      emitRoom(io, room);
    });

    socket.on("action", (action: ClientAction) => {
      const room = roomOf(socket.id);
      if (!room?.game) return;
      const pid = room.sockets.get(socket.id);
      if (!pid) return;
      room.game = applyAction(room.game, pid, action);
      emitRoom(io, room);
    });

    socket.on("disconnect", () => {
      const room = roomOf(socket.id);
      if (!room) return;
      room.sockets.delete(socket.id);
      if (room.game) {
        emitRoom(io, room);
        return;
      }
      room.names.delete(socket.id);
      if (room.names.size === 0) {
        rooms.delete(room.code);
        return;
      }
      if (room.hostId === socket.id) {
        room.hostId = [...room.names.keys()][0]!;
      }
      emitRoom(io, room);
    });
  });

  function roomOf(socketId: string): Room | undefined {
    for (const room of rooms.values()) {
      if (room.sockets.has(socketId)) return room;
    }
    return undefined;
  }
}

function sanitize(name: string) {
  const n = name.trim().slice(0, 18);
  return n || "Player";
}
