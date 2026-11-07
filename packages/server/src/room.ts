import {
  applyAction, autoPick, botAction, botPicks, createRun, validatePicks,
  type CombatState, type Pick, type RunAction, type RunState,
} from "@gerhana/rules";
import { cardView, runView, stateView, type ServerMsg } from "./protocol";

export type Send = (m: ServerMsg) => void;
interface Seat { name: string; send: Send | null; bot: boolean }

/**
 * One co-op run for two seats. A seat with no connection plays as a bot, so a lone player can
 * run with a bot partner and a dropped player never blocks the other.
 * shortcut: no reconnect token and no 2-minute grace yet (GDD §6.4); add before public playtests.
 */
export class Room {
  seats: [Seat | null, Seat | null] = [null, null];
  run: RunState | null = null;
  private picks: [Pick[] | null, Pick[] | null] = [null, null];
  private rngSeed: number;
  private rng: ReturnType<typeof createRun>["rng"] | null = null;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private readonly turnMs: number;
  private shownTurn = -1;
  private runs = 0;

  constructor(readonly code: string, seed: number, opts: { turnMs?: number } = {}) {
    this.rngSeed = seed;
    this.turnMs = opts.turnMs ?? 30_000;
  }

  get combat(): CombatState | null {
    return this.run?.phase.kind === "combat" ? this.run.phase.combat : null;
  }

  join(name: string, send: Send | null, bot = false): 0 | 1 | "FULL" {
    const id = this.seats[0] === null ? 0 : this.seats[1] === null ? 1 : null;
    if (id === null) return "FULL";
    this.seats[id] = { name, send, bot };
    this.broadcastRoom();
    if (this.seats[0] && this.seats[1]) this.startRun();
    return id;
  }

  /** The player's connection closed: the bot takes the seat so the partner can finish. */
  leave(id: 0 | 1) {
    const seat = this.seats[id];
    if (!seat) return;
    seat.send = null;
    seat.bot = true;
    if (this.run && !this.empty) this.sync(); // nobody left watching: don't let two bots play the run out
  }

  get empty() {
    return this.seats.every((s) => !s || !s.send);
  }

  /** `turn` is the turn the client chose for; a pick sent for a turn that already resolved is dropped. */
  playCards(id: 0 | 1, picks: Pick[], turn = this.combat?.turn) {
    const c = this.combat;
    if (!c) return this.send(id, { type: "error", code: "NO_COMBAT" });
    if (turn !== c.turn) return this.send(id, { type: "error", code: "STALE_TURN" });
    if (this.picks[id]) return this.send(id, { type: "error", code: "ALREADY_PLAYED" });
    const err = validatePicks(c, id, picks);
    if (err) return this.send(id, { type: "error", code: err });
    this.picks[id] = picks;
    this.send((1 - id) as 0 | 1, { type: "partner_ready", player: id });
    if (this.picks[0] && this.picks[1]) this.resolveTurn();
  }

  /** Any non-combat run action. The seat decides `player`, never the client. */
  act(id: 0 | 1, a: RunAction) {
    if (!this.run || a.kind === "playCards") return this.send(id, { type: "error", code: "WRONG_PHASE" });
    this.apply(id, { ...a, player: id } as RunAction);
  }

  playAgain() {
    if (this.run?.phase.kind === "ended") this.startRun();
  }

  dispose() {
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
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

  private startRun() {
    const { state, rng } = createRun(this.rngSeed + this.runs++, ["pendekar", "dalang"]);
    this.run = state;
    this.rng = rng;
    this.shownTurn = -1;
    this.sync();
  }

  /** Apply an action; returns false (and tells the seat) when the rules refuse it. */
  private apply(id: 0 | 1, a: RunAction): boolean {
    const r = applyAction(this.run!, a, this.rng!);
    if ("error" in r) {
      this.send(id, { type: "error", code: r.error });
      return false;
    }
    this.run = r.state;
    this.sync();
    return true;
  }

  private resolveTurn() {
    this.dispose();
    const picks: [Pick[], Pick[]] = [this.picks[0]!, this.picks[1]!];
    this.picks = [null, null];
    const r = applyAction(this.run!, { kind: "playCards", picks }, this.rng!);
    if ("error" in r) return; // picks were validated one by one, so this cannot happen
    this.run = r.state;
    const after = this.combat;
    const view = after ? stateView(after, this.names()) : null;
    for (const id of [0, 1] as const) this.send(id, { type: "turn_resolved", events: r.events, state: view });
    if (!after) {
      const lost = this.run.phase.kind === "ended" && this.run.phase.result === "lost";
      for (const id of [0, 1] as const) this.send(id, { type: "combat_end", outcome: lost ? "lost" : "won" });
    }
    this.sync();
  }

  /** Tell both seats where the run is, then let bot seats take their turn. */
  private sync() {
    const run = this.run!;
    const c = this.combat;
    if (c) {
      if (c.turn !== this.shownTurn) {
        this.shownTurn = c.turn;
        this.picks = [null, null];
        const view = stateView(c, this.names());
        for (const id of [0, 1] as const) {
          this.send(id, { type: "turn_start", turn: c.turn, turnMs: this.turnMs, hand: c.players[id].hand.map(cardView), state: view });
        }
        if (this.turnMs > 0) this.timer = setTimeout(() => this.timeout(), this.turnMs);
      }
      for (const id of [0, 1] as const) {
        if (this.isBot(id) && !this.picks[id] && this.combat === c) this.playCards(id, botPicks(c, id));
      }
      return;
    }
    this.shownTurn = -1;
    for (const id of [0, 1] as const) this.send(id, { type: "run_state", run: runView(run, this.names(), id) });
    for (const id of [0, 1] as const) {
      if (this.run !== run) return; // a bot action already moved the run on and re-synced
      const a = this.isBot(id) ? this.botAction(id) : null;
      if (a) this.apply(id, a);
    }
  }

  private isBot(id: 0 | 1) {
    const s = this.seats[id];
    return !!s && (s.bot || !s.send);
  }

  /** Bot seat: the rules package's bot, which follows a human's map vote and plays carefully. */
  private botAction(id: 0 | 1): RunAction | null {
    const ph = this.run!.phase;
    if (ph.kind === "vote" && (ph.votes[id] !== null || (ph.votes[1 - id] === null && !this.isBot((1 - id) as 0 | 1)))) return null;
    if ((ph.kind === "reward" || ph.kind === "rest" || ph.kind === "shop") && ph.done[id]) {
      return ph.kind === "reward" && ph.pusakaOffer && ph.pusakaChooser === id ? botAction(this.run!, id, this.rng!) : null;
    }
    return botAction(this.run!, id, this.rng!);
  }

  private timeout() {
    this.timer = null;
    const c = this.combat;
    if (!c) return;
    for (const id of [0, 1] as const) if (!this.picks[id] && this.combat === c) this.playCards(id, autoPick(c, id));
  }
}
