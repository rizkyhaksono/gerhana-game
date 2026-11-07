import { CHARACTERS } from "./content/characters";
import { CARDS, REWARD_POOL, STARTER_DECKS } from "./content/cards";
import { ENCOUNTERS } from "./content/encounters";
import { PUSAKA, activePusaka } from "./content/pusaka";
import { resolveTurn, startCombat, startTurn, type CombatState, type Picks, type PlayerCombat } from "./combat";
import type { GameEvent } from "./events";
import { generateMap, MAP_STEPS, type MapStep, type NodeKind } from "./map";
import { validatePicks } from "./picks";
import { createRng, type Rng } from "./rng";
import type { CardInstance, CharacterId } from "./types";

export const CARD_PRICE = 50;
export const REMOVE_PRICE = 75;
export const MIN_DECK = 5; // removal stops here so a hand can still be drawn

export interface PlayerRun {
  character: CharacterId;
  hp: number;
  maxHp: number;
  coins: number;
  deck: CardInstance[];
  pusaka: string[];
  nextUid: number;
}

export type Phase =
  | { kind: "vote"; step: number; votes: [number | null, number | null] }
  | { kind: "combat"; node: NodeKind | "boss"; combat: CombatState }
  | { kind: "reward"; offers: [string[], string[]]; pusakaOffer: string[] | null; pusakaChooser: 0 | 1 | null; done: [boolean, boolean] }
  | { kind: "rest"; done: [boolean, boolean] }
  | { kind: "shop"; offers: [string[], string[]]; done: [boolean, boolean] }
  | { kind: "ended"; result: "won" | "lost"; stepReached: number };

export interface RunState {
  seed: number;
  map: MapStep[];
  step: number; // 0-based; MAP_STEPS = boss
  players: [PlayerRun, PlayerRun];
  phase: Phase;
}

export type RunAction =
  | { kind: "vote"; player: 0 | 1; choice: 0 | 1 }
  | { kind: "playCards"; picks: Picks }
  | { kind: "chooseCard"; player: 0 | 1; defId: string | null }
  | { kind: "choosePusaka"; player: 0 | 1; id: string }
  | { kind: "rest"; player: 0 | 1; choice: "heal" | { upgrade: string } }
  | { kind: "shopBuy"; player: 0 | 1; defId: string }
  | { kind: "shopRemove"; player: 0 | 1; cardUid: string }
  | { kind: "leave"; player: 0 | 1 };

export type RunError = "WRONG_PHASE" | "NOT_ENOUGH_COINS" | "DECK_TOO_SMALL" | "INVALID";
type Result = { state: RunState; events: GameEvent[] } | { error: RunError };

export function createRun(seed: number, characters: [CharacterId, CharacterId]): { state: RunState; rng: Rng } {
  const rng = createRng(seed);
  const players = characters.map((character, id): PlayerRun => {
    const deck = STARTER_DECKS[character].map((defId, i) => ({ uid: `${id}-${i}`, defId, upgraded: false }));
    const maxHp = CHARACTERS[character].maxHp;
    return { character, hp: maxHp, maxHp, coins: 0, deck, pusaka: [], nextUid: deck.length };
  }) as [PlayerRun, PlayerRun];
  return { state: { seed, map: generateMap(rng), step: 0, players, phase: { kind: "vote", step: 0, votes: [null, null] } }, rng };
}

const offer = (rng: Rng, pool: string[], n: number) => rng.shuffle(pool).slice(0, n);

function enterNode(s: RunState, node: NodeKind | "boss", rng: Rng) {
  if (node === "istirahat") {
    s.phase = { kind: "rest", done: [false, false] };
  } else if (node === "warung") {
    s.phase = { kind: "shop", offers: [offer(rng, REWARD_POOL[s.players[0].character], 3), offer(rng, REWARD_POOL[s.players[1].character], 3)], done: [false, false] };
  } else {
    const rank = node === "pertarungan" ? "normal" : node;
    const enc = rng.pick(ENCOUNTERS.filter((e) => e.rank === rank));
    const players = s.players.map((p, id): PlayerCombat => ({
      id: id as 0 | 1, character: p.character, hp: p.hp, maxHp: p.maxHp, block: 0, wayang: 0, statuses: {}, coins: p.coins,
      jurusStacks: 0, pingsan: p.hp <= 0, draw: structuredClone(p.deck), hand: [], discard: [], damageDealt: 0, pusaka: [...p.pusaka],
    })) as [PlayerCombat, PlayerCombat];
    s.phase = { kind: "combat", node, combat: startTurn(startCombat(players, enc.id, rng), rng) };
  }
}

function nextStep(s: RunState, rng: Rng) {
  s.step += 1;
  if (s.step >= MAP_STEPS) enterNode(s, "boss", rng);
  else s.phase = { kind: "vote", step: s.step, votes: [null, null] };
}

function finishCombat(s: RunState, node: NodeKind | "boss", c: CombatState, rng: Rng) {
  if (c.outcome === "lost") {
    s.phase = { kind: "ended", result: "lost", stepReached: s.step + 1 };
    return;
  }
  for (const p of c.players) {
    const run = s.players[p.id];
    run.hp = p.pingsan ? Math.floor(run.maxHp * 0.25) : p.hp;
    const bonus = activePusaka(s.players, p.id).reduce((n, x) => n + (x.hook.on === "coinsAfterCombat" ? x.hook.amount : 0), 0);
    run.coins = p.coins + (node === "elite" ? 40 : node === "boss" ? 0 : rng.int(15, 25)) + bonus;
  }
  if (node === "boss") {
    s.phase = { kind: "ended", result: "won", stepReached: MAP_STEPS + 1 };
    return;
  }
  const owned = s.players.flatMap((p) => p.pusaka);
  const elite = node === "elite";
  s.phase = {
    kind: "reward",
    offers: [offer(rng, REWARD_POOL[s.players[0].character], 3), offer(rng, REWARD_POOL[s.players[1].character], 3)],
    pusakaOffer: elite ? offer(rng, Object.keys(PUSAKA).filter((id) => !owned.includes(id)), 3) : null,
    pusakaChooser: elite ? (c.players[1].damageDealt > c.players[0].damageDealt ? 1 : 0) : null,
    done: [false, false],
  };
}

function addCard(p: PlayerRun, player: 0 | 1, defId: string) {
  p.deck.push({ uid: `${player}-${p.nextUid++}`, defId, upgraded: false });
}

/** Leave a reward/rest/shop phase once both players are done (and any pusaka is taken). */
function maybeAdvance(s: RunState, rng: Rng) {
  const p = s.phase;
  if ((p.kind === "reward" || p.kind === "rest" || p.kind === "shop") && p.done[0] && p.done[1]) {
    if (p.kind === "reward" && p.pusakaOffer) return;
    nextStep(s, rng);
  }
}

/** Advance the run by one action. Never mutates `input`; errors leave it untouched. */
export function applyAction(input: RunState, a: RunAction, rng: Rng): Result {
  const s = structuredClone(input);
  const ph = s.phase;
  let events: GameEvent[] = [];
  switch (a.kind) {
    case "vote": {
      if (ph.kind !== "vote" || ph.votes[a.player] !== null) return { error: ph.kind !== "vote" ? "WRONG_PHASE" : "INVALID" };
      ph.votes[a.player] = a.choice;
      const [v0, v1] = ph.votes;
      if (v0 !== null && v1 !== null) enterNode(s, s.map[s.step][v0 === v1 ? v0 : rng.int(0, 1)], rng);
      break;
    }
    case "playCards": {
      if (ph.kind !== "combat") return { error: "WRONG_PHASE" };
      for (const id of [0, 1] as const) if (validatePicks(ph.combat, id, a.picks[id])) return { error: "INVALID" };
      const r = resolveTurn(ph.combat, a.picks, rng);
      events = r.events;
      if (r.state.outcome === "ongoing") ph.combat = startTurn(r.state, rng);
      else finishCombat(s, ph.node, r.state, rng);
      break;
    }
    case "chooseCard": {
      if (ph.kind !== "reward") return { error: "WRONG_PHASE" };
      if (ph.done[a.player] || (a.defId !== null && !ph.offers[a.player].includes(a.defId))) return { error: "INVALID" };
      if (a.defId) addCard(s.players[a.player], a.player, a.defId);
      ph.done[a.player] = true;
      break;
    }
    case "choosePusaka": {
      if (ph.kind !== "reward") return { error: "WRONG_PHASE" };
      if (!ph.pusakaOffer || ph.pusakaChooser !== a.player || !ph.pusakaOffer.includes(a.id)) return { error: "INVALID" };
      s.players[a.player].pusaka.push(a.id);
      const hook = PUSAKA[a.id].hook;
      if (hook.on === "maxHp") {
        for (const id of PUSAKA[a.id].shared ? [0, 1] : [a.player]) {
          s.players[id].maxHp += hook.amount;
          s.players[id].hp += hook.amount;
        }
      }
      ph.pusakaOffer = null;
      break;
    }
    case "rest": {
      if (ph.kind !== "rest") return { error: "WRONG_PHASE" };
      if (ph.done[a.player]) return { error: "INVALID" };
      const p = s.players[a.player];
      if (a.choice === "heal") p.hp = Math.min(p.maxHp, p.hp + Math.floor(p.maxHp * 0.3));
      else {
        const uid = a.choice.upgrade;
        const card = p.deck.find((c) => c.uid === uid);
        if (!card || card.upgraded) return { error: "INVALID" };
        card.upgraded = true;
      }
      ph.done[a.player] = true;
      break;
    }
    case "shopBuy": {
      if (ph.kind !== "shop") return { error: "WRONG_PHASE" };
      const p = s.players[a.player];
      const i = ph.offers[a.player].indexOf(a.defId);
      if (ph.done[a.player] || i < 0 || !CARDS[a.defId]) return { error: "INVALID" };
      if (p.coins < CARD_PRICE) return { error: "NOT_ENOUGH_COINS" };
      p.coins -= CARD_PRICE;
      ph.offers[a.player].splice(i, 1);
      addCard(p, a.player, a.defId);
      break;
    }
    case "shopRemove": {
      if (ph.kind !== "shop") return { error: "WRONG_PHASE" };
      const p = s.players[a.player];
      const i = p.deck.findIndex((c) => c.uid === a.cardUid);
      if (ph.done[a.player] || i < 0) return { error: "INVALID" };
      if (p.deck.length <= MIN_DECK) return { error: "DECK_TOO_SMALL" };
      if (p.coins < REMOVE_PRICE) return { error: "NOT_ENOUGH_COINS" };
      p.coins -= REMOVE_PRICE;
      p.deck.splice(i, 1);
      break;
    }
    case "leave": {
      if (ph.kind !== "reward" && ph.kind !== "rest" && ph.kind !== "shop") return { error: "WRONG_PHASE" };
      ph.done[a.player] = true;
      break;
    }
  }
  maybeAdvance(s, rng);
  return { state: s, events };
}
