import { afterAll, expect, test } from "bun:test";
import { createRng } from "../src/rng";
import { resolveTurn, type Pick, type Picks } from "../src/combat";
import { CARDS } from "../src/content/cards";
import { cards, combat, enemy, player } from "./fixtures";
import type { ResolvedIntent } from "../src/combat";

const rng = () => createRng(1);
const at = (uid: string) => ({ kind: "enemy" as const, uid });
const ally = (id: 0 | 1) => ({ kind: "player" as const, id });
const pick = (cardUid: string, target: Pick["target"]): Pick => ({ cardUid, target });
const intent = (i: Omit<ResolvedIntent, "targets">, targets: (0 | 1)[]) => ({ ...i, targets }) as ResolvedIntent;
const idle = intent({ kind: "charge" }, []);

// test-only serempak card; real ones arrive with the reward pool (Task 7)
CARDS.test_serempak = { id: "test_serempak", nameKey: "t", owner: "pendekar", type: "serang", tags: ["serempak"],
  effects: [{ kind: "damage", amount: 4 }], serempakBonus: 4, upgraded: { effects: [{ kind: "damage", amount: 4 }], serempakBonus: 4 } };
afterAll(() => { delete CARDS.test_serempak; });

test("block lands before enemy attack", () => {
  const p0 = player(0, { hand: cards(0, ["tangkis_pendekar", "tebas"]) });
  const s0 = combat([p0, player(1)], [enemy("kuntilanak", "e0", { intent: intent({ kind: "attack", amount: 7, target: "random" }, [0]) })]);
  const { state } = resolveTurn(s0, [[pick("0-0", ally(0)), pick("0-1", at("e0"))], []], rng());
  expect(state.players[0].hp).toBe(28);
  expect(state.enemies[0].hp).toBe(14);
});

test("restu buffs partner serang", () => {
  const p0 = player(0, { hand: cards(0, ["tebas"]) });
  const p1 = player(1, { hand: cards(1, ["restu"]) });
  const { state, events } = resolveTurn(combat([p0, p1], [enemy("genderuwo", "e0", { intent: idle })]),
    [[pick("0-0", at("e0"))], [pick("1-0", ally(0))]], rng());
  expect(state.enemies[0].hp).toBe(60 - 9);
  expect(events).toContainEqual({ t: "damage", to: at("e0"), amount: 9, hpAfter: 51 });
});

test("serempak bonus only when partner hits same enemy", () => {
  const twoEnemies = () => [enemy("genderuwo", "e0", { intent: idle }), enemy("genderuwo", "e1", { intent: idle })];
  const p0 = () => player(0, { hand: cards(0, ["test_serempak"]) });
  const p1 = () => player(1, { hand: cards(1, ["pukul_wayang"]) });
  const same = resolveTurn(combat([p0(), p1()], twoEnemies()), [[pick("0-0", at("e0"))], [pick("1-0", at("e0"))]], rng());
  expect(same.state.enemies[0].hp).toBe(60 - 8 - 5);
  const split = resolveTurn(combat([p0(), p1()], twoEnemies()), [[pick("0-0", at("e0"))], [pick("1-0", at("e1"))]], rng());
  expect(split.state.enemies[0].hp).toBe(60 - 4);
});

test("jurus stacks grow and reset", () => {
  let s = combat([player(0), player(1)], [enemy("banaspati", "e0", { intent: idle })]);
  const play = (defId: string): number => {
    s.players[0].hand = cards(0, [defId], 100 + s.turn);
    const before = s.enemies[0].hp;
    s = resolveTurn(s, [[pick(s.players[0].hand[0].uid, at("e0"))], []], rng()).state;
    s.enemies[0].intent = idle;
    s.turn += 1;
    return before - s.enemies[0].hp;
  };
  expect(play("jurus_harimau")).toBe(9);
  expect(s.players[0].jurusStacks).toBe(1);
  expect(play("jurus_harimau")).toBe(10);
  expect(play("tebas")).toBe(6);
  expect(s.players[0].jurusStacks).toBe(0);
});

test("attack on dead target retargets leftmost living enemy", () => {
  const p0 = player(0, { hand: cards(0, ["tebas"]) });
  const p1 = player(1, { hand: cards(1, ["pukul_wayang"]) });
  const { state } = resolveTurn(combat([p0, p1], [enemy("tuyul", "e0", { hp: 5, intent: idle }), enemy("jenglot", "e1", { intent: idle })]),
    [[pick("0-0", at("e0"))], [pick("1-0", at("e0"))]], rng());
  expect(state.enemies.map((e) => e.hp)).toEqual([0, 9]);
});

test("no enemy left → later cards do nothing, enemies do not act, combat won", () => {
  const p0 = player(0, { hand: cards(0, ["tebas"]) });
  const p1 = player(1, { hand: cards(1, ["pukul_wayang"]) });
  const s0 = combat([p0, p1], [enemy("tuyul", "e0", { hp: 5, intent: intent({ kind: "attack", amount: 7, target: "random" }, [0]) })]);
  const { state, events } = resolveTurn(s0, [[pick("0-0", at("e0"))], [pick("1-0", at("e0"))]], rng());
  expect(state.outcome).toBe("won");
  expect(state.players[0].hp).toBe(30);
  expect(events.filter((e) => e.t === "damage").length).toBe(1);
});

test("evading pocong halves incoming serang", () => {
  const p0 = player(0, { hand: cards(0, ["tebas"]) });
  const { state } = resolveTurn(combat([p0, player(1)], [enemy("pocong", "e0", { evading: true, intent: idle })]),
    [[pick("0-0", at("e0"))], []], rng());
  expect(state.enemies[0].hp).toBe(18 - 3);
});

test("steal takes at most player coins", () => {
  const s0 = combat([player(0, { coins: 4 }), player(1)],
    [enemy("tuyul", "e0", { intent: intent({ kind: "steal", amount: 10, attack: 3 }, [0]) })]);
  const { state, events } = resolveTurn(s0, [[], []], rng());
  expect(state.players[0].coins).toBe(0);
  expect(state.players[0].hp).toBe(27);
  expect(state.enemies[0].stolen).toEqual([{ player: 0, amount: 4 }]);
  expect(events).toContainEqual({ t: "steal", enemy: "e0", player: 0, amount: 4 });
});

test("killing tuyul returns stolen coins", () => {
  const p0 = player(0, { coins: 1, hand: cards(0, ["tebas"]) });
  const s0 = combat([p0, player(1)], [enemy("tuyul", "e0", { hp: 6, stolen: [{ player: 0, amount: 10 }], intent: idle }),
    enemy("jenglot", "e1", { intent: idle })]);
  const { state, events } = resolveTurn(s0, [[pick("0-0", at("e0"))], []], rng());
  expect(state.players[0].coins).toBe(11);
  expect(events).toContainEqual({ t: "coinsReturned", player: 0, amount: 10 });
});

test("fled tuyul keeps coins and counts as gone for outcome", () => {
  const s0 = combat([player(0, { coins: 0 }), player(1)],
    [enemy("tuyul", "e0", { stolen: [{ player: 0, amount: 10 }], intent: intent({ kind: "flee" }, []) })]);
  const { state, events } = resolveTurn(s0, [[], []], rng());
  expect(state.enemies[0].fled).toBe(true);
  expect(state.players[0].coins).toBe(0);
  expect(state.outcome).toBe("won");
  expect(events).toContainEqual({ t: "flee", enemy: "e0" });
});

test("wewe gombel destroys wayang or applies lemah", () => {
  const s0 = combat([player(0), player(1, { wayang: 6 })], [
    enemy("wewe_gombel", "e0", { intent: intent({ kind: "destroyWayang", fallbackLemah: 2 }, [1]) }),
    enemy("wewe_gombel", "e1", { intent: intent({ kind: "destroyWayang", fallbackLemah: 2 }, [0]) }),
  ]);
  const { state } = resolveTurn(s0, [[], []], rng());
  expect(state.players[1].wayang).toBe(0);
  expect(state.players[0].statuses.lemah).toBe(1); // 2 applied, 1 decays at end of turn
});

test("pingsan player is skipped by later attacks", () => {
  const hit = intent({ kind: "attack", amount: 7, target: "random" }, [0]);
  const s0 = combat([player(0, { hp: 3 }), player(1)], [enemy("kuntilanak", "e0", { intent: hit }), enemy("kuntilanak", "e1", { intent: hit })]);
  const { state, events } = resolveTurn(s0, [[], []], rng());
  expect(state.players[0]).toMatchObject({ hp: 0, pingsan: true });
  expect(events.filter((e) => e.t === "damage").length).toBe(1);
  expect(events).toContainEqual({ t: "pingsan", player: 0 });
});

test("jenglot drain heals itself by its base amount", () => {
  const s0 = combat([player(0), player(1)], [enemy("jenglot", "e0", { hp: 10, intent: intent({ kind: "drain", amount: 5 }, [0]) })]);
  const { state } = resolveTurn(s0, [[], []], rng());
  expect(state.players[0].hp).toBe(25);
  expect(state.enemies[0].hp).toBe(14);
});

test("pattern advances after each enemy acts", () => {
  const s0 = combat([player(0), player(1)], [enemy("kuntilanak", "e0", { intent: idle })]);
  expect(resolveTurn(s0, [[], []], rng()).state.enemies[0].patternIndex).toBe(1);
});
