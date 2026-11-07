import { absorb, tickStatuses, type Statuses } from "./damage";
import { ENCOUNTERS } from "./content/encounters";
import { ENEMIES } from "./content/enemies";
import type { Rng } from "./rng";
import type { CardInstance, CharacterId, Intent } from "./types";

export const HAND_SIZE = 4;

export interface PlayerCombat {
  id: 0 | 1;
  character: CharacterId;
  hp: number;
  maxHp: number;
  block: number;
  wayang: number;
  statuses: Statuses;
  coins: number;
  jurusStacks: number;
  pingsan: boolean;
  draw: CardInstance[];
  hand: CardInstance[];
  discard: CardInstance[];
  damageDealt: number;
  pusaka: string[];
}

export type ResolvedIntent = Intent & { targets: (0 | 1)[] };

export interface EnemyCombat {
  uid: string;
  defId: string;
  hp: number;
  maxHp: number;
  statuses: Statuses;
  patternIndex: number;
  phase: 1 | 2;
  intent: ResolvedIntent | null;
  stolen: { player: 0 | 1; amount: number }[];
  evading: boolean;
  fled: boolean;
}

export interface CombatState {
  turn: number;
  players: [PlayerCombat, PlayerCombat];
  enemies: EnemyCombat[];
  outcome: "ongoing" | "won" | "lost";
}

export const isActive = (e: EnemyCombat) => e.hp > 0 && !e.fled;

/** Players arrive with their whole deck in `draw`; combat-scoped state starts fresh. */
export function startCombat(players: [PlayerCombat, PlayerCombat], encounterId: string, rng: Rng): CombatState {
  const enc = ENCOUNTERS.find((e) => e.id === encounterId);
  if (!enc) throw new Error(`unknown encounter ${encounterId}`);
  const ps = players.map((p) => ({
    ...structuredClone(p),
    draw: rng.shuffle([...p.draw, ...p.hand, ...p.discard]),
    hand: [], discard: [], block: 0, wayang: 0, statuses: {}, jurusStacks: 0, damageDealt: 0,
    pingsan: p.hp <= 0,
  })) as [PlayerCombat, PlayerCombat];
  const enemies = enc.enemies.map((defId, i): EnemyCombat => {
    const hp = ENEMIES[defId].hp;
    return { uid: `e${i}`, defId, hp, maxHp: hp, statuses: {}, patternIndex: 0, phase: 1, intent: null, stolen: [], evading: false, fled: false };
  });
  return { turn: 0, players: ps, enemies, outcome: "ongoing" };
}

function draw(p: PlayerCombat, rng: Rng) {
  while (p.hand.length < HAND_SIZE) {
    if (p.draw.length === 0) {
      if (p.discard.length === 0) break;
      p.draw = rng.shuffle(p.discard);
      p.discard = [];
    }
    p.hand.push(p.draw.shift()!);
  }
}

function targetsFor(intent: Intent, s: CombatState, rng: Rng): (0 | 1)[] {
  const alive = s.players.filter((p) => !p.pingsan).map((p) => p.id);
  if (alive.length === 0) return [];
  switch (intent.kind) {
    case "flee":
    case "evade":
    case "charge":
      return [];
    case "attack":
    case "status":
    case "attackStatus":
      if (intent.target === "both") return alive;
      if (intent.target === "lowestHp") {
        return [alive.reduce((a, b) => (s.players[b].hp < s.players[a].hp ? b : a))];
      }
      return [rng.pick(alive)];
    default:
      return [rng.pick(alive)];
  }
}

export function startTurn(input: CombatState, rng: Rng): CombatState {
  const s = structuredClone(input);
  s.turn += 1;
  for (const p of s.players) if (!p.pingsan) draw(p, rng);
  for (const e of s.enemies) {
    if (!isActive(e)) {
      e.intent = null;
      continue;
    }
    const def = ENEMIES[e.defId];
    if (def.phase2 && e.phase === 1 && e.hp * 100 <= e.maxHp * def.phase2.belowHpPct) {
      e.phase = 2;
      e.patternIndex = 0;
    }
    const pattern = e.phase === 2 && def.phase2 ? def.phase2.pattern : def.pattern;
    const intent = pattern[e.patternIndex % pattern.length];
    e.intent = { ...intent, targets: targetsFor(intent, s, rng) };
    e.evading = intent.kind === "evade";
  }
  return s;
}

export function checkOutcome(input: CombatState): CombatState {
  const s = structuredClone(input);
  // Enemies falling first wins ties: both players revive after a win (spec §4.5).
  if (s.enemies.every((e) => !isActive(e))) s.outcome = "won";
  else if (s.players.every((p) => p.pingsan)) s.outcome = "lost";
  return s;
}

export function endTurn(input: CombatState): CombatState {
  const s = structuredClone(input);
  for (const p of s.players) {
    p.discard.push(...p.hand);
    p.hand = [];
    p.block = 0;
    const { burn, next } = tickStatuses(p.statuses);
    p.statuses = next;
    if (burn > 0 && !p.pingsan) {
      Object.assign(p, absorb(burn, p));
      if (p.hp === 0) p.pingsan = true;
    }
  }
  for (const e of s.enemies) {
    const { burn, next } = tickStatuses(e.statuses);
    e.statuses = next;
    if (burn > 0 && isActive(e)) e.hp = Math.max(0, e.hp - burn);
  }
  return checkOutcome(s);
}
