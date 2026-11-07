import type { EnemyDef } from "../types";

// Spec §5 patterns. HP tuned by the balance sim (2026-11-07): normal ×3.8, elite ×2.6, boss 172 and
// boss hits ×1.05 over the spec's starting values → 33–35% bot win rate, ~17 min runs. Untargeted intents use "random".
const LIST: EnemyDef[] = [
  { id: "tuyul", nameKey: "enemy.tuyul", rank: "normal", hp: 46,
    pattern: [{ kind: "steal", amount: 10, attack: 3 }, { kind: "steal", amount: 10, attack: 3 }, { kind: "flee" }] },
  { id: "kuntilanak", nameKey: "enemy.kuntilanak", rank: "normal", hp: 76,
    pattern: [{ kind: "status", status: "lemah", stacks: 2, target: "both" },
      { kind: "attack", amount: 7, target: "random" }, { kind: "attack", amount: 7, target: "random" }] },
  { id: "pocong", nameKey: "enemy.pocong", rank: "normal", hp: 68,
    pattern: [{ kind: "evade" }, { kind: "attack", amount: 8, target: "random" }] },
  { id: "babi_ngepet", nameKey: "enemy.babi_ngepet", rank: "normal", hp: 61,
    pattern: [{ kind: "attack", amount: 5, target: "random" }, { kind: "steal", amount: 15, attack: 0 }, { kind: "flee" }] },
  { id: "jenglot", nameKey: "enemy.jenglot", rank: "normal", hp: 53,
    pattern: [{ kind: "drain", amount: 5 }, { kind: "drain", amount: 5 }] },
  { id: "genderuwo", nameKey: "enemy.genderuwo", rank: "elite", hp: 156,
    pattern: [{ kind: "status", status: "rentan", stacks: 2, target: "both" }, { kind: "charge" },
      { kind: "attack", amount: 20, target: "random" }, { kind: "attack", amount: 10, target: "random" }] },
  { id: "wewe_gombel", nameKey: "enemy.wewe_gombel", rank: "elite", hp: 130,
    pattern: [{ kind: "destroyWayang", fallbackLemah: 2 },
      { kind: "attack", amount: 9, target: "random" }, { kind: "attack", amount: 9, target: "random" }] },
  { id: "banaspati", nameKey: "enemy.banaspati", rank: "boss", hp: 172,
    pattern: [{ kind: "attackStatus", amount: 8, status: "terbakar", stacks: 2, target: "both" },
      { kind: "attack", amount: 13, target: "random" }],
    phase2: { belowHpPct: 50, pattern: [{ kind: "status", status: "terbakar", stacks: 3, target: "both" },
      { kind: "attack", amount: 15, target: "lowestHp" }] } },
];

export const ENEMIES: Record<string, EnemyDef> = Object.fromEntries(LIST.map((e) => [e.id, e]));
