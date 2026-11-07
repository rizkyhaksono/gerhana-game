import type { ServerWebSocket } from "bun";
import { parseClient, type ServerMsg } from "./protocol";
import { Room } from "./room";

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no 0/O/1/I to misread
const MAX_MSGS_PER_10S = 40;
const MAX_JOINS_PER_MIN = 10;

interface Conn { ip: string; room: Room | null; seat: 0 | 1 | null; times: number[] }

/** itch.io serves HTML5 games from *.itch.zone; native Godot clients send no Origin. */
export function originAllowed(origin: string | null): boolean {
  if (!origin) return true;
  try {
    const host = new URL(origin).hostname;
    return host === "localhost" || host === "127.0.0.1" || host.endsWith(".itch.zone");
  } catch {
    return false;
  }
}

function newCode(rooms: Map<string, Room>): string {
  for (;;) {
    const bytes = crypto.getRandomValues(new Uint8Array(6));
    const code = [...bytes].map((b) => CODE_ALPHABET[b % CODE_ALPHABET.length]).join("");
    if (!rooms.has(code)) return code;
  }
}

export function startServer(port: number, opts: { turnMs?: number } = {}) {
  const rooms = new Map<string, Room>();
  const joins = new Map<string, number[]>();
  const send = (ws: ServerWebSocket<Conn>, m: ServerMsg) => ws.send(JSON.stringify(m));

  const tooMany = (times: number[], limit: number, windowMs: number) => {
    const now = Date.now();
    while (times.length && now - times[0] > windowMs) times.shift();
    times.push(now);
    return times.length > limit;
  };

  return Bun.serve<Conn, {}>({
    port,
    hostname: process.env.HOST ?? "127.0.0.1",
    fetch(req, server) {
      if (!originAllowed(req.headers.get("origin"))) return new Response("forbidden origin", { status: 403 });
      const ip = server.requestIP(req)?.address ?? "?";
      if (server.upgrade(req, { data: { ip, room: null, seat: null, times: [] } })) return;
      return new Response("Gerhana server: connect with WebSocket", { status: 426 });
    },
    websocket: {
      maxPayloadLength: 4096,
      message(ws, raw) {
        const c = ws.data;
        if (tooMany(c.times, MAX_MSGS_PER_10S, 10_000)) return ws.close(1008, "rate limit");
        const msg = parseClient(String(raw));
        if (!msg) return send(ws, { type: "error", code: "BAD_MESSAGE" });

        if (msg.type === "create_room" || msg.type === "join_room") {
          if (c.room) return send(ws, { type: "error", code: "ALREADY_IN_ROOM" });
          if (tooMany(joins.get(c.ip) ?? joins.set(c.ip, []).get(c.ip)!, MAX_JOINS_PER_MIN, 60_000)) {
            return send(ws, { type: "error", code: "SLOW_DOWN" });
          }
          let room: Room | undefined;
          if (msg.type === "create_room") {
            room = new Room(newCode(rooms), crypto.getRandomValues(new Uint32Array(1))[0], opts);
            rooms.set(room.code, room);
          } else {
            room = rooms.get(msg.code);
            if (!room) return send(ws, { type: "error", code: "NO_ROOM" });
          }
          c.room = room;
          const seat = room.join(msg.name, (m) => send(ws, m));
          if (seat === "FULL") {
            c.room = null;
            return send(ws, { type: "error", code: "ROOM_FULL" });
          }
          c.seat = seat;
          if (msg.type === "create_room" && msg.bot) room.join("Bot", null, true);
          return;
        }

        if (!c.room || c.seat === null) return send(ws, { type: "error", code: "NOT_IN_ROOM" });
        const seat = c.seat;
        switch (msg.type) {
          case "play_cards": return c.room.playCards(seat, msg.picks);
          case "play_again": return c.room.playAgain();
          case "vote": return c.room.act(seat, { kind: "vote", player: seat, choice: msg.choice });
          case "choose_card": return c.room.act(seat, { kind: "chooseCard", player: seat, defId: msg.defId });
          case "choose_pusaka": return c.room.act(seat, { kind: "choosePusaka", player: seat, id: msg.id });
          case "rest": return c.room.act(seat, { kind: "rest", player: seat, choice: msg.choice });
          case "shop_buy": return c.room.act(seat, { kind: "shopBuy", player: seat, defId: msg.defId });
          case "shop_remove": return c.room.act(seat, { kind: "shopRemove", player: seat, cardUid: msg.cardUid });
          case "leave": return c.room.act(seat, { kind: "leave", player: seat });
        }
      },
      close(ws) {
        const { room, seat } = ws.data;
        if (!room || seat === null) return;
        room.leave(seat);
        if (room.empty) {
          room.dispose();
          rooms.delete(room.code);
        }
      },
    },
  });
}

if (import.meta.main) {
  const s = startServer(Number(process.env.PORT ?? 8787));
  console.log(`Gerhana server on ws://${s.hostname}:${s.port}`);
}
