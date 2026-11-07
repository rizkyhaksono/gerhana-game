import { absorb, attackDamage, tickStatuses, type Statuses } from "./damage";
import { CARDS } from "./content/cards";
import type { GameEvent, Target } from "./events";
import { ENCOUNTERS } from "./content/encounters";
import { ENEMIES } from "./content/enemies";
import type { Rng } from "./rng";
import type { CardInstance, CharacterId, Intent, StatusId } from "./types";

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

// --- resolveTurn ---------------------------------------------------------------

export interface Pick {
  cardUid: string;
  target: Target;
}
export type Picks = [Pick[], Pick[]]; // index = player id

const cardOf = (inst: CardInstance) => {
  const def = CARDS[inst.defId];
  const v = inst.upgraded ? def.upgraded : def;
  return { def, effects: v.effects, serempakBonus: v.serempakBonus ?? 0 };
};

function addStatus(statuses: Statuses, status: StatusId, stacks: number) {
  statuses[status] = (statuses[status] ?? 0) + stacks;
}

/** Resolve one turn. Picks must already be valid (see validatePicks). Ends with endTurn. */
export function resolveTurn(input: CombatState, picks: Picks, _rng: Rng): { state: CombatState; events: GameEvent[] } {
  const s = structuredClone(input);
  const events: GameEvent[] = [];
  const enemyById = (uid: string) => s.enemies.find((e) => e.uid === uid);
  const played = s.players.map((p) =>
    p.pingsan ? [] : picks[p.id].map((pick) => {
      const inst = p.hand.find((c) => c.uid === pick.cardUid)!;
      return { pick, inst, ...cardOf(inst) };
    }),
  );

  const hitPlayer = (p: PlayerCombat, dmg: number) => {
    Object.assign(p, absorb(dmg, p));
    events.push({ t: "damage", to: { kind: "player", id: p.id }, amount: dmg, hpAfter: p.hp });
    if (p.hp === 0 && !p.pingsan) {
      p.pingsan = true;
      events.push({ t: "pingsan", player: p.id });
    }
  };
  const statusOn = (to: Target, status: StatusId, stacks: number) => {
    const holder = to.kind === "player" ? s.players[to.id] : enemyById(to.uid)!;
    addStatus(holder.statuses, status, stacks);
    events.push({ t: "status", to, status, stacks });
  };

  // Jurus Berantai: a turn with at least one jurus card grows the chain, any other turn breaks it.
  for (const p of s.players) {
    if (p.pingsan) continue;
    p.jurusStacks = played[p.id].some((c) => c.def.tags.includes("jurus")) ? p.jurusStacks + 1 : 0;
  }

  // Phase 1: Tahan + Bantu, P1 then P2.
  const buff = [0, 0];
  for (const p of s.players) {
    for (const c of played[p.id].filter((c) => c.def.type !== "serang")) {
      events.push({ t: "card", player: p.id, cardUid: c.inst.uid, target: c.pick.target });
      const to = c.pick.target.kind === "player" ? s.players[c.pick.target.id] : p;
      for (const fx of c.effects) {
        if (fx.kind === "block") {
          p.block += fx.amount;
          events.push({ t: "block", player: p.id, amount: fx.amount });
        } else if (fx.kind === "wayang") {
          to.wayang += fx.hp;
          events.push({ t: "wayang", player: to.id, hp: to.wayang });
        } else if (fx.kind === "buffAttack") {
          buff[to.id] += fx.amount;
        } else if (fx.kind === "status") {
          statusOn(fx.on === "self" ? { kind: "player", id: p.id } : c.pick.target, fx.status, fx.stacks);
        }
      }
    }
  }

  // Phase 2: Serang, P1 then P2. Serempak compares original targets, before any retarget.
  const aimed = played.map((cs) => new Set(cs.filter((c) => c.def.type === "serang" && c.pick.target.kind === "enemy").map((c) => (c.pick.target as { uid: string }).uid)));
  for (const p of s.players) {
    for (const c of played[p.id].filter((c) => c.def.type === "serang")) {
      const original = c.pick.target.kind === "enemy" ? c.pick.target.uid : "";
      let e = enemyById(original);
      if (!e || !isActive(e)) e = s.enemies.find(isActive);
      if (!e) continue;
      const to: Target = { kind: "enemy", uid: e.uid };
      events.push({ t: "card", player: p.id, cardUid: c.inst.uid, target: to });
      const together = c.def.tags.includes("serempak") && aimed[1 - p.id].has(original);
      for (const fx of c.effects) {
        if (fx.kind === "damage") {
          const base = fx.amount + p.jurusStacks + buff[p.id] + (together ? c.serempakBonus : 0);
          const dmg = attackDamage(base, p.statuses, e.statuses, { evading: e.evading });
          const before = e.hp;
          e.hp = Math.max(0, e.hp - dmg);
          p.damageDealt += before - e.hp;
          events.push({ t: "damage", to, amount: dmg, hpAfter: e.hp });
          if (e.hp === 0) {
            events.push({ t: "enemyDied", enemy: e.uid });
            for (const st of e.stolen) {
              s.players[st.player].coins += st.amount;
              events.push({ t: "coinsReturned", player: st.player, amount: st.amount });
            }
            e.stolen = [];
            break;
          }
        } else if (fx.kind === "status") {
          statusOn(fx.on === "self" ? { kind: "player", id: p.id } : to, fx.status, fx.stacks);
        }
      }
    }
  }

  // Phase 3: enemies act left to right. Nobody left standing → nobody acts.
  for (const e of s.enemies) {
    if (!isActive(e) || !e.intent) continue;
    const it = e.intent;
    for (const id of it.targets) {
      const p = s.players[id];
      if (p.pingsan) continue;
      const attack = (amount: number) => hitPlayer(p, attackDamage(amount, e.statuses, p.statuses));
      if (it.kind === "attack") attack(it.amount);
      else if (it.kind === "status") statusOn({ kind: "player", id }, it.status, it.stacks);
      else if (it.kind === "attackStatus") {
        attack(it.amount);
        statusOn({ kind: "player", id }, it.status, it.stacks);
      } else if (it.kind === "steal") {
        if (it.attack > 0) attack(it.attack);
        const take = Math.min(p.coins, it.amount);
        p.coins -= take;
        if (take > 0) e.stolen.push({ player: id, amount: take });
        events.push({ t: "steal", enemy: e.uid, player: id, amount: take });
      } else if (it.kind === "drain") {
        attack(it.amount);
        e.hp = Math.min(e.maxHp, e.hp + it.amount);
      } else if (it.kind === "destroyWayang") {
        if (p.wayang > 0) {
          p.wayang = 0;
          events.push({ t: "wayang", player: id, hp: 0 });
        } else statusOn({ kind: "player", id }, "lemah", it.fallbackLemah);
      }
    }
    if (it.kind === "flee") {
      e.fled = true;
      events.push({ t: "flee", enemy: e.uid });
    }
    e.patternIndex += 1;
  }

  return { state: endTurn(s), events };
}
