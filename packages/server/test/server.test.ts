import { afterAll, expect, test } from "bun:test";
import { startServer } from "../src/server";

const server = startServer(0, { turnMs: 0 });
const url = `ws://127.0.0.1:${server.port}`;
afterAll(() => server.stop(true));

function client() {
  const ws = new WebSocket(url);
  const msgs: any[] = [];
  const waiters: [(m: any) => boolean, (m: any) => void][] = [];
  ws.onmessage = (e) => {
    const m = JSON.parse(String(e.data));
    msgs.push(m);
    for (const w of [...waiters]) if (w[0](m)) { waiters.splice(waiters.indexOf(w), 1); w[1](m); }
  };
  const open = new Promise((r) => (ws.onopen = r));
  const next = (type: string) => {
    const found = msgs.find((m) => m.type === type && !m.seen);
    if (found) { found.seen = true; return Promise.resolve(found); }
    return new Promise<any>((r) => waiters.push([(m) => m.type === type && (m.seen = true), r]));
  };
  return { ws, open, next, send: (m: object) => ws.send(JSON.stringify(m)) };
}

test("two clients create and join a room, then both get their own turn_start", async () => {
  const a = client(), b = client();
  await Promise.all([a.open, b.open]);
  a.send({ type: "create_room", name: "A" });
  const room = await a.next("room_state");
  expect(room.code).toMatch(/^[A-Z2-9]{6}$/);
  b.send({ type: "join_room", code: room.code.toLowerCase(), name: "B" });
  const [ra, rb] = await Promise.all([a.next("run_state"), b.next("run_state")]);
  expect(ra.run.phase.kind).toBe("vote");
  expect(rb.run.deck[0].uid).toBe("1-0");
  a.send({ type: "vote", choice: 0 });
  b.send({ type: "vote", choice: 0 });
  const [ta, tb] = await Promise.all([a.next("turn_start"), b.next("turn_start")]);
  expect(ta.hand[0].uid.startsWith("0-")).toBe(true);
  expect(tb.hand[0].uid.startsWith("1-")).toBe(true);
  a.ws.close(); b.ws.close();
});

test("solo with bot partner gets a turn_start right away", async () => {
  const a = client();
  await a.open;
  a.send({ type: "create_room", name: "Solo", bot: true });
  expect((await a.next("run_state")).run.phase.kind).toBe("vote");
  a.send({ type: "vote", choice: 1 });
  const t = await a.next("turn_start");
  expect(t.state.players[1].name).toBe("Bot");
  a.ws.close();
});

test("malformed messages, unknown rooms and invalid picks get error codes", async () => {
  const a = client();
  await a.open;
  a.ws.send("{nope");
  expect((await a.next("error")).code).toBe("BAD_MESSAGE");
  a.send({ type: "join_room", code: "ZZZZZZ", name: "x" });
  expect((await a.next("error")).code).toBe("NO_ROOM");
  a.send({ type: "play_cards", picks: [] });
  expect((await a.next("error")).code).toBe("BAD_MESSAGE"); // no turn
  a.send({ type: "play_cards", turn: 1, picks: [] });
  expect((await a.next("error")).code).toBe("NOT_IN_ROOM");
  a.send({ type: "create_room", name: "A", bot: true });
  await a.next("run_state");
  a.send({ type: "vote", choice: 7 });
  expect((await a.next("error")).code).toBe("BAD_MESSAGE");
  a.send({ type: "rest", choice: "heal" });
  expect((await a.next("error")).code).toBe("WRONG_PHASE");
  a.send({ type: "vote", choice: 0 });
  await a.next("turn_start");
  a.send({ type: "play_cards", turn: 1, picks: [{ cardUid: "0-99", target: { kind: "enemy", uid: "e0" } }, { cardUid: "0-98", target: { kind: "enemy", uid: "e0" } }] });
  expect((await a.next("error")).code).toBe("NOT_IN_HAND");
  a.ws.close();
});

test("foreign origins are refused", async () => {
  const res = await fetch(`http://127.0.0.1:${server.port}`, { headers: { Origin: "https://evil.example", Upgrade: "websocket" } });
  expect(res.status).toBe(403);
});
