import { CARDS } from "./content/cards";
import { isActive, type CombatState, type Pick } from "./combat";

export type PickError = "WRONG_COUNT" | "NOT_IN_HAND" | "DUPLICATE" | "BAD_TARGET" | "PINGSAN";

/** Trust boundary for client input: the server calls this before resolveTurn. Never mutates. */
export function validatePicks(s: CombatState, player: 0 | 1, picks: Pick[]): PickError | null {
  const p = s.players[player];
  if (p.pingsan) return picks.length === 0 ? null : "PINGSAN";
  if (picks.length !== Math.min(2, p.hand.length)) return "WRONG_COUNT";
  if (new Set(picks.map((k) => k.cardUid)).size !== picks.length) return "DUPLICATE";
  for (const k of picks) {
    const inst = p.hand.find((c) => c.uid === k.cardUid);
    if (!inst) return "NOT_IN_HAND";
    const type = CARDS[inst.defId].type;
    const t = k.target;
    const ok =
      type === "serang" ? t.kind === "enemy" && s.enemies.some((e) => e.uid === t.uid && isActive(e))
      : type === "tahan" ? t.kind === "player" && t.id === player
      : t.kind === "player" && !s.players[t.id].pingsan;
    if (!ok) return "BAD_TARGET";
  }
  return null;
}

/** Timeout / bot fallback (spec §4.1): first cards in hand; Serang at the weakest enemy (leftmost on ties), the rest at self. */
export function autoPick(s: CombatState, player: 0 | 1): Pick[] {
  const p = s.players[player];
  if (p.pingsan) return [];
  const weakest = s.enemies.filter(isActive).reduce<(typeof s.enemies)[number] | undefined>((a, e) => (!a || e.hp < a.hp ? e : a), undefined);
  return p.hand.slice(0, 2).map((c) =>
    CARDS[c.defId].type === "serang" && weakest
      ? { cardUid: c.uid, target: { kind: "enemy", uid: weakest.uid } }
      : { cardUid: c.uid, target: { kind: "player", id: player } },
  );
}
