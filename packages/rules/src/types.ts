export type CharacterId = "pendekar" | "dalang";
export type CardType = "serang" | "tahan" | "bantu";
export type Tag = "jurus" | "serempak";
export type StatusId = "rentan" | "lemah" | "terbakar";

export type Effect =
  | { kind: "damage"; amount: number }
  | { kind: "block"; amount: number }
  | { kind: "wayang"; hp: number } // target: self or ally
  | { kind: "buffAttack"; amount: number } // +amount to each Serang the target plays this turn
  | { kind: "status"; status: StatusId; stacks: number; on: "target" | "self" };

export interface CardDef {
  id: string;
  nameKey: string;
  owner: CharacterId;
  type: CardType;
  tags: Tag[];
  effects: Effect[];
  serempakBonus?: number;
  upgraded: { effects: Effect[]; serempakBonus?: number };
}

export interface CardInstance {
  uid: string;
  defId: string;
  upgraded: boolean;
}

export type Intent =
  | { kind: "attack"; amount: number; target: "random" | "lowestHp" | "both" }
  | { kind: "status"; status: StatusId; stacks: number; target: "random" | "both" }
  | { kind: "attackStatus"; amount: number; status: StatusId; stacks: number; target: "both" }
  | { kind: "steal"; amount: number; attack: number }
  | { kind: "flee" }
  | { kind: "evade" }
  | { kind: "charge" }
  | { kind: "drain"; amount: number }
  | { kind: "destroyWayang"; fallbackLemah: number };

export interface EnemyDef {
  id: string;
  nameKey: string;
  rank: "normal" | "elite" | "boss";
  hp: number;
  pattern: Intent[];
  phase2?: { belowHpPct: number; pattern: Intent[] };
}

export interface EncounterDef {
  id: string;
  rank: EnemyDef["rank"];
  enemies: string[];
}

export type PusakaHook =
  | { on: "combatStart"; effect: Effect } // block or wayang at the start of every combat
  | { on: "serempakBonus"; amount: number }
  | { on: "maxHp"; amount: number }
  | { on: "coinsAfterCombat"; amount: number };

export interface PusakaDef {
  id: string;
  nameKey: string;
  shared: boolean; // also works for the partner
  hook: PusakaHook;
}
