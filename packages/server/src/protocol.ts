import {
  CARDS, CARD_PRICE, REMOVE_PRICE, describeCard, describePusaka, cardName, enemyName, pusakaName,
  type CombatState, type GameEvent, type Pick, type RunState, type Statuses,
} from "@gerhana/rules";

export const PROTOCOL_VERSION = 1;

export type ClientMsg =
  | { type: "create_room"; name: string; bot: boolean }
  | { type: "join_room"; code: string; name: string }
  | { type: "play_cards"; picks: Pick[] }
  | { type: "vote"; choice: 0 | 1 }
  | { type: "choose_card"; defId: string | null }
  | { type: "choose_pusaka"; id: string }
  | { type: "rest"; choice: "heal" | { upgrade: string } }
  | { type: "shop_buy"; defId: string }
  | { type: "shop_remove"; cardUid: string }
  | { type: "leave" }
  | { type: "play_again" };

export interface CardView { uid: string; defId: string; upgraded: boolean; type: string; name: string; text: string }
export interface PlayerView {
  id: 0 | 1; name: string; character: string; hp: number; maxHp: number; block: number; wayang: number;
  statuses: Statuses; coins: number; pingsan: boolean; jurusStacks: number;
}
export interface EnemyView {
  uid: string; defId: string; name: string; hp: number; maxHp: number; statuses: Statuses; fled: boolean;
  intent: { kind: string; amount: number; status?: string; stacks?: number; targets: (0 | 1)[] } | null;
}
export interface StateView { turn: number; outcome: string; players: PlayerView[]; enemies: EnemyView[] }

export interface PusakaView { id: string; name: string; text: string }
export interface RunPlayerView {
  name: string; character: string; hp: number; maxHp: number; coins: number; deckSize: number; pusaka: PusakaView[];
}
export type PhaseView =
  | { kind: "vote"; step: number; options: string[]; votes: (number | null)[] }
  | { kind: "combat"; node: string }
  | { kind: "reward"; offers: CardView[]; pusakaOffer: PusakaView[] | null; pusakaChooser: number | null; done: boolean[] }
  | { kind: "rest"; done: boolean[] }
  | { kind: "shop"; offers: CardView[]; done: boolean[]; cardPrice: number; removePrice: number }
  | { kind: "ended"; result: string; stepReached: number };
export interface RunView { step: number; steps: number; map: string[][]; players: RunPlayerView[]; deck: CardView[]; phase: PhaseView }

export type ServerMsg =
  | { type: "run_state"; run: RunView }
  | { type: "room_state"; code: string; you: 0 | 1; names: (string | null)[] }
  | { type: "turn_start"; turn: number; turnMs: number; hand: CardView[]; state: StateView }
  | { type: "partner_ready"; player: 0 | 1 }
  | { type: "turn_resolved"; events: GameEvent[]; state: StateView | null }
  | { type: "combat_end"; outcome: "won" | "lost" }
  | { type: "error"; code: string };

export const cardView = (c: { uid: string; defId: string; upgraded: boolean }): CardView => ({
  ...c, type: CARDS[c.defId].type, name: cardName(c.defId), text: describeCard(CARDS[c.defId], c.upgraded),
});

const pusakaView = (id: string): PusakaView => ({ id, name: pusakaName(id), text: describePusaka(id) });
const offerView = (defId: string, i: number) => cardView({ uid: `offer-${i}`, defId, upgraded: false });

/** What one seat sees of the run: everyone's totals, its own deck and its own offers. */
export function runView(r: RunState, names: string[], seat: 0 | 1): RunView {
  const ph = r.phase;
  const phase: PhaseView =
    ph.kind === "vote" ? { kind: "vote", step: ph.step, options: r.map[ph.step], votes: ph.votes }
    : ph.kind === "combat" ? { kind: "combat", node: ph.node }
    : ph.kind === "reward" ? { kind: "reward", offers: ph.offers[seat].map(offerView), pusakaOffer: ph.pusakaOffer?.map(pusakaView) ?? null, pusakaChooser: ph.pusakaChooser, done: ph.done }
    : ph.kind === "rest" ? { kind: "rest", done: ph.done }
    : ph.kind === "shop" ? { kind: "shop", offers: ph.offers[seat].map(offerView), done: ph.done, cardPrice: CARD_PRICE, removePrice: REMOVE_PRICE }
    : { kind: "ended", result: ph.result, stepReached: ph.stepReached };
  return {
    step: r.step,
    steps: r.map.length,
    map: r.map,
    players: r.players.map((p, i) => ({
      name: names[i], character: p.character, hp: p.hp, maxHp: p.maxHp, coins: p.coins, deckSize: p.deck.length, pusaka: p.pusaka.map(pusakaView),
    })),
    deck: r.players[seat].deck.map(cardView),
    phase,
  };
}

/** Public state only: hands, draw piles and RNG stay on the server. */
export function stateView(s: CombatState, names: string[]): StateView {
  return {
    turn: s.turn,
    outcome: s.outcome,
    players: s.players.map((p) => ({
      id: p.id, name: names[p.id], character: p.character, hp: p.hp, maxHp: p.maxHp, block: p.block, wayang: p.wayang,
      statuses: p.statuses, coins: p.coins, pingsan: p.pingsan, jurusStacks: p.jurusStacks,
    })),
    enemies: s.enemies.map((e) => ({
      uid: e.uid, defId: e.defId, name: enemyName(e.defId), hp: e.hp, maxHp: e.maxHp, statuses: e.statuses, fled: e.fled,
      intent: e.intent && {
        kind: e.intent.kind,
        amount: "amount" in e.intent ? e.intent.amount : "attack" in e.intent ? e.intent.attack : 0,
        ...("status" in e.intent ? { status: e.intent.status, stacks: e.intent.stacks } : {}),
        targets: e.intent.targets,
      },
    })),
  };
}

// --- client input: untrusted ------------------------------------------------------

const str = (v: unknown, max: number): v is string => typeof v === "string" && v.length <= max;

export function cleanName(v: unknown): string {
  const s = typeof v === "string" ? v.replace(/[\p{C}]/gu, "").trim().slice(0, 16) : "";
  return s || "Pemain";
}

function parsePick(v: unknown): Pick | null {
  if (!v || typeof v !== "object") return null;
  const { cardUid, target } = v as Record<string, unknown>;
  if (!str(cardUid, 16) || !target || typeof target !== "object") return null;
  const t = target as Record<string, unknown>;
  if (t.kind === "enemy" && str(t.uid, 8)) return { cardUid, target: { kind: "enemy", uid: t.uid } };
  if (t.kind === "player" && (t.id === 0 || t.id === 1)) return { cardUid, target: { kind: "player", id: t.id } };
  return null;
}

/** Parse one raw client message; null means malformed. */
export function parseClient(raw: string): ClientMsg | null {
  let m: Record<string, unknown>;
  try {
    m = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!m || typeof m !== "object") return null;
  switch (m.type) {
    case "create_room":
      return { type: "create_room", name: cleanName(m.name), bot: m.bot === true };
    case "join_room":
      return str(m.code, 6) ? { type: "join_room", code: m.code.toUpperCase(), name: cleanName(m.name) } : null;
    case "play_cards": {
      if (!Array.isArray(m.picks) || m.picks.length > 2) return null;
      const picks = m.picks.map(parsePick);
      return picks.every(Boolean) ? { type: "play_cards", picks: picks as Pick[] } : null;
    }
    case "vote":
      return m.choice === 0 || m.choice === 1 ? { type: "vote", choice: m.choice } : null;
    case "choose_card":
      return m.defId === null || str(m.defId, 32) ? { type: "choose_card", defId: m.defId as string | null } : null;
    case "choose_pusaka":
      return str(m.id, 32) ? { type: "choose_pusaka", id: m.id } : null;
    case "rest": {
      if (m.choice === "heal") return { type: "rest", choice: "heal" };
      const up = (m.choice as Record<string, unknown> | null)?.upgrade;
      return str(up, 16) ? { type: "rest", choice: { upgrade: up } } : null;
    }
    case "shop_buy":
      return str(m.defId, 32) ? { type: "shop_buy", defId: m.defId } : null;
    case "shop_remove":
      return str(m.cardUid, 16) ? { type: "shop_remove", cardUid: m.cardUid } : null;
    case "leave":
      return { type: "leave" };
    case "play_again":
      return { type: "play_again" };
    default:
      return null;
  }
}
