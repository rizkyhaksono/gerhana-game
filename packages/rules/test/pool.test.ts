import { ENEMIES } from "../src/content/enemies";
import { expect, test } from "bun:test";
import { CARDS, REWARD_POOL } from "../src/content/cards";
import { PUSAKA } from "../src/content/pusaka";
import { createRng } from "../src/rng";
import { resolveTurn, startCombat } from "../src/combat";
import { cards, combat, enemy, player } from "./fixtures";

const KINDS = new Set(["damage", "block", "wayang", "buffAttack", "status"]);

test("pool sizes and constraints", () => {
  for (const c of ["pendekar", "dalang"] as const) {
    expect(REWARD_POOL[c].length).toBe(15);
    expect(new Set(REWARD_POOL[c]).size).toBe(15);
    expect(REWARD_POOL[c].filter((id) => CARDS[id].tags.includes("serempak")).length).toBeGreaterThanOrEqual(3);
    for (const id of REWARD_POOL[c]) {
      expect(CARDS[id].owner).toBe(c);
      for (const fx of [...CARDS[id].effects, ...CARDS[id].upgraded.effects]) expect(KINDS.has(fx.kind)).toBe(true);
    }
  }
  expect(REWARD_POOL.dalang.filter((id) => CARDS[id].type === "bantu").length).toBeGreaterThanOrEqual(4);
});

test("pusaka count and shared count", () => {
  expect(Object.keys(PUSAKA).length).toBe(10);
  expect(Object.values(PUSAKA).filter((p) => p.shared).length).toBe(4);
  expect(PUSAKA.keris_kembar.hook).toEqual({ on: "serempakBonus", amount: 2 });
});

test("keris kembar adds 2 to serempak for both players", () => {
  const idle = { kind: "charge" as const, targets: [] as (0 | 1)[] };
  const p0 = player(0, { hand: cards(0, ["serbu_bersama"]), pusaka: ["keris_kembar"] });
  const p1 = player(1, { hand: cards(1, ["lakon_kembar"]) });
  const at = { kind: "enemy" as const, uid: "e0" };
  const { state } = resolveTurn(combat([p0, p1], [enemy("banaspati", "e0", { intent: idle })]),
    [[{ cardUid: "0-0", target: at }], [{ cardUid: "1-0", target: at }]], createRng(1));
  // serbu_bersama 6 + 6 + 2, lakon_kembar 5 + 5 + 2 (shared from partner)
  expect(state.enemies[0].hp).toBe(ENEMIES.banaspati.hp - 14 - 12);
});

test("combatStart pusaka grant block and shared wayang", () => {
  const s = startCombat([player(0, { pusaka: ["kemenyan", "selendang_sutra"] }), player(1)], "n2", createRng(1));
  expect(s.players[0]).toMatchObject({ block: 6, wayang: 4 });
  expect(s.players[1]).toMatchObject({ block: 0, wayang: 4 });
});
