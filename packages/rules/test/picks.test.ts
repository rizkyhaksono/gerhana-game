import { expect, test } from "bun:test";
import { createRng } from "../src/rng";
import { autoPick, validatePicks, type PickError } from "../src/picks";
import type { Pick } from "../src/combat";
import { STARTER_DECKS } from "../src/content/cards";
import { cards, combat, enemy, player } from "./fixtures";

const at = (uid: string) => ({ kind: "enemy" as const, uid });
const ally = (id: 0 | 1) => ({ kind: "player" as const, id });
const pk = (cardUid: string, target: Pick["target"]): Pick => ({ cardUid, target });

const state = (over1 = {}) =>
  combat(
    [player(0, { hand: cards(0, ["tebas", "tangkis_pendekar", "jurus_harimau", "tebas"]) }),
      player(1, { hand: cards(1, ["restu", "tangkis_dalang", "pukul_wayang", "panggil_wayang"]), ...over1 })],
    [enemy("tuyul", "e0"), enemy("pocong", "e1", { hp: 0 })],
  );

// object arg always present: a 5th callback param would make bun wait for a done() callback
const cases: [string, PickError, 0 | 1, Pick[], object][] = [
  ["one pick with 4 in hand", "WRONG_COUNT", 0, [pk("0-0", at("e0"))], {}],
  ["card not in hand", "NOT_IN_HAND", 0, [pk("0-0", at("e0")), pk("0-9", at("e0"))], {}],
  ["same card twice", "DUPLICATE", 0, [pk("0-0", at("e0")), pk("0-0", at("e0"))], {}],
  ["bantu aimed at an enemy", "BAD_TARGET", 1, [pk("1-0", at("e0")), pk("1-1", ally(1))], {}],
  ["serang aimed at a player", "BAD_TARGET", 0, [pk("0-0", ally(1)), pk("0-1", ally(0))], {}],
  ["serang aimed at a dead enemy", "BAD_TARGET", 0, [pk("0-0", at("e1")), pk("0-1", ally(0))], {}],
  ["tahan aimed at the partner", "BAD_TARGET", 0, [pk("0-0", at("e0")), pk("0-1", ally(1))], {}],
  ["pingsan player submits", "PINGSAN", 1, [pk("1-0", ally(1)), pk("1-1", ally(1))], { pingsan: true, hp: 0 }],
];

test.each(cases)("rejects %s", (...[, code, who, picks, over]) => {
  const s = state(over);
  const copy = structuredClone(s);
  expect(validatePicks(s, who, picks)).toBe(code);
  expect(s).toEqual(copy);
});

test("valid picks pass, including bantu on the partner", () => {
  expect(validatePicks(state(), 0, [pk("0-0", at("e0")), pk("0-1", ally(0))])).toBeNull();
  expect(validatePicks(state(), 1, [pk("1-0", ally(0)), pk("1-3", ally(1))])).toBeNull();
});

test("bantu on a pingsan partner is rejected", () => {
  const s = state();
  s.players[0].pingsan = true;
  expect(validatePicks(s, 1, [pk("1-0", ally(0)), pk("1-1", ally(1))])).toBe("BAD_TARGET");
});

test("hand of 1 requires exactly 1 pick; pingsan requires none", () => {
  const s = state();
  s.players[0].hand = cards(0, ["tebas"]);
  expect(validatePicks(s, 0, [pk("0-0", at("e0"))])).toBeNull();
  s.players[1].pingsan = true;
  expect(validatePicks(s, 1, [])).toBeNull();
});

test("autoPick takes the first two cards, serang at lowest-hp living enemy, bantu at self", () => {
  const s = state();
  s.enemies = [enemy("kuntilanak", "e0"), enemy("tuyul", "e1", { hp: 4 }), enemy("tuyul", "e2", { hp: 4 })];
  expect(autoPick(s, 0)).toEqual([pk("0-0", at("e1")), pk("0-1", ally(0))]);
  expect(autoPick(s, 1)).toEqual([pk("1-0", ally(1)), pk("1-1", ally(1))]);
});

test("autoPick output always validates", () => {
  const r = createRng(9);
  for (let i = 0; i < 200; i++) {
    const s = state();
    for (const id of [0, 1] as const) {
      const deck = STARTER_DECKS[s.players[id].character];
      s.players[id].hand = cards(id, r.shuffle(deck).slice(0, r.int(0, 4)));
    }
    s.enemies = [enemy("tuyul", "e0", { hp: r.int(0, 12) }), enemy("pocong", "e1", { hp: r.int(1, 18) })];
    for (const id of [0, 1] as const) expect(validatePicks(s, id, autoPick(s, id))).toBeNull();
  }
});
