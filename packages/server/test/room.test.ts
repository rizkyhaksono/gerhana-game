import { expect, test } from "bun:test";
import { autoPick } from "@gerhana/rules";
import { Room } from "../src/room";
import type { ServerMsg } from "../src/protocol";

type Of<T extends ServerMsg["type"]> = Extract<ServerMsg, { type: T }>;
const inbox = () => {
  const msgs: ServerMsg[] = [];
  return {
    msgs,
    send: (m: ServerMsg) => void msgs.push(m),
    last: <T extends ServerMsg["type"]>(t: T) => [...msgs].reverse().find((m) => m.type === t) as Of<T> | undefined,
  };
};

/** Drive the human seat through a whole run with simple choices. */
function playRun(room: Room, me: ReturnType<typeof inbox>, seat: 0 | 1 = 0) {
  for (let i = 0; i < 3000; i++) {
    const r = room.run!;
    const ph = r.phase;
    if (ph.kind === "ended") return;
    if (ph.kind === "combat") room.playCards(seat, autoPick(ph.combat, seat));
    else if (ph.kind === "vote") room.act(seat, { kind: "vote", player: seat, choice: 0 });
    else if (ph.kind === "reward" && ph.pusakaOffer && ph.pusakaChooser === seat) room.act(seat, { kind: "choosePusaka", player: seat, id: ph.pusakaOffer[0] });
    else if (ph.kind === "reward" && !ph.done[seat]) room.act(seat, { kind: "chooseCard", player: seat, defId: ph.offers[seat][0] });
    else if (ph.kind === "rest" && !ph.done[seat]) room.act(seat, { kind: "rest", player: seat, choice: "heal" });
    else if (ph.kind === "shop" && !ph.done[seat]) room.act(seat, { kind: "leave", player: seat });
    else throw new Error(`stuck in ${ph.kind}: ${JSON.stringify(me.msgs.at(-1))}`);
  }
}

test("bot partner run goes from the first vote to the end", () => {
  const me = inbox();
  const room = new Room("ABCDEF", 7, { turnMs: 0 });
  room.join("Rizky", me.send);
  room.join("Bot", null, true);
  expect(me.last("run_state")!.run.phase.kind).toBe("vote");
  playRun(room, me);
  expect(me.last("run_state")!.run.phase.kind).toBe("ended");
  expect(me.msgs.some((m) => m.type === "combat_end")).toBe(true);
});

test("turn_start shows only your own hand and every enemy intent", () => {
  const a = inbox(), b = inbox();
  const room = new Room("ABCDEF", 3, { turnMs: 0 });
  room.join("A", a.send);
  room.join("B", b.send);
  room.act(0, { kind: "vote", player: 0, choice: 0 });
  room.act(1, { kind: "vote", player: 1, choice: 0 });
  const ta = a.last("turn_start")!, tb = b.last("turn_start")!;
  expect(ta.hand.every((c) => c.uid.startsWith("0-"))).toBe(true);
  expect(tb.hand.every((c) => c.uid.startsWith("1-"))).toBe(true);
  expect(ta.state.enemies.every((e) => e.intent !== null)).toBe(true);
  expect(JSON.stringify(ta)).not.toContain('"uid":"1-');
});

test("bot follows the human's vote", () => {
  const a = inbox();
  const room = new Room("ABCDEF", 3, { turnMs: 0 });
  room.join("A", a.send);
  room.join("Bot", null, true);
  expect(room.run!.phase.kind).toBe("vote");
  room.act(0, { kind: "vote", player: 0, choice: 1 });
  expect(room.run!.phase.kind).toBe("combat");
});

test("invalid picks and wrong-phase actions get error codes", () => {
  const a = inbox();
  const room = new Room("ABCDEF", 3, { turnMs: 0 });
  room.join("A", a.send);
  room.join("Bot", null, true);
  room.act(0, { kind: "rest", player: 0, choice: "heal" });
  expect(a.last("error")).toEqual({ type: "error", code: "WRONG_PHASE" });
  room.playCards(0, []);
  expect(a.last("error")).toEqual({ type: "error", code: "NO_COMBAT" });
  room.act(0, { kind: "vote", player: 0, choice: 0 });
  room.playCards(0, []);
  expect(a.last("error")).toEqual({ type: "error", code: "WRONG_COUNT" });
});

test("two humans: a turn resolves only after both submit; partner sees ready", () => {
  const a = inbox(), b = inbox();
  const room = new Room("ABCDEF", 3, { turnMs: 0 });
  room.join("A", a.send);
  room.join("B", b.send);
  room.act(0, { kind: "vote", player: 0, choice: 0 });
  room.act(1, { kind: "vote", player: 1, choice: 0 });
  room.playCards(0, autoPick(room.combat!, 0));
  expect(a.last("turn_resolved")).toBeUndefined();
  expect(b.last("partner_ready")).toEqual({ type: "partner_ready", player: 0 });
  room.playCards(0, autoPick(room.combat!, 0));
  expect(a.last("error")).toEqual({ type: "error", code: "ALREADY_PLAYED" });
  room.playCards(1, autoPick(room.combat!, 1));
  expect(a.last("turn_resolved")).toBeDefined();
});

test("timer auto-picks for a silent player", async () => {
  const a = inbox(), b = inbox();
  const room = new Room("ABCDEF", 3, { turnMs: 20 });
  room.join("A", a.send);
  room.join("B", b.send);
  room.act(0, { kind: "vote", player: 0, choice: 0 });
  room.act(1, { kind: "vote", player: 1, choice: 0 });
  room.playCards(0, autoPick(room.combat!, 0));
  await Bun.sleep(60);
  expect(a.last("turn_resolved")).toBeDefined();
  room.dispose();
});

test("a third player cannot join", () => {
  const room = new Room("ABCDEF", 3, { turnMs: 0 });
  room.join("A", () => {});
  room.join("B", () => {});
  expect(room.join("C", () => {})).toBe("FULL");
});

test("play_again after the run ends starts a new run", () => {
  const a = inbox();
  const room = new Room("ABCDEF", 7, { turnMs: 0 });
  room.join("A", a.send);
  room.join("Bot", null, true);
  playRun(room, a);
  room.playAgain();
  expect(room.run!.phase.kind).toBe("vote");
  expect(room.run!.players[0].hp).toBe(42);
});

test("a dropped player is replaced by the bot and the run continues", () => {
  const a = inbox(), b = inbox();
  const room = new Room("ABCDEF", 3, { turnMs: 0 });
  room.join("A", a.send);
  room.join("B", b.send);
  room.leave(1);
  playRun(room, a);
  expect(a.last("run_state")!.run.phase.kind).toBe("ended");
});

test("a play_cards for an earlier turn is rejected, never applied to the new hand", () => {
  const a = inbox(), b = inbox();
  const room = new Room("ABCDEF", 3, { turnMs: 0 });
  room.join("A", a.send);
  room.join("B", b.send);
  room.act(0, { kind: "vote", player: 0, choice: 0 });
  room.act(1, { kind: "vote", player: 1, choice: 0 });
  const t1 = room.combat!.turn;
  const late = autoPick(room.combat!, 0);
  room.playCards(0, autoPick(room.combat!, 0), t1);
  room.playCards(1, autoPick(room.combat!, 1), t1);
  room.playCards(0, late, t1);
  expect(a.last("error")).toEqual({ type: "error", code: "STALE_TURN" });
});
