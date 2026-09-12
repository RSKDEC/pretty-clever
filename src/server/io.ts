import { randomUUID } from "node:crypto";
import { createServer } from "http";
import { Server } from "socket.io";
import { isClientAction, type GameState } from "../lib/game/types";
import { applyAction, createGame } from "../lib/game/engine";

type Room = {
  code: string;
  hostId: string;
  names: Map<string, string>;
  tokens: Map<string, string>;
  sockets: Map<string, string>;
  disconnectedAt: Map<string, number>;
  idleSince: number | null;
  game: GameState | null;
};

export function attachSocket(httpServer: ReturnType<typeof createServer>) {
  const io = new Server(httpServer, { path: "/socket.io" });
  const rooms = new Map<string, Room>();
  const roomLifetime = 30 * 60_000;
  const seatGrace = 5 * 60_000;

  function code(): string {
    const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ";
    const value = Array.from(
      { length: 4 },
      () => alphabet[Math.floor(Math.random() * alphabet.length)],
    ).join("");
    return rooms.has(value) ? code() : value;
  }
  function connected(room: Room, id: string) {
    return [...room.sockets.values()].includes(id);
  }
  function snapshot(room: Room, playerId: string) {
    return {
      code: room.code,
      hostId: room.hostId,
      status: room.game ? room.game.status : "lobby",
      youId: playerId,
      // This credential is sent only to its owner, never in the shared roster.
      resumeToken: room.tokens.get(playerId),
      game: room.game,
      lobby: [...room.names].map(([id, name]) => ({
        id,
        name,
        host: id === room.hostId,
        connected: connected(room, id),
      })),
    };
  }
  function emitRoom(room: Room) {
    if (room.game) {
      for (const player of room.game.players)
        player.connected = connected(room, player.id);
    }
    for (const [sid, pid] of room.sockets)
      io.to(sid).emit("state", snapshot(room, pid));
  }
  function roomOf(socketId: string) {
    return [...rooms.values()].find((room) => room.sockets.has(socketId));
  }
  function lookup(rawCode: string) {
    const room = rooms.get(rawCode.trim().toUpperCase());
    if (
      room &&
      room.idleSince !== null &&
      Date.now() - room.idleSince >= roomLifetime
    ) {
      rooms.delete(room.code);
      return undefined;
    }
    return room;
  }
  const cleanup = setInterval(() => {
    for (const room of rooms.values()) {
      if (
        room.idleSince !== null &&
        Date.now() - room.idleSince >= roomLifetime
      ) {
        rooms.delete(room.code);
      } else if (!room.game && room.sockets.size) {
        let changed = false;
        for (const [id, at] of room.disconnectedAt) {
          if (Date.now() - at < seatGrace) continue;
          room.names.delete(id);
          room.tokens.delete(id);
          room.disconnectedAt.delete(id);
          changed = true;
        }
        if (!room.names.has(room.hostId))
          room.hostId = room.sockets.values().next().value!;
        if (changed) emitRoom(room);
      }
    }
  }, 30_000);
  cleanup.unref();
  io.on("close", () => clearInterval(cleanup));
  httpServer.on("close", () => clearInterval(cleanup));

  io.on("connection", (socket) => {
    function bind(room: Room, playerId: string) {
      room.sockets.set(socket.id, playerId);
      room.disconnectedAt.delete(playerId);
      room.idleSince = null;
      socket.join(room.code);
    }
    function alreadyJoined(cb?: (value: unknown) => void) {
      const room = roomOf(socket.id);
      if (!room) return false;
      cb?.({
        error: "You are already seated at a table. Reload to restore it.",
      });
      return true;
    }
    socket.on("create", (payload: unknown, cb?: (v: unknown) => void) => {
      if (!isCreatePayload(payload))
        return cb?.({ error: "Enter a valid player name." });
      if (alreadyJoined(cb)) return;
      const playerId = randomUUID();
      const room: Room = {
        code: code(),
        hostId: playerId,
        names: new Map([[playerId, sanitize(payload.name)]]),
        tokens: new Map([[playerId, randomUUID()]]),
        sockets: new Map(),
        disconnectedAt: new Map(),
        idleSince: null,
        game: null,
      };
      rooms.set(room.code, room);
      bind(room, playerId);
      cb?.(snapshot(room, playerId));
      emitRoom(room);
    });
    socket.on("join", (payload: unknown, cb?: (v: unknown) => void) => {
      if (!isJoinPayload(payload))
        return cb?.({
          error: "Enter a valid name and four-letter table code.",
        });
      if (alreadyJoined(cb)) return;
      const room = lookup(payload.code);
      if (!room)
        return cb?.({
          error:
            "Table not found. Check the code and site address with the host. The table may have expired or the server restarted.",
        });
      if (room.game)
        return cb?.({
          error:
            "That table already started. Return in the browser where you joined to restore your seat.",
        });
      if (room.names.size >= 4)
        return cb?.({
          error:
            "That table is full (4 players, including temporarily offline seats).",
        });
      const playerId = randomUUID();
      room.names.set(playerId, sanitize(payload.name));
      room.tokens.set(playerId, randomUUID());
      bind(room, playerId);
      cb?.(snapshot(room, playerId));
      emitRoom(room);
    });
    socket.on("resume", (payload: unknown, cb?: (v: unknown) => void) => {
      if (!isResumePayload(payload))
        return cb?.({ error: "Invalid saved seat." });
      const room = lookup(payload.code);
      if (!room)
        return cb?.({
          error:
            "Your table expired or the server restarted. Ask the host for a new table code.",
        });
      const playerId = [...room.tokens].find(
        ([, token]) => token === payload.token,
      )?.[0];
      if (!playerId)
        return cb?.({
          error: "Your saved seat has expired. Join the table again.",
        });
      const current = roomOf(socket.id);
      if (
        current &&
        (current !== room || current.sockets.get(socket.id) !== playerId)
      )
        return cb?.({ error: "This connection already has a different seat." });
      bind(room, playerId);
      cb?.(snapshot(room, playerId));
      emitRoom(room);
    });
    socket.on("start", () => {
      const room = roomOf(socket.id);
      if (!room || room.hostId !== room.sockets.get(socket.id) || room.game)
        return;
      // Do not start a game with a player still trying to reconnect.
      if ([...room.names.keys()].some((id) => !connected(room, id))) return;
      room.game = createGame(
        [...room.names].map(([id, name]) => ({ id, name })),
      );
      emitRoom(room);
    });
    socket.on("action", (action: unknown) => {
      const room = roomOf(socket.id);
      if (!room?.game || !isClientAction(action)) return;
      const pid = room.sockets.get(socket.id)!;
      room.game = applyAction(room.game, pid, action);
      emitRoom(room);
    });
    socket.on("disconnect", () => {
      const room = roomOf(socket.id);
      if (!room) return;
      const playerId = room.sockets.get(socket.id)!;
      room.sockets.delete(socket.id);
      if (!connected(room, playerId))
        room.disconnectedAt.set(playerId, Date.now());
      if (!room.sockets.size) room.idleSince = Date.now();
      emitRoom(room);
    });
  });
  return io;
}
function sanitize(name: string) {
  return name.trim().slice(0, 18) || "Player";
}
function record(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function isCreatePayload(value: unknown): value is { name: string } {
  return (
    record(value) &&
    Object.keys(value).length === 1 &&
    typeof value.name === "string"
  );
}
function isJoinPayload(
  value: unknown,
): value is { name: string; code: string } {
  return (
    record(value) &&
    Object.keys(value).length === 2 &&
    typeof value.name === "string" &&
    typeof value.code === "string" &&
    /^[A-Za-z]{4}$/.test(value.code.trim())
  );
}
function isResumePayload(
  value: unknown,
): value is { code: string; token: string } {
  return (
    record(value) &&
    typeof value.code === "string" &&
    /^[A-Za-z]{4}$/.test(value.code.trim()) &&
    typeof value.token === "string" &&
    value.token.length <= 128
  );
}
