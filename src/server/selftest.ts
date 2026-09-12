import assert from "node:assert/strict";
import { mock } from "node:test";
import { createServer } from "node:http";
import { io as client, type Socket } from "socket.io-client";
import { attachSocket } from "./io";

async function main() {
  mock.timers.enable({ apis: ["Date", "setInterval"], now: Date.now() });
  const http = createServer();
  const server = attachSocket(http);
  await new Promise<void>((resolve) => http.listen(0, "127.0.0.1", resolve));
  const address = http.address() as { port: number };
  const sockets: Socket[] = [];
  async function connect() {
    const socket = client(`http://127.0.0.1:${address.port}`, {
      transports: ["websocket"],
      forceNew: true,
    });
    sockets.push(socket);
    await new Promise<void>((resolve) => socket.once("connect", resolve));
    return socket;
  }
  async function request(socket: Socket, event: string, data: unknown) {
    return socket.timeout(2000).emitWithAck(event, data);
  }
  try {
    const host = await connect();
    const created = await request(host, "create", { name: "Host" });
    const originalId = created.youId;
    host.disconnect();
    await new Promise((resolve) => setTimeout(resolve, 50));
    const guest = await connect();
    const joined = await request(guest, "join", {
      code: created.code.toLowerCase(),
      name: "Guest",
    });
    assert.equal(
      joined.error,
      undefined,
      "an invite must survive the host briefly disconnecting",
    );
    assert.equal(joined.lobby.length, 2);
    const restoredHost = await connect();
    const restored = await request(restoredHost, "resume", {
      code: created.code,
      token: created.resumeToken,
    });
    assert.equal(
      restored.youId,
      originalId,
      "reconnect restores the same seat",
    );
    assert.equal(restored.hostId, originalId, "host keeps start authority");
    assert.equal(
      restored.lobby.length,
      2,
      "resume does not duplicate a player",
    );
    assert.ok(restored.lobby.every((p: { connected: boolean }) => p.connected));
    // A refreshed tab may connect before the old socket has disconnected.
    const overlap = await connect();
    const overlapping = await request(overlap, "resume", {
      code: created.code,
      token: created.resumeToken,
    });
    assert.equal(overlapping.lobby.length, 2);
    overlap.disconnect();
    await new Promise((resolve) => setTimeout(resolve, 30));
    const stillConnected = await request(restoredHost, "resume", {
      code: created.code,
      token: created.resumeToken,
    });
    assert.equal(
      stillConnected.lobby.find((p: { id: string }) => p.id === originalId)
        .connected,
      true,
    );

    const intruder = await connect();
    const refused = await request(intruder, "resume", {
      code: created.code,
      token: "invalid",
    });
    assert.ok(refused.error, "resume requires the private seat token");
    const update = new Promise<{ lobby: unknown[] }>((resolve) =>
      restoredHost.once("state", resolve),
    );
    const third = await request(intruder, "join", {
      code: created.code,
      name: "Third",
    });
    assert.equal((await update).lobby.length, 3, "host receives new arrivals");
    assert.notEqual(third.resumeToken, created.resumeToken);
    const started = new Promise<{ game: unknown }>((resolve) =>
      guest.once("state", resolve),
    );
    restoredHost.emit("start");
    assert.ok((await started).game, "restored host can start");
    guest.disconnect();
    await new Promise((resolve) => setTimeout(resolve, 30));
    const guestBack = await connect();
    const gameRestored = await request(guestBack, "resume", {
      code: created.code,
      token: joined.resumeToken,
    });
    assert.equal(gameRestored.youId, joined.youId);
    assert.ok(gameRestored.game);
    const unknown = await request(await connect(), "join", {
      code: "ZZZZ",
      name: "Lost",
    });
    assert.ok(unknown.error);
    // A lobby host who does not return eventually yields the seat to the guest.
    const retiring = await connect();
    const waiting = await request(retiring, "create", { name: "Old host" });
    const successor = await connect();
    const successorSeat = await request(successor, "join", {
      code: waiting.code,
      name: "New host",
    });
    retiring.disconnect();
    await new Promise((resolve) => setTimeout(resolve, 30));
    const promoted = new Promise<{ hostId: string; lobby: unknown[] }>(
      (resolve) => successor.once("state", resolve),
    );
    mock.timers.tick(5 * 60_000 + 30_000);
    const nextHost = await promoted;
    assert.equal(nextHost.hostId, successorSeat.youId);
    assert.equal(nextHost.lobby.length, 1);
    const expiredSeat = await request(await connect(), "resume", {
      code: waiting.code,
      token: waiting.resumeToken,
    });
    assert.ok(expiredSeat.error);

    // Completely empty rooms have a bounded lifetime; active rooms remain usable.
    const absent = await connect();
    const abandoned = await request(absent, "create", { name: "Away" });
    absent.disconnect();
    await new Promise((resolve) => setTimeout(resolve, 30));
    mock.timers.tick(30 * 60_000 + 30_000);
    const expiredRoom = await request(await connect(), "join", {
      code: abandoned.code,
      name: "Late",
    });
    assert.ok(expiredRoom.error);
    const activeRoom = await request(successor, "resume", {
      code: waiting.code,
      token: successorSeat.resumeToken,
    });
    assert.equal(activeRoom.error, undefined);
    console.log(
      "ok: reconnect, private seats, live roster, host start, game resume, overlapping sockets, host transfer, room expiry",
    );
  } finally {
    sockets.forEach((socket) => socket.disconnect());
    await new Promise<void>((resolve) => server.close(() => resolve()));
    mock.timers.reset();
  }
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
