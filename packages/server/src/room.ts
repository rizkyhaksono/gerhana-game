import {
  CHARACTERS, ENCOUNTERS, STARTER_DECKS, autoPick, createRng, resolveTurn, startCombat, startTurn, validatePicks,
  type CharacterId, type CombatState, type Pick, type PlayerCombat, type Rng,
} from "@gerhana/rules";
import { cardView, stateView, type ServerMsg } from "./protocol";

export type Send = (m: ServerMsg) => void;
interface Seat { name: string; send: Send | null; bot: boolean }

const CHARACTER_OF: Record<0 | 1, CharacterId> = { 0: "pendekar", 1: "dalang" }; // slice: seat decides character

function freshPlayer(id: 0 | 1): PlayerCombat {
  const character = CHARACTER_OF[id];
  const maxHp = CHARACTERS[character].maxHp;
  return {
    id, character, hp: maxHp, maxHp, block: 0, wayang: 0, statuses: {}, coins: 0, jurusStacks: 0, pingsan: false,
    draw: STARTER_DECKS[character].map((defId, i) => ({ uid: `${id}-${i}`, defId, upgraded: false })),
    hand: [], discard: [], damageDealt: 0, pusaka: [],
  };
}

/**
 * One co-op combat for two seats. A seat with no connection plays as a bot (auto-pick),
 * so a lone player can fight with a bot partner and a dropped player never blocks the other.
 * shortcut: no reconnect token and no 2-minute grace yet (GDD §6.4); add with the run flow.
 */
export class Room {
  seats: [Seat | null, Seat | null] = [null, null];
  combat: CombatState | null = null;
  private picks: [Pick[] | null, Pick[] | null] = [null, null];
  private rng: Rng;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private readonly turnMs: number;
  private fights = 0;

  constructor(readonly code: string, seed: number, opts: { turnMs?: number } = {}) {
    this.rng = createRng(seed);
    this.turnMs = opts.turnMs ?? 30_000;
  }

  join(name: string, send: Send | null, bot = false): 0 | 1 | "FULL" {
    const id = this.seats[0] === null ? 0 : this.seats[1] === null ? 1 : null;
    if (id === null) return "FULL";
    this.seats[id] = { name, send, bot };
    this.broadcastRoom();
    if (this.seats[0] && this.seats[1]) this.startFight();
    return id;
  }

  /** The player's connection closed: the bot takes the seat so the partner can finish. */
  leave(id: 0 | 1) {
    const seat = this.seats[id];
    if (!seat) return;
    seat.send = null;
    seat.bot = true;
    if (this.combat?.outcome === "ongoing" && !this.picks[id]) this.playCards(id, autoPick(this.combat, id));
  }

  get empty() {
    return this.seats.every((s) => !s || !s.send);
  }

  playCards(id: 0 | 1, picks: Pick[]) {
    const c = this.combat;
    if (!c || c.outcome !== "ongoing") return this.send(id, { type: "error", code: "NO_COMBAT" });
    if (this.picks[id]) return this.send(id, { type: "error", code: "ALREADY_PLAYED" });
    const err = validatePicks(c, id, picks);
    if (err) return this.send(id, { type: "error", code: err });
    this.picks[id] = picks;
    this.send((1 - id) as 0 | 1, { type: "partner_ready", player: id });
    if (this.picks[0] && this.picks[1]) this.resolve();
  }

  playAgain() {
    if (this.combat && this.combat.outcome !== "ongoing") this.startFight();
  }

  dispose() {
    if (this.timer) clearTimeout(this.timer);
  }

  // --- internals -------------------------------------------------------------------

  private names = () => this.seats.map((s) => s?.name ?? "");

  private send(id: 0 | 1, m: ServerMsg) {
    this.seats[id]?.send?.(m);
  }

  private broadcastRoom() {
    for (const id of [0, 1] as const) {
      this.send(id, { type: "room_state", code: this.code, you: id, names: this.seats.map((s) => s?.name ?? null) });
    }
  }

  private startFight() {
    // First fight is the GDD's opening encounter; later ones draw from normal + elite.
    const pool = ENCOUNTERS.filter((e) => e.rank !== "boss");
    const enc = this.fights++ === 0 ? "n1" : this.rng.pick(pool).id;
    this.combat = startCombat([freshPlayer(0), freshPlayer(1)], enc, this.rng);
    this.beginTurn();
  }

  private beginTurn() {
    const c = (this.combat = startTurn(this.combat!, this.rng));
    this.picks = [null, null];
    const view = stateView(c, this.names());
    for (const id of [0, 1] as const) {
      this.send(id, { type: "turn_start", turn: c.turn, turnMs: this.turnMs, hand: c.players[id].hand.map(cardView), state: view });
    }
    if (this.turnMs > 0) this.timer = setTimeout(() => this.timeout(), this.turnMs);
    for (const id of [0, 1] as const) {
      const seat = this.seats[id];
      if (seat && (seat.bot || !seat.send) && !this.picks[id]) this.playCards(id, autoPick(this.combat!, id));
      if (this.combat !== c) return; // the bot's pick resolved the turn already
    }
  }

  private timeout() {
    this.timer = null;
    for (const id of [0, 1] as const) if (this.combat?.outcome === "ongoing" && !this.picks[id]) this.playCards(id, autoPick(this.combat, id));
  }

  private resolve() {
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
    const { state, events } = resolveTurn(this.combat!, [this.picks[0]!, this.picks[1]!], this.rng);
    this.combat = state;
    const view = stateView(state, this.names());
    for (const id of [0, 1] as const) this.send(id, { type: "turn_resolved", events, state: view });
    if (state.outcome === "ongoing") this.beginTurn();
    else for (const id of [0, 1] as const) this.send(id, { type: "combat_end", outcome: state.outcome, state: view });
  }
}
