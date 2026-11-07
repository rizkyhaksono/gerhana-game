import { expect, test } from "bun:test";
import { autoPick } from "@gerhana/rules";
import { Room } from "../src/room";
import type { ServerMsg } from "../src/protocol";

const inbox = () => {
  const msgs: ServerMsg[] = [];
  return { msgs, send: (m: ServerMsg) => void msgs.push(m), last: (t: string) => [...msgs].reverse().find((m) => m.type === t) };
};

test("bot partner game runs to the end with the human auto-picking", () => {
  const me = inbox();
  const room = new Room("ABCDEF", 7, { turnMs: 0 });
  room.join("Rizky", me.send);
  room.join("Bot", null, true);
  expect(me.last("turn_start")).toBeDefined();
  for (let i = 0; i < 100 && room.combat!.outcome === "ongoing"; i++) room.playCards(0, autoPick(room.combat!, 0));
  expect(me.last("combat_end")).toMatchObject({ type: "combat_end" });
  expect(["won", "lost"]).toContain((me.last("combat_end") as { outcome: string }).outcome);
});

test("turn_start shows only your own hand and every enemy intent", () => {
  const a = inbox(), b = inbox();
  const room = new Room("ABCDEF", 3, { turnMs: 0 });
  room.join("A", a.send);
  room.join("B", b.send);
  const ta = a.last("turn_start") as Extract<ServerMsg, { type: "turn_start" }>;
  const tb = b.last("turn_start") as Extract<ServerMsg, { type: "turn_start" }>;
  expect(ta.hand.every((c) => c.uid.startsWith("0-"))).toBe(true);
  expect(tb.hand.every((c) => c.uid.startsWith("1-"))).toBe(true);
  expect(ta.hand[0]).toHaveProperty("text");
  expect(ta.state.enemies.every((e) => e.intent !== null)).toBe(true);
  expect(JSON.stringify(ta)).not.toContain('"1-');
});

test("invalid picks are rejected and the turn does not resolve", () => {
  const a = inbox();
  const room = new Room("ABCDEF", 3, { turnMs: 0 });
  room.join("A", a.send);
  room.join("Bot", null, true);
  room.playCards(0, []);
  expect(a.last("error")).toEqual({ type: "error", code: "WRONG_COUNT" });
  expect(a.last("turn_resolved")).toBeUndefined();
});

test("two humans: resolves only after both submit; partner sees ready", () => {
  const a = inbox(), b = inbox();
  const room = new Room("ABCDEF", 3, { turnMs: 0 });
  room.join("A", a.send);
  room.join("B", b.send);
  room.playCards(0, autoPick(room.combat!, 0));
  expect(a.last("turn_resolved")).toBeUndefined();
  expect(b.last("partner_ready")).toEqual({ type: "partner_ready", player: 0 });
  room.playCards(1, autoPick(room.combat!, 1));
  expect(a.last("turn_resolved")).toBeDefined();
  expect(b.last("turn_resolved")).toBeDefined();
});

test("a second submission in the same turn is rejected", () => {
  const a = inbox(), b = inbox();
  const room = new Room("ABCDEF", 3, { turnMs: 0 });
  room.join("A", a.send);
  room.join("B", b.send);
  room.playCards(0, autoPick(room.combat!, 0));
  room.playCards(0, autoPick(room.combat!, 0));
  expect(a.last("error")).toEqual({ type: "error", code: "ALREADY_PLAYED" });
});

test("timer auto-picks for a silent player", async () => {
  const a = inbox(), b = inbox();
  const room = new Room("ABCDEF", 3, { turnMs: 20 });
  room.join("A", a.send);
  room.join("B", b.send);
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

test("play_again after combat end starts a fresh combat", () => {
  const a = inbox();
  const room = new Room("ABCDEF", 7, { turnMs: 0 });
  room.join("A", a.send);
  room.join("Bot", null, true);
  for (let i = 0; i < 100 && room.combat!.outcome === "ongoing"; i++) room.playCards(0, autoPick(room.combat!, 0));
  room.playAgain();
  expect(room.combat!.outcome).toBe("ongoing");
  expect(room.combat!.players[0].hp).toBe(42);
});
