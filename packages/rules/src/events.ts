import type { StatusId } from "./types";

export type Target = { kind: "enemy"; uid: string } | { kind: "player"; id: 0 | 1 };

/** What happened during a turn, in order; the client animates these. */
export type GameEvent =
  | { t: "card"; player: 0 | 1; cardUid: string; target: Target }
  | { t: "damage"; to: Target; amount: number; hpAfter: number }
  | { t: "block"; player: 0 | 1; amount: number }
  | { t: "wayang"; player: 0 | 1; hp: number }
  | { t: "status"; to: Target; status: StatusId; stacks: number }
  | { t: "steal"; enemy: string; player: 0 | 1; amount: number }
  | { t: "flee"; enemy: string }
  | { t: "coinsReturned"; player: 0 | 1; amount: number }
  | { t: "pingsan"; player: 0 | 1 }
  | { t: "enemyDied"; enemy: string };
