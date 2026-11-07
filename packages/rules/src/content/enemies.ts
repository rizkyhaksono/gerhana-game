import type { EnemyDef } from "../types";

// Spec §5 starting values; final numbers come from the sim. Intents with no target in the spec use "random".
const LIST: EnemyDef[] = [
  { id: "tuyul", nameKey: "enemy.tuyul", rank: "normal", hp: 12,
    pattern: [{ kind: "steal", amount: 10, attack: 3 }, { kind: "steal", amount: 10, attack: 3 }, { kind: "flee" }] },
  { id: "kuntilanak", nameKey: "enemy.kuntilanak", rank: "normal", hp: 20,
    pattern: [{ kind: "status", status: "lemah", stacks: 2, target: "both" },
      { kind: "attack", amount: 7, target: "random" }, { kind: "attack", amount: 7, target: "random" }] },
  { id: "pocong", nameKey: "enemy.pocong", rank: "normal", hp: 18,
    pattern: [{ kind: "evade" }, { kind: "attack", amount: 8, target: "random" }] },
  { id: "babi_ngepet", nameKey: "enemy.babi_ngepet", rank: "normal", hp: 16,
    pattern: [{ kind: "attack", amount: 5, target: "random" }, { kind: "steal", amount: 15, attack: 0 }, { kind: "flee" }] },
  { id: "jenglot", nameKey: "enemy.jenglot", rank: "normal", hp: 14,
    pattern: [{ kind: "drain", amount: 5 }, { kind: "drain", amount: 5 }] },
  { id: "genderuwo", nameKey: "enemy.genderuwo", rank: "elite", hp: 60,
    pattern: [{ kind: "status", status: "rentan", stacks: 2, target: "both" }, { kind: "charge" },
      { kind: "attack", amount: 20, target: "random" }, { kind: "attack", amount: 10, target: "random" }] },
  { id: "wewe_gombel", nameKey: "enemy.wewe_gombel", rank: "elite", hp: 50,
    pattern: [{ kind: "destroyWayang", fallbackLemah: 2 },
      { kind: "attack", amount: 9, target: "random" }, { kind: "attack", amount: 9, target: "random" }] },
  { id: "banaspati", nameKey: "enemy.banaspati", rank: "boss", hp: 140,
    pattern: [{ kind: "attackStatus", amount: 8, status: "terbakar", stacks: 2, target: "both" },
      { kind: "attack", amount: 12, target: "random" }],
    phase2: { belowHpPct: 50, pattern: [{ kind: "status", status: "terbakar", stacks: 3, target: "both" },
      { kind: "attack", amount: 14, target: "lowestHp" }] } },
];

export const ENEMIES: Record<string, EnemyDef> = Object.fromEntries(LIST.map((e) => [e.id, e]));
