import { expect, test } from "bun:test";
import { applyAction, createRun, type RunState } from "../src/run";
import { autoPick } from "../src/picks";
import { createRng, type Rng } from "../src/rng";
import { STARTER_DECKS } from "../src/content/cards";
import { enemy } from "./fixtures";

const ok = (r: ReturnType<typeof applyAction>) => {
  if ("error" in r) throw new Error(r.error);
  return r.state;
};

/** Vote both players for slot `choice` until the run enters a node of `kind` (or fails trying). */
function enterCombat(seed: number): { s: RunState; rng: Rng } {
  const { state, rng } = createRun(seed, ["pendekar", "dalang"]);
  let s = ok(applyAction(state, { kind: "vote", player: 0, choice: 0 }, rng));
  s = ok(applyAction(s, { kind: "vote", player: 1, choice: 0 }, rng));
  return { s, rng };
}

/** Make the current combat end on the next turn: enemies at 1 hp, both players hold a Serang. */
function oneHitWin(s: RunState) {
  if (s.phase.kind !== "combat") throw new Error("not in combat");
  const c = s.phase.combat;
  c.enemies = [enemy("tuyul", "e0", { hp: 1, intent: { kind: "charge", targets: [] } })];
}

const playTurn = (s: RunState, rng: Rng) => {
  if (s.phase.kind !== "combat") throw new Error("not in combat");
  const c = s.phase.combat;
  return applyAction(s, { kind: "playCards", picks: [autoPick(c, 0), autoPick(c, 1)] }, rng);
};

test("a new run starts at the first vote with starter decks and full hp", () => {
  const { state } = createRun(1, ["pendekar", "dalang"]);
  expect(state.phase).toEqual({ kind: "vote", step: 0, votes: [null, null] });
  expect(state.players.map((p) => [p.hp, p.deck.length])).toEqual([[42, 10], [36, 10]]);
  expect(state.players[0].deck[0]).toEqual({ uid: "0-0", defId: STARTER_DECKS.pendekar[0], upgraded: false });
});

test("vote tie-break is deterministic per seed", () => {
  const go = () => {
    const { state, rng } = createRun(5, ["pendekar", "dalang"]);
    let s = ok(applyAction(state, { kind: "vote", player: 0, choice: 0 }, rng));
    s = ok(applyAction(s, { kind: "vote", player: 1, choice: 1 }, rng));
    return s.phase.kind === "combat" ? s.phase.combat.enemies.map((e) => e.defId) : s.phase.kind;
  };
  expect(go()).toEqual(go());
});

test("revive at 25% after win, coins awarded, reward offered", () => {
  const { s: s0, rng } = enterCombat(2);
  oneHitWin(s0);
  if (s0.phase.kind === "combat") Object.assign(s0.phase.combat.players[1], { hp: 0, pingsan: true });
  const s = ok(playTurn(s0, rng));
  expect(s.players[1].hp).toBe(9);
  expect(s.players[0].coins >= 15 && s.players[0].coins <= 25).toBe(true);
  expect(s.phase.kind).toBe("reward");
  if (s.phase.kind === "reward") {
    expect(s.phase.offers.map((o) => o.length)).toEqual([3, 3]);
    expect(s.phase.pusakaOffer).toBeNull();
  }
});

test("elite gives 40 coins and pusaka offer to top damage", () => {
  const { s: s0, rng } = enterCombat(3);
  if (s0.phase.kind !== "combat") throw new Error();
  s0.phase.node = "elite";
  oneHitWin(s0);
  s0.phase.combat.players[1].damageDealt = 50;
  const s = ok(playTurn(s0, rng));
  expect(s.players[0].coins).toBe(40);
  if (s.phase.kind !== "reward") throw new Error();
  expect(s.phase.pusakaOffer!.length).toBe(3);
  expect(s.phase.pusakaChooser).toBe(1);
  const chosen = s.phase.pusakaOffer![0];
  expect("error" in applyAction(s, { kind: "choosePusaka", player: 0, id: chosen }, rng)).toBe(true);
  const after = ok(applyAction(s, { kind: "choosePusaka", player: 1, id: chosen }, rng));
  expect(after.players[1].pusaka).toEqual([chosen]);
});

test("reward choice adds the card; both done → next vote", () => {
  const { s: s0, rng } = enterCombat(2);
  oneHitWin(s0);
  let s = ok(playTurn(s0, rng));
  if (s.phase.kind !== "reward") throw new Error();
  const pick = s.phase.offers[0][0];
  s = ok(applyAction(s, { kind: "chooseCard", player: 0, defId: pick }, rng));
  expect(s.players[0].deck.at(-1)).toEqual({ uid: "0-10", defId: pick, upgraded: false });
  expect("error" in applyAction(s, { kind: "chooseCard", player: 1, defId: "tebas" }, rng)).toBe(true);
  s = ok(applyAction(s, { kind: "chooseCard", player: 1, defId: null }, rng));
  expect(s.phase).toEqual({ kind: "vote", step: 1, votes: [null, null] });
});

function shopState(coins: number, deckSize = 10): { s: RunState; rng: Rng } {
  const { state, rng } = createRun(1, ["pendekar", "dalang"]);
  state.players[0].coins = coins;
  state.players[0].deck = state.players[0].deck.slice(0, deckSize);
  state.phase = { kind: "shop", offers: [["tendang", "sapuan", "kuda_kuda"], ["kelir", "tembang", "sabetan"]], done: [false, false] };
  return { s: state, rng };
}

test("shop sells a card for 50 and removes a card for 75", () => {
  const { s: s0, rng } = shopState(200);
  let s = ok(applyAction(s0, { kind: "shopBuy", player: 0, defId: "tendang" }, rng));
  expect(s.players[0].coins).toBe(150);
  expect(s.players[0].deck.length).toBe(11);
  s = ok(applyAction(s, { kind: "shopRemove", player: 0, cardUid: "0-0" }, rng));
  expect(s.players[0].coins).toBe(75);
  expect(s.players[0].deck.some((c) => c.uid === "0-0")).toBe(false);
});

test("shop refuses purchase without coins", () => {
  const { s, rng } = shopState(49);
  expect(applyAction(s, { kind: "shopBuy", player: 0, defId: "tendang" }, rng)).toEqual({ error: "NOT_ENOUGH_COINS" });
});

test("shop refuses removal at deck size 5", () => {
  const { s, rng } = shopState(200, 5);
  expect(applyAction(s, { kind: "shopRemove", player: 0, cardUid: "0-0" }, rng)).toEqual({ error: "DECK_TOO_SMALL" });
});

test("rest heals 30% capped at max, or upgrades a card", () => {
  const { state, rng } = createRun(1, ["pendekar", "dalang"]);
  state.players[0].hp = 40;
  state.players[1].hp = 10;
  state.phase = { kind: "rest", done: [false, false] };
  let s = ok(applyAction(state, { kind: "rest", player: 0, choice: "heal" }, rng));
  expect(s.players[0].hp).toBe(42);
  s = ok(applyAction(s, { kind: "rest", player: 1, choice: { upgrade: "1-0" } }, rng));
  expect(s.players[1].deck[0].upgraded).toBe(true);
  expect(s.phase.kind).toBe("vote");
});

test("action in wrong phase is rejected and state unchanged", () => {
  const { state, rng } = createRun(1, ["pendekar", "dalang"]);
  const copy = structuredClone(state);
  expect(applyAction(state, { kind: "shopBuy", player: 0, defId: "tendang" }, rng)).toEqual({ error: "WRONG_PHASE" });
  expect(applyAction(state, { kind: "rest", player: 0, choice: "heal" }, rng)).toEqual({ error: "WRONG_PHASE" });
  expect(state).toEqual(copy);
});

test("full scripted run reaches ended", () => {
  for (let seed = 1; seed <= 20; seed++) {
    let { state: s, rng } = createRun(seed, ["pendekar", "dalang"]);
    for (let i = 0; i < 2000 && s.phase.kind !== "ended"; i++) {
      const p = s.phase;
      const act =
        p.kind === "vote" ? { kind: "vote" as const, player: (p.votes[0] === null ? 0 : 1) as 0 | 1, choice: 0 as const }
        : p.kind === "combat" ? { kind: "playCards" as const, picks: [autoPick(p.combat, 0), autoPick(p.combat, 1)] as [any, any] }
        : p.kind === "reward" && p.pusakaOffer ? { kind: "choosePusaka" as const, player: p.pusakaChooser!, id: p.pusakaOffer[0] }
        : p.kind === "reward" ? { kind: "chooseCard" as const, player: (p.done[0] ? 1 : 0) as 0 | 1, defId: p.offers[p.done[0] ? 1 : 0][0] }
        : p.kind === "rest" ? { kind: "rest" as const, player: (p.done[0] ? 1 : 0) as 0 | 1, choice: "heal" as const }
        : { kind: "leave" as const, player: ((p as { done: boolean[] }).done[0] ? 1 : 0) as 0 | 1 };
      s = ok(applyAction(s, act, rng));
    }
    expect(s.phase.kind).toBe("ended");
  }
});
