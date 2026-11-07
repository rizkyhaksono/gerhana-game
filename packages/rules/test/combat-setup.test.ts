import { ENEMIES } from "../src/content/enemies";
import { expect, test } from "bun:test";
import { createRng } from "../src/rng";
import { endTurn, startCombat, startTurn } from "../src/combat";
import { cards, combat, enemy, player } from "./fixtures";

test("startCombat builds enemies from the encounter at full hp", () => {
  const s = startCombat([player(0, { draw: cards(0, ["tebas"]) }), player(1)], "n2", createRng(1));
  expect(s.enemies.map((e) => [e.defId, e.hp, e.uid])).toEqual([["pocong", ENEMIES.pocong.hp, "e0"], ["jenglot", ENEMIES.jenglot.hp, "e1"]]);
  expect(s.outcome).toBe("ongoing");
});

test("startTurn draws 4 and reshuffles discard", () => {
  const p0 = player(0, { draw: cards(0, ["tebas", "tebas"]), discard: cards(0, ["tebas", "tebas", "tebas"], 2) });
  const s = startTurn(combat([p0, player(1)], [enemy("pocong", "e0")]), createRng(3));
  expect(s.players[0].hand.length).toBe(4);
  expect(s.players[0].draw.length).toBe(1);
  expect(s.players[0].discard.length).toBe(0);
});

test("draws fewer when deck is tiny", () => {
  const s = startTurn(combat([player(0, { draw: cards(0, ["tebas", "tebas", "tebas"]) }), player(1)], [enemy("pocong", "e0")]), createRng(3));
  expect(s.players[0].hand.length).toBe(3);
});

test("intents never target pingsan players", () => {
  for (let seed = 0; seed < 50; seed++) {
    const s = startTurn(combat([player(0, { pingsan: true, hp: 0 }), player(1)],
      [enemy("kuntilanak", "e0", { patternIndex: 1 }), enemy("jenglot", "e1")]), createRng(seed));
    for (const e of s.enemies) expect(e.intent!.targets).toEqual([1]);
  }
});

test("banaspati switches to phase 2 at 50% hp", () => {
  const s = startTurn(combat([player(0), player(1)], [enemy("banaspati", "e0", { hp: 70, patternIndex: 1 })]), createRng(1));
  expect(s.enemies[0].phase).toBe(2);
  expect(s.enemies[0].intent).toMatchObject({ kind: "status", status: "terbakar", stacks: 3 });
});

test("evade intent marks the enemy as evading", () => {
  const s = startTurn(combat([player(0), player(1)], [enemy("pocong", "e0")]), createRng(1));
  expect(s.enemies[0].evading).toBe(true);
});

test("terbakar kills last enemy → won", () => {
  const s = endTurn(combat([player(0), player(1)], [enemy("tuyul", "e0", { hp: 2, statuses: { terbakar: 2 } })]));
  expect(s.enemies[0].hp).toBe(0);
  expect(s.outcome).toBe("won");
});

test("terbakar drops both players same tick → lost", () => {
  const burn = { hp: 1, statuses: { terbakar: 1 } };
  const s = endTurn(combat([player(0, burn), player(1, burn)], [enemy("tuyul", "e0")]));
  expect(s.players.map((p) => p.pingsan)).toEqual([true, true]);
  expect(s.outcome).toBe("lost");
});

test("endTurn discards hand, clears block, keeps wayang, and wayang absorbs burn", () => {
  const p0 = player(0, { hand: cards(0, ["tebas"]), block: 5, wayang: 4, statuses: { terbakar: 3 } });
  const s = endTurn(combat([p0, player(1)], [enemy("tuyul", "e0")]));
  expect(s.players[0]).toMatchObject({ hand: [], block: 0, wayang: 1, hp: 30, statuses: { terbakar: 2 } });
  expect(s.players[0].discard.length).toBe(1);
});

test("functions do not mutate their input", () => {
  const before = combat([player(0, { draw: cards(0, ["tebas"]) }), player(1)], [enemy("pocong", "e0")]);
  const copy = structuredClone(before);
  startTurn(before, createRng(1));
  endTurn(before);
  expect(before).toEqual(copy);
});

test("perisai absorbs terbakar before it is cleared (spec §4.1 3.4 before 4)", () => {
  const s = endTurn(combat([player(0, { block: 5, statuses: { terbakar: 3 } }), player(1)], [enemy("tuyul", "e0")]));
  expect(s.players[0]).toMatchObject({ hp: 30, block: 0 });
});
